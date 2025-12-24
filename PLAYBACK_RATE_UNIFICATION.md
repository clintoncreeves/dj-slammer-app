# Playback Rate Clamping Unification

## Summary

This document describes the changes made to unify playback rate clamping between `bpmSync.ts` and `AudioEngine.ts`, addressing the issue where BPM sync calculations could produce playback rates that would be silently clamped by the audio engine.

## The Problem

**Before:**
- `bpmSync.ts` calculated playback rates without bounds checking
- `AudioEngine.ts` clamped rates to [0.8, 1.2] range
- This created silent failures where sync would calculate a rate (e.g., 1.3) that would get clamped to 1.2, causing the actual BPM to differ from the calculated target BPM
- Users wouldn't know if a sync was achievable or had been rate-limited

## The Solution

### 1. Shared Constants (`src/utils/audioConstants.ts`)

Created a new file with shared playback rate constants:

```typescript
export const MIN_PLAYBACK_RATE = 0.8;  // -20% speed
export const MAX_PLAYBACK_RATE = 1.2;  // +20% speed

export function isPlaybackRateValid(rate: number): boolean;
export function clampPlaybackRate(rate: number): number;
```

### 2. Updated `bpmSync.ts`

Enhanced the `BPMSyncResult` interface with new fields:

```typescript
export interface BPMSyncResult {
  targetBPM: number;
  syncType: 'direct' | 'half-time' | 'double-time' |
            'direct-clamped' | 'half-time-clamped' | 'double-time-clamped';
  adjustment: number;
  playbackRate: number;
  isAchievable: boolean;           // NEW: true if no clamping needed
  requestedPlaybackRate: number;   // NEW: original rate before clamping
}
```

**Key changes:**
- Now validates playback rates against bounds
- Returns `isAchievable: false` when rate would be clamped
- Updates `syncType` to include `-clamped` suffix when rate is limited
- Stores both the requested and actual (clamped) playback rates
- Logs warnings when clamping occurs

### 3. Updated `AudioEngine.ts`

Modified `setPlaybackRate()` to use shared constants:

```typescript
import { MIN_PLAYBACK_RATE, MAX_PLAYBACK_RATE, clampPlaybackRate } from '../../utils/audioConstants';

setPlaybackRate(deck: DeckId, rate: number): void {
  // Clamp rate to safe range using shared constants (safety net)
  const clampedRate = clampPlaybackRate(rate);

  if (clampedRate !== rate) {
    console.warn(
      `[AudioEngine] Playback rate ${rate.toFixed(3)} clamped to ${clampedRate.toFixed(3)} ` +
      `(valid range: ${MIN_PLAYBACK_RATE}-${MAX_PLAYBACK_RATE})`
    );
  }

  player.playbackRate = clampedRate;
}
```

**Key changes:**
- Uses shared `clampPlaybackRate()` function
- Improved logging with actual constant values
- Kept as safety net (bpmSync already validates)

### 4. Enhanced User Feedback

Updated description functions to indicate when rate limiting occurs:

```typescript
getSyncDescription(result: BPMSyncResult): string {
  const clampedSuffix = !result.isAchievable ? ' (rate limited)' : '';
  // Returns: "Direct sync to 130.0 BPM (+30.0 BPM) (rate limited)"
}

getKidFriendlySyncDescription(result: BPMSyncResult): string {
  const limitedSuffix = !result.isAchievable
    ? " (but it's a bit too far, so we'll get as close as we can!)"
    : "";
  // Returns: "Perfect match! Both tracks are dancing at the same speed! 🎵
  //          (but it's a bit too far, so we'll get as close as we can!)"
}
```

## Benefits

1. **Transparency**: Users now know when a sync is rate-limited
2. **Predictability**: No more silent failures or unexpected BPM values
3. **Maintainability**: Single source of truth for playback rate bounds
4. **Safety**: AudioEngine still clamps as a safety net
5. **Better UX**: Clear feedback when sync targets are unachievable

## Example Scenarios

### Scenario 1: Normal Sync (Achievable)
```typescript
const result = calculateBPMSync(110, 100, 100);
// result.isAchievable = true
// result.requestedPlaybackRate = 1.1
// result.playbackRate = 1.1
// result.syncType = 'direct'
```

### Scenario 2: Extreme Sync (Clamped)
```typescript
const result = calculateBPMSync(130, 100, 100);
// result.isAchievable = false
// result.requestedPlaybackRate = 1.3
// result.playbackRate = 1.2 (clamped)
// result.syncType = 'direct-clamped'
// Console warning: "Playback rate 1.300 is outside valid range [0.8, 1.2], clamped to 1.200"
```

### Scenario 3: Edge Case (Just Within Bounds)
```typescript
const result = calculateBPMSync(120, 100, 100);
// result.isAchievable = true
// result.requestedPlaybackRate = 1.2
// result.playbackRate = 1.2
// result.syncType = 'direct'
```

## Testing

Added comprehensive tests for the new functionality:
- Validation of achievable sync rates
- Clamping behavior for rates exceeding bounds
- Edge cases at boundary values (0.8 and 1.2)
- Clamping for all sync types (direct, half-time, double-time)
- Updated description tests to verify rate-limited indicators

## Files Modified

1. **Created:**
   - `/src/utils/audioConstants.ts` - Shared constants and utilities

2. **Modified:**
   - `/src/utils/bpmSync.ts` - Added validation and new result fields
   - `/src/utils/bpmSync.test.ts` - Added tests for new functionality
   - `/src/components/VirtualDJDeck/AudioEngine.ts` - Uses shared constants

3. **Backward Compatible:**
   - Existing code using `BPMSyncResult` still works (new fields are additional)
   - All existing tests pass (verified existing behavior unchanged)

## Migration Guide

For code using `BPMSyncResult`, you can now optionally check:

```typescript
const syncResult = syncBPM(slaveeDeck, masterDeck);

// Optional: Check if sync is fully achievable
if (!syncResult.isAchievable) {
  console.warn('Sync is rate-limited, actual BPM may differ from target');
  console.log(`Requested rate: ${syncResult.requestedPlaybackRate}`);
  console.log(`Actual rate: ${syncResult.playbackRate}`);
}

// Optional: Check sync type for clamping
if (syncResult.syncType.includes('-clamped')) {
  // Handle clamped sync differently
}
```

## Future Enhancements

Potential improvements:
1. UI indicator when sync is rate-limited
2. Suggest alternative BPM targets when clamping occurs
3. Configurable playback rate bounds (for advanced users)
4. Visual feedback in tempo slider when approaching bounds
