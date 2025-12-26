/**
 * TutorialLesson Component
 *
 * Wrapper for VirtualDJDeck_Professional with tutorial mode support.
 * Manages tutorial vs free play mode switching and lesson selection.
 */

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import VirtualDJDeckProfessional from './VirtualDJDeck_Professional';
import type { VirtualDJDeckHandle } from './VirtualDJDeck_Professional';
import type { VirtualDJDeckConfig } from './types';
import type { TutorialConfig, TutorialLesson as TutorialLessonType } from './tutorialTypes';
import { allLessons, getNextLesson } from './lessons';

type AppMode = 'tutorial' | 'freeplay';

// Track metadata for tutorial tracks
interface TrackMetadata {
  bpm: number;
  camelotCode: string;
  trackName: string;
  artist: string;
}

const TRACK_METADATA: Record<string, TrackMetadata> = {
  // Legacy Pixabay tracks (kept for compatibility)
  '/audio/dance-until-dark-329026.mp3': { bpm: 123, camelotCode: '8B', trackName: 'Dance Until Dark', artist: 'Pixabay' },
  '/audio/ootd-upbeat-summer-house-242100.mp3': { bpm: 123, camelotCode: '8B', trackName: 'OOTD Upbeat Summer House', artist: 'Pixabay' },
  '/audio/happy-summer-145530.mp3': { bpm: 129, camelotCode: '8B', trackName: 'Happy Summer', artist: 'Pixabay' },
  // DJ SLAMMER tracks
  '/audio/Heartburst.mp3': { bpm: 129, camelotCode: '10B', trackName: 'Heartburst', artist: 'DJ SLAMMER' },
  '/audio/Sunshine On The Floor.mp3': { bpm: 129, camelotCode: '11A', trackName: 'Sunshine On The Floor', artist: 'DJ SLAMMER' },
  '/audio/Get ready to move, feel the groove.mp3': { bpm: 129, camelotCode: '6A', trackName: 'Get ready to move, feel the groove', artist: 'DJ SLAMMER' },
  '/audio/Shake It Up.mp3': { bpm: 123, camelotCode: '9A', trackName: 'Shake It Up', artist: 'DJ SLAMMER' },
};

// Get initial lesson from URL or default to first lesson
function getInitialLessonId(): string {
  const params = new URLSearchParams(window.location.search);
  const lessonParam = params.get('lesson');
  if (lessonParam) {
    const lesson = allLessons.find(l => l.id === lessonParam);
    if (lesson) {
      return lesson.id;
    }
  }
  return allLessons[0].id;
}

export const TutorialLesson: React.FC = () => {
  const deckRef = useRef<VirtualDJDeckHandle>(null);
  const [mode, setMode] = useState<AppMode>('tutorial');
  const [currentLessonId, setCurrentLessonId] = useState<string>(getInitialLessonId);
  // Key to force remount of VirtualDJDeckProfessional when changing lessons
  const [lessonKey, setLessonKey] = useState(0);
  // Track if audio has been enabled (skip welcome screen on lesson changes)
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Get current lesson
  const currentLesson = useMemo(() => {
    return allLessons.find(l => l.id === currentLessonId) || allLessons[0];
  }, [currentLessonId]);

  // Configuration for both decks based on current lesson
  // Colors match the spectral waveform's prominent frequencies (blue/green)
  const config: VirtualDJDeckConfig = useMemo(() => {
    const deckAMeta = TRACK_METADATA[currentLesson.tracks.deckA];
    const deckBMeta = TRACK_METADATA[currentLesson.tracks.deckB];
    return {
      deckA: {
        trackUrl: currentLesson.tracks.deckA,
        trackName: deckAMeta?.trackName || 'Track A',
        artistName: deckAMeta?.artist || 'Unknown Artist',
        initialBPM: deckAMeta?.bpm || 120,
        cuePoint: currentLesson.tracks.deckACuePoint || 0,
        waveformColor: '#4A90D9', // Blue for Deck A (matches low/mid frequencies)
        camelotCode: deckAMeta?.camelotCode,
      },
      deckB: {
        trackUrl: currentLesson.tracks.deckB,
        trackName: deckBMeta?.trackName || 'Track B',
        artistName: deckBMeta?.artist || 'Unknown Artist',
        initialBPM: deckBMeta?.bpm || 120,
        cuePoint: currentLesson.tracks.deckBCuePoint || 0,
        waveformColor: '#7ED321', // Green for Deck B (matches mid/high frequencies)
        camelotCode: deckBMeta?.camelotCode,
      },
    };
  }, [currentLesson]);

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
    // Increment key to force remount and reset all state
    setMode('tutorial');
    setLessonKey(k => k + 1);
  }, []);

  const handleNextLesson = useCallback(() => {
    const nextLesson = getNextLesson(currentLessonId);
    if (nextLesson) {
      // Update URL without reload for bookmarking
      window.history.pushState({}, '', `?lesson=${nextLesson.id}`);
      // Change lesson and increment key to force remount
      setCurrentLessonId(nextLesson.id);
      setMode('tutorial');
      setLessonKey(k => k + 1);
    }
  }, [currentLessonId]);

  const handleSelectLesson = useCallback((lesson: TutorialLessonType) => {
    // Update URL without reload for bookmarking
    window.history.pushState({}, '', `?lesson=${lesson.id}`);
    // Change lesson and increment key to force remount
    setCurrentLessonId(lesson.id);
    setMode('tutorial');
    setLessonKey(k => k + 1);
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newLessonId = getInitialLessonId();
      if (newLessonId !== currentLessonId) {
        setCurrentLessonId(newLessonId);
        setMode('tutorial');
        setLessonKey(k => k + 1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentLessonId]);

  // Check if there's a next lesson available
  const nextLesson = getNextLesson(currentLessonId);

  // Callback when audio is first enabled
  const handleAudioEnabled = useCallback(() => {
    setAudioEnabled(true);
  }, []);

  return (
    <div style={{ width: '100%', minHeight: '100vh' }}>
      <VirtualDJDeckProfessional
        key={`lesson-${currentLessonId}-${lessonKey}`}
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
        skipWelcomeScreen={audioEnabled}
        onAudioEnabled={handleAudioEnabled}
      />
    </div>
  );
};

export default TutorialLesson;
