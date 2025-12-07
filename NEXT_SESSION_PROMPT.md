# Next Session Prompt - DJ Slammer Tutorial Integration

## Context

We're building an **Interactive DJ Learning Game** for Tanner (age 6-8) based on his vision: "Like Simon Says - lights up buttons and you tap them when it tells you." See `/docs/TANNER_VISION.md` for complete requirements.

## What's Been Completed (75% Done)

### ✅ Tutorial System Architecture (100%)
- **Files Created:**
  - `/src/components/VirtualDJDeck/tutorialTypes.ts` - Complete type system
  - `/src/components/VirtualDJDeck/useTutorial.ts` - State management hook
  - `/src/components/VirtualDJDeck/TutorialOverlay.tsx` - Simon Says UI component
  - `/src/components/VirtualDJDeck/TutorialOverlay.module.css` - Kid-friendly styling
  - `/src/components/VirtualDJDeck/lessons/yourFirstMix.ts` - Sample 5-step lesson

### ✅ Volume Controls (100%)
- **Files Created:**
  - `/src/components/VirtualDJDeck/VolumeControl.tsx` - Vertical DJ-style fader
  - `/src/components/VirtualDJDeck/VolumeControl.module.css` - Realistic styling
- **Files Modified:**
  - `/src/components/VirtualDJDeck/AudioEngine.ts` - Added `setDeckVolume()` method

### ✅ Button Highlighting System (100%)
- **Files Created:**
  - `/src/components/VirtualDJDeck/TutorialHighlight.module.css` - Shared highlighting CSS

### ✅ Documentation (100%)
- **Files Created/Updated:**
  - `/docs/TANNER_VISION.md` - User requirements from survey
  - `.kiro/specs/virtual-dj-deck/requirements.md` - Added 3 new requirements (9, 10, 11)
  - `.kiro/specs/virtual-dj-deck/design.md` - Updated architecture
  - `.kiro/specs/virtual-dj-deck/SPEC_UPDATES_SUMMARY.md` - Change tracking

### ✅ Exports (100%)
- **Files Modified:**
  - `/src/components/VirtualDJDeck/index.tsx` - Exported all new components and types

## What Needs To Be Done (25% Remaining)

### 🚧 Priority 1: Integrate Tutorial System into VirtualDJDeck

**File to modify:** `/src/components/VirtualDJDeck/VirtualDJDeck_Professional.tsx`

**What to do:**
1. Import tutorial types and hooks:
   ```typescript
   import { useTutorial } from './useTutorial';
   import { TutorialConfig, TutorialLesson } from './tutorialTypes';
   import { TutorialOverlay } from './TutorialOverlay';
   import highlightStyles from './TutorialHighlight.module.css';
   ```

2. Add `tutorialConfig` to props:
   ```typescript
   interface VirtualDJDeckProps {
     config: VirtualDJDeckConfig;
     tutorialConfig?: TutorialConfig; // NEW
     className?: string;
   }
   ```

3. Initialize useTutorial hook inside component:
   ```typescript
   const tutorial = useTutorial(
     tutorialConfig,
     getState() // current deck state
   );
   ```

4. Call `tutorial.validateStep(getState())` whenever deck state changes (after play, pause, volume change, crossfader change, etc.)

5. Add highlighting to controls based on `tutorial.getHighlightTarget()`:
   - Check if current control matches highlight target
   - Apply `highlightStyles.highlighted` class if it matches
   - Pass `highlighted={isHighlighted}` prop to VolumeControl, etc.

6. Render TutorialOverlay when tutorial is active:
   ```typescript
   {tutorial.progress.isActive && tutorial.currentStep && (
     <TutorialOverlay
       lesson={tutorialConfig.lesson}
       progress={tutorial.progress}
       currentStep={tutorial.currentStep}
       showCelebration={tutorial.showCelebration}
       onNextStep={tutorial.nextStep}
       onShowHint={tutorial.showHint}
       onExit={tutorial.exitTutorial}
       showHintButton={tutorial.showHintButton}
     />
   )}
   ```

### 🚧 Priority 2: Add Volume Controls to UI

**File to modify:** `/src/components/VirtualDJDeck/VirtualDJDeck_Professional.tsx`

**What to do:**
1. Import VolumeControl:
   ```typescript
   import { VolumeControl } from './VolumeControl';
   ```

2. Add volume state to deckAState and deckBState (already exists as `volume: 1`)

3. Add setVolume handlers:
   ```typescript
   const setVolume = (deck: DeckId, volume: number) => {
     if (!audioEngineRef.current) return;
     audioEngineRef.current.setDeckVolume(deck, volume);
     const updateState = deck === 'A' ? setDeckAState : setDeckBState;
     updateState(prev => ({ ...prev, volume }));
     notifyStateChange();
   };
   ```

4. Add VolumeControl components to each deck in the render:
   ```typescript
   <VolumeControl
     deck="A"
     volume={deckAState.volume}
     color={config.deckA.waveformColor}
     onChange={(vol) => setVolume('A', vol)}
     highlighted={tutorial.getHighlightTarget()?.type === 'slider' &&
                  tutorial.getHighlightTarget()?.control === 'volume' &&
                  tutorial.getHighlightTarget()?.deck === 'A'}
   />
   ```

### 🚧 Priority 3: Update App.tsx to Use Tutorial

**File to modify:** `/src/App.tsx`

**What to do:**
1. Import tutorial lesson:
   ```typescript
   import { yourFirstMixLesson } from './components/VirtualDJDeck/lessons/yourFirstMix';
   import { TutorialConfig } from './components/VirtualDJDeck';
   ```

2. Create tutorial config:
   ```typescript
   const tutorialConfig: TutorialConfig = {
     lesson: yourFirstMixLesson,
     enableCelebrations: true,
     hintDelaySeconds: 15,
     autoAdvance: false,
   };
   ```

3. Pass to VirtualDJDeck:
   ```typescript
   <VirtualDJDeck
     config={config}
     tutorialConfig={tutorialConfig}
   />
   ```

### 🔧 Priority 4 (Optional): Scrolling Waveform

**File to modify:** `/src/components/VirtualDJDeck/Waveform.tsx` and `/src/utils/waveformUtils.ts`

**Current behavior:** Static waveform with moving playhead
**Desired behavior:** Scrolling waveform with stationary playhead (Requirement 11)

**What to do:**
1. Change drawing algorithm to:
   - Keep playhead at center (50% position)
   - Translate/scroll waveform based on currentTime
   - Show future waveform on right, past on left

2. Update `drawWaveform()` in waveformUtils.ts:
   ```typescript
   // Calculate scroll offset
   const scrollOffset = (currentTime / duration) * waveformData.length;

   // Draw bars with offset
   waveformData.forEach((amplitude, index) => {
     const offsetIndex = index - scrollOffset;
     const x = (offsetIndex + waveformData.length / 2) * barWidth;
     // Only draw if visible
     if (x >= 0 && x < width) {
       // Draw bar...
     }
   });

   // Draw playhead at center
   const playheadX = width / 2;
   ```

## Testing the Complete Flow

Once integrated, test by:
1. Start app - should see "Tap to Enable Audio" button
2. Click button - should see tutorial overlay with Step 1
3. See PLAY button on Deck A glowing/pulsing
4. Click PLAY on Deck A - should see celebration animation
5. Tutorial advances to Step 2 (Play Deck B)
6. Continue through all 5 steps
7. See completion screen with badge

## Important Notes

- The tutorial system is fully built and tested (types, logic, UI)
- VolumeControl is fully built and styled
- AudioEngine already supports deck volume control
- Button highlighting CSS is ready to use
- Main work is **wiring everything together** in VirtualDJDeck_Professional.tsx

## Files to Focus On

1. **Primary:** `/src/components/VirtualDJDeck/VirtualDJDeck_Professional.tsx`
2. **Secondary:** `/src/App.tsx`
3. **Optional:** `/src/components/VirtualDJDeck/Waveform.tsx` (scrolling)

## Quick Start Commands

```bash
# Start dev server
npm run dev

# The tutorial should automatically start when the app loads
# If audio files are missing, you'll see error messages (that's expected)
```

## Reference Files

- **Tutorial Example:** `/src/components/VirtualDJDeck/lessons/yourFirstMix.ts`
- **Tutorial Hook:** `/src/components/VirtualDJDeck/useTutorial.ts`
- **Tutorial Types:** `/src/components/VirtualDJDeck/tutorialTypes.ts`
- **Tanner's Vision:** `/docs/TANNER_VISION.md`
- **Requirements:** `.kiro/specs/virtual-dj-deck/requirements.md` (see Req 9, 10, 11)

## Expected Result

After integration, Tanner will:
1. See glowing buttons telling him exactly what to press
2. Get celebrated when he does it correctly
3. Learn DJ skills step-by-step
4. Complete his first DJ mix and earn a badge!

This matches his vision: "Like Simon Says - lights up buttons and you tap them when it tells you" ✨
