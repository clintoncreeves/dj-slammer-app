/**
 * Waveform Component
 *
 * Canvas-based waveform visualization showing full track length.
 * Click anywhere to seek to that position.
 * Shows playhead position and played/unplayed regions.
 *
 * Requirements met:
 * - Req 4.1: Animated waveform visualization
 * - Req 4.3: Freeze animation when paused
 * - Req 4.4: Update speed with tempo adjustment
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import styles from './Waveform.module.css';

interface WaveformProps {
  waveformData: number[];
  color: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  height?: number;
  className?: string;
  /** Callback when user clicks to seek (receives time in seconds) */
  onSeek?: (time: number) => void;
  /** Suggested cue points at phrase boundaries (in seconds) */
  suggestedCuePoints?: number[];
  /** Current cue point position (in seconds) */
  cuePoint?: number;
}

export function Waveform({
  waveformData,
  color,
  isPlaying,
  currentTime,
  duration,
  height = 100,
  className,
  onSeek,
  suggestedCuePoints = [],
  cuePoint = 0,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const [isHovering, setIsHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(400);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate playhead position (0-1)
  const playheadPosition = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  // Draw the waveform with played/unplayed coloring
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || waveformData.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth * dpr;
    const h = height * dpr;
    const barWidth = w / waveformData.length;
    const centerY = h / 2;
    const playheadX = playheadPosition * w;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Draw waveform bars with played/unplayed colors
    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * centerY * 0.9;
      const x = index * barWidth;
      const barX = x + barWidth * 0.1;
      const actualBarWidth = barWidth * 0.8;

      // Determine if this bar is before or after playhead
      const barCenter = x + barWidth / 2;
      const isPlayed = barCenter < playheadX;

      ctx.fillStyle = color;
      ctx.globalAlpha = isPlayed ? 0.4 : 1;

      // Draw mirrored bars (top and bottom)
      ctx.fillRect(barX, centerY - barHeight, actualBarWidth, barHeight);
      ctx.fillRect(barX, centerY, actualBarWidth, barHeight);
    });

    ctx.globalAlpha = 1;

    // Draw suggested cue point markers (subtle vertical lines)
    if (suggestedCuePoints.length > 0 && duration > 0) {
      suggestedCuePoints.forEach((cueTime) => {
        const cueX = (cueTime / duration) * w;

        // Skip if too close to start or out of bounds
        if (cueX < 2 || cueX > w - 2) return;

        // Draw subtle dashed line for suggested cue points
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1 * dpr;
        ctx.setLineDash([2 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(cueX, 0);
        ctx.lineTo(cueX, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw small triangle marker at bottom
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(cueX, h);
        ctx.lineTo(cueX - 4 * dpr, h - 6 * dpr);
        ctx.lineTo(cueX + 4 * dpr, h - 6 * dpr);
        ctx.closePath();
        ctx.fill();
      });
    }

    // Draw current cue point marker (more prominent)
    if (cuePoint > 0 && duration > 0) {
      const cueX = (cuePoint / duration) * w;

      // Solid orange line for current cue point
      ctx.strokeStyle = '#FF9800';
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cueX, 0);
      ctx.lineTo(cueX, h);
      ctx.stroke();

      // Draw small cue marker triangle at top
      ctx.fillStyle = '#FF9800';
      ctx.beginPath();
      ctx.moveTo(cueX, 0);
      ctx.lineTo(cueX - 5 * dpr, 7 * dpr);
      ctx.lineTo(cueX + 5 * dpr, 7 * dpr);
      ctx.closePath();
      ctx.fill();
    }

    // Draw hover indicator
    if (isHovering && hoverPosition !== null) {
      const hoverX = hoverPosition * w;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw playhead
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();

    // Playhead glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 * dpr;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, h);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [waveformData, color, canvasWidth, height, playheadPosition, isHovering, hoverPosition, suggestedCuePoints, cuePoint, duration]);

  // Set up canvas resolution and track container size
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      setCanvasWidth(width);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    // Initial size
    updateCanvasSize();

    // Watch for container size changes
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [height]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawWaveform();
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      drawWaveform();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  // Handle click to seek
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !canvasRef.current || duration <= 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = position * duration;
    onSeek(seekTime);
  };

  // Handle mouse move for hover preview
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.max(0, Math.min(1, x / rect.width));
    setHoverPosition(position);
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverPosition(null);
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${onSeek ? styles.clickable : ''} ${className || ''}`}
      style={{ height: `${height}px` }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onSeek ? 'slider' : undefined}
      aria-label={onSeek ? 'Track position' : undefined}
      aria-valuenow={onSeek ? Math.round(playheadPosition * 100) : undefined}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      tabIndex={onSeek ? 0 : undefined}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
      />

      {/* Time display overlay */}
      <div className={styles.timeOverlay}>
        <span className={styles.currentTime}>{formatTime(currentTime)}</span>
        <span className={styles.duration}>{formatTime(duration)}</span>
      </div>

      {/* Hover time tooltip */}
      {isHovering && hoverPosition !== null && duration > 0 && (
        <div
          className={styles.hoverTime}
          style={{ left: `${hoverPosition * 100}%` }}
        >
          {formatTime(hoverPosition * duration)}
        </div>
      )}

      {waveformData.length === 0 && (
        <div className={styles.placeholder}>No waveform data</div>
      )}
    </div>
  );
}
