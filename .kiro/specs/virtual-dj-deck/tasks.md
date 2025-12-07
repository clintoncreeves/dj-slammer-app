# Implementation Plan

## Overview

This implementation plan breaks down the Virtual DJ Deck component into discrete, manageable tasks, with ENHANCED FOCUS on professional DJ training UX based on research findings (see `/docs/PROJECT_PLAN.md`).

**Key Insight:** Tanner is "about to buy pioneer equipment" - this must feel like professional DJ training software, NOT a toy or baby app.

**NEW PRIORITIES (Based on Research):**
1. Enhanced Tutorial Instruction Panel (Guitar Hero-style)
2. Professional Control Highlighting System (glowing like real DJ equipment)
3. Lesson Selection Screen (Serato Practice Mode-inspired)
4. Professional Celebration System (DJ terminology, no baby-fication)

**Task Distribution:**
- **Claude Code (90%+ of work)**: All implementation (AudioEngine + UI), unit tests, integration tests, browser testing, documentation
- **Kiro (~10% of work)**: Property-based tests only (10 optional tests validating correctness properties)

---

## Phase 0: ENHANCED TUTORIAL SYSTEM (NEW - TOP PRIORITY)

These tasks address the core UX gaps identified through research and must be completed to meet Tanner's needs.

- [ ] 0.1 Create TutorialInstructionPanel component (@claude-code with frontend-design skill)
  - [ ] 0.1.1 Build component structure
    - Create TutorialInstructionPanel.tsx with professional styling
    - Accept stepNumber, totalSteps, instruction, targetControl props
    - Position fixed at top of viewport with high z-index
    - Use professional typography (Space Grotesk/Inter, 20px bold)
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6_

  - [ ] 0.1.2 Implement step counter and progress indicators
    - Display "STEP X OF Y" in corner
    - Show progress dots (active = cyan, inactive = dark gray)
    - Animate progress updates smoothly
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 12.3_

  - [ ] 0.1.3 Create animated arrow indicator
    - Build SVG arrow that points to highlighted controls
    - Implement pulsing animation (opacity 50% → 100%)
    - Position dynamically based on target control location
    - Color matches deck (cyan for A, magenta for B)
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 12.4_

  - [ ] 0.1.4 Add smooth instruction transitions
    - Fade out old instruction (200ms)
    - Slide up and fade in new instruction (300ms)
    - Brief positive feedback when step completed ("NICE!")
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 12.7, 12.8_

- [ ] 0.2 Upgrade Professional Highlighting System (@claude-code with frontend-design skill)
  - [ ] 0.2.1 Enhance TutorialHighlight.module.css
    - Implement professional pulsing glow animation
    - Add drop-shadow effects (20-40px blur)
    - Scale highlighted controls (1.08x)
    - Add animated border effect
    - Use deck-specific colors (cyan for A, magenta for B)
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 0.2.2 Add smooth highlight transitions
    - Fade out previous highlight (200-300ms)
    - Fade in new highlight with scale animation
    - Implement z-index elevation for highlighted controls
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 13.5, 13.6_

  - [ ] 0.2.3 Integrate DJ sound effects
    - Add professional DJ chirp sound when control highlighted
    - Add success beep when step completed (like Serato cue sound)
    - Use Tone.js Player for sound effects
    - Source professional audio samples (no toy sounds!)
    - **Assigned to:** @claude-code
    - _Requirements: 13.4_

- [ ] 0.3 Build Lesson Selection Screen (@claude-code with frontend-design skill)
  - [ ] 0.3.1 Create LessonSelectionScreen component
    - Build grid layout (2 columns desktop, 1 column mobile)
    - Use professional card-based design
    - Dark backgrounds (#2A2A2A) with subtle borders
    - Hover effects (lift, drop-shadow)
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 14.1, 14.2, 14.9_

  - [ ] 0.3.2 Create LessonCard component
    - Display lesson number, title, description
    - Show skills list (3-5 bullets)
    - Display duration and difficulty level
    - Implement card states: available, completed, locked
    - Add completion badge (green checkmark)
    - Add locked indicator (lock icon, reduced opacity)
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 14.3, 14.4, 14.5_

  - [ ] 0.3.3 Create PracticeModeCard component
    - Special card for free play mode
    - Neon cyan accent color
    - "Free Play" description
    - "FREE PLAY" button
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 14.6, 14.7_

  - [ ] 0.3.4 Implement lesson metadata and routing
    - Create lesson data structure (Lesson interface)
    - Implement prerequisite checking
    - Handle lesson selection → deck transition
    - Handle practice mode selection → deck without tutorial
    - **Assigned to:** @claude-code
    - _Requirements: 14.5, 14.7, 14.8_

- [ ] 0.4 Implement Professional Celebration System (@claude-code with frontend-design skill)
  - [ ] 0.4.1 Create ProfessionalCelebration component
    - Full-screen overlay with dark gradient background
    - "⚡ SKILL UNLOCKED ⚡" title (32px bold, neon cyan)
    - Skill name display (28px bold)
    - Skill description using DJ terminology
    - [NEXT LESSON] and [PRACTICE MODE] buttons
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 15.2, 15.3, 15.4_

  - [ ] 0.4.2 Add professional visual effects
    - Screen flash effect (brief white flash, 100ms)
    - Animated SVG lightning bolts
    - Smooth fade-in (400ms ease-out)
    - NO cartoon elements (no confetti, stars, or childish animations)
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 15.4, 15.8_

  - [ ] 0.4.3 Implement DJ terminology system
    - Create celebrationMessages map
    - Use professional terms: "PERFECT MIX", "SMOOTH!", "ON POINT!"
    - NO childish terms: "Great job!", "Awesome!", "You did it!"
    - Context-appropriate feedback for different achievements
    - **Assigned to:** @claude-code
    - _Requirements: 15.6, 15.7_

  - [ ] 0.4.4 Add professional DJ sound effects
    - Air horn for lesson completion
    - DJ scratch sound for skill unlocks
    - Professional "ding" for perfect execution
    - NO toy sounds or childish audio
    - **Assigned to:** @claude-code
    - _Requirements: 15.5_

  - [ ] 0.4.5 Implement brief step completion feedback
    - Quick "NICE!" or "PERFECT!" message on step complete
    - 500ms display duration
    - Professional styling
    - Doesn't interrupt flow
    - **Assigned to:** @claude-code
    - _Requirements: 15.1_

- [ ] 0.5 Implement Practice Mode / Free Play (@claude-code)
  - [ ] 0.5.1 Add mode toggle system
    - Tutorial mode vs Practice mode flag
    - Load deck with or without tutorial overlay
    - Disable highlighting in practice mode
    - Disable step validation in practice mode
    - **Assigned to:** @claude-code
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [ ] 0.5.2 Add "Back to Lessons" button in practice mode
    - Fixed position button (top-right corner)
    - Professional styling
    - Returns to LessonSelectionScreen
    - **Assigned to:** @claude-code
    - _Requirements: 16.6, 16.7_

  - [ ] 0.5.3 Ensure all learned controls available
    - Progressive unlocking based on completed lessons
    - All controls functional in practice mode
    - Maintain professional aesthetic
    - **Assigned to:** @claude-code
    - _Requirements: 16.5, 16.8_

---

## Phase 1: Project Setup & Core Infrastructure

- [ ] 1. Set up project structure and dependencies
  - Create directory structure for Virtual DJ Deck component
  - Install Tone.js, React, TypeScript, and testing dependencies
  - Configure build tools (Vite/Webpack) for audio file handling
  - Set up TypeScript configuration with strict mode
  - **Assigned to:** @claude-code
  - _Requirements: 7.1, 8.1_

- [ ] 2. Create TypeScript type definitions
  - Define `VirtualDJDeckConfig` interface
  - Define `DeckState` interface
  - Define `AudioEngineState` interface
  - Create types.ts file with all shared interfaces
  - **Assigned to:** @claude-code
  - _Requirements: 7.1, 7.5_

- [ ] 3. Source and prepare demo audio tracks
  - Find 2-4 royalty-free music tracks with clear beats
  - Ensure tracks have similar BPM (120-125 range)
  - Convert to MP3 format, optimize file size
  - Place in `/public/audio/` directory
  - Create metadata JSON file with BPM and cue points
  - **Assigned to:** @claude-code
  - _Requirements: 5.2_

---

## Phase 2: Audio Engine Core

- [ ] 4. Implement AudioEngine class foundation
  - [ ] 4.1 Create AudioEngine.ts class file
    - Set up class structure with private properties
    - Implement constructor and init() method
    - Initialize Tone.js Audio Context
    - Handle browser autoplay policy restrictions
    - **Assigned to:** @claude-code
    - _Requirements: 5.1, 8.1, 8.2_

  - [ ] 4.2 Implement audio loading functionality
    - Create loadTrack() method for loading audio files
    - Pre-buffer audio into Tone.js Player instances
    - Handle loading errors (404, format issues)
    - Emit loading progress events
    - **Assigned to:** @claude-code
    - _Requirements: 5.2_

  - [ ] 4.3 Implement playback control methods
    - Create play(), pause(), and seek() methods
    - Ensure <20ms latency for all operations
    - Handle edge cases (play while loading, double-click)
    - **Assigned to:** @claude-code
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.4 Write property test for playback latency
    - **Property 1: Playback latency bounds**
    - Test that play/pause/cue commands respond within 20ms
    - Use fast-check to generate random deck and command combinations
    - Run 100 iterations minimum
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ] 5. Implement tempo control
  - [ ] 5.1 Create setPlaybackRate() method
    - Calculate playback rate from BPM (newBPM / originalBPM)
    - Apply rate to Tone.js Player without stopping playback
    - Clamp rate to safe range (0.8x - 1.2x)
    - **Assigned to:** @claude-code
    - _Requirements: 2.1, 2.2_

  - [x] 5.2 Write property test for pitch preservation
    - **Property 2: Tempo adjustment preserves pitch**
    - Test that pitch remains within 5 cents across tempo range
    - Generate random tempo adjustments (0.8x - 1.2x)
    - Measure pitch deviation using frequency analysis
    - **Validates: Requirements 2.2**

  - [x] 5.3 Write property test for continuous tempo updates
    - **Property 9: Tempo slider updates are continuous**
    - Test that BPM updates don't cause audio stuttering
    - Simulate rapid tempo slider movements
    - Verify smooth playback throughout
    - **Validates: Requirements 2.1, 2.5**

- [ ] 6. Implement crossfader functionality
  - [ ] 6.1 Set up Tone.js CrossFade node
    - Create CrossFade instance connecting both players
    - Route audio through crossfader to destination
    - **Assigned to:** @claude-code
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 6.2 Create setCrossfade() method
    - Convert position (-1 to 1) to CrossFade range (0 to 1)
    - Apply smooth volume curves (equal power crossfade)
    - Update crossfader in real-time without clicks/pops
    - **Assigned to:** @claude-code
    - _Requirements: 3.1, 3.2, 3.4_

  - [x] 6.3 Write property test for smooth crossfader curve
    - **Property 3: Crossfader volume curve is smooth**
    - Test that volume changes are gradual (<1% jumps)
    - Generate random crossfader positions
    - Measure volume deltas between consecutive samples
    - **Validates: Requirements 3.4**

- [ ] 7. Implement resource cleanup
  - [ ] 7.1 Create destroy() method
    - Disconnect all Tone.js nodes
    - Stop all players and dispose of buffers
    - Close Audio Context if no other instances exist
    - Clear all event listeners
    - **Assigned to:** @claude-code
    - _Requirements: 7.3_

  - [x] 7.2 Write property test for resource cleanup
    - **Property 7: Resource cleanup is complete**
    - Create and destroy multiple instances
    - Monitor for memory leaks and dangling references
    - Verify all Audio Context resources are freed
    - **Validates: Requirements 7.3**

---

## Phase 3: UI Components (Frontend)

- [ ] 8. Create VirtualDJDeck main component (@claude-code with frontend-design skill)
  - [ ] 8.1 Set up component structure
    - Create VirtualDJDeck.tsx with React component
    - Accept VirtualDJDeckConfig props
    - Initialize AudioEngine instance
    - Set up state management with useState/useRef
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 7.1, 7.4_

  - [ ] 8.2 Implement component lifecycle
    - Initialize AudioEngine on mount
    - Load tracks and handle loading states
    - Clean up resources on unmount
    - Handle errors and display error states
    - **Assigned to:** @claude-code
    - _Requirements: 5.1, 7.3_

  - [ ] 8.3 Create component layout
    - Design two-deck layout (side-by-side or stacked)
    - Position crossfader between decks
    - Ensure responsive design for mobile/tablet
    - Apply DJ Slammer color palette and design system
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 6.2, 6.5_

- [ ] 9. Build DeckControls component (@claude-code with frontend-design skill)
  - [ ] 9.1 Create PlayButton component
    - Design 60x60px touch-friendly button
    - Implement neon glow effect (cyan for Deck A, magenta for Deck B)
    - Add hover state (scale 1.05x, increased glow)
    - Add active/playing state (pulsing animation)
    - Wire up onClick to AudioEngine.play()
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 1.1, 1.4, 1.5, 6.1, 6.5_

  - [ ] 9.2 Create PauseButton component
    - Match PlayButton styling and size
    - Implement same interaction states
    - Wire up onClick to AudioEngine.pause()
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 1.2, 1.4, 1.5, 6.1_

  - [ ] 9.3 Create CueButton component
    - Match button styling and size
    - Add distinct visual indicator (different icon/color)
    - Wire up onClick to AudioEngine.seek() + play()
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 1.3, 1.4, 1.5, 6.1_

  - [ ]* 9.4 Write property test for visual feedback timing
    - **Property 4: Visual feedback is immediate**
    - Test that button state changes occur within 16.67ms
    - Simulate clicks on all button types
    - Measure time to visual state update
    - **Validates: Requirements 1.4, 1.5, 6.3**

- [ ] 10. Build TempoSlider component (@claude-code with frontend-design skill)
  - [ ] 10.1 Create slider UI
    - Design vertical or horizontal slider (60px wide minimum)
    - Add BPM range markers (±8% from original)
    - Style with neon accents matching deck color
    - Ensure 44x44px touch target
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 2.3, 6.1, 6.4_

  - [ ] 10.2 Implement slider interaction
    - Handle mouse drag and touch drag events
    - Update BPM in real-time during drag
    - Debounce updates to prevent excessive calls (16ms)
    - Wire up to AudioEngine.setPlaybackRate()
    - **Assigned to:** @claude-code
    - _Requirements: 2.1, 2.5_

  - [ ] 10.3 Add keyboard accessibility
    - Support arrow keys for fine adjustment
    - Support Page Up/Down for larger jumps
    - Add ARIA labels for screen readers
    - Show focus indicator
    - **Assigned to:** @claude-code
    - _Requirements: 6.3_

- [ ] 11. Build BPMDisplay component (@claude-code with frontend-design skill)
  - Create numeric BPM display
  - Update in real-time as tempo changes
  - Style with large, readable font (Space Mono)
  - Add neon glow effect matching deck color
  - Show original BPM vs current BPM
  - **Assigned to:** @claude-code (use frontend-design skill)
  - _Requirements: 2.3_

- [ ] 12. Build Waveform component (@claude-code with frontend-design skill)
  - [ ] 12.1 Create waveform generation utility
    - Implement generateWaveformData() function
    - Extract audio buffer data and downsample to ~200 points
    - Cache waveform data to avoid regeneration
    - **Assigned to:** @claude-code
    - _Requirements: 4.1_

  - [ ] 12.2 Create Canvas-based waveform renderer
    - Set up Canvas element with proper sizing
    - Draw waveform bars from generated data
    - Color-code by deck (cyan for A, magenta for B)
    - Optimize for 60fps rendering
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 4.1, 6.5_

  - [ ] 12.3 Implement animated playhead
    - Draw playhead indicator showing current position
    - Update position at 60fps using requestAnimationFrame
    - Sync playhead with actual audio playback time
    - Freeze animation when paused
    - **Assigned to:** @claude-code
    - _Requirements: 4.1, 4.3_

  - [ ] 12.4 Adjust animation speed with tempo
    - Scale playhead movement based on playback rate
    - Ensure visual speed matches audio speed
    - **Assigned to:** @claude-code
    - _Requirements: 4.4_

  - [ ]* 12.5 Write property test for waveform sync
    - **Property 5: Waveform animation matches playback**
    - Test that playhead position matches audio within 50ms
    - Generate random playback positions
    - Compare visual position to actual audio time
    - **Validates: Requirements 4.1, 4.4**

- [ ] 13. Build Crossfader component (@claude-code with frontend-design skill)
  - [ ] 13.1 Create crossfader UI
    - Design horizontal slider spanning both decks
    - Add visual indicators for A (left), Center, B (right)
    - Create color gradient (cyan → white → magenta)
    - Ensure 44x44px touch target for handle
    - **Assigned to:** @claude-code (use frontend-design skill)
    - _Requirements: 3.5, 6.1, 6.5_

  - [ ] 13.2 Implement drag interaction
    - Handle mouse drag and touch drag
    - Update position smoothly during drag
    - Wire up to AudioEngine.setCrossfade()
    - Add snap-to-center option
    - **Assigned to:** @claude-code
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 13.3 Add keyboard accessibility
    - Support arrow keys for crossfader movement
    - Support Home/End for full left/right
    - Add ARIA labels
    - Show focus indicator
    - **Assigned to:** @claude-code
    - _Requirements: 6.3_

---

## Phase 4: Integration & Polish

- [ ] 14. Wire up all components
  - Connect UI components to AudioEngine
  - Implement state synchronization
  - Handle loading states and errors
  - Test all interactions end-to-end
  - **Assigned to:** @claude-code
  - _Requirements: 7.4, 7.5_

- [ ] 15. Implement error handling UI (@claude-code with frontend-design skill)
  - [ ] 15.1 Create "Tap to enable audio" overlay
    - Display when Audio Context is blocked
    - Large, obvious button to resume context
    - Match DJ Slammer design system
    - **Assigned to:** @claude-code (use frontend-design skill)

  - [ ] 15.2 Create loading error states
    - Show error message on failed track load
    - Disable controls for affected deck
    - Provide retry button
    - **Assigned to:** @claude-code (use frontend-design skill)

  - [ ] 15.3 Create browser compatibility warning
    - Detect unsupported browsers
    - Display friendly message with suggestions
    - **Assigned to:** @claude-code (use frontend-design skill)

- [ ] 16. Optimize performance
  - Profile component rendering performance
  - Optimize Canvas rendering (use offscreen canvas if needed)
  - Debounce slider events appropriately
  - Minimize re-renders with React.memo
  - **Assigned to:** @claude-code
  - _Requirements: 5.3, 5.4_

- [ ]* 17. Write property test for touch target sizes
  - **Property 8: Touch targets meet accessibility standards**
  - Test that all interactive elements are ≥44x44px
  - Measure bounding boxes of all controls
  - Verify on different screen sizes
  - **Validates: Requirements 6.1**

- [ ]* 18. Write property test for control spacing
  - Test that controls have ≥8px spacing
  - Measure distances between adjacent elements
  - Verify on different screen sizes
  - **Validates: Requirements 6.4**

---

## Phase 5: Testing & Validation

- [ ] 19. Write unit tests for AudioEngine
  - Test initialization and cleanup
  - Test playback control methods
  - Test tempo adjustment calculations
  - Test crossfader volume curves
  - Mock Tone.js for isolated testing
  - **Assigned to:** @claude-code
  - _Requirements: All audio-related requirements_

- [ ] 20. Write unit tests for UI components
  - Test button state changes
  - Test slider value updates
  - Test event emission
  - Use React Testing Library
  - **Assigned to:** @claude-code
  - _Requirements: All UI-related requirements_

- [ ]* 21. Write property test for multi-instance isolation
  - **Property 6: Multiple deck instances don't interfere**
  - Create 2-4 VirtualDJDeck instances
  - Trigger operations on different instances
  - Verify no audio timing or quality issues
  - **Validates: Requirements 7.2**

- [ ]* 22. Write property test for audio buffer preloading
  - **Property 10: Audio buffer preloading is complete**
  - Test that tracks are fully buffered before playback
  - Verify playback controls are disabled during loading
  - Check buffer state after load completes
  - **Validates: Requirements 5.2**

- [ ] 23. Integration testing
  - Test complete user flows (load → play → mix → stop)
  - Test tempo adjustment while playing
  - Test crossfading between tracks
  - Test cue point functionality
  - Test component destroy and reinitialize
  - **Assigned to:** @claude-code
  - _Requirements: All requirements_

- [ ] 24. Browser compatibility testing
  - Test on Chrome (latest)
  - Test on Firefox (latest)
  - Test on Safari (latest)
  - Test on Mobile Safari (iOS)
  - Test on Chrome Mobile (Android)
  - Document any browser-specific issues
  - **Assigned to:** @claude-code
  - _Requirements: 5.5_

- [ ] 25. Performance testing
  - Measure audio callback timing (<10ms target)
  - Monitor frame rate during playback (60fps target)
  - Check memory usage over 30-minute session
  - Measure CPU usage (<20% target)
  - Test with multiple instances
  - **Assigned to:** @claude-code
  - _Requirements: 5.3, 5.4_

---

## Phase 6: Documentation & Demo

- [ ] 26. Create demo page (@claude-code with frontend-design skill)
  - Build simple demo page showcasing VirtualDJDeck
  - Include instructions for basic beat mixing
  - Add visual guide showing controls
  - Style with DJ Slammer design system
  - **Assigned to:** @claude-code (use frontend-design skill)

- [ ] 27. Write component documentation
  - Document VirtualDJDeck API
  - Provide usage examples
  - Document configuration options
  - Add troubleshooting guide
  - **Assigned to:** @claude-code

- [ ] 28. Create tutorial integration example
  - Show how to integrate VirtualDJDeck into a tutorial
  - Demonstrate event handling
  - Show how to guide users through beat mixing
  - **Assigned to:** @claude-code

---

## Checkpoint

- [ ] 29. Final validation checkpoint
  - Ensure all tests pass
  - Verify all requirements are met
  - Test on multiple devices
  - Get user feedback on feel and responsiveness
  - Ask the user if questions arise

---

## Notes

**Task Assignment Legend:**
- **@claude-code**: All implementation tasks (AudioEngine, UI, tests, docs)
- **@claude-code (use frontend-design skill)**: UI/styling tasks that should use the frontend-design skill
- **Kiro**: Only property-based tests (10 optional tests marked with `*`)
- **Tasks marked with `*`**: Optional property-based tests (can be skipped for faster MVP)

**Collaboration Strategy:**
- Claude Code handles ~90% of work: all implementation, unit tests, integration tests, browser testing, documentation
- Kiro handles ~10% of work: specialized property-based testing using fast-check library
- This maximizes efficiency and minimizes user token usage
