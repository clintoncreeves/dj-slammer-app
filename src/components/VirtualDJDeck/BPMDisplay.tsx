/**
 * BPMDisplay Component
 *
 * Large, animated BPM display showing original and current BPM.
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
}

export function BPMDisplay({
  originalBPM,
  currentBPM,
  color,
  className,
}: BPMDisplayProps) {
  const difference = currentBPM - originalBPM;
  const percentage = ((currentBPM / originalBPM - 1) * 100).toFixed(1);
  const isAdjusted = Math.abs(difference) > 0.5;

  return (
    <div 
      className={`${styles.container} ${className || ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Current BPM display"
    >
      <div
        className={styles.currentBPM}
        style={{
          '--bpm-color': color,
        } as React.CSSProperties}
      >
        <span className={styles.value}>{currentBPM.toFixed(1)}</span>
        <span className={styles.unit}>BPM</span>
      </div>

      <div className={styles.details}>
        <div className={styles.original}>
          Original: <span>{originalBPM.toFixed(0)} BPM</span>
        </div>

        {isAdjusted && (
          <div
            className={`${styles.difference} ${
              difference > 0 ? styles.positive : styles.negative
            }`}
          >
            {difference > 0 ? '+' : ''}
            {difference.toFixed(1)} ({percentage > '0' ? '+' : ''}
            {percentage}%)
          </div>
        )}
      </div>
    </div>
  );
}
