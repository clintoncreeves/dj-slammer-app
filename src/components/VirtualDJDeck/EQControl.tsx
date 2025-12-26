/**
 * EQControl Component - 3-Band EQ (Bass, Mid, Treble)
 *
 * Custom vertical faders styled like professional DJ equipment.
 * Uses drag-based interaction for consistent cross-browser behavior.
 * Teaches kids about frequency bands and sound manipulation.
 */

import { useState, useRef, useEffect } from 'react';
import { DeckId } from './types';
import { clamp } from '../../utils/audioUtils';
import styles from './EQControl.module.css';

interface EQControlProps {
  /** Deck identifier */
  deck: DeckId;

  /** Current EQ values (-12 to +12 dB) */
  eqLow: number;
  eqMid: number;
  eqHigh: number;

  /** Color for the faders (matches deck color) */
  color: string;

  /** Callback when EQ values change */
  onChange: (band: 'low' | 'mid' | 'high', value: number) => void;

  /** Whether this control should be highlighted (tutorial mode) */
  highlighted?: boolean;

  /** Highlight specific EQ band (for tutorial - 'low', 'mid', or 'high') */
  highlightedBand?: 'low' | 'mid' | 'high';

  /** Additional CSS classes */
  className?: string;
}

export function EQControl({
  deck,
  eqLow,
  eqMid,
  eqHigh,
  color,
  onChange,
  highlighted = false,
  highlightedBand,
  className,
}: EQControlProps) {
  const [draggingBand, setDraggingBand] = useState<'low' | 'mid' | 'high' | null>(null);
  const lowSliderRef = useRef<HTMLDivElement>(null);
  const midSliderRef = useRef<HTMLDivElement>(null);
  const highSliderRef = useRef<HTMLDivElement>(null);

  // Convert dB value to percentage for display (0% at -12dB, 50% at 0dB, 100% at +12dB)
  const dbToPercent = (db: number): number => {
    return ((db + 12) / 24) * 100;
  };

  // Convert percentage to dB value
  const percentToDb = (percent: number): number => {
    return (percent / 100) * 24 - 12;
  };

  const updateEQ = (band: 'low' | 'mid' | 'high', clientY: number) => {
    const sliderRef = band === 'low' ? lowSliderRef : band === 'mid' ? midSliderRef : highSliderRef;
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;

    // Invert because slider is vertical (top = max, bottom = min)
    const ratio = clamp(1 - y / height, 0, 1);
    const dbValue = percentToDb(ratio * 100);

    // Round to 0.5 dB increments for smoother control
    const roundedDb = Math.round(dbValue * 2) / 2;
    onChange(band, roundedDb);
  };

  const handleMouseDown = (band: 'low' | 'mid' | 'high') => (e: React.MouseEvent) => {
    setDraggingBand(band);
    updateEQ(band, e.clientY);
  };

  const handleTouchStart = (band: 'low' | 'mid' | 'high') => (e: React.TouchEvent) => {
    setDraggingBand(band);
    updateEQ(band, e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingBand) {
        updateEQ(draggingBand, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (draggingBand) {
        e.preventDefault();
        updateEQ(draggingBand, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setDraggingBand(null);
    };

    if (draggingBand) {
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
  }, [draggingBand]);

  // Position-aware double-click:
  // - Top third: go to max (+12 dB)
  // - Middle third: reset to center (0 dB)
  // - Bottom third: go to min (-12 dB)
  const handleDoubleClick = (band: 'low' | 'mid' | 'high') => (e: React.MouseEvent) => {
    const sliderRef = band === 'low' ? lowSliderRef : band === 'mid' ? midSliderRef : highSliderRef;
    if (!sliderRef.current) {
      onChange(band, 0);
      return;
    }

    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relativePosition = y / rect.height;

    if (relativePosition < 0.33) {
      // Top third - go to max
      onChange(band, 12);
    } else if (relativePosition > 0.67) {
      // Bottom third - go to min
      onChange(band, -12);
    } else {
      // Middle third - reset to center
      onChange(band, 0);
    }
  };

  // Keyboard support
  const handleKeyDown = (band: 'low' | 'mid' | 'high') => (e: React.KeyboardEvent) => {
    const currentValue = band === 'low' ? eqLow : band === 'mid' ? eqMid : eqHigh;
    const step = 1; // 1 dB steps

    switch (e.key) {
      case 'ArrowUp':
        onChange(band, Math.min(currentValue + step, 12));
        e.preventDefault();
        break;
      case 'ArrowDown':
        onChange(band, Math.max(currentValue - step, -12));
        e.preventDefault();
        break;
      case 'Home':
        onChange(band, 12);
        e.preventDefault();
        break;
      case 'End':
        onChange(band, -12);
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        onChange(band, 0); // Reset to neutral
        e.preventDefault();
        break;
    }
  };

  // Render a single EQ band slider
  const renderBand = (
    band: 'low' | 'mid' | 'high',
    label: string,
    value: number,
    sliderRef: React.RefObject<HTMLDivElement>
  ) => {
    const percent = dbToPercent(value);
    const isDragging = draggingBand === band;
    const isBandHighlighted = highlightedBand === band;

    return (
      <div className={`${styles.bandContainer} ${isBandHighlighted ? styles.bandHighlighted : ''}`}>
        <label className={styles.label}>{label}</label>

        <div
          ref={sliderRef}
          className={`${styles.faderContainer} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown(band)}
          onTouchStart={handleTouchStart(band)}
          onDoubleClick={handleDoubleClick(band)}
          onKeyDown={handleKeyDown(band)}
          tabIndex={0}
          role="slider"
          aria-label={`${label} EQ control for Deck ${deck}`}
          aria-valuenow={Math.round(value)}
          aria-valuemin={-12}
          aria-valuemax={12}
          aria-valuetext={`${value >= 0 ? '+' : ''}${value.toFixed(1)} dB`}
          style={{
            '--slider-color': color,
          } as React.CSSProperties}
        >
          {/* Track background */}
          <div className={styles.track}>
            {/* Center notch at 0 dB */}
            <div className={styles.centerNotch} />

            {/* EQ level fill */}
            <div
              className={`${styles.fill} ${value >= 0 ? styles.fillBoost : styles.fillCut}`}
              style={{
                bottom: value >= 0 ? '50%' : `${percent}%`,
                height: value >= 0 ? `${percent - 50}%` : `${50 - percent}%`,
                background: value >= 0 ? color : '#888',
              }}
            />
          </div>

          {/* Fader thumb - rectangular like real DJ faders */}
          {/* Scale position to keep thumb within bounds */}
          <div
            className={styles.thumb}
            style={{
              bottom: `calc(${percent}% * 0.85)`,
              borderColor: color,
            }}
          />

          {/* EQ markers */}
          <div className={styles.markers}>
            <span className={styles.marker}>+12</span>
            <span className={styles.marker}>0</span>
            <span className={styles.marker}>-12</span>
          </div>
        </div>

        {/* Current value display */}
        <div className={styles.valueDisplay} style={{ color }}>
          {value >= 0 ? '+' : ''}{value.toFixed(1)}dB
        </div>
      </div>
    );
  };

  return (
    <div
      className={`${styles.container} ${highlighted ? styles.highlighted : ''} ${
        className || ''
      }`}
    >
      <div className={styles.title}>3-BAND EQ</div>
      <div className={styles.bandsRow}>
        {renderBand('low', 'LOW', eqLow, lowSliderRef)}
        {renderBand('mid', 'MID', eqMid, midSliderRef)}
        {renderBand('high', 'HIGH', eqHigh, highSliderRef)}
      </div>
    </div>
  );
}
