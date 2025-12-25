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

import { useEffect, useState, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { VirtualDJDeckConfig, VirtualDJDeckState, DeckId } from './types';
import { DeckControls } from './DeckControls';
import { Waveform } from './Waveform';
import { BPMDisplay } from './BPMDisplay';
import { TempoSlider } from './TempoSlider';
import { Crossfader } from './Crossfader';
import { VolumeControl } from './VolumeControl';
import { EQControl } from './EQControl';
import { useTutorial } from './useTutorial';
import { TutorialConfig, TutorialLesson } from './tutorialTypes';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialInstructionPanel } from './TutorialInstructionPanel';
import { DeckProvider, useDeck } from './DeckContext';
import { BPMSyncResult } from '../../utils/bpmSync';
import { WelcomeScreen } from '../Welcome';
import { TrackLibrary } from './TrackLibrary';
import { useDJMentor } from './mentor/useDJMentor';
import { MentorPanel, MentorToggleButton } from './MentorPanel';
import { MentorHelpPanel } from './MentorHelpPanel';
import { HighlightTarget } from './mentor/mentorTypes';
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
  // Lesson navigation
  onNextLesson?: () => void;
  nextLessonTitle?: string;
  allLessons?: TutorialLesson[];
  currentLessonId?: string;
  onSelectLesson?: (lesson: TutorialLesson) => void;
  // Skip welcome screen (for lesson transitions when audio is already enabled)
  skipWelcomeScreen?: boolean;
  onAudioEnabled?: () => void;
}

/**
 * Internal component that consumes DeckContext
 */
const VirtualDJDeckInternal = forwardRef<VirtualDJDeckHandle, VirtualDJDeckProps>(
  ({ config, tutorialConfig, className, mode = 'tutorial', onModeChange, onReplayLesson, onNextLesson, nextLessonTitle, skipWelcomeScreen, onAudioEnabled }, ref) => {
    // Use the centralized deck context
    const deck = useDeck();

    // Skip welcome screen if audio was already enabled (lesson transition)
    const [needsUserGesture, setNeedsUserGesture] = useState(!skipWelcomeScreen);
    const [error, setError] = useState<Error | null>(null);

    // Keep a ref to the audioEngine for cleanup (avoids stale closure issues)
    const audioEngineRef = useRef(deck.audioEngine);

    // Update the ref whenever audioEngine changes
    useEffect(() => {
      audioEngineRef.current = deck.audioEngine;
    }, [deck.audioEngine]);

    // Cleanup on unmount - destroy audioEngine to stop all playback
    useEffect(() => {
      return () => {
        if (audioEngineRef.current) {
          console.log('[VirtualDJDeck] Unmounting - destroying AudioEngine');
          audioEngineRef.current.destroy();
        }
      };
    }, []);

    // Get current state for tutorial system
    const getState = (): VirtualDJDeckState => deck.getState();

    // Initialize tutorial system
    const tutorial = useTutorial(tutorialConfig || null, getState());

    // Get highlight target once for rendering
    const highlightTarget = tutorial.getHighlightTarget();

    // Initialize mentor system for freeplay mode
    const mentor = useDJMentor({
      deckA: deck.deckAState.isLoaded
        ? {
            isPlaying: deck.deckAState.isPlaying,
            isLoaded: deck.deckAState.isLoaded,
            volume: deck.deckAState.volume,
            currentBPM: deck.deckAState.currentBPM,
            originalBPM: deck.deckAState.originalBPM,
            eqLow: deck.deckAState.eqLow,
            eqMid: deck.deckAState.eqMid,
            eqHigh: deck.deckAState.eqHigh,
          }
        : null,
      deckB: deck.deckBState.isLoaded
        ? {
            isPlaying: deck.deckBState.isPlaying,
            isLoaded: deck.deckBState.isLoaded,
            volume: deck.deckBState.volume,
            currentBPM: deck.deckBState.currentBPM,
            originalBPM: deck.deckBState.originalBPM,
            eqLow: deck.deckBState.eqLow,
            eqMid: deck.deckBState.eqMid,
            eqHigh: deck.deckBState.eqHigh,
          }
        : null,
      crossfaderPosition: deck.crossfaderPosition,
      isActive: mode === 'freeplay',
    });

    // State for mentor highlight (when user clicks a tip to highlight a control)
    const [mentorHighlight, setMentorHighlight] = useState<HighlightTarget | null>(null);

    // Clear mentor highlight after a delay
    useEffect(() => {
      if (mentorHighlight) {
        const timer = setTimeout(() => setMentorHighlight(null), 3000);
        return () => clearTimeout(timer);
      }
    }, [mentorHighlight]);

    // Handle mentor tip highlight selection
    const handleMentorHighlight = useCallback((target: HighlightTarget | undefined) => {
      if (target) {
        setMentorHighlight(target);
      }
    }, []);


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
          deck.loadTrack('A', {
            url: config.deckA.trackUrl,
            name: config.deckA.trackName || 'Track A',
            artist: config.deckA.artistName || 'Unknown Artist',
            bpm: config.deckA.initialBPM,
            cuePoint: config.deckA.cuePoint,
          }),
          deck.loadTrack('B', {
            url: config.deckB.trackUrl,
            name: config.deckB.trackName || 'Track B',
            artist: config.deckB.artistName || 'Unknown Artist',
            bpm: config.deckB.initialBPM,
            cuePoint: config.deckB.cuePoint,
          }),
        ]);

        setNeedsUserGesture(false);
        // Notify parent that audio is enabled (for lesson transitions)
        onAudioEnabled?.();
      } catch (err) {
        setError(err as Error);
        config.onError?.(err as Error);
      }
    };

    // Auto-initialize if skipping welcome screen (lesson transition)
    useEffect(() => {
      if (skipWelcomeScreen && !deck.isInitialized) {
        handleEnableAudio();
      }
    }, [skipWelcomeScreen]);

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

    // Keep refs to avoid recreating interval on every context update
    const deckRef = useRef(deck);
    useEffect(() => {
      deckRef.current = deck;
    }, [deck]);

    // Update playback time periodically
    useEffect(() => {
      if (!deck.isInitialized || !deck.audioEngine) return;

      const interval = setInterval(() => {
        const currentDeck = deckRef.current;
        if (!currentDeck.audioEngine) return;

        if (currentDeck.deckAState.isPlaying) {
          const currentTime = currentDeck.audioEngine.getCurrentTime('A');
          currentDeck.updateCurrentTime('A', currentTime);
        }

        if (currentDeck.deckBState.isPlaying) {
          const currentTime = currentDeck.audioEngine.getCurrentTime('B');
          currentDeck.updateCurrentTime('B', currentTime);
        }
      }, 16); // 60fps updates

      return () => clearInterval(interval);
    }, [deck.isInitialized, deck.audioEngine]);

    // Helper to create expected state after an action (since React state updates are async)
    const createExpectedState = (overrides: {
      deckA?: Partial<VirtualDJDeckState['deckA']>;
      deckB?: Partial<VirtualDJDeckState['deckB']>;
      crossfaderPosition?: number;
    }): VirtualDJDeckState => {
      const current = getState();
      return {
        deckA: { ...current.deckA, ...overrides.deckA },
        deckB: { ...current.deckB, ...overrides.deckB },
        crossfaderPosition: overrides.crossfaderPosition ?? current.crossfaderPosition,
      };
    };

    // Wrap deck operations to include tutorial validation and mentor action tracking
    const playDeckWithTutorial = (deckId: DeckId) => {
      deck.playDeck(deckId);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { isPlaying: true, isPaused: false },
      });
      tutorial.validateStep(expectedState);
      // Track for mentor
      mentor.recordAction(deckId === 'A' ? 'play_deck_a' : 'play_deck_b');
      // Check if both decks are now playing
      if (
        (deckId === 'A' && deck.deckBState.isPlaying) ||
        (deckId === 'B' && deck.deckAState.isPlaying)
      ) {
        mentor.recordAction('both_decks_playing');
      }
    };

    const pauseDeckWithTutorial = (deckId: DeckId) => {
      deck.pauseDeck(deckId);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { isPlaying: false, isPaused: true },
      });
      tutorial.validateStep(expectedState);
      mentor.recordAction('pause_deck');
    };

    const cueDeckWithTutorial = (deckId: DeckId) => {
      deck.cueDeck(deckId);
      tutorial.validateStep(getState());
      mentor.recordAction('jump_to_cue');
    };

    const setCuePointWithTutorial = (deckId: DeckId) => {
      deck.setCuePoint(deckId);
      tutorial.validateStep(getState());
      mentor.recordAction('set_cue');
    };

    const setBPMWithTutorial = (deckId: DeckId, bpm: number) => {
      deck.setBPM(deckId, bpm);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { bpm },
      });
      tutorial.validateStep(expectedState);
      mentor.recordAction('adjust_tempo');
    };

    const setVolumeWithTutorial = (deckId: DeckId, volume: number) => {
      deck.setVolume(deckId, volume);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { volume },
      });
      tutorial.validateStep(expectedState);
      mentor.recordAction('adjust_volume');
    };

    const setCrossfaderWithTutorial = (position: number) => {
      deck.setCrossfader(position);
      const expectedState = createExpectedState({ crossfaderPosition: position });
      tutorial.validateStep(expectedState);
      mentor.recordAction('use_crossfader');
    };

    // EQ change handler with mentor tracking
    const setDeckEQWithMentor = (deckId: DeckId, band: 'low' | 'mid' | 'high', value: number) => {
      deck.setDeckEQ(deckId, band, value);
      if (band === 'low') mentor.recordAction('adjust_eq_low');
      else if (band === 'mid') mentor.recordAction('adjust_eq_mid');
      else mentor.recordAction('adjust_eq_high');
    };

    // Seek handler with mentor tracking
    const seekDeckWithMentor = (deckId: DeckId, time: number) => {
      deck.seekDeck(deckId, time);
      mentor.recordAction('seek_waveform');
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

    // Check if tutorial banner should be shown
    const showTutorialBanner = mode === 'tutorial' && tutorial.progress.isActive && tutorial.currentStep && tutorialConfig;

    // Render main professional UI
    return (
      <div className={`${styles.container} ${!showTutorialBanner ? styles.noTutorial : ''} ${className || ''}`}>
        {/* Tutorial Instruction Panel - Fixed at top, Guitar Hero style */}
        {showTutorialBanner && tutorial.currentStep && (
          <TutorialInstructionPanel
            lesson={tutorialConfig.lesson}
            progress={tutorial.progress}
            currentStep={tutorial.currentStep}
            showCelebration={tutorial.showCelebration}
            onClose={handleFreePlayMode}
          />
        )}


        <div className={styles.decksContainer}>
          {/* Deck A */}
          <div className={styles.deck} data-deck="a">
            <div className={styles.deckHeader}>
              <h3 style={{ color: config.deckA.waveformColor }}>Deck A</h3>
              {deck.deckAState.isLoaded && (
                <div className={styles.trackInfo}>
                  <span className={styles.trackName}>{deck.deckAState.trackName || 'No Track'}</span>
                  <span className={styles.artistName}>{deck.deckAState.artistName || ''}</span>
                </div>
              )}
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
              height={100}
              className={styles.waveform}
              onSeek={(time) => seekDeckWithMentor('A', time)}
              suggestedCuePoints={deck.deckAState.suggestedCuePoints}
              cuePoint={deck.deckAState.cuePoint}
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

              <EQControl
                deck="A"
                eqLow={deck.deckAState.eqLow}
                eqMid={deck.deckAState.eqMid}
                eqHigh={deck.deckAState.eqHigh}
                color={config.deckA.waveformColor}
                onChange={(band, value) => setDeckEQWithMentor('A', band, value)}
                highlighted={
                  mentorHighlight?.type === 'eq' &&
                  (mentorHighlight?.deck === 'A' || !mentorHighlight?.deck)
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
                onSetCue={() => setCuePointWithTutorial('A')}
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
                highlightSetCue={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'setCue' &&
                  highlightTarget?.deck === 'A'
                }
              />
            </div>
          </div>

          {/* Deck B */}
          <div className={styles.deck} data-deck="b">
            <div className={styles.deckHeader}>
              <h3 style={{ color: config.deckB.waveformColor }}>Deck B</h3>
              {deck.deckBState.isLoaded && (
                <div className={styles.trackInfo}>
                  <span className={styles.trackName}>{deck.deckBState.trackName || 'No Track'}</span>
                  <span className={styles.artistName}>{deck.deckBState.artistName || ''}</span>
                </div>
              )}
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
              height={100}
              className={styles.waveform}
              onSeek={(time) => seekDeckWithMentor('B', time)}
              suggestedCuePoints={deck.deckBState.suggestedCuePoints}
              cuePoint={deck.deckBState.cuePoint}
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

              <EQControl
                deck="B"
                eqLow={deck.deckBState.eqLow}
                eqMid={deck.deckBState.eqMid}
                eqHigh={deck.deckBState.eqHigh}
                color={config.deckB.waveformColor}
                onChange={(band, value) => setDeckEQWithMentor('B', band, value)}
                highlighted={
                  mentorHighlight?.type === 'eq' &&
                  (mentorHighlight?.deck === 'B' || !mentorHighlight?.deck)
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
                onSetCue={() => setCuePointWithTutorial('B')}
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
                highlightSetCue={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'button' &&
                  highlightTarget?.control === 'setCue' &&
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

        {/* Mentor Panel - Context-aware DJ assistant for freeplay mode */}
        {mode === 'freeplay' && mentor.isEnabled && mentor.currentTip && (
          <MentorPanel
            tip={mentor.currentTip}
            userLevel={mentor.userLevel}
            onDismiss={mentor.dismissTip}
            onRequestHelp={mentor.requestHelp}
          />
        )}

        {/* Mentor Toggle Button - Shows when no tip is active */}
        {mode === 'freeplay' && !mentor.currentTip && (
          <MentorToggleButton
            onClick={mentor.requestHelp}
            isEnabled={mentor.isEnabled}
          />
        )}

        {/* Mentor Help Panel - On-demand help overlay */}
        {mode === 'freeplay' && mentor.showHelpPanel && (
          <MentorHelpPanel
            tips={mentor.getContextualTips()}
            userLevel={mentor.userLevel}
            onClose={mentor.closeHelpPanel}
            onSelectTip={handleMentorHighlight}
          />
        )}

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
            onNextLesson={onNextLesson}
            nextLessonTitle={nextLessonTitle}
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
