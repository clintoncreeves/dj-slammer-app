/**
 * useDJMentor Hook - Context-aware DJ mentor assistant
 *
 * Provides proactive guidance and on-demand help during free play mode.
 * Tracks user skill progression and delivers tips with a friendly DJ personality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DeckStateSnapshot,
  MentorTip,
  SkillLevel,
  UserAction,
  UserSkillProfile,
  UseDJMentorResult,
} from './mentorTypes';
import {
  loadSkillProfile,
  saveSkillProfile,
  recordUserAction,
  markTipShown,
  startSession,
} from './skillTracker';
import {
  getBestMatchingTip,
  getHelpTips,
  createStateSnapshot,
} from './contextEngine';
import { MENTOR_TIPS } from './mentorTips';

/**
 * Configuration for the mentor system
 */
const MENTOR_CONFIG = {
  /** How often to evaluate context (ms) */
  evaluationInterval: 2000,
  /** Minimum time between proactive tips (ms) */
  proactiveTipCooldown: 120000, // 2 minutes
  /** How long tips display before auto-dismissing (ms) */
  tipDisplayDuration: 8000,
  /** LocalStorage key for mentor enabled state */
  enabledStorageKey: 'djslammer-mentor-enabled',
};

interface UseDJMentorProps {
  /** Current state of Deck A */
  deckA: {
    isPlaying: boolean;
    isLoaded: boolean;
    volume: number;
    currentBPM: number;
    originalBPM: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
  } | null;
  /** Current state of Deck B */
  deckB: {
    isPlaying: boolean;
    isLoaded: boolean;
    volume: number;
    currentBPM: number;
    originalBPM: number;
    eqLow: number;
    eqMid: number;
    eqHigh: number;
  } | null;
  /** Crossfader position (-1 to 1) */
  crossfaderPosition: number;
  /** Whether the mentor should be active (e.g., in freeplay mode) */
  isActive: boolean;
}

/**
 * Hook for the DJ mentor assistant
 */
export function useDJMentor({
  deckA,
  deckB,
  crossfaderPosition,
  isActive,
}: UseDJMentorProps): UseDJMentorResult {
  // State
  const [currentTip, setCurrentTip] = useState<MentorTip | null>(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [profile, setProfile] = useState<UserSkillProfile>(() => loadSkillProfile());
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem(MENTOR_CONFIG.enabledStorageKey);
      return stored !== 'false'; // Default to enabled
    } catch {
      return true;
    }
  });

  // Refs for timing
  const lastActionTimeRef = useRef(Date.now());
  const lastProactiveTipTimeRef = useRef(0);
  const lastShownTimesRef = useRef<Map<string, number>>(new Map());
  const tipDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedRef = useRef(false);

  // Start session on mount
  useEffect(() => {
    if (isActive && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      const newProfile = startSession(profile);
      setProfile(newProfile);
      saveSkillProfile(newProfile);
    }
  }, [isActive]);

  // Save profile when it changes
  useEffect(() => {
    saveSkillProfile(profile);
  }, [profile]);

  // Save enabled state
  useEffect(() => {
    try {
      localStorage.setItem(MENTOR_CONFIG.enabledStorageKey, String(isEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [isEnabled]);

  // Clear tip dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (tipDismissTimerRef.current) {
        clearTimeout(tipDismissTimerRef.current);
      }
    };
  }, []);

  // Auto-dismiss tip after duration
  useEffect(() => {
    if (currentTip) {
      // Clear any existing timer
      if (tipDismissTimerRef.current) {
        clearTimeout(tipDismissTimerRef.current);
      }

      // Set new timer
      tipDismissTimerRef.current = setTimeout(() => {
        setCurrentTip(null);
      }, MENTOR_CONFIG.tipDisplayDuration);
    }

    return () => {
      if (tipDismissTimerRef.current) {
        clearTimeout(tipDismissTimerRef.current);
      }
    };
  }, [currentTip]);

  /**
   * Create current state snapshot
   */
  const createCurrentSnapshot = useCallback((): DeckStateSnapshot | null => {
    if (!deckA || !deckB) return null;

    return createStateSnapshot(
      deckA,
      deckB,
      crossfaderPosition,
      lastActionTimeRef.current
    );
  }, [deckA, deckB, crossfaderPosition]);

  /**
   * Show a tip
   */
  const showTip = useCallback((tip: MentorTip) => {
    setCurrentTip(tip);
    lastShownTimesRef.current.set(tip.id, Date.now());

    // Mark as shown in profile
    setProfile((prev) => markTipShown(prev, tip.id));
  }, []);

  /**
   * Show a temporary system message (for feedback on auto-actions)
   */
  const showSystemMessage = useCallback((message: string, variant: 'info' | 'success' = 'info') => {
    // Create a temporary tip for the system message
    const systemTip: MentorTip = {
      id: `system-${Date.now()}`,
      content: message,
      category: 'beginner',
      context: { trigger: 'action', conditions: [] },
      priority: 10,
      celebrationVariant: variant === 'success' ? 'sparkle' : undefined,
    };
    setCurrentTip(systemTip);
  }, []);

  /**
   * Dismiss the current tip
   */
  const dismissTip = useCallback(() => {
    setCurrentTip(null);
  }, []);

  /**
   * Record a user action
   */
  const recordAction = useCallback((action: UserAction) => {
    lastActionTimeRef.current = Date.now();
    setProfile((prev) => recordUserAction(prev, action));
  }, []);

  /**
   * Toggle mentor on/off
   */
  const toggleMentor = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setCurrentTip(null);
      setShowHelpPanel(false);
    }
  }, []);

  /**
   * Request on-demand help
   */
  const requestHelp = useCallback(() => {
    setShowHelpPanel(true);
  }, []);

  /**
   * Close help panel
   */
  const closeHelpPanel = useCallback(() => {
    setShowHelpPanel(false);
  }, []);

  /**
   * Get contextual tips for help panel
   */
  const getContextualTips = useCallback((): MentorTip[] => {
    const snapshot = createCurrentSnapshot();
    if (!snapshot) return [];

    return getHelpTips(MENTOR_TIPS, snapshot, profile);
  }, [createCurrentSnapshot, profile]);

  // Periodic context evaluation for proactive tips
  useEffect(() => {
    if (!isActive || !isEnabled) return;

    const evaluateContext = () => {
      // Don't show proactive tips if help panel is open or a tip is showing
      if (showHelpPanel || currentTip) return;

      // Check cooldown since last proactive tip
      const now = Date.now();
      if (now - lastProactiveTipTimeRef.current < MENTOR_CONFIG.proactiveTipCooldown) {
        return;
      }

      const snapshot = createCurrentSnapshot();
      if (!snapshot) return;

      const tip = getBestMatchingTip(
        MENTOR_TIPS,
        snapshot,
        profile,
        lastShownTimesRef.current
      );

      if (tip) {
        showTip(tip);
        lastProactiveTipTimeRef.current = now;
      }
    };

    const interval = setInterval(evaluateContext, MENTOR_CONFIG.evaluationInterval);

    return () => clearInterval(interval);
  }, [isActive, isEnabled, showHelpPanel, currentTip, createCurrentSnapshot, profile, showTip]);

  return {
    currentTip,
    userLevel: profile.level,
    dismissTip,
    requestHelp,
    showHelpPanel,
    closeHelpPanel,
    isEnabled,
    toggleMentor,
    recordAction,
    getContextualTips,
    showSystemMessage,
  };
}

/**
 * Helper to get skill level display name
 */
export function getSkillLevelDisplayName(level: SkillLevel): string {
  switch (level) {
    case 'beginner':
      return 'Rookie DJ';
    case 'intermediate':
      return 'Rising Star';
    case 'advanced':
      return 'Pro DJ';
    default:
      return 'DJ';
  }
}

/**
 * Helper to get skill level emoji
 */
export function getSkillLevelEmoji(level: SkillLevel): string {
  switch (level) {
    case 'beginner':
      return '';
    case 'intermediate':
      return '';
    case 'advanced':
      return '';
    default:
      return '';
  }
}
