/**
 * VolumeControl Component - Vertical Volume Fader
 *
 * Custom vertical fader styled like professional DJ equipment.
 * Uses drag-based interaction for consistent cross-browser behavior.
 * Requirements: 10.1, 10.2 - Volume control per deck
 */

import { useState, useRef, useEffect } from 'react';
import { DeckId } from './types';
import { clamp } from '../../utils/audioUtils';
import styles from './VolumeControl.module.css';

interface VolumeControlProps {
  /** Deck identifier */
  deck: DeckId;

  /** Current volume (0-1) */
  volume: number;

  /** Color for the fader (matches deck color) */
  color: string;

  /** Callback when volume changes */
  onChange: (volume: number) => void;

  /** Whether this control should be highlighted (tutorial mode) */
  highlighted?: boolean;

  /** Additional CSS classes */
  className?: string;
}

export function VolumeControl({
  deck,
  volume,
  color,
  onChange,
  highlighted = false,
  className,
}: VolumeControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Convert 0-1 volume to percentage for display
  const volumePercent = Math.round(volume * 100);

  const updateVolume = (clientY: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const height = rect.height;

    // Invert because slider is vertical (top = max, bottom = min)
    const ratio = clamp(1 - y / height, 0, 1);
    onChange(ratio);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateVolume(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateVolume(e.touches[0].clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateVolume(e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateVolume(e.touches[0].clientY);
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

  // Position-aware double-click:
  // - Top third: go to max (100%)
  // - Middle third: go to 50%
  // - Bottom third: go to min (0%)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!sliderRef.current) {
      onChange(1);
      return;
    }

    const rect = sliderRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const relativePosition = y / rect.height;

    if (relativePosition < 0.33) {
      // Top third - go to max
      onChange(1);
    } else if (relativePosition > 0.67) {
      // Bottom third - go to min
      onChange(0);
    } else {
      // Middle third - go to 50%
      onChange(0.5);
    }
  };

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.05; // 5% steps
    switch (e.key) {
      case 'ArrowUp':
        onChange(Math.min(volume + step, 1));
        e.preventDefault();
        break;
      case 'ArrowDown':
        onChange(Math.max(volume - step, 0));
        e.preventDefault();
        break;
      case 'Home':
        onChange(1);
        e.preventDefault();
        break;
      case 'End':
        onChange(0);
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        onChange(1); // Reset to full volume
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
      <label className={styles.label}>VOLUME</label>

      <div
        ref={sliderRef}
        className={`${styles.faderContainer} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={`Volume control for Deck ${deck}`}
        aria-valuenow={volumePercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${volumePercent}%`}
        style={{
          '--slider-color': color,
        } as React.CSSProperties}
      >
        {/* Track background */}
        <div className={styles.track}>
          {/* Volume level fill */}
          <div
            className={styles.fill}
            style={{
              height: `${volumePercent}%`,
              background: color,
            }}
          />
        </div>

        {/* Fader thumb - rectangular like real DJ faders */}
        {/* Calculate position so thumb stays within track bounds */}
        {/* At 0%: thumb at bottom (bottom: 0), at 100%: thumb near top but not overlapping */}
        <div
          className={styles.thumb}
          style={{
            bottom: `calc(${volumePercent}% * 0.85)`,
          }}
        />

        {/* Volume markers */}
        <div className={styles.markers}>
          <span className={styles.marker}>100</span>
          <span className={styles.marker}>75</span>
          <span className={styles.marker}>50</span>
          <span className={styles.marker}>25</span>
          <span className={styles.marker}>0</span>
        </div>
      </div>

      {/* Current volume display */}
      <div className={styles.volumeDisplay} style={{ color }}>
        {volumePercent}%
      </div>
    </div>
  );
}
