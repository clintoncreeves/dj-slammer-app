/**
 * Crossfader Component
 *
 * Professional horizontal crossfader with gradient visualization.
 * Smooth dragging with keyboard accessibility.
 *
 * Requirements met:
 * - Req 3.1-3.3: Proportional volume control
 * - Req 3.4: Smooth transitions
 * - Req 3.5: Visual feedback
 * - Req 6.1: Touch targets ≥44x44px
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
}

export function Crossfader({
  position,
  onChange,
  colorA = '#00F0FF',
  colorB = '#FF006E',
  snapToCenter = false,
  highlighted,
  className,
}: CrossfaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Convert position from [-1, 1] to percentage [0, 100]
  const percentage = ((position + 1) / 2) * 100;

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
      <div className={styles.labels}>
        <span className={styles.labelA} style={{ color: colorA }}>
          Deck A
        </span>
        <span className={styles.labelCenter}>Mix</span>
        <span className={styles.labelB} style={{ color: colorB }}>
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
        aria-valuetext={`Position: ${position.toFixed(2)}`}
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
        </div>

        {/* Thumb */}
        <div
          className={styles.thumb}
          style={{
            left: `${percentage}%`,
          }}
        >
          <div className={styles.thumbInner} />
        </div>
      </div>

      <div className={styles.hint}>
        Double-click to center • Arrow keys to adjust
      </div>
    </div>
  );
}
