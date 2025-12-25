/**
 * "Beatmatching 101" - Intermediate Tutorial Lesson
 *
 * Teaches manual BPM matching - a core DJ skill!
 * Uses two tracks at different BPMs (129 vs 123) that the user must sync.
 *
 * IMPORTANT: BPM matching must happen BEFORE crossfading!
 * This is the correct DJ workflow.
 *
 * Flow:
 * 1. Start Deck A (129 BPM track) - audience hears this
 * 2. Start Deck B (123 BPM track) - crossfader stays on A, this is "in headphones"
 * 3. Adjust Deck B's tempo slider to speed it up toward 129 BPM
 * 4. Fine-tune until BPMs match exactly
 * 5. THEN move crossfader to center to blend (beats stay aligned!)
 * 6. Complete transition to Deck B
 * 7. Stop Deck A
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
    // Step 1: Start the main track
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

    // Step 2: Cue up Deck B (play it in headphones - crossfader stays on A)
    {
      id: 'play-deck-b',
      instruction: 'Press PLAY on Deck B to preview it (crossfader stays on A so audience only hears Deck A)',
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
      hint: 'Hit PLAY on Deck B - it\'s at 123 BPM, which is slower than Deck A\'s 129 BPM!',
      celebrationMessage: 'Deck B is now playing! Notice the BPM shows 123 - we need to speed it up!',
    },

    // Step 3: Match the tempo FIRST (before any crossfading)
    {
      id: 'adjust-tempo-b',
      instruction: 'Adjust Deck B\'s TEMPO slider UP to speed it up toward 129 BPM!',
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
      celebrationMessage: 'GETTING CLOSER! Keep going until the BPMs match!',
    },

    // Step 4: Fine-tune to exact match
    {
      id: 'fine-tune-sync',
      instruction: 'Fine-tune until Deck B matches Deck A exactly (both at ~129 BPM)',
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
      hint: 'Keep adjusting until both BPM displays show the same number - aim for 129 BPM on both!',
      celebrationMessage: 'LOCKED IN! BPMs are matched - NOW we can start the transition!',
    },

    // Step 5: NOW move crossfader to center to blend (after BPMs match)
    {
      id: 'move-crossfader-center',
      instruction: 'Now blend the tracks - move the crossfader to CENTER',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        // Crossfader near center
        return Math.abs(currentState.crossfaderPosition) < 0.3;
      },
      hint: 'Slide the crossfader to the middle - since the BPMs match, the beats should stay aligned!',
      celebrationMessage: 'Both tracks playing together IN SYNC! This is the magic of beatmatching!',
    },

    // Step 6: Complete the transition
    {
      id: 'transition-to-b',
      instruction: 'Complete the transition - slide the crossfader all the way to Deck B!',
      highlightTarget: {
        type: 'crossfader',
      },
      validate: (currentState) => {
        return currentState.crossfaderPosition > 0.7;
      },
      hint: 'Slide the crossfader to the right to fully transition to Deck B',
      celebrationMessage: 'SMOOTH TRANSITION! That\'s professional beatmatching!',
    },

    // Step 7: Clean finish
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
      celebrationMessage: 'CLEAN MIX! You just did real DJ beatmatching!',
    },
  ],

  completionMessage:
    '🎧 BEATMATCHING MASTERED! 🎧\n\nYou just learned one of the most important DJ skills!\n\nYou learned:\n- Identifying tempo differences by ear\n- Using the tempo slider to adjust BPM\n- Matching beats between two tracks\n- Smooth transitions with synced tempos\n\nPro tip: With practice, you\'ll learn to do this by ear alone!',

  badge: {
    icon: '🎚️',
    title: 'Beatmatch Pro',
  },
};
