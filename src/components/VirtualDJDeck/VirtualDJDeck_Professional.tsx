/**
 * VirtualDJDeck Component - Professional Version with Centralized State
 *
 * Complete DJ deck with all professional UI components integrated.
 * This version uses DeckContext for centralized state management where
 * Deck A and Deck B are the central focal points.
 *
 * Architecture:
 * - DeckContext provides centralized state for both decks
 * - All controls (crossfader, tempo, volume, playback) read from and write to deck state
 * - State changes propagate bidirectionally to all components
 * - AudioEngine is controlled through DeckContext, not directly by UI components
 */

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { VirtualDJDeckConfig, VirtualDJDeckState, DeckId } from './types';
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
import { DeckProvider, useDeck } from './DeckContext';
import { BPMSyncResult } from '../../utils/bpmSync';
import { WelcomeScreen } from '../Welcome';
import { TrackLibrary } from './TrackLibrary';
import styles from './VirtualDJDeck_Professional.module.css';

export interface VirtualDJDeckHandle {
  playDeck: (deck: DeckId) => void;
  pauseDeck: (deck: DeckId) => void;
  cueDeck: (deck: DeckId) => void;
  setBPM: (deck: DeckId, bpm: number) => void;
  syncBPM: (slaveDeck: DeckId, masterDeck: DeckId) => BPMSyncResult | null;
  setCrossfader: (position: number) => void;
  getState: () => VirtualDJDeckState;
}

type AppMode = 'tutorial' | 'freeplay';

interface VirtualDJDeckProps {
  config: VirtualDJDeckConfig;
  tutorialConfig?: TutorialConfig;
  className?: string;
  mode?: AppMode;
  onModeChange?: (mode: AppMode) => void;
  onReplayLesson?: () => void;
}

/**
 * Internal component that consumes DeckContext
 */
const VirtualDJDeckInternal = forwardRef<VirtualDJDeckHandle, VirtualDJDeckProps>(
  ({ config, tutorialConfig, className, mode = 'tutorial', onModeChange, onReplayLesson }, ref) => {
    // Use the centralized deck context
    const deck = useDeck();
    
    const [needsUserGesture, setNeedsUserGesture] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (deck.audioEngine) {
          deck.audioEngine.destroy();
        }
      };
    }, []);

    // Get current state for tutorial system
    const getState = (): VirtualDJDeckState => deck.getState();

    // Initialize tutorial system
    const tutorial = useTutorial(tutorialConfig || null, getState());

    // Get highlight target once for rendering
    const highlightTarget = tutorial.getHighlightTarget();


    // Handle lesson completion actions
    const handleReplayLesson = () => {
      onReplayLesson?.();
    };

    const handleFreePlayMode = () => {
      onModeChange?.('freeplay');
    };

    const handleMoreLessons = () => {
      // Future: Navigate to lesson selection screen
    };

    // Initialize audio engine and load tracks
    const handleEnableAudio = async () => {
      try {
        await deck.initializeAudioEngine();

        // Load tracks (continue even if some fail)
        await Promise.allSettled([
          deck.loadTrack('A', config.deckA.trackUrl, config.deckA.initialBPM, config.deckA.cuePoint),
          deck.loadTrack('B', config.deckB.trackUrl, config.deckB.initialBPM, config.deckB.cuePoint),
        ]);

        setNeedsUserGesture(false);
      } catch (err) {
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Expose public API via ref
    useImperativeHandle(ref, () => ({
      playDeck: deck.playDeck,
      pauseDeck: deck.pauseDeck,
      cueDeck: deck.cueDeck,
      setBPM: deck.setBPM,
      syncBPM: deck.syncBPM,
      setCrossfader: deck.setCrossfader,
      getState: deck.getState,
    }));

    // Update playback time periodically
    useEffect(() => {
      if (!deck.isInitialized || !deck.audioEngine) return;

      const interval = setInterval(() => {
        if (!deck.audioEngine) return;

        if (deck.deckAState.isPlaying) {
          const currentTime = deck.audioEngine.getCurrentTime('A');
          deck.updateCurrentTime('A', currentTime);
        }

        if (deck.deckBState.isPlaying) {
          const currentTime = deck.audioEngine.getCurrentTime('B');
          deck.updateCurrentTime('B', currentTime);
        }
      }, 16); // 60fps updates

      return () => clearInterval(interval);
    }, [deck]);

    // Wrap deck operations to include tutorial validation
    const playDeckWithTutorial = (deckId: DeckId) => {
      deck.playDeck(deckId);
      tutorial.validateStep(getState());
    };

    const pauseDeckWithTutorial = (deckId: DeckId) => {
      deck.pauseDeck(deckId);
      tutorial.validateStep(getState());
    };

    const cueDeckWithTutorial = (deckId: DeckId) => {
      deck.cueDeck(deckId);
      tutorial.validateStep(getState());
    };

    const setBPMWithTutorial = (deckId: DeckId, bpm: number) => {
      deck.setBPM(deckId, bpm);
      tutorial.validateStep(getState());
    };

    const setVolumeWithTutorial = (deckId: DeckId, volume: number) => {
      deck.setVolume(deckId, volume);
      tutorial.validateStep(getState());
    };

    const setCrossfaderWithTutorial = (position: number) => {
      deck.setCrossfader(position);
      tutorial.validateStep(getState());
    };

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

    // Render professional welcome screen
    if (needsUserGesture) {
      return <WelcomeScreen onStart={handleEnableAudio} isLoading={false} />;
    }

    // Render loading state
    if (!deck.isInitialized) {
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
        {mode === 'tutorial' && tutorial.progress.isActive && tutorial.currentStep && tutorialConfig && (
          <TutorialInstructionPanel
            lesson={tutorialConfig.lesson}
            progress={tutorial.progress}
            currentStep={tutorial.currentStep}
            showCelebration={tutorial.showCelebration}
          />
        )}


        <div className={styles.decksContainer}>
          {/* Deck A */}
          <div className={styles.deck} data-deck="a">
            <div className={styles.deckHeader}>
              <h3 style={{ color: config.deckA.waveformColor }}>Deck A</h3>
            </div>

            {deck.loadErrors.A ? (
              <div className={styles.deckError}>
                <p className={styles.errorIcon}>⚠️</p>
                <p className={styles.errorMessage}>Track failed to load</p>
                <p className={styles.errorDetail}>{config.deckA.trackUrl}</p>
                <p className={styles.errorHint}>
                  Add audio files to <code>public/audio/</code> directory
                </p>
              </div>
            ) : !deck.deckAState.isLoaded ? (
              <div className={styles.deckLoading}>
                <p>Loading track...</p>
              </div>
            ) : null}

            <Waveform
              waveformData={deck.deckAState.waveformData}
              color={config.deckA.waveformColor}
              isPlaying={deck.deckAState.isPlaying}
              currentTime={deck.deckAState.currentTime}
              duration={deck.deckAState.duration}
              width={400}
              height={100}
              className={styles.waveform}
            />

            <BPMDisplay
              originalBPM={deck.deckAState.originalBPM}
              currentBPM={deck.deckAState.currentBPM}
              color={config.deckA.waveformColor}
              className={styles.bpmDisplay}
            />

            <div className={styles.controlsRow}>
              <VolumeControl
                deck="A"
                volume={deck.deckAState.volume}
                color={config.deckA.waveformColor}
                onChange={(vol) => setVolumeWithTutorial('A', vol)}
                highlighted={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.control === 'volume' &&
                  highlightTarget?.deck === 'A'
                }
              />

              <TempoSlider
                deck="A"
                originalBPM={deck.deckAState.originalBPM}
                currentBPM={deck.deckAState.currentBPM}
                color={config.deckA.waveformColor}
                onChange={(bpm) => setBPMWithTutorial('A', bpm)}
                highlighted={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.control === 'tempo' &&
                  highlightTarget?.deck === 'A'
                }
              />

              <DeckControls
                deck="A"
                isPlaying={deck.deckAState.isPlaying}
                isLoaded={deck.deckAState.isLoaded}
                color={config.deckA.waveformColor}
                onPlay={() => playDeckWithTutorial('A')}
                onPause={() => pauseDeckWithTutorial('A')}
                onCue={() => cueDeckWithTutorial('A')}
                highlightPlay={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'play' &&
                  highlightTarget?.deck === 'A'
                }
                highlightPause={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'pause' &&
                  highlightTarget?.deck === 'A'
                }
                highlightCue={
                  mode === 'tutorial' &&
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

            {deck.loadErrors.B ? (
              <div className={styles.deckError}>
                <p className={styles.errorIcon}>⚠️</p>
                <p className={styles.errorMessage}>Track failed to load</p>
                <p className={styles.errorDetail}>{config.deckB.trackUrl}</p>
                <p className={styles.errorHint}>
                  Add audio files to <code>public/audio/</code> directory
                </p>
              </div>
            ) : !deck.deckBState.isLoaded ? (
              <div className={styles.deckLoading}>
                <p>Loading track...</p>
              </div>
            ) : null}

            <Waveform
              waveformData={deck.deckBState.waveformData}
              color={config.deckB.waveformColor}
              isPlaying={deck.deckBState.isPlaying}
              currentTime={deck.deckBState.currentTime}
              duration={deck.deckBState.duration}
              width={400}
              height={100}
              className={styles.waveform}
            />

            <BPMDisplay
              originalBPM={deck.deckBState.originalBPM}
              currentBPM={deck.deckBState.currentBPM}
              color={config.deckB.waveformColor}
              className={styles.bpmDisplay}
            />

            <div className={styles.controlsRow}>
              <VolumeControl
                deck="B"
                volume={deck.deckBState.volume}
                color={config.deckB.waveformColor}
                onChange={(vol) => setVolumeWithTutorial('B', vol)}
                highlighted={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.control === 'volume' &&
                  highlightTarget?.deck === 'B'
                }
              />

              <TempoSlider
                deck="B"
                originalBPM={deck.deckBState.originalBPM}
                currentBPM={deck.deckBState.currentBPM}
                color={config.deckB.waveformColor}
                onChange={(bpm) => setBPMWithTutorial('B', bpm)}
                highlighted={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.control === 'tempo' &&
                  highlightTarget?.deck === 'B'
                }
              />

              <DeckControls
                deck="B"
                isPlaying={deck.deckBState.isPlaying}
                isLoaded={deck.deckBState.isLoaded}
                color={config.deckB.waveformColor}
                onPlay={() => playDeckWithTutorial('B')}
                onPause={() => pauseDeckWithTutorial('B')}
                onCue={() => cueDeckWithTutorial('B')}
                highlightPlay={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'play' &&
                  highlightTarget?.deck === 'B'
                }
                highlightPause={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'pause' &&
                  highlightTarget?.deck === 'B'
                }
                highlightCue={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'cue' &&
                  highlightTarget?.deck === 'B'
                }
              />
            </div>
          </div>
        </div>

        {/* Enhanced Crossfader with Deck State Awareness */}
        <Crossfader
          position={deck.crossfaderPosition}
          onChange={setCrossfaderWithTutorial}
          colorA={config.deckA.waveformColor}
          colorB={config.deckB.waveformColor}
          snapToCenter={true}
          highlighted={mode === 'tutorial' && highlightTarget?.type === 'crossfader'}
          deckALoaded={deck.deckAState.isLoaded}
          deckBLoaded={deck.deckBState.isLoaded}
          deckAPlaying={deck.deckAState.isPlaying}
          deckBPlaying={deck.deckBState.isPlaying}
          className={styles.crossfader}
        />

        {/* Track Library - Upload and load tracks */}
        <TrackLibrary className={styles.trackLibrary} />

        {/* Tutorial Overlay - ONLY show for final lesson completion */}
        {mode === 'tutorial' && tutorial.progress.isActive && tutorial.progress.lessonCompleted && tutorialConfig && (
          <TutorialOverlay
            lesson={tutorialConfig.lesson}
            progress={tutorial.progress}
            currentStep={null}
            showCelebration={false}
            onNextStep={tutorial.nextStep}
            onShowHint={tutorial.showHint}
            onExit={tutorial.exitTutorial}
            showHintButton={false}
            onReplayLesson={handleReplayLesson}
            onFreePlayMode={handleFreePlayMode}
            onMoreLessons={handleMoreLessons}
          />
        )}
      </div>
    );
  }
);

VirtualDJDeckInternal.displayName = 'VirtualDJDeckInternal';

/**
 * Main component that wraps internal component with DeckProvider
 */
const VirtualDJDeckProfessional = forwardRef<VirtualDJDeckHandle, VirtualDJDeckProps>(
  (props, ref) => {
    return (
      <DeckProvider onStateChange={props.config.onStateChange} onError={props.config.onError}>
        <VirtualDJDeckInternal ref={ref} {...props} />
      </DeckProvider>
    );
  }
);

VirtualDJDeckProfessional.displayName = 'VirtualDJDeckProfessional';

export default VirtualDJDeckProfessional;
