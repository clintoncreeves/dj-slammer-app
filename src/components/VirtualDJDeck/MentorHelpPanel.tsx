/**
 * MentorHelpPanel Component
 *
 * On-demand help overlay with categorized tips.
 * Shows contextual suggestions and general DJ guidance.
 */

import { useEffect, useCallback } from 'react';
import { MentorTip, SkillLevel, HighlightTarget } from './mentor/mentorTypes';
import { getSkillLevelDisplayName } from './mentor/useDJMentor';
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

export function MentorHelpPanel({
  tips,
  userLevel,
  onClose,
  onSelectTip,
}: MentorHelpPanelProps) {
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
                {contextualTips.slice(0, 3).map((tip) => (
                  <button
                    key={tip.id}
                    className={styles.tipCard}
                    onClick={() => handleTipClick(tip)}
                  >
                    <div className={styles.tipIcon}>{getTipIcon(tip)}</div>
                    <div className={styles.tipContent}>
                      <div className={styles.tipText}>{tip.content}</div>
                      <div className={`${styles.tipCategory} ${getCategoryClass(tip.category)}`}>
                        {tip.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* General controls section */}
          {generalTips.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Controls Guide</h3>
              <div className={styles.tipList}>
                {generalTips.map((tip) => (
                  <button
                    key={tip.id}
                    className={styles.tipCard}
                    onClick={() => handleTipClick(tip)}
                  >
                    <div className={styles.tipIcon}>{getTipIcon(tip)}</div>
                    <div className={styles.tipContent}>
                      <div className={styles.tipText}>{tip.content}</div>
                      <div className={`${styles.tipCategory} ${getCategoryClass(tip.category)}`}>
                        {tip.category}
                      </div>
                    </div>
                  </button>
                ))}
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

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.levelInfo}>
            <span className={styles.levelLabel}>Your Level:</span>
            <span className={styles.levelBadge}>{getSkillLevelDisplayName(userLevel)}</span>
          </div>
          <div className={styles.keyboardHint}>
            Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
