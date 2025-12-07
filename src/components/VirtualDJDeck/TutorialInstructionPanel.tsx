/**
 * TutorialInstructionPanel Component
 *
 * Professional DJ training instruction panel - Guitar Hero style
 * UNMISSABLE instructions with bold text, progress dots, and professional aesthetic.
 *
 * Design principle: This must be IMPOSSIBLE to miss (like Serato Practice Mode meets Guitar Hero)
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
}

export function TutorialInstructionPanel({
  lesson,
  progress,
  currentStep,
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

  return (
    <div className={styles.panel}>
      <div className={styles.container}>
        {/* Step counter */}
        <div className={styles.stepCounter}>
          STEP {stepNumber} OF {totalSteps}
        </div>

        {/* Main instruction - BOLD and UNMISSABLE */}
        <div className={styles.instruction}>
          {currentStep.instruction}
        </div>

        {/* Progress dots */}
        <div className={styles.progressDots}>
          {progressDots}
        </div>
      </div>
    </div>
  );
}
