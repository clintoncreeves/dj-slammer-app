/**
 * MentorPanel Component
 *
 * Context-aware DJ mentor assistant panel.
 * Shows proactive tips with a friendly DJ personality.
 * Includes help button for on-demand assistance.
 */

import { MentorTip, SkillLevel } from './mentor/mentorTypes';
import { getSkillLevelDisplayName } from './mentor/useDJMentor';
import styles from './MentorPanel.module.css';

interface MentorPanelProps {
  /** Current tip to display */
  tip: MentorTip;

  /** User's current skill level */
  userLevel: SkillLevel;

  /** Callback when tip is dismissed */
  onDismiss: () => void;

  /** Callback when help is requested */
  onRequestHelp: () => void;
}

export function MentorPanel({
  tip,
  userLevel,
  onDismiss,
  onRequestHelp,
}: MentorPanelProps) {
  // Determine panel class based on celebration variant
  let panelClass = styles.panel;
  if (tip.celebrationVariant) {
    switch (tip.celebrationVariant) {
      case 'party':
      case 'sparkle':
        panelClass = `${styles.panel} ${styles.panelCelebration}`;
        break;
      case 'fire':
        panelClass = `${styles.panel} ${styles.panelFire}`;
        break;
      case 'sync':
        panelClass = `${styles.panel} ${styles.panelSync}`;
        break;
      default:
        panelClass = `${styles.panel} ${styles.panelCelebration}`;
    }
  }

  // Get mentor emoji based on tip type
  const getMentorEmoji = () => {
    if (tip.celebrationVariant) {
      switch (tip.celebrationVariant) {
        case 'party':
          return '';
        case 'fire':
          return '';
        case 'sync':
          return '';
        case 'sparkle':
          return '';
        case 'buildup':
          return '';
        default:
          return '';
      }
    }
    // Default mentor icon
    return '';
  };

  return (
    <div
      className={panelClass}
      role="status"
      aria-live="polite"
      aria-label="DJ Mentor tip"
    >
      <div className={styles.container}>
        {/* Mentor icon */}
        <div className={styles.mentorIcon} aria-hidden="true">
          {getMentorEmoji()}
        </div>

        {/* Skill level badge */}
        <div className={styles.skillBadge}>
          {getSkillLevelDisplayName(userLevel)}
        </div>

        {/* Tip content */}
        <div className={styles.tipContent}>
          {tip.content}
        </div>
      </div>

      {/* Button group */}
      <div className={styles.buttonGroup}>
        {/* Help button */}
        <button
          className={styles.helpButton}
          onClick={onRequestHelp}
          aria-label="Open help panel"
          title="Get Help"
        >
          ?
        </button>

        {/* Dismiss button */}
        <button
          className={styles.dismissButton}
          onClick={onDismiss}
          aria-label="Dismiss tip"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Floating mentor toggle button when no tip is showing
 */
interface MentorToggleButtonProps {
  onClick: () => void;
  isEnabled: boolean;
}

export function MentorToggleButton({ onClick, isEnabled }: MentorToggleButtonProps) {
  return (
    <button
      className={styles.toggleButton}
      onClick={onClick}
      aria-label={isEnabled ? "Open mentor help" : "Enable mentor"}
      title="DJ Mentor"
      style={{ opacity: isEnabled ? 1 : 0.6 }}
    >

    </button>
  );
}
