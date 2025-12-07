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

interface DeckContextValue {
  // Deck States
  deckAState: DeckState;
  deckBState: DeckState;
  crossfaderPosition: number;
  
  // Audio Engine
  audioEngine: AudioEngine | null;
  isInitialized: boolean;
  
  // Deck Operations
  loadTrack: (deck: DeckId, url: string, initialBPM: number, cuePoint: number) => Promise<void>;
  playDeck: (deck: DeckId) => void;
  pauseDeck: (deck: DeckId) => void;
  cueDeck: (deck: DeckId) => void;
  setBPM: (deck: DeckId, bpm: number) => void;
  syncBPM: (slaveDeck: DeckId, masterDeck: DeckId) => BPMSyncResult | null;
  setVolume: (deck: DeckId, volume: number) => void;
  setCrossfader: (position: number) => void;
  updateCurrentTime: (deck: DeckId) => void;
  
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

export function DeckProvider({ children, onStateChange, onError }: DeckProviderProps) {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadErrors, setLoadErrors] = useState<{ A?: string; B?: string }>({});
  
  // Deck States - The central focal points
  const [deckAState, setDeckAState] = useState<DeckState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    originalBPM: 0,
    currentBPM: 0,
    playbackRate: 1,
    volume: 1,
    isLoaded: false,
    cuePoint: 0,
    waveformData: [],
  });

  const [deckBState, setDeckBState] = useState<DeckState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    originalBPM: 0,
    currentBPM: 0,
    playbackRate: 1,
    volume: 1,
    isLoaded: false,
    cuePoint: 0,
    waveformData: [],
  });

  const [crossfaderPosition, setCrossfaderPositionState] = useState(0);

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
      setIsInitialized(true);
      console.log('[DeckContext] AudioEngine initialized');
    } catch (err) {
      console.error('[DeckContext] Failed to initialize AudioEngine:', err);
      onError?.(err as Error);
      throw err;
    }
  }, [onError]);

  // Load a track for a deck
  const loadTrack = useCallback(async (deck: DeckId, url: string, initialBPM: number, cuePoint: number) => {
    if (!audioEngineRef.current) {
      throw new Error('AudioEngine not initialized');
    }

    try {
      await audioEngineRef.current.loadTrack(deck, url);

      const buffer = audioEngineRef.current.getAudioBuffer(deck);
      const waveformData = buffer ? generateWaveformData(buffer, 200) : [];
      const duration = audioEngineRef.current.getDuration(deck);

      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({
        ...prev,
        isLoaded: true,
        duration,
        waveformData,
        originalBPM: initialBPM,
        currentBPM: initialBPM,
        cuePoint,
      }));

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

  // Play a deck
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
    setBPM,
    syncBPM,
    setVolume,
    setCrossfader,
    updateCurrentTime,
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
