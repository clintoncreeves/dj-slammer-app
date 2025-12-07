/**
 * VirtualDJDeck Component
 *
 * Main component that orchestrates the Virtual DJ Deck experience.
 * Manages AudioEngine, state, and renders all sub-components.
 *
 * Requirements met:
 * - Req 7.1: Accepts configuration options
 * - Req 7.3: Proper resource cleanup on unmount
 * - Req 7.4: Emits state change events
 * - Req 7.5: Provides programmatic API
 */

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { AudioEngine } from './AudioEngine';
import { VirtualDJDeckConfig, VirtualDJDeckState, DeckId, DeckState } from './types';
import { generateWaveformData } from '../../utils/waveformUtils';
import styles from './VirtualDJDeck.module.css';

export interface VirtualDJDeckHandle {
  playDeck: (deck: DeckId) => void;
  pauseDeck: (deck: DeckId) => void;
  cueDeck: (deck: DeckId) => void;
  setBPM: (deck: DeckId, bpm: number) => void;
  setCrossfader: (position: number) => void;
  getState: () => VirtualDJDeckState;
}

interface VirtualDJDeckProps {
  config: VirtualDJDeckConfig;
  className?: string;
}

const VirtualDJDeckComponent = forwardRef<VirtualDJDeckHandle, VirtualDJDeckProps>(
  ({ config, className }, ref) => {
    const audioEngineRef = useRef<AudioEngine | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [needsUserGesture, setNeedsUserGesture] = useState(false);
    const [loadErrors, setLoadErrors] = useState<{ A?: string; B?: string }>({});

    // Deck states
    const [deckAState, setDeckAState] = useState<DeckState>({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      originalBPM: config.deckA.initialBPM,
      currentBPM: config.deckA.initialBPM,
      playbackRate: 1,
      volume: 1,
      isLoaded: false,
      cuePoint: config.deckA.cuePoint,
      waveformData: [],
    });

    const [deckBState, setDeckBState] = useState<DeckState>({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      originalBPM: config.deckB.initialBPM,
      currentBPM: config.deckB.initialBPM,
      playbackRate: 1,
      volume: 1,
      isLoaded: false,
      cuePoint: config.deckB.cuePoint,
      waveformData: [],
    });

    const [crossfaderPosition, setCrossfaderPosition] = useState(0);

    // Initialize Audio Engine
    useEffect(() => {
      let mounted = true;

      const initAudioEngine = async () => {
        try {
          const engine = new AudioEngine();
          audioEngineRef.current = engine;

          await engine.init();

          if (!mounted) return;

          console.log('[VirtualDJDeck] AudioEngine initialized');

          // Load tracks (continue even if some fail)
          const loadResults = await Promise.allSettled([
            loadTrack('A', config.deckA.trackUrl),
            loadTrack('B', config.deckB.trackUrl),
          ]);

          // Check if any tracks failed to load
          const failedLoads = loadResults.filter((r) => r.status === 'rejected');
          if (failedLoads.length > 0) {
            console.warn(
              `[VirtualDJDeck] ${failedLoads.length} track(s) failed to load, but continuing...`
            );
          }

          // Set initialized even if tracks failed to load
          // This allows the UI to render with error messages per deck
          if (!mounted) return;
          setIsInitialized(true);
        } catch (err) {
          if (!mounted) return;

          console.error('[VirtualDJDeck] Initialization error:', err);

          // Check if it's a user gesture issue
          if (err instanceof Error && err.message.includes('autoplay')) {
            setNeedsUserGesture(true);
          } else {
            setError(err as Error);
            config.onError?.(err as Error);
          }
        }
      };

      initAudioEngine();

      return () => {
        mounted = false;
        if (audioEngineRef.current) {
          audioEngineRef.current.destroy();
          audioEngineRef.current = null;
        }
      };
    }, []); // Only run once on mount

    // Load a track for a deck
    const loadTrack = async (deck: DeckId, url: string) => {
      if (!audioEngineRef.current) return;

      try {
        await audioEngineRef.current.loadTrack(deck, url);

        // Generate waveform data
        const buffer = audioEngineRef.current.getAudioBuffer(deck);
        const waveformData = buffer ? generateWaveformData(buffer, 200) : [];
        const duration = audioEngineRef.current.getDuration(deck);

        // Update state
        const updateState = deck === 'A' ? setDeckAState : setDeckBState;
        updateState((prev) => ({
          ...prev,
          isLoaded: true,
          duration,
          waveformData,
        }));

        // Clear any previous load error for this deck
        setLoadErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[deck];
          return newErrors;
        });

        console.log(`[VirtualDJDeck] Track loaded for Deck ${deck}`);
      } catch (err) {
        console.error(`[VirtualDJDeck] Failed to load track for Deck ${deck}:`, err);
        
        // Store the error message for this specific deck
        const errorMessage = err instanceof Error ? err.message : 'Failed to load track';
        setLoadErrors((prev) => ({ ...prev, [deck]: errorMessage }));
        
        // Still call the error callback but don't set global error
        config.onError?.(err as Error);
      }
    };

    // Play a deck
    const playDeck = (deck: DeckId) => {
      if (!audioEngineRef.current || !isInitialized) return;

      try {
        audioEngineRef.current.play(deck);

        const updateState = deck === 'A' ? setDeckAState : setDeckBState;
        updateState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));

        notifyStateChange();
      } catch (err) {
        console.error(`[VirtualDJDeck] Failed to play Deck ${deck}:`, err);
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Pause a deck
    const pauseDeck = (deck: DeckId) => {
      if (!audioEngineRef.current || !isInitialized) return;

      try {
        audioEngineRef.current.pause(deck);

        const updateState = deck === 'A' ? setDeckAState : setDeckBState;
        updateState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));

        notifyStateChange();
      } catch (err) {
        console.error(`[VirtualDJDeck] Failed to pause Deck ${deck}:`, err);
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Cue a deck
    const cueDeck = (deck: DeckId) => {
      if (!audioEngineRef.current || !isInitialized) return;

      try {
        const cuePoint = deck === 'A' ? deckAState.cuePoint : deckBState.cuePoint;
        audioEngineRef.current.cue(deck, cuePoint);

        const updateState = deck === 'A' ? setDeckAState : setDeckBState;
        updateState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));

        notifyStateChange();
      } catch (err) {
        console.error(`[VirtualDJDeck] Failed to cue Deck ${deck}:`, err);
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Set BPM for a deck
    const setBPM = (deck: DeckId, bpm: number) => {
      if (!audioEngineRef.current || !isInitialized) return;

      const state = deck === 'A' ? deckAState : deckBState;
      const playbackRate = bpm / state.originalBPM;

      try {
        audioEngineRef.current.setPlaybackRate(deck, playbackRate);

        const updateState = deck === 'A' ? setDeckAState : setDeckBState;
        updateState((prev) => ({ ...prev, currentBPM: bpm, playbackRate }));

        notifyStateChange();
      } catch (err) {
        console.error(`[VirtualDJDeck] Failed to set BPM for Deck ${deck}:`, err);
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Set crossfader position
    const setCrossfader = (position: number) => {
      if (!audioEngineRef.current || !isInitialized) return;

      try {
        audioEngineRef.current.setCrossfade(position);
        setCrossfaderPosition(position);

        notifyStateChange();
      } catch (err) {
        console.error('[VirtualDJDeck] Failed to set crossfader:', err);
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Get current state
    const getState = (): VirtualDJDeckState => {
      return {
        deckA: deckAState,
        deckB: deckBState,
        crossfaderPosition,
      };
    };

    // Notify parent of state changes
    const notifyStateChange = () => {
      config.onStateChange?.(getState());
    };

    // Handle "tap to enable audio" button
    const handleEnableAudio = async () => {
      if (!audioEngineRef.current) return;

      try {
        await audioEngineRef.current.init();
        setNeedsUserGesture(false);
        setIsInitialized(true);

        // Load tracks after initialization
        await Promise.all([
          loadTrack('A', config.deckA.trackUrl),
          loadTrack('B', config.deckB.trackUrl),
        ]);
      } catch (err) {
        console.error('[VirtualDJDeck] Failed to enable audio:', err);
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Expose public API via ref
    useImperativeHandle(ref, () => ({
      playDeck,
      pauseDeck,
      cueDeck,
      setBPM,
      setCrossfader,
      getState,
    }));

    // Update playback time periodically
    useEffect(() => {
      if (!isInitialized || !audioEngineRef.current) return;

      const interval = setInterval(() => {
        if (!audioEngineRef.current) return;

        // Update Deck A
        if (deckAState.isPlaying) {
          const currentTime = audioEngineRef.current.getCurrentTime('A');
          setDeckAState((prev) => ({ ...prev, currentTime }));
        }

        // Update Deck B
        if (deckBState.isPlaying) {
          const currentTime = audioEngineRef.current.getCurrentTime('B');
          setDeckBState((prev) => ({ ...prev, currentTime }));
        }
      }, 16); // 60fps updates

      return () => clearInterval(interval);
    }, [isInitialized, deckAState.isPlaying, deckBState.isPlaying]);

    // Render error state
    if (error) {
      return (
        <div className={`${styles.container} ${className || ''}`}>
          <div className={styles.error}>
            <h2>Audio Error</h2>
            <p>{error.message}</p>
          </div>
        </div>
      );
    }

    // Render "tap to enable audio" overlay
    if (needsUserGesture) {
      return (
        <div className={`${styles.container} ${className || ''}`}>
          <div className={styles.overlay}>
            <button className={styles.enableAudioButton} onClick={handleEnableAudio}>
              Tap to Enable Audio
            </button>
          </div>
        </div>
      );
    }

    // Render loading state
    if (!isInitialized) {
      return (
        <div className={`${styles.container} ${className || ''}`}>
          <div className={styles.loading}>
            <h2>Loading Virtual DJ Deck...</h2>
          </div>
        </div>
      );
    }

    // Render main component (will be filled in with sub-components)
    return (
      <div className={`${styles.container} ${className || ''}`}>
        <div className={styles.decksContainer}>
          <div className={styles.deck}>
            <h3>Deck A</h3>
            {loadErrors.A ? (
              <div className={styles.deckError}>
                <p>⚠️ Track failed to load</p>
                <p className={styles.errorDetail}>{config.deckA.trackUrl}</p>
                <p className={styles.errorHint}>
                  Add audio files to <code>public/audio/</code> directory
                </p>
              </div>
            ) : !deckAState.isLoaded ? (
              <p>Loading track...</p>
            ) : (
              <>
                <p>Playing: {deckAState.isPlaying ? 'Yes' : 'No'}</p>
                <p>BPM: {deckAState.currentBPM.toFixed(0)}</p>
                <button onClick={() => playDeck('A')} disabled={!deckAState.isLoaded}>
                  Play
                </button>
                <button onClick={() => pauseDeck('A')} disabled={!deckAState.isLoaded}>
                  Pause
                </button>
                <button onClick={() => cueDeck('A')} disabled={!deckAState.isLoaded}>
                  Cue
                </button>
              </>
            )}
          </div>

          <div className={styles.deck}>
            <h3>Deck B</h3>
            {loadErrors.B ? (
              <div className={styles.deckError}>
                <p>⚠️ Track failed to load</p>
                <p className={styles.errorDetail}>{config.deckB.trackUrl}</p>
                <p className={styles.errorHint}>
                  Add audio files to <code>public/audio/</code> directory
                </p>
              </div>
            ) : !deckBState.isLoaded ? (
              <p>Loading track...</p>
            ) : (
              <>
                <p>Playing: {deckBState.isPlaying ? 'Yes' : 'No'}</p>
                <p>BPM: {deckBState.currentBPM.toFixed(0)}</p>
                <button onClick={() => playDeck('B')} disabled={!deckBState.isLoaded}>
                  Play
                </button>
                <button onClick={() => pauseDeck('B')} disabled={!deckBState.isLoaded}>
                  Pause
                </button>
                <button onClick={() => cueDeck('B')} disabled={!deckBState.isLoaded}>
                  Cue
                </button>
              </>
            )}
          </div>
        </div>

        <div className={styles.crossfaderContainer}>
          <label>Crossfader</label>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={crossfaderPosition}
            onChange={(e) => setCrossfader(parseFloat(e.target.value))}
          />
        </div>
      </div>
    );
  }
);

VirtualDJDeckComponent.displayName = 'VirtualDJDeck';

export default VirtualDJDeckComponent;
