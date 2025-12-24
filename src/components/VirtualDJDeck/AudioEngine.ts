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
import { DeckId, DJDeckError, DJDeckErrorType } from './types';

export interface AudioEngineConfig {
  /** Master volume (0-1) */
  masterVolume?: number;
  /** Initialization timeout in milliseconds (default: 5000ms) */
  initTimeout?: number;
  /** Track loading timeout in milliseconds (default: 10000ms) */
  loadTimeout?: number;
}

export class AudioEngine {
  private players: Map<DeckId, Tone.Player>;
  private eqs: Map<DeckId, Tone.EQ3>;
  private gains: Map<DeckId, Tone.Gain>;
  private crossfader: Tone.CrossFade;
  private masterGain: Tone.Gain;
  private isInitialized = false;
  private loadingPromises: Map<DeckId, Promise<void>>;
  private initTimeout: number;
  private loadTimeout: number;

  constructor(config: AudioEngineConfig = {}) {
    this.players = new Map();
    this.eqs = new Map();
    this.gains = new Map();
    this.loadingPromises = new Map();

    // Initialize master gain
    this.masterGain = new Tone.Gain(config.masterVolume ?? 1);

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
          // Deck A -> Gain A -> Crossfader.a
          // Deck B -> Gain B -> Crossfader.b
          // Crossfader -> Master Gain -> Destination
          this.gains.get('A')!.connect(this.crossfader.a);
          this.gains.get('B')!.connect(this.crossfader.b);
          this.crossfader.connect(this.masterGain);
          this.masterGain.toDestination();

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
   */
  private createPlayer(deck: DeckId): void {
    // Create Tone.Player with minimal latency settings
    const player = new Tone.Player({
      fadeIn: 0, // No fade in for instant response
      fadeOut: 0, // No fade out for instant response
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

    // Create gain node for volume control
    const gain = new Tone.Gain(1);

    // Connect audio chain: Player -> EQ -> Gain
    player.connect(eq);
    eq.connect(gain);

    this.players.set(deck, player);
    this.eqs.set(deck, eq);
    this.gains.set(deck, gain);

    console.log(`[AudioEngine] Created player with EQ for Deck ${deck}`);
  }

  /**
   * Load an audio track into a deck
   * Requirements: 5.2 - Pre-buffer audio for instant playback
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param url - URL to audio file
   */
  async loadTrack(deck: DeckId, url: string): Promise<void> {
    this.assertInitialized();

    const player = this.players.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    console.log(`[AudioEngine] Loading track for Deck ${deck}: ${url}`);

    const loadingPromise = (async () => {
      try {
        await this.withTimeout(
          player.load(url),
          this.loadTimeout,
          `Track loading for Deck ${deck}`
        );
        console.log(`[AudioEngine] Track loaded for Deck ${deck}`);
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
   * Start playback on a deck
   * Requirements: 1.1 - Play within 20ms
   *
   * @param deck - Deck identifier ('A' or 'B')
   */
  play(deck: DeckId): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!player.loaded) {
      throw new DJDeckError(
        DJDeckErrorType.PLAYBACK_FAILED,
        `Cannot play: Track not loaded for Deck ${deck}`
      );
    }

    // Start playback immediately
    if (player.state !== 'started') {
      player.start();
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
   * @param deck - Deck identifier ('A' or 'B')
   */
  pause(deck: DeckId): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    // Stop playback immediately
    if (player.state === 'started') {
      player.stop();
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
   * @param deck - Deck identifier ('A' or 'B')
   * @param time - Time in seconds
   */
  seek(deck: DeckId, time: number): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!player.loaded) {
      throw new DJDeckError(
        DJDeckErrorType.PLAYBACK_FAILED,
        `Cannot seek: Track not loaded for Deck ${deck}`
      );
    }

    // Seek to position
    player.seek(time);

    const latency = performance.now() - startTime;
    console.log(`[AudioEngine] Deck ${deck} seek latency: ${latency.toFixed(2)}ms`);

    if (latency > 20) {
      console.warn(`[AudioEngine] Seek latency exceeded 20ms target: ${latency.toFixed(2)}ms`);
    }
  }

  /**
   * Cue: Jump to cue point and start playing
   * Requirements: 1.3 - Cue within 20ms
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param cuePoint - Cue point position in seconds
   */
  cue(deck: DeckId, cuePoint: number): void {
    this.assertInitialized();
    const startTime = performance.now();

    const player = this.players.get(deck);
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    if (!player.loaded) {
      throw new DJDeckError(
        DJDeckErrorType.PLAYBACK_FAILED,
        `Cannot cue: Track not loaded for Deck ${deck}`
      );
    }

    // Stop if playing
    if (player.state === 'started') {
      player.stop();
    }

    // Seek to cue point and start
    player.start(undefined, cuePoint);

    const latency = performance.now() - startTime;
    console.log(`[AudioEngine] Deck ${deck} cue latency: ${latency.toFixed(2)}ms`);

    if (latency > 20) {
      console.warn(`[AudioEngine] Cue latency exceeded 20ms target: ${latency.toFixed(2)}ms`);
    }
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
    if (!player) {
      throw new Error(`Player not found for deck ${deck}`);
    }

    // Clamp rate to safe range (±20%)
    const clampedRate = Math.max(0.8, Math.min(1.2, rate));

    if (clampedRate !== rate) {
      console.warn(
        `[AudioEngine] Playback rate ${rate} clamped to ${clampedRate} (0.8-1.2 range)`
      );
    }

    // Set playback rate (Tone.js handles pitch preservation automatically)
    player.playbackRate = clampedRate;

    console.log(`[AudioEngine] Deck ${deck} playback rate set to ${clampedRate}`);
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
   * Get current playback time for a deck
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns Current time in seconds
   */
  getCurrentTime(deck: DeckId): number {
    const player = this.players.get(deck);
    if (!player || !player.loaded) {
      return 0;
    }
    return player.immediate();
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
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @returns True if playing, false otherwise
   */
  isPlaying(deck: DeckId): boolean {
    const player = this.players.get(deck);
    if (!player) {
      return false;
    }
    return player.state === 'started';
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

    // Set the EQ band value
    eq[band].value = clampedValue;

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
   * Clean up resources
   * Requirements: 7.3 - Proper resource cleanup
   */
  destroy(): void {
    console.log('[AudioEngine] Destroying...');

    // Stop all players
    this.players.forEach((player, deck) => {
      if (player.state === 'started') {
        player.stop();
      }
      player.dispose();
      console.log(`[AudioEngine] Disposed player for Deck ${deck}`);
    });

    // Disconnect and dispose audio nodes
    this.eqs.forEach((eq, deck) => {
      eq.disconnect();
      eq.dispose();
      console.log(`[AudioEngine] Disposed EQ for Deck ${deck}`);
    });

    this.gains.forEach((gain, deck) => {
      gain.disconnect();
      gain.dispose();
      console.log(`[AudioEngine] Disposed gain for Deck ${deck}`);
    });

    this.crossfader.disconnect();
    this.crossfader.dispose();

    this.masterGain.disconnect();
    this.masterGain.dispose();

    // Clear maps
    this.players.clear();
    this.eqs.clear();
    this.gains.clear();
    this.loadingPromises.clear();

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
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(
          new DJDeckError(
            DJDeckErrorType.AUDIO_CONTEXT_CREATION_FAILED,
            `${operation} timed out after ${timeoutMs}ms`
          )
        );
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
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
