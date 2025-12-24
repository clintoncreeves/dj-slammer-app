/**
 * Slammer Mode Demo
 *
 * Age-appropriate DJ training mode with professional concepts
 */

import React, { useState, useEffect, useRef } from 'react';
import { TrackMetadata } from '../VirtualDJDeck/types';
import TrackInfo from '../VirtualDJDeck/TrackInfo';
import SpeedMatcher from '../Games/SpeedMatcher';
import CharacterCrossfader from '../Games/CharacterCrossfader';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import styles from './KidsModeDemo.module.css';

export const KidsModeDemo: React.FC = () => {
  const [allTracks, setAllTracks] = useState<TrackMetadata[]>([]);
  const [selectedTrackA, setSelectedTrackA] = useState<TrackMetadata | null>(null);
  const [selectedTrackB, setSelectedTrackB] = useState<TrackMetadata | null>(null);
  const [crossfaderPosition, setCrossfaderPosition] = useState<number>(-1);
  const [volumeA, setVolumeA] = useState<number>(0.8);
  const [volumeB, setVolumeB] = useState<number>(0.8);
  const [showSpeedMatcher, setShowSpeedMatcher] = useState(false);
  const [loading, setLoading] = useState(true);
  const announceRef = useRef<HTMLDivElement>(null);

  // Audio player hook
  const {
    isPlayingA,
    isPlayingB,
    togglePlayA,
    togglePlayB,
    hasStarted,
    start,
  } = useAudioPlayer({
    trackAUrl: selectedTrackA?.url,
    trackBUrl: selectedTrackB?.url,
    crossfaderPosition,
    volumeA,
    volumeB,
    onError: (error) => console.error('Audio error:', error),
  });

  // Announce playback state changes to screen readers
  const announce = (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
    }
  };

  // Announce when playback state changes
  useEffect(() => {
    if (isPlayingA) {
      announce(`DJ Dog deck is now playing ${selectedTrackA?.title || 'track'}`);
    } else if (selectedTrackA) {
      announce('DJ Dog deck paused');
    }
  }, [isPlayingA, selectedTrackA]);

  useEffect(() => {
    if (isPlayingB) {
      announce(`DJ Cat deck is now playing ${selectedTrackB?.title || 'track'}`);
    } else if (selectedTrackB) {
      announce('DJ Cat deck paused');
    }
  }, [isPlayingB, selectedTrackB]);

  // Load tracks metadata
  useEffect(() => {
    fetch('/audio/tracks-metadata.json')
      .then(res => res.json())
      .then(data => {
        // Add URL to each track
        const tracksWithUrls = data.tracks.map((track: TrackMetadata) => ({
          ...track,
          url: `/audio/${track.filename}`,
        }));

        setAllTracks(tracksWithUrls);
        if (tracksWithUrls.length > 0) {
          setSelectedTrackA(tracksWithUrls[0]);
          setSelectedTrackB(tracksWithUrls[1] || tracksWithUrls[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load tracks:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}>🎵</div>
        <div className={styles.loadingText}>Loading DJ Slammer...</div>
      </div>
    );
  }

  if (allTracks.length === 0) {
    return (
      <div className={styles.error}>
        No tracks found! Make sure tracks-metadata.json is in the public/audio folder.
      </div>
    );
  }

  const trackA = selectedTrackA || allTracks[0];
  const trackB = selectedTrackB || allTracks[1];

  // Show start screen first (requires user gesture for audio)
  if (!hasStarted) {
    return (
      <div className={styles.startScreen}>
        <div className={styles.startContent}>
          <div className={styles.startEmoji}>🎧</div>
          <h1 className={styles.startTitle}>DJ Slammer - Slammer Mode!</h1>
          <p className={styles.startText}>
            Ready to drop some beats and mix like a pro?
          </p>
          <button className={styles.startButton} onClick={start}>
            🎵 Let's Slam! 🎮
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Screen reader announcements */}
      <div
        ref={announceRef}
        className="sr-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>🎧 DJ Slammer - Slammer Mode 🎮</h1>
        <div className={styles.subtitle}>Master the decks. Drop the beats.</div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Column - Track Selection & Info */}
        <div className={styles.leftColumn}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Deck A - DJ Dog 🐕</h2>
            <div className={styles.trackList}>
              {allTracks.slice(0, 6).map(track => (
                <button
                  key={track.id}
                  className={`${styles.trackButton} ${
                    selectedTrackA?.id === track.id ? styles.trackButtonSelected : ''
                  }`}
                  onClick={() => setSelectedTrackA(track)}
                  aria-label={`Select ${track.title} for DJ Dog deck, ${track.bpm} BPM in ${track.key}`}
                  aria-pressed={selectedTrackA?.id === track.id}
                >
                  <div
                    className={styles.keyDot}
                    style={{ backgroundColor: track.keyColor }}
                  />
                  <div className={styles.trackButtonText}>
                    <div className={styles.trackButtonTitle}>{track.title}</div>
                    <div className={styles.trackButtonInfo}>
                      {track.key} • {track.bpm} BPM
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              className={`${styles.playButton} ${isPlayingA ? styles.playButtonActive : ''}`}
              onClick={togglePlayA}
              aria-label={`${isPlayingA ? 'Pause' : 'Play'} DJ Dog deck`}
              aria-pressed={isPlayingA}
            >
              {isPlayingA ? '⏸️ Pause' : '▶️ Drop'} DJ Dog
            </button>

            {/* Volume Control for Deck A */}
            <div className={styles.volumeControlSection}>
              <label className={styles.volumeLabel} htmlFor="volume-deck-a">DJ Dog Volume 🔊</label>
              <div className={styles.volumeSliderContainer}>
                <span className={styles.volumeIcon} aria-hidden="true">🔉</span>
                <input
                  id="volume-deck-a"
                  type="range"
                  min="0"
                  max="100"
                  value={volumeA * 100}
                  onChange={(e) => setVolumeA(parseFloat(e.target.value) / 100)}
                  className={styles.volumeSlider}
                  aria-label={`DJ Dog volume: ${Math.round(volumeA * 100)} percent`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(volumeA * 100)}
                  style={{
                    background: `linear-gradient(to right, #FF6B9D 0%, #FF6B9D ${volumeA * 100}%, rgba(255, 255, 255, 0.1) ${volumeA * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                  }}
                />
                <span className={styles.volumeIcon} aria-hidden="true">🔊</span>
              </div>
              <div className={styles.volumeDisplay} aria-hidden="true">{Math.round(volumeA * 100)}%</div>
            </div>
          </div>

          {/* Current Track Info */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Deck A - On Air</h2>
            <TrackInfo track={selectedTrackA} size="large" showDetailedInfo />
          </div>
        </div>

        {/* Right Column - DJ Cat's Song */}
        <div className={styles.rightColumn}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Deck B - DJ Cat 🐱</h2>
            <div className={styles.trackList}>
              {allTracks.slice(6, 12).map(track => (
                <button
                  key={track.id}
                  className={`${styles.trackButton} ${
                    selectedTrackB?.id === track.id ? styles.trackButtonSelectedB : ''
                  }`}
                  onClick={() => setSelectedTrackB(track)}
                  aria-label={`Select ${track.title} for DJ Cat deck, ${track.bpm} BPM in ${track.key}`}
                  aria-pressed={selectedTrackB?.id === track.id}
                >
                  <div
                    className={styles.keyDot}
                    style={{ backgroundColor: track.keyColor }}
                  />
                  <div className={styles.trackButtonText}>
                    <div className={styles.trackButtonTitle}>{track.title}</div>
                    <div className={styles.trackButtonInfo}>
                      {track.key} • {track.bpm} BPM
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              className={`${styles.playButton} ${styles.playButtonB} ${
                isPlayingB ? styles.playButtonActiveB : ''
              }`}
              onClick={togglePlayB}
              aria-label={`${isPlayingB ? 'Pause' : 'Play'} DJ Cat deck`}
              aria-pressed={isPlayingB}
            >
              {isPlayingB ? '⏸️ Pause' : '▶️ Drop'} DJ Cat
            </button>

            {/* Volume Control for Deck B */}
            <div className={styles.volumeControlSection}>
              <label className={styles.volumeLabel} htmlFor="volume-deck-b">DJ Cat Volume 🔊</label>
              <div className={styles.volumeSliderContainer}>
                <span className={styles.volumeIcon} aria-hidden="true">🔉</span>
                <input
                  id="volume-deck-b"
                  type="range"
                  min="0"
                  max="100"
                  value={volumeB * 100}
                  onChange={(e) => setVolumeB(parseFloat(e.target.value) / 100)}
                  className={styles.volumeSlider}
                  aria-label={`DJ Cat volume: ${Math.round(volumeB * 100)} percent`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(volumeB * 100)}
                  style={{
                    background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${volumeB * 100}%, rgba(255, 255, 255, 0.1) ${volumeB * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                  }}
                />
                <span className={styles.volumeIcon} aria-hidden="true">🔊</span>
              </div>
              <div className={styles.volumeDisplay} aria-hidden="true">{Math.round(volumeB * 100)}%</div>
            </div>
          </div>

          {/* DJ Cat Track Info */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Deck B - On Air</h2>
            <TrackInfo track={selectedTrackB} size="large" showDetailedInfo />
          </div>
        </div>
      </div>

      {/* Crossfader Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Crossfader - Blend Your Mix 🎚️</h2>
        <CharacterCrossfader
          position={crossfaderPosition}
          onPositionChange={setCrossfaderPosition}
          leftLabel={`${trackA.title.slice(0, 15)}...`}
          rightLabel={`${trackB.title.slice(0, 15)}...`}
        />
      </div>

      {/* Game Buttons */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>DJ Training 🎮</h2>
        <div className={styles.gameButtons}>
          <button
            className={styles.gameButton}
            onClick={() => setShowSpeedMatcher(true)}
            aria-label="Start BPM Sync Master game to practice matching tempo"
          >
            <div className={styles.gameButtonEmoji} aria-hidden="true">⚡</div>
            <div className={styles.gameButtonTitle}>BPM Sync Master</div>
            <div className={styles.gameButtonDesc}>Match the tempo!</div>
          </button>

          <button className={styles.gameButton} disabled aria-label="Key Harmony Wheel game - Coming soon">
            <div className={styles.gameButtonEmoji} aria-hidden="true">🎵</div>
            <div className={styles.gameButtonTitle}>Key Harmony Wheel</div>
            <div className={styles.gameButtonDesc}>Coming soon!</div>
          </button>

          <button className={styles.gameButton} disabled aria-label="Beat Drop Trainer game - Coming soon">
            <div className={styles.gameButtonEmoji} aria-hidden="true">🎯</div>
            <div className={styles.gameButtonTitle}>Beat Drop Trainer</div>
            <div className={styles.gameButtonDesc}>Coming soon!</div>
          </button>
        </div>
      </div>

      {/* Speed Matcher Game */}
      {showSpeedMatcher && (
        <SpeedMatcher
          trackA={trackA}
          trackB={trackB}
          onSuccess={() => {
            console.log('Speed matched successfully!');
          }}
          onClose={() => setShowSpeedMatcher(false)}
        />
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerText}>
          🎵 DJ Slammer v1.0 - Slammer Mode 🎮
        </div>
      </div>
    </div>
  );
};

export default KidsModeDemo;
