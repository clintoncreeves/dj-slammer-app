/**
 * Audio Utility Functions
 *
 * Helper functions for audio calculations and conversions
 */

/**
 * Calculate playback rate from BPM values
 * Requirements: 2.1 - Tempo adjustment
 *
 * @param currentBPM - Desired BPM
 * @param originalBPM - Original track BPM
 * @returns Playback rate multiplier
 */
export function calculatePlaybackRate(
  currentBPM: number,
  originalBPM: number
): number {
  if (originalBPM === 0) {
    return 1;
  }
  return currentBPM / originalBPM;
}

/**
 * Calculate BPM from playback rate
 *
 * @param playbackRate - Playback rate multiplier
 * @param originalBPM - Original track BPM
 * @returns Current BPM
 */
export function calculateBPM(playbackRate: number, originalBPM: number): number {
  return playbackRate * originalBPM;
}

/**
 * Format time in MM:SS format
 *
 * @param seconds - Time in seconds
 * @returns Formatted time string
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate crossfader volume curves (equal power)
 * Requirements: 3.4 - Smooth volume transition
 *
 * @param position - Crossfader position (-1 to 1)
 * @returns Object with volumeA and volumeB (0-1)
 */
export function calculateCrossfaderVolumes(position: number): {
  volumeA: number;
  volumeB: number;
} {
  // Clamp position
  const pos = Math.max(-1, Math.min(1, position));

  // Convert to 0-1 range
  const normalized = (pos + 1) / 2;

  // Equal power crossfade curve (constant power)
  const volumeA = Math.cos(normalized * Math.PI / 2);
  const volumeB = Math.sin(normalized * Math.PI / 2);

  return { volumeA, volumeB };
}

/**
 * Clamp a value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 *
 * @param start - Start value
 * @param end - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * clamp(t, 0, 1);
}
