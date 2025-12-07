/**
 * useTutorial Hook - Manages tutorial state and progression
 *
 * Handles:
 * - Step validation
 * - Progress tracking
 * - Celebration timing
 * - Hint delays
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TutorialConfig,
  TutorialProgress,
  TutorialStep,
} from './tutorialTypes';
import { VirtualDJDeckState } from './types';

interface UseTutorialResult {
  /** Current tutorial progress */
  progress: TutorialProgress;

  /** Current step (or null if none) */
  currentStep: TutorialStep | null;

  /** Whether to show celebration animation */
  showCelebration: boolean;

  /** Whether to show hint button */
  showHintButton: boolean;

  /** Whether hint is currently displayed */
  hintVisible: boolean;

  /** Advance to next step */
  nextStep: () => void;

  /** Show hint for current step */
  showHint: () => void;

  /** Exit tutorial */
  exitTutorial: () => void;

  /** Check if an action validates the current step */
  validateStep: (currentState: VirtualDJDeckState) => void;

  /** Get the target control to highlight */
  getHighlightTarget: () => TutorialStep['highlightTarget'] | null;
}

export function useTutorial(
  config: TutorialConfig | null,
  initialState: VirtualDJDeckState
): UseTutorialResult {
  const [progress, setProgress] = useState<TutorialProgress>(() => ({
    lessonId: config?.lesson.id || '',
    currentStepIndex: 0,
    isActive: !!config,
    stepCompleted: false,
    lessonCompleted: false,
    startedAt: config ? new Date() : undefined,
    hintsUsed: 0,
  }));

  const [showCelebration, setShowCelebration] = useState(false);
  const [showHintButton, setShowHintButton] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  const previousStateRef = useRef<VirtualDJDeckState>(initialState);
  const hintTimerRef = useRef<number | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);

  // Get current step
  const currentStep =
    config && progress.currentStepIndex < config.lesson.steps.length
      ? config.lesson.steps[progress.currentStepIndex]
      : null;

  // Start hint timer when step changes
  useEffect(() => {
    if (!config || !currentStep || progress.stepCompleted) {
      setShowHintButton(false);
      setHintVisible(false);
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
      return;
    }

    const hintDelay = (config.hintDelaySeconds || 15) * 1000;
    hintTimerRef.current = window.setTimeout(() => {
      setShowHintButton(true);
    }, hintDelay);

    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, [config, currentStep, progress.stepCompleted, progress.currentStepIndex]);

  // Validate step
  const validateStep = useCallback(
    (currentState: VirtualDJDeckState) => {
      if (!config || !currentStep || progress.stepCompleted || progress.lessonCompleted) {
        return;
      }

      // Run step validation
      const isValid = currentStep.validate(currentState, previousStateRef.current);

      if (isValid) {
        console.log(`[Tutorial] Step "${currentStep.id}" completed!`);

        // Mark step as completed
        setProgress((prev) => ({
          ...prev,
          stepCompleted: true,
        }));

        // Show celebration
        if (config.enableCelebrations !== false) {
          setShowCelebration(true);

          // Hide celebration after 3 seconds if auto-advance is enabled
          if (config.autoAdvance) {
            celebrationTimerRef.current = window.setTimeout(() => {
              nextStep();
            }, 3000);
          }
        }

        // Call callback
        config.callbacks?.onStepComplete?.(currentStep, progress.currentStepIndex);
      }

      // Update previous state
      previousStateRef.current = currentState;
    },
    [config, currentStep, progress.stepCompleted, progress.lessonCompleted, progress.currentStepIndex]
  );

  // Advance to next step
  const nextStep = useCallback(() => {
    if (!config) return;

    // Clear celebration timer if any
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    const nextIndex = progress.currentStepIndex + 1;

    // Check if lesson is completed
    if (nextIndex >= config.lesson.steps.length) {
      const completedAt = new Date();
      const duration = progress.startedAt
        ? completedAt.getTime() - progress.startedAt.getTime()
        : 0;

      setProgress((prev) => ({
        ...prev,
        lessonCompleted: true,
        completedAt,
      }));

      config.callbacks?.onLessonComplete?.(config.lesson, duration);

      console.log(
        `[Tutorial] Lesson "${config.lesson.id}" completed in ${(duration / 1000).toFixed(1)}s!`
      );
    } else {
      // Move to next step
      const nextStep = config.lesson.steps[nextIndex];

      setProgress((prev) => ({
        ...prev,
        currentStepIndex: nextIndex,
        stepCompleted: false,
      }));

      setShowCelebration(false);
      setHintVisible(false);

      config.callbacks?.onStepAdvance?.(nextStep, nextIndex);

      console.log(`[Tutorial] Advanced to step ${nextIndex + 1}:`, nextStep.instruction);
    }
  }, [config, progress.currentStepIndex, progress.startedAt]);

  // Show hint
  const showHint = useCallback(() => {
    setHintVisible(true);
    setProgress((prev) => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1,
    }));

    if (config && currentStep) {
      config.callbacks?.onHintRequest?.(currentStep);
    }

    console.log('[Tutorial] Hint requested');
  }, [config, currentStep]);

  // Exit tutorial
  const exitTutorial = useCallback(() => {
    if (config) {
      config.callbacks?.onTutorialExit?.(progress);
    }

    setProgress((prev) => ({
      ...prev,
      isActive: false,
    }));

    // Clear timers
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    if (celebrationTimerRef.current) {
      clearTimeout(celebrationTimerRef.current);
    }

    console.log('[Tutorial] Exited');
  }, [config, progress]);

  // Get highlight target
  const getHighlightTarget = useCallback(() => {
    return currentStep?.highlightTarget || null;
  }, [currentStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  // Call onTutorialStart when tutorial starts
  useEffect(() => {
    if (config && progress.currentStepIndex === 0 && !progress.lessonCompleted) {
      config.callbacks?.onTutorialStart?.(config.lesson);
      console.log(`[Tutorial] Started lesson "${config.lesson.id}"`);
    }
  }, [config]);

  return {
    progress,
    currentStep,
    showCelebration,
    showHintButton,
    hintVisible,
    nextStep,
    showHint,
    exitTutorial,
    validateStep,
    getHighlightTarget,
  };
}
