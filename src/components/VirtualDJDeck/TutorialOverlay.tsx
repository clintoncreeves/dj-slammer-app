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
  onMoreLessons,
}: TutorialOverlayProps) {
  // If lesson is completed, show completion screen
  if (progress.lessonCompleted) {
    return (
      <div className={`${styles.overlay} ${styles.fadeIn}`}>
        <div className={`${styles.card} ${styles.completionCard}`}>
          <div className={styles.completionAnimation}>
            {lesson.badge && (
              <div className={styles.badge}>
                <span className={styles.badgeIcon}>{lesson.badge.icon}</span>
                <span className={styles.badgeTitle}>{lesson.badge.title}</span>
              </div>
            )}
          </div>

          <h2 className={styles.completionTitle}>
            🔥 SKILL UNLOCKED! 🔥
          </h2>

          <h3 className={styles.lessonName}>{lesson.title}</h3>

          <div className={styles.completionMessage}>
            {lesson.completionMessage.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className={styles.completionButtons}>
            <button
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={onReplayLesson || onExit}
              title="Replay this lesson from the beginning"
            >
              🔄 REPLAY LESSON
            </button>
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={onFreePlayMode || onExit}
              title="Practice freely without tutorial guidance"
            >
              🎧 FREE PLAY MODE
            </button>
            <button
              className={`${styles.button} ${styles.tertiaryButton}`}
              onClick={onMoreLessons || (() => alert('More lessons coming soon!'))}
              title="Browse more lessons (coming soon)"
            >
              📚 MORE LESSONS
            </button>
          </div>
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
