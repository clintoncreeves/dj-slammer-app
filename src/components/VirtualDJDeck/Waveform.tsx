/**
 * Waveform Component
 *
 * Canvas-based waveform visualization with animated playhead.
 * Updates at 60fps when playing, frozen when paused.
 *
 * Requirements met:
 * - Req 4.1: Animated waveform visualization
 * - Req 4.3: Freeze animation when paused
 * - Req 4.4: Update speed with tempo adjustment
 */

import { useEffect, useRef } from 'react';
import { drawWaveform, calculatePlayheadPosition } from '../../utils/waveformUtils';
import styles from './Waveform.module.css';

interface WaveformProps {
  waveformData: number[];
  color: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  width?: number;
  height?: number;
  className?: string;
}

export function Waveform({
  waveformData,
  color,
  isPlaying,
  currentTime,
  duration,
  width = 400,
  height = 100,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Draw waveform and playhead
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution (for retina displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Animation loop
    const animate = () => {
      if (!canvas) return;

      const playheadPosition = calculatePlayheadPosition(currentTime, duration);
      drawWaveform(canvas, waveformData, color, isPlaying ? playheadPosition : null);

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Start animation if playing, otherwise draw once
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      const playheadPosition = calculatePlayheadPosition(currentTime, duration);
      drawWaveform(canvas, waveformData, color, playheadPosition);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [waveformData, color, isPlaying, currentTime, duration, width, height]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      {waveformData.length === 0 && (
        <div className={styles.placeholder}>No waveform data</div>
      )}
    </div>
  );
}
