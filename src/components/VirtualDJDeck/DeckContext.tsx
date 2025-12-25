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
import { DeckState, DeckId, VirtualDJDeckState } from './types';
import { generateWaveformData } from '../../utils/waveformUtils';
import { calculateBPMSync, BPMSyncResult } from '../../utils/bpmSync';

/** Track info for loading into a deck */
export interface TrackInfo {
  url: string;
  name: string;
  artist: string;
  bpm: number;
  cuePoint?: number;
  /** Suggested cue points at musical phrase boundaries */
  suggestedCuePoints?: number[];
}

interface DeckContextValue {
  // Deck States
  deckAState: DeckState;
  deckBState: DeckState;
  crossfaderPosition: number;

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
  updateCurrentTime: (deck: DeckId, time: number) => void;
  setDeckEQ: (deck: DeckId, band: 'low' | 'mid' | 'high', value: number) => void;
  setPlaybackRate: (deck: DeckId, rate: number) => void;

  // Manual DJ Assistant Functions (user-triggered via buttons)
  syncBeatPhase: (deck: DeckId) => void;
  autoCue: (deck: DeckId) => void;

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
 * Find the best cue point for a new track based on where the other deck is playing
 *
 * Context-aware DJ assistant: When loading a track onto one deck while another
 * is playing, suggest a starting cue point that would make for a natural transition.
 * This finds a phrase boundary in the new track that has similar "energy position"
 * (relative position within the track structure).
 *
 * @param newTrackCuePoints - Array of phrase boundary cue points for the new track
 * @param newTrackDuration - Duration of the new track in seconds
 * @param playingTrackCurrentTime - Current playback position of the playing track
 * @param playingTrackDuration - Total duration of the playing track
 * @returns Best cue point to start the new track, or 0 if none found
 */
function findBestCuePointForTransition(
  newTrackCuePoints: number[],
  newTrackDuration: number,
  playingTrackCurrentTime: number,
  playingTrackDuration: number
): number {
  if (!newTrackCuePoints.length || !newTrackDuration || !playingTrackDuration) {
    return 0;
  }

  // Calculate where we are in the playing track as a percentage (0-1)
  const playingTrackProgress = playingTrackCurrentTime / playingTrackDuration;

  // For a good transition, we typically want to start the new track at a point
  // that has similar energy. In most dance tracks:
  // - 0-25%: Intro/buildup
  // - 25-50%: First main section
  // - 50-75%: Peak/drop section
  // - 75-100%: Outro

  // Find a cue point in the new track that's in a similar "zone"
  // but not too close to the end (leave room for mixing out)
  const targetProgress = Math.min(playingTrackProgress, 0.6); // Don't start past 60%
  const targetTime = targetProgress * newTrackDuration;

  // Find the closest cue point to our target
  let bestCuePoint = 0;
  let smallestDiff = Infinity;

  for (const cuePoint of newTrackCuePoints) {
    // Skip cue points too close to the end
    if (cuePoint > newTrackDuration * 0.7) continue;

    const diff = Math.abs(cuePoint - targetTime);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      bestCuePoint = cuePoint;
    }
  }

  return bestCuePoint;
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
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
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
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
  });

  // Start crossfader fully on Deck A so users learn to crossfade to Deck B
  const [crossfaderPosition, setCrossfaderPositionState] = useState(INITIAL_CROSSFADER_POSITION);

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
      const waveformData = buffer ? generateWaveformData(buffer, 200) : [];
      const duration = audioEngineRef.current.getDuration(deck);

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
        trackName: name,
        artistName: artist,
        originalBPM: bpm,
        currentBPM: bpm,
        cuePoint: initialCuePoint,
        suggestedCuePoints: cuePoints,
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

  // Seek to a position in a deck
  const seekDeck = useCallback((deck: DeckId, time: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot seek: AudioEngine not initialized');
      return;
    }

    try {
      audioEngineRef.current.seek(deck, time);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, currentTime: time }));

      notifyStateChange();
      console.log(`[DeckContext] Deck ${deck} seeked to ${time}s`);
    } catch (err) {
      console.error(`[DeckContext] Failed to seek Deck ${deck}:`, err);
      onError?.(err as Error);
    }
  }, [isInitialized, notifyStateChange, onError]);

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

  // Set crossfader position
  const setCrossfader = useCallback((position: number) => {
    if (!audioEngineRef.current || !isInitialized) {
      console.warn('[DeckContext] Cannot set crossfader: AudioEngine not initialized');
      return;
    }

    try {
      audioEngineRef.current.setCrossfade(position);
      setCrossfaderPositionState(position);

      notifyStateChange();
      console.log(`[DeckContext] Crossfader position set to ${position}`);
    } catch (err) {
      console.error('[DeckContext] Failed to set crossfader:', err);
      onError?.(err as Error);
    }
  }, [isInitialized, notifyStateChange, onError]);

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

  // Update playback time periodically
  // This is handled by a useEffect in the component that uses the context

  const value: DeckContextValue = {
    deckAState,
    deckBState,
    crossfaderPosition,
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
    updateCurrentTime,
    setDeckEQ,
    setPlaybackRate,
    syncBeatPhase,
    autoCue,
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
