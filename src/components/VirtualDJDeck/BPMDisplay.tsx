/**
 * BPMDisplay Component
 *
 * Large, animated BPM display showing original and current BPM.
 * Also displays the detected musical key in Camelot notation.
 * Real-time updates with neon glow effect.
 *
 * Requirements met:
 * - Req 2.3: Display current BPM in real-time
 */

import styles from './BPMDisplay.module.css';

interface BPMDisplayProps {
  originalBPM: number;
  currentBPM: number;
  color: string;
  className?: string;
  /** Camelot wheel code (e.g., "8A", "11B") for harmonic mixing */
  camelotCode?: string;
  /** Musical key name (e.g., "C Major", "A Minor") */
  musicalKey?: string;
}

export function BPMDisplay({
  originalBPM,
  currentBPM,
  color,
  className,
  camelotCode,
  musicalKey,
}: BPMDisplayProps) {
  const roundedCurrent = Math.round(currentBPM);
  const roundedOriginal = Math.round(originalBPM);
  const difference = roundedCurrent - roundedOriginal;
  const percentage = Math.round((currentBPM / originalBPM - 1) * 100);
  const isAdjusted = Math.abs(difference) >= 1;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.mainDisplay}>
        <div
          className={styles.currentBPM}
          style={{
            '--bpm-color': color,
          } as React.CSSProperties}
        >
          <span className={styles.value}>{roundedCurrent}</span>
          <span className={styles.unit}>BPM</span>
        </div>

        {camelotCode && (
          <div
            className={styles.camelotCode}
            style={{
              '--bpm-color': color,
            } as React.CSSProperties}
            title={musicalKey || 'Musical key'}
          >
            {camelotCode}
          </div>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.original}>
          Original: <span>{roundedOriginal} BPM</span>
        </div>

        {isAdjusted && (
          <div
            className={`${styles.difference} ${
              difference > 0 ? styles.positive : styles.negative
            }`}
          >
            {difference > 0 ? '+' : ''}
            {difference} ({percentage > 0 ? '+' : ''}
            {percentage}%)
          </div>
        )}
      </div>
    </div>
  );
}
