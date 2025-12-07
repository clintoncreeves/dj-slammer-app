/**
 * Waveform Utility Functions
 *
 * Utilities for generating waveform data from audio buffers for visualization
 */

/**
 * Generate waveform data from an AudioBuffer
 * Requirements: 4.1 - Waveform visualization
 *
 * @param audioBuffer - The audio buffer to analyze
 * @param samples - Number of data points to generate (default: 200)
 * @returns Array of normalized amplitude values (0-1)
 */
export function generateWaveformData(
  audioBuffer: AudioBuffer,
  samples: number = 200
): number[] {
  if (!audioBuffer || audioBuffer.length === 0) {
    return [];
  }

  const rawData = audioBuffer.getChannelData(0); // Use first channel (mono or left)
  const blockSize = Math.floor(rawData.length / samples);
  const waveformData: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let sum = 0;

    // Calculate RMS (Root Mean Square) for this block
    for (let j = start; j < end && j < rawData.length; j++) {
      sum += Math.abs(rawData[j]);
    }

    const average = sum / blockSize;
    waveformData.push(average);
  }

  // Normalize to 0-1 range
  const max = Math.max(...waveformData);
  if (max > 0) {
    return waveformData.map((value) => value / max);
  }

  return waveformData;
}

/**
 * Draw waveform on a canvas
 * Requirements: 4.1 - Animated waveform visualization
 *
 * @param canvas - Canvas element to draw on
 * @param waveformData - Array of waveform amplitudes (0-1)
 * @param color - Waveform color (hex string)
 * @param playheadPosition - Current playback position (0-1), or null to hide playhead
 */
export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  color: string,
  playheadPosition: number | null = null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || waveformData.length === 0) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / waveformData.length;
  const centerY = height / 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw waveform bars
  ctx.fillStyle = color;
  waveformData.forEach((amplitude, index) => {
    const barHeight = amplitude * centerY;
    const x = index * barWidth;

    // Draw mirrored bars (top and bottom)
    ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
    ctx.fillRect(x, centerY, barWidth - 1, barHeight);
  });

  // Draw playhead if provided
  if (playheadPosition !== null) {
    const playheadX = playheadPosition * width;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
  }
}

/**
 * Calculate playhead position based on current time and duration
 *
 * @param currentTime - Current playback time in seconds
 * @param duration - Total track duration in seconds
 * @returns Playhead position (0-1)
 */
export function calculatePlayheadPosition(
  currentTime: number,
  duration: number
): number {
  if (duration === 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, currentTime / duration));
}
