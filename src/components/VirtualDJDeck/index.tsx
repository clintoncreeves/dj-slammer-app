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

// Export MIDI components
export { MIDIProvider, useMIDI, useMIDIAvailable } from './MIDIContext';
export { MIDISettings } from './MIDISettings';

// Export DeckContext and types
export { DeckProvider, useDeck } from './DeckContext';
export type { TrackInfo } from './DeckContext';

// Export tutorial system
export { useTutorial } from './useTutorial';
export type {
  TutorialLesson,
  TutorialStep,
  TutorialProgress,
  TutorialConfig,
  TutorialCallbacks,
} from './tutorialTypes';

// Export mentor system
export { useDJMentor, getSkillLevelDisplayName, getSkillLevelEmoji } from './mentor/useDJMentor';
export { MentorPanel, MentorToggleButton } from './MentorPanel';
export { MentorHelpPanel } from './MentorHelpPanel';
export type {
  MentorTip,
  SkillLevel,
  UserAction,
  UserSkillProfile,
  UseDJMentorResult,
} from './mentor/mentorTypes';

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
