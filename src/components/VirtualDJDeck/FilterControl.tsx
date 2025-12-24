/**
 * FilterControl Component - DJ Filter Sweep Effect
 *
 * Horizontal slider for filter frequency control with LP/HP toggle.
 * Classic DJ filter effect for dramatic frequency sweeps.
 */

import { useState, useRef, useEffect } from 'react';
import { DeckId } from './types';
import { clamp } from '../../utils/audioUtils';
import styles from './FilterControl.module.css';

interface FilterControlProps {
  /** Deck identifier */
  deck: DeckId;

  /** Current filter frequency (20-20000 Hz) */
  filterFrequency: number;

  /** Current filter type */
  filterType: 'lowpass' | 'highpass';

  /** Color for the control (matches deck color) */
  color: string;

  /** Callback when filter frequency changes */
  onFrequencyChange: (frequency: number) => void;

  /** Callback when filter type changes */
  onTypeChange: (type: 'lowpass' | 'highpass') => void;

  /** Whether this control should be highlighted (tutorial mode) */
  highlighted?: boolean;

  /** Additional CSS classes */
  className?: string;
}

// Convert linear slider position (0-1) to logarithmic frequency (20-20000 Hz)
function positionToFrequency(position: number): number {
  // Logarithmic scale: 20 Hz to 20000 Hz
  const minLog = Math.log(20);
  const maxLog = Math.log(20000);
  const logValue = minLog + position * (maxLog - minLog);
  return Math.exp(logValue);
}

// Convert frequency to slider position (0-1)
function frequencyToPosition(frequency: number): number {
  const minLog = Math.log(20);
  const maxLog = Math.log(20000);
  const freqLog = Math.log(clamp(frequency, 20, 20000));
  return (freqLog - minLog) / (maxLog - minLog);
}

export function FilterControl({
  deck,
  filterFrequency,
  filterType,
  color,
  onFrequencyChange,
  onTypeChange,
  highlighted = false,
  className,
}: FilterControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Convert frequency to 0-1 position for slider
  const sliderPosition = frequencyToPosition(filterFrequency);

  // Format frequency for display
  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return `${Math.round(freq)}`;
  };

  const updateFrequency = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    // Calculate position (0-1)
    const position = clamp(x / width, 0, 1);

    // Convert to logarithmic frequency
    const frequency = positionToFrequency(position);
    onFrequencyChange(frequency);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateFrequency(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateFrequency(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateFrequency(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateFrequency(e.touches[0].clientX);
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
  }, [isDragging]);

  // Reset to fully open (20kHz for LP, 20Hz for HP) on double-click
  const handleDoubleClick = () => {
    if (filterType === 'lowpass') {
      onFrequencyChange(20000);
    } else {
      onFrequencyChange(20);
    }
  };

  // Toggle between lowpass and highpass
  const handleTypeToggle = () => {
    const newType = filterType === 'lowpass' ? 'highpass' : 'lowpass';
    onTypeChange(newType);

    // Auto-adjust frequency to opposite end when switching
    if (newType === 'highpass' && filterFrequency > 10000) {
      onFrequencyChange(20);
    } else if (newType === 'lowpass' && filterFrequency < 100) {
      onFrequencyChange(20000);
    }
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentPos = sliderPosition;
    const step = 0.05; // 5% steps

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        {
          const newPos = Math.min(currentPos + step, 1);
          onFrequencyChange(positionToFrequency(newPos));
        }
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        {
          const newPos = Math.max(currentPos - step, 0);
          onFrequencyChange(positionToFrequency(newPos));
        }
        e.preventDefault();
        break;
      case 'Home':
        onFrequencyChange(20);
        e.preventDefault();
        break;
      case 'End':
        onFrequencyChange(20000);
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        handleTypeToggle();
        e.preventDefault();
        break;
    }
  };

  return (
    <div
      className={`${styles.container} ${highlighted ? styles.highlighted : ''} ${
        className || ''
      }`}
    >
      <div className={styles.header}>
        <label className={styles.label}>FILTER</label>

        {/* LP/HP Toggle Button */}
        <button
          className={`${styles.typeToggle} ${styles[filterType]}`}
          onClick={handleTypeToggle}
          style={{
            '--toggle-color': color,
          } as React.CSSProperties}
          title={`Switch to ${filterType === 'lowpass' ? 'highpass' : 'lowpass'}`}
        >
          {filterType === 'lowpass' ? 'LP' : 'HP'}
        </button>
      </div>

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
        aria-valuenow={Math.round(filterFrequency)}
        aria-valuemin={20}
        aria-valuemax={20000}
        aria-valuetext={`${formatFrequency(filterFrequency)}Hz ${filterType}`}
        style={{
          '--slider-color': color,
        } as React.CSSProperties}
      >
        {/* Track background */}
        <div className={styles.track}>
          {/* Visual indicator showing filter cutoff */}
          <div
            className={`${styles.fill} ${styles[filterType]}`}
            style={{
              width: filterType === 'lowpass'
                ? `${sliderPosition * 100}%`
                : `${(1 - sliderPosition) * 100}%`,
              left: filterType === 'lowpass' ? '0' : `${sliderPosition * 100}%`,
              background: filterType === 'lowpass'
                ? `linear-gradient(to right, ${color}, transparent)`
                : `linear-gradient(to left, ${color}, transparent)`,
            }}
          />

          {/* Center line for reference */}
          <div className={styles.centerLine} />
        </div>

        {/* Slider thumb */}
        <div
          className={styles.thumb}
          style={{
            left: `${sliderPosition * 100}%`,
            borderColor: color,
          }}
        >
          {/* Frequency display on thumb */}
          <span className={styles.thumbLabel}>
            {formatFrequency(filterFrequency)}
          </span>
        </div>

        {/* Frequency markers */}
        <div className={styles.markers}>
          <span className={styles.marker}>20</span>
          <span className={styles.marker}>200</span>
          <span className={styles.marker}>2k</span>
          <span className={styles.marker}>20k</span>
        </div>
      </div>

      {/* Frequency display */}
      <div className={styles.frequencyDisplay} style={{ color }}>
        {formatFrequency(filterFrequency)} Hz
      </div>
    </div>
  );
}
