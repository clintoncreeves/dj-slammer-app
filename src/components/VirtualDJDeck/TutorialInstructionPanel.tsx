/**
 * TutorialInstructionPanel Component
 *
 * Professional DJ training instruction panel - Guitar Hero style
 * UNMISSABLE instructions with bold text, progress dots, and professional aesthetic.
 * Shows brief celebration messages inline when steps are completed.
 *
 * Design principle: Smooth, fluid tutorial flow at the top (like Serato Practice Mode meets Guitar Hero)
 */

import { TutorialStep, TutorialProgress, TutorialLesson } from './tutorialTypes';
import styles from './TutorialInstructionPanel.module.css';

interface TutorialInstructionPanelProps {
  /** Current lesson */
  lesson: TutorialLesson;

  /** Current progress */
  progress: TutorialProgress;

  /** Current step */
  currentStep: TutorialStep;

  /** Show celebration for completed step */
  showCelebration?: boolean;

  /** Callback when close button is clicked to skip to free play */
  onClose?: () => void;
}

export function TutorialInstructionPanel({
  lesson,
  progress,
  currentStep,
  showCelebration = false,
  onClose,
}: TutorialInstructionPanelProps) {
  const stepNumber = progress.currentStepIndex + 1;
  const totalSteps = lesson.steps.length;

  // Generate progress dots
  const progressDots = Array.from({ length: totalSteps }, (_, i) => {
    const isActive = i <= progress.currentStepIndex;
    return (
      <div
        key={i}
        className={`${styles.progressDot} ${isActive ? styles.progressDotActive : ''}`}
        aria-label={`Step ${i + 1}${isActive ? ' (completed)' : ''}`}
      />
    );
  });

  // Show celebration message briefly when step is completed
  const displayText = showCelebration && currentStep.celebrationMessage
    ? currentStep.celebrationMessage
    : currentStep.instruction;

  const panelClass = showCelebration
    ? `${styles.panel} ${styles.panelCelebrating}`
    : styles.panel;

  return (
    <div className={panelClass}>
      <div className={styles.container}>
        {/* Step counter */}
        <div className={styles.stepCounter}>
          STEP {stepNumber} OF {totalSteps}
        </div>

        {/* Main instruction or celebration - BOLD and UNMISSABLE */}
        <div className={styles.instruction}>
          {displayText}
        </div>

        {/* Progress dots */}
        <div className={styles.progressDots}>
          {progressDots}
        </div>

        {/* Close button to skip to free play */}
        {onClose && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Skip tutorial and start free play"
            title="Skip to Free Play"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
