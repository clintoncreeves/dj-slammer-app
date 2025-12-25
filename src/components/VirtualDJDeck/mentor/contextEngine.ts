/**
 * Context Engine - Evaluates deck state against tip conditions
 *
 * Determines which mentor tips are relevant based on current DJ deck state.
 */

import {
  ContextCondition,
  DeckStateSnapshot,
  MentorContext,
  MentorTip,
  SkillLevel,
  UserSkillProfile,
} from './mentorTypes';
import { hasTipBeenShown } from './skillTracker';

/**
 * Threshold values for context conditions
 */
const THRESHOLDS = {
  crossfaderCenter: 0.2,     // Within 20% of center counts as "center"
  crossfaderExtreme: 0.8,    // Beyond 80% counts as "extreme"
  volumeLow: 0.3,            // Below 30% is low
  volumeHigh: 0.95,          // Above 95% is high/max
  bpmMismatch: 3,            // More than 3 BPM difference
  eqBoost: 3,                // More than 3dB boost
  eqCut: -3,                 // More than 3dB cut
  idleTime: 10000,           // 10 seconds of no action
};

/**
 * Evaluate a single context condition
 */
function evaluateCondition(condition: ContextCondition, state: DeckStateSnapshot): boolean {
  let result = false;

  switch (condition.type) {
    case 'deck_playing':
      if (condition.deck === 'A' || condition.deck === 'any') {
        result = result || state.deckA.isPlaying;
      }
      if (condition.deck === 'B' || condition.deck === 'any') {
        result = result || state.deckB.isPlaying;
      }
      if (condition.deck === 'both') {
        result = state.deckA.isPlaying && state.deckB.isPlaying;
      }
      break;

    case 'deck_stopped':
      if (condition.deck === 'A' || condition.deck === 'any') {
        result = result || !state.deckA.isPlaying;
      }
      if (condition.deck === 'B' || condition.deck === 'any') {
        result = result || !state.deckB.isPlaying;
      }
      if (condition.deck === 'both') {
        result = !state.deckA.isPlaying && !state.deckB.isPlaying;
      }
      break;

    case 'deck_loaded':
      if (condition.deck === 'A' || condition.deck === 'any') {
        result = result || state.deckA.isLoaded;
      }
      if (condition.deck === 'B' || condition.deck === 'any') {
        result = result || state.deckB.isLoaded;
      }
      if (condition.deck === 'both') {
        result = state.deckA.isLoaded && state.deckB.isLoaded;
      }
      break;

    case 'both_playing':
      result = state.deckA.isPlaying && state.deckB.isPlaying;
      break;

    case 'crossfader_center':
      result = Math.abs(state.crossfaderPosition) <= (condition.threshold ?? THRESHOLDS.crossfaderCenter);
      break;

    case 'crossfader_extreme':
      result = Math.abs(state.crossfaderPosition) >= (condition.threshold ?? THRESHOLDS.crossfaderExtreme);
      break;

    case 'crossfader_moving':
      // "Moving" means in the transition zone (not at extremes) - real movement detection
      // would require tracking previous position, so we use position-based heuristic
      result = Math.abs(state.crossfaderPosition) < (condition.threshold ?? THRESHOLDS.crossfaderExtreme);
      break;

    case 'volume_low': {
      const threshold = condition.threshold ?? THRESHOLDS.volumeLow;
      if (condition.deck === 'A') {
        result = state.deckA.volume < threshold;
      } else if (condition.deck === 'B') {
        result = state.deckB.volume < threshold;
      } else {
        result = state.deckA.volume < threshold || state.deckB.volume < threshold;
      }
      break;
    }

    case 'volume_high': {
      const threshold = condition.threshold ?? THRESHOLDS.volumeHigh;
      if (condition.deck === 'A') {
        result = state.deckA.volume >= threshold;
      } else if (condition.deck === 'B') {
        result = state.deckB.volume >= threshold;
      } else {
        result = state.deckA.volume >= threshold || state.deckB.volume >= threshold;
      }
      break;
    }

    case 'bpm_mismatch': {
      const threshold = condition.threshold ?? THRESHOLDS.bpmMismatch;
      // Only check if both decks are loaded
      if (state.deckA.isLoaded && state.deckB.isLoaded) {
        const bpmDiff = Math.abs(state.deckA.currentBPM - state.deckB.currentBPM);
        result = bpmDiff > threshold;
      }
      break;
    }

    case 'bpm_matched': {
      const threshold = condition.threshold ?? 1; // Within 1 BPM counts as matched
      if (state.deckA.isLoaded && state.deckB.isLoaded) {
        const bpmDiff = Math.abs(state.deckA.currentBPM - state.deckB.currentBPM);
        result = bpmDiff <= threshold;
      }
      break;
    }

    case 'eq_boosted': {
      const threshold = condition.threshold ?? THRESHOLDS.eqBoost;
      if (condition.deck === 'A' || condition.deck === 'any' || !condition.deck) {
        result =
          result ||
          state.deckA.eqLow > threshold ||
          state.deckA.eqMid > threshold ||
          state.deckA.eqHigh > threshold;
      }
      if (condition.deck === 'B' || condition.deck === 'any' || !condition.deck) {
        result =
          result ||
          state.deckB.eqLow > threshold ||
          state.deckB.eqMid > threshold ||
          state.deckB.eqHigh > threshold;
      }
      break;
    }

    case 'eq_cut': {
      const threshold = condition.threshold ?? THRESHOLDS.eqCut;
      if (condition.deck === 'A' || condition.deck === 'any' || !condition.deck) {
        result =
          result ||
          state.deckA.eqLow < threshold ||
          state.deckA.eqMid < threshold ||
          state.deckA.eqHigh < threshold;
      }
      if (condition.deck === 'B' || condition.deck === 'any' || !condition.deck) {
        result =
          result ||
          state.deckB.eqLow < threshold ||
          state.deckB.eqMid < threshold ||
          state.deckB.eqHigh < threshold;
      }
      break;
    }

    case 'idle_time': {
      const threshold = condition.threshold ?? THRESHOLDS.idleTime;
      const timeSinceAction = Date.now() - state.lastActionTime;
      result = timeSinceAction > threshold;
      break;
    }

    case 'first_time_action':
      // This is handled separately in filterTipsByProfile
      result = true;
      break;

    case 'session_start':
      // Consider "session start" as first 30 seconds
      result = Date.now() - state.lastActionTime < 30000;
      break;
  }

  // Apply negation if specified
  return condition.negate ? !result : result;
}

/**
 * Evaluate if a mentor context matches the current state
 */
function evaluateContext(context: MentorContext, state: DeckStateSnapshot): boolean {
  if (context.conditions.length === 0) {
    return true;
  }

  if (context.matchAll === false) {
    // OR logic - any condition can match
    return context.conditions.some((condition) => evaluateCondition(condition, state));
  }

  // AND logic (default) - all conditions must match
  return context.conditions.every((condition) => evaluateCondition(condition, state));
}

/**
 * Filter tips by user skill level
 */
function filterTipsByLevel(tips: MentorTip[], level: SkillLevel): MentorTip[] {
  const levelOrder: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];
  const userLevelIndex = levelOrder.indexOf(level);

  return tips.filter((tip) => {
    const tipLevelIndex = levelOrder.indexOf(tip.category);
    // Show tips at or below user's level
    return tipLevelIndex <= userLevelIndex;
  });
}

/**
 * Filter tips based on user profile (shown tips, cooldowns)
 */
function filterTipsByProfile(
  tips: MentorTip[],
  profile: UserSkillProfile,
  lastShownTimes: Map<string, number>
): MentorTip[] {
  const now = Date.now();

  return tips.filter((tip) => {
    // Check if this tip should only show once
    if (tip.showOnce && hasTipBeenShown(profile, tip.id)) {
      return false;
    }

    // Check cooldown
    if (tip.cooldown) {
      const lastShown = lastShownTimes.get(tip.id);
      if (lastShown && now - lastShown < tip.cooldown) {
        return false;
      }
    }

    // Check first_time_action condition
    const firstTimeCondition = tip.context.conditions.find((c) => c.type === 'first_time_action');
    if (firstTimeCondition && firstTimeCondition.actionType) {
      const actionCount = profile.actionsPerformed[firstTimeCondition.actionType as keyof typeof profile.actionsPerformed] || 0;
      if (actionCount > 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Find all tips that match the current context
 */
export function findMatchingTips(
  allTips: MentorTip[],
  state: DeckStateSnapshot,
  profile: UserSkillProfile,
  lastShownTimes: Map<string, number>
): MentorTip[] {
  // Filter by skill level first
  let tips = filterTipsByLevel(allTips, profile.level);

  // Filter by profile (shown tips, cooldowns)
  tips = filterTipsByProfile(tips, profile, lastShownTimes);

  // Filter by context match
  tips = tips.filter((tip) => evaluateContext(tip.context, state));

  // Sort by priority (highest first)
  tips.sort((a, b) => b.priority - a.priority);

  return tips;
}

/**
 * Get the highest priority matching tip
 */
export function getBestMatchingTip(
  allTips: MentorTip[],
  state: DeckStateSnapshot,
  profile: UserSkillProfile,
  lastShownTimes: Map<string, number>
): MentorTip | null {
  const matchingTips = findMatchingTips(allTips, state, profile, lastShownTimes);
  return matchingTips[0] || null;
}

/**
 * Get tips relevant for on-demand help (context-aware but more permissive)
 */
export function getHelpTips(
  allTips: MentorTip[],
  state: DeckStateSnapshot,
  profile: UserSkillProfile
): MentorTip[] {
  // Filter by skill level
  let tips = filterTipsByLevel(allTips, profile.level);

  // Group by relevance
  const relevant: MentorTip[] = [];
  const general: MentorTip[] = [];

  tips.forEach((tip) => {
    if (evaluateContext(tip.context, state)) {
      relevant.push(tip);
    } else {
      general.push(tip);
    }
  });

  // Sort each group by priority
  relevant.sort((a, b) => b.priority - a.priority);
  general.sort((a, b) => b.priority - a.priority);

  // Return relevant tips first, then general tips
  return [...relevant, ...general];
}

/**
 * Create a deck state snapshot from the full deck state
 */
export function createStateSnapshot(
  deckA: {
    isPlaying: boolean;
    isLoaded: boolean;
    volume: number;
    currentBPM: number;
    originalBPM: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
  },
  deckB: {
    isPlaying: boolean;
    isLoaded: boolean;
    volume: number;
    currentBPM: number;
    originalBPM: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
  },
  crossfaderPosition: number,
  lastActionTime: number
): DeckStateSnapshot {
  return {
    deckA,
    deckB,
    crossfaderPosition,
    lastActionTime,
  };
}
