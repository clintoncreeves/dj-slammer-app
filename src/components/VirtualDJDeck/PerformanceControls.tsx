/**
 * PerformanceControls Component
 *
 * Compact UI for hot cues, loops, and filter control.
 * Designed to fit in a single row without scrolling.
 */

import { DeckId } from './types';
import styles from './PerformanceControls.module.css';

interface PerformanceControlsProps {
  deck: DeckId;
  color: string;
  isLoaded: boolean;
  isPlaying: boolean;
  // Hot cues (8 slots)
  hotCues: (number | null)[];
  onSetHotCue: (slot: number) => void;
  onJumpToHotCue: (slot: number) => void;
  onClearHotCue: (slot: number) => void;
  onClearAllHotCues: () => void;
  // Loops
  loopActive: boolean;
  onLoopToggle: () => void;
  onSetAutoLoop: (beats: number) => void;
  // Filter
  filterValue: number; // -1 to 1
  onFilterChange: (value: number) => void;
}

export function PerformanceControls({
  deck: _deck,
  color,
  isLoaded,
  isPlaying: _isPlaying,
  hotCues,
  onSetHotCue,
  onJumpToHotCue,
  onClearHotCue,
  onClearAllHotCues,
  loopActive,
  onLoopToggle,
  onSetAutoLoop,
  filterValue,
  onFilterChange,
}: PerformanceControlsProps) {
  const handleHotCueClick = (slot: number) => {
    if (hotCues[slot] !== null) {
      onJumpToHotCue(slot + 1);
    } else {
      onSetHotCue(slot + 1);
    }
  };

  const handleHotCueRightClick = (e: React.MouseEvent, slot: number) => {
    e.preventDefault();
    if (hotCues[slot] !== null) {
      onClearHotCue(slot + 1);
    }
  };

  return (
    <div
      className={styles.container}
      style={{ '--deck-color': color } as React.CSSProperties}
    >
      {/* Hot Cues - 4 visible at a time for space */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>HOT CUE</span>
        <div className={styles.hotCues}>
          {[0, 1, 2, 3].map((slot) => (
            <button
              key={slot}
              className={`${styles.hotCueButton} ${hotCues[slot] !== null ? styles.active : ''}`}
              onClick={() => handleHotCueClick(slot)}
              onContextMenu={(e) => handleHotCueRightClick(e, slot)}
              disabled={!isLoaded}
              title={hotCues[slot] !== null ? `Jump to cue ${slot + 1} (right-click to clear)` : `Set cue ${slot + 1}`}
            >
              {slot + 1}
            </button>
          ))}
          <button
            className={styles.clearAllButton}
            onClick={onClearAllHotCues}
            disabled={!isLoaded || hotCues.every(cue => cue === null)}
            title="Clear all hot cues"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Loop Controls */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>LOOP</span>
        <div className={styles.loopControls}>
          <button
            className={`${styles.loopButton} ${loopActive ? styles.active : ''}`}
            onClick={onLoopToggle}
            disabled={!isLoaded}
            title={loopActive ? 'Exit loop' : 'Activate loop'}
          >
            {loopActive ? 'ON' : 'OFF'}
          </button>
          {[1, 2, 4, 8].map((beats) => (
            <button
              key={beats}
              className={styles.loopSizeButton}
              onClick={() => onSetAutoLoop(beats)}
              disabled={!isLoaded}
              title={`Set ${beats} beat loop`}
            >
              {beats}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Control */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>FILTER</span>
        <div className={styles.filterControl}>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={filterValue}
            onChange={(e) => onFilterChange(parseFloat(e.target.value))}
            disabled={!isLoaded}
            className={styles.filterSlider}
            title="Filter: Low Pass (left) / High Pass (right)"
          />
          <span className={styles.filterValue}>
            {filterValue === 0 ? 'OFF' : filterValue < 0 ? 'LP' : 'HP'}
          </span>
        </div>
      </div>
    </div>
  );
}
