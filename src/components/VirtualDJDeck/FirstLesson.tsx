/**
 * FirstLesson Component
 *
 * Ultra-simplified first lesson for 6-8 year olds:
 * "Press Play on Deck A to hear music!"
 *
 * This component wraps VirtualDJDeck with a kid-friendly UI
 * that focuses on one deck and one action.
 */

import { useRef, useState } from 'react';
import VirtualDJDeck from './VirtualDJDeck';
import type { VirtualDJDeckHandle } from './VirtualDJDeck';
import type { VirtualDJDeckConfig } from './types';
import styles from './FirstLesson.module.css';

export const FirstLesson: React.FC = () => {
  const deckRef = useRef<VirtualDJDeckHandle>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [volume, setVolume] = useState(0.8); // 80% default volume
  const [bpm, setBpm] = useState(152); // Track's original BPM

  // Configuration for single deck
  const config: VirtualDJDeckConfig = {
    deckA: {
      trackUrl: '/audio/alone-296348.mp3',
      initialBPM: 152,
      cuePoint: 0,
      waveformColor: '#00F0FF',
    },
    deckB: {
      trackUrl: '/audio/baby-mandala-nepalese-drill-music-169039.mp3',
      initialBPM: 72,
      cuePoint: 0,
      waveformColor: '#FF006E',
    },
    onStateChange: (state) => {
      setIsPlaying(state.deckA.isPlaying);

      // Celebrate first play
      if (state.deckA.isPlaying && !hasPlayedOnce) {
        setHasPlayedOnce(true);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    },
    onError: (error) => {
      console.error('[FirstLesson] Error:', error);
    },
  };

  const handlePlayClick = () => {
    if (deckRef.current) {
      deckRef.current.playDeck('A');
    }
  };

  const handlePauseClick = () => {
    if (deckRef.current) {
      deckRef.current.pauseDeck('A');
    }
  };

  const handleStartClick = () => {
    // User gesture allows AudioContext to start
    setHasStarted(true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (deckRef.current) {
      deckRef.current.setVolume('A', newVolume);
    }
  };

  const handleBPMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(e.target.value);
    setBpm(newBpm);

    if (deckRef.current) {
      deckRef.current.setBPM('A', newBpm);
    }
  };

  const handleTempoReset = () => {
    const originalBpm = 152;
    setBpm(originalBpm);

    if (deckRef.current) {
      deckRef.current.setBPM('A', originalBpm);
    }
  };

  // Show start screen first (requires user gesture for audio)
  if (!hasStarted) {
    return (
      <div className={styles.container}>
        <div className={styles.startScreen}>
          <div className={styles.startContent}>
            <div className={styles.startEmoji}>🎧</div>
            <h1 className={styles.startTitle}>DJ SLAMMER</h1>
            <div className={styles.startMessage}>
              <p className={styles.startSubtitle}>Hey Tanner!</p>
              <p className={styles.startDescription}>
                Just like DJs try out new mixes with the crowd to see what works,
                we need YOU to spin this app and tell us how it feels.
              </p>
              <p className={styles.startDescription}>
                Your feedback helps us build the right thing.
              </p>
              <div className={styles.testBadge}>SET 1</div>
            </div>
            <button className={styles.startButton} onClick={handleStartClick}>
              <span className={styles.startButtonEmoji}>🎵</span>
              <span className={styles.startButtonText}>START YOUR SET</span>
            </button>
            <p className={styles.startHint}>Click to enable audio</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hidden VirtualDJDeck - handles all audio logic */}
      <div style={{ display: 'none' }}>
        <VirtualDJDeck ref={deckRef} config={config} />
      </div>

      {/* Simple Kid-Friendly UI */}
      <div className={styles.lesson}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoEmoji}>🎧</span>
            <h1>DJ SLAMMER</h1>
          </div>
          <div className={styles.badge}>SET 1</div>
        </header>

        {/* Instruction */}
        <div className={styles.instruction}>
          <h2>Spin the Track!</h2>
          <p>Try the controls - play, volume, and tempo</p>
        </div>

        {/* Deck A - Big and Simple */}
        <div className={styles.deck}>
          <div className={styles.trackInfo}>
            <div className={`${styles.artwork} ${isPlaying ? styles.spinning : ''}`}>
              💿
            </div>
            <div className={styles.trackDetails}>
              <div className={styles.trackTitle}>Alone</div>
              <div className={styles.trackArtist}>Pixabay</div>
            </div>
          </div>

          {/* DJ Controls Section - Rekordbox Style Layout */}
          <div className={styles.djControlsSection}>
            {/* Left: Tempo Control */}
            <div className={styles.tempoControl}>
              <div className={styles.tempoLabel}>TEMPO</div>
              <input
                type="range"
                min="122"
                max="182"
                value={bpm}
                onChange={handleBPMChange}
                className={styles.tempoSlider}
              />
              <div className={styles.tempoValue}>{bpm} BPM</div>
              <div className={styles.tempoPercentage}>
                {((bpm / 152 - 1) * 100).toFixed(1)}%
              </div>
              <button
                className={styles.resetButton}
                onClick={handleTempoReset}
                title="Reset to original BPM"
              >
                RESET
              </button>
            </div>

            {/* Center: BPM Display */}
            <div className={styles.bpmDisplay}>
              <div className={styles.bpmCircle}>
                <div className={styles.bpmValue}>{bpm}</div>
                <div className={styles.bpmLabel}>BPM</div>
              </div>
            </div>

            {/* Right: Volume Control */}
            <div className={styles.volumeControl}>
              <div className={styles.volumeLabel}>VOLUME</div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className={styles.volumeSlider}
              />
              <div className={styles.volumeValue}>{Math.round(volume * 100)}%</div>
            </div>
          </div>

          {/* Play/Pause Buttons - BIG for kids */}
          <div className={styles.controls}>
            {!isPlaying ? (
              <button
                className={`${styles.playButton} ${styles.primary}`}
                onClick={handlePlayClick}
              >
                <span className={styles.buttonEmoji}>▶️</span>
                <span className={styles.buttonText}>PLAY</span>
              </button>
            ) : (
              <button
                className={`${styles.pauseButton} ${styles.active}`}
                onClick={handlePauseClick}
              >
                <span className={styles.buttonEmoji}>⏸️</span>
                <span className={styles.buttonText}>PAUSE</span>
              </button>
            )}
          </div>

          {/* Playing Indicator */}
          {isPlaying && (
            <div className={styles.playingIndicator}>
              <div className={styles.visualizer}>
                <div className={styles.bar}></div>
                <div className={styles.bar}></div>
                <div className={styles.bar}></div>
                <div className={styles.bar}></div>
                <div className={styles.bar}></div>
              </div>
              <span className={styles.playingText}>🎶 Playing!</span>
            </div>
          )}
        </div>

        {/* Celebration Popup */}
        {showCelebration && (
          <div className={styles.celebration}>
            <div className={styles.celebrationContent}>
              <div className={styles.celebrationIcon}>🎉</div>
              <h2>Amazing!</h2>
              <p>You pressed play! You're a DJ!</p>
            </div>
          </div>
        )}

        {/* Progress */}
        {hasPlayedOnce && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
            <p className={styles.progressText}>✨ Nice set! Keep spinning!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirstLesson;
