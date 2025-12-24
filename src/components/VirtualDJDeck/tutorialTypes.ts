/**
 * Tutorial System Types - Simon Says Style Interactive Learning
 *
 * Based on Tanner's vision: "Like Simon Says - lights up buttons and you tap them when it tells you"
 */

import { DeckId, VirtualDJDeckState } from './types';

/**
 * A single step in a tutorial lesson
 */
export interface TutorialStep {
  /** Unique identifier for this step */
  id: string;

  /** Kid-friendly instruction text (e.g., "Press PLAY on Deck A!") */
  instruction: string;

  /** Element to highlight (button ID, control name, etc.) */
  highlightTarget: {
    type: 'button' | 'slider' | 'deck' | 'crossfader';
    deck?: DeckId;
    control?: 'play' | 'pause' | 'cue' | 'setCue' | 'tempo' | 'volume';
  };

  /** Function to check if this step has been completed */
  validate: (currentState: VirtualDJDeckState, previousState: VirtualDJDeckState) => boolean;

  /** Optional audio instruction URL (text-to-speech or pre-recorded) */
  audioUrl?: string;

  /** Optional hint if user is stuck */
  hint?: string;

  /** Celebration message when step is completed */
  celebrationMessage?: string;
}

/**
 * A complete tutorial lesson
 */
export interface TutorialLesson {
  /** Unique identifier for this lesson */
  id: string;

  /** Lesson title (e.g., "Your First Mix") */
  title: string;

  /** Brief description */
  description: string;

  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  /** Array of steps to complete */
  steps: TutorialStep[];

  /** Tracks to load for this lesson */
  tracks: {
    deckA: string; // URL
    deckB: string; // URL
  };

  /** Final celebration message */
  completionMessage: string;

  /** Optional badge/reward for completing */
  badge?: {
    icon: string;
    title: string;
  };
}

/**
 * Tutorial progress state
 */
export interface TutorialProgress {
  /** Current lesson ID */
  lessonId: string;

  /** Current step index (0-based) */
  currentStepIndex: number;

  /** Whether the tutorial is active */
  isActive: boolean;

  /** Whether the current step is completed (waiting to advance) */
  stepCompleted: boolean;

  /** Whether the entire lesson is completed */
  lessonCompleted: boolean;

  /** Timestamp when lesson was started */
  startedAt?: Date;

  /** Timestamp when lesson was completed */
  completedAt?: Date;

  /** Number of hints used */
  hintsUsed: number;
}

/**
 * Tutorial event callbacks
 */
export interface TutorialCallbacks {
  /** Called when a step is completed */
  onStepComplete?: (step: TutorialStep, stepIndex: number) => void;

  /** Called when the entire lesson is completed */
  onLessonComplete?: (lesson: TutorialLesson, duration: number) => void;

  /** Called when user advances to next step */
  onStepAdvance?: (nextStep: TutorialStep, stepIndex: number) => void;

  /** Called when tutorial starts */
  onTutorialStart?: (lesson: TutorialLesson) => void;

  /** Called when tutorial is paused/exited */
  onTutorialExit?: (progress: TutorialProgress) => void;

  /** Called when user requests a hint */
  onHintRequest?: (step: TutorialStep) => void;
}

/**
 * Tutorial configuration
 */
export interface TutorialConfig {
  /** The lesson to run */
  lesson: TutorialLesson;

  /** Event callbacks */
  callbacks?: TutorialCallbacks;

  /** Auto-advance to next step after completion (default: false, requires user to click "Next") */
  autoAdvance?: boolean;

  /** Show hint button after N seconds of no progress (default: 15) */
  hintDelaySeconds?: number;

  /** Enable audio instructions (default: true) */
  enableAudio?: boolean;

  /** Enable celebration animations (default: true) */
  enableCelebrations?: boolean;
}
