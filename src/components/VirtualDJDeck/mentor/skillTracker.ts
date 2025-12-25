/**
 * Skill Tracker - Persists user skill profile to localStorage
 *
 * Tracks user actions and determines skill level progression.
 */

import { SkillLevel, UserAction, UserSkillProfile } from './mentorTypes';

const STORAGE_KEY = 'djslammer-mentor-profile';

/**
 * Default skill profile for new users
 */
const DEFAULT_PROFILE: UserSkillProfile = {
  level: 'beginner',
  sessionCount: 0,
  actionsPerformed: {},
  tipsShown: [],
  totalMixTime: 0,
};

/**
 * Thresholds for skill level progression
 */
const SKILL_THRESHOLDS = {
  // Actions needed to reach intermediate
  intermediate: {
    totalActions: 50,
    uniqueActions: 5,
    sessionCount: 2,
  },
  // Actions needed to reach advanced
  advanced: {
    totalActions: 200,
    uniqueActions: 10,
    sessionCount: 5,
    requiredActions: ['sync_bpm', 'adjust_eq_low', 'both_decks_playing'] as UserAction[],
  },
};

/**
 * Load the user's skill profile from localStorage
 */
export function loadSkillProfile(): UserSkillProfile {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new fields
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch (error) {
    console.warn('[SkillTracker] Failed to load profile:', error);
  }
  return { ...DEFAULT_PROFILE };
}

/**
 * Save the user's skill profile to localStorage
 */
export function saveSkillProfile(profile: UserSkillProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('[SkillTracker] Failed to save profile:', error);
  }
}

/**
 * Calculate total actions performed
 */
function getTotalActions(profile: UserSkillProfile): number {
  return Object.values(profile.actionsPerformed).reduce((sum, count) => sum + (count || 0), 0);
}

/**
 * Get count of unique action types performed
 */
function getUniqueActionCount(profile: UserSkillProfile): number {
  return Object.keys(profile.actionsPerformed).length;
}

/**
 * Check if user has performed all required actions
 */
function hasRequiredActions(profile: UserSkillProfile, required: UserAction[]): boolean {
  return required.every((action) => (profile.actionsPerformed[action] || 0) > 0);
}

/**
 * Calculate the appropriate skill level based on profile
 */
export function calculateSkillLevel(profile: UserSkillProfile): SkillLevel {
  const totalActions = getTotalActions(profile);
  const uniqueActions = getUniqueActionCount(profile);

  // Check for advanced level
  const advThresh = SKILL_THRESHOLDS.advanced;
  if (
    totalActions >= advThresh.totalActions &&
    uniqueActions >= advThresh.uniqueActions &&
    profile.sessionCount >= advThresh.sessionCount &&
    hasRequiredActions(profile, advThresh.requiredActions)
  ) {
    return 'advanced';
  }

  // Check for intermediate level
  const intThresh = SKILL_THRESHOLDS.intermediate;
  if (
    totalActions >= intThresh.totalActions &&
    uniqueActions >= intThresh.uniqueActions &&
    profile.sessionCount >= intThresh.sessionCount
  ) {
    return 'intermediate';
  }

  return 'beginner';
}

/**
 * Record a user action and update skill level
 */
export function recordUserAction(profile: UserSkillProfile, action: UserAction): UserSkillProfile {
  const newProfile: UserSkillProfile = {
    ...profile,
    actionsPerformed: {
      ...profile.actionsPerformed,
      [action]: (profile.actionsPerformed[action] || 0) + 1,
    },
  };

  // Recalculate skill level
  const newLevel = calculateSkillLevel(newProfile);
  if (newLevel !== profile.level) {
    console.log(`[SkillTracker] Level up! ${profile.level} -> ${newLevel}`);
    newProfile.level = newLevel;
  }

  return newProfile;
}

/**
 * Mark a tip as shown
 */
export function markTipShown(profile: UserSkillProfile, tipId: string): UserSkillProfile {
  if (profile.tipsShown.includes(tipId)) {
    return profile;
  }

  return {
    ...profile,
    tipsShown: [...profile.tipsShown, tipId],
  };
}

/**
 * Check if a tip has been shown before
 */
export function hasTipBeenShown(profile: UserSkillProfile, tipId: string): boolean {
  return profile.tipsShown.includes(tipId);
}

/**
 * Start a new session
 */
export function startSession(profile: UserSkillProfile): UserSkillProfile {
  return {
    ...profile,
    sessionCount: profile.sessionCount + 1,
    lastSessionAt: Date.now(),
  };
}

/**
 * Update total mix time
 */
export function updateMixTime(profile: UserSkillProfile, additionalTime: number): UserSkillProfile {
  return {
    ...profile,
    totalMixTime: profile.totalMixTime + additionalTime,
  };
}

/**
 * Get a human-readable progress summary
 */
export function getProgressSummary(profile: UserSkillProfile): {
  level: SkillLevel;
  totalActions: number;
  uniqueActions: number;
  sessions: number;
  nextLevelProgress: number;
} {
  const totalActions = getTotalActions(profile);
  const uniqueActions = getUniqueActionCount(profile);

  // Calculate progress to next level
  let nextLevelProgress = 100;
  if (profile.level === 'beginner') {
    const thresh = SKILL_THRESHOLDS.intermediate;
    const actionProgress = Math.min(100, (totalActions / thresh.totalActions) * 100);
    const uniqueProgress = Math.min(100, (uniqueActions / thresh.uniqueActions) * 100);
    const sessionProgress = Math.min(100, (profile.sessionCount / thresh.sessionCount) * 100);
    nextLevelProgress = Math.floor((actionProgress + uniqueProgress + sessionProgress) / 3);
  } else if (profile.level === 'intermediate') {
    const thresh = SKILL_THRESHOLDS.advanced;
    const actionProgress = Math.min(100, (totalActions / thresh.totalActions) * 100);
    const uniqueProgress = Math.min(100, (uniqueActions / thresh.uniqueActions) * 100);
    const sessionProgress = Math.min(100, (profile.sessionCount / thresh.sessionCount) * 100);
    const requiredProgress = hasRequiredActions(profile, thresh.requiredActions) ? 100 : 50;
    nextLevelProgress = Math.floor((actionProgress + uniqueProgress + sessionProgress + requiredProgress) / 4);
  }

  return {
    level: profile.level,
    totalActions,
    uniqueActions,
    sessions: profile.sessionCount,
    nextLevelProgress,
  };
}

/**
 * Reset the skill profile (for testing)
 */
export function resetSkillProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
