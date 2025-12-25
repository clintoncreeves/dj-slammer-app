/**
 * TutorialLesson Component
 *
 * Wrapper for VirtualDJDeck_Professional with tutorial mode support.
 * Manages tutorial vs free play mode switching and lesson selection.
 */

import { useRef, useState, useMemo, useCallback } from 'react';
import VirtualDJDeckProfessional from './VirtualDJDeck_Professional';
import type { VirtualDJDeckHandle } from './VirtualDJDeck_Professional';
import type { VirtualDJDeckConfig } from './types';
import type { TutorialConfig, TutorialLesson as TutorialLessonType } from './tutorialTypes';
import { allLessons, getNextLesson } from './lessons';

type AppMode = 'tutorial' | 'freeplay';

// Track metadata for BPM configuration
const TRACK_BPM: Record<string, number> = {
  '/audio/dance-until-dark-329026.mp3': 123,
  '/audio/ootd-upbeat-summer-house-242100.mp3': 123,
  '/audio/happy-summer-145530.mp3': 129,
};

export const TutorialLesson: React.FC = () => {
  const deckRef = useRef<VirtualDJDeckHandle>(null);
  const [mode, setMode] = useState<AppMode>('tutorial');
  const [currentLessonId, setCurrentLessonId] = useState<string>(allLessons[0].id);

  // Get current lesson
  const currentLesson = useMemo(() => {
    return allLessons.find(l => l.id === currentLessonId) || allLessons[0];
  }, [currentLessonId]);

  // Configuration for both decks based on current lesson
  const config: VirtualDJDeckConfig = useMemo(() => ({
    deckA: {
      trackUrl: currentLesson.tracks.deckA,
      initialBPM: TRACK_BPM[currentLesson.tracks.deckA] || 120,
      cuePoint: 0,
      waveformColor: '#00F0FF', // Cyan for Deck A
    },
    deckB: {
      trackUrl: currentLesson.tracks.deckB,
      initialBPM: TRACK_BPM[currentLesson.tracks.deckB] || 120,
      cuePoint: 0,
      waveformColor: '#FF006E', // Magenta for Deck B
    },
  }), [currentLesson]);

  // Tutorial configuration (only when in tutorial mode)
  const tutorialConfig: TutorialConfig | undefined = useMemo(() => {
    if (mode !== 'tutorial') return undefined;
    return {
      lesson: currentLesson,
      autoAdvance: true,
      hintDelaySeconds: 15,
      enableCelebrations: true,
    };
  }, [mode, currentLesson]);

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
  }, []);

  const handleReplayLesson = useCallback(() => {
    // Reset to tutorial mode and reload
    setMode('tutorial');
    window.location.reload();
  }, []);

  const handleNextLesson = useCallback(() => {
    const nextLesson = getNextLesson(currentLessonId);
    if (nextLesson) {
      setCurrentLessonId(nextLesson.id);
      setMode('tutorial');
      // Force reload to reset all state
      window.location.href = `?lesson=${nextLesson.id}`;
    }
  }, [currentLessonId]);

  const handleSelectLesson = useCallback((lesson: TutorialLessonType) => {
    setCurrentLessonId(lesson.id);
    setMode('tutorial');
    window.location.href = `?lesson=${lesson.id}`;
  }, []);

  // Check URL for lesson parameter on mount
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const lessonParam = params.get('lesson');
    if (lessonParam) {
      const lesson = allLessons.find(l => l.id === lessonParam);
      if (lesson) {
        setCurrentLessonId(lesson.id);
      }
    }
  });

  // Check if there's a next lesson available
  const nextLesson = getNextLesson(currentLessonId);

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <VirtualDJDeckProfessional
        ref={deckRef}
        config={config}
        tutorialConfig={tutorialConfig}
        mode={mode}
        onModeChange={handleModeChange}
        onReplayLesson={handleReplayLesson}
        onNextLesson={nextLesson ? handleNextLesson : undefined}
        nextLessonTitle={nextLesson?.title}
        allLessons={allLessons}
        currentLessonId={currentLessonId}
        onSelectLesson={handleSelectLesson}
      />
    </div>
  );
};

export default TutorialLesson;
