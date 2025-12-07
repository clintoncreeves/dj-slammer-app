/**
 * VolumeControl Component - Vertical Volume Fader
 *
 * Realistic vertical slider styled like professional DJ equipment.
 * Requirements: 10.1, 10.2 - Volume control per deck
 */

import { DeckId } from './types';
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onChange(newVolume);
  };

  // Convert 0-1 volume to percentage for display
  const volumePercent = Math.round(volume * 100);

  return (
    <div
      className={`${styles.container} ${highlighted ? styles.highlighted : ''} ${
        className || ''
      }`}
    >
      <label className={styles.label} htmlFor={`volume-${deck}`}>
        VOLUME
      </label>

      <div className={styles.faderContainer}>
        {/* Volume level indicator */}
        <div
          className={styles.volumeLevel}
          style={{
            height: `${volumePercent}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />

        {/* Vertical slider */}
        <input
          id={`volume-${deck}`}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleChange}
          className={styles.slider}
          style={{
            '--slider-color': color,
          } as React.CSSProperties}
          aria-label={`Volume control for Deck ${deck}`}
          aria-valuenow={volumePercent}
          aria-valuemin={0}
          aria-valuemax={100}
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

      {/* Double-click hint */}
      <div className={styles.hint}>Double-click to reset</div>
    </div>
  );
}
