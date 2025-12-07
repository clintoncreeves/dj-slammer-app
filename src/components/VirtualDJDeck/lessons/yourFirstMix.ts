/**
 * "Your First Mix" - Beginner Tutorial Lesson
 *
 * Teaches Tanner the basics of DJing:
 * 1. Playing a track
 * 2. Playing a second track
 * 3. Using the crossfader to mix between them
 */

import { TutorialLesson } from '../tutorialTypes';

export const yourFirstMixLesson: TutorialLesson = {
  id: 'your-first-mix',
  title: 'Your First Mix',
  description: 'Learn how to play two tracks and mix between them like a real DJ!',
  difficulty: 'beginner',

  tracks: {
    deckA: '/audio/alone-296348.mp3',
    deckB: '/audio/baby-mandala-nepalese-drill-music-169039.mp3',
  },

  steps: [
    {
      id: 'play-deck-a',
      instruction: 'Press PLAY on Deck A to start the beat!',
      highlightTarget: {
        type: 'button',
        deck: 'A',
        control: 'play',
      },
      validate: (currentState, previousState) => {
        // Check if Deck A just started playing
        return currentState.deckA.isPlaying && !previousState.deckA.isPlaying;
      },
      hint: 'Hit the PLAY button (▶️) on Deck A',
      celebrationMessage: 'NICE! Beat is live!',
    },

    {
      id: 'play-deck-b',
      instruction: 'Press PLAY on Deck B to add the second track!',
      highlightTarget: {
        type: 'button',
        deck: 'B',
        control: 'play',
      },
      validate: (currentState, previousState) => {
        // Check if Deck B just started playing (and Deck A is still playing)
        return (
          currentState.deckB.isPlaying &&
          !previousState.deckB.isPlaying &&
          currentState.deckA.isPlaying
        );
      },
      hint: 'Hit the PLAY button (▶️) on Deck B',
      celebrationMessage: 'SMOOTH! Both decks rolling!',
    },

    {
      id: 'center-crossfader',
      instruction: 'Move the crossfader to CENTER to blend the tracks together!',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        // Check if crossfader is near center (within 0.1 of 0)
        return Math.abs(currentState.crossfaderPosition) < 0.1;
      },
      hint: 'Slide the crossfader to the middle position',
      celebrationMessage: 'PERFECT MIX! Tracks are blending!',
    },

    {
      id: 'crossfade-to-b',
      instruction: 'Slide the crossfader to B to transition fully to Deck B!',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        // Check if crossfader is moved to the right (Deck B side)
        return currentState.crossfaderPosition > 0.7;
      },
      hint: 'Move the crossfader all the way to the right (B side)',
      celebrationMessage: 'SMOOTH TRANSITION! Pro DJ move!',
    },

    {
      id: 'pause-deck-a',
      instruction: 'Press PAUSE on Deck A to stop it!',
      highlightTarget: {
        type: 'button',
        deck: 'A',
        control: 'pause',
      },
      validate: (currentState, previousState) => {
        // Check if Deck A was just paused
        return !currentState.deckA.isPlaying && previousState.deckA.isPlaying;
      },
      hint: 'Hit the PAUSE button (⏸️) on Deck A',
      celebrationMessage: 'CLEAN! Deck A stopped!',
    },
  ],

  completionMessage: '🔥 SKILLS UNLOCKED! You just completed your first DJ mix! 🔥\n\nYou learned:\n✅ Basic playback control\n✅ Crossfader blending\n✅ Smooth transitions\n✅ Professional deck control\n\nYou\'re ready for real DJ equipment like Pioneer & Rekordbox! 🎧',

  badge: {
    icon: '🏆',
    title: 'First Mix Master',
  },
};
