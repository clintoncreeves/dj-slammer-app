# Requirements Document

## Introduction

This document specifies the requirements for a browser-based **Interactive DJ Learning Game** that teaches basic beat mixing to kids aged 6-8 through Simon Says-style tutorials. Based on Tanner's vision (see `/docs/TANNER_VISION.md`), the app must deliver:

1. **Simon Says Tutorial Mode**: Interactive step-by-step lessons that highlight controls and validate user actions
2. **Real DJ Deck Controls**: Low-latency audio playback with immediate, rewarding button interactions
3. **Celebration & Progress**: Positive reinforcement and tracking of skill development

This is the MVP that will validate the core interactive learning model before expanding to multiple lessons, character themes, and MIDI controller support.

**Key Insight from Tanner**: "Like Simon Says - lights up buttons and you tap them when it tells you"

## Glossary

- **Virtual DJ Deck**: A browser-based software interface that simulates a physical DJ controller with playback controls, tempo adjustment, and audio mixing capabilities
- **Beat Mixing**: The DJ technique of synchronizing the tempo (BPM) of two audio tracks so they play in rhythm together
- **BPM (Beats Per Minute)**: The tempo measurement of a music track
- **Playback Engine**: The audio system responsible for loading, playing, and manipulating audio files with minimal latency
- **Deck**: A single audio playback channel (the MVP will have 2 decks for mixing between two tracks)
- **Crossfader**: A control that blends audio between two decks
- **Tempo Slider**: A control that adjusts the playback speed (BPM) of a track
- **Volume Fader**: A control that adjusts the volume level of an individual deck
- **Cue Point**: A marked position in a track where playback can instantly jump to
- **Audio Context**: The Web Audio API's main interface for processing and synthesizing audio
- **Audio Buffer**: Pre-loaded audio data ready for immediate playback
- **Latency**: The delay between user interaction and audio response (target: <20ms)
- **Tutorial Mode**: Simon Says-style interactive learning mode where the app highlights controls and guides users through steps
- **Lesson**: A structured sequence of tutorial steps that teaches a specific DJ skill
- **Tutorial Step**: A single action in a lesson (e.g., "Press PLAY on Deck A")
- **Button Highlighting**: Visual effect (glow, pulse, color) that indicates which control to interact with
- **Step Validation**: The system's ability to detect when a user has correctly completed a tutorial step
- **Celebration**: Positive visual/audio feedback when a step or lesson is completed

## Requirements

### Requirement 1

**User Story:** As a young DJ learner, I want to play and pause tracks instantly when I press buttons, so that I feel in control and the app responds like real DJ equipment.

#### Acceptance Criteria

1. WHEN a user clicks the play button on a deck THEN the Audio Context SHALL start playback within 20 milliseconds
2. WHEN a user clicks the pause button on a deck THEN the Audio Context SHALL stop playback within 20 milliseconds
3. WHEN a user clicks the cue button THEN the Audio Context SHALL jump to the cue point and play within 20 milliseconds
4. WHEN a user interacts with any playback control THEN the Virtual DJ Deck SHALL provide immediate visual feedback through button state changes
5. WHEN a user successfully triggers a control THEN the Virtual DJ Deck SHALL provide a satisfying visual animation (glow, scale, or color change)

### Requirement 2

**User Story:** As a young DJ learner, I want to adjust the tempo of tracks smoothly, so that I can match the beats of two songs together.

#### Acceptance Criteria

1. WHEN a user moves the tempo slider THEN the Playback Engine SHALL adjust the BPM without stopping playback
2. WHEN the tempo is adjusted THEN the Playback Engine SHALL maintain pitch (no "chipmunk effect")
3. WHEN a user adjusts tempo THEN the Virtual DJ Deck SHALL display the current BPM value in real-time
4. WHEN tempo adjustment occurs THEN the audio quality SHALL remain clear without artifacts or distortion
5. WHEN a user releases the tempo slider THEN the Virtual DJ Deck SHALL maintain the selected tempo until changed again

### Requirement 3

**User Story:** As a young DJ learner, I want to blend between two tracks using a crossfader, so that I can create smooth transitions like a real DJ.

#### Acceptance Criteria

1. WHEN a user moves the crossfader to the left THEN the Playback Engine SHALL increase Deck A volume and decrease Deck B volume proportionally
2. WHEN a user moves the crossfader to the right THEN the Playback Engine SHALL increase Deck B volume and decrease Deck A volume proportionally
3. WHEN the crossfader is centered THEN the Playback Engine SHALL play both decks at equal volume
4. WHEN crossfader position changes THEN the volume transition SHALL be smooth without clicks or pops
5. WHEN a user interacts with the crossfader THEN the Virtual DJ Deck SHALL provide visual feedback showing the current mix position

### Requirement 4

**User Story:** As a young DJ learner, I want to see visual feedback that shows me the music is playing, so that I can understand what's happening even if I can't hear it perfectly.

#### Acceptance Criteria

1. WHEN a track is playing THEN the Virtual DJ Deck SHALL display an animated waveform visualization
2. WHEN a track is playing THEN the Virtual DJ Deck SHALL display a playback progress indicator
3. WHEN a track is paused THEN the Virtual DJ Deck SHALL freeze the waveform animation
4. WHEN tempo is adjusted THEN the Virtual DJ Deck SHALL update the waveform animation speed accordingly
5. WHEN a track reaches the end THEN the Virtual DJ Deck SHALL display a visual indicator and stop playback

### Requirement 5

**User Story:** As a young DJ learner, I want the app to load quickly and work smoothly, so that I can start practicing without waiting or experiencing lag.

#### Acceptance Criteria

1. WHEN the Virtual DJ Deck initializes THEN the Audio Context SHALL be created and ready within 500 milliseconds
2. WHEN audio files are loaded THEN the Playback Engine SHALL pre-buffer them into Audio Buffers for instant playback
3. WHEN the user interacts with controls THEN the Virtual DJ Deck SHALL respond within one animation frame (16ms at 60fps)
4. WHEN multiple audio operations occur simultaneously THEN the Playback Engine SHALL maintain stable performance without audio glitches
5. WHEN the browser tab loses focus THEN the Playback Engine SHALL continue playing audio without interruption

### Requirement 6

**User Story:** As a young DJ learner, I want the controls to be large and easy to tap on a tablet, so that I can use the app comfortably without accidentally pressing the wrong button.

#### Acceptance Criteria

1. WHEN the Virtual DJ Deck renders THEN all interactive controls SHALL be at least 44x44 pixels (minimum touch target size)
2. WHEN the Virtual DJ Deck renders on mobile/tablet THEN controls SHALL scale appropriately for the screen size
3. WHEN a user hovers over or touches a control THEN the Virtual DJ Deck SHALL show a visual hover state
4. WHEN controls are displayed THEN they SHALL have adequate spacing (minimum 8px) to prevent accidental taps
5. WHEN the Virtual DJ Deck renders THEN it SHALL use the established DJ Slammer color palette and design system

### Requirement 7

**User Story:** As a developer, I want the Virtual DJ Deck to be a reusable component, so that I can easily create multiple instances for different tutorials.

#### Acceptance Criteria

1. WHEN the Virtual DJ Deck is instantiated THEN it SHALL accept configuration options (track URLs, initial BPM, cue points)
2. WHEN multiple Virtual DJ Deck instances exist THEN they SHALL operate independently without audio conflicts
3. WHEN the Virtual DJ Deck is destroyed THEN it SHALL properly clean up Audio Context resources to prevent memory leaks
4. WHEN the Virtual DJ Deck state changes THEN it SHALL emit events that parent components can listen to
5. WHEN the Virtual DJ Deck is integrated THEN it SHALL provide a clear API for programmatic control (play, pause, setBPM, etc.)

### Requirement 8

**User Story:** As a developer, I want to use a proven audio library, so that I don't have to build low-level audio processing from scratch.

#### Acceptance Criteria

1. WHEN selecting an audio library THEN the system SHALL use a library with proven low-latency performance (Tone.js, Howler.js, or Web Audio API directly)
2. WHEN the audio library is integrated THEN it SHALL support tempo adjustment without pitch shifting
3. WHEN the audio library is integrated THEN it SHALL support precise timing for beat-synchronized operations
4. WHEN the audio library is integrated THEN it SHALL have active maintenance and good documentation
5. WHEN the audio library is integrated THEN it SHALL have a small bundle size (<100KB) to maintain fast load times

### Requirement 9 (NEW - Tanner's Vision)

**User Story:** As Tanner (young DJ learner), I want the app to light up buttons and tell me what to press (like Simon Says), so that I can learn DJ skills step-by-step without getting confused.

#### Acceptance Criteria

1. WHEN a tutorial lesson starts THEN the Tutorial System SHALL display the current step instruction in large, kid-friendly text
2. WHEN a tutorial step requires a specific control THEN the Virtual DJ Deck SHALL highlight that control with a glowing/pulsing effect
3. WHEN a user performs the correct action THEN the Tutorial System SHALL validate the action within 100 milliseconds
4. WHEN a user completes a step correctly THEN the Tutorial System SHALL display a celebration message and animation
5. WHEN a user completes all steps in a lesson THEN the Tutorial System SHALL display a lesson completion screen with rewards (badge, celebration)
6. WHEN a user is stuck on a step for 15+ seconds THEN the Tutorial System SHALL offer a hint button
7. WHEN a user clicks the hint button THEN the Tutorial System SHALL display additional guidance for the current step
8. WHEN the tutorial is active THEN the Virtual DJ Deck SHALL prevent interactions with non-highlighted controls (or provide gentle feedback that it's not the right control yet)

### Requirement 10 (NEW - Tanner's Vision)

**User Story:** As Tanner, I want to control how loud each deck is playing, so that I can practice balancing the volume like a real DJ.

#### Acceptance Criteria

1. WHEN the Virtual DJ Deck renders THEN each deck SHALL have a vertical volume fader control
2. WHEN a user moves a volume fader THEN the Playback Engine SHALL adjust that deck's volume in real-time
3. WHEN a volume fader is at the top position THEN that deck SHALL play at 100% volume (0dB)
4. WHEN a volume fader is at the bottom position THEN that deck SHALL be silent (-∞ dB)
5. WHEN a volume fader is moved THEN the volume transition SHALL be smooth without clicks or pops
6. WHEN both volume faders and crossfader are being used THEN the final audio output SHALL be the product of both controls (deck volume × crossfader position)
7. WHEN a volume fader is rendered THEN it SHALL be at least 44x44 pixels for touch targets and styled to look like real DJ equipment (vertical slider)

### Requirement 11 (NEW - Tanner's Vision)

**User Story:** As Tanner, I want to see the music waveform scroll past as the track plays (like DJ software), so that I can see what part of the song is coming next.

#### Acceptance Criteria

1. WHEN a track is playing THEN the waveform SHALL scroll horizontally from right to left
2. WHEN a track is playing THEN the playhead SHALL remain stationary in the center while the waveform moves behind it
3. WHEN a track is paused THEN the waveform SHALL stop scrolling
4. WHEN tempo is adjusted THEN the waveform scroll speed SHALL update to match the new playback rate
5. WHEN a track is at the beginning THEN the waveform SHALL show upcoming audio on the right side
6. WHEN a track is near the end THEN the waveform SHALL show the remaining audio and blank space
7. WHEN the waveform is displayed THEN it SHALL maintain 60fps scroll performance without judder

### Requirement 12 (ENHANCED - Professional Tutorial Instructions)

**User Story:** As Tanner, I want BOLD and UNMISSABLE instructions (like Guitar Hero notes) that tell me exactly what to do, so that I never feel confused or lost during the lesson.

**Context:** Based on research of professional music learning apps (Yousician, Guitar Hero) and the finding that Tanner is preparing to use professional Pioneer equipment, instructions must be clear and prominent while maintaining a professional (not babyish) aesthetic.

#### Acceptance Criteria

1. WHEN a tutorial lesson is active THEN a Tutorial Instruction Panel SHALL be displayed at the top of the screen
2. WHEN the Tutorial Instruction Panel renders THEN it SHALL use large, bold, professional sans-serif typography (18-20px minimum)
3. WHEN a tutorial step is shown THEN the instruction SHALL include:
   - Step number and total (e.g., "STEP 2 OF 7")
   - Clear action instruction (e.g., "Press PLAY on Deck A to start the beat!")
   - Visual progress indicators (progress dots or bar)
4. WHEN a tutorial step targets a specific control THEN an animated arrow or indicator SHALL point from the instruction panel to the target control
5. WHEN the instruction panel renders THEN it SHALL use professional DJ color schemes (neon cyan, magenta, white on dark backgrounds)
6. WHEN the instruction panel displays THEN it SHALL remain visible and fixed at the top of the viewport
7. WHEN a tutorial step changes THEN the instruction panel SHALL animate smoothly to the new instruction
8. WHEN the user completes a step THEN the instruction panel SHALL provide brief positive feedback before advancing

### Requirement 13 (ENHANCED - Professional Control Highlighting)

**User Story:** As Tanner, I want highlighted controls to GLOW and PULSE like real DJ equipment, so that I immediately know which button to press without any confusion.

**Context:** Based on research of professional DJ equipment (Pioneer CDJs, Serato controllers) and Guitar Hero's clear visual guidance, highlighting must be professional and unmissable.

#### Acceptance Criteria

1. WHEN a tutorial step requires a specific control THEN that control SHALL have a professional pulsing glow effect
2. WHEN a control is highlighted THEN it SHALL:
   - Pulsate with opacity between 70% and 100% over 1.5 second cycle
   - Have a drop-shadow glow effect with 20-40px blur radius
   - Scale slightly larger (1.05-1.1x) than normal size
   - Increase z-index to appear above other elements
3. WHEN a control is highlighted THEN the glow color SHALL match professional DJ equipment colors:
   - Deck A controls: Neon cyan (#00F0FF)
   - Deck B controls: Neon magenta (#FF006E)
   - Crossfader: White (#FFFFFF)
4. WHEN a highlighted control is interacted with THEN a subtle audio cue SHALL play (professional DJ chirp/beep sound)
5. WHEN a tutorial step changes THEN the previous highlight SHALL fade out smoothly (200-300ms transition)
6. WHEN a new control is highlighted THEN it SHALL fade in smoothly with a scale animation
7. WHEN in free play mode THEN no controls SHALL be highlighted

### Requirement 14 (NEW - Lesson Selection Screen)

**User Story:** As Tanner, I want to see all available lessons and choose what to learn next, so that I can track my progress and feel like I'm unlocking new skills.

**Context:** Based on research of Serato Practice Mode and professional training apps, users need a pre-deck interface for lesson selection and progress tracking.

#### Acceptance Criteria

1. WHEN the app loads THEN it SHALL display a Lesson Selection Screen before the DJ deck interface
2. WHEN the Lesson Selection Screen renders THEN it SHALL display:
   - List of available lessons with descriptions
   - Skill level indicators (Beginner, Intermediate, Advanced)
   - Estimated duration for each lesson
   - Completion status (locked, available, completed)
3. WHEN a lesson is displayed THEN it SHALL show:
   - Lesson number and title
   - List of skills taught (3-5 bullet points)
   - Visual indicator of difficulty
   - "START LESSON" button if available
4. WHEN a lesson is completed THEN it SHALL be marked with a completion badge
5. WHEN a lesson has prerequisites THEN it SHALL be locked until prerequisites are met
6. WHEN the Lesson Selection Screen displays THEN it SHALL include a "PRACTICE MODE" option for free play
7. WHEN "PRACTICE MODE" is selected THEN the DJ deck SHALL load without tutorial overlay
8. WHEN a lesson is started THEN the app SHALL transition to the DJ deck with that lesson's tutorial configuration
9. WHEN the Lesson Selection Screen renders THEN it SHALL use professional card-based layout with DJ color scheme

### Requirement 15 (NEW - Professional Celebration System)

**User Story:** As Tanner, I want to feel proud when I complete a lesson (like unlocking an achievement in a real game), not like I'm being treated like a baby.

**Context:** Based on research showing Tanner is "about to buy pioneer equipment," celebrations must feel professional and rewarding, using real DJ terminology and professional visual effects.

#### Acceptance Criteria

1. WHEN a user completes a tutorial step THEN the system SHALL display brief professional feedback (e.g., "NICE!", "PERFECT!")
2. WHEN a user completes an entire lesson THEN a "SKILL UNLOCKED" celebration SHALL display
3. WHEN the skill unlocked celebration renders THEN it SHALL include:
   - Professional typography (large, bold, geometric sans-serif)
   - Skill name (e.g., "Beatmatching Basics")
   - Brief description of what was learned using DJ terminology
   - Options to continue to next lesson or enter practice mode
4. WHEN the celebration displays THEN it SHALL use professional visual effects:
   - Stage light flash effects (brief screen flash)
   - Professional color schemes (not cartoon colors)
   - Smooth fade-in/fade-out transitions
5. WHEN a skill is unlocked THEN a professional DJ sound effect SHALL play:
   - Air horn for major accomplishments
   - DJ scratch sound for skill unlocks
   - Professional audio samples (not toy sounds)
6. WHEN celebrations display THEN they SHALL use real DJ terminology:
   - "PERFECT MIX" not "Great job!"
   - "SMOOTH TRANSITION" not "Awesome!"
   - "BEAT MATCHED" not "You did it!"
7. WHEN a user makes a mistake THEN feedback SHALL be constructive and professional (e.g., "Try again - listen to the beat")
8. WHEN celebrating THEN no cartoon elements SHALL be used (no stars, confetti, or baby-like animations)

### Requirement 16 (NEW - Practice Mode / Free Play)

**User Story:** As Tanner, I want to experiment with the DJ deck freely (like Serato Practice Mode), so that I can practice what I learned without step-by-step guidance.

**Context:** Based on research of Serato Practice Mode, users need the ability to freely explore and practice learned skills without tutorial constraints.

#### Acceptance Criteria

1. WHEN Practice Mode is selected THEN the DJ deck SHALL load without any tutorial overlay
2. WHEN in Practice Mode THEN all controls SHALL be fully functional
3. WHEN in Practice Mode THEN no controls SHALL be highlighted
4. WHEN in Practice Mode THEN no step validation SHALL occur
5. WHEN in Practice Mode THEN the user SHALL have access to all controls learned in completed lessons
6. WHEN in Practice Mode THEN a "Back to Lessons" button SHALL be available
7. WHEN "Back to Lessons" is clicked THEN the user SHALL return to the Lesson Selection Screen
8. WHEN in Practice Mode THEN the interface SHALL maintain the same professional aesthetic as tutorial mode
