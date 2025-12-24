/**
 * TutorialOverlay Component - Simon Says Style Tutorial UI
 *
 * Displays step-by-step instructions and celebrates progress.
 * Based on Tanner's vision: "Like Simon Says - lights up buttons and you tap them when it tells you"
 */

import { TutorialStep, TutorialProgress, TutorialLesson } from './tutorialTypes';
import styles from './TutorialOverlay.module.css';

interface TutorialOverlayProps {
  /** Current lesson */
  lesson: TutorialLesson;

  /** Current progress */
  progress: TutorialProgress;

  /** Current step (derived from progress.currentStepIndex) */
  currentStep: TutorialStep | null;

  /** Whether the current step was just completed (show celebration) */
  showCelebration: boolean;

  /** Callback when user clicks "Next Step" */
  onNextStep: () => void;

  /** Callback when user clicks "Show Hint" */
  onShowHint: () => void;

  /** Callback when user exits the tutorial */
  onExit: () => void;

  /** Whether to show the hint button */
  showHintButton: boolean;

  /** Callback when user clicks "Replay Lesson" on completion screen */
  onReplayLesson?: () => void;

  /** Callback when user clicks "Free Play Mode" on completion screen */
  onFreePlayMode?: () => void;

  /** Callback when user clicks "More Lessons" on completion screen */
  onMoreLessons?: () => void;
}

export function TutorialOverlay({
  lesson,
  progress,
  currentStep,
  showCelebration,
  onNextStep,
  onShowHint,
  onExit,
  showHintButton,
  onReplayLesson,
  onFreePlayMode,
}: TutorialOverlayProps) {
  // If lesson is completed, show completion banner at top (not a popup)
  if (progress.lessonCompleted) {
    return (
      <div className={styles.completionBanner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerLeft}>
            {lesson.badge && (
              <span className={styles.bannerBadge}>{lesson.badge.icon}</span>
            )}
            <span className={styles.bannerTitle}>
              🔥 SKILL UNLOCKED: {lesson.title}
            </span>
          </div>

          <div className={styles.bannerButtons}>
            <button
              className={`${styles.bannerButton} ${styles.bannerButtonSecondary}`}
              onClick={onReplayLesson || onExit}
              title="Replay this lesson"
            >
              🔄 Replay
            </button>
            <button
              className={`${styles.bannerButton} ${styles.bannerButtonPrimary}`}
              onClick={onFreePlayMode || onExit}
              title="Start free play mode"
            >
              🎧 Free Play
            </button>
          </div>

          <button
            className={styles.bannerClose}
            onClick={onFreePlayMode || onExit}
            title="Close and start free play"
            aria-label="Close banner"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // If no current step, don't show overlay
  if (!currentStep) {
    return null;
  }

  const stepNumber = progress.currentStepIndex + 1;
  const totalSteps = lesson.steps.length;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {/* Header with progress */}
        <div className={styles.header}>
          <div className={styles.lessonTitle}>{lesson.title}</div>
          <div className={styles.stepProgress}>
            Step {stepNumber} of {totalSteps}
          </div>
          <button className={styles.exitButton} onClick={onExit} title="Exit Tutorial">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
          />
        </div>

        {/* Current instruction */}
        <div className={styles.instructionContainer}>
          <div className={styles.instructionIcon}>👉</div>
          <div className={styles.instructionText}>{currentStep.instruction}</div>
        </div>

        {/* Celebration message (if step just completed) */}
        {showCelebration && currentStep.celebrationMessage && (
          <div className={styles.celebration}>
            <div className={styles.celebrationIcon}>🎉</div>
            <div className={styles.celebrationText}>{currentStep.celebrationMessage}</div>
          </div>
        )}

        {/* Action buttons */}
        <div className={styles.actions}>
          {showCelebration && progress.stepCompleted ? (
            // Show "Next Step" button when step is completed
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={onNextStep}
            >
              {stepNumber === totalSteps ? 'Finish! 🎊' : 'Next Step →'}
            </button>
          ) : (
            // Show hint button when stuck
            showHintButton &&
            currentStep.hint && (
              <button
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={onShowHint}
              >
                💡 Show Hint
              </button>
            )
          )}
        </div>

        {/* Hint text (shown when hint button is clicked) */}
        {showHintButton && currentStep.hint && (
          <div className={styles.hint}>
            <div className={styles.hintIcon}>💡</div>
            <div className={styles.hintText}>{currentStep.hint}</div>
          </div>
        )}
      </div>
    </div>
  );
}
