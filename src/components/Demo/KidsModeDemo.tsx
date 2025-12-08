/**
 * Slammer Mode Demo
 *
 * Age-appropriate DJ training mode with professional concepts
 */

import React, { useState, useEffect } from 'react';
import { TrackMetadata } from '../VirtualDJDeck/types';
import TrackInfo from '../VirtualDJDeck/TrackInfo';
import SpeedMatcher from '../Games/SpeedMatcher';
import CharacterCrossfader from '../Games/CharacterCrossfader';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

export const KidsModeDemo: React.FC = () => {
  const [allTracks, setAllTracks] = useState<TrackMetadata[]>([]);
  const [selectedTrackA, setSelectedTrackA] = useState<TrackMetadata | null>(null);
  const [selectedTrackB, setSelectedTrackB] = useState<TrackMetadata | null>(null);
  const [crossfaderPosition, setCrossfaderPosition] = useState<number>(-1);
  const [volumeA, setVolumeA] = useState<number>(0.8);
  const [volumeB, setVolumeB] = useState<number>(0.8);
  const [showSpeedMatcher, setShowSpeedMatcher] = useState(false);
  const [loading, setLoading] = useState(true);

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
      <div style={styles.loading}>
        <div style={styles.loadingSpinner}>🎵</div>
        <div style={styles.loadingText}>Loading DJ Slammer...</div>
      </div>
    );
  }

  if (allTracks.length === 0) {
    return (
      <div style={styles.error}>
        No tracks found! Make sure tracks-metadata.json is in the public/audio folder.
      </div>
    );
  }

  const trackA = selectedTrackA || allTracks[0];
  const trackB = selectedTrackB || allTracks[1];

  // Show start screen first (requires user gesture for audio)
  if (!hasStarted) {
    return (
      <div style={styles.startScreen}>
        <div style={styles.startContent}>
          <div style={styles.startEmoji}>🎧</div>
          <h1 style={styles.startTitle}>DJ Slammer - Slammer Mode!</h1>
          <p style={styles.startText}>
            Ready to drop some beats and mix like a pro?
          </p>
          <button style={styles.startButton} onClick={start}>
            🎵 Let's Slam! 🎮
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🎧 DJ Slammer - Slammer Mode 🎮</h1>
        <div style={styles.subtitle}>Master the decks. Drop the beats.</div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Column - Track Selection & Info */}
        <div style={styles.leftColumn}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Deck A - DJ Dog 🐕</h2>
            <div style={styles.trackList}>
              {allTracks.slice(0, 6).map(track => (
                <div
                  key={track.id}
                  style={{
                    ...styles.trackButton,
                    backgroundColor:
                      selectedTrackA?.id === track.id
                        ? 'rgba(255, 107, 157, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      selectedTrackA?.id === track.id
                        ? '2px solid #FF6B9D'
                        : '2px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onClick={() => setSelectedTrackA(track)}
                >
                  <div
                    style={{
                      ...styles.keyDot,
                      backgroundColor: track.keyColor,
                    }}
                  />
                  <div style={styles.trackButtonText}>
                    <div style={styles.trackButtonTitle}>{track.title}</div>
                    <div style={styles.trackButtonInfo}>
                      {track.key} • {track.bpm} BPM
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={{
                ...styles.playButton,
                backgroundColor: isPlayingA ? '#FF6B9D' : 'rgba(255, 107, 157, 0.2)',
              }}
              onClick={togglePlayA}
            >
              {isPlayingA ? '⏸️ Pause' : '▶️ Drop'} DJ Dog
            </button>

            {/* Volume Control for Deck A */}
            <div style={styles.volumeControlSection}>
              <label style={styles.volumeLabel}>DJ Dog Volume 🔊</label>
              <div style={styles.volumeSliderContainer}>
                <span style={styles.volumeIcon}>🔉</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumeA * 100}
                  onChange={(e) => setVolumeA(parseFloat(e.target.value) / 100)}
                  className="volumeSlider"
                  style={{
                    ...styles.volumeSlider,
                    background: `linear-gradient(to right, #FF6B9D 0%, #FF6B9D ${volumeA * 100}%, rgba(255, 255, 255, 0.1) ${volumeA * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                  }}
                />
                <span style={styles.volumeIcon}>🔊</span>
              </div>
              <div style={styles.volumeDisplay}>{Math.round(volumeA * 100)}%</div>
            </div>
          </div>

          {/* Current Track Info */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Deck A - On Air</h2>
            <TrackInfo track={selectedTrackA} size="large" showDetailedInfo />
          </div>
        </div>

        {/* Right Column - DJ Cat's Song */}
        <div style={styles.rightColumn}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Deck B - DJ Cat 🐱</h2>
            <div style={styles.trackList}>
              {allTracks.slice(6, 12).map(track => (
                <div
                  key={track.id}
                  style={{
                    ...styles.trackButton,
                    backgroundColor:
                      selectedTrackB?.id === track.id
                        ? 'rgba(76, 175, 80, 0.3)'
                        : 'rgba(255, 255, 255, 0.05)',
                    border:
                      selectedTrackB?.id === track.id
                        ? '2px solid #4CAF50'
                        : '2px solid rgba(255, 255, 255, 0.1)',
                  }}
                  onClick={() => setSelectedTrackB(track)}
                >
                  <div
                    style={{
                      ...styles.keyDot,
                      backgroundColor: track.keyColor,
                    }}
                  />
                  <div style={styles.trackButtonText}>
                    <div style={styles.trackButtonTitle}>{track.title}</div>
                    <div style={styles.trackButtonInfo}>
                      {track.key} • {track.bpm} BPM
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={{
                ...styles.playButton,
                backgroundColor: isPlayingB ? '#4CAF50' : 'rgba(76, 175, 80, 0.2)',
              }}
              onClick={togglePlayB}
            >
              {isPlayingB ? '⏸️ Pause' : '▶️ Drop'} DJ Cat
            </button>

            {/* Volume Control for Deck B */}
            <div style={styles.volumeControlSection}>
              <label style={styles.volumeLabel}>DJ Cat Volume 🔊</label>
              <div style={styles.volumeSliderContainer}>
                <span style={styles.volumeIcon}>🔉</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volumeB * 100}
                  onChange={(e) => setVolumeB(parseFloat(e.target.value) / 100)}
                  className="volumeSlider"
                  style={{
                    ...styles.volumeSlider,
                    background: `linear-gradient(to right, #4CAF50 0%, #4CAF50 ${volumeB * 100}%, rgba(255, 255, 255, 0.1) ${volumeB * 100}%, rgba(255, 255, 255, 0.1) 100%)`,
                  }}
                />
                <span style={styles.volumeIcon}>🔊</span>
              </div>
              <div style={styles.volumeDisplay}>{Math.round(volumeB * 100)}%</div>
            </div>
          </div>

          {/* DJ Cat Track Info */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Deck B - On Air</h2>
            <TrackInfo track={selectedTrackB} size="large" showDetailedInfo />
          </div>
        </div>
      </div>

      {/* Crossfader Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Crossfader - Blend Your Mix 🎚️</h2>
        <CharacterCrossfader
          position={crossfaderPosition}
          onPositionChange={setCrossfaderPosition}
          leftLabel={`${trackA.title.slice(0, 15)}...`}
          rightLabel={`${trackB.title.slice(0, 15)}...`}
        />
      </div>

      {/* Game Buttons */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>DJ Training 🎮</h2>
        <div style={styles.gameButtons}>
          <button
            style={styles.gameButton}
            onClick={() => setShowSpeedMatcher(true)}
          >
            <div style={styles.gameButtonEmoji}>⚡</div>
            <div style={styles.gameButtonTitle}>BPM Sync Master</div>
            <div style={styles.gameButtonDesc}>Match the tempo!</div>
          </button>

          <button style={styles.gameButton} disabled>
            <div style={styles.gameButtonEmoji}>🎵</div>
            <div style={styles.gameButtonTitle}>Key Harmony Wheel</div>
            <div style={styles.gameButtonDesc}>Coming soon!</div>
          </button>

          <button style={styles.gameButton} disabled>
            <div style={styles.gameButtonEmoji}>🎯</div>
            <div style={styles.gameButtonTitle}>Beat Drop Trainer</div>
            <div style={styles.gameButtonDesc}>Coming soon!</div>
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
      <div style={styles.footer}>
        <div style={styles.footerText}>
          🎵 DJ Slammer v1.0 - Slammer Mode 🎮
        </div>
      </div>

      {/* Volume Slider Styling */}
      <style>
        {`
          input[type="range"].volumeSlider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            border: 2px solid #333;
          }

          input[type="range"].volumeSlider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
            border: 2px solid #333;
          }
        `}
      </style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f1e',
    backgroundImage: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
    padding: '20px',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
  },
  startScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1e',
    backgroundImage: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
  },
  startContent: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '24px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '500px',
  },
  startEmoji: {
    fontSize: '96px',
    marginBottom: '24px',
  },
  startTitle: {
    fontSize: '36px',
    margin: '0 0 16px 0',
    background: 'linear-gradient(135deg, #FF6B9D, #4CAF50, #64C8FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  startText: {
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '32px',
  },
  startButton: {
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '20px 40px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    fontFamily: 'Arial, sans-serif',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1e',
  },
  loadingSpinner: {
    fontSize: '64px',
    animation: 'spin 2s linear infinite',
  },
  loadingText: {
    color: '#fff',
    fontSize: '20px',
    marginTop: '20px',
  },
  error: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f1e',
    color: '#ff6b6b',
    fontSize: '18px',
    padding: '40px',
    textAlign: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '48px',
    margin: '0 0 12px 0',
    background: 'linear-gradient(135deg, #FF6B9D, #4CAF50, #64C8FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '32px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '24px',
    margin: '0 0 20px 0',
    color: '#fff',
  },
  trackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  trackButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  keyDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    flexShrink: 0,
  },
  trackButtonText: {
    flex: 1,
    minWidth: 0,
  },
  trackButtonTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '2px',
  },
  trackButtonInfo: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  playButton: {
    width: '100%',
    marginTop: '12px',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Arial, sans-serif',
  },
  gameButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  gameButton: {
    backgroundColor: 'rgba(100, 200, 255, 0.1)',
    border: '2px solid rgba(100, 200, 255, 0.3)',
    borderRadius: '12px',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
  },
  gameButtonEmoji: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  gameButtonTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  gameButtonDesc: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '2px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
  },
  volumeControlSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  volumeLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif',
  },
  volumeSliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  volumeIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  volumeSlider: {
    flex: 1,
    height: '8px',
    borderRadius: '4px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
  },
  volumeDisplay: {
    textAlign: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
  },
};

export default KidsModeDemo;
