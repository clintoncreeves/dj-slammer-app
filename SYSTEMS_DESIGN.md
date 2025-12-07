# DJ Slammer - Systems Design Document

**Version:** 1.0  
**Date:** December 7, 2025  
**Status:** Living Document

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Data Flow](#data-flow)
4. [Feature Implementation Tracking](#feature-implementation-tracking)
5. [Branch and Deployment Workflow](#branch-and-deployment-workflow)
6. [Technology Stack](#technology-stack)
7. [Design Patterns](#design-patterns)
8. [Future Scalability](#future-scalability)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application (Vite)                │
│                                                               │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Mode Selector  │  │  Kids Mode Demo │  │ Lesson Modes │ │
│  │    (App.tsx)    │  │  (KidsModeDemo) │  │  (Tutorial)  │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                    │                    │         │
│           └────────────────────┴────────────────────┘         │
│                              │                                │
│                    ┌─────────┴──────────┐                    │
│                    │   Shared Components │                    │
│                    └─────────┬──────────┘                    │
│                              │                                │
│        ┌─────────────────────┼─────────────────────┐        │
│        │                     │                     │          │
│  ┌─────▼──────┐   ┌─────────▼─────────┐   ┌──────▼──────┐ │
│  │   Audio     │   │  Visual Controls  │   │    Games    │ │
│  │   Engine    │   │   (Crossfader,    │   │  (Training) │ │
│  │             │   │  Volume, BPM)     │   │             │ │
│  └────────────┘   └───────────────────┘   └─────────────┘ │
│        │                                                      │
│        │                                                      │
│  ┌─────▼──────────────────────────────────────────────────┐ │
│  │         Web Audio API (Browser)                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                                │
         │                                │
    ┌────▼────┐                      ┌────▼─────┐
    │  Audio  │                      │  Track   │
    │  Files  │                      │ Metadata │
    │  (.mp3) │                      │  (.json) │
    └─────────┘                      └──────────┘
```

### Application Layers

#### 1. Presentation Layer
- **App.tsx**: Root component, mode switching
- **Mode Components**: KidsModeDemo, FirstLesson, TutorialLesson
- **Shared UI Components**: Buttons, sliders, displays

#### 2. Logic Layer
- **Hooks**: useAudioPlayer, useTutorial
- **Context**: DeckContext (state management)
- **Utilities**: audioUtils, bpmSync, harmonicMixing

#### 3. Audio Layer
- **AudioEngine**: Tone.js integration
- **Web Audio API**: Browser audio processing
- **Audio Files**: Static assets (public/audio/)

---

## Component Structure

### Primary Components

#### App.tsx (Root)
```typescript
Purpose: Application entry point and mode switcher
State: demoMode ('slammer' | 'simple-lesson' | 'pro-lesson')
Children: KidsModeDemo, FirstLesson, TutorialLesson
Responsibilities:
  - Mode selection UI
  - Routing between demo modes
  - Fixed positioning of mode switcher
```

#### KidsModeDemo.tsx (Slammer Mode)
```typescript
Purpose: Kid-friendly DJ experience
State:
  - allTracks: TrackMetadata[]
  - selectedTrackA/B: TrackMetadata
  - crossfaderPosition: number (-1 to 1)
  - showSpeedMatcher: boolean
  - loading: boolean
  
Components Used:
  - TrackInfo (track display)
  - CharacterCrossfader (mix control)
  - SpeedMatcher (BPM game)
  
Hooks Used:
  - useAudioPlayer (audio playback)
  
Features:
  ✅ Deck A/B track selection
  ✅ Play/pause controls
  ✅ Crossfader mixing
  ❌ Individual volume controls (NOT IMPLEMENTED)
  ✅ BPM sync training game
  ✅ DJ terminology
```

#### VirtualDJDeck_Professional.tsx
```typescript
Purpose: Full-featured DJ deck for lessons
State: Managed via DeckContext
Components:
  - VolumeControl (per-deck volume)
  - Crossfader (audio mixing)
  - TempoSlider (BPM adjustment)
  - SyncButton (BPM matching)
  - BPMDisplay (tempo info)
  - Waveform (visual feedback)
  
Features:
  ✅ Professional DJ controls
  ✅ Tutorial integration
  ✅ Complete volume control
  ✅ BPM sync system
```

### Shared Components

#### CharacterCrossfader.tsx
```typescript
Purpose: Kid-friendly crossfader with character animations
Props:
  - position: number (-1 to 1)
  - onPositionChange: (pos: number) => void
  - leftLabel: string
  - rightLabel: string
  
Visual Features:
  - DJ Dog (left) / DJ Cat (right) characters
  - Character size scales with position
  - Opacity changes show active deck
  - Musical note particles
  - Playing indicators
  - Center position marker
  
Algorithm:
  - Left scale: 0.5 + (1 - (pos+1)/2) * 0.5
  - Right scale: 0.5 + ((pos+1)/2) * 0.5
  - Opacities follow same formula (0.3 to 1.0 range)
```

#### VolumeControl.tsx
```typescript
Purpose: Professional vertical volume fader
Props:
  - deck: DeckId
  - volume: number (0-1)
  - color: string
  - onChange: (vol: number) => void
  - highlighted: boolean (tutorial mode)
  
Visual Features:
  - Vertical slider (professional aesthetic)
  - Volume level indicator with color
  - Percentage markers (0, 25, 50, 75, 100)
  - Current volume percentage display
  - ARIA accessibility labels
```

### Hooks

#### useAudioPlayer.ts
```typescript
Purpose: Manage dual-deck audio playback
Props:
  - trackAUrl?: string
  - trackBUrl?: string
  - crossfaderPosition: number
  - onError?: (error: Error) => void
  
State:
  - audioARef: HTMLAudioElement
  - audioBRef: HTMLAudioElement
  - isPlayingA/B: boolean
  - hasStarted: boolean (user gesture requirement)
  
Returns:
  - playA, pauseA, togglePlayA
  - playB, pauseB, togglePlayB
  - stopAll
  - isPlayingA/B, isLoading, hasStarted, start
  
Features:
  ✅ Crossfader volume control
  ✅ Track switching without stopping playback
  ✅ Loop mode
  ❌ Individual volume control (NEEDS IMPLEMENTATION)
  
Volume Calculation:
  - Uses calculateCrossfaderVolumes(position)
  - Equal-power crossfade curve
  - Max volume: 80% (prevents clipping)
```

#### useTutorial.ts
```typescript
Purpose: Manage interactive tutorial system
State:
  - currentStep: number
  - isActive: boolean
  - highlightedElement: string
  - completed: boolean
  
Features:
  - Step progression
  - Element highlighting
  - Instructions display
  - Completion tracking
```

### Utility Functions

#### audioUtils.ts
```typescript
Functions:
  1. calculatePlaybackRate(currentBPM, originalBPM): number
     - Converts BPM to playback rate multiplier
     
  2. calculateBPM(playbackRate, originalBPM): number
     - Reverse calculation
     
  3. formatTime(seconds): string
     - Returns "MM:SS" format
     
  4. calculateCrossfaderVolumes(position): {volumeA, volumeB}
     - Equal-power crossfade
     - Algorithm: cos/sin curves (constant power)
     - Position -1: volumeA=1, volumeB=0
     - Position 0: volumeA=0.707, volumeB=0.707
     - Position 1: volumeA=0, volumeB=1
     
  5. clamp(value, min, max): number
     - Bounds checking
     
  6. lerp(start, end, t): number
     - Linear interpolation
```

---

## Data Flow

### Audio Playback Flow

```
User Action (Click Play)
    ↓
KidsModeDemo.togglePlayA()
    ↓
useAudioPlayer.playA()
    ↓
audioARef.current.play()
    ↓
Browser Web Audio API
    ↓
Audio Output
```

### Crossfader Flow

```
User Drags Crossfader
    ↓
CharacterCrossfader.handleSliderChange()
    ↓
onPositionChange(newPosition)
    ↓
KidsModeDemo.setCrossfaderPosition()
    ↓
useAudioPlayer receives new position
    ↓
Effect hook triggers: lines 126-139
    ↓
calculateCrossfaderVolumes(position)
    ↓
audioARef.current.volume = volumeA * 0.8
audioBRef.current.volume = volumeB * 0.8
    ↓
Audio mix updated in real-time
```

### Track Selection Flow

```
User Clicks Track Button
    ↓
KidsModeDemo.setSelectedTrackA(track)
    ↓
State updates: selectedTrackA
    ↓
useAudioPlayer receives trackAUrl (via props)
    ↓
Effect hook triggers: lines 93-106
    ↓
audioARef.current.src = trackAUrl
audioARef.current.currentTime = 0
    ↓
If was playing, restart playback
```

---

## Feature Implementation Tracking

### Implemented Features ✅

| Feature | Component | Status | Notes |
|---------|-----------|--------|-------|
| Dual Deck Playback | useAudioPlayer | ✅ Complete | Works in all modes |
| Crossfader | CharacterCrossfader + useAudioPlayer | ✅ Complete | Equal-power curve |
| Track Selection | KidsModeDemo | ✅ Complete | 12 tracks available |
| BPM Display | BPMDisplay | ✅ Complete | Shows current tempo |
| BPM Sync Game | SpeedMatcher | ✅ Complete | Training mode |
| DJ Terminology | All components | ✅ Complete | Professional language |
| Tutorial System | useTutorial | ✅ Complete | Interactive lessons |
| Professional Volume Control | VolumeControl | ✅ Complete | Not in Slammer Mode |
| Track Metadata | TrackInfo | ✅ Complete | Key, BPM, title, artist |
| Audio Start Gate | useAudioPlayer | ✅ Complete | User gesture required |

### Missing Features ⚠️

| Feature | Target Component | Priority | Complexity |
|---------|-----------------|----------|------------|
| Individual Volume Controls (Slammer Mode) | KidsModeDemo | 🔴 High | Medium |
| Per-Deck Volume State | useAudioPlayer | 🔴 High | Low |
| Volume Control UI (Kid-Friendly) | New component | 🔴 High | Medium |
| Visual Volume Indicators | KidsModeDemo | 🟡 Medium | Low |

### Planned Features 🔮

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Key Harmony Wheel | Visual harmonic mixing guide | 🟡 Medium | Planned |
| Beat Drop Trainer | Timing practice game | 🟡 Medium | Planned |
| Progress Tracking | User progress database | 🟢 Low | Future |
| Custom Playlists | User track organization | 🟢 Low | Future |
| Recording/Export | Mix recording feature | 🟢 Low | Future |

---

## Branch and Deployment Workflow

### Branch Strategy

```
main (production)
  ├── feature/new-feature (feature branches)
  ├── fix/bug-description (bug fixes)
  └── docs/documentation-update (doc changes)
```

#### Branch Naming Convention
- **Features**: `feature/descriptive-name`
- **Fixes**: `fix/issue-description`
- **Docs**: `docs/what-changed`
- **Experimental**: `experiment/idea-name`

### Git Workflow

#### 1. Development
```bash
# Create feature branch
git checkout -b feature/volume-controls

# Make changes
git add src/components/...
git commit -m "Add individual volume controls to Slammer Mode"

# Push to remote
git push origin feature/volume-controls
```

#### 2. Pull Request
```bash
# Create PR on GitHub
# Title: "Add volume controls to Slammer Mode"
# Description: What changed, why, how to test

# After review, merge to main
# Delete feature branch
```

#### 3. Deployment
```bash
# Automatic on merge to main
# Vercel detects push → builds → deploys

# Manual deployment (if needed)
git push origin main

# Check deployment status
# https://vercel.com/clinton-reeves-projects/dj-slammer-app
```

### Deployment Pipeline

```
Local Development
    ↓
git commit
    ↓
git push origin main
    ↓
GitHub receives push
    ↓
Vercel webhook triggered
    ↓
Vercel clones repository
    ↓
npm install (dependencies)
    ↓
npm run build
    ├─ TypeScript compilation (tsc)
    └─ Vite build (production bundle)
    ↓
Build artifacts → dist/
    ├─ index.html
    ├─ assets/index-[hash].js
    └─ assets/index-[hash].css
    ↓
Deploy to Vercel CDN
    ↓
Production URL updated
    ↓
https://dj-slammer-app-clinton-reeves-projects.vercel.app
```

### Environment-Specific Configs

| Environment | Branch | URL | Auto-Deploy |
|------------|--------|-----|-------------|
| Production | main | dj-slammer-app-clinton-reeves-projects.vercel.app | Yes |
| Preview | feature/* | dj-slammer-app-git-{branch}-....vercel.app | Yes (per PR) |
| Local | any | localhost:5173 | Manual (npm run dev) |

---

## Technology Stack

### Frontend Framework
- **React 18.2.0**: Component-based UI
- **TypeScript 5.3.3**: Type safety
- **Vite 5.0.8**: Build tool and dev server

### Audio Processing
- **Tone.js 14.7.77**: Web Audio API wrapper
- **Web Audio API**: Browser native audio
- **HTML5 Audio**: Fallback for simple playback

### Styling
- **CSS Modules**: Component-scoped styles
- **Inline Styles**: Dynamic styling (React CSSProperties)

### Build & Development
- **npm**: Package manager
- **ESLint**: Code linting
- **Vitest**: Unit testing
- **TypeScript**: Compilation and type checking

### Deployment
- **Vercel**: Hosting and CDN
- **GitHub**: Version control and CI/CD trigger

### Testing
- **Vitest**: Test runner
- **@testing-library/react**: Component testing
- **fast-check**: Property-based testing

---

## Design Patterns

### 1. Component Composition
```typescript
// Parent component composes children
<KidsModeDemo>
  <TrackInfo />
  <CharacterCrossfader />
  <SpeedMatcher />
</KidsModeDemo>
```

### 2. Custom Hooks
```typescript
// Encapsulate logic in reusable hooks
const { isPlayingA, togglePlayA } = useAudioPlayer({...});
const { currentStep, nextStep } = useTutorial({...});
```

### 3. Context API (Future)
```typescript
// Shared state across components
<DeckProvider>
  <Deck id="A" />
  <Deck id="B" />
  <Crossfader />
</DeckProvider>
```

### 4. Controlled Components
```typescript
// Parent controls component state
<CharacterCrossfader
  position={crossfaderPosition}
  onPositionChange={setCrossfaderPosition}
/>
```

### 5. Utility Functions
```typescript
// Pure functions for calculations
const { volumeA, volumeB } = calculateCrossfaderVolumes(position);
```

### 6. Props Interface Pattern
```typescript
// Explicit prop types
interface CharacterCrossfaderProps {
  position: number;
  onPositionChange: (position: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}
```

---

## Future Scalability

### Phase 1: Current (MVP) ✅
- Single-player mode
- Static track library
- Client-side only
- No user accounts
- Local state management

### Phase 2: Enhanced Features (Next 3-6 months)
- Individual volume controls (immediate)
- More training games
- Expanded track library
- Improved visual feedback
- Mobile optimization

### Phase 3: User Accounts (6-12 months)
- User authentication (Clerk, Auth0, or Supabase)
- Progress tracking database
- Custom playlists
- Achievement system
- Leaderboards

### Phase 4: Social Features (12+ months)
- Mix sharing
- Collaborative learning
- Parent dashboards
- Teacher mode
- Community track library

### Scalability Considerations

#### Frontend
- **Current**: Single-page app, ~460KB bundle
- **Optimization**: Code splitting, lazy loading
- **Target**: <200KB initial load

#### Backend (When Needed)
- **Option 1**: Vercel Serverless Functions + Upstash Redis
- **Option 2**: Supabase (PostgreSQL + Auth + Storage)
- **Option 3**: Firebase (Firestore + Auth)

#### Audio Files
- **Current**: 71MB in public/audio/
- **Optimization**: Lazy load tracks, CDN caching
- **Future**: External storage (Cloudflare R2, AWS S3)

#### Database Schema (Future)
```sql
users
  - id (uuid)
  - username
  - email
  - created_at

progress
  - id (uuid)
  - user_id (fk)
  - lesson_id
  - completed_at
  - score

playlists
  - id (uuid)
  - user_id (fk)
  - name
  - tracks (json)

achievements
  - id (uuid)
  - user_id (fk)
  - achievement_type
  - unlocked_at
```

---

## Performance Metrics

### Current Performance
- **Build Size**: 463.83 kB (128.05 kB gzipped)
- **Initial Load**: ~2 seconds (with audio files)
- **Time to Interactive**: <1 second
- **Bundle**: Single chunk (code splitting not implemented)

### Targets
- **Lighthouse Score**: >90
- **First Contentful Paint**: <1 second
- **Time to Interactive**: <2 seconds
- **Audio Load Time**: <2 seconds per track

### Monitoring
- Vercel Analytics (automatic)
- Browser DevTools Performance tab
- Lighthouse audits (Chrome)

---

## Security Considerations

### Current
- ✅ HTTPS enabled (Vercel automatic)
- ✅ XSS protection headers (vercel.json)
- ✅ Frame options (DENY)
- ✅ Content type sniffing prevention
- ✅ Client-side only (no sensitive data)

### Future (With Backend)
- Authentication (JWT tokens)
- CORS configuration
- Rate limiting
- Input validation/sanitization
- SQL injection prevention (use ORMs)
- CSRF protection

---

## Documentation Standards

### Code Comments
```typescript
/**
 * Component description
 * 
 * Purpose: What it does
 * State: What state it manages
 * Props: What it receives
 * Features: What it provides
 */
```

### File Headers
```typescript
/**
 * Filename.tsx
 * 
 * Brief description of file purpose
 * Requirements: Reference to product requirements (if applicable)
 */
```

### Function Documentation
```typescript
/**
 * Function description
 * 
 * @param paramName - Parameter description
 * @returns Return value description
 */
```

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-07 | 1.0 | Initial systems design document created | Kiro Agent |

---

**Document Status:** Living Document - Update as architecture evolves  
**Last Updated:** December 7, 2025  
**Next Review:** When major features are added
