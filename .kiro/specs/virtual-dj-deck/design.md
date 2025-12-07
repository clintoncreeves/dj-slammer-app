# Virtual DJ Deck - Design Document

## Overview

The Virtual DJ Deck is a browser-based **Professional DJ Training Application** that teaches real DJ skills to children (ages 6-8) through engaging, step-by-step tutorials. Based on Tanner's vision (see `/docs/TANNER_VISION.md` and `/docs/PROJECT_PLAN.md`), the app combines:

1. **Professional DJ Software Aesthetics**: Interface inspired by Serato, Rekordbox, and Pioneer equipment - NOT a toy or baby app
2. **Guitar Hero-Style Tutorial Patterns**: BOLD, UNMISSABLE instructions with professional visual guidance
3. **Real Skill Transfer**: Teaches techniques that work on actual DJ equipment
4. **Serato Practice Mode**: Free play mode for experimentation after learning

**CRITICAL DESIGN PRINCIPLE:** Tanner is "about to buy pioneer equipment" - this must feel like professional DJ training software made accessible, not a children's toy.

**Key Design References:**
- **Aesthetic:** Serato, Rekordbox, Mixxx (professional DJ software)
- **Tutorial Pattern:** Guitar Hero note highway, Yousician lessons
- **Learning Model:** Serato Practice Mode

This MVP implementation will support:
- Professional dual-deck DJ interface with real equipment aesthetics
- Enhanced tutorial instruction panel (Guitar Hero-inspired)
- Professional control highlighting system (glowing like real DJ gear)
- Lesson selection screen with progress tracking
- Professional celebration system using DJ terminology
- Practice Mode for free exploration

## Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     App/Tutorial Parent                         │
│                   (Lesson Orchestrator)                        │
└───────────────────┬───────────────────┬────────────────────────┘
                    │                   │
        ┌───────────▼──────────┐        │
        │  TutorialOverlay     │        │ Lesson Config
        │  - Instructions      │        │ & State Updates
        │  - Celebrations      │        │
        │  - Progress Bar      │        │
        │  - Hint System       │        │
        └──────────────────────┘        │
                    │                   │
                    │ Highlight Target  │
                    │                   │
┌───────────────────▼───────────────────▼────────────────────────┐
│              Virtual DJ Deck Component                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           UI Layer (React Components)                   │  │
│  │  - Deck Controls (Play/Pause/Cue) with highlighting    │  │
│  │  - Volume Faders (NEW)                                  │  │
│  │  - Tempo Sliders                                        │  │
│  │  - Crossfader                                           │  │
│  │  - Waveform Visualization (scrolling - NEW)            │  │
│  │  - BPM Display                                          │  │
│  └───────────────────┬─────────────────────────────────────┘  │
│                      │                                          │
│                      │ State Updates & Actions                 │
│                      │                                          │
│  ┌───────────────────▼─────────────────────────────────────┐  │
│  │        Tutorial State Manager (useTutorial hook)        │  │
│  │  - Step Validation                                      │  │
│  │  - Progress Tracking                                    │  │
│  │  - Hint Timing                                          │  │
│  │  - Celebration Triggers                                 │  │
│  └───────────────────┬─────────────────────────────────────┘  │
│                      │                                          │
│  ┌───────────────────▼─────────────────────────────────────┐  │
│  │           Audio Engine (Tone.js)                        │  │
│  │  - Audio Context Management                             │  │
│  │  - Player Instances (2 decks)                          │  │
│  │  - Tempo Control (playbackRate)                        │  │
│  │  - Deck Volume/Gain Nodes (NEW)                        │  │
│  │  - Crossfader Logic                                    │  │
│  └───────────────────┬─────────────────────────────────────┘  │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                       │ Web Audio API
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  Browser Audio System                            │
│            (AudioContext, AudioBuffer, GainNodes, etc.)         │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Audio Library**: Tone.js (v14+)
  - Rationale: Built on Web Audio API, excellent timing precision, supports tempo adjustment without pitch shifting, active maintenance, ~50KB gzipped
- **UI Framework**: React (already in use for potential future expansion) or Vanilla JS (for minimal bundle size)
- **State Management**: React hooks (useState, useEffect, useRef) or plain JavaScript class
- **Visualization**: Canvas API for waveform rendering
- **Styling**: CSS-in-JS or CSS modules matching DJ Slammer design system

## Components and Interfaces

### Component Hierarchy

```
App
├── LessonSelectionScreen (NEW - Pre-deck lesson chooser)
│   ├── LessonCard (multiple instances)
│   ├── PracticeModeCard
│   └── ProgressTracker
│
├── TutorialInstructionPanel (NEW - Guitar Hero-style instructions)
│   ├── StepCounter ("STEP 2 OF 7")
│   ├── InstructionText (large, bold)
│   ├── ProgressIndicator (dots or bar)
│   └── AnimatedArrow (points to control)
│
└── VirtualDJDeck
    ├── TutorialManager (useTutorial hook - ENHANCED)
    ├── ProfessionalCelebration (NEW - Skill Unlocked screen)
    ├── DeckControls (x2 - one per deck)
    │   ├── PlayButton (with ENHANCED professional highlighting)
    │   ├── PauseButton (with ENHANCED professional highlighting)
    │   ├── CueButton (with ENHANCED professional highlighting)
    │   ├── VolumeSlider (NEW - vertical fader with highlighting)
    │   └── TempoSlider (with ENHANCED professional highlighting)
    ├── Waveform (x2 - one per deck - scrolling like Serato)
    ├── BPMDisplay (x2 - one per deck - professional styling)
    ├── Crossfader (with ENHANCED professional highlighting)
    └── AudioEngine (singleton - with deck volume + DJ sound effects)
```

### Core Component: VirtualDJDeck

**Props/Configuration:**
```typescript
interface VirtualDJDeckConfig {
  deckA: {
    trackUrl: string; // URL to audio file (HTTP URL or blob URL from file upload)
    initialBPM: number;
    cuePoint: number; // in seconds
    waveformColor: string;
  };
  deckB: {
    trackUrl: string; // URL to audio file (HTTP URL or blob URL from file upload)
    initialBPM: number;
    cuePoint: number;
    waveformColor: string;
  };
  onStateChange?: (state: DeckState) => void;
  onError?: (error: Error) => void;
}

// For MVP: Tracks will be pre-loaded demo files hosted on the server
// Future: Support file upload via File API and createObjectURL()
```

interface DeckState {
  deckA: {
    isPlaying: boolean;
    currentTime: number;
    bpm: number;
    volume: number;
  };
  deckB: {
    isPlaying: boolean;
    currentTime: number;
    bpm: number;
    volume: number;
  };
  crossfaderPosition: number; // -1 (full A) to 1 (full B)
}
```

**Public API:**
```typescript
class VirtualDJDeck {
  // Initialization
  constructor(config: VirtualDJDeckConfig)
  async init(): Promise<void>
  
  // Playback control
  playDeck(deck: 'A' | 'B'): void
  pauseDeck(deck: 'A' | 'B'): void
  cueDeck(deck: 'A' | 'B'): void
  
  // Tempo control
  setBPM(deck: 'A' | 'B', bpm: number): void
  
  // Mixing control
  setCrossfader(position: number): void // -1 to 1
  
  // State access
  getState(): DeckState
  
  // Cleanup
  destroy(): void
}
```

### AudioEngine Class

**Responsibilities:**
- Initialize and manage Tone.js Audio Context
- Load audio files into buffers
- Create and manage Player instances for each deck
- Handle tempo adjustment via playbackRate
- Manage volume/gain nodes for crossfading
- Provide precise timing information

**Implementation Details:**
```typescript
class AudioEngine {
  private context: Tone.Context;
  private players: {
    A: Tone.Player;
    B: Tone.Player;
  };
  private gains: {
    A: Tone.Gain;
    B: Tone.Gain;
  };
  private crossfader: Tone.CrossFade;
  
  async init(): Promise<void> {
    // Start Tone.js context
    await Tone.start();
    
    // Create players with low-latency settings
    this.players.A = new Tone.Player({
      fadeIn: 0,
      fadeOut: 0,
    }).toDestination();
    
    this.players.B = new Tone.Player({
      fadeIn: 0,
      fadeOut: 0,
    }).toDestination();
    
    // Set up crossfader
    this.crossfader = new Tone.CrossFade(0.5);
    this.players.A.connect(this.crossfader.a);
    this.players.B.connect(this.crossfader.b);
    this.crossfader.toDestination();
  }
  
  async loadTrack(deck: 'A' | 'B', url: string): Promise<void> {
    await this.players[deck].load(url);
  }
  
  play(deck: 'A' | 'B'): void {
    this.players[deck].start();
  }
  
  pause(deck: 'A' | 'B'): void {
    this.players[deck].stop();
  }
  
  seek(deck: 'A' | 'B', time: number): void {
    this.players[deck].seek(time);
  }
  
  setPlaybackRate(deck: 'A' | 'B', rate: number): void {
    // rate = newBPM / originalBPM
    this.players[deck].playbackRate = rate;
  }
  
  setCrossfade(position: number): void {
    // position: -1 (full A) to 1 (full B)
    // Convert to 0-1 range for Tone.CrossFade
    this.crossfader.fade.value = (position + 1) / 2;
  }
}
```

### UI Components

#### DeckControls Component

**Visual Design:**
- Large, touch-friendly buttons (60x60px minimum)
- Neon glow effects on hover/active states
- Immediate visual feedback (scale animation, color change)
- BPM display with real-time updates
- Tempo slider with visual markers

**Interaction States:**
- Default: Subtle glow, ready to interact
- Hover: Increased glow, slight scale (1.05x)
- Active/Playing: Pulsing animation, bright neon color
- Disabled: Dimmed, no interaction

#### Waveform Component

**Implementation:**
- Canvas-based rendering for performance
- Pre-computed waveform data from audio buffer
- Animated playhead showing current position
- Color-coded by deck (cyan for A, magenta for B)
- Updates at 60fps when playing

**Waveform Generation:**
```typescript
function generateWaveformData(audioBuffer: AudioBuffer, samples: number = 200): number[] {
  const rawData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(rawData.length / samples);
  const waveformData: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(rawData[i * blockSize + j]);
    }
    waveformData.push(sum / blockSize);
  }
  
  return waveformData;
}
```

#### Crossfader Component

**Visual Design:**
- Horizontal slider spanning both decks
- Visual indicators for A (left), Center, B (right)
- Smooth drag interaction with momentum
- Color gradient showing mix ratio (cyan → white → magenta)

**Interaction:**
- Mouse drag or touch drag
- Keyboard arrows for accessibility
- Snap to center option
- Visual feedback showing current mix

### NEW COMPONENTS (Professional DJ Training System)

#### TutorialInstructionPanel Component

**Purpose:** Provide BOLD, UNMISSABLE instructions in a Guitar Hero-style panel

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2 OF 7                                        ●●○○○○○     │
│  Press PLAY on Deck A to start the beat!                       │
│     ↓↓↓ [Animated arrow pointing down]                         │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
interface TutorialInstructionPanelProps {
  stepNumber: number;
  totalSteps: number;
  instruction: string;
  targetControl?: {
    type: 'button' | 'slider' | 'crossfader';
    deck?: 'A' | 'B';
    control: string;
  };
}
```

**Styling Requirements:**
- **Position:** Fixed at top of viewport, z-index 1000
- **Background:** Dark gray (#2A2A2A) with 95% opacity
- **Border:** Bottom border 2px solid neon cyan (#00F0FF)
- **Typography:**
  - Step counter: 14px bold, light gray (#CCCCCC)
  - Instruction: 20px bold, white (#FFFFFF), professional sans-serif (Inter or Space Grotesk)
  - Line height: 1.4
- **Progress Dots:** 8px circles, active = neon cyan, inactive = dark gray
- **Padding:** 16px vertical, 24px horizontal
- **Animation:** Fade in/out 200ms, slide up slightly on step change

**Animated Arrow:**
- SVG-based arrow that pulses and points to target control
- Color matches target deck (cyan for A, magenta for B)
- Opacity pulses 50% → 100% over 1 second
- Positioned absolutely to point at highlighted control

#### Professional Highlighting System

**Purpose:** Make highlighted controls GLOW and PULSE like real DJ equipment

**CSS Implementation:**
```css
.highlighted {
  position: relative;
  z-index: 100;
  animation: professionalPulse 1.5s ease-in-out infinite;
  filter: drop-shadow(0 0 30px var(--glow-color));
  transform: scale(1.08);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes professionalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Deck-specific glow colors */
.highlighted[data-deck="A"] {
  --glow-color: #00F0FF; /* Neon cyan */
}

.highlighted[data-deck="B"] {
  --glow-color: #FF006E; /* Neon magenta */
}

.highlighted[data-control="crossfader"] {
  --glow-color: #FFFFFF; /* White */
}

/* Additional visual effects */
.highlighted::before {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid var(--glow-color);
  border-radius: inherit;
  opacity: 0.6;
  animation: borderPulse 1.5s ease-in-out infinite;
}

@keyframes borderPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.05); opacity: 0.3; }
}
```

**Audio Cues:**
```typescript
class DJSoundEffects {
  private chirp: Tone.Player; // Professional DJ chirp sound

  playHighlightCue() {
    // Subtle chirp when control is highlighted
    this.chirp.start();
  }

  playSuccessBeep() {
    // Satisfying beep when step completed
    // Similar to Serato's cue point sound
  }
}
```

#### LessonSelectionScreen Component

**Purpose:** Pre-deck interface for lesson selection and progress tracking

**Visual Design:**
```
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│                      DJ TRAINING                              │
│                   Choose Your Lesson                          │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  ✓ LESSON 1          │  │  LESSON 2            │        │
│  │  Basic Playback      │  │  Beatmatching        │        │
│  │  ─────────────       │  │  ─────────────       │        │
│  │  • Start/stop decks  │  │  • Sync BPM          │        │
│  │  • Cue points        │  │  • Smooth transitions│        │
│  │  • Volume control    │  │  • Timing            │        │
│  │                       │  │                       │        │
│  │  Duration: 5 min     │  │  Duration: 8 min     │        │
│  │  Level: Beginner     │  │  Level: Beginner     │        │
│  │                       │  │                       │        │
│  │  [COMPLETED]         │  │  [START LESSON]      │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │  🔒 LESSON 3         │  │  🎵 PRACTICE MODE    │        │
│  │  Advanced Mixing     │  │  Free Play           │        │
│  │  ─────────────       │  │  ─────────────       │        │
│  │  Complete Lesson 2   │  │  Experiment freely   │        │
│  │  to unlock           │  │  No guidance         │        │
│  │                       │  │  All controls active │        │
│  │  Duration: 12 min    │  │                       │        │
│  │  Level: Intermediate │  │  [FREE PLAY]         │        │
│  └──────────────────────┘  └──────────────────────┘        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
interface Lesson {
  id: string;
  number: number;
  title: string;
  description: string;
  skills: string[];
  duration: string; // "5 min"
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisite?: string; // Lesson ID
  completed: boolean;
  locked: boolean;
}

interface LessonSelectionScreenProps {
  lessons: Lesson[];
  onSelectLesson: (lessonId: string) => void;
  onStartPracticeMode: () => void;
}
```

**Styling Requirements:**
- **Layout:** CSS Grid, 2 columns on desktop, 1 column on mobile
- **Card Design:**
  - Background: Medium gray (#2A2A2A)
  - Border: 1px solid dark gray (#1A1A1A)
  - Border radius: 8px
  - Padding: 24px
  - Hover: Lift effect (translateY(-4px), drop-shadow)
- **Card States:**
  - Available: Full color, clickable
  - Completed: Green checkmark badge, "COMPLETED" button
  - Locked: Reduced opacity (40%), lock icon, disabled button
- **Typography:**
  - Title: 24px bold
  - Skills: 16px, bullet list
  - Metadata: 14px, light gray
- **Colors:**
  - Completed badge: Neon green (#00FF88)
  - Locked icon: Dark gray (#666)
  - Practice mode card: Neon cyan (#00F0FF) accent

#### ProfessionalCelebration Component

**Purpose:** Reward skill completion with professional "SKILL UNLOCKED" feedback

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                   ⚡ SKILL UNLOCKED ⚡                       │
│                                                              │
│                  Beatmatching Basics                        │
│                                                              │
│      You can now sync two tracks in rhythm like a pro!     │
│                                                              │
│                                                              │
│           [NEXT LESSON]      [PRACTICE MODE]               │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
interface ProfessionalCelebrationProps {
  skillName: string;
  skillDescription: string;
  onContinue: () => void;
  onPracticeMode: () => void;
}
```

**Visual Effects:**
- **Screen Flash:** Brief white flash (100ms) when celebration appears
- **Background:** Dark overlay with radial gradient (center brighter)
- **Typography:**
  - "SKILL UNLOCKED": 32px bold, neon cyan (#00F0FF)
  - Skill name: 28px bold, white
  - Description: 18px, light gray
- **Lightning Bolts:** Animated SVG lightning on either side of title
- **Fade In:** 400ms ease-out
- **Buttons:** Professional pill-shaped buttons with glow effects

**Audio:**
```typescript
celebrationSounds = {
  skillUnlocked: 'sounds/dj-scratch.mp3', // DJ scratch sound
  majorAchievement: 'sounds/air-horn.mp3', // Air horn
  stepComplete: 'sounds/perfect-mix.mp3' // Professional "ding"
};
```

**DJ Terminology Map:**
```typescript
const celebrationMessages = {
  stepComplete: [
    "NICE!",
    "PERFECT!",
    "SMOOTH!",
    "ON POINT!",
    "TIGHT MIX!"
  ],
  skillUnlocked: [
    "SKILL UNLOCKED",
    "LEVEL UP",
    "DJ SKILL ACQUIRED",
    "TECHNIQUE MASTERED"
  ],
  perfectExecution: [
    "PERFECT MIX",
    "FLAWLESS TRANSITION",
    "BEAT MATCHED",
    "SMOOTH BLEND"
  ]
};
```

## Professional Visual Design System

### Color Palette (Based on Professional DJ Equipment)

**Primary Colors:**
```css
:root {
  /* Deck Colors */
  --deck-a-primary: #00F0FF;    /* Neon Cyan - Like Pioneer blue */
  --deck-b-primary: #FF006E;    /* Neon Magenta - Like Serato accents */

  /* Backgrounds */
  --bg-dark: #1A1A1A;           /* Main background - Like Serato/Rekordbox */
  --bg-surface: #2A2A2A;        /* Control panels */
  --bg-elevated: #3A3A3A;       /* Raised elements */

  /* Text */
  --text-primary: #FFFFFF;      /* Primary text */
  --text-secondary: #CCCCCC;    /* Secondary text */
  --text-tertiary: #999999;     /* Tertiary text/disabled */

  /* Accents */
  --accent-success: #00FF88;    /* Success/completed */
  --accent-warning: #FFAA00;    /* Warning */
  --accent-error: #FF3366;      /* Error */

  /* Effects */
  --glow-cyan: 0 0 30px rgba(0, 240, 255, 0.5);
  --glow-magenta: 0 0 30px rgba(255, 0, 110, 0.5);
  --glow-white: 0 0 30px rgba(255, 255, 255, 0.5);
}
```

### Typography System

**Font Stack:**
```css
:root {
  --font-display: 'Space Grotesk', 'Inter', -apple-system, sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'Space Mono', 'JetBrains Mono', monospace;
}
```

**Type Scale:**
- Lesson titles: 32px bold
- Component headers: 24px bold
- Instructions: 20px bold
- Body text: 16px regular
- Metadata: 14px regular
- Tiny labels: 12px regular

**Professional DJ Typography Principles:**
- NO Comic Sans or playful fonts
- NO all-caps unless for emphasis (e.g., "SKILL UNLOCKED")
- Use geometric sans-serifs for modern, technical feel
- Monospace for BPM displays (mimics DJ equipment LCDs)

### Animation Principles

**Professional Timing:**
- Fast interactions: 150-200ms (button clicks, hover states)
- Medium transitions: 300-400ms (panel slides, fades)
- Slow animations: 600-800ms (celebrations, major state changes)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` for smooth, professional feel

**DO:**
- Use subtle scale transforms (1.05-1.1x max)
- Fade opacity for emphasis
- Smooth easing curves
- Pulsing glows like DJ equipment LEDs

**DON'T:**
- Bounce effects (too childish)
- Rotate or flip (too playful)
- Excessive movement
- Cartoon-like physics

## Data Models

### DeckState Model

```typescript
interface DeckState {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  
  // Tempo state
  originalBPM: number;
  currentBPM: number;
  playbackRate: number; // currentBPM / originalBPM
  
  // Audio state
  volume: number; // 0-1
  isLoaded: boolean;
  
  // Cue state
  cuePoint: number; // seconds
  
  // Visual state
  waveformData: number[];
}
```

### AudioEngineState Model

```typescript
interface AudioEngineState {
  isInitialized: boolean;
  contextState: 'suspended' | 'running' | 'closed';
  crossfaderPosition: number; // -1 to 1
  masterVolume: number; // 0-1
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Playback latency bounds

*For any* deck and any playback command (play, pause, cue), the time between user interaction and audio response should be less than 20 milliseconds

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Tempo adjustment preserves pitch

*For any* tempo adjustment within the range of 0.8x to 1.2x playback rate, the audio pitch should remain within 5 cents of the original pitch

**Validates: Requirements 2.2**

### Property 3: Crossfader volume curve is smooth

*For any* crossfader position change, the volume transition should follow a smooth curve without sudden jumps greater than 0.01 (1%) between consecutive samples

**Validates: Requirements 3.4**

### Property 4: Visual feedback is immediate

*For any* user interaction with a control, the visual state change should occur within one animation frame (16.67ms at 60fps)

**Validates: Requirements 1.4, 1.5, 6.3**

### Property 5: Waveform animation matches playback

*For any* playing deck, the waveform playhead position should match the actual audio playback position within 50ms

**Validates: Requirements 4.1, 4.4**

### Property 6: Multiple deck instances don't interfere

*For any* two Virtual DJ Deck instances running simultaneously, playback on one deck should not affect the audio timing or quality of the other deck

**Validates: Requirements 7.2**

### Property 7: Resource cleanup is complete

*For any* Virtual DJ Deck instance that is destroyed, all Audio Context resources (players, gain nodes, buffers) should be properly disconnected and garbage collected

**Validates: Requirements 7.3**

### Property 8: Touch targets meet accessibility standards

*For any* interactive control in the Virtual DJ Deck, the touch target size should be at least 44x44 pixels

**Validates: Requirements 6.1**

### Property 9: Tempo slider updates are continuous

*For any* tempo slider drag operation, BPM updates should occur continuously without gaps or stuttering in the audio playback

**Validates: Requirements 2.1, 2.5**

### Property 10: Audio buffer preloading is complete

*For any* track loaded into a deck, the entire audio file should be buffered before playback is enabled

**Validates: Requirements 5.2**

## Error Handling

### Audio Context Errors

**Scenario:** Browser blocks audio context (autoplay policy)
**Handling:** 
- Display user-friendly message: "Tap to enable audio"
- Provide large, obvious button to resume audio context
- Retry initialization after user gesture

**Scenario:** Audio context creation fails
**Handling:**
- Log detailed error to console
- Display error message with browser compatibility info
- Provide fallback message suggesting Chrome/Firefox

### Audio Loading Errors

**Scenario:** Track URL fails to load (404, network error)
**Handling:**
- Display loading error on affected deck
- Disable playback controls for that deck
- Emit error event to parent component
- Provide retry button

**Scenario:** Audio file format not supported
**Handling:**
- Detect format before loading
- Display format error message
- Suggest supported formats (MP3, WAV, OGG)

### Performance Errors

**Scenario:** Audio glitches/dropouts detected
**Handling:**
- Monitor audio callback timing
- Log performance warnings
- Reduce visual effects if needed
- Suggest closing other tabs

### User Interaction Errors

**Scenario:** Rapid button clicking causes state conflicts
**Handling:**
- Debounce button clicks (50ms)
- Disable buttons during state transitions
- Queue commands if necessary

## Testing Strategy

### Unit Testing

**Audio Engine Tests:**
- Test player initialization and cleanup
- Test tempo adjustment calculations
- Test crossfader volume curves
- Test cue point seeking
- Mock Tone.js for isolated testing

**Component Tests:**
- Test button state changes
- Test slider value updates
- Test waveform data generation
- Test event emission

### Property-Based Testing

The testing strategy will use **fast-check** (JavaScript property-based testing library) to verify the correctness properties defined above.

**Configuration:**
- Minimum 100 iterations per property test
- Use appropriate generators for audio parameters (BPM: 80-180, volume: 0-1, time: 0-duration)
- Tag each test with its corresponding property number

**Example Property Test Structure:**
```typescript
// Property 1: Playback latency bounds
test('Property 1: Playback latency bounds', () => {
  fc.assert(
    fc.property(
      fc.constantFrom('A', 'B'), // deck
      fc.constantFrom('play', 'pause', 'cue'), // command
      async (deck, command) => {
        const startTime = performance.now();
        await virtualDeck[command + 'Deck'](deck);
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        expect(latency).toBeLessThan(20);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**End-to-End Scenarios:**
- Load two tracks and play simultaneously
- Adjust tempo while playing
- Crossfade between tracks
- Cue and restart tracks
- Destroy and reinitialize component

**Browser Compatibility Testing:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

### Performance Testing

**Metrics to Monitor:**
- Audio callback timing (should be <10ms)
- Frame rate during playback (should maintain 60fps)
- Memory usage over time (check for leaks)
- CPU usage (should be <20% on modern devices)

**Load Testing:**
- Multiple deck instances (2-4)
- Long playback sessions (30+ minutes)
- Rapid control changes
- Background tab behavior

## Implementation Notes

### Audio Library Selection: Tone.js

**Rationale:**
- Built on Web Audio API with excellent abstractions
- Proven low-latency performance
- Built-in tempo adjustment without pitch shifting
- Precise timing and scheduling
- Active maintenance and community
- ~50KB gzipped (acceptable for our use case)
- Excellent documentation

**Alternative Considered:**
- **Howler.js**: Simpler API but less precise timing control
- **Web Audio API directly**: More control but requires more low-level code
- **Pizzicato.js**: Good effects but less suited for DJ applications

### Performance Optimizations

1. **Audio Buffer Preloading**: Load entire tracks into memory before playback
2. **Waveform Caching**: Generate waveform data once and cache
3. **Canvas Optimization**: Use requestAnimationFrame for smooth 60fps rendering
4. **Event Debouncing**: Prevent excessive state updates from slider drag
5. **Lazy Initialization**: Only create Audio Context on first user interaction

### Accessibility Considerations

1. **Keyboard Navigation**: All controls accessible via keyboard
2. **Screen Reader Support**: ARIA labels for all interactive elements
3. **High Contrast Mode**: Ensure visibility in high contrast settings
4. **Focus Indicators**: Clear visual focus states
5. **Touch Target Sizes**: Minimum 44x44px per WCAG guidelines

### Mobile Considerations

1. **Touch Events**: Support both mouse and touch events
2. **Viewport Scaling**: Responsive layout for various screen sizes
3. **Audio Context Resume**: Handle iOS audio context restrictions
4. **Performance**: Optimize for mobile CPU/GPU constraints
5. **Battery Usage**: Monitor and optimize power consumption

## Track Loading Strategy

### MVP Approach: Pre-loaded Demo Tracks

For the initial MVP, tracks will be pre-loaded demo files to keep the scope focused on the core DJ deck experience:

**Implementation:**
- Host 2-4 royalty-free music tracks on the server (in `/public/audio/`)
- Tutorial component passes track URLs to VirtualDJDeck config
- Tracks are carefully selected for beat mixing tutorial (similar BPM, clear beats)
- Include metadata file with BPM and suggested cue points

**Example:**
```typescript
const tutorialConfig = {
  deckA: {
    trackUrl: '/audio/demo-track-1.mp3',
    initialBPM: 120,
    cuePoint: 0,
    waveformColor: '#00F0FF'
  },
  deckB: {
    trackUrl: '/audio/demo-track-2.mp3',
    initialBPM: 122,
    cuePoint: 0,
    waveformColor: '#FF006E'
  }
};
```

### Future Enhancement: File Upload

Post-MVP, we can add file upload support:

**Implementation:**
```typescript
// File upload handler
async function handleFileUpload(file: File, deck: 'A' | 'B') {
  // Create blob URL for local file
  const blobUrl = URL.createObjectURL(file);
  
  // Detect BPM (using Web Audio API analysis or library)
  const bpm = await detectBPM(file);
  
  // Load into deck
  await virtualDeck.loadTrack(deck, {
    trackUrl: blobUrl,
    initialBPM: bpm,
    cuePoint: 0
  });
}
```

**Considerations:**
- File format validation (MP3, WAV, OGG)
- File size limits (recommend <10MB per track)
- BPM detection (use library like `web-audio-beat-detector`)
- Memory management (revoke blob URLs when done)
- Mobile storage constraints

## Future Enhancements (Post-MVP)

1. **File Upload Support**: Allow users to upload their own music files
2. **BPM Detection**: Automatically detect track BPM from uploaded files
3. **MIDI Controller Support**: Map physical DJ controller inputs
4. **Effects**: Add filters, reverb, echo
5. **Looping**: Support loop points and beat-synced loops
6. **Recording**: Capture and export mixes
7. **Beatmatching Assistance**: Visual beat alignment guides
8. **Multiple Cue Points**: Support multiple cue points per track
9. **Waveform Zoom**: Detailed waveform view for precise cueing
10. **Sync Button**: Auto-match BPM between decks
11. **EQ Controls**: 3-band equalizer per deck
12. **Sample Pads**: Trigger one-shot samples

## Dependencies

```json
{
  "dependencies": {
    "tone": "^14.7.77",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "fast-check": "^3.15.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "vitest": "^1.0.0"
  }
}
```

## File Structure

```
dj-slammer-app/
├── src/
│   ├── components/
│   │   ├── VirtualDJDeck/
│   │   │   ├── index.tsx                 # Main component
│   │   │   ├── VirtualDJDeck.tsx         # Component logic
│   │   │   ├── VirtualDJDeck.module.css  # Styles
│   │   │   ├── AudioEngine.ts            # Audio engine class
│   │   │   ├── DeckControls.tsx          # Playback controls
│   │   │   ├── Waveform.tsx              # Waveform visualization
│   │   │   ├── Crossfader.tsx            # Crossfader control
│   │   │   ├── BPMDisplay.tsx            # BPM indicator
│   │   │   └── types.ts                  # TypeScript interfaces
│   │   └── ...
│   ├── hooks/
│   │   ├── useAudioEngine.ts             # Audio engine hook
│   │   └── useWaveform.ts                # Waveform generation hook
│   ├── utils/
│   │   ├── audioUtils.ts                 # Audio helper functions
│   │   └── waveformUtils.ts              # Waveform generation
│   └── ...
├── tests/
│   ├── unit/
│   │   ├── AudioEngine.test.ts
│   │   ├── VirtualDJDeck.test.tsx
│   │   └── ...
│   ├── integration/
│   │   └── VirtualDJDeck.integration.test.tsx
│   └── properties/
│       └── VirtualDJDeck.properties.test.ts
└── ...
```
