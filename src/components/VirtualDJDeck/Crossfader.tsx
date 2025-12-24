/**
 * Crossfader Component - Enhanced with Deck State Awareness
 *
 * Professional horizontal crossfader with gradient visualization and deck status indicators.
 * Fully integrated with Deck A and Deck B state - shows which decks are loaded and playing.
 * Smooth dragging with keyboard accessibility.
 *
 * Requirements met:
 * - Req 3.1-3.3: Proportional volume control
 * - Req 3.4: Smooth transitions
 * - Req 3.5: Visual feedback
 * - Req 6.1: Touch targets ≥44x44px
 *
 * Integration Features:
 * - Displays deck load status (loaded/not loaded)
 * - Shows active playback state (playing/paused)
 * - Visual indicators for which deck has focus based on crossfader position
 * - Real-time audio routing visualization
 */

import { useState, useRef, useEffect } from 'react';
import { clamp } from '../../utils/audioUtils';
import styles from './Crossfader.module.css';
import highlightStyles from './TutorialHighlight.module.css';

interface CrossfaderProps {
  position: number; // -1 (full A) to 1 (full B)
  onChange: (position: number) => void;
  colorA?: string;
  colorB?: string;
  snapToCenter?: boolean;
  highlighted?: boolean;
  className?: string;
  // Enhanced integration props
  deckALoaded?: boolean;
  deckBLoaded?: boolean;
  deckAPlaying?: boolean;
  deckBPlaying?: boolean;
}

export function Crossfader({
  position,
  onChange,
  colorA = '#00F0FF',
  colorB = '#FF006E',
  snapToCenter = false,
  highlighted,
  className,
  deckALoaded = false,
  deckBLoaded = false,
  deckAPlaying = false,
  deckBPlaying = false,
}: CrossfaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Convert position from [-1, 1] to percentage [0, 100]
  const percentage = ((position + 1) / 2) * 100;

  // Display volume levels using linear interpolation for intuitive UI
  // -1 = full A (A=100%, B=0%), 0 = center (A=50%, B=50%), 1 = full B (A=0%, B=100%)
  // Note: Audio uses equal-power crossfade internally, but linear is more intuitive for display
  const deckAVolume = (1 - (position + 1) / 2) * 100; // 100% at -1, 50% at 0, 0% at 1
  const deckBVolume = ((position + 1) / 2) * 100;     // 0% at -1, 50% at 0, 100% at 1

  const updatePosition = (clientX: number) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const ratio = clamp(x / width, 0, 1);

    // Convert from [0, 1] to [-1, 1]
    let newPosition = ratio * 2 - 1;

    // Snap to center if enabled and close enough
    if (snapToCenter && Math.abs(newPosition) < 0.1) {
      newPosition = 0;
    }

    onChange(newPosition);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updatePosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
        updatePosition(e.touches[0].clientX);
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

  // Keyboard support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = 0.1;
    switch (e.key) {
      case 'ArrowLeft':
        onChange(clamp(position - step, -1, 1));
        e.preventDefault();
        break;
      case 'ArrowRight':
        onChange(clamp(position + step, -1, 1));
        e.preventDefault();
        break;
      case 'Home':
        onChange(-1);
        e.preventDefault();
        break;
      case 'End':
        onChange(1);
        e.preventDefault();
        break;
      case 'Enter':
      case ' ':
        onChange(0); // Center
        e.preventDefault();
        break;
    }
  };

  // Double-click to center
  const handleDoubleClick = () => {
    onChange(0);
  };

  return (
    <div
      className={`${styles.container} ${className || ''} ${
        highlighted ? highlightStyles.highlighted : ''
      }`}
    >
      {/* Deck Status Indicators */}
      <div className={styles.statusIndicators}>
        <div className={styles.deckStatus} data-deck="a">
          <div className={`${styles.statusDot} ${deckALoaded ? styles.loaded : ''} ${deckAPlaying ? styles.playing : ''}`} 
               style={{ backgroundColor: deckALoaded ? colorA : '#333' }} />
          <span className={styles.statusLabel} style={{ color: deckAPlaying ? colorA : '#666' }}>
            {deckALoaded ? (deckAPlaying ? 'Playing' : 'Ready') : 'No Track'}
          </span>
          <span className={styles.volumeLevel} style={{ color: colorA, opacity: deckAVolume / 100 }}>
            {Math.round(deckAVolume)}%
          </span>
        </div>
        <div className={styles.deckStatus} data-deck="b">
          <span className={styles.volumeLevel} style={{ color: colorB, opacity: deckBVolume / 100 }}>
            {Math.round(deckBVolume)}%
          </span>
          <span className={styles.statusLabel} style={{ color: deckBPlaying ? colorB : '#666' }}>
            {deckBLoaded ? (deckBPlaying ? 'Playing' : 'Ready') : 'No Track'}
          </span>
          <div className={`${styles.statusDot} ${deckBLoaded ? styles.loaded : ''} ${deckBPlaying ? styles.playing : ''}`}
               style={{ backgroundColor: deckBLoaded ? colorB : '#333' }} />
        </div>
      </div>

      <div className={styles.labels}>
        <span className={styles.labelA} style={{ color: colorA, opacity: deckAVolume / 100 + 0.3 }}>
          Deck A
        </span>
        <span className={styles.labelCenter}>Mix</span>
        <span className={styles.labelB} style={{ color: colorB, opacity: deckBVolume / 100 + 0.3 }}>
          Deck B
        </span>
      </div>

      <div
        ref={sliderRef}
        className={`${styles.slider} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        tabIndex={0}
        role="slider"
        aria-label="Crossfader"
        aria-valuemin={-1}
        aria-valuemax={1}
        aria-valuenow={position}
        aria-valuetext={`Position: ${position.toFixed(2)}, Deck A: ${Math.round(deckAVolume)}%, Deck B: ${Math.round(deckBVolume)}%`}
        style={{
          '--color-a': colorA,
          '--color-b': colorB,
        } as React.CSSProperties}
      >
        {/* Track with gradient */}
        <div className={styles.track}>
          <div className={styles.gradient} />

          {/* Center indicator */}
          <div className={styles.centerLine} />
          
          {/* Active region indicators - show which deck is dominant */}
          {deckAPlaying && deckAVolume > 50 && (
            <div className={styles.activeRegion} data-side="left" 
                 style={{ 
                   width: `${deckAVolume}%`,
                   background: `linear-gradient(to right, ${colorA}33, transparent)` 
                 }} />
          )}
          {deckBPlaying && deckBVolume > 50 && (
            <div className={styles.activeRegion} data-side="right"
                 style={{ 
                   width: `${deckBVolume}%`,
                   background: `linear-gradient(to left, ${colorB}33, transparent)` 
                 }} />
          )}
        </div>

        {/* Thumb */}
        <div
          className={`${styles.thumb} ${(deckAPlaying && deckAVolume > 50) || (deckBPlaying && deckBVolume > 50) ? styles.active : ''}`}
          style={{
            left: `${percentage}%`,
          }}
        >
          <div className={styles.thumbInner} />
        </div>
      </div>

      <div className={styles.hint}>
        Double-click to center • Arrow keys to adjust • Shows active audio routing
      </div>
    </div>
  );
}
