/**
 * "Your First Mix" - Beginner Tutorial Lesson
 *
 * Teaches Tanner the basics of DJing with a real crossfade transition!
 * Uses two tracks at the same BPM (123) for a smooth mix.
 *
 * Flow:
 * 1. Start with crossfader full left on Deck A (only Deck A audible)
 * 2. Play Deck A to get the beat going
 * 3. Start Deck B (playing but not audible yet because crossfader is on A)
 * 4. Cut the bass on Deck B (pro technique to avoid muddy mixes)
 * 5. Bring crossfader to center to blend both tracks
 * 6. Complete the transition by moving crossfader to Deck B
 * 7. Stop Deck A for a clean finish
 */

import { TutorialLesson } from '../tutorialTypes';

export const yourFirstMixLesson: TutorialLesson = {
  id: 'your-first-mix',
  title: 'Your First Mix',
  description: 'Learn how to blend two tracks and create a smooth DJ transition!',
  difficulty: 'beginner',

  // Using two tracks at 123 BPM for easy mixing
  // IMPORTANT: Both tracks start at position 0 to ensure beat phase alignment
  // This means when both play, their beats hit at the SAME time
  tracks: {
    deckA: '/audio/dance-until-dark-329026.mp3',
    deckB: '/audio/ootd-upbeat-summer-house-242100.mp3',
    // Both start from the beginning to ensure beats are phase-aligned
    deckACuePoint: 0,
    deckBCuePoint: 0,
  },

  steps: [
    {
      id: 'play-deck-a',
      instruction: 'Press PLAY on Deck A to start your first track!',
      highlightTarget: {
        type: 'button',
        deck: 'A',
        control: 'play',
      },
      validate: (currentState, previousState) => {
        // Check if Deck A just started playing
        return currentState.deckA.isPlaying && !previousState.deckA.isPlaying;
      },
      hint: 'Hit the PLAY button on Deck A - the crossfader is already set so you only hear Deck A',
      celebrationMessage: 'NICE! The beat is live at 123 BPM! The track is starting from the first beat.',
    },

    {
      id: 'play-deck-b',
      instruction: 'Press PLAY on Deck B to cue up your second track!',
      highlightTarget: {
        type: 'button',
        deck: 'B',
        control: 'play',
      },
      validate: (currentState, previousState) => {
        // Check if Deck B just started playing (Deck A should still be playing)
        return (
          currentState.deckB.isPlaying &&
          !previousState.deckB.isPlaying &&
          currentState.deckA.isPlaying
        );
      },
      hint: "Hit PLAY on Deck B - you won't hear it yet because the crossfader is on Deck A",
      celebrationMessage: "PERFECT! Both tracks at 123 BPM and starting from beat 1 - they're perfectly in sync!",
    },

    {
      id: 'cut-bass-b',
      instruction: 'Cut the BASS on Deck B! Drag the LOW slider down to avoid two basslines clashing.',
      highlightTarget: {
        type: 'slider',
        deck: 'B',
        control: 'eq-low',
      },
      validate: (currentState) => {
        // Check if Deck B's low EQ is cut (below -6dB)
        return currentState.deckB.eqLow < -6;
      },
      hint: 'Pull the LOW (bass) slider down on Deck B - this is a pro DJ technique!',
      celebrationMessage: 'PRO MOVE! Cutting bass prevents muddy mixes - real DJs do this!',
    },

    {
      id: 'blend-center',
      instruction: 'Now move the crossfader to CENTER to blend both tracks!',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        // Check if crossfader is near center (within 0.2 of 0)
        return Math.abs(currentState.crossfaderPosition) < 0.2;
      },
      hint: "Slide the crossfader from the left toward the middle - you'll start hearing Deck B fade in",
      celebrationMessage: 'SMOOTH! Both tracks are blending!',
    },

    {
      id: 'transition-to-b',
      instruction: 'Complete the transition - slide the crossfader all the way to Deck B!',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        // Check if crossfader is on the right side (Deck B)
        return currentState.crossfaderPosition > 0.7;
      },
      hint: 'Keep moving the crossfader to the right until Deck B takes over completely',
      celebrationMessage: 'FIRE! That was a smooth transition!',
    },

    {
      id: 'stop-deck-a',
      instruction: "Press PAUSE on Deck A - you're done with it!",
      highlightTarget: {
        type: 'button',
        deck: 'A',
        control: 'pause',
      },
      validate: (currentState, previousState) => {
        // Check if Deck A was just paused
        return !currentState.deckA.isPlaying && previousState.deckA.isPlaying;
      },
      hint: 'Hit the PAUSE button on Deck A to stop it cleanly',
      celebrationMessage: 'CLEAN! Professional deck control!',
    },
  ],

  completionMessage:
    'SKILLS UNLOCKED! You just completed your first DJ transition!\n\nYou learned:\n- Basic playback control\n- Bass cutting technique (pro move!)\n- Crossfader blending technique\n- Smooth track transitions\n- Professional deck control\n\nYou\'re ready for real DJ equipment!',

  badge: {
    icon: '🏆',
    title: 'First Mix Master',
  },
};
