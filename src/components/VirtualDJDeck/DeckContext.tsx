/**
 * DeckContext - Centralized state management for Deck A and Deck B
 *
 * This context provides a single source of truth for all deck state,
 * ensuring that all controls (crossfader, tempo, volume, playback) are
 * bidirectionally connected and aware of each other.
 *
 * Integration Philosophy:
 * - Deck A and Deck B are the central focal points
 * - All controls read from and write to deck state
 * - State changes propagate to all connected components
 * - AudioEngine is controlled through this context, not directly by UI components
 */

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { AudioEngine } from './AudioEngine';
import { DeckState, DeckId, VirtualDJDeckState, CrossfaderCurveType, calculateCrossfaderVolumes } from './types';
import { generateWaveformData, generateSpectralWaveformData, spectralToAmplitudeArray } from '../../utils/waveformUtils';
import { calculateBPMSync, BPMSyncResult } from '../../utils/bpmSync';
import { detectBPMAndKey } from './BPMKeyDetector';

/** Hot cue data for a single slot */
export interface HotCue {
  position: number; // seconds
  color: string; // hex color
  label?: string; // optional name
}

/** Track info for loading into a deck */
export interface TrackInfo {
  url: string;
  name: string;
  artist: string;
  bpm: number;
  cuePoint?: number;
  /** Suggested cue points at musical phrase boundaries */
  suggestedCuePoints?: number[];
  /** Pre-saved hot cues for this track */
  hotCues?: (HotCue | null)[];
}

interface DeckContextValue {
  // Deck States
  deckAState: DeckState;
  deckBState: DeckState;
  crossfaderPosition: number;
  crossfaderCurve: CrossfaderCurveType;

  // Audio Engine
  audioEngine: AudioEngine | null;
  isInitialized: boolean;

  // Deck Operations
  loadTrack: (deck: DeckId, trackInfo: TrackInfo) => Promise<void>;
  playDeck: (deck: DeckId) => void;
  pauseDeck: (deck: DeckId) => void;
  cueDeck: (deck: DeckId) => void;
  setCuePoint: (deck: DeckId) => void;
  seekDeck: (deck: DeckId, time: number) => void;
  setBPM: (deck: DeckId, bpm: number) => void;
  syncBPM: (slaveDeck: DeckId, masterDeck: DeckId) => BPMSyncResult | null;
  syncDeck: (deck: DeckId) => BPMSyncResult | null;
  setVolume: (deck: DeckId, volume: number) => void;
  setCrossfader: (position: number) => void;
  setCrossfaderCurve: (curve: CrossfaderCurveType) => void;
  updateCurrentTime: (deck: DeckId, time: number) => void;
  setDeckEQ: (deck: DeckId, band: 'low' | 'mid' | 'high', value: number) => void;
  setDeckFilter: (deck: DeckId, position: number, resonance?: number) => void;
  setPlaybackRate: (deck: DeckId, rate: number) => void;

  // Manual DJ Assistant Functions (user-triggered via buttons)
  syncBeatPhase: (deck: DeckId) => void;
  autoCue: (deck: DeckId) => void;

  // Hot Cue Functions
  hotCuesA: (HotCue | null)[];
  hotCuesB: (HotCue | null)[];
  setHotCue: (deck: DeckId, slot: number) => void;
  jumpToHotCue: (deck: DeckId, slot: number) => void;
  deleteHotCue: (deck: DeckId, slot: number) => void;
  updateHotCueColor: (deck: DeckId, slot: number, color: string) => void;

  // Loop Functions
  setLoopIn: (deck: DeckId) => void;
  setLoopOut: (deck: DeckId) => void;
  toggleLoop: (deck: DeckId) => void;
  setAutoLoop: (deck: DeckId, beats: number) => void;
  doubleLoop: (deck: DeckId) => void;
  halveLoop: (deck: DeckId) => void;
  moveLoop: (deck: DeckId, direction: 'forward' | 'back') => void;
  exitLoop: (deck: DeckId) => void;

  // Waveform Display
  toggleSpectralColors: (deck: DeckId) => void;

  // State Queries
  getState: () => VirtualDJDeckState;
  getDeckState: (deck: DeckId) => DeckState;

  // Initialization
  initializeAudioEngine: () => Promise<void>;

  // Error handling
  loadErrors: { A?: string; B?: string };
}

const DeckContext = createContext<DeckContextValue | undefined>(undefined);

interface DeckProviderProps {
  children: ReactNode;
  onStateChange?: (state: VirtualDJDeckState) => void;
  onError?: (error: Error) => void;
}

// Initial crossfader position - used by both state and AudioEngine initialization
const INITIAL_CROSSFADER_POSITION = -1; // Full Deck A

/**
 * Calculate suggested cue points at musical phrase boundaries
 *
 * In most electronic/dance music, phrases are typically 8 bars long.
 * At a given BPM, we calculate where each 8-bar phrase boundary falls.
 * These make excellent cue points for mixing because they're musically meaningful.
 *
 * @param duration - Track duration in seconds
 * @param bpm - Track BPM
 * @returns Array of cue points in seconds at 8-bar phrase boundaries
 */
function calculateSuggestedCuePoints(duration: number, bpm: number): number[] {
  if (!duration || !bpm || duration <= 0 || bpm <= 0) {
    return [];
  }

  // Calculate seconds per beat: 60 seconds / BPM
  const secondsPerBeat = 60 / bpm;

  // 8 bars * 4 beats per bar = 32 beats per phrase (in 4/4 time)
  const beatsPerPhrase = 32;
  const secondsPerPhrase = secondsPerBeat * beatsPerPhrase;

  const cuePoints: number[] = [];

  // Start from 0 (beginning of track is always a good cue point)
  // Then add phrase boundaries until we're near the end
  // Skip the last phrase to avoid cueing too close to track end
  let position = 0;
  while (position < duration - secondsPerPhrase) {
    cuePoints.push(Math.round(position * 100) / 100); // Round to 2 decimal places
    position += secondsPerPhrase;
  }

  // Ensure we have at least the start position
  if (cuePoints.length === 0) {
    cuePoints.push(0);
  }

  return cuePoints;
}

/**
 * Find the best cue point for a new track - prioritizing early positions
 *
 * For short songs, we want to start near the beginning to maximize playback time.
 * This finds the earliest suitable phrase boundary in the first third of the track.
 *
 * Strategy:
 * 1. Only consider cue points in the first 33% of the track
 * 2. Prefer the first cue point after a brief intro (5+ seconds)
 * 3. If no good early cue points, fall back to the very beginning
 *
 * @param newTrackCuePoints - Array of phrase boundary cue points for the new track
 * @param newTrackDuration - Duration of the new track in seconds
 * @param _playingTrackCurrentTime - (unused) Current playback position of the playing track
 * @param _playingTrackDuration - (unused) Total duration of the playing track
 * @returns Best cue point to start the new track, or 0 if none found
 */
function findBestCuePointForTransition(
  newTrackCuePoints: number[],
  newTrackDuration: number,
  _playingTrackCurrentTime: number,
  _playingTrackDuration: number
): number {
  if (!newTrackCuePoints.length || !newTrackDuration) {
    return 0;
  }

  // Only consider cue points in the first 33% of the track
  // This ensures we have plenty of time to play the song
  const maxCuePosition = newTrackDuration * 0.33;

  // Filter to early cue points only
  const earlyCuePoints = newTrackCuePoints.filter(cue => cue <= maxCuePosition);

  if (earlyCuePoints.length === 0) {
    // No cue points in the first third, start from the beginning
    console.log('[DeckContext] No early cue points found, starting at 0');
    return 0;
  }

  // Prefer a cue point after a brief intro (at least 5 seconds in)
  // This skips silence or count-ins at the very start
  const INTRO_THRESHOLD = 5; // seconds

  const afterIntro = earlyCuePoints.filter(cue => cue >= INTRO_THRESHOLD);

  if (afterIntro.length > 0) {
    // Return the earliest cue point after the intro
    const bestCue = afterIntro[0];
    console.log(`[DeckContext] Early cue selected: ${bestCue.toFixed(1)}s (after intro)`);
    return bestCue;
  }

  // If all early cue points are within intro, return the earliest one
  const bestCue = earlyCuePoints[0];
  console.log(`[DeckContext] Early cue selected: ${bestCue.toFixed(1)}s (first available)`);
  return bestCue;
}

export function DeckProvider({ children, onStateChange, onError }: DeckProviderProps) {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadErrors, setLoadErrors] = useState<{ A?: string; B?: string }>({});

  // Track BPM detection initialization per deck
  const bpmDetectionInitialized = useRef<{ A: boolean; B: boolean }>({ A: false, B: false });

  // Deck States - The central focal points
  const [deckAState, setDeckAState] = useState<DeckState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    trackName: '',
    artistName: '',
    originalBPM: 0,
    currentBPM: 0,
    playbackRate: 1,
    volume: 1,
    isLoaded: false,
    cuePoint: 0,
    suggestedCuePoints: [],
    waveformData: [],
    spectralWaveformData: null,
    showSpectralColors: true, // Enable colored waveforms by default
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterPosition: 0,
    filterResonance: 1,
    loopIn: null,
    loopOut: null,
    loopActive: false,
    loopLength: 4,
    detectedKey: '',
    detectedKeyMode: 'major',
    camelotCode: '',
    effects: [],
  });

  const [deckBState, setDeckBState] = useState<DeckState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    trackName: '',
    artistName: '',
    originalBPM: 0,
    currentBPM: 0,
    playbackRate: 1,
    volume: 1,
    isLoaded: false,
    cuePoint: 0,
    suggestedCuePoints: [],
    waveformData: [],
    spectralWaveformData: null,
    showSpectralColors: true, // Enable colored waveforms by default
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterPosition: 0,
    filterResonance: 1,
    loopIn: null,
    loopOut: null,
    loopActive: false,
    loopLength: 4,
    detectedKey: '',
    detectedKeyMode: 'major',
    camelotCode: '',
    effects: [],
  });

  // Start crossfader fully on Deck A so users learn to crossfade to Deck B
  const [crossfaderPosition, setCrossfaderPositionState] = useState(INITIAL_CROSSFADER_POSITION);

  // Crossfader curve type - defaults to constantPower (equal power, prevents volume dip at center)
  const [crossfaderCurve, setCrossfaderCurveState] = useState<CrossfaderCurveType>('constantPower');

  // Hot cue state - 8 slots per deck, initially all null
  const [hotCuesA, setHotCuesA] = useState<(HotCue | null)[]>(Array(8).fill(null));
  const [hotCuesB, setHotCuesB] = useState<(HotCue | null)[]>(Array(8).fill(null));

  // DJ-style hot cue color palette
  const HOT_CUE_COLORS = [
    '#FF0000', // Red
    '#FF8C00', // Orange
    '#FFD700', // Yellow
    '#00FF00', // Green
    '#00BFFF', // Cyan
    '#0066FF', // Blue
    '#9400D3', // Purple
    '#FF1493', // Pink
  ];

  // Get complete state
  const getState = useCallback((): VirtualDJDeckState => {
    return {
      deckA: deckAState,
      deckB: deckBState,
      crossfaderPosition,
    };
  }, [deckAState, deckBState, crossfaderPosition]);

  // Get individual deck state
  const getDeckState = useCallback((deck: DeckId): DeckState => {
    return deck === 'A' ? deckAState : deckBState;
  }, [deckAState, deckBState]);

  // Notify parent of state changes
  const notifyStateChange = useCallback(() => {
    onStateChange?.(getState());
  }, [onStateChange, getState]);

  // Initialize Audio Engine
  const initializeAudioEngine = useCallback(async () => {
    try {
      const engine = new AudioEngine();
      audioEngineRef.current = engine;
      await engine.init();

      // Sync crossfader to initial state - AudioEngine defaults to center (0.5)
      engine.setCrossfade(INITIAL_CROSSFADER_POSITION);

      setIsInitialized(true);
      console.log('[DeckContext] AudioEngine initialized with crossfader at', INITIAL_CROSSFADER_POSITION);
    } catch (err) {
      console.error('[DeckContext] Failed to initialize AudioEngine:', err);
      onError?.(err as Error);
      throw err;
    }
  }, [onError]);

  // Load a track for a deck
  const loadTrack = useCallback(async (deck: DeckId, trackInfo: TrackInfo) => {
    if (!audioEngineRef.current) {
      throw new Error('AudioEngine not initialized');
    }

    const { url, name, artist, bpm, cuePoint = 0, suggestedCuePoints } = trackInfo;

    try {
      await audioEngineRef.current.loadTrack(deck, url);

      const buffer = audioEngineRef.current.getAudioBuffer(deck);
      const duration = audioEngineRef.current.getDuration(deck);

      // Generate spectral waveform data with frequency analysis for colored display
      // This pre-calculates colors during track load for efficient rendering
      const spectralWaveformData = buffer ? generateSpectralWaveformData(buffer, 200) : null;

      // Extract simple amplitude array for backward compatibility
      const waveformData = spectralWaveformData
        ? spectralToAmplitudeArray(spectralWaveformData)
        : buffer ? generateWaveformData(buffer, 200) : [];

      console.log(`[DeckContext] Deck ${deck} spectral waveform generated with ${spectralWaveformData?.segments.length || 0} segments`);

      // BPM/Key detection - only run if BPM is not provided (user-uploaded tracks)
      // Skip for built-in tracks that already have known BPM values
      let detectedBPM = bpm;
      let detectedKey = '';
      let detectedKeyMode: 'major' | 'minor' = 'major';
      let detectedCamelotCode = '';

      // Only run detection if BPM is 0 or not provided (indicates user upload)
      if (buffer && bpm === 0) {
        try {
          console.log(`[DeckContext] Deck ${deck} running BPM/Key detection (no BPM provided)...`);
          const detection = await detectBPMAndKey(buffer);

          // Use detected BPM if confidence is high enough (> 70%)
          if (detection.bpmConfidence > 70) {
            detectedBPM = detection.bpm;
            console.log(`[DeckContext] Deck ${deck} detected BPM: ${detection.bpm} (${detection.bpmConfidence}% confidence)`);
          }

          // Always use detected key if available
          if (detection.key && detection.keyConfidence > 50) {
            detectedKey = detection.key;
            detectedKeyMode = detection.keyMode;
            detectedCamelotCode = detection.camelotCode;
            console.log(`[DeckContext] Deck ${deck} detected key: ${detection.key} ${detection.keyMode} (${detection.camelotCode}, ${detection.keyConfidence}% confidence)`);
          }
        } catch (detectionError) {
          console.warn(`[DeckContext] Deck ${deck} BPM/Key detection failed:`, detectionError);
        }
      } else if (bpm > 0) {
        console.log(`[DeckContext] Deck ${deck} using provided BPM: ${bpm} (skipping detection)`);
      }

      // Calculate suggested cue points if not provided
      // Use phrase boundaries based on BPM (8-bar sections)
      let cuePoints = suggestedCuePoints;
      if (!cuePoints || cuePoints.length === 0) {
        cuePoints = calculateSuggestedCuePoints(duration, bpm);
        console.log(`[DeckContext] Deck ${deck} auto-calculated cue points:`, cuePoints);
      }

      // Simple cue point handling - just use what was provided or 0
      // User can manually trigger autoCue() if they want smart cue selection
      const initialCuePoint = cuePoint;
      if (initialCuePoint > 0) {
        audioEngineRef.current.seek(deck, initialCuePoint);
        console.log(`[DeckContext] Deck ${deck} seeked to cue point ${initialCuePoint}s`);
      }

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({
        ...prev,
        isLoaded: true,
        isPlaying: false,  // Reset playback state
        isPaused: false,   // Reset pause state
        currentTime: initialCuePoint,  // Start at cue point position
        duration,
        waveformData,
        spectralWaveformData,
        trackName: name,
        artistName: artist,
        originalBPM: detectedBPM,  // Use detected BPM if available
        currentBPM: detectedBPM,
        cuePoint: initialCuePoint,
        suggestedCuePoints: cuePoints,
        // Include detected key information for harmonic mixing
        detectedKey: detectedKey,
        detectedKeyMode: detectedKeyMode,
        camelotCode: detectedCamelotCode,
      }));

      // Initialize realtime BPM detection if not already initialized for this deck
      if (!bpmDetectionInitialized.current[deck]) {
        try {
          await audioEngineRef.current.initRealtimeBpmDetection(deck);
          bpmDetectionInitialized.current[deck] = true;
          console.log(`[DeckContext] BPM detection initialized for Deck ${deck}`);
        } catch (bpmError) {
          // Don't fail track loading if BPM detection fails
          console.warn(`[DeckContext] Failed to initialize BPM detection for Deck ${deck}:`, bpmError);
        }
      }

      // Start BPM analysis for the loaded track
      try {
        audioEngineRef.current.startBpmAnalysis(deck);
        console.log(`[DeckContext] BPM analysis started for Deck ${deck}`);
      } catch (bpmError) {
        // Don't fail track loading if BPM analysis fails
        console.warn(`[DeckContext] Failed to start BPM analysis for Deck ${deck}:`, bpmError);
      }

      // Clear any previous load error for this deck
      setLoadErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[deck];
        return newErrors;
      });

      notifyStateChange();
      console.log(`[DeckContext] Track loaded for Deck ${deck}`);
    } catch (err) {
      console.error(`[DeckContext] Failed to load track for Deck ${deck}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load track';
      setLoadErrors((prev) => ({ ...prev, [deck]: errorMessage }));
      onError?.(err as Error);
      throw err;
    }
  }, [notifyStateChange, onError]);

  // Play a deck - simple playback, no automatic sync
  // User can manually trigger syncBeatPhase() before playing if needed
  const playDeck = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot play: AudioEngine not initialized');
      return;
    }

    try {
      audioEngineRef.current.play(deck);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} playing`);
    } catch (err) {
      console.error(`[DeckContext] Failed to play Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, notifyStateChange, onError]);

  // Pause a deck
  const pauseDeck = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot pause: AudioEngine not initialized');
      return;
    }

    try {
      audioEngineRef.current.pause(deck);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} paused`);
    } catch (err) {
      console.error(`[DeckContext] Failed to pause Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, notifyStateChange, onError]);

  // Cue a deck
  const cueDeck = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot cue: AudioEngine not initialized');
      return;
    }

    const state = deck === 'A' ? deckAState : deckBState;

    try {
      audioEngineRef.current.cue(deck, state.cuePoint);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} cued`);
    } catch (err) {
      console.error(`[DeckContext] Failed to cue Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState, deckBState, notifyStateChange, onError]);

  // Set cue point to current playback position
  const setCuePoint = useCallback((deck: DeckId) => {
    if (!isInitialized) {
      console.warn('[DeckContext] Cannot set cue point: AudioEngine not initialized');
      return;
    }

    try {
      // Get current playback position from the deck state
      // (which is updated every frame via updateCurrentTime)
      const state = deck === 'A' ? deckAState : deckBState;
      const currentPosition = state.currentTime;

      // Update the deck state with new cue point
      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, cuePoint: currentPosition }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} cue point set to ${currentPosition.toFixed(2)}s`);
    } catch (err) {
      console.error(`[DeckContext] Failed to set cue point for Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState, deckBState, notifyStateChange, onError]);

  // Seek to a position in a deck with bounds validation
  const seekDeck = useCallback((deck: DeckId, time: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot seek: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;

    // Validate and clamp time to valid bounds [0, duration]
    const validTime = Math.max(0, Math.min(time, deckState.duration));
    if (validTime !== time) {
      console.warn(`[DeckContext] Seek time ${time.toFixed(2)}s clamped to ${validTime.toFixed(2)}s (duration: ${deckState.duration.toFixed(2)}s)`);
    }

    try {
      audioEngineRef.current.seek(deck, validTime);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, currentTime: validTime }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} seeked to ${validTime.toFixed(2)}s`);
    } catch (err) {
      console.error(`[DeckContext] Failed to seek Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState.duration, deckBState.duration, notifyStateChange, onError]);

  // Set BPM for a deck
  const setBPM = useCallback((deck: DeckId, bpm: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set BPM: AudioEngine not initialized');
      return;
    }

    const state = deck === 'A' ? deckAState : deckBState;
    const playbackRate = bpm / state.originalBPM;

    try {
      audioEngineRef.current.setPlaybackRate(deck, playbackRate);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, currentBPM: bpm, playbackRate }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} BPM set to ${bpm}`);
    } catch (err) {
      console.error(`[DeckContext] Failed to set BPM for Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState, deckBState, notifyStateChange, onError]);

  // Sync BPM between decks using professional algorithm
  const syncBPM = useCallback((slaveDeck: DeckId, masterDeck: DeckId): BPMSyncResult | null => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot sync: AudioEngine not initialized');
      return null;
    }

    const masterState = masterDeck === 'A' ? deckAState : deckBState;
    const slaveState = slaveDeck === 'A' ? deckAState : deckBState;

    if (!masterState.isLoaded || !slaveState.isLoaded) {
      console.warn('[DeckContext] Cannot sync: Both decks must be loaded');
      return null;
    }

    try {
      // Calculate optimal BPM sync using professional algorithm
      const syncResult = calculateBPMSync(
        masterState.currentBPM,
        slaveState.currentBPM,
        slaveState.originalBPM
      );

      console.log(
        `[DeckContext] Syncing Deck ${slaveDeck} to Deck ${masterDeck}:`,
        `${slaveState.currentBPM.toFixed(1)} -> ${syncResult.targetBPM.toFixed(1)} BPM`,
        `(${syncResult.syncType})`
      );

      // Apply the sync by setting the calculated BPM
      setBPM(slaveDeck, syncResult.targetBPM);

      return syncResult;
    } catch (err) {
      console.error('[DeckContext] Failed to sync BPM:', err);
      onError?.(err as Error);
      return null;
    }
  }, [isInitialized, deckAState, deckBState, setBPM, onError]);

  // Set volume for a deck
  const setVolume = useCallback((deck: DeckId, volume: number) => {
    if (!audioEngineRef.current) {
      console.warn('[DeckContext] Cannot set volume: AudioEngine not initialized');
      return;
    }

    audioEngineRef.current.setDeckVolume(deck, volume);

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;
    updateState((prev) => ({ ...prev, volume }));

    notifyStateChange();
    console.log(`[DeckContext] Deck ${deck} volume set to ${volume}`);
  }, [notifyStateChange]);

  // Set crossfader position with curve-based volume calculation
  const setCrossfader = useCallback((position: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set crossfader: AudioEngine not initialized');
      return;
    }

    try {
      // Convert position from [-1, 1] to [0, 1] for curve calculation
      const normalizedPosition = (position + 1) / 2;

      // Calculate volumes based on selected curve
      const { volA, volB } = calculateCrossfaderVolumes(normalizedPosition, crossfaderCurve);

      // Apply curve-based volumes to the AudioEngine
      audioEngineRef.current.setCrossfadeWithCurve(volA, volB);
      setCrossfaderPositionState(position);

      notifyStateChange();
      console.log(`[DeckContext] Crossfader position: ${position.toFixed(2)}, curve: ${crossfaderCurve}, volA: ${volA.toFixed(2)}, volB: ${volB.toFixed(2)}`);
    } catch (err) {
      console.error('[DeckContext] Failed to set crossfader:', err);
      onError?.(err as Error);
    }
  }, [isInitialized, crossfaderCurve, notifyStateChange, onError]);

  // Set crossfader curve type
  const setCrossfaderCurve = useCallback((curve: CrossfaderCurveType) => {
    setCrossfaderCurveState(curve);

    // Re-apply crossfader position with new curve
    if (audioEngineRef.current && isInitialized) {
      // Convert position from [-1, 1] to [0, 1] for curve calculation
      const normalizedPosition = (crossfaderPosition + 1) / 2;

      // Calculate volumes based on new curve
      const { volA, volB } = calculateCrossfaderVolumes(normalizedPosition, curve);

      // Apply curve-based volumes to the AudioEngine
      audioEngineRef.current.setCrossfadeWithCurve(volA, volB);

      console.log(`[DeckContext] Crossfader curve changed to: ${curve}, volA: ${volA.toFixed(2)}, volB: ${volB.toFixed(2)}`);
    }

    notifyStateChange();
  }, [isInitialized, crossfaderPosition, notifyStateChange]);

  // Update current time (called from playback timer)
  const updateCurrentTime = useCallback((deck: DeckId, time: number) => {
    const updateState = deck === 'A' ? setDeckAState : setDeckBState;
    updateState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  // Set EQ band value for a deck
  const setDeckEQ = useCallback((deck: DeckId, band: 'low' | 'mid' | 'high', value: number) => {
    if (!audioEngineRef.current) {
      console.warn('[DeckContext] Cannot set EQ: AudioEngine not initialized');
      return;
    }

    try {
      audioEngineRef.current.setEQ(deck, band, value);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      const eqKey = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';
      updateState((prev) => ({ ...prev, [eqKey]: value }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} EQ ${band} set to ${value.toFixed(1)} dB`);
    } catch (err) {
      console.error(`[DeckContext] Failed to set EQ for Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [notifyStateChange, onError]);

  // Set filter for a deck (bi-directional: lowpass left of center, highpass right of center)
  const setDeckFilter = useCallback((deck: DeckId, position: number, resonance: number = 1) => {
    if (!audioEngineRef.current) {
      console.warn('[DeckContext] Cannot set filter: AudioEngine not initialized');
      return;
    }

    try {
      audioEngineRef.current.setFilter(deck, position, resonance);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, filterPosition: position, filterResonance: resonance }));

      notifyStateChange();
    } catch (err) {
      console.error(`[DeckContext] Failed to set filter for Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [notifyStateChange, onError]);

  // Set playback rate directly for a deck
  const setPlaybackRate = useCallback((deck: DeckId, rate: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set playback rate: AudioEngine not initialized');
      return;
    }

    const state = deck === 'A' ? deckAState : deckBState;

    try {
      audioEngineRef.current.setPlaybackRate(deck, rate);

      // Calculate new BPM based on playback rate
      const newBPM = state.originalBPM * rate;

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, currentBPM: newBPM, playbackRate: rate }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} playback rate set to ${rate.toFixed(3)}`);
    } catch (err) {
      console.error(`[DeckContext] Failed to set playback rate for Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState, deckBState, notifyStateChange, onError]);

  // Sync a deck to the other deck (convenience method)
  const syncDeck = useCallback((deck: DeckId): BPMSyncResult | null => {
    const masterDeck: DeckId = deck === 'A' ? 'B' : 'A';
    return syncBPM(deck, masterDeck);
  }, [syncBPM]);

  // Manual beat-phase sync - user-triggered via SYNC button
  // Syncs the specified deck's beat phase to match the other playing deck
  const syncBeatPhase = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot sync beat phase: AudioEngine not initialized');
      return;
    }

    const otherDeck: DeckId = deck === 'A' ? 'B' : 'A';
    const otherDeckState = otherDeck === 'A' ? deckAState : deckBState;
    const thisDeckState = deck === 'A' ? deckAState : deckBState;

    if (!otherDeckState.isPlaying) {
      console.log(`[DeckContext] Cannot sync Deck ${deck}: other deck not playing`);
      return;
    }

    if (otherDeckState.currentBPM <= 0 || thisDeckState.currentBPM <= 0) {
      console.warn('[DeckContext] Cannot sync: BPM info not available');
      return;
    }

    try {
      // Calculate beat positions
      const otherSecsPerBeat = 60 / otherDeckState.currentBPM;
      const thisSecsPerBeat = 60 / thisDeckState.currentBPM;

      // Find where the other deck is within its current beat (0 to 1)
      const otherBeatPhase = (otherDeckState.currentTime % otherSecsPerBeat) / otherSecsPerBeat;

      // Start from current position or cue point, then adjust to match the phase
      const basePosition = thisDeckState.isPlaying ? thisDeckState.currentTime : thisDeckState.cuePoint;
      const currentPhase = (basePosition % thisSecsPerBeat) / thisSecsPerBeat;

      // Calculate phase difference and adjust
      let phaseDiff = otherBeatPhase - currentPhase;
      if (phaseDiff < -0.5) phaseDiff += 1;
      if (phaseDiff > 0.5) phaseDiff -= 1;

      const syncedPosition = Math.max(0, basePosition + phaseDiff * thisSecsPerBeat);

      console.log(
        `[DeckContext] Beat sync - Deck ${deck} syncing to Deck ${otherDeck}:`,
        `Phase diff: ${(phaseDiff * 100).toFixed(1)}%,`,
        `Seeking to: ${syncedPosition.toFixed(3)}s`
      );

      // Seek to the synchronized position
      audioEngineRef.current.seek(deck, syncedPosition);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({
        ...prev,
        currentTime: syncedPosition,
      }));

      notifyStateChange();
    } catch (err) {
      console.error(`[DeckContext] Failed to sync beat phase for Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState, deckBState, notifyStateChange, onError]);

  // Manual auto-cue - user-triggered via AUTO CUE button
  // Finds the best cue point based on where the other deck is playing
  const autoCue = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot auto-cue: AudioEngine not initialized');
      return;
    }

    const otherDeck = deck === 'A' ? deckBState : deckAState;
    const thisDeckState = deck === 'A' ? deckAState : deckBState;

    if (!thisDeckState.isLoaded) {
      console.warn('[DeckContext] Cannot auto-cue: track not loaded');
      return;
    }

    // If the other deck is playing, find a context-aware cue point
    let bestCuePoint = 0;
    if (otherDeck.isPlaying && otherDeck.isLoaded && thisDeckState.suggestedCuePoints.length > 0) {
      bestCuePoint = findBestCuePointForTransition(
        thisDeckState.suggestedCuePoints,
        thisDeckState.duration,
        otherDeck.currentTime,
        otherDeck.duration
      );
      console.log(
        `[DeckContext] Auto-cue Deck ${deck}: ${bestCuePoint}s ` +
        `(based on other deck at ${otherDeck.currentTime.toFixed(1)}s / ${otherDeck.duration.toFixed(1)}s)`
      );
    } else if (thisDeckState.suggestedCuePoints.length > 0) {
      // No other deck playing, use first suggested cue point
      bestCuePoint = thisDeckState.suggestedCuePoints[0];
      console.log(`[DeckContext] Auto-cue Deck ${deck}: ${bestCuePoint}s (first phrase boundary)`);
    }

    try {
      // Seek to the cue point and update state
      audioEngineRef.current.seek(deck, bestCuePoint);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({
        ...prev,
        currentTime: bestCuePoint,
        cuePoint: bestCuePoint,
      }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} auto-cued to ${bestCuePoint}s`);
    } catch (err) {
      console.error(`[DeckContext] Failed to auto-cue Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, deckAState, deckBState, notifyStateChange, onError]);

  // Toggle spectral colors display for a deck
  const toggleSpectralColors = useCallback((deck: DeckId) => {
    const updateState = deck === 'A' ? setDeckAState : setDeckBState;
    updateState((prev) => ({
      ...prev,
      showSpectralColors: !prev.showSpectralColors,
    }));
    console.log(`[DeckContext] Deck ${deck} spectral colors toggled`);
  }, []);

  // Set a hot cue at the current position
  const setHotCue = useCallback((deck: DeckId, slot: number) => {
    if (!isInitialized) {
      console.warn('[DeckContext] Cannot set hot cue: not initialized');
      return;
    }

    if (slot < 1 || slot > 8) {
      console.warn('[DeckContext] Invalid hot cue slot:', slot);
      return;
    }

    const slotIndex = slot - 1;
    const deckState = deck === 'A' ? deckAState : deckBState;
    const setHotCuesState = deck === 'A' ? setHotCuesA : setHotCuesB;

    const newHotCue: HotCue = {
      position: deckState.currentTime,
      color: HOT_CUE_COLORS[slotIndex],
    };

    setHotCuesState((prev) => {
      const updated = [...prev];
      updated[slotIndex] = newHotCue;
      return updated;
    });

    console.log(`[DeckContext] Deck ${deck} hot cue ${slot} set at ${deckState.currentTime.toFixed(2)}s`);
  }, [isInitialized, deckAState, deckBState, HOT_CUE_COLORS]);

  // Jump to a hot cue position and start playing
  const jumpToHotCue = useCallback((deck: DeckId, slot: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot jump to hot cue: not initialized');
      return;
    }

    if (slot < 1 || slot > 8) {
      console.warn('[DeckContext] Invalid hot cue slot:', slot);
      return;
    }

    const slotIndex = slot - 1;
    const hotCues = deck === 'A' ? hotCuesA : hotCuesB;
    const hotCue = hotCues[slotIndex];

    if (!hotCue) {
      console.warn(`[DeckContext] No hot cue at slot ${slot}`);
      return;
    }

    try {
      audioEngineRef.current.seek(deck, hotCue.position);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, currentTime: hotCue.position }));

      const deckState = deck === 'A' ? deckAState : deckBState;
      if (!deckState.isPlaying) {
        audioEngineRef.current.play(deck);
        updateState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
      }

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} jumped to hot cue ${slot} at ${hotCue.position.toFixed(2)}s`);
    } catch (err) {
      console.error(`[DeckContext] Failed to jump to hot cue:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, hotCuesA, hotCuesB, deckAState, deckBState, notifyStateChange, onError]);

  // Delete a hot cue
  const deleteHotCue = useCallback((deck: DeckId, slot: number) => {
    if (slot < 1 || slot > 8) {
      console.warn('[DeckContext] Invalid hot cue slot:', slot);
      return;
    }

    const slotIndex = slot - 1;
    const setHotCuesState = deck === 'A' ? setHotCuesA : setHotCuesB;

    setHotCuesState((prev) => {
      const updated = [...prev];
      updated[slotIndex] = null;
      return updated;
    });

    console.log(`[DeckContext] Deck ${deck} hot cue ${slot} deleted`);
  }, []);

  // Update the color of a hot cue
  const updateHotCueColor = useCallback((deck: DeckId, slot: number, color: string) => {
    if (slot < 1 || slot > 8) {
      console.warn('[DeckContext] Invalid hot cue slot:', slot);
      return;
    }

    const slotIndex = slot - 1;
    const hotCues = deck === 'A' ? hotCuesA : hotCuesB;
    const hotCue = hotCues[slotIndex];

    if (!hotCue) {
      console.warn(`[DeckContext] No hot cue at slot ${slot} to update`);
      return;
    }

    const setHotCuesState = deck === 'A' ? setHotCuesA : setHotCuesB;
    setHotCuesState((prev) => {
      const updated = [...prev];
      updated[slotIndex] = { ...hotCue, color };
      return updated;
    });

    console.log(`[DeckContext] Deck ${deck} hot cue ${slot} color updated to ${color}`);
  }, [hotCuesA, hotCuesB]);

  // =========================================================================
  // Loop Functions - Professional DJ loop controls
  // =========================================================================

  /**
   * Helper function to calculate beat duration in seconds
   * @param bpm - Beats per minute
   * @returns Duration of one beat in seconds
   */
  const getBeatDuration = useCallback((bpm: number): number => {
    if (bpm <= 0) return 0.5; // Default fallback
    return 60 / bpm;
  }, []);

  /**
   * Set the loop in (start) point at the current playback position
   * This marks where the loop will begin
   */
  const setLoopIn = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set loop in: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;
    if (!deckState.isLoaded) {
      console.warn('[DeckContext] Cannot set loop in: no track loaded');
      return;
    }

    const loopInPoint = deckState.currentTime;
    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopIn: loopInPoint,
      // Clear loop out if setting a new loop in point
      loopOut: null,
      loopActive: false,
    }));

    // Update AudioEngine loop state
    audioEngineRef.current.setLoop(deck, loopInPoint, null);

    console.log(`[DeckContext] Deck ${deck} loop in set at ${loopInPoint.toFixed(2)}s`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, notifyStateChange]);

  /**
   * Set the loop out (end) point at the current playback position
   * This marks where the loop will end and jump back to loop in
   * Automatically activates the loop if loop in is already set
   */
  const setLoopOut = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set loop out: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;
    if (!deckState.isLoaded) {
      console.warn('[DeckContext] Cannot set loop out: no track loaded');
      return;
    }

    if (deckState.loopIn === null) {
      console.warn('[DeckContext] Cannot set loop out: loop in not set');
      return;
    }

    const loopOutPoint = deckState.currentTime;

    // Ensure loop out is after loop in
    if (loopOutPoint <= deckState.loopIn) {
      console.warn('[DeckContext] Loop out must be after loop in');
      return;
    }

    const loopLength = loopOutPoint - deckState.loopIn;
    const beatDuration = getBeatDuration(deckState.currentBPM);
    const loopLengthInBeats = loopLength / beatDuration;

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopOut: loopOutPoint,
      loopActive: true,
      loopLength: loopLengthInBeats,
    }));

    // Update AudioEngine and enable the loop
    audioEngineRef.current.setLoop(deck, deckState.loopIn, loopOutPoint);
    audioEngineRef.current.enableLoop(deck, true);

    console.log(`[DeckContext] Deck ${deck} loop out set at ${loopOutPoint.toFixed(2)}s (${loopLengthInBeats.toFixed(2)} beats)`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, getBeatDuration, notifyStateChange]);

  /**
   * Toggle loop on/off
   * If loop points are set, this enables or disables looping
   */
  const toggleLoop = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot toggle loop: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;

    // Can only toggle if both loop points are set
    if (deckState.loopIn === null || deckState.loopOut === null) {
      console.warn('[DeckContext] Cannot toggle loop: loop points not set');
      return;
    }

    const newLoopActive = !deckState.loopActive;
    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopActive: newLoopActive,
    }));

    audioEngineRef.current.enableLoop(deck, newLoopActive);

    console.log(`[DeckContext] Deck ${deck} loop ${newLoopActive ? 'enabled' : 'disabled'}`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, notifyStateChange]);

  /**
   * Set an auto-loop of a specific beat length
   * Creates a loop starting at the current position with the specified duration in beats
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param beats - Loop length in beats (1/8, 1/4, 1/2, 1, 2, 4, 8, 16)
   */
  const setAutoLoop = useCallback((deck: DeckId, beats: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set auto loop: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;
    if (!deckState.isLoaded) {
      console.warn('[DeckContext] Cannot set auto loop: no track loaded');
      return;
    }

    if (deckState.currentBPM <= 0) {
      console.warn('[DeckContext] Cannot set auto loop: BPM not available');
      return;
    }

    const beatDuration = getBeatDuration(deckState.currentBPM);
    const loopDuration = beats * beatDuration;
    const loopInPoint = deckState.currentTime;
    const loopOutPoint = loopInPoint + loopDuration;

    // Ensure loop doesn't exceed track duration
    if (loopOutPoint > deckState.duration) {
      console.warn('[DeckContext] Auto loop would exceed track duration');
      return;
    }

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopIn: loopInPoint,
      loopOut: loopOutPoint,
      loopActive: true,
      loopLength: beats,
    }));

    // Update AudioEngine and enable the loop
    audioEngineRef.current.setLoop(deck, loopInPoint, loopOutPoint);
    audioEngineRef.current.enableLoop(deck, true);

    console.log(`[DeckContext] Deck ${deck} auto loop: ${beats} beats (${loopDuration.toFixed(2)}s) at ${loopInPoint.toFixed(2)}s`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, getBeatDuration, notifyStateChange]);

  /**
   * Double the current loop length
   * Extends the loop out point to double the duration
   */
  const doubleLoop = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot double loop: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;

    if (deckState.loopIn === null || deckState.loopOut === null) {
      console.warn('[DeckContext] Cannot double loop: loop not set');
      return;
    }

    const currentLoopLength = deckState.loopOut - deckState.loopIn;
    const newLoopOut = deckState.loopOut + currentLoopLength;

    // Ensure new loop doesn't exceed track duration
    if (newLoopOut > deckState.duration) {
      console.warn('[DeckContext] Cannot double loop: would exceed track duration');
      return;
    }

    const newLoopLengthBeats = deckState.loopLength * 2;

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopOut: newLoopOut,
      loopLength: newLoopLengthBeats,
    }));

    // Update AudioEngine loop points
    audioEngineRef.current.setLoop(deck, deckState.loopIn, newLoopOut);

    // If loop is active, make sure monitor is running with new bounds
    if (deckState.loopActive) {
      audioEngineRef.current.enableLoop(deck, true);
    }

    console.log(`[DeckContext] Deck ${deck} loop doubled: ${deckState.loopLength} -> ${newLoopLengthBeats} beats`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, notifyStateChange]);

  /**
   * Halve the current loop length
   * Shortens the loop out point to half the duration
   */
  const halveLoop = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot halve loop: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;

    if (deckState.loopIn === null || deckState.loopOut === null) {
      console.warn('[DeckContext] Cannot halve loop: loop not set');
      return;
    }

    const currentLoopLength = deckState.loopOut - deckState.loopIn;
    const newLoopLength = currentLoopLength / 2;

    // Minimum loop length is 1/32 beat (roughly 15ms at 120 BPM)
    const minLoopLength = 0.015;
    if (newLoopLength < minLoopLength) {
      console.warn('[DeckContext] Cannot halve loop: already at minimum length');
      return;
    }

    const newLoopOut = deckState.loopIn + newLoopLength;
    const newLoopLengthBeats = deckState.loopLength / 2;

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopOut: newLoopOut,
      loopLength: newLoopLengthBeats,
    }));

    // Update AudioEngine loop points
    audioEngineRef.current.setLoop(deck, deckState.loopIn, newLoopOut);

    // If loop is active, make sure monitor is running with new bounds
    if (deckState.loopActive) {
      audioEngineRef.current.enableLoop(deck, true);
    }

    // If playback is beyond new loop out, jump back to loop in
    if (deckState.currentTime > newLoopOut && deckState.loopActive && deckState.loopIn !== null) {
      audioEngineRef.current.seek(deck, deckState.loopIn);
      const loopInPosition = deckState.loopIn; // Capture non-null value
      updateState((prev) => ({
        ...prev,
        currentTime: loopInPosition,
      }));
    }

    console.log(`[DeckContext] Deck ${deck} loop halved: ${deckState.loopLength} -> ${newLoopLengthBeats} beats`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, notifyStateChange]);

  /**
   * Move the loop forward or backward by its current length
   * Shifts both loop in and loop out points together
   *
   * @param deck - Deck identifier ('A' or 'B')
   * @param direction - 'forward' or 'back'
   */
  const moveLoop = useCallback((deck: DeckId, direction: 'forward' | 'back') => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot move loop: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;

    if (deckState.loopIn === null || deckState.loopOut === null) {
      console.warn('[DeckContext] Cannot move loop: loop not set');
      return;
    }

    const loopLength = deckState.loopOut - deckState.loopIn;
    const moveAmount = direction === 'forward' ? loopLength : -loopLength;

    const newLoopIn = deckState.loopIn + moveAmount;
    const newLoopOut = deckState.loopOut + moveAmount;

    // Ensure new loop stays within track bounds
    if (newLoopIn < 0) {
      console.warn('[DeckContext] Cannot move loop: would go before track start');
      return;
    }
    if (newLoopOut > deckState.duration) {
      console.warn('[DeckContext] Cannot move loop: would exceed track duration');
      return;
    }

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopIn: newLoopIn,
      loopOut: newLoopOut,
    }));

    // Update AudioEngine loop points
    audioEngineRef.current.setLoop(deck, newLoopIn, newLoopOut);

    // If loop is active, ensure monitor is running with new bounds
    if (deckState.loopActive) {
      audioEngineRef.current.enableLoop(deck, true);
    }

    // If playback position is in the old loop, jump to equivalent position in new loop
    if (deckState.loopActive && deckState.currentTime >= deckState.loopIn && deckState.currentTime <= deckState.loopOut) {
      const offsetInLoop = deckState.currentTime - deckState.loopIn;
      const newPosition = newLoopIn + offsetInLoop;
      audioEngineRef.current.seek(deck, newPosition);
      updateState((prev) => ({
        ...prev,
        currentTime: newPosition,
      }));
    }

    console.log(`[DeckContext] Deck ${deck} loop moved ${direction}: ${newLoopIn.toFixed(2)}s - ${newLoopOut.toFixed(2)}s`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, notifyStateChange]);

  /**
   * Exit the loop and continue normal playback
   * Disables looping but keeps the loop points for later reactivation
   */
  const exitLoop = useCallback((deck: DeckId) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot exit loop: AudioEngine not initialized');
      return;
    }

    const deckState = deck === 'A' ? deckAState : deckBState;

    if (!deckState.loopActive) {
      console.log('[DeckContext] Loop already inactive');
      return;
    }

    const updateState = deck === 'A' ? setDeckAState : setDeckBState;

    updateState((prev) => ({
      ...prev,
      loopActive: false,
    }));

    // Disable loop in AudioEngine (keeps loop points for reactivation)
    audioEngineRef.current.enableLoop(deck, false);

    console.log(`[DeckContext] Deck ${deck} exited loop - continuing normal playback`);
    notifyStateChange();
  }, [isInitialized, deckAState, deckBState, notifyStateChange]);

  // Update playback time periodically
  // This is handled by a useEffect in the component that uses the context

  const value: DeckContextValue = {
    deckAState,
    deckBState,
    crossfaderPosition,
    crossfaderCurve,
    audioEngine: audioEngineRef.current,
    isInitialized,
    loadTrack,
    playDeck,
    pauseDeck,
    cueDeck,
    setCuePoint,
    seekDeck,
    setBPM,
    syncBPM,
    syncDeck,
    setVolume,
    setCrossfader,
    setCrossfaderCurve,
    updateCurrentTime,
    setDeckEQ,
    setDeckFilter,
    setPlaybackRate,
    syncBeatPhase,
    autoCue,
    toggleSpectralColors,
    hotCuesA,
    hotCuesB,
    setHotCue,
    jumpToHotCue,
    deleteHotCue,
    updateHotCueColor,
    setLoopIn,
    setLoopOut,
    toggleLoop,
    setAutoLoop,
    doubleLoop,
    halveLoop,
    moveLoop,
    exitLoop,
    getState,
    getDeckState,
    initializeAudioEngine,
    loadErrors,
  };

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>;
}

// Custom hook to use the deck context
export function useDeck() {
  const context = useContext(DeckContext);
  if (context === undefined) {
    throw new Error('useDeck must be used within a DeckProvider');
  }
  return context;
}
