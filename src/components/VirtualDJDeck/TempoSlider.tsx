/**
 * TempoSlider Component
 *
 * Professional tempo control slider with BPM range markers.
 * Real-time updates with smooth dragging interaction.
 *
 * Requirements met:
 * - Req 2.1: Adjust tempo without stopping playback
 * - Req 2.3: Display current BPM in real-time
 * - Req 2.5: Maintain tempo until changed
 * - Req 6.1: Touch targets ≥44x44px
 */

import { useState, useRef, useEffect } from 'react';
import { DeckId } from './types';
import { clamp } from '../../utils/audioUtils';
import styles from './TempoSlider.module.css';

interface TempoSliderProps {
  deck: DeckId;
  originalBPM: number;
  currentBPM: number;
  color: string;
  onChange: (bpm: number) => void;
  minPercent?: number; // default -8%
  maxPercent?: number; // default +8%
  className?: string;
  highlighted?: boolean;
}

export function TempoSlider({
  deck: _deck,
  originalBPM,
  currentBPM,
  color,
  onChange,
  minPercent = -8,
  maxPercent = 8,
  className,
  highlighted = false,
}: TempoSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate min/max BPM
  const minBPM = originalBPM * (1 + minPercent / 100);
  const maxBPM = originalBPM * (1 + maxPercent / 100);

  // Calculate percentage for slider position
  const percentage = ((currentBPM - minBPM) / (maxBPM - minBPM)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateBPM(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateBPM(e.touches[0].clientY);
  };

  const updateBPM = (clientY: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;

    // Invert because slider is vertical (top = max, bottom = min)
    const ratio = clamp(1 - y / height, 0, 1);

    // Round to whole BPM values
    const newBPM = Math.round(minBPM + ratio * (maxBPM - minBPM));
    onChange(newBPM);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateBPM(e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateBPM(e.touches[0].clientY);
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

  // Reset to original BPM on double-click
  const handleDoubleClick = () => {
    onChange(originalBPM);
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        onChange(Math.min(Math.round(currentBPM) + 1, Math.round(maxBPM)));
        e.preventDefault();
        break;
      case 'ArrowDown':
        onChange(Math.max(Math.round(currentBPM) - 1, Math.round(minBPM)));
        e.preventDefault();
        break;
      case 'Home':
        onChange(Math.round(maxBPM));
        e.preventDefault();
        break;
      case 'End':
        onChange(Math.round(minBPM));
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        onChange(Math.round(originalBPM));
        e.preventDefault();
        break;
    }
  };

  return (
    <div className={`${styles.container} ${className || ''} ${highlighted ? styles.highlighted : ''}`}>
      <div className={styles.label}>Tempo</div>

      <div
        ref={sliderRef}
        className={`${styles.slider} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={`Tempo control: ${Math.round(currentBPM)} BPM`}
        aria-valuemin={Math.round(minBPM)}
        aria-valuemax={Math.round(maxBPM)}
        aria-valuenow={Math.round(currentBPM)}
        aria-valuetext={`${Math.round(currentBPM)} BPM (${Math.round((currentBPM - originalBPM) / originalBPM * 100)}%)`}
        style={{
          '--slider-color': color,
        } as React.CSSProperties}
      >
        {/* Track */}
        <div className={styles.track}>
          {/* Center notch at 0% (original BPM) */}
          <div className={styles.centerNotch} />

          {/* Markers */}
          <div className={`${styles.marker} ${styles.markerTop}`}>
            <span>{maxPercent > 0 ? '+' : ''}{maxPercent}%</span>
          </div>
          <div className={`${styles.marker} ${styles.markerCenter}`}>
            <span>0%</span>
          </div>
          <div className={`${styles.marker} ${styles.markerBottom}`}>
            <span>{minPercent}%</span>
          </div>

          {/* Fill - extends from center (50%) based on current position */}
          <div
            className={`${styles.fill} ${percentage >= 50 ? styles.fillAbove : styles.fillBelow}`}
            style={{
              // When above center: fill from 50% up to current position
              // When below center: fill from current position up to 50%
              bottom: percentage >= 50 ? '50%' : `${percentage}%`,
              height: percentage >= 50 ? `${percentage - 50}%` : `${50 - percentage}%`,
            }}
          />
        </div>

        {/* Thumb - scale position to keep within bounds */}
        <div
          className={styles.thumb}
          style={{
            bottom: `calc(${percentage}% * 0.85)`,
          }}
        />
      </div>

      <div className={styles.hint}>Double-click to reset</div>
    </div>
  );
}
