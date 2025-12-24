/**
 * DeckControls Component
 *
 * Professional play/pause/cue buttons with neon glow effects.
 * Touch-friendly (60x60px minimum) with immediate visual feedback.
 *
 * Requirements met:
 * - Req 1.4, 1.5: Immediate visual feedback with animations
 * - Req 6.1: Touch targets ≥44x44px
 * - Req 6.3: Visual hover states
 */

import { DeckId } from './types';
import styles from './DeckControls.module.css';
import highlightStyles from './TutorialHighlight.module.css';

interface DeckControlsProps {
  deck: DeckId;
  isPlaying: boolean;
  isLoaded: boolean;
  color: string;
  onPlay: () => void;
  onPause: () => void;
  onCue: () => void;
  onSetCue: () => void;
  highlightPlay?: boolean;
  highlightPause?: boolean;
  highlightCue?: boolean;
  highlightSetCue?: boolean;
  className?: string;
}

export function DeckControls({
  deck,
  isPlaying,
  isLoaded,
  color,
  onPlay,
  onPause,
  onCue,
  onSetCue,
  highlightPlay,
  highlightPause,
  highlightCue,
  highlightSetCue,
  className,
}: DeckControlsProps) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Play Button */}
      <button
        className={`${styles.button} ${styles.playButton} ${
          isPlaying ? styles.active : ''
        } ${highlightPlay ? highlightStyles.highlighted : ''}`}
        onClick={onPlay}
        disabled={!isLoaded}
        style={{
          '--button-color': color,
        } as React.CSSProperties}
        aria-label={`Play Deck ${deck}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 5v14l11-7z" fill="currentColor" />
        </svg>
        <span className={styles.label}>Play</span>
      </button>

      {/* Pause Button */}
      <button
        className={`${styles.button} ${styles.pauseButton} ${
          highlightPause ? highlightStyles.highlighted : ''
        }`}
        onClick={onPause}
        disabled={!isLoaded || !isPlaying}
        style={{
          '--button-color': color,
        } as React.CSSProperties}
        aria-label={`Pause Deck ${deck}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor" />
        </svg>
        <span className={styles.label}>Pause</span>
      </button>

      {/* Cue Button */}
      <button
        className={`${styles.button} ${styles.cueButton} ${
          highlightCue ? highlightStyles.highlighted : ''
        }`}
        onClick={onCue}
        disabled={!isLoaded}
        style={{
          '--button-color': color,
        } as React.CSSProperties}
        aria-label={`Cue Deck ${deck}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
            fill="currentColor"
          />
        </svg>
        <span className={styles.label}>Cue</span>
      </button>

      {/* Set Cue Button */}
      <button
        className={`${styles.button} ${styles.setCueButton} ${
          highlightSetCue ? highlightStyles.highlighted : ''
        }`}
        onClick={onSetCue}
        disabled={!isLoaded}
        style={{
          '--button-color': color,
        } as React.CSSProperties}
        aria-label={`Set Cue Point for Deck ${deck}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"
            fill="currentColor"
          />
          <circle cx="12" cy="12" r="3" fill="var(--button-color)" />
        </svg>
        <span className={styles.label}>Set</span>
      </button>
    </div>
  );
}
