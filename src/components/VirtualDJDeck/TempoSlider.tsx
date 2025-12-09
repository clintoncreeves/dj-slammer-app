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

    const newBPM = minBPM + ratio * (maxBPM - minBPM);
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

  // Keyboard support for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const smallStep = 0.1; // Fine adjustment
    const mediumStep = 0.5; // Normal adjustment
    const largeStep = 2.0; // Large adjustment
    
    let handled = true;
    
    switch (e.key) {
      case 'ArrowUp':
        onChange(Math.min(currentBPM + mediumStep, maxBPM));
        break;
      case 'ArrowDown':
        onChange(Math.max(currentBPM - mediumStep, minBPM));
        break;
      case 'ArrowLeft':
        onChange(Math.max(currentBPM - smallStep, minBPM));
        break;
      case 'ArrowRight':
        onChange(Math.min(currentBPM + smallStep, maxBPM));
        break;
      case 'PageUp':
        onChange(Math.min(currentBPM + largeStep, maxBPM));
        break;
      case 'PageDown':
        onChange(Math.max(currentBPM - largeStep, minBPM));
        break;
      case 'Home':
        onChange(minBPM);
        break;
      case 'End':
        onChange(maxBPM);
        break;
      case 'Enter':
      case ' ':
        onChange(originalBPM); // Reset to original
        break;
      default:
        handled = false;
    }
    
    if (handled) {
      e.preventDefault();
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
        aria-label={`Tempo control for Deck ${_deck}`}
        aria-valuemin={parseFloat(minBPM.toFixed(1))}
        aria-valuemax={parseFloat(maxBPM.toFixed(1))}
        aria-valuenow={parseFloat(currentBPM.toFixed(1))}
        aria-valuetext={`Current BPM: ${currentBPM.toFixed(1)}, Range: ${minBPM.toFixed(1)} to ${maxBPM.toFixed(1)}`}
        style={{
          '--slider-color': color,
        } as React.CSSProperties}
      >
        {/* Track */}
        <div className={styles.track}>
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

          {/* Fill */}
          <div
            className={styles.fill}
            style={{
              height: `${percentage}%`,
            }}
          />
        </div>

        {/* Thumb */}
        <div
          className={styles.thumb}
          style={{
            bottom: `${percentage}%`,
          }}
        />
      </div>

      <div className={styles.hint}>Double-click to reset</div>
    </div>
  );
}
