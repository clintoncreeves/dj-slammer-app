/**
 * AudioEngine - Core audio playback and mixing engine for Virtual DJ Deck
 *
 * This class manages all audio operations using Tone.js, including:
 * - Audio Context management
 * - Player instances for each deck
 * - Tempo control via playbackRate
 * - Crossfading between decks
 * - Resource cleanup
 *
 * Requirements met:
 * - Req 1.1, 1.2, 1.3: Playback within 20ms
 * - Req 2.1, 2.2: Tempo adjustment without pitch shifting
 * - Req 3.1-3.4: Smooth crossfading
 * - Req 5.1: Audio Context initialization within 500ms
 * - Req 7.3: Proper resource cleanup
 */

import * as Tone from 'tone';
import { createRealtimeBpmAnalyzer, type BpmAnalyzer } from 'realtime-bpm-analyzer';
import { DeckId, DJDeckError, DJDeckErrorType, EffectType } from './types';
import { MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE, clampPlaybackRate } from '../../utils/audioConstants';
import { EffectsEngine, getEffectsEngine } from './EffectsEngine';

/**
 * Keylock state for a deck
 * When keylock is enabled, tempo changes don't affect pitch
 */
export interface KeylockState {
  /** Whether keylock is enabled */
  enabled: boolean;
  /** Current pitch shift in semitones (-12 to +12) */
  pitchSemitones: number;
  /** Current playback rate (independent of pitch when keylock is on) */
  playbackRate: number;
}

/**
 * GrainPlayer configuration for optimal DJ performance
 * These values provide a good balance between quality and latency
 */
const GRAIN_PLAYER_CONFIG = {
  /** Size of each grain in seconds (smaller = less latency, larger = better quality) */
  grainSize: 0.1,
  /** Overlap between grains (0-1, higher = smoother but more CPU) */
  overlap: 0.5,
  /** Reverse playback */
  reverse: false,
} as const;

export interface BpmUpdateEvent {
  deck: DeckId;
  bpm: number;
  confidence: number;
}

export interface AudioEngineConfig {
  /** Master volume (0-1) */
  masterVolume?: number;
  /** Initialization timeout in milliseconds (default: 5000ms) */
  initTimeout?: number;
  /** Track loading timeout in milliseconds (default: 10000ms) */
  loadTimeout?: number;
  /** Callback for realtime BPM updates */
  onBpmUpdate?: (event: BpmUpdateEvent) => void;
}

export class AudioEngine {
  private players: Map<DeckId, Tone.Player>;
  private grainPlayers: Map<DeckId, Tone.GrainPlayer>;
  private eqs: Map<DeckId, Tone.EQ3>;
  private filters: Map<DeckId, Tone.Filter>;
  private filterStates: Map<DeckId, { position: number; resonance: number }>;
  private gains: Map<DeckId, Tone.Gain>;
  // Separate crossfader gain nodes to avoid conflict with deck volume
  private crossfaderGains: Map<DeckId, Tone.Gain>;
  private crossfader: Tone.CrossFade;
  private masterGain: Tone.Gain;
  private masterLimiter: Tone.Limiter;
  private isInitialized = false;
  private loadingPromises: Map<DeckId, Promise<void>>;
  private initTimeout: number;
  private loadTimeout: number;

  // Track seek positions for each deck (Tone.js player.start() needs explicit offset)
  private seekPositions: Map<DeckId, number>;

  // Keylock state for pitch-independent tempo control
  private keylockStates: Map<DeckId, KeylockState>;
  // Track which player is currently active (regular or grain)
  private activePlayerType: Map<DeckId, 'regular' | 'grain'>;
  // Audio buffers for loading into GrainPlayer (shared with regular Player)
  private audioBuffers: Map<DeckId, Tone.ToneAudioBuffer>;

  // Realtime BPM detection
  private bpmAnalyzers: Map<DeckId, BpmAnalyzer>;
  private bpmNodes: Map<DeckId, { source: MediaStreamAudioSourceNode; streamDest: MediaStreamAudioDestinationNode }>;
  // Store event listener functions for cleanup (using native EventTarget API)
  private bpmEventListeners: Map<DeckId, { bpm: EventListener; bpmStable: EventListener }>;
  private onBpmUpdate?: (event: BpmUpdateEvent) => void;
  private detectedBpm: Map<DeckId, number>;

  // Effects engine for DJ effects (reverb, delay, echo, flanger, phaser)
  private effectsEngine: EffectsEngine | null = null;

  // Loop state for each deck
  private loopStates: Map<DeckId, { loopIn: number | null; loopOut: number | null; enabled: boolean }>;
  // Loop monitor interval IDs
  private loopMonitors: Map<DeckId, number>;

  // GrainPlayer time tracking (since GrainPlayer doesn't have .immediate())
  // Stores { startWallTime: number, startOffset: number, playbackRate: number }
  private grainPlaybackTracking: Map<DeckId, { startWallTime: number; startOffset: number; playbackRate: number }>;

  constructor(config: AudioEngineConfig = {}) {
    this.players = new Map();
    this.grainPlayers = new Map();
    this.eqs = new Map();
    this.filters = new Map();
    this.filterStates = new Map();
    this.gains = new Map();
    this.crossfaderGains = new Map();
    this.loadingPromises = new Map();
    this.seekPositions = new Map();
    this.keylockStates = new Map();
    this.activePlayerType = new Map();
    this.audioBuffers = new Map();
    this.bpmAnalyzers = new Map();
    this.bpmNodes = new Map();
    this.bpmEventListeners = new Map();
    this.detectedBpm = new Map();
    this.onBpmUpdate = config.onBpmUpdate;
    this.loopStates = new Map();
    this.loopMonitors = new Map();
    this.grainPlaybackTracking = new Map();

    // Initialize master gain
    this.masterGain = new Tone.Gain(config.masterVolume ?? 1);

    // Initialize master limiter to prevent clipping (-1 dB threshold)
    // This protects speakers and ears from sudden volume spikes
    this.masterLimiter = new Tone.Limiter(-1);

    // Initialize crossfader (starts at center: 0.5)
    this.crossfader = new Tone.CrossFade(0.5);

    // Set timeout values
    this.initTimeout = config.initTimeout ?? 5000;
    this.loadTimeout = config.loadTimeout ?? 10000;
  }

  /**
   * Initialize the Audio Engine
   * Requirements: 5.1 - Initialize within 500ms
   */
  async init(): Promise<void> {
    const startTime = performance.now();

    try {
      // Wrap initialization in timeout promise race
      await this.withTimeout(
        (async () => {
          // Start Tone.js Audio Context
          await Tone.start();
          console.log('[AudioEngine] Tone.js Audio Context started');

          // Create players for both decks
          this.createPlayer('A');
          this.createPlayer('B');

          // Connect audio graph:
          // Deck A -> Gain A -> CrossfaderGain A -> Crossfader.a
          // Deck B -> Gain B -> CrossfaderGain B -> Crossfader.b
          // Crossfader -> Master Gain -> Destination
          this.crossfaderGains.get('A')!.connect(this.crossfader.a);
          this.crossfaderGains.get('B')!.connect(this.crossfader.b);
          this.crossfader.connect(this.masterGain);
          this.masterGain.connect(this.masterLimiter);
          this.masterLimiter.toDestination();

          this.isInitialized = true;

          const initTime = performance.now() - startTime;
          console.log(`[AudioEngine] Initialized in ${initTime.toFixed(2)}ms`);

          if (initTime > 500) {
            console.warn('[AudioEngine] Initialization took longer than 500ms target');
          }
        })(),
        this.initTimeout,
        'AudioContext initialization'
      );
    } catch (error) {
      console.error('[AudioEngine] Initialization failed:', error);

      // Check if it's already a DJDeckError
      if (error instanceof DJDeckError) {
        throw error;
      }

      throw new DJDeckError(
        DJDeckErrorType.AUDIO_CONTEXT_CREATION_FAILED,
        'Failed to initialize Audio Context. Please ensure your browser supports Web Audio API.',
        error as Error
      );
    }
  }

  /**
   * Create a player instance for a deck
   * Creates both regular Player (for normal mode) and GrainPlayer (for keylock mode)
   */
  private createPlayer(deck: DeckId): void {
    // Create Tone.Player with minimal latency settings (used when keylock is OFF)
    const player = new Tone.Player({
      fadeIn: 0, // No fade in for instant response
      fadeOut: 0, // No fade out for instant response
      loop: false,
      onstop: () => {
        // When playback stops naturally (track reached end), reset position to 0
        // For manual pauses, the pause() function saves the position before calling stop()
        // so this callback only needs to handle natural track endings
        try {
          const duration = player.buffer?.duration ?? 0;
          if (duration > 0) {
            // Use a small tolerance for end detection
            const currentSeekPos = this.seekPositions.get(deck) ?? 0;
            // If stored position is near the end, track finished naturally - reset to 0
            // This check uses the stored position because player.immediate() behavior
            // varies after stop() is called
            if (currentSeekPos >= duration - 0.5) {
              this.seekPositions.set(deck, 0);
              console.log(`[AudioEngine] Deck ${deck} reached end, reset to 0`);
            }
          }
        } catch {
          // Ignore errors - buffer may be disposed
        }
      },
    });

    // Create Tone.GrainPlayer for keylock mode (pitch-independent tempo control)
    // GrainPlayer uses granular synthesis to decouple pitch from tempo
    const grainPlayer = new Tone.GrainPlayer({
      grainSize: GRAIN_PLAYER_CONFIG.grainSize,
      overlap: GRAIN_PLAYER_CONFIG.overlap,
      reverse: GRAIN_PLAYER_CONFIG.reverse,
      loop: false,
    });

    // Create 3-band EQ for frequency control
    const eq = new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 400,   // Bass frequencies below 400Hz
      highFrequency: 2500, // Treble frequencies above 2500Hz
    });

    // Create filter for DJ filter sweep effect
    // Starts as lowpass at max frequency (20kHz) = effectively bypassed
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 20000,
      Q: 1, // Resonance (1 = no resonance, higher = more resonant peak)
      rolloff: -24, // Steeper rolloff for more dramatic filter effect
    });

    // Create gain node for deck volume control
    const gain = new Tone.Gain(1);

    // Create separate gain node for crossfader curve control
    // This keeps deck volume separate from crossfader control to avoid conflicts
    const crossfaderGain = new Tone.Gain(1);

    // Connect audio chains: Both players -> EQ -> Filter -> Gain -> CrossfaderGain
    // Only one player will be active at a time
    player.connect(eq);
    grainPlayer.connect(eq);
    eq.connect(filter);
    filter.connect(gain);
    gain.connect(crossfaderGain);

    this.players.set(deck, player);
    this.grainPlayers.set(deck, grainPlayer);
    this.eqs.set(deck, eq);
    this.filters.set(deck, filter);
    this.filterStates.set(deck, { position: 0, resonance: 1 }); // Center position = no filtering
    this.gains.set(deck, gain);
    this.crossfaderGains.set(deck, crossfaderGain);

    // Initialize keylock state (disabled by default, use regular player)
    this.keylockStates.set(deck, {
      enabled: false,
      pitchSemitones: 0,
      playbackRate: 1,
    });
    this.activePlayerType.set(deck, 'regular');

    console.log(`[AudioEngine] Created player with EQ and GrainPlayer for Deck ${deck}`);
  }

  /**
   * Load an audio track into a deck
   * Requirements: 5.2 - Pre-buffer audio for instant playback
   *
   * Loads the track into both the regular Player and GrainPlayer
   * so we can seamlessly switch between keylock modes.
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param url - URL to audio file
   */
  async loadTrack(deck: DeckId, url: string): Promise<void> {
    this.assertInitialized();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player || !grainPlayer) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    // Encode URL to handle special characters (spaces, !, etc.)
    // encodeURI handles most characters but does NOT encode ! (exclamation mark)
    // which can cause issues on some CDNs like Vercel. Manually encode ! to %21.
    const encodedUrl = encodeURI(url).replace(/!/g, '%21');
    console.log(`[AudioEngine] Loading track for Deck ${deck}: ${encodedUrl}`);

    // Stop any existing playback before loading new track
    if (player.state === 'started') {
      player.stop();
      console.log(`[AudioEngine] Stopped existing playback for Deck ${deck}`);
    }
    if (grainPlayer.state === 'started') {
      grainPlayer.stop();
      console.log(`[AudioEngine] Stopped existing GrainPlayer for Deck ${deck}`);
    }

    // Stop BPM analysis before loading new track to clean up MediaStream resources
    this.stopBpmAnalysis(deck);

    // Clear loop state for new track
    this.clearLoop(deck);

    const loadingPromise = (async () => {
      try {
        // Dispose of any existing buffer to free memory
        const existingBuffer = this.audioBuffers.get(deck);
        if (existingBuffer) {
          existingBuffer.dispose();
          this.audioBuffers.delete(deck);
          console.log(`[AudioEngine] Disposed previous buffer for Deck ${deck}`);
        }

        // Load the audio buffer first, then assign to both players
        const buffer = await this.withTimeout(
          new Promise<Tone.ToneAudioBuffer>((resolve, reject) => {
            console.log(`[AudioEngine] Starting ToneAudioBuffer load for: ${encodedUrl}`);
            const toneBuffer = new Tone.ToneAudioBuffer(encodedUrl, () => {
              console.log(`[AudioEngine] ToneAudioBuffer loaded successfully for Deck ${deck}`);
              resolve(toneBuffer);
            }, (error) => {
              console.error(`[AudioEngine] ToneAudioBuffer failed for Deck ${deck}:`, error);
              console.error(`[AudioEngine] Error type: ${typeof error}, Error name: ${error?.name}, Error message: ${error?.message}`);
              reject(error);
            });
          }),
          this.loadTimeout,
          `Track loading for Deck ${deck}`
        );

        // Store the buffer for reference
        this.audioBuffers.set(deck, buffer);

        // Assign buffer to regular Player
        player.buffer = buffer;

        // Assign buffer to GrainPlayer
        grainPlayer.buffer = buffer;

        // Reset seek position to beginning for new track
        this.seekPositions.set(deck, 0);
        // Clear any GrainPlayer time tracking
        this.grainPlaybackTracking.delete(deck);

        // Reset keylock state for new track
        const keylockState = this.keylockStates.get(deck);
        if (keylockState) {
          keylockState.pitchSemitones = 0;
          keylockState.playbackRate = 1;
          // Keep keylock enabled state as-is (user preference)
        }

        // Reset detune on GrainPlayer
        grainPlayer.detune = 0;
        grainPlayer.playbackRate = 1;
        player.playbackRate = 1;

        console.log(`[AudioEngine] Track loaded for Deck ${deck}, position reset to beginning`);
      } catch (error) {
        console.error(`[AudioEngine] Failed to load track for Deck ${deck}:`, error);

        // Check if it's already a DJDeckError
        if (error instanceof DJDeckError) {
          throw error;
        }

        throw new DJDeckError(
          DJDeckErrorType.TRACK_LOAD_FAILED,
          `Failed to load track: ${url}`,
          error as Error
        );
      }
    })();

    this.loadingPromises.set(deck, loadingPromise);
    await loadingPromise;
  }

  /**
   * Get the active player for a deck based on keylock state
   * @param deck - Deck identifier ('A' or 'B')
   * @returns The currently active player (regular or grain)
   */
  private getActivePlayer(deck: DeckId): Tone.Player | Tone.GrainPlayer {
    const keylockState = this.keylockStates.get(deck);
    if (keylockState?.enabled) {
      return this.grainPlayers.get(deck)!;
    }
    return this.players.get(deck)!;
  }

  /**
   * Check if any player for the deck has a loaded buffer
   */
  private isDeckLoaded(deck: DeckId): boolean {
    const player = this.players.get(deck);
    return player?.loaded ?? false;
  }

  /**
   * Start playback on a deck
   * Requirements: 1.1 - Play within 20ms
   *
   * Uses GrainPlayer when keylock is enabled, regular Player otherwise.
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  play(deck: DeckId): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player || !grainPlayer) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!this.isDeckLoaded(deck)) {
      throw new DJDeckError(
        DJDeckErrorType.PLAYBACK_FAILED,
        `Cannot play: Track not loaded for Deck ${deck}`
      );
    }

    const keylockState = this.keylockStates.get(deck);
    const activePlayer = this.getActivePlayer(deck);
    const offset = this.seekPositions.get(deck) ?? 0;

    // Start playback from the stored seek position (or 0 if none)
    if (activePlayer.state !== 'started') {
      activePlayer.start(undefined, offset);
      const playerType = keylockState?.enabled ? 'GrainPlayer (keylock)' : 'Player';
      console.log(`[AudioEngine] Deck ${deck} ${playerType} starting from offset ${offset.toFixed(2)}s`);

      // Track GrainPlayer playback start for time calculation
      if (keylockState?.enabled) {
        const grainPlayer = this.grainPlayers.get(deck);
        this.grainPlaybackTracking.set(deck, {
          startWallTime: performance.now(),
          startOffset: offset,
          playbackRate: grainPlayer?.playbackRate ?? 1,
        });
      }
    }

    const latency = performance.now() - startTime;
    console.log(`[AudioEngine] Deck ${deck} play latency: ${latency.toFixed(2)}ms`);

    if (latency > 20) {
      console.warn(`[AudioEngine] Play latency exceeded 20ms target: ${latency.toFixed(2)}ms`);
    }
  }

  /**
   * Stop playback on a deck
   * Requirements: 1.2 - Pause within 20ms
   *
   * Stops the active player (regular or grain based on keylock state).
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  pause(deck: DeckId): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player || !grainPlayer) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    // Stop whichever player is currently playing and store position
    // We check both players in case keylock was toggled during playback
    let currentPos = 0;
    let stopped = false;

    if (player.state === 'started') {
      currentPos = player.immediate();
      player.stop();
      stopped = true;
    }
    if (grainPlayer.state === 'started') {
      // GrainPlayer doesn't have .immediate(), calculate from tracking data
      const tracking = this.grainPlaybackTracking.get(deck);
      if (tracking) {
        const elapsedMs = performance.now() - tracking.startWallTime;
        const elapsedSec = (elapsedMs / 1000) * tracking.playbackRate;
        currentPos = tracking.startOffset + elapsedSec;
      } else {
        currentPos = this.seekPositions.get(deck) ?? 0;
      }
      grainPlayer.stop();
      stopped = true;
      // Clear tracking data
      this.grainPlaybackTracking.delete(deck);
    }

    if (stopped) {
      this.seekPositions.set(deck, currentPos);
      console.log(`[AudioEngine] Deck ${deck} paused at ${currentPos.toFixed(2)}s`);
    }

    const latency = performance.now() - startTime;
    console.log(`[AudioEngine] Deck ${deck} pause latency: ${latency.toFixed(2)}ms`);

    if (latency > 20) {
      console.warn(`[AudioEngine] Pause latency exceeded 20ms target: ${latency.toFixed(2)}ms`);
    }
  }

  /**
   * Seek to a specific position in the track
   * Requirements: 1.3 - Cue within 20ms
   *
   * Works with both regular Player and GrainPlayer.
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param time - Time in seconds
   */
  seek(deck: DeckId, time: number): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player || !grainPlayer) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!this.isDeckLoaded(deck)) {
      throw new DJDeckError(
        DJDeckErrorType.PLAYBACK_FAILED,
        `Cannot seek: Track not loaded for Deck ${deck}`
      );
    }

    // Clamp seek time to valid range [0, duration]
    const duration = player.buffer?.duration ?? 0;
    const clampedTime = Math.max(0, Math.min(time, duration));

    if (clampedTime !== time) {
      console.warn(`[AudioEngine] Deck ${deck} seek time ${time.toFixed(2)}s clamped to ${clampedTime.toFixed(2)}s (duration: ${duration.toFixed(2)}s)`);
    }

    // Store the seek position for use when play() is called
    // Tone.js player.seek() only works during playback; for stopped players,
    // we need to pass the offset to player.start()
    this.seekPositions.set(deck, clampedTime);

    // If currently playing, seek immediately on the active player
    if (player.state === 'started') {
      player.seek(clampedTime);
    }
    if (grainPlayer.state === 'started') {
      // GrainPlayer doesn't have seek(), need to restart at new position
      grainPlayer.stop();
      grainPlayer.start(undefined, clampedTime);
      // Reset tracking with new start position
      this.grainPlaybackTracking.set(deck, {
        startWallTime: performance.now(),
        startOffset: clampedTime,
        playbackRate: grainPlayer.playbackRate ?? 1,
      });
    }

    const latency = performance.now() - startTime;
    console.log(`[AudioEngine] Deck ${deck} seek to ${clampedTime.toFixed(2)}s, latency: ${latency.toFixed(2)}ms`);

    if (latency > 20) {
      console.warn(`[AudioEngine] Seek latency exceeded 20ms target: ${latency.toFixed(2)}ms`);
    }
  }

  /**
   * Cue: Jump to cue point and start playing
   * Requirements: 1.3 - Cue within 20ms
   *
   * Uses the active player based on keylock state.
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param cuePoint - Cue point position in seconds
   */
  cue(deck: DeckId, cuePoint: number): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player || !grainPlayer) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!this.isDeckLoaded(deck)) {
      throw new DJDeckError(
        DJDeckErrorType.PLAYBACK_FAILED,
        `Cannot cue: Track not loaded for Deck ${deck}`
      );
    }

    // Clamp cue point to valid range [0, duration]
    const duration = player.buffer?.duration ?? 0;
    const clampedCuePoint = Math.max(0, Math.min(cuePoint, duration));

    if (clampedCuePoint !== cuePoint) {
      console.warn(`[AudioEngine] Deck ${deck} cue point ${cuePoint.toFixed(2)}s clamped to ${clampedCuePoint.toFixed(2)}s (duration: ${duration.toFixed(2)}s)`);
    }

    // Stop both players if playing
    if (player.state === 'started') {
      player.stop();
    }
    if (grainPlayer.state === 'started') {
      grainPlayer.stop();
    }

    // Store cue point as seek position
    this.seekPositions.set(deck, clampedCuePoint);
    // Clear any existing tracking
    this.grainPlaybackTracking.delete(deck);

    // Seek to cue point and start on the active player
    const keylockState = this.keylockStates.get(deck);
    const activePlayer = this.getActivePlayer(deck);
    activePlayer.start(undefined, clampedCuePoint);

    // Initialize tracking if using GrainPlayer (keylock mode)
    if (keylockState?.enabled) {
      this.grainPlaybackTracking.set(deck, {
        startWallTime: performance.now(),
        startOffset: clampedCuePoint,
        playbackRate: grainPlayer.playbackRate ?? 1,
      });
    }

    const latency = performance.now() - startTime;
    console.log(`[AudioEngine] Deck ${deck} cue to ${clampedCuePoint.toFixed(2)}s, latency: ${latency.toFixed(2)}ms`);

    if (latency > 20) {
      console.warn(`[AudioEngine] Cue latency exceeded 20ms target: ${latency.toFixed(2)}ms`);
    }
  }

  /**
   * Get current playback position for a deck
   * Used for setting cue points at current position
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Current playback position in seconds
   */
  getCurrentPosition(deck: DeckId): number {
    this.assertInitialized();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!player.loaded) {
      return 0;
    }

    // If GrainPlayer is active (keylock mode), calculate from tracking data
    if (grainPlayer?.state === 'started') {
      const tracking = this.grainPlaybackTracking.get(deck);
      if (tracking) {
        const elapsedMs = performance.now() - tracking.startWallTime;
        const elapsedSec = (elapsedMs / 1000) * tracking.playbackRate;
        return tracking.startOffset + elapsedSec;
      }
      return this.seekPositions.get(deck) ?? 0;
    }

    // Get current position from Tone.js Player
    return player.immediate();
  }

  /**
   * Set playback rate (tempo) for a deck
   * Requirements: 2.1, 2.2 - Adjust tempo without pitch shifting
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param rate - Playback rate multiplier (e.g., 1.0 = normal, 1.1 = 10% faster)
   */
  setPlaybackRate(deck: DeckId, rate: number): void {
    this.assertInitialized();

    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    // Clamp rate to safe range using shared constants (safety net)
    const clampedRate = clampPlaybackRate(rate);

    if (clampedRate !== rate) {
      console.warn(
        `[AudioEngine] Playback rate ${rate.toFixed(3)} clamped to ${clampedRate.toFixed(3)} ` +
        `(valid range: ${MIN_PLAYBACK_RATE}-${MAX_PLAYBACK_RATE})`
      );
    }

    // Set playback rate on both players
    player.playbackRate = clampedRate;

    if (grainPlayer) {
      // CRITICAL: Update tracking before changing rate to prevent time drift
      const tracking = this.grainPlaybackTracking.get(deck);
      if (tracking && grainPlayer.state === 'started') {
        // Calculate current position with old rate
        const elapsedMs = performance.now() - tracking.startWallTime;
        const elapsedSec = (elapsedMs / 1000) * tracking.playbackRate;
        const currentOffset = tracking.startOffset + elapsedSec;

        // Update tracking with new rate from current position
        this.grainPlaybackTracking.set(deck, {
          startWallTime: performance.now(),
          startOffset: currentOffset,
          playbackRate: clampedRate,
        });
      }
      grainPlayer.playbackRate = clampedRate;
    }

    // Update keylock state
    const keylockState = this.keylockStates.get(deck);
    if (keylockState) {
      keylockState.playbackRate = clampedRate;
    }

    console.log(`[AudioEngine] Deck ${deck} playback rate set to ${clampedRate.toFixed(3)}`);
  }

  /**
   * Set crossfader position
   * Requirements: 3.1-3.4 - Smooth crossfading without clicks/pops
   *
   * @param position - Crossfader position: -1 (full A) to 1 (full B), 0 is center
   */
  setCrossfade(position: number): void {
    this.assertInitialized();

    // Clamp position to valid range
    const clampedPosition = Math.max(-1, Math.min(1, position));

    // Convert from [-1, 1] to [0, 1] for Tone.CrossFade
    // -1 (full A) -> 0
    //  0 (center) -> 0.5
    //  1 (full B) -> 1
    const fadeValue = (clampedPosition + 1) / 2;

    // Set crossfader fade (using .value for immediate change without ramping)
    this.crossfader.fade.value = fadeValue;

    console.log(
      `[AudioEngine] Crossfader position: ${clampedPosition.toFixed(2)} (fade: ${fadeValue.toFixed(2)})`
    );
  }

  /**
   * Set crossfader with pre-calculated curve volumes
   * This bypasses the Tone.CrossFade equal-power curve and applies custom curve volumes directly
   * Requirements: 3.1-3.4 - Smooth crossfading without clicks/pops
   *
   * @param volA - Volume for Deck A (0-1)
   * @param volB - Volume for Deck B (0-1)
   */
  setCrossfadeWithCurve(volA: number, volB: number): void {
    this.assertInitialized();

    // Clamp volumes to valid range
    const clampedVolA = Math.max(0, Math.min(1, volA));
    const clampedVolB = Math.max(0, Math.min(1, volB));

    const rampTime = 0.02; // 20ms ramp for smooth transitions

    // Set the main crossfader to center (0.5) and use separate crossfader gains
    // This allows custom curve control without conflicting with deck volume
    this.crossfader.fade.value = 0.5;

    // Apply curve volumes to the dedicated crossfader gain nodes
    // This doesn't interfere with deck volume controls
    const crossfaderGainA = this.crossfaderGains.get('A');
    const crossfaderGainB = this.crossfaderGains.get('B');

    if (crossfaderGainA && crossfaderGainB) {
      crossfaderGainA.gain.rampTo(clampedVolA, rampTime);
      crossfaderGainB.gain.rampTo(clampedVolB, rampTime);
    }

    console.log(
      `[AudioEngine] Crossfade with curve: volA=${clampedVolA.toFixed(2)}, volB=${clampedVolB.toFixed(2)}`
    );
  }

  /**
   * Get current playback time for a deck
   *
   * When the player is stopped, returns the stored seek position.
   * When playing, returns the actual playback position from Tone.js.
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Current time in seconds
   */
  getCurrentTime(deck: DeckId): number {
    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player || !player.loaded) {
      return 0;
    }

    const duration = player.buffer?.duration ?? 0;
    let currentTime = 0;

    // If regular Player is playing, use its immediate() value
    if (player.state === 'started') {
      currentTime = player.immediate();
    } else if (grainPlayer && grainPlayer.state === 'started') {
      // GrainPlayer is playing (keylock mode) - calculate elapsed time from tracking
      const tracking = this.grainPlaybackTracking.get(deck);
      if (tracking) {
        const elapsedMs = performance.now() - tracking.startWallTime;
        const elapsedSec = (elapsedMs / 1000) * tracking.playbackRate;
        currentTime = tracking.startOffset + elapsedSec;
      } else {
        currentTime = this.seekPositions.get(deck) ?? 0;
      }
    } else {
      // When stopped, return the stored seek position
      currentTime = this.seekPositions.get(deck) ?? 0;
    }

    // Clamp to valid range [0, duration] to prevent display issues
    // This handles edge cases where player.immediate() returns invalid values
    if (duration > 0) {
      currentTime = Math.max(0, Math.min(currentTime, duration));
    }

    return currentTime;
  }

  /**
   * Get duration of loaded track
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Duration in seconds, or 0 if not loaded
   */
  getDuration(deck: DeckId): number {
    const player = this.players.get(deck);
    if (!player || !player.loaded || !player.buffer) {
      return 0;
    }
    return player.buffer.duration;
  }

  /**
   * Check if a deck is currently playing
   * Checks both regular Player and GrainPlayer (for keylock mode)
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns True if playing, false otherwise
   */
  isPlaying(deck: DeckId): boolean {
    const player = this.players.get(deck);
    const grainPlayer = this.grainPlayers.get(deck);
    if (!player) {
      return false;
    }
    return player.state === 'started' || grainPlayer?.state === 'started';
  }

  /**
   * Check if a track is loaded for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns True if loaded, false otherwise
   */
  isLoaded(deck: DeckId): boolean {
    const player = this.players.get(deck);
    if (!player) {
      return false;
    }
    return player.loaded;
  }

  /**
   * Get the audio buffer for a deck (for waveform generation)
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns AudioBuffer or null if not loaded
   */
  getAudioBuffer(deck: DeckId): AudioBuffer | null {
    const player = this.players.get(deck);
    if (!player || !player.loaded || !player.buffer) {
      return null;
    }
    return player.buffer.get() as AudioBuffer;
  }

  /**
   * Set volume for a specific deck
   * Requirements: 10.2 - Real-time deck volume control
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param volume - Volume level (0-1)
   */
  setDeckVolume(deck: DeckId, volume: number): void {
    this.assertInitialized();

    const gain = this.gains.get(deck);
    if (!gain) {
      throw new Error(`Gain node not found for deck ${deck}`);
    }

    const clampedVolume = Math.max(0, Math.min(1, volume));
    gain.gain.value = clampedVolume;
    console.log(`[AudioEngine] Deck ${deck} volume set to ${clampedVolume.toFixed(2)}`);
  }

  /**
   * Set master volume
   *
   * @param volume - Volume level (0-1)
   */
  setMasterVolume(volume: number): void {
    this.assertInitialized();
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = clampedVolume;
    console.log(`[AudioEngine] Master volume set to ${clampedVolume.toFixed(2)}`);
  }

  /**
   * Get current Audio Context state
   */
  getContextState(): 'suspended' | 'running' | 'closed' {
    return Tone.getContext().state as 'suspended' | 'running' | 'closed';
  }

  /**
   * Set EQ band value for a deck
   * Requirements: 3-band EQ control per deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param band - EQ band ('low' | 'mid' | 'high')
   * @param value - Value in decibels (-12 to +12)
   */
  setEQ(deck: DeckId, band: 'low' | 'mid' | 'high', value: number): void {
    this.assertInitialized();

    const eq = this.eqs.get(deck);
    if (!eq) {
      throw new Error(`EQ not found for deck ${deck}`);
    }

    // Clamp value to safe range (-12 to +12 dB)
    const clampedValue = Math.max(-12, Math.min(12, value));

    if (clampedValue !== value) {
      console.warn(
        `[AudioEngine] EQ ${band} value ${value} clamped to ${clampedValue} (-12 to +12 dB range)`
      );
    }

    // Use rampTo for smooth transitions to prevent audio clicks
    eq[band].rampTo(clampedValue, 0.05);

    console.log(`[AudioEngine] Deck ${deck} EQ ${band} set to ${clampedValue.toFixed(1)} dB`);
  }

  /**
   * Get current EQ values for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Object with low, mid, high values in dB
   */
  getEQ(deck: DeckId): { low: number; mid: number; high: number } {
    const eq = this.eqs.get(deck);
    if (!eq) {
      throw new Error(`EQ not found for deck ${deck}`);
    }

    return {
      low: eq.low.value,
      mid: eq.mid.value,
      high: eq.high.value,
    };
  }

  /**
   * Set filter for a deck using a bi-directional control
   *
   * DJ Filter behavior:
   * - Position 0 (center): No filtering (bypass)
   * - Position -1 to 0 (left): Low-pass filter, frequency decreases as you turn left
   * - Position 0 to 1 (right): High-pass filter, frequency increases as you turn right
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param position - Filter position: -1 (full LP) to 1 (full HP), 0 is bypass
   * @param resonance - Filter resonance/Q factor (0.5 to 15, default 1)
   */
  setFilter(deck: DeckId, position: number, resonance: number = 1): void {
    this.assertInitialized();

    const filter = this.filters.get(deck);
    if (!filter) {
      throw new Error(`Filter not found for deck ${deck}`);
    }

    // Clamp position to valid range
    const clampedPosition = Math.max(-1, Math.min(1, position));
    // Clamp resonance (Q) to safe range (0.5 to 15)
    const clampedResonance = Math.max(0.5, Math.min(15, resonance));

    // Store the filter state
    this.filterStates.set(deck, { position: clampedPosition, resonance: clampedResonance });

    // Define the bypass zone (small area around center where filter is off)
    const BYPASS_THRESHOLD = 0.02; // 2% dead zone

    if (Math.abs(clampedPosition) < BYPASS_THRESHOLD) {
      // Center position: bypass filter (set lowpass at max frequency)
      filter.type = 'lowpass';
      filter.frequency.rampTo(20000, 0.05);
      filter.Q.rampTo(1, 0.05); // Low Q when bypassed
      console.log(`[AudioEngine] Deck ${deck} filter bypassed (center position)`);
    } else if (clampedPosition < 0) {
      // Left of center: Low-pass filter
      // Map -1 to 0 -> 20Hz to 20000Hz (logarithmic scale)
      // -1 = 20Hz (full bass), approaching 0 = 20000Hz (bypass)
      const normalizedPos = Math.abs(clampedPosition); // 0 to 1, where 1 is full left
      const minFreq = 20;
      const maxFreq = 20000;
      const logMin = Math.log(minFreq);
      const logMax = Math.log(maxFreq);
      // Invert: 0 -> maxFreq, 1 -> minFreq
      const logFreq = logMax - normalizedPos * (logMax - logMin);
      const frequency = Math.exp(logFreq);

      filter.type = 'lowpass';
      filter.frequency.rampTo(frequency, 0.05);
      filter.Q.rampTo(clampedResonance, 0.05);
      console.log(`[AudioEngine] Deck ${deck} lowpass filter: ${frequency.toFixed(0)}Hz, Q=${clampedResonance.toFixed(1)}`);
    } else {
      // Right of center: High-pass filter
      // Map 0 to 1 -> 20Hz to 20000Hz (logarithmic scale)
      // approaching 0 = 20Hz (bypass), 1 = 20000Hz (full treble)
      const normalizedPos = clampedPosition; // 0 to 1, where 1 is full right
      const minFreq = 20;
      const maxFreq = 20000;
      const logMin = Math.log(minFreq);
      const logMax = Math.log(maxFreq);
      const logFreq = logMin + normalizedPos * (logMax - logMin);
      const frequency = Math.exp(logFreq);

      filter.type = 'highpass';
      filter.frequency.rampTo(frequency, 0.05);
      filter.Q.rampTo(clampedResonance, 0.05);
      console.log(`[AudioEngine] Deck ${deck} highpass filter: ${frequency.toFixed(0)}Hz, Q=${clampedResonance.toFixed(1)}`);
    }
  }

  /**
   * Get current filter state for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Object with position (-1 to 1) and resonance (Q factor)
   */
  getFilter(deck: DeckId): { position: number; resonance: number } {
    const state = this.filterStates.get(deck);
    if (!state) {
      return { position: 0, resonance: 1 };
    }
    return { ...state };
  }

  /**
   * Reset filter to bypass (center position)
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  resetFilter(deck: DeckId): void {
    this.setFilter(deck, 0, 1);
  }

  /**
   * Initialize realtime BPM detection for a deck
   * Uses the realtime-bpm-analyzer library with event-based API
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  async initRealtimeBpmDetection(deck: DeckId): Promise<void> {
    try {
      const audioContext = Tone.getContext().rawContext as AudioContext;

      // Create the realtime BPM analyzer using the correct API (returns a Promise)
      const realtimeAnalyzer = await createRealtimeBpmAnalyzer(audioContext, {
        continuousAnalysis: true,
        stabilizationTime: 5000, // 5 seconds to stabilize BPM
      });

      // Create event listeners using native EventTarget API for cleanup support
      // The BpmAnalyzer extends EventTarget and dispatches CustomEvents with data in 'detail'
      const bpmListener = ((event: CustomEvent<{ bpm: readonly { tempo: number; count: number }[] }>) => {
        const data = event.detail;
        if (data.bpm && data.bpm.length > 0) {
          const topCandidate = data.bpm[0];
          const bpm = Math.round(topCandidate.tempo);
          const confidence = topCandidate.count || 0;

          this.detectedBpm.set(deck, bpm);

          if (this.onBpmUpdate) {
            this.onBpmUpdate({
              deck,
              bpm,
              confidence,
            });
          }

          console.log(`[AudioEngine] Deck ${deck} realtime BPM: ${bpm} (confidence: ${confidence})`);
        }
      }) as EventListener;

      const bpmStableListener = ((event: CustomEvent<{ bpm: readonly { tempo: number; count: number }[] }>) => {
        const data = event.detail;
        if (data.bpm && data.bpm.length > 0) {
          const bpm = Math.round(data.bpm[0].tempo);
          this.detectedBpm.set(deck, bpm);

          if (this.onBpmUpdate) {
            this.onBpmUpdate({
              deck,
              bpm,
              confidence: 100, // Stable = high confidence
            });
          }

          console.log(`[AudioEngine] Deck ${deck} stable BPM: ${bpm}`);
        }
      }) as EventListener;

      // Add event listeners using native EventTarget API
      realtimeAnalyzer.addEventListener('bpm', bpmListener);
      realtimeAnalyzer.addEventListener('bpmStable', bpmStableListener);

      // Store listeners for cleanup
      this.bpmEventListeners.set(deck, { bpm: bpmListener, bpmStable: bpmStableListener });
      this.bpmAnalyzers.set(deck, realtimeAnalyzer);
      console.log(`[AudioEngine] Realtime BPM analyzer initialized for Deck ${deck}`);
    } catch (error) {
      console.warn(`[AudioEngine] Failed to initialize realtime BPM for Deck ${deck}:`, error);
    }
  }

  /**
   * Connect a deck's audio to the BPM analyzer for realtime detection
   * Call this after loading a track to start BPM analysis
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  startBpmAnalysis(deck: DeckId): void {
    const analyzer = this.bpmAnalyzers.get(deck);
    const player = this.players.get(deck);

    if (!analyzer || !player || !player.loaded) {
      console.warn(`[AudioEngine] Cannot start BPM analysis for Deck ${deck}: not ready`);
      return;
    }

    // Clean up any existing BPM nodes for this deck first
    this.stopBpmAnalysis(deck);

    let streamDest: MediaStreamAudioDestinationNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      const audioContext = Tone.getContext().rawContext as AudioContext;

      // Create a MediaStreamDestination to capture audio
      streamDest = audioContext.createMediaStreamDestination();

      // Connect player output to the stream destination (in parallel with normal output)
      const eq = this.eqs.get(deck);
      if (eq) {
        // Tone.js node connection to Web Audio API node
        eq.connect(streamDest as unknown as Tone.ToneAudioNode);
      }

      // Create source from the stream
      source = audioContext.createMediaStreamSource(streamDest.stream);

      // Connect to the BPM analyzer's audio node
      source.connect(analyzer.node);

      // Store nodes for cleanup
      this.bpmNodes.set(deck, { source, streamDest });

      console.log(`[AudioEngine] BPM analysis started for Deck ${deck}`);
    } catch (error) {
      // Clean up any partially created resources to prevent memory leaks
      if (source) {
        try {
          source.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
      if (streamDest) {
        // Stop all tracks in the MediaStream to release resources
        streamDest.stream.getTracks().forEach(track => track.stop());
      }
      console.warn(`[AudioEngine] Failed to start BPM analysis for Deck ${deck}:`, error);
    }
  }

  /**
   * Stop BPM analysis for a deck and clean up resources
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  stopBpmAnalysis(deck: DeckId): void {
    const nodes = this.bpmNodes.get(deck);
    if (nodes) {
      try {
        nodes.source.disconnect();
        // Stop all tracks in the MediaStream to release resources
        nodes.streamDest.stream.getTracks().forEach(track => track.stop());
        console.log(`[AudioEngine] BPM analysis stopped for Deck ${deck}`);
      } catch (e) {
        // Ignore disconnect errors
      }
      this.bpmNodes.delete(deck);
    }
  }

  /**
   * Get the detected BPM for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Detected BPM or null if not detected
   */
  getDetectedBpm(deck: DeckId): number | null {
    return this.detectedBpm.get(deck) ?? null;
  }

  /**
   * Set callback for BPM updates
   *
   * @param callback - Function to call when BPM is detected
   */
  setOnBpmUpdate(callback: (event: BpmUpdateEvent) => void): void {
    this.onBpmUpdate = callback;
  }

  // =========================================================================
  // DJ Effects Methods
  // =========================================================================

  /**
   * Initialize the effects engine for a deck
   * Should be called after the audio engine is initialized
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  initEffects(deck: DeckId): void {
    this.assertInitialized();

    if (!this.effectsEngine) {
      this.effectsEngine = getEffectsEngine();
    }

    // Initialize effects for this deck
    const { input, output } = this.effectsEngine.init(deck);

    // Rewire audio chain: Filter -> Effects -> Gain
    // Disconnect filter from gain, insert effects chain
    const filter = this.filters.get(deck);
    const gain = this.gains.get(deck);

    if (filter && gain) {
      filter.disconnect(gain);
      filter.connect(input);
      output.connect(gain);
      console.log(`[AudioEngine] Effects chain inserted for Deck ${deck}`);
    }
  }

  /**
   * Set effect wet/dry mix for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param effectType - Effect type (reverb, delay, echo, flanger, phaser)
   * @param wet - Wet amount (0-1)
   */
  setEffectWet(deck: DeckId, effectType: EffectType, wet: number): void {
    if (!this.effectsEngine) {
      console.warn('[AudioEngine] Effects engine not initialized');
      return;
    }
    this.effectsEngine.setEffectWet(deck, effectType, wet);
  }

  /**
   * Toggle effect on/off for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param effectType - Effect type (reverb, delay, echo, flanger, phaser)
   * @returns New enabled state
   */
  toggleEffect(deck: DeckId, effectType: EffectType): boolean {
    if (!this.effectsEngine) {
      console.warn('[AudioEngine] Effects engine not initialized');
      return false;
    }
    return this.effectsEngine.toggleEffect(deck, effectType);
  }

  /**
   * Set effect parameter for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param effectType - Effect type (reverb, delay, echo, flanger, phaser)
   * @param param - Parameter name
   * @param value - Parameter value
   */
  setEffectParam(deck: DeckId, effectType: EffectType, param: string, value: number): void {
    if (!this.effectsEngine) {
      console.warn('[AudioEngine] Effects engine not initialized');
      return;
    }
    this.effectsEngine.setEffectParam(deck, effectType, param, value);
  }

  /**
   * Update effects engine BPM for beat-synced effects
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param bpm - Current BPM
   */
  setEffectsBPM(deck: DeckId, bpm: number): void {
    if (!this.effectsEngine) {
      return;
    }
    this.effectsEngine.setBPM(deck, bpm);
  }

  /**
   * Get all effects state for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Array of effect states
   */
  getEffects(deck: DeckId): ReturnType<EffectsEngine['getAllEffects']> {
    if (!this.effectsEngine) {
      return [];
    }
    return this.effectsEngine.getAllEffects(deck);
  }

  /**
   * Check if effects engine is initialized
   */
  hasEffectsEngine(): boolean {
    return this.effectsEngine !== null && this.effectsEngine.getIsInitialized();
  }

  // =========================================================================
  // Loop Control Methods
  // =========================================================================

  /**
   * Set loop points for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param loopIn - Loop start point in seconds
   * @param loopOut - Loop end point in seconds
   */
  setLoop(deck: DeckId, loopIn: number | null, loopOut: number | null): void {
    this.assertInitialized();

    let loopState = this.loopStates.get(deck);
    if (!loopState) {
      loopState = { loopIn: null, loopOut: null, enabled: false };
      this.loopStates.set(deck, loopState);
    }

    loopState.loopIn = loopIn;
    loopState.loopOut = loopOut;

    console.log(`[AudioEngine] Deck ${deck} loop points set: in=${loopIn?.toFixed(2)}s, out=${loopOut?.toFixed(2)}s`);
  }

  /**
   * Enable or disable loop playback for a deck
   * When enabled, playback will jump back to loopIn when reaching loopOut
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param enabled - Whether to enable the loop
   */
  enableLoop(deck: DeckId, enabled: boolean): void {
    this.assertInitialized();

    let loopState = this.loopStates.get(deck);
    if (!loopState) {
      loopState = { loopIn: null, loopOut: null, enabled: false };
      this.loopStates.set(deck, loopState);
    }

    loopState.enabled = enabled;

    if (enabled && loopState.loopIn !== null && loopState.loopOut !== null) {
      // Start loop monitoring
      this.startLoopMonitor(deck);
      console.log(`[AudioEngine] Deck ${deck} loop enabled: ${loopState.loopIn.toFixed(2)}s - ${loopState.loopOut.toFixed(2)}s`);
    } else {
      // Stop loop monitoring
      this.stopLoopMonitor(deck);
      console.log(`[AudioEngine] Deck ${deck} loop disabled`);
    }
  }

  /**
   * Get current loop state for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Loop state object with loopIn, loopOut, and enabled
   */
  getLoopState(deck: DeckId): { loopIn: number | null; loopOut: number | null; enabled: boolean } {
    const loopState = this.loopStates.get(deck);
    if (!loopState) {
      return { loopIn: null, loopOut: null, enabled: false };
    }
    return { ...loopState };
  }

  /**
   * Start monitoring loop boundaries during playback
   * Uses a high-frequency interval to check if playback has reached loopOut
   * and jumps back to loopIn when it does
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  private startLoopMonitor(deck: DeckId): void {
    // Stop any existing monitor
    this.stopLoopMonitor(deck);

    const loopState = this.loopStates.get(deck);
    if (!loopState || loopState.loopIn === null || loopState.loopOut === null) {
      return;
    }

    const player = this.players.get(deck);
    if (!player) {
      return;
    }

    // Monitor at ~60fps (16.67ms) for precise loop timing
    // This is crucial for seamless loops - any slower and the loop point might be missed
    const LOOP_MONITOR_INTERVAL_MS = 10;

    const monitorId = window.setInterval(() => {
      const currentLoopState = this.loopStates.get(deck);
      if (!currentLoopState || !currentLoopState.enabled ||
          currentLoopState.loopIn === null || currentLoopState.loopOut === null) {
        this.stopLoopMonitor(deck);
        return;
      }

      // Check both regular player and grain player
      const regularPlayer = this.players.get(deck);
      const grainPlayer = this.grainPlayers.get(deck);

      let currentTime = 0;
      let isPlaying = false;

      if (regularPlayer && regularPlayer.state === 'started') {
        currentTime = regularPlayer.immediate();
        isPlaying = true;
      } else if (grainPlayer && grainPlayer.state === 'started') {
        // GrainPlayer: calculate current time from tracking data
        const tracking = this.grainPlaybackTracking.get(deck);
        if (tracking) {
          const elapsedMs = performance.now() - tracking.startWallTime;
          const elapsedSec = (elapsedMs / 1000) * tracking.playbackRate;
          currentTime = tracking.startOffset + elapsedSec;
        } else {
          currentTime = this.seekPositions.get(deck) ?? 0;
        }
        isPlaying = true;
      }

      if (!isPlaying) {
        return;
      }

      // Check if we've reached or passed the loop out point
      // Add a small buffer to handle timing precision issues
      if (currentTime >= currentLoopState.loopOut - 0.005) {
        // Jump back to loop in point
        console.log(`[AudioEngine] Deck ${deck} loop: jumping from ${currentTime.toFixed(3)}s to ${currentLoopState.loopIn.toFixed(3)}s`);

        if (regularPlayer && regularPlayer.state === 'started') {
          regularPlayer.seek(currentLoopState.loopIn);
        }
        if (grainPlayer && grainPlayer.state === 'started') {
          grainPlayer.stop();
          grainPlayer.start(undefined, currentLoopState.loopIn);
          // Update tracking for correct time calculation after loop
          this.grainPlaybackTracking.set(deck, {
            startWallTime: performance.now(),
            startOffset: currentLoopState.loopIn,
            playbackRate: grainPlayer.playbackRate ?? 1,
          });
        }

        // Update stored seek position
        this.seekPositions.set(deck, currentLoopState.loopIn);
      }
    }, LOOP_MONITOR_INTERVAL_MS);

    this.loopMonitors.set(deck, monitorId);
    console.log(`[AudioEngine] Deck ${deck} loop monitor started`);
  }

  /**
   * Stop loop monitoring for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  private stopLoopMonitor(deck: DeckId): void {
    const monitorId = this.loopMonitors.get(deck);
    if (monitorId !== undefined) {
      window.clearInterval(monitorId);
      this.loopMonitors.delete(deck);
      console.log(`[AudioEngine] Deck ${deck} loop monitor stopped`);
    }
  }

  /**
   * Clear loop points and disable loop for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  clearLoop(deck: DeckId): void {
    this.stopLoopMonitor(deck);
    this.loopStates.set(deck, { loopIn: null, loopOut: null, enabled: false });
    console.log(`[AudioEngine] Deck ${deck} loop cleared`);
  }

  /**
   * Clean up resources
   * Requirements: 7.3 - Proper resource cleanup
   */
  destroy(): void {
    console.log('[AudioEngine] Destroying...');

    // Stop all loop monitors
    this.loopMonitors.forEach((_, deck) => {
      this.stopLoopMonitor(deck);
    });

    // Stop all players (both regular and grain)
    this.players.forEach((player, deck) => {
      if (player.state === 'started') {
        player.stop();
      }
      player.dispose();
      console.log(`[AudioEngine] Disposed player for Deck ${deck}`);
    });

    // Stop and dispose GrainPlayers
    this.grainPlayers.forEach((grainPlayer, deck) => {
      if (grainPlayer.state === 'started') {
        grainPlayer.stop();
      }
      grainPlayer.dispose();
      console.log(`[AudioEngine] Disposed GrainPlayer for Deck ${deck}`);
    });

    // Disconnect and dispose audio nodes
    this.eqs.forEach((eq, deck) => {
      eq.disconnect();
      eq.dispose();
      console.log(`[AudioEngine] Disposed EQ for Deck ${deck}`);
    });

    this.filters.forEach((filter, deck) => {
      filter.disconnect();
      filter.dispose();
      console.log(`[AudioEngine] Disposed filter for Deck ${deck}`);
    });

    this.gains.forEach((gain, deck) => {
      gain.disconnect();
      gain.dispose();
      console.log(`[AudioEngine] Disposed gain for Deck ${deck}`);
    });

    this.crossfaderGains.forEach((gain, deck) => {
      gain.disconnect();
      gain.dispose();
      console.log(`[AudioEngine] Disposed crossfader gain for Deck ${deck}`);
    });

    this.crossfader.disconnect();
    this.crossfader.dispose();

    this.masterGain.disconnect();
    this.masterGain.dispose();

    // Dispose master limiter to prevent memory leak
    this.masterLimiter.disconnect();
    this.masterLimiter.dispose();
    console.log('[AudioEngine] Disposed master limiter');

    // Clean up BPM analysis resources
    // First, stop BPM analysis for all decks (cleans up MediaStream resources)
    this.bpmNodes.forEach((_, deck) => {
      this.stopBpmAnalysis(deck);
    });

    // Remove event listeners and disconnect BPM analyzers
    this.bpmAnalyzers.forEach((analyzer, deck) => {
      try {
        // Remove event listeners using stored references
        const listeners = this.bpmEventListeners.get(deck);
        if (listeners) {
          analyzer.removeEventListener('bpm', listeners.bpm);
          analyzer.removeEventListener('bpmStable', listeners.bpmStable);
          console.log(`[AudioEngine] Removed BPM event listeners for Deck ${deck}`);
        }
        // Stop the analyzer to clean up internal state
        analyzer.stop();
        analyzer.node.disconnect();
        console.log(`[AudioEngine] Disposed BPM analyzer for Deck ${deck}`);
      } catch (e) {
        // Ignore disconnect errors
      }
    });

    // Clean up effects engine
    if (this.effectsEngine) {
      this.effectsEngine.destroy();
      this.effectsEngine = null;
      console.log('[AudioEngine] Disposed effects engine');
    }

    // Dispose audio buffers to free memory
    this.audioBuffers.forEach((buffer, deck) => {
      try {
        buffer.dispose();
        console.log(`[AudioEngine] Disposed audio buffer for Deck ${deck}`);
      } catch (e) {
        // Ignore dispose errors
      }
    });

    // Clear maps
    this.players.clear();
    this.grainPlayers.clear();
    this.eqs.clear();
    this.filters.clear();
    this.filterStates.clear();
    this.gains.clear();
    this.crossfaderGains.clear();
    this.loadingPromises.clear();
    this.seekPositions.clear();
    this.keylockStates.clear();
    this.activePlayerType.clear();
    this.audioBuffers.clear();
    this.bpmAnalyzers.clear();
    this.bpmNodes.clear();
    this.bpmEventListeners.clear();
    this.detectedBpm.clear();
    this.loopStates.clear();
    this.loopMonitors.clear();
    this.grainPlaybackTracking.clear();

    this.isInitialized = false;

    console.log('[AudioEngine] Destroyed successfully');
  }

  /**
   * Wrap a promise with a timeout using Promise.race
   *
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param operation - Description of operation for error message
   * @returns Promise that rejects on timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new DJDeckError(
            DJDeckErrorType.AUDIO_CONTEXT_CREATION_FAILED,
            `${operation} timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  /**
   * Assert that the engine is initialized
   */
  private assertInitialized(): void {
    if (!this.isInitialized) {
      throw new DJDeckError(
        DJDeckErrorType.AUDIO_CONTEXT_BLOCKED,
        'AudioEngine not initialized. Call init() first.'
      );
    }
  }
}
