/**
 * TutorialLesson Component
 *
 * Wrapper for VirtualDJDeck_Professional with tutorial mode support.
 * Manages tutorial vs free play mode switching.
 */

import { useRef, useState } from 'react';
import VirtualDJDeckProfessional from './VirtualDJDeck_Professional';
import type { VirtualDJDeckHandle } from './VirtualDJDeck_Professional';
import type { VirtualDJDeckConfig } from './types';
import type { TutorialConfig } from './tutorialTypes';
import { yourFirstMixLesson } from './lessons/yourFirstMix';

type AppMode = 'tutorial' | 'freeplay';

export const TutorialLesson: React.FC = () => {
  const deckRef = useRef<VirtualDJDeckHandle>(null);
  const [mode, setMode] = useState<AppMode>('tutorial');

  // Configuration for both decks
  const config: VirtualDJDeckConfig = {
    deckA: {
      trackUrl: yourFirstMixLesson.tracks.deckA,
      initialBPM: 152,
      cuePoint: 0,
      waveformColor: '#00F0FF', // Cyan for Deck A
    },
    deckB: {
      trackUrl: yourFirstMixLesson.tracks.deckB,
      initialBPM: 72,
      cuePoint: 0,
      waveformColor: '#FF006E', // Magenta for Deck B
    },
  };

  // Tutorial configuration (only when in tutorial mode)
  const tutorialConfig: TutorialConfig | undefined = mode === 'tutorial' ? {
    lesson: yourFirstMixLesson,
    autoAdvance: true,
    hintDelaySeconds: 15,
    enableCelebrations: true,
  } : undefined;

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
  };

  const handleReplayLesson = () => {
    // Reset to tutorial mode and reload
    setMode('tutorial');
    window.location.reload();
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <VirtualDJDeckProfessional
        ref={deckRef}
        config={config}
        tutorialConfig={tutorialConfig}
        mode={mode}
        onModeChange={handleModeChange}
        onReplayLesson={handleReplayLesson}
      />
    </div>
  );
};

export default TutorialLesson;
