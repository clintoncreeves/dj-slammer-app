/**
 * VirtualDJDeck Component - Professional Version
 *
 * Complete DJ deck with all professional UI components integrated.
 * This is the production-ready version with waveforms, professional controls, and polish.
 */

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { AudioEngine } from './AudioEngine';
import { VirtualDJDeckConfig, VirtualDJDeckState, DeckId, DeckState } from './types';
import { generateWaveformData } from '../../utils/waveformUtils';
import { DeckControls } from './DeckControls';
import { Waveform } from './Waveform';
import { BPMDisplay } from './BPMDisplay';
import { TempoSlider } from './TempoSlider';
import { Crossfader } from './Crossfader';
import { VolumeControl } from './VolumeControl';
import { useTutorial } from './useTutorial';
import { TutorialConfig } from './tutorialTypes';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialInstructionPanel } from './TutorialInstructionPanel';
import styles from './VirtualDJDeck_Professional.module.css';

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
  tutorialConfig?: TutorialConfig;
  className?: string;
}

const VirtualDJDeckProfessional = forwardRef<VirtualDJDeckHandle, VirtualDJDeckProps>(
  ({ config, tutorialConfig, className }, ref) => {
    const audioEngineRef = useRef<AudioEngine | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [needsUserGesture, setNeedsUserGesture] = useState(true); // Start with button visible
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

    // Don't auto-initialize - wait for user gesture
    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (audioEngineRef.current) {
          audioEngineRef.current.destroy();
          audioEngineRef.current = null;
        }
      };
    }, []);

    // Load a track for a deck
    const loadTrack = async (deck: DeckId, url: string) => {
      if (!audioEngineRef.current) return;

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
        tutorial.validateStep(getState());
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
        tutorial.validateStep(getState());
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
        tutorial.validateStep(getState());
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
        tutorial.validateStep(getState());
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
        tutorial.validateStep(getState());
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

    // Initialize tutorial system (after getState is defined)
    const tutorial = useTutorial(tutorialConfig || null, getState());

    // Get highlight target once for rendering
    const highlightTarget = tutorial.getHighlightTarget();

    // Debug: Log highlight target
    useEffect(() => {
      console.log('[DEBUG] Current highlight target:', highlightTarget);
      console.log('[DEBUG] Tutorial active:', tutorial.progress.isActive);
      console.log('[DEBUG] Current step:', tutorial.currentStep?.instruction);
    }, [tutorial.currentStep, tutorial.progress.isActive, highlightTarget]);

    // Set volume for a deck
    const setVolume = (deck: DeckId, volume: number) => {
      if (!audioEngineRef.current) return;
      audioEngineRef.current.setDeckVolume(deck, volume);
      const updateState = deck === 'A' ? setDeckAState : setDeckBState;
      updateState((prev) => ({ ...prev, volume }));
      notifyStateChange();
      tutorial.validateStep(getState());
    };

    // Notify parent of state changes
    const notifyStateChange = () => {
      config.onStateChange?.(getState());
    };

    // Handle "tap to enable audio" button
    const handleEnableAudio = async () => {
      try {
        // Create and initialize AudioEngine INSIDE the click handler
        const engine = new AudioEngine();
        audioEngineRef.current = engine;

        // Initialize Tone.js (this MUST happen in the click handler)
        await engine.init();

        console.log('[VirtualDJDeck] AudioEngine initialized after user gesture');

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
        setNeedsUserGesture(false);
        setIsInitialized(true);
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

        if (deckAState.isPlaying) {
          const currentTime = audioEngineRef.current.getCurrentTime('A');
          setDeckAState((prev) => ({ ...prev, currentTime }));
        }

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
            <button onClick={() => setError(null)} className={styles.retryButton}>
              Retry
            </button>
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
              🎵 Tap to Enable Audio
            </button>
            <p className={styles.overlayHint}>
              Your browser requires a user interaction to start audio
            </p>
          </div>
        </div>
      );
    }

    // Render loading state
    if (!isInitialized) {
      return (
        <div className={`${styles.container} ${className || ''}`}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <h2>Loading Virtual DJ Deck...</h2>
            <p>Initializing audio engine</p>
          </div>
        </div>
      );
    }

    // Render main professional UI
    return (
      <div className={`${styles.container} ${className || ''}`}>
        {/* Tutorial Instruction Panel - Fixed at top, Guitar Hero style */}
        {tutorial.progress.isActive && tutorial.currentStep && tutorialConfig && (
          <TutorialInstructionPanel
            lesson={tutorialConfig.lesson}
            progress={tutorial.progress}
            currentStep={tutorial.currentStep}
            showCelebration={tutorial.showCelebration}
          />
        )}

        <div className={styles.header}>
          <h2 className={styles.title}>Virtual DJ Deck</h2>
        </div>

        <div className={styles.decksContainer}>
          {/* Deck A */}
          <div className={styles.deck} data-deck="a">
            <div className={styles.deckHeader}>
              <h3 style={{ color: config.deckA.waveformColor }}>Deck A</h3>
            </div>

            {loadErrors.A ? (
              <div className={styles.deckError}>
                <p className={styles.errorIcon}>⚠️</p>
                <p className={styles.errorMessage}>Track failed to load</p>
                <p className={styles.errorDetail}>{config.deckA.trackUrl}</p>
                <p className={styles.errorHint}>
                  Add audio files to <code>public/audio/</code> directory
                </p>
              </div>
            ) : !deckAState.isLoaded ? (
              <div className={styles.deckLoading}>
                <p>Loading track...</p>
              </div>
            ) : null}

            <Waveform
              waveformData={deckAState.waveformData}
              color={config.deckA.waveformColor}
              isPlaying={deckAState.isPlaying}
              currentTime={deckAState.currentTime}
              duration={deckAState.duration}
              width={400}
              height={100}
              className={styles.waveform}
            />

            <BPMDisplay
              originalBPM={deckAState.originalBPM}
              currentBPM={deckAState.currentBPM}
              color={config.deckA.waveformColor}
              className={styles.bpmDisplay}
            />

            <div className={styles.controlsRow}>
              <VolumeControl
                deck="A"
                volume={deckAState.volume}
                color={config.deckA.waveformColor}
                onChange={(vol) => setVolume('A', vol)}
                highlighted={
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.control === 'volume' &&
                  highlightTarget?.deck === 'A'
                }
              />

              <TempoSlider
                deck="A"
                originalBPM={deckAState.originalBPM}
                currentBPM={deckAState.currentBPM}
                color={config.deckA.waveformColor}
                onChange={(bpm) => setBPM('A', bpm)}
              />

              <DeckControls
                deck="A"
                isPlaying={deckAState.isPlaying}
                isLoaded={deckAState.isLoaded}
                color={config.deckA.waveformColor}
                onPlay={() => playDeck('A')}
                onPause={() => pauseDeck('A')}
                onCue={() => cueDeck('A')}
                highlightPlay={
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'play' &&
                  highlightTarget?.deck === 'A'
                }
                highlightPause={
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'pause' &&
                  highlightTarget?.deck === 'A'
                }
                highlightCue={
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'cue' &&
                  highlightTarget?.deck === 'A'
                }
              />
            </div>
          </div>

          {/* Deck B */}
          <div className={styles.deck} data-deck="b">
            <div className={styles.deckHeader}>
              <h3 style={{ color: config.deckB.waveformColor }}>Deck B</h3>
            </div>

            {loadErrors.B ? (
              <div className={styles.deckError}>
                <p className={styles.errorIcon}>⚠️</p>
                <p className={styles.errorMessage}>Track failed to load</p>
                <p className={styles.errorDetail}>{config.deckB.trackUrl}</p>
                <p className={styles.errorHint}>
                  Add audio files to <code>public/audio/</code> directory
                </p>
              </div>
            ) : !deckBState.isLoaded ? (
              <div className={styles.deckLoading}>
                <p>Loading track...</p>
              </div>
            ) : null}

            <Waveform
              waveformData={deckBState.waveformData}
              color={config.deckB.waveformColor}
              isPlaying={deckBState.isPlaying}
              currentTime={deckBState.currentTime}
              duration={deckBState.duration}
              width={400}
              height={100}
              className={styles.waveform}
            />

            <BPMDisplay
              originalBPM={deckBState.originalBPM}
              currentBPM={deckBState.currentBPM}
              color={config.deckB.waveformColor}
              className={styles.bpmDisplay}
            />

            <div className={styles.controlsRow}>
              <VolumeControl
                deck="B"
                volume={deckBState.volume}
                color={config.deckB.waveformColor}
                onChange={(vol) => setVolume('B', vol)}
                highlighted={
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.control === 'volume' &&
                  highlightTarget?.deck === 'B'
                }
              />

              <TempoSlider
                deck="B"
                originalBPM={deckBState.originalBPM}
                currentBPM={deckBState.currentBPM}
                color={config.deckB.waveformColor}
                onChange={(bpm) => setBPM('B', bpm)}
              />

              <DeckControls
                deck="B"
                isPlaying={deckBState.isPlaying}
                isLoaded={deckBState.isLoaded}
                color={config.deckB.waveformColor}
                onPlay={() => playDeck('B')}
                onPause={() => pauseDeck('B')}
                onCue={() => cueDeck('B')}
                highlightPlay={
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'play' &&
                  highlightTarget?.deck === 'B'
                }
                highlightPause={
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'pause' &&
                  highlightTarget?.deck === 'B'
                }
                highlightCue={
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'cue' &&
                  highlightTarget?.deck === 'B'
                }
              />
            </div>
          </div>
        </div>

        {/* Crossfader */}
        <Crossfader
          position={crossfaderPosition}
          onChange={setCrossfader}
          colorA={config.deckA.waveformColor}
          colorB={config.deckB.waveformColor}
          snapToCenter={true}
          highlighted={highlightTarget?.type === 'crossfader'}
          className={styles.crossfader}
        />

        {/* Tutorial Overlay - ONLY show for final lesson completion */}
        {tutorial.progress.isActive && tutorial.progress.lessonCompleted && tutorialConfig && (
          <TutorialOverlay
            lesson={tutorialConfig.lesson}
            progress={tutorial.progress}
            currentStep={null}
            showCelebration={false}
            onNextStep={tutorial.nextStep}
            onShowHint={tutorial.showHint}
            onExit={tutorial.exitTutorial}
            showHintButton={false}
          />
        )}
      </div>
    );
  }
);

VirtualDJDeckProfessional.displayName = 'VirtualDJDeckProfessional';

export default VirtualDJDeckProfessional;
