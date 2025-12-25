/**
 * useTransitionState Hook
 *
 * Detects when a DJ transition is happening and determines
 * which deck is incoming vs outgoing based on crossfader movement.
 * Used to provide visual EQ guidance during transitions.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { DeckId } from './types';

export interface TransitionState {
  /** True when both decks are playing and crossfader is in transition zone */
  isTransitioning: boolean;

  /** The deck the crossfader is moving toward (will become dominant) */
  incomingDeck: DeckId | null;

  /** The deck the crossfader is moving away from (will fade out) */
  outgoingDeck: DeckId | null;

  /** Direction of crossfader movement */
  crossfaderDirection: 'toA' | 'toB' | 'stopped';

  /** Current crossfader position (-1 to 1) */
  crossfaderPosition: number;
}

interface UseTransitionStateProps {
  isPlayingA: boolean;
  isPlayingB: boolean;
  crossfaderPosition: number;
  /** Threshold for detecting crossfader movement (default 0.02) */
  movementThreshold?: number;
  /** Delay before considering crossfader "stopped" in ms (default 500) */
  stopDelay?: number;
}

/**
 * Hook to detect DJ transitions and determine incoming/outgoing decks
 *
 * @param isPlayingA - Whether Deck A is currently playing
 * @param isPlayingB - Whether Deck B is currently playing
 * @param crossfaderPosition - Current crossfader position (-1 = A, 0 = center, 1 = B)
 * @returns TransitionState with information about the current transition
 */
export function useTransitionState({
  isPlayingA,
  isPlayingB,
  crossfaderPosition,
  movementThreshold = 0.02,
  stopDelay = 500,
}: UseTransitionStateProps): TransitionState {
  const [direction, setDirection] = useState<'toA' | 'toB' | 'stopped'>('stopped');
  const prevPositionRef = useRef(crossfaderPosition);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveTimeRef = useRef(Date.now());

  // Track crossfader movement direction
  useEffect(() => {
    const prevPosition = prevPositionRef.current;
    const delta = crossfaderPosition - prevPosition;

    // Clear any pending stop timeout
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    // Detect movement
    if (Math.abs(delta) > movementThreshold) {
      lastMoveTimeRef.current = Date.now();
      if (delta > 0) {
        setDirection('toB');
      } else {
        setDirection('toA');
      }
    } else {
      // Set a timeout to mark as stopped after delay
      stopTimeoutRef.current = setTimeout(() => {
        setDirection('stopped');
      }, stopDelay);
    }

    prevPositionRef.current = crossfaderPosition;

    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
    };
  }, [crossfaderPosition, movementThreshold, stopDelay]);

  // Calculate transition state
  const transitionState = useMemo((): TransitionState => {
    const bothPlaying = isPlayingA && isPlayingB;

    // Transition zone: crossfader not at extremes
    // We use -0.8 to 0.8 to give some buffer at the edges
    const inTransitionZone = crossfaderPosition > -0.8 && crossfaderPosition < 0.8;

    const isTransitioning = bothPlaying && inTransitionZone;

    // Determine incoming/outgoing based on crossfader direction
    let incomingDeck: DeckId | null = null;
    let outgoingDeck: DeckId | null = null;

    if (isTransitioning && direction !== 'stopped') {
      if (direction === 'toB') {
        incomingDeck = 'B';
        outgoingDeck = 'A';
      } else {
        incomingDeck = 'A';
        outgoingDeck = 'B';
      }
    } else if (isTransitioning) {
      // Crossfader stopped but in transition zone - use position to infer
      // The deck with less volume is likely the "incoming" one
      if (crossfaderPosition < 0) {
        // Leaning toward A, so B is incoming
        incomingDeck = 'B';
        outgoingDeck = 'A';
      } else if (crossfaderPosition > 0) {
        // Leaning toward B, so A is incoming
        incomingDeck = 'A';
        outgoingDeck = 'B';
      }
      // If exactly centered, we don't set incoming/outgoing
    }

    return {
      isTransitioning,
      incomingDeck,
      outgoingDeck,
      crossfaderDirection: direction,
      crossfaderPosition,
    };
  }, [isPlayingA, isPlayingB, crossfaderPosition, direction]);

  return transitionState;
}
