/**
 * FilterControl Component - Bi-directional DJ Filter Sweep
 *
 * A single knob/slider control for DJ filter effects:
 * - Center position (0): Filter bypassed (no filtering)
 * - Left of center (-1 to 0): Low-pass filter (turn left = more bass, less treble)
 * - Right of center (0 to 1): High-pass filter (turn right = more treble, less bass)
 *
 * This matches the behavior of professional DJ mixers like Pioneer DJM series.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { DeckId } from './types';
import styles from './FilterControl.module.css';

interface FilterControlProps {
  /** Deck identifier */
  deck: DeckId;

  /** Filter position: -1 (full LP) to 1 (full HP), 0 is bypass */
  filterPosition: number;

  /** Filter resonance/Q factor (0.5 to 15, optional) */
  filterResonance?: number;

  /** Color for the control (matches deck color) */
  color: string;

  /** Callback when filter position changes */
  onFilterChange: (position: number, resonance?: number) => void;

  /** Whether this control should be highlighted (tutorial mode) */
  highlighted?: boolean;

  /** Whether to show resonance control */
  showResonance?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export function FilterControl({
  deck,
  filterPosition,
  filterResonance = 1,
  color,
  onFilterChange,
  highlighted = false,
  showResonance = false,
  className,
}: FilterControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResonanceDragging, setIsResonanceDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const resonanceRef = useRef<HTMLDivElement>(null);

  // Get filter type label based on position
  const getFilterLabel = (): string => {
    if (Math.abs(filterPosition) < 0.02) {
      return 'OFF';
    }
    return filterPosition < 0 ? 'LP' : 'HP';
  };

  // Format frequency for display (approximate based on position)
  const getFrequencyDisplay = (): string => {
    if (Math.abs(filterPosition) < 0.02) {
      return 'BYPASS';
    }

    // Calculate approximate frequency from position
    const absPos = Math.abs(filterPosition);
    const minFreq = 20;
    const maxFreq = 20000;
    const logMin = Math.log(minFreq);
    const logMax = Math.log(maxFreq);

    let frequency: number;
    if (filterPosition < 0) {
      // Low-pass: -1 = 20Hz, approaching 0 = 20kHz
      const logFreq = logMax - absPos * (logMax - logMin);
      frequency = Math.exp(logFreq);
    } else {
      // High-pass: approaching 0 = 20Hz, 1 = 20kHz
      const logFreq = logMin + absPos * (logMax - logMin);
      frequency = Math.exp(logFreq);
    }

    if (frequency >= 1000) {
      return `${(frequency / 1000).toFixed(1)}k`;
    }
    return `${Math.round(frequency)}`;
  };

  // Snap threshold - if within this range of center, snap to 0
  const SNAP_THRESHOLD = 0.08;

  const updatePosition = useCallback((clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    // Calculate position (-1 to 1), where center is 0
    const rawPosition = (x / width) * 2 - 1;
    let position = Math.max(-1, Math.min(1, rawPosition));

    // Snap to center (0) when close to middle
    if (Math.abs(position) < SNAP_THRESHOLD) {
      position = 0;
    }

    onFilterChange(position, filterResonance);
  }, [onFilterChange, filterResonance]);

  const updateResonance = useCallback((clientY: number) => {
    if (!resonanceRef.current) return;

    const rect = resonanceRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;

    // Invert Y so dragging up increases resonance
    const rawValue = 1 - (y / height);
    // Map 0-1 to 0.5-15 resonance range
    const resonance = 0.5 + rawValue * 14.5;
    const clampedResonance = Math.max(0.5, Math.min(15, resonance));

    onFilterChange(filterPosition, clampedResonance);
  }, [onFilterChange, filterPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  };

  const handleResonanceMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResonanceDragging(true);
    updateResonance(e.clientY);
  };

  const handleResonanceTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsResonanceDragging(true);
    updateResonance(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
      if (isResonanceDragging) {
        updateResonance(e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging || isResonanceDragging) {
        e.preventDefault();
        if (isDragging) {
          updatePosition(e.touches[0].clientX);
        }
        if (isResonanceDragging) {
          updateResonance(e.touches[0].clientY);
        }
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResonanceDragging(false);
    };

    if (isDragging || isResonanceDragging) {
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
  }, [isDragging, isResonanceDragging, updatePosition, updateResonance]);

  // Reset to center (bypass) on double-click
  const handleDoubleClick = () => {
    onFilterChange(0, filterResonance);
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.05; // 5% steps

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        onFilterChange(Math.min(filterPosition + step, 1), filterResonance);
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        onFilterChange(Math.max(filterPosition - step, -1), filterResonance);
        e.preventDefault();
        break;
      case 'Home':
        onFilterChange(-1, filterResonance); // Full lowpass
        e.preventDefault();
        break;
      case 'End':
        onFilterChange(1, filterResonance); // Full highpass
        e.preventDefault();
        break;
      case 'Delete':
      case 'Escape':
        onFilterChange(0, filterResonance); // Bypass
        e.preventDefault();
        break;
    }
  };

  // Calculate visual positions
  const sliderPercent = ((filterPosition + 1) / 2) * 100; // Convert -1..1 to 0..100%
  const isLowpass = filterPosition < -0.02;
  const isHighpass = filterPosition > 0.02;
  const isBypassed = !isLowpass && !isHighpass;

  return (
    <div
      className={`${styles.container} ${highlighted ? styles.highlighted : ''} ${
        className || ''
      }`}
    >
      <div className={styles.header}>
        <label className={styles.label}>FILTER</label>
        <span
          className={`${styles.typeIndicator} ${
            isLowpass ? styles.lowpass : isHighpass ? styles.highpass : styles.bypass
          }`}
          style={{ color: isBypassed ? '#666' : color }}
        >
          {getFilterLabel()}
        </span>
      </div>

      <div className={styles.sliderRow}>
        <div
          ref={sliderRef}
          className={`${styles.sliderContainer} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="slider"
          aria-label={`Filter control for Deck ${deck}`}
          aria-valuenow={Math.round(filterPosition * 100)}
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuetext={`${getFilterLabel()} ${getFrequencyDisplay()}Hz`}
          style={{
            '--slider-color': color,
          } as React.CSSProperties}
        >
          {/* Track background */}
          <div className={styles.track}>
            {/* Low-pass fill (left side) */}
            {isLowpass && (
              <div
                className={`${styles.fill} ${styles.lowpassFill}`}
                style={{
                  width: `${50 - sliderPercent}%`,
                  right: '50%',
                  background: `linear-gradient(to left, ${color}, transparent)`,
                }}
              />
            )}

            {/* High-pass fill (right side) */}
            {isHighpass && (
              <div
                className={`${styles.fill} ${styles.highpassFill}`}
                style={{
                  width: `${sliderPercent - 50}%`,
                  left: '50%',
                  background: `linear-gradient(to right, ${color}, transparent)`,
                }}
              />
            )}

            {/* Center line (bypass point) */}
            <div className={styles.centerLine} />

            {/* End labels */}
            <span className={styles.endLabel} style={{ left: '2px' }}>LP</span>
            <span className={styles.endLabel} style={{ right: '2px' }}>HP</span>
          </div>

          {/* Slider thumb */}
          <div
            className={`${styles.thumb} ${isBypassed ? styles.bypassed : ''}`}
            style={{
              left: `${sliderPercent}%`,
              borderColor: isBypassed ? '#666' : color,
              backgroundColor: isBypassed ? '#333' : undefined,
            }}
          />
        </div>

        {/* Optional resonance control */}
        {showResonance && (
          <div
            ref={resonanceRef}
            className={`${styles.resonanceControl} ${isResonanceDragging ? styles.dragging : ''}`}
            onMouseDown={handleResonanceMouseDown}
            onTouchStart={handleResonanceTouchStart}
            title="Filter Resonance (Q)"
          >
            <div className={styles.resonanceTrack}>
              <div
                className={styles.resonanceFill}
                style={{
                  height: `${((filterResonance - 0.5) / 14.5) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className={styles.resonanceLabel}>Q</span>
          </div>
        )}
      </div>

      {/* Frequency display */}
      <div
        className={styles.frequencyDisplay}
        style={{ color: isBypassed ? '#666' : color }}
      >
        {isBypassed ? 'BYPASS' : `${getFrequencyDisplay()} Hz`}
      </div>
    </div>
  );
}
