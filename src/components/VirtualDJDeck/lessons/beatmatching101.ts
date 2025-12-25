/**
 * "Beatmatching 101" - Intermediate Tutorial Lesson
 *
 * Teaches manual BPM matching - a core DJ skill!
 * Uses two tracks at different BPMs (129 vs 123) that the user must sync.
 *
 * Flow:
 * 1. Start Deck A (129 BPM track)
 * 2. Start Deck B (123 BPM track) - they'll hear it's off-beat
 * 3. Look at the BPM displays to see the mismatch
 * 4. Adjust Deck B's tempo slider to match Deck A
 * 5. Use the Sync button for perfect alignment
 * 6. Crossfade to complete the transition
 */

import { TutorialLesson } from '../tutorialTypes';

export const beatmatching101Lesson: TutorialLesson = {
  id: 'beatmatching-101',
  title: 'Beatmatching 101',
  description: 'Learn to match BPMs and sync tracks like a pro DJ!',
  difficulty: 'intermediate',

  // Using two tracks with different BPMs
  // Happy Summer: 129 BPM
  // Dance Until Dark: 123 BPM (6 BPM difference)
  tracks: {
    deckA: '/audio/happy-summer-145530.mp3',
    deckB: '/audio/dance-until-dark-329026.mp3',
  },

  steps: [
    {
      id: 'play-deck-a',
      instruction: 'Press PLAY on Deck A to start your first track (129 BPM)!',
      highlightTarget: {
        type: 'button',
        deck: 'A',
        control: 'play',
      },
      validate: (currentState, previousState) => {
        return currentState.deckA.isPlaying && !previousState.deckA.isPlaying;
      },
      hint: 'Hit the PLAY button on Deck A - notice the BPM display shows 129',
      celebrationMessage: 'NICE! Deck A is rolling at 129 BPM!',
    },

    {
      id: 'play-deck-b',
      instruction: 'Press PLAY on Deck B - listen for the tempo difference!',
      highlightTarget: {
        type: 'button',
        deck: 'B',
        control: 'play',
      },
      validate: (currentState, previousState) => {
        return (
          currentState.deckB.isPlaying &&
          !previousState.deckB.isPlaying &&
          currentState.deckA.isPlaying
        );
      },
      hint: 'Hit PLAY on Deck B and listen - Deck B is at 123 BPM, slower than Deck A!',
      celebrationMessage: 'Hear that? The beats are clashing because the BPMs are different!',
    },

    {
      id: 'move-crossfader-center',
      instruction: 'Move the crossfader to CENTER to hear both tracks together',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        // Crossfader near center
        return Math.abs(currentState.crossfaderPosition) < 0.3;
      },
      hint: 'Slide the crossfader to the middle - you\'ll clearly hear the tempo mismatch now!',
      celebrationMessage: 'Now you can hear both tracks - notice how the beats drift apart!',
    },

    {
      id: 'adjust-tempo-b',
      instruction: 'Adjust Deck B\'s TEMPO slider UP to speed it up closer to 129 BPM!',
      highlightTarget: {
        type: 'slider',
        deck: 'B',
        control: 'tempo',
      },
      validate: (currentState) => {
        // Check if Deck B's BPM has been adjusted closer to Deck A
        // Original is 123, target is ~129, so current BPM should be > 126
        return currentState.deckB.currentBPM > 126;
      },
      hint: 'Move Deck B\'s tempo slider UP (towards the +) to increase the BPM from 123 toward 129',
      celebrationMessage: 'GETTING CLOSER! The beats are starting to align!',
    },

    {
      id: 'fine-tune-sync',
      instruction: 'Fine-tune the tempo until Deck B matches Deck A (both at ~129 BPM)',
      highlightTarget: {
        type: 'slider',
        deck: 'B',
        control: 'tempo',
      },
      validate: (currentState) => {
        // BPMs should be within 1 BPM of each other
        const bpmDiff = Math.abs(currentState.deckA.currentBPM - currentState.deckB.currentBPM);
        return bpmDiff < 1.5;
      },
      hint: 'Keep adjusting until both BPM displays show nearly the same number - aim for less than 1 BPM difference',
      celebrationMessage: 'LOCKED IN! The BPMs are matched - hear how they sync up?',
    },

    {
      id: 'transition-to-b',
      instruction: 'Complete the transition - slide the crossfader to Deck B!',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        return currentState.crossfaderPosition > 0.7;
      },
      hint: 'Now that the BPMs match, slide the crossfader all the way to Deck B for a smooth transition',
      celebrationMessage: 'SMOOTH TRANSITION! That\'s professional beatmatching!',
    },

    {
      id: 'stop-deck-a',
      instruction: 'Press PAUSE on Deck A to complete the mix!',
      highlightTarget: {
        type: 'button',
        deck: 'A',
        control: 'pause',
      },
      validate: (currentState, previousState) => {
        return !currentState.deckA.isPlaying && previousState.deckA.isPlaying;
      },
      hint: 'Hit PAUSE on Deck A - you\'ve completed your first beatmatched transition!',
      celebrationMessage: 'CLEAN! You just did real DJ beatmatching!',
    },
  ],

  completionMessage:
    '🎧 BEATMATCHING MASTERED! 🎧\n\nYou just learned one of the most important DJ skills!\n\nYou learned:\n- Identifying tempo differences by ear\n- Using the tempo slider to adjust BPM\n- Matching beats between two tracks\n- Smooth transitions with synced tempos\n\nPro tip: With practice, you\'ll learn to do this by ear alone!',

  badge: {
    icon: '🎚️',
    title: 'Beatmatch Pro',
  },
};
