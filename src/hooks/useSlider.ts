/**
 * useSlider Hook - Reusable Slider Logic
 *
 * Provides comprehensive slider functionality with mouse, touch, and keyboard support.
 * Handles both horizontal and vertical orientations with customizable ranges and steps.
 *
 * Features:
 * - Mouse drag support (mousedown, mousemove, mouseup)
 * - Touch support (touchstart, touchmove, touchend)
 * - Keyboard navigation (arrow keys, home, end)
 * - Automatic event listener cleanup
 * - Dragging state management
 * - Orientation-aware position calculation
 * - Value clamping and stepping
 */

import { useState, useEffect, RefObject } from 'react';
import { clamp } from '../utils/audioUtils';

export interface UseSliderOptions {
  /** Reference to the slider container element */
  containerRef: RefObject<HTMLElement>;

  /** Slider orientation */
  orientation: 'horizontal' | 'vertical';

  /** Minimum value */
  min: number;

  /** Maximum value */
  max: number;

  /** Current value */
  value: number;

  /** Step size for keyboard navigation */
  step: number;

  /** Callback when value changes */
  onChange: (value: number) => void;

  /** Optional: snap to specific value when close enough */
  snapValue?: number;

  /** Optional: snap threshold (default 0.1) */
  snapThreshold?: number;

  /** Optional: invert direction (for vertical sliders where top = max) */
  invert?: boolean;
}

export interface UseSliderReturn {
  /** Current dragging state */
  isDragging: boolean;

  /** Event handlers to attach to the slider element */
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

/**
 * Custom hook for slider functionality
 */
export function useSlider({
  containerRef,
  orientation,
  min,
  max,
  value,
  step,
  onChange,
  snapValue,
  snapThreshold = 0.1,
  invert = false,
}: UseSliderOptions): UseSliderReturn {
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Calculate new value from client coordinates
   */
  const updateValue = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let ratio: number;

    if (orientation === 'horizontal') {
      const x = clientX - rect.left;
      const width = rect.width;
      ratio = clamp(x / width, 0, 1);
      if (invert) ratio = 1 - ratio;
    } else {
      const y = clientY - rect.top;
      const height = rect.height;
      ratio = clamp(y / height, 0, 1);
      // For vertical sliders, typically top = max, so invert by default
      // unless explicitly set otherwise
      if (!invert) ratio = 1 - ratio;
      else ratio = ratio;
    }

    // Convert ratio to value in range
    let newValue = min + ratio * (max - min);

    // Apply snapping if configured
    if (snapValue !== undefined) {
      const normalizedSnap = snapValue;
      const normalizedValue = newValue;
      const normalizedThreshold = snapThreshold * (max - min);

      if (Math.abs(normalizedValue - normalizedSnap) < normalizedThreshold) {
        newValue = normalizedSnap;
      }
    }

    // Clamp to range
    newValue = clamp(newValue, min, max);

    onChange(newValue);
  };

  /**
   * Mouse down handler
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e.clientX, e.clientY);
  };

  /**
   * Touch start handler
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateValue(e.touches[0].clientX, e.touches[0].clientY);
  };

  /**
   * Keyboard handler for accessibility
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let newValue = value;
    const range = max - min;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = clamp(value - step, min, max);
        e.preventDefault();
        break;

      case 'ArrowRight':
      case 'ArrowUp':
        newValue = clamp(value + step, min, max);
        e.preventDefault();
        break;

      case 'Home':
        newValue = min;
        e.preventDefault();
        break;

      case 'End':
        newValue = max;
        e.preventDefault();
        break;

      case 'PageDown':
        newValue = clamp(value - range * 0.1, min, max);
        e.preventDefault();
        break;

      case 'PageUp':
        newValue = clamp(value + range * 0.1, min, max);
        e.preventDefault();
        break;

      default:
        return; // Don't call onChange for other keys
    }

    onChange(newValue);
  };

  /**
   * Effect to handle mouse/touch move and end events
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateValue(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateValue(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, min, max, step, onChange, snapValue, snapThreshold, orientation, invert]);

  return {
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onKeyDown: handleKeyDown,
    },
  };
}
