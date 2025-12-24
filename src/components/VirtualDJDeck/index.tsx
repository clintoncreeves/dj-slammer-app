/**
 * VirtualDJDeck - Entry point
 *
 * Exports the main VirtualDJDeck component and all related types
 */

// Export professional version as the default
export { default as VirtualDJDeck } from './VirtualDJDeck_Professional';

// Export AudioEngine
export { AudioEngine } from './AudioEngine';

// Export sub-components
export { DeckControls } from './DeckControls';
export { Waveform } from './Waveform';
export { BPMDisplay } from './BPMDisplay';
export { TempoSlider } from './TempoSlider';
export { Crossfader } from './Crossfader';
export { VolumeControl } from './VolumeControl';
export { TutorialOverlay } from './TutorialOverlay';
export { TrackLibrary } from './TrackLibrary';

// Export tutorial system
export { useTutorial } from './useTutorial';
export type {
  TutorialLesson,
  TutorialStep,
  TutorialProgress,
  TutorialConfig,
  TutorialCallbacks,
} from './tutorialTypes';

// Export types
export type {
  VirtualDJDeckConfig,
  VirtualDJDeckState,
  DeckConfig,
  DeckState,
  DeckId,
  PlaybackCommand,
  AudioEngineState,
  TrackMetadata,
} from './types';
export { DJDeckErrorType, DJDeckError } from './types';
export type { VirtualDJDeckHandle } from './VirtualDJDeck_Professional';
