/**
 * MentorHelpPanel Component
 *
 * On-demand help overlay with categorized tips.
 * Shows contextual suggestions and general DJ guidance.
 * Displays progress toward next skill level.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { MentorTip, SkillLevel, HighlightTarget, UserAction, UserSkillProfile } from './mentor/mentorTypes';
import { getSkillLevelDisplayName } from './mentor/useDJMentor';
import { getProgressSummary, loadSkillProfile } from './mentor/skillTracker';
import styles from './MentorHelpPanel.module.css';

interface MentorHelpPanelProps {
  /** All available tips (contextually sorted) */
  tips: MentorTip[];

  /** User's current skill level */
  userLevel: SkillLevel;

  /** Callback when panel is closed */
  onClose: () => void;

  /** Callback when a tip is selected (to highlight control) */
  onSelectTip?: (target: HighlightTarget | undefined) => void;
}

/** Map tip IDs to actions that complete them */
const TIP_TO_ACTION: Record<string, UserAction> = {
  'start-playing-tip': 'play_deck_a',
  'first-play-tip': 'play_deck_a',
  'both-decks-tip': 'both_decks_playing',
  'crossfader-tip': 'use_crossfader',
  'crossfader-blend-tip': 'use_crossfader',
  'cue-point-tip': 'set_cue',
  'cue-point-phrases-tip': 'jump_to_cue',
  'tempo-tip': 'adjust_tempo',
  'bpm-sync-tip': 'sync_bpm',
  'volume-tip': 'adjust_volume',
  'eq-intro-tip': 'adjust_eq_low',
  'eq-bass-swap-tip': 'adjust_eq_low',
  'help-play': 'play_deck_a',
  'help-cue': 'jump_to_cue',
  'help-tempo': 'adjust_tempo',
  'help-crossfader': 'use_crossfader',
  'help-volume': 'adjust_volume',
  'help-eq': 'adjust_eq_low',
  'help-sync': 'sync_bpm',
};

/** Check if a tip's corresponding action has been completed */
function isTipCompleted(tipId: string, profile: UserSkillProfile): boolean {
  const action = TIP_TO_ACTION[tipId];
  if (!action) return false;
  return (profile.actionsPerformed[action] || 0) > 0;
}

export function MentorHelpPanel({
  tips,
  userLevel,
  onClose,
  onSelectTip,
}: MentorHelpPanelProps) {
  // Load skill profile to check completion status
  const profile = useMemo(() => loadSkillProfile(), []);
  const progressSummary = useMemo(() => getProgressSummary(profile), [profile]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle tip selection
  const handleTipClick = useCallback(
    (tip: MentorTip) => {
      if (onSelectTip && tip.highlightTarget) {
        onSelectTip(tip.highlightTarget);
      }
      onClose();
    },
    [onSelectTip, onClose]
  );

  // Group tips by category
  const contextualTips = tips.filter(
    (tip) => tip.context.conditions.length > 0 && !tip.id.startsWith('help-')
  );
  const generalTips = tips.filter((tip) => tip.id.startsWith('help-'));

  // Get icon for tip based on highlight target
  const getTipIcon = (tip: MentorTip): string => {
    if (!tip.highlightTarget) return '';

    switch (tip.highlightTarget.type) {
      case 'button':
        if (tip.highlightTarget.control === 'play') return '';
        if (tip.highlightTarget.control === 'cue') return '';
        return '';
      case 'slider':
        if (tip.highlightTarget.control === 'volume') return '';
        if (tip.highlightTarget.control === 'tempo') return '';
        return '';
      case 'crossfader':
        return '';
      case 'eq':
        return '';
      case 'waveform':
        return '';
      case 'bpm':
        return '';
      case 'deck':
        return '';
      default:
        return '';
    }
  };

  // Get category display class
  const getCategoryClass = (category: SkillLevel): string => {
    switch (category) {
      case 'beginner':
        return styles.categoryBeginner;
      case 'intermediate':
        return styles.categoryIntermediate;
      case 'advanced':
        return styles.categoryAdvanced;
      default:
        return '';
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="DJ Mentor Help"
    >
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}></div>
            <h2 className={styles.headerTitle}>DJ Mentor Help</h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close help panel"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Contextual tips section */}
          {contextualTips.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Suggested Right Now</h3>
              <div className={styles.tipList}>
                {contextualTips.slice(0, 3).map((tip) => {
                  const isCompleted = isTipCompleted(tip.id, profile);
                  return (
                    <button
                      key={tip.id}
                      className={`${styles.tipCard} ${isCompleted ? styles.tipCardCompleted : ''}`}
                      onClick={() => handleTipClick(tip)}
                    >
                      <div className={styles.tipIcon}>{getTipIcon(tip)}</div>
                      <div className={styles.tipContent}>
                        <div className={styles.tipText}>{tip.content}</div>
                        <div className={`${styles.tipCategory} ${getCategoryClass(tip.category)}`}>
                          {tip.category}
                        </div>
                      </div>
                      {isCompleted && (
                        <div className={styles.completedBadge} title="You've done this!">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* General controls section */}
          {generalTips.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Controls Guide</h3>
              <div className={styles.tipList}>
                {generalTips.map((tip) => {
                  const isCompleted = isTipCompleted(tip.id, profile);
                  return (
                    <button
                      key={tip.id}
                      className={`${styles.tipCard} ${isCompleted ? styles.tipCardCompleted : ''}`}
                      onClick={() => handleTipClick(tip)}
                    >
                      <div className={styles.tipIcon}>{getTipIcon(tip)}</div>
                      <div className={styles.tipContent}>
                        <div className={styles.tipText}>{tip.content}</div>
                        <div className={`${styles.tipCategory} ${getCategoryClass(tip.category)}`}>
                          {tip.category}
                        </div>
                      </div>
                      {isCompleted && (
                        <div className={styles.completedBadge} title="You've done this!">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {tips.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}></div>
              <div className={styles.emptyText}>
                Load some tracks and start mixing to get personalized tips!
              </div>
            </div>
          )}
        </div>

        {/* Footer with progress */}
        <div className={styles.footer}>
          <div className={styles.progressSection}>
            <div className={styles.levelInfo}>
              <span className={styles.levelLabel}>Your Level:</span>
              <span className={styles.levelBadge}>{getSkillLevelDisplayName(userLevel)}</span>
            </div>
            {userLevel !== 'advanced' && (
              <div className={styles.progressBar}>
                <div className={styles.progressLabel}>
                  {userLevel === 'beginner' ? 'To Intermediate' : 'To Advanced'}: {progressSummary.nextLevelProgress}%
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressSummary.nextLevelProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className={styles.stats}>
              {progressSummary.totalActions} actions | {progressSummary.uniqueActions} skills learned
            </div>
          </div>
          <div className={styles.keyboardHint}>
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
