# BPM Sync Master Logic - Usage Guide

## Overview

The BPM sync master logic has been updated to properly handle tempo synchronization including half-time and double-time transitions, following industry-standard approaches used by professional DJ software like VirtualDJ and Traktor.

## Key Features

### 1. Direct Tempo Matching
When two tracks' BPMs are within ±10 BPM range, they are synced directly without modification.

**Example:**
- Track A: 120 BPM
- Track B: 115 BPM
- Result: Track B syncs to 120 BPM (direct match)

### 2. Half-Time Detection
When one track's BPM is approximately half of another track's BPM (with ±5 BPM margin), it automatically adjusts to match at half-time.

**Example:**
- Track A: 140 BPM
- Track B: 68 BPM
- Result: Track B syncs to 70 BPM (half-time of 140 BPM)

### 3. Double-Time Detection
When one track's BPM is approximately double another track's BPM (with ±5 BPM margin), it automatically adjusts to match at double-time.

**Example:**
- Track A: 70 BPM
- Track B: 138 BPM
- Result: Track B syncs to 140 BPM (double-time of 70 BPM)

### 4. Closest Path Selection
The sync algorithm automatically selects the synchronization method (direct, half-time, or double-time) that results in the smallest BPM adjustment.

**Example:**
- Track A: 128 BPM
- Track B: 62 BPM
- Analysis:
  - Direct: 128 - 62 = 66 BPM adjustment
  - Half-time: 64 - 62 = 2 BPM adjustment ✓ (chosen)
  - Double-time: 256 - 62 = 194 BPM adjustment
- Result: Track B syncs to 64 BPM (half-time)

## API Usage

### VirtualDJDeck Component

The `syncBPM` method has been added to the VirtualDJDeck API:

```typescript
import { useRef } from 'react';
import { VirtualDJDeck, VirtualDJDeckHandle } from './components/VirtualDJDeck';

function MyDJApp() {
  const deckRef = useRef<VirtualDJDeckHandle>(null);

  const handleSyncClick = () => {
    // Sync Deck B to Deck A (Deck B becomes the "slave")
    const syncResult = deckRef.current?.syncBPM('B', 'A');
    
    if (syncResult) {
      console.log(`Sync Type: ${syncResult.syncType}`);
      console.log(`Target BPM: ${syncResult.targetBPM}`);
      console.log(`Adjustment: ${syncResult.adjustment} BPM`);
      console.log(`Playback Rate: ${syncResult.playbackRate}`);
    }
  };

  return (
    <div>
      <VirtualDJDeck ref={deckRef} config={config} />
      <button onClick={handleSyncClick}>Sync B to A</button>
    </div>
  );
}
```

### Direct API Usage

You can also use the BPM sync utilities directly:

```typescript
import { calculateBPMSync, getSyncDescription } from './utils/bpmSync';

// Calculate optimal sync between two tracks
const syncResult = calculateBPMSync(
  masterBPM: 140,        // Master track BPM
  slaveBPM: 80,          // Current slave track BPM
  slaveOriginalBPM: 80   // Original slave track BPM (before tempo adjustments)
);

console.log(getSyncDescription(syncResult));
// Output: "Half-time sync to 70.0 BPM (-10.0 BPM)"
```

### Helper Functions

```typescript
import { canSync, canSyncDirect, isHalfTime, isDoubleTime } from './utils/bpmSync';

// Check if two BPMs can be synced
if (canSync(140, 80)) {
  console.log('These tracks can be synced!');
}

// Check specific sync types
if (canSyncDirect(120, 115)) {
  console.log('Direct sync possible');
}

if (isHalfTime(70, 140)) {
  console.log('Half-time relationship detected');
}

if (isDoubleTime(140, 70)) {
  console.log('Double-time relationship detected');
}
```

## Implementation in SpeedMatcher Game

The SpeedMatcher game has been updated to use the new BPM sync logic. It now recognizes and celebrates different types of matches:

- **Direct Match**: "PERFECT MATCH!" 🎵
- **Half-Time Match**: "HALF-TIME MATCH! 🐢" (with hint: "One track is twice as slow!")
- **Double-Time Match**: "DOUBLE-TIME MATCH! 🐰" (with hint: "One track is twice as fast!")

## Algorithm Details

The sync algorithm follows this logic:

1. Calculate three potential sync targets:
   - Direct: Use master BPM as-is
   - Half-time: Use master BPM / 2
   - Double-time: Use master BPM * 2

2. Calculate adjustment needed for each option (difference from current slave BPM)

3. Find the minimum adjustment (closest path)

4. Apply tolerance checks:
   - Direct: Within ±10 BPM
   - Half-time: Within ±5 BPM
   - Double-time: Within ±5 BPM

5. Select the sync type with the smallest adjustment that meets tolerance requirements

6. Calculate and apply the playback rate multiplier

## Real-World DJ Scenarios

### House Music Mixing (120-130 BPM)
```typescript
const result = calculateBPMSync(128, 124, 124);
// Result: Direct sync to 128 BPM
```

### Drum & Bass Half-Time Mixing
```typescript
const result = calculateBPMSync(174, 87, 87);
// Result: Half-time sync to 87 BPM (174 / 2)
```

### Hip-Hop to House Transition
```typescript
const result = calculateBPMSync(128, 90, 90);
// Result: Direct sync to 128 BPM (large adjustment)
```

## Configuration Options

You can customize the tolerance values:

```typescript
const syncResult = calculateBPMSync(
  masterBPM,
  slaveBPM,
  slaveOriginalBPM,
  {
    directTolerance: 15,    // ±15 BPM for direct matching
    timeTolerance: 3        // ±3 BPM for half/double-time
  }
);
```

## Testing

Run the BPM sync tests:

```bash
npm test -- bpmSync.test.ts
```

The test suite includes:
- Direct tempo matching scenarios
- Half-time detection tests
- Double-time detection tests
- Closest path selection verification
- Real-world DJ scenario examples
- Edge case handling

## Research References

The implementation is based on research of professional DJ software:

- **VirtualDJ**: Uses "closest path" algorithm for BPM matching
- **Traktor**: Automatically considers half/double BPM for large differences
- **Industry Standard**: Example cited in VirtualDJ forums: "140 BPM syncing with 80 BPM → closest path is 70 BPM (half-time)"

## Troubleshooting

### Sync not working as expected?

1. **Check tolerance settings**: Default is ±10 BPM for direct, ±5 BPM for half/double-time
2. **Verify both tracks are loaded**: Sync requires both decks to have tracks loaded
3. **Check BPM values**: Ensure original BPM is correctly set for each track
4. **Review console logs**: The sync function logs detailed information about calculations

### Why is my sync choosing an unexpected type?

The algorithm always chooses the "closest path" (smallest adjustment). If you expect direct sync but get half-time, it means the half-time target is mathematically closer to the current BPM.

Example:
- Master: 128 BPM
- Slave: 62 BPM
- Direct would adjust to 128 (66 BPM change)
- Half-time would adjust to 64 (2 BPM change) ← Chosen

## Future Enhancements

Potential improvements for future versions:

1. **Beatgrid alignment**: Not just BPM matching but also phase alignment
2. **Musical time signatures**: Handle 3/4, 5/4, 7/8 time signatures
3. **Genre-aware sync**: Different rules for house, techno, hip-hop, etc.
4. **Key-aware sync**: Consider harmonic compatibility in sync decisions
5. **Manual override**: Allow DJs to force a specific sync type
