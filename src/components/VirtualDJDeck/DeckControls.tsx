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
  onSync?: () => void;
  highlightPlay?: boolean;
  highlightPause?: boolean;
  highlightCue?: boolean;
  highlightSetCue?: boolean;
  highlightSync?: boolean;
  /** Hide CUE and SET CUE buttons (for simplified tutorial mode) */
  hideCueButtons?: boolean;
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
  onSync,
  highlightPlay,
  highlightPause,
  highlightCue,
  highlightSetCue,
  highlightSync,
  hideCueButtons = false,
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

      {/* Sync Button - syncs beat phase to other deck */}
      {onSync && (
        <button
          className={`${styles.button} ${styles.syncButton} ${
            highlightSync ? highlightStyles.highlighted : ''
          }`}
          onClick={onSync}
          disabled={!isLoaded}
          style={{
            '--button-color': color,
          } as React.CSSProperties}
          aria-label={`Sync Deck ${deck} to other deck`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
              fill="currentColor"
            />
          </svg>
          <span className={styles.label}>Sync</span>
        </button>
      )}

      {/* Cue Button - hidden in tutorial mode */}
      {!hideCueButtons && (
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
      )}

      {/* Set Cue Button - hidden in tutorial mode */}
      {!hideCueButtons && (
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
      )}
    </div>
  );
}
