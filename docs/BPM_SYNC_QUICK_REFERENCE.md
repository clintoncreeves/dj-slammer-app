# BPM Sync Quick Reference

## Quick Start

### 1. Use sync method in VirtualDJDeck
```typescript
const deckRef = useRef<VirtualDJDeckHandle>(null);

// Sync Deck B to Deck A
const result = deckRef.current?.syncBPM('B', 'A');
```

### 2. Sync Types
- **Direct** (⚡): BPMs within ±10 (e.g., 120 ↔ 115)
- **Half-Time** (½×): One track at half speed (e.g., 140 ↔ 70)
- **Double-Time** (2×): One track at double speed (e.g., 70 ↔ 140)

### 3. How it works
Algorithm chooses the sync method with **smallest BPM adjustment**:

```
Master: 140 BPM, Slave: 80 BPM
- Direct: 140 - 80 = 60 adjustment
- Half-time: 70 - 80 = 10 adjustment ✓ (chosen)
- Double-time: 280 - 80 = 200 adjustment
→ Result: Sync to 70 BPM (half-time)
```

## Common Scenarios

### Scenario 1: House Music (Direct Sync)
```typescript
// Track A: 128 BPM, Track B: 124 BPM
syncBPM('B', 'A');
// → Track B adjusts to 128 BPM (direct)
```

### Scenario 2: Hip-Hop to House (Half-Time)
```typescript
// Track A: 140 BPM, Track B: 68 BPM
syncBPM('B', 'A');
// → Track B adjusts to 70 BPM (half-time of 140)
```

### Scenario 3: Drum & Bass (Double-Time)
```typescript
// Track A: 87 BPM, Track B: 175 BPM
syncBPM('A', 'B');
// → Track A adjusts to 87.5 BPM (half-time of 175)
```

## Helper Functions

```typescript
import { canSync, isHalfTime, isDoubleTime } from './utils/bpmSync';

// Check if sync is possible
canSync(120, 115); // true (direct)
canSync(140, 70); // true (half-time)
canSync(70, 140); // true (double-time)
canSync(120, 80); // false (no match)

// Check specific types
isHalfTime(70, 140); // true
isDoubleTime(140, 70); // true
```

## Customization

```typescript
// Adjust tolerance values
const result = calculateBPMSync(
  masterBPM, 
  slaveBPM, 
  slaveOriginalBPM,
  {
    directTolerance: 15,   // ±15 BPM for direct
    timeTolerance: 3       // ±3 BPM for half/double
  }
);
```

## Sync Button Component

```typescript
import { SyncButton } from './components/VirtualDJDeck/SyncButton';

<SyncButton
  deck="B"
  canSync={bothDecksLoaded}
  onSync={handleSync}
  syncType={syncResult?.syncType}
  color="#9C27B0"
/>
```

## Testing

```bash
npm test -- bpmSync.test.ts
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Sync not working | Check both decks are loaded |
| Wrong sync type | Algorithm picks smallest adjustment |
| BPM not matching exactly | Check tolerance settings (default ±10/±5) |

## Return Value

```typescript
interface BPMSyncResult {
  targetBPM: number;        // Target BPM to sync to
  syncType: string;         // 'direct', 'half-time', or 'double-time'
  adjustment: number;       // BPM change amount
  playbackRate: number;     // Playback rate multiplier
}
```

## Resources

- Full documentation: `docs/BPM_SYNC_USAGE.md`
- Integration example: `docs/BPM_SYNC_INTEGRATION_EXAMPLE.tsx`
- Test suite: `src/utils/bpmSync.test.ts`
