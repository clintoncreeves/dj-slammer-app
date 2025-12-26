/**
 * PerformanceControls Component
 *
 * Compact UI for hot cues, loops, and filter control.
 * Designed to fit in a single row without scrolling.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Large snap threshold - 15% of range snaps to center
  const SNAP_THRESHOLD = 0.15;

  const updateFilterPosition = useCallback((clientX: number) => {
    if (!filterRef.current || !isLoaded) return;

    const rect = filterRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;

    // Calculate position (-1 to 1), where center is 0
    const rawPosition = (x / width) * 2 - 1;
    let position = Math.max(-1, Math.min(1, rawPosition));

    // Snap to center (0) when close to middle - larger threshold
    if (Math.abs(position) < SNAP_THRESHOLD) {
      position = 0;
    }

    onFilterChange(position);
  }, [onFilterChange, isLoaded]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isLoaded) return;
    setIsDragging(true);
    updateFilterPosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isLoaded) return;
    setIsDragging(true);
    updateFilterPosition(e.touches[0].clientX);
  };

  // Double-click resets to center (OFF)
  const handleDoubleClick = () => {
    if (!isLoaded) return;
    onFilterChange(0);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateFilterPosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updateFilterPosition(e.touches[0].clientX);
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
  }, [isDragging, updateFilterPosition]);

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

  // Calculate visual positions for filter
  const sliderPercent = ((filterValue + 1) / 2) * 100;
  const isLowpass = filterValue < -0.02;
  const isHighpass = filterValue > 0.02;
  const isBypassed = !isLowpass && !isHighpass;

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

      {/* Filter Control - Redesigned for easier use */}
      <div className={styles.filterSection}>
        <span className={styles.sectionLabel}>FILTER</span>
        <div
          ref={filterRef}
          className={`${styles.filterTrack} ${isDragging ? styles.dragging : ''} ${!isLoaded ? styles.disabled : ''}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleDoubleClick}
          title="Filter: LP (left) / OFF (center) / HP (right) - Double-click to reset"
        >
          {/* Track background with gradient */}
          <div className={styles.filterTrackBg}>
            {/* Low-pass fill (left side) */}
            {isLowpass && (
              <div
                className={styles.filterFill}
                style={{
                  width: `${50 - sliderPercent}%`,
                  right: '50%',
                  background: `linear-gradient(to left, ${color}, transparent)`,
                }}
              />
            )}

            {/* High-pass fill (right side) */}
            {isHighpass && (
              <div
                className={styles.filterFill}
                style={{
                  width: `${sliderPercent - 50}%`,
                  left: '50%',
                  background: `linear-gradient(to right, ${color}, transparent)`,
                }}
              />
            )}

            {/* Center notch */}
            <div className={styles.filterCenterNotch} />
          </div>

          {/* Thumb */}
          <div
            className={`${styles.filterThumb} ${isBypassed ? styles.bypassed : ''}`}
            style={{
              left: `${sliderPercent}%`,
              borderColor: isBypassed ? '#555' : color,
              boxShadow: isBypassed ? 'none' : `0 0 8px ${color}`,
            }}
          />
        </div>
        <span className={`${styles.filterLabel} ${isBypassed ? styles.off : ''}`} style={{ color: isBypassed ? '#666' : color }}>
          {isBypassed ? 'OFF' : isLowpass ? 'LP' : 'HP'}
        </span>
      </div>
    </div>
  );
}
