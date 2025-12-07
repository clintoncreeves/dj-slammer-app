/**
 * useAudioPlayer Hook
 *
 * Manages dual audio playback for Kids Mode with crossfading
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateCrossfaderVolumes } from '../utils/audioUtils';

interface UseAudioPlayerProps {
  trackAUrl?: string;
  trackBUrl?: string;
  crossfaderPosition: number; // -1 to 1
  onError?: (error: Error) => void;
}

interface UseAudioPlayerReturn {
  isPlayingA: boolean;
  isPlayingB: boolean;
  playA: () => void;
  playB: () => void;
  pauseA: () => void;
  pauseB: () => void;
  togglePlayA: () => void;
  togglePlayB: () => void;
  stopAll: () => void;
  isLoading: boolean;
  hasStarted: boolean;
  start: () => void;
}

export const useAudioPlayer = ({
  trackAUrl,
  trackBUrl,
  crossfaderPosition,
  onError,
}: UseAudioPlayerProps): UseAudioPlayerReturn => {
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);

  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Initialize audio elements
  useEffect(() => {
    if (!hasStarted) return;

    // Create audio element A
    if (trackAUrl && !audioARef.current) {
      const audio = new Audio(trackAUrl);
      audio.loop = true;
      audio.volume = 0.8;
      audio.preload = 'auto';

      audio.addEventListener('error', (e) => {
        console.error('Audio A error:', e);
        onError?.(new Error(`Failed to load track A: ${trackAUrl}`));
      });

      audioARef.current = audio;
    }

    // Create audio element B
    if (trackBUrl && !audioBRef.current) {
      const audio = new Audio(trackBUrl);
      audio.loop = true;
      audio.volume = 0.8;
      audio.preload = 'auto';

      audio.addEventListener('error', (e) => {
        console.error('Audio B error:', e);
        onError?.(new Error(`Failed to load track B: ${trackBUrl}`));
      });

      audioBRef.current = audio;
    }

    // Cleanup
    return () => {
      if (audioARef.current) {
        audioARef.current.pause();
        audioARef.current = null;
      }
      if (audioBRef.current) {
        audioBRef.current.pause();
        audioBRef.current = null;
      }
    };
  }, [trackAUrl, trackBUrl, hasStarted, onError]);

  // Update track A URL
  useEffect(() => {
    if (!hasStarted || !trackAUrl) return;

    if (audioARef.current) {
      const wasPlaying = isPlayingA;

      audioARef.current.pause();
      audioARef.current.src = trackAUrl;
      audioARef.current.currentTime = 0;

      if (wasPlaying) {
        audioARef.current.play().catch(console.error);
      }
    }
  }, [trackAUrl, hasStarted, isPlayingA]);

  // Update track B URL
  useEffect(() => {
    if (!hasStarted || !trackBUrl) return;

    if (audioBRef.current) {
      const wasPlaying = isPlayingB;

      audioBRef.current.pause();
      audioBRef.current.src = trackBUrl;
      audioBRef.current.currentTime = 0;

      if (wasPlaying) {
        audioBRef.current.play().catch(console.error);
      }
    }
  }, [trackBUrl, hasStarted, isPlayingB]);

  // Update volumes based on crossfader position
  useEffect(() => {
    if (!hasStarted) return;

    const { volumeA, volumeB } = calculateCrossfaderVolumes(crossfaderPosition);

    if (audioARef.current) {
      audioARef.current.volume = volumeA * 0.8; // Max 80% to prevent clipping
    }

    if (audioBRef.current) {
      audioBRef.current.volume = volumeB * 0.8;
    }
  }, [crossfaderPosition, hasStarted]);

  // Start (requires user gesture)
  const start = useCallback(() => {
    setHasStarted(true);
  }, []);

  // Play/pause controls
  const playA = useCallback(() => {
    if (!hasStarted || !audioARef.current) return;

    audioARef.current.play()
      .then(() => setIsPlayingA(true))
      .catch((err) => {
        console.error('Play A failed:', err);
        onError?.(err);
      });
  }, [hasStarted, onError]);

  const playB = useCallback(() => {
    if (!hasStarted || !audioBRef.current) return;

    audioBRef.current.play()
      .then(() => setIsPlayingB(true))
      .catch((err) => {
        console.error('Play B failed:', err);
        onError?.(err);
      });
  }, [hasStarted, onError]);

  const pauseA = useCallback(() => {
    if (!audioARef.current) return;

    audioARef.current.pause();
    setIsPlayingA(false);
  }, []);

  const pauseB = useCallback(() => {
    if (!audioBRef.current) return;

    audioBRef.current.pause();
    setIsPlayingB(false);
  }, []);

  const togglePlayA = useCallback(() => {
    if (isPlayingA) {
      pauseA();
    } else {
      playA();
    }
  }, [isPlayingA, playA, pauseA]);

  const togglePlayB = useCallback(() => {
    if (isPlayingB) {
      pauseB();
    } else {
      playB();
    }
  }, [isPlayingB, playB, pauseB]);

  const stopAll = useCallback(() => {
    if (audioARef.current) {
      audioARef.current.pause();
      audioARef.current.currentTime = 0;
      setIsPlayingA(false);
    }
    if (audioBRef.current) {
      audioBRef.current.pause();
      audioBRef.current.currentTime = 0;
      setIsPlayingB(false);
    }
  }, []);

  return {
    isPlayingA,
    isPlayingB,
    playA,
    playB,
    pauseA,
    pauseB,
    togglePlayA,
    togglePlayB,
    stopAll,
    isLoading: false,
    hasStarted,
    start,
  };
};
