/**
 * BPM Sync Utilities
 *
 * Professional DJ software BPM synchronization algorithms implementing:
 * - Direct tempo matching
 * - Half-time detection and adjustment
 * - Double-time detection and adjustment
 * - Closest path selection (industry standard from VirtualDJ, Traktor, etc.)
 *
 * Research references:
 * - VirtualDJ sync algorithm: Chooses "closest path" for BPM matching
 * - Automatically considers half/double BPM when large differences exist
 * - Example: 140 BPM syncing with 80 BPM -> closest is 70 BPM (half-time)
 */

export interface BPMSyncResult {
  /** Target BPM to sync to */
  targetBPM: number;
  /** Type of sync applied */
  syncType: 'direct' | 'half-time' | 'double-time';
  /** BPM adjustment amount (difference from original) */
  adjustment: number;
  /** Playback rate multiplier to achieve sync */
  playbackRate: number;
}

export interface BPMSyncOptions {
  /** Direct matching tolerance (default: ±10 BPM) */
  directTolerance?: number;
  /** Half-time/double-time tolerance (default: ±5 BPM) */
  timeTolerance?: number;
}

/**
 * Calculate the best BPM sync between two tracks
 * Uses "closest path" algorithm from professional DJ software
 *
 * @param masterBPM - BPM of the master/reference track
 * @param slaveBPM - BPM of the track to sync
 * @param slaveOriginalBPM - Original BPM of slave track (before any tempo adjustments)
 * @param options - Sync options
 * @returns BPM sync result with target BPM and sync type
 */
export function calculateBPMSync(
  masterBPM: number,
  slaveBPM: number,
  slaveOriginalBPM: number,
  options: BPMSyncOptions = {}
): BPMSyncResult {
  const { directTolerance = 10, timeTolerance = 5 } = options;

  // Calculate potential sync targets
  const directTarget = masterBPM;
  const halfTimeTarget = masterBPM / 2;
  const doubleTimeTarget = masterBPM * 2;

  // Calculate adjustment amounts (how much we need to change slave BPM)
  const directAdjustment = Math.abs(slaveBPM - directTarget);
  const halfTimeAdjustment = Math.abs(slaveBPM - halfTimeTarget);
  const doubleTimeAdjustment = Math.abs(slaveBPM - doubleTimeTarget);

  // Find the minimum adjustment (closest path)
  const minAdjustment = Math.min(
    directAdjustment,
    halfTimeAdjustment,
    doubleTimeAdjustment
  );

  let targetBPM: number;
  let syncType: 'direct' | 'half-time' | 'double-time';

  // Apply tolerance checks and choose sync type
  if (minAdjustment === directAdjustment && directAdjustment <= directTolerance) {
    // Direct tempo matching
    targetBPM = directTarget;
    syncType = 'direct';
  } else if (
    minAdjustment === halfTimeAdjustment &&
    halfTimeAdjustment <= timeTolerance
  ) {
    // Half-time matching
    targetBPM = halfTimeTarget;
    syncType = 'half-time';
  } else if (
    minAdjustment === doubleTimeAdjustment &&
    doubleTimeAdjustment <= timeTolerance
  ) {
    // Double-time matching
    targetBPM = doubleTimeTarget;
    syncType = 'double-time';
  } else {
    // If nothing matches within tolerance, use direct as fallback
    // This matches VirtualDJ behavior where it always attempts to sync
    targetBPM = directTarget;
    syncType = 'direct';
  }

  // Calculate playback rate multiplier based on original BPM
  const playbackRate = targetBPM / slaveOriginalBPM;

  return {
    targetBPM,
    syncType,
    adjustment: targetBPM - slaveBPM,
    playbackRate,
  };
}

/**
 * Check if two BPMs can be synced directly (within tolerance)
 *
 * @param bpm1 - First BPM
 * @param bpm2 - Second BPM
 * @param tolerance - Tolerance in BPM (default: ±10)
 * @returns True if BPMs can be synced directly
 */
export function canSyncDirect(
  bpm1: number,
  bpm2: number,
  tolerance: number = 10
): boolean {
  return Math.abs(bpm1 - bpm2) <= tolerance;
}

/**
 * Check if one BPM is approximately half of another (within tolerance)
 *
 * @param bpm1 - First BPM
 * @param bpm2 - Second BPM
 * @param tolerance - Tolerance in BPM (default: ±5)
 * @returns True if bpm1 is approximately half of bpm2
 */
export function isHalfTime(
  bpm1: number,
  bpm2: number,
  tolerance: number = 5
): boolean {
  return Math.abs(bpm1 - bpm2 / 2) <= tolerance;
}

/**
 * Check if one BPM is approximately double another (within tolerance)
 *
 * @param bpm1 - First BPM
 * @param bpm2 - Second BPM
 * @param tolerance - Tolerance in BPM (default: ±5)
 * @returns True if bpm1 is approximately double bpm2
 */
export function isDoubleTime(
  bpm1: number,
  bpm2: number,
  tolerance: number = 5
): boolean {
  return Math.abs(bpm1 - bpm2 * 2) <= tolerance;
}

/**
 * Get a human-readable description of the sync relationship
 *
 * @param syncResult - Result from calculateBPMSync
 * @returns Descriptive string explaining the sync
 */
export function getSyncDescription(syncResult: BPMSyncResult): string {
  const { targetBPM, syncType, adjustment } = syncResult;

  switch (syncType) {
    case 'direct':
      if (Math.abs(adjustment) < 0.5) {
        return `Already in sync at ${targetBPM.toFixed(1)} BPM`;
      }
      return `Direct sync to ${targetBPM.toFixed(1)} BPM (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)} BPM)`;
    case 'half-time':
      return `Half-time sync to ${targetBPM.toFixed(1)} BPM (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)} BPM)`;
    case 'double-time':
      return `Double-time sync to ${targetBPM.toFixed(1)} BPM (${adjustment > 0 ? '+' : ''}${adjustment.toFixed(1)} BPM)`;
  }
}

/**
 * Get kid-friendly description of sync relationship
 *
 * @param syncResult - Result from calculateBPMSync
 * @returns Kid-friendly description
 */
export function getKidFriendlySyncDescription(syncResult: BPMSyncResult): string {
  const { syncType } = syncResult;

  switch (syncType) {
    case 'direct':
      return "Perfect match! Both tracks are dancing at the same speed! 🎵";
    case 'half-time':
      return "Half-speed match! One track is dancing twice as slow, but they match! 🐢";
    case 'double-time':
      return "Double-speed match! One track is dancing twice as fast, but they match! 🐰";
  }
}

/**
 * Check if BPM sync is possible between two tracks
 *
 * @param bpm1 - First BPM
 * @param bpm2 - Second BPM
 * @param options - Sync options
 * @returns True if sync is possible within tolerances
 */
export function canSync(
  bpm1: number,
  bpm2: number,
  options: BPMSyncOptions = {}
): boolean {
  const { directTolerance = 10, timeTolerance = 5 } = options;

  return (
    canSyncDirect(bpm1, bpm2, directTolerance) ||
    isHalfTime(bpm1, bpm2, timeTolerance) ||
    isHalfTime(bpm2, bpm1, timeTolerance) ||
    isDoubleTime(bpm1, bpm2, timeTolerance) ||
    isDoubleTime(bpm2, bpm1, timeTolerance)
  );
}
