/**
 * DJ Mentor System Types - Context-Aware Assistant for Free Play Mode
 *
 * Provides proactive guidance and on-demand help with a friendly DJ mentor personality.
 */

import { DeckId } from '../types';

/**
 * User skill levels
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Trigger types for mentor tips
 */
export type TipTrigger =
  | 'idle'       // User hasn't done anything for a while
  | 'action'     // User just performed an action
  | 'state'      // Current deck state matches conditions
  | 'milestone'; // User achieved something for the first time

/**
 * Highlight target for mentor tips (reuses tutorial pattern)
 */
export interface HighlightTarget {
  type: 'button' | 'slider' | 'deck' | 'crossfader' | 'eq' | 'waveform' | 'bpm';
  deck?: DeckId;
  control?: 'play' | 'pause' | 'cue' | 'setCue' | 'tempo' | 'volume' | 'low' | 'mid' | 'high' | 'sync';
}

/**
 * Context condition for triggering tips
 */
export interface ContextCondition {
  /** Type of condition to check */
  type:
    | 'deck_playing'     // Check if deck is playing
    | 'deck_stopped'     // Check if deck is stopped
    | 'deck_loaded'      // Check if deck has a track loaded
    | 'both_playing'     // Both decks playing
    | 'crossfader_center' // Crossfader near center
    | 'crossfader_extreme' // Crossfader at A or B extreme
    | 'crossfader_moving' // Crossfader is being moved (transition in progress)
    | 'volume_low'       // Volume below threshold
    | 'volume_high'      // Volume at max
    | 'bpm_mismatch'     // BPMs differ significantly
    | 'bpm_matched'      // BPMs are synced
    | 'eq_boosted'       // EQ band boosted
    | 'eq_cut'           // EQ band cut
    | 'idle_time'        // Time since last action
    | 'first_time_action' // First time performing action
    | 'session_start';   // Just started the session

  /** Which deck to check (if applicable) */
  deck?: DeckId | 'any' | 'both';

  /** Threshold value for numeric conditions */
  threshold?: number;

  /** Action type for first_time_action */
  actionType?: string;

  /** Whether condition should be true or false */
  negate?: boolean;
}

/**
 * Context for when a mentor tip should appear
 */
export interface MentorContext {
  /** What triggers this tip */
  trigger: TipTrigger;

  /** Conditions that must be met */
  conditions: ContextCondition[];

  /** All conditions must be met (AND) or any (OR). Default: AND */
  matchAll?: boolean;
}

/**
 * A single mentor tip
 */
export interface MentorTip {
  /** Unique identifier */
  id: string;

  /** The tip content with friendly DJ mentor personality */
  content: string;

  /** Skill level this tip is appropriate for */
  category: SkillLevel;

  /** When this tip should appear */
  context: MentorContext;

  /** Optional celebration variant (for milestones) */
  celebrationVariant?: string;

  /** Optional control to highlight */
  highlightTarget?: HighlightTarget;

  /** Priority (1-10, higher = more important) */
  priority: number;

  /** Whether this tip should only show once ever */
  showOnce?: boolean;

  /** Minimum time (ms) before this specific tip can show again */
  cooldown?: number;
}

/**
 * Actions the user can perform (for tracking)
 */
export type UserAction =
  | 'play_deck_a'
  | 'play_deck_b'
  | 'pause_deck'
  | 'set_cue'
  | 'jump_to_cue'
  | 'adjust_tempo'
  | 'sync_bpm'
  | 'adjust_volume'
  | 'use_crossfader'
  | 'adjust_eq_low'
  | 'adjust_eq_mid'
  | 'adjust_eq_high'
  | 'adjust_filter'
  | 'seek_waveform'
  | 'load_track'
  | 'both_decks_playing';

/**
 * User skill profile stored in localStorage
 */
export interface UserSkillProfile {
  /** Current skill level */
  level: SkillLevel;

  /** Number of sessions played */
  sessionCount: number;

  /** Count of each action performed */
  actionsPerformed: Partial<Record<UserAction, number>>;

  /** IDs of tips that have been shown */
  tipsShown: string[];

  /** Timestamp of last session */
  lastSessionAt?: number;

  /** Total time spent mixing (ms) */
  totalMixTime: number;
}

/**
 * Deck state snapshot for context evaluation
 */
export interface DeckStateSnapshot {
  deckA: {
    isPlaying: boolean;
    isLoaded: boolean;
    volume: number;
    currentBPM: number;
    originalBPM: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
  };
  deckB: {
    isPlaying: boolean;
    isLoaded: boolean;
    volume: number;
    currentBPM: number;
    originalBPM: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
  };
  crossfaderPosition: number;
  lastActionTime: number;
  lastAction?: UserAction;
}

/**
 * Result from the useDJMentor hook
 */
export interface UseDJMentorResult {
  /** Currently displayed tip (null if none) */
  currentTip: MentorTip | null;

  /** User's current skill level */
  userLevel: SkillLevel;

  /** Dismiss the current tip */
  dismissTip: () => void;

  /** Request on-demand help */
  requestHelp: () => void;

  /** Whether the help panel is showing */
  showHelpPanel: boolean;

  /** Close the help panel */
  closeHelpPanel: () => void;

  /** Whether the mentor is enabled */
  isEnabled: boolean;

  /** Toggle mentor on/off */
  toggleMentor: (enabled: boolean) => void;

  /** Record a user action (for skill tracking) */
  recordAction: (action: UserAction) => void;

  /** Get tips relevant to current context */
  getContextualTips: () => MentorTip[];

  /** Show a system message (for feedback on auto-actions) */
  showSystemMessage: (message: string, variant?: 'info' | 'success') => void;
}
