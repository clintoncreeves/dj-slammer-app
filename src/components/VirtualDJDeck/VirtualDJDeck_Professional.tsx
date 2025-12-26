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
import { MentorPanel } from './MentorPanel';
import { FreeplayTopBar } from './FreeplayTopBar';
import { MentorHelpPanel } from './MentorHelpPanel';
import { HighlightTarget } from './mentor/mentorTypes';
import { useTransitionState } from './useTransitionState';
import { TransitionGuidance } from './EQControl';
import { LibraryProvider } from './library/LibraryContext';
// import { PlaylistSidebar } from './library/PlaylistSidebar'; // Hidden - not working yet
import { MIDIProvider, useMIDI } from './MIDIContext';
import { MIDISettings } from './MIDISettings';
import { PerformanceControls } from './PerformanceControls';
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

    // Use MIDI context for controller status
    const midi = useMIDI();

    // Skip welcome screen if audio was already enabled (lesson transition)
    const [needsUserGesture, setNeedsUserGesture] = useState(!skipWelcomeScreen);
    const [error, setError] = useState<Error | null>(null);

    // MIDI settings panel state
    const [showMIDISettings, setShowMIDISettings] = useState(false);

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

    // Transition state for EQ guidance during mixing
    const transition = useTransitionState({
      isPlayingA: deck.deckAState.isPlaying,
      isPlayingB: deck.deckBState.isPlaying,
      crossfaderPosition: deck.crossfaderPosition,
    });

    // Determine EQ guidance for each deck based on transition state
    // CORRECT DJ TECHNIQUE: Cut bass on INCOMING track to avoid two basslines!
    // The incoming track should have bass cut BEFORE you fade it in.
    // Only boost the incoming bass once the outgoing track's bass is cut.
    const getEQGuidance = (deckId: DeckId): TransitionGuidance => {
      if (!transition.isTransitioning) return null;

      // Incoming deck should CUT bass (to avoid two basslines during blend)
      if (transition.incomingDeck === deckId) {
        return 'cut-bass';
      }
      // Outgoing deck keeps bass (it's the current dominant track)
      // No guidance needed for outgoing - just let it play
      return null;
    };

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
    const handleReplayLesson = useCallback(() => {
      onReplayLesson?.();
    }, [onReplayLesson]);

    const handleFreePlayMode = useCallback(() => {
      onModeChange?.('freeplay');
    }, [onModeChange]);

    const handleMoreLessons = useCallback(() => {
      // Future: Navigate to lesson selection screen
    }, []);

    // Initialize audio engine and load tracks
    const handleEnableAudio = useCallback(async () => {
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
    }, [deck, config, onAudioEnabled]);

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

    // Update playback time using requestAnimationFrame for smooth, synchronized updates
    // This replaces setInterval to avoid timing drift and sync with browser paint cycles
    useEffect(() => {
      if (!deck.isInitialized || !deck.audioEngine) return;

      let animationFrameId: number | null = null;
      let isRunning = false;

      const updateTime = () => {
        const currentDeck = deckRef.current;
        if (!currentDeck.audioEngine) {
          isRunning = false;
          return;
        }

        const aPlaying = currentDeck.deckAState.isPlaying;
        const bPlaying = currentDeck.deckBState.isPlaying;

        if (aPlaying) {
          const currentTime = currentDeck.audioEngine.getCurrentTime('A');
          currentDeck.updateCurrentTime('A', currentTime);
        }

        if (bPlaying) {
          const currentTime = currentDeck.audioEngine.getCurrentTime('B');
          currentDeck.updateCurrentTime('B', currentTime);
        }

        // Only continue animation loop if at least one deck is playing
        if (aPlaying || bPlaying) {
          animationFrameId = requestAnimationFrame(updateTime);
        } else {
          isRunning = false;
        }
      };

      // Start the animation loop if any deck is playing
      const shouldRun = deck.deckAState.isPlaying || deck.deckBState.isPlaying;
      if (shouldRun && !isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(updateTime);
      }

      return () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
        }
        isRunning = false;
      };
    }, [deck.isInitialized, deck.audioEngine, deck.deckAState.isPlaying, deck.deckBState.isPlaying]);

    // Helper to create expected state after an action (since React state updates are async)
    const createExpectedState = useCallback((overrides: {
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
    }, [getState]);

    // Wrap deck operations to include tutorial validation and mentor action tracking
    const playDeckWithTutorial = useCallback((deckId: DeckId) => {
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
    }, [deck, createExpectedState, tutorial, mentor]);

    const pauseDeckWithTutorial = useCallback((deckId: DeckId) => {
      deck.pauseDeck(deckId);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { isPlaying: false, isPaused: true },
      });
      tutorial.validateStep(expectedState);
      mentor.recordAction('pause_deck');
    }, [deck, createExpectedState, tutorial, mentor]);

    const cueDeckWithTutorial = useCallback((deckId: DeckId) => {
      deck.cueDeck(deckId);
      tutorial.validateStep(getState());
      mentor.recordAction('jump_to_cue');
    }, [deck, tutorial, mentor, getState]);

    const setCuePointWithTutorial = useCallback((deckId: DeckId) => {
      deck.setCuePoint(deckId);
      tutorial.validateStep(getState());
      mentor.recordAction('set_cue');
    }, [deck, tutorial, mentor, getState]);

    const setBPMWithTutorial = useCallback((deckId: DeckId, bpm: number) => {
      deck.setBPM(deckId, bpm);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { bpm },
      });
      tutorial.validateStep(expectedState);
      mentor.recordAction('adjust_tempo');
    }, [deck, createExpectedState, tutorial, mentor]);

    const setVolumeWithTutorial = useCallback((deckId: DeckId, volume: number) => {
      deck.setVolume(deckId, volume);
      const expectedState = createExpectedState({
        [deckId === 'A' ? 'deckA' : 'deckB']: { volume },
      });
      tutorial.validateStep(expectedState);
      mentor.recordAction('adjust_volume');
    }, [deck, createExpectedState, tutorial, mentor]);

    const setCrossfaderWithTutorial = useCallback((position: number) => {
      deck.setCrossfader(position);
      const expectedState = createExpectedState({ crossfaderPosition: position });
      tutorial.validateStep(expectedState);
      mentor.recordAction('use_crossfader');
    }, [deck, createExpectedState, tutorial, mentor]);

    // EQ change handler with mentor tracking
    const setDeckEQWithMentor = useCallback((deckId: DeckId, band: 'low' | 'mid' | 'high', value: number) => {
      deck.setDeckEQ(deckId, band, value);
      if (band === 'low') mentor.recordAction('adjust_eq_low');
      else if (band === 'mid') mentor.recordAction('adjust_eq_mid');
      else mentor.recordAction('adjust_eq_high');
    }, [deck, mentor]);

    // Seek handler with mentor tracking
    const seekDeckWithMentor = useCallback((deckId: DeckId, time: number) => {
      deck.seekDeck(deckId, time);
      mentor.recordAction('seek_waveform');
    }, [deck, mentor]);

    // Auto Cue handler with system message
    const handleAutoCue = useCallback((deckId: DeckId) => {
      const otherDeck = deckId === 'A' ? deck.deckBState : deck.deckAState;
      const thisDeck = deckId === 'A' ? deck.deckAState : deck.deckBState;

      deck.autoCue(deckId);

      // Show a message explaining what happened
      if (otherDeck.isPlaying && otherDeck.isLoaded) {
        const position = thisDeck.suggestedCuePoints.length > 0
          ? `Found best cue point at ${Math.floor(thisDeck.cuePoint / 60)}:${String(Math.floor(thisDeck.cuePoint % 60)).padStart(2, '0')}`
          : 'Set cue to start';
        mentor.showSystemMessage(`Auto Cue: ${position} - matched to Deck ${deckId === 'A' ? 'B' : 'A'} position`);
      } else {
        mentor.showSystemMessage(`Auto Cue: Set to first phrase boundary`);
      }
    }, [deck, mentor]);

    // Memoized callbacks for Deck A
    const handlePlayA = useCallback(() => playDeckWithTutorial('A'), [playDeckWithTutorial]);
    const handlePauseA = useCallback(() => pauseDeckWithTutorial('A'), [pauseDeckWithTutorial]);
    const handleCueA = useCallback(() => cueDeckWithTutorial('A'), [cueDeckWithTutorial]);
    const handleSetCueA = useCallback(() => setCuePointWithTutorial('A'), [setCuePointWithTutorial]);
    const handleSyncA = useCallback(() => deck.syncBeatPhase('A'), [deck]);
    const handleSeekA = useCallback((time: number) => seekDeckWithMentor('A', time), [seekDeckWithMentor]);
    const handleVolumeA = useCallback((vol: number) => setVolumeWithTutorial('A', vol), [setVolumeWithTutorial]);
    const handleBPMA = useCallback((bpm: number) => setBPMWithTutorial('A', bpm), [setBPMWithTutorial]);
    const handleEQA = useCallback((band: 'low' | 'mid' | 'high', value: number) => setDeckEQWithMentor('A', band, value), [setDeckEQWithMentor]);
    const handleToggleSpectralA = useCallback(() => deck.toggleSpectralColors('A'), [deck]);
    const handleAutoCueA = useCallback(() => handleAutoCue('A'), [handleAutoCue]);

    // Memoized callbacks for Deck B
    const handlePlayB = useCallback(() => playDeckWithTutorial('B'), [playDeckWithTutorial]);
    const handlePauseB = useCallback(() => pauseDeckWithTutorial('B'), [pauseDeckWithTutorial]);
    const handleCueB = useCallback(() => cueDeckWithTutorial('B'), [cueDeckWithTutorial]);
    const handleSetCueB = useCallback(() => setCuePointWithTutorial('B'), [setCuePointWithTutorial]);
    const handleSyncB = useCallback(() => deck.syncBeatPhase('B'), [deck]);
    const handleSeekB = useCallback((time: number) => seekDeckWithMentor('B', time), [seekDeckWithMentor]);
    const handleVolumeB = useCallback((vol: number) => setVolumeWithTutorial('B', vol), [setVolumeWithTutorial]);
    const handleBPMB = useCallback((bpm: number) => setBPMWithTutorial('B', bpm), [setBPMWithTutorial]);
    const handleEQB = useCallback((band: 'low' | 'mid' | 'high', value: number) => setDeckEQWithMentor('B', band, value), [setDeckEQWithMentor]);
    const handleToggleSpectralB = useCallback(() => deck.toggleSpectralColors('B'), [deck]);
    const handleAutoCueB = useCallback(() => handleAutoCue('B'), [handleAutoCue]);

    // MIDI settings handlers
    const handleOpenMIDISettings = useCallback(() => setShowMIDISettings(true), []);
    const handleCloseMIDISettings = useCallback(() => setShowMIDISettings(false), []);

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

    // Check if mentor panel banner should be shown
    const showMentorBanner = mode === 'freeplay' && mentor.isEnabled && mentor.currentTip;

    // Render main professional UI
    return (
      <div className={`${styles.container} ${!showTutorialBanner && mode !== 'freeplay' ? styles.noTutorial : ''} ${showMentorBanner ? styles.withMentorPanel : ''} ${mode === 'freeplay' ? styles.withFreeplayBar : ''} ${className || ''}`}>
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

        {/* Freeplay Top Bar - Shows in freeplay mode when no mentor tip */}
        {mode === 'freeplay' && !mentor.currentTip && (
          <FreeplayTopBar
            mentorEnabled={mentor.isEnabled}
            onRequestHelp={mentor.requestHelp}
            sidebarCollapsed={true}
            onToggleSidebar={() => {/* Sidebar hidden for now */}}
            onOpenMIDISettings={handleOpenMIDISettings}
            midiConnected={midi.isEnabled}
          />
        )}

        {/* Playlist Sidebar - Hidden for now (not working) */}
        {/* {mode === 'freeplay' && (
          <PlaylistSidebar
            className={styles.playlistSidebar}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )} */}

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

            <div className={styles.waveformContainer}>
              <Waveform
                waveformData={deck.deckAState.waveformData}
                color={config.deckA.waveformColor}
                isPlaying={deck.deckAState.isPlaying}
                currentTime={deck.deckAState.currentTime}
                duration={deck.deckAState.duration}
                height={100}
                className={styles.waveform}
                onSeek={handleSeekA}
                suggestedCuePoints={deck.deckAState.suggestedCuePoints}
                cuePoint={deck.deckAState.cuePoint}
                spectralData={deck.deckAState.spectralWaveformData}
                showSpectralColors={deck.deckAState.showSpectralColors}
                onToggleSpectralColors={handleToggleSpectralA}
              />
              {mode === 'freeplay' && (
                <button
                  className={styles.autoCueButton}
                  onClick={handleAutoCueA}
                  disabled={!deck.deckAState.isLoaded}
                  style={{ '--button-color': config.deckA.waveformColor } as React.CSSProperties}
                  aria-label="Auto-select cue point for Deck A"
                >
                  Auto Cue
                </button>
              )}
            </div>

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
                onChange={handleVolumeA}
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
                onChange={handleBPMA}
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
                onChange={handleEQA}
                highlighted={
                  mentorHighlight?.type === 'eq' &&
                  (mentorHighlight?.deck === 'A' || !mentorHighlight?.deck)
                }
                highlightedBand={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.deck === 'A'
                    ? (highlightTarget?.control === 'eq-low' ? 'low' :
                       highlightTarget?.control === 'eq-mid' ? 'mid' :
                       highlightTarget?.control === 'eq-high' ? 'high' : undefined)
                    : undefined
                }
                transitionGuidance={getEQGuidance('A')}
              />

              <DeckControls
                deck="A"
                isPlaying={deck.deckAState.isPlaying}
                isLoaded={deck.deckAState.isLoaded}
                color={config.deckA.waveformColor}
                onPlay={handlePlayA}
                onPause={handlePauseA}
                onCue={handleCueA}
                onSetCue={handleSetCueA}
                onSync={mode === 'freeplay' ? handleSyncA : undefined}
                hideCueButtons={mode === 'tutorial'}
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

              {/* Performance Controls - Hot Cues, Loops, Filter (freeplay only) */}
              {mode === 'freeplay' && (
                <PerformanceControls
                  deck="A"
                  color={config.deckA.waveformColor}
                  isLoaded={deck.deckAState.isLoaded}
                  isPlaying={deck.deckAState.isPlaying}
                  hotCues={deck.hotCuesA.map(hc => hc?.position ?? null)}
                  onSetHotCue={(slot) => deck.setHotCue('A', slot)}
                  onJumpToHotCue={(slot) => deck.jumpToHotCue('A', slot)}
                  onClearHotCue={(slot) => deck.deleteHotCue('A', slot)}
                  loopActive={deck.deckAState.loopActive}
                  onLoopToggle={() => deck.toggleLoop('A')}
                  onSetAutoLoop={(beats) => deck.setAutoLoop('A', beats)}
                  filterValue={deck.deckAState.filterPosition}
                  onFilterChange={(value) => deck.setDeckFilter('A', value)}
                />
              )}
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

            <div className={styles.waveformContainer}>
              <Waveform
                waveformData={deck.deckBState.waveformData}
                color={config.deckB.waveformColor}
                isPlaying={deck.deckBState.isPlaying}
                currentTime={deck.deckBState.currentTime}
                duration={deck.deckBState.duration}
                height={100}
                className={styles.waveform}
                onSeek={handleSeekB}
                suggestedCuePoints={deck.deckBState.suggestedCuePoints}
                cuePoint={deck.deckBState.cuePoint}
                spectralData={deck.deckBState.spectralWaveformData}
                showSpectralColors={deck.deckBState.showSpectralColors}
                onToggleSpectralColors={handleToggleSpectralB}
              />
              {mode === 'freeplay' && (
                <button
                  className={styles.autoCueButton}
                  onClick={handleAutoCueB}
                  disabled={!deck.deckBState.isLoaded}
                  style={{ '--button-color': config.deckB.waveformColor } as React.CSSProperties}
                  aria-label="Auto-select cue point for Deck B"
                >
                  Auto Cue
                </button>
              )}
            </div>

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
                onChange={handleVolumeB}
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
                onChange={handleBPMB}
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
                onChange={handleEQB}
                highlighted={
                  mentorHighlight?.type === 'eq' &&
                  (mentorHighlight?.deck === 'B' || !mentorHighlight?.deck)
                }
                highlightedBand={
                  mode === 'tutorial' &&
                  highlightTarget?.type === 'slider' &&
                  highlightTarget?.deck === 'B'
                    ? (highlightTarget?.control === 'eq-low' ? 'low' :
                       highlightTarget?.control === 'eq-mid' ? 'mid' :
                       highlightTarget?.control === 'eq-high' ? 'high' : undefined)
                    : undefined
                }
                transitionGuidance={getEQGuidance('B')}
              />

              <DeckControls
                deck="B"
                isPlaying={deck.deckBState.isPlaying}
                isLoaded={deck.deckBState.isLoaded}
                color={config.deckB.waveformColor}
                onPlay={handlePlayB}
                onPause={handlePauseB}
                onCue={handleCueB}
                onSetCue={handleSetCueB}
                onSync={mode === 'freeplay' ? handleSyncB : undefined}
                hideCueButtons={mode === 'tutorial'}
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

              {/* Performance Controls - Hot Cues, Loops, Filter (freeplay only) */}
              {mode === 'freeplay' && (
                <PerformanceControls
                  deck="B"
                  color={config.deckB.waveformColor}
                  isLoaded={deck.deckBState.isLoaded}
                  isPlaying={deck.deckBState.isPlaying}
                  hotCues={deck.hotCuesB.map(hc => hc?.position ?? null)}
                  onSetHotCue={(slot) => deck.setHotCue('B', slot)}
                  onJumpToHotCue={(slot) => deck.jumpToHotCue('B', slot)}
                  onClearHotCue={(slot) => deck.deleteHotCue('B', slot)}
                  loopActive={deck.deckBState.loopActive}
                  onLoopToggle={() => deck.toggleLoop('B')}
                  onSetAutoLoop={(beats) => deck.setAutoLoop('B', beats)}
                  filterValue={deck.deckBState.filterPosition}
                  onFilterChange={(value) => deck.setDeckFilter('B', value)}
                />
              )}
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

        {/* Mentor Help Panel - On-demand help overlay */}
        {mode === 'freeplay' && mentor.showHelpPanel && (
          <MentorHelpPanel
            tips={mentor.getContextualTips()}
            userLevel={mentor.userLevel}
            onClose={mentor.closeHelpPanel}
            onSelectTip={handleMentorHighlight}
          />
        )}

        {/* MIDI Settings Panel - Modal overlay for MIDI configuration */}
        {showMIDISettings && (
          <div className={styles.midiSettingsOverlay}>
            <div className={styles.midiSettingsPanel}>
              <div className={styles.midiSettingsHeader}>
                <h2>MIDI Controller Settings</h2>
                <button
                  className={styles.midiSettingsClose}
                  onClick={handleCloseMIDISettings}
                  aria-label="Close MIDI settings"
                >
                  ✕
                </button>
              </div>
              <MIDISettings />
            </div>
          </div>
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
 * Main component that wraps internal component with DeckProvider, LibraryProvider, and MIDIProvider
 */
const VirtualDJDeckProfessional = forwardRef<VirtualDJDeckHandle, VirtualDJDeckProps>(
  (props, ref) => {
    return (
      <LibraryProvider>
        <DeckProvider onStateChange={props.config.onStateChange} onError={props.config.onError}>
          <MIDIProvider>
            <VirtualDJDeckInternal ref={ref} {...props} />
          </MIDIProvider>
        </DeckProvider>
      </LibraryProvider>
    );
  }
);

VirtualDJDeckProfessional.displayName = 'VirtualDJDeckProfessional';

export default VirtualDJDeckProfessional;
