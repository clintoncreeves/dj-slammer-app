/**
 * Audio Constants
 *
 * Shared constants for audio playback and synchronization
 */

/**
 * Minimum playback rate multiplier (80% of normal speed)
 * Used to prevent excessive pitch shifting and maintain audio quality
 */
export const MIN_PLAYBACK_RATE = 0.8;

/**
 * Maximum playback rate multiplier (120% of normal speed)
 * Used to prevent excessive pitch shifting and maintain audio quality
 */
export const MAX_PLAYBACK_RATE = 1.2;

/**
 * Check if a playback rate is within valid bounds
 *
 * @param rate - Playback rate to check
 * @returns True if rate is within [MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE]
 */
export function isPlaybackRateValid(rate: number): boolean {
  return rate >= MIN_PLAYBACK_RATE && rate <= MAX_PLAYBACK_RATE;
}

/**
 * Clamp a playback rate to valid bounds
 *
 * @param rate - Playback rate to clamp
 * @returns Clamped playback rate
 */
export function clampPlaybackRate(rate: number): number {
  return Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
}
