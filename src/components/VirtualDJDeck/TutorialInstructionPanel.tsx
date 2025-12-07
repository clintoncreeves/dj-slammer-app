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
}

export function TutorialInstructionPanel({
  lesson,
  progress,
  currentStep,
  showCelebration = false,
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
      </div>
    </div>
  );
}
