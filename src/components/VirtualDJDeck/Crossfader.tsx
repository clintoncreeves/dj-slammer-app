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
import { CrossfaderCurveType, CROSSFADER_CURVES, calculateCrossfaderVolumes } from './types';
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
  // Curve selection props
  curveType?: CrossfaderCurveType;
  onCurveChange?: (curve: CrossfaderCurveType) => void;
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
  curveType = 'constantPower',
  onCurveChange,
}: CrossfaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showCurveSelector, setShowCurveSelector] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const curveSelectorRef = useRef<HTMLDivElement>(null);

  // Convert position from [-1, 1] to percentage [0, 100]
  const percentage = ((position + 1) / 2) * 100;

  // Convert position from [-1, 1] to [0, 1] for curve calculation
  const normalizedPosition = (position + 1) / 2;

  // Calculate actual volume levels based on selected curve
  const { volA, volB } = calculateCrossfaderVolumes(normalizedPosition, curveType);
  const deckAVolume = volA * 100;
  const deckBVolume = volB * 100;

  // Close curve selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (curveSelectorRef.current && !curveSelectorRef.current.contains(e.target as Node)) {
        setShowCurveSelector(false);
      }
    };

    if (showCurveSelector) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCurveSelector]);

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
      {/* Deck Labels with Status */}
      <div className={styles.labels}>
        <div className={styles.deckLabelGroup}>
          <span className={styles.labelA} style={{ color: colorA }}>
            Deck A
          </span>
          <div className={styles.statusUnderLabel}>
            <div className={`${styles.statusDot} ${deckALoaded ? styles.loaded : ''} ${deckAPlaying ? styles.playing : ''}`}
                 style={{ backgroundColor: deckALoaded ? colorA : '#333' }} />
            <span className={styles.statusLabel} style={{ color: deckAPlaying ? colorA : '#666' }}>
              {deckALoaded ? (deckAPlaying ? 'Playing' : 'Ready') : 'No Track'}
            </span>
            <span className={styles.volumeLevel} style={{ color: colorA, opacity: deckAVolume / 100 + 0.3 }}>
              {Math.round(deckAVolume)}%
            </span>
          </div>
        </div>
        <span className={styles.labelCenter}>Mix</span>
        <div className={styles.deckLabelGroup}>
          <span className={styles.labelB} style={{ color: colorB }}>
            Deck B
          </span>
          <div className={styles.statusUnderLabel}>
            <span className={styles.volumeLevel} style={{ color: colorB, opacity: deckBVolume / 100 + 0.3 }}>
              {Math.round(deckBVolume)}%
            </span>
            <span className={styles.statusLabel} style={{ color: deckBPlaying ? colorB : '#666' }}>
              {deckBLoaded ? (deckBPlaying ? 'Playing' : 'Ready') : 'No Track'}
            </span>
            <div className={`${styles.statusDot} ${deckBLoaded ? styles.loaded : ''} ${deckBPlaying ? styles.playing : ''}`}
                 style={{ backgroundColor: deckBLoaded ? colorB : '#333' }} />
          </div>
        </div>
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

      {/* Curve Selector */}
      {onCurveChange && (
        <div className={styles.curveSection} ref={curveSelectorRef}>
          <button
            className={styles.curveButton}
            onClick={() => setShowCurveSelector(!showCurveSelector)}
            aria-expanded={showCurveSelector}
            aria-haspopup="listbox"
          >
            <span className={styles.curveLabel}>Curve:</span>
            <span className={styles.curveName}>{CROSSFADER_CURVES[curveType].name}</span>
            <svg
              className={`${styles.curveChevron} ${showCurveSelector ? styles.open : ''}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showCurveSelector && (
            <div className={styles.curveDropdown} role="listbox">
              {(Object.keys(CROSSFADER_CURVES) as CrossfaderCurveType[]).map((curve) => (
                <button
                  key={curve}
                  className={`${styles.curveOption} ${curve === curveType ? styles.selected : ''}`}
                  onClick={() => {
                    onCurveChange(curve);
                    setShowCurveSelector(false);
                  }}
                  role="option"
                  aria-selected={curve === curveType}
                >
                  <div className={styles.curveOptionContent}>
                    <span className={styles.curveOptionName}>{CROSSFADER_CURVES[curve].name}</span>
                    <span className={styles.curveOptionDesc}>{CROSSFADER_CURVES[curve].description}</span>
                  </div>
                  {/* Mini curve visualization */}
                  <svg className={styles.curvePreview} viewBox="0 0 40 20" preserveAspectRatio="none">
                    <path
                      d={getCurvePathData(curve)}
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.hint}>
        Double-click to center • Arrow keys to adjust • Shows active audio routing
      </div>
    </div>
  );
}

/**
 * Generate SVG path data for curve visualization
 */
function getCurvePathData(curveType: CrossfaderCurveType): string {
  const points: string[] = [];
  const steps = 20;

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 40;
    const pos = i / steps;
    const { volB } = calculateCrossfaderVolumes(pos, curveType);
    // Invert Y because SVG y=0 is at top
    const y = 20 - volB * 20;
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return points.join(' ');
}
