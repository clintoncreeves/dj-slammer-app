/**
 * CompatibleTracks Component
 *
 * Shows "friend songs" that are compatible with the currently playing track
 * Kid-friendly UI with visual indicators
 */

import React from 'react';
import { TrackMetadata } from './types';
import {
  getCompatibleTracks,
  getKidFriendlyCompatibilityReason,
  CompatibilityLevel,
  getTempoEmoji,
} from '../../utils/harmonicMixing';

interface CompatibleTracksProps {
  currentTrack: TrackMetadata | null;
  allTracks: TrackMetadata[];
  onTrackSelect?: (track: TrackMetadata) => void;
  maxTracks?: number;
}

export const CompatibleTracks: React.FC<CompatibleTracksProps> = ({
  currentTrack,
  allTracks,
  onTrackSelect,
  maxTracks = 5,
}) => {
  if (!currentTrack) {
    return (
      <div style={styles.container}>
        <h3 style={styles.header}>Friend Songs 🎵</h3>
        <div style={styles.emptyState}>
          Play a song to see which songs are friends!
        </div>
      </div>
    );
  }

  const compatibleTracks = getCompatibleTracks(currentTrack, allTracks, 60).slice(
    0,
    maxTracks
  );

  if (compatibleTracks.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.header}>Friend Songs 🎵</h3>
        <div style={styles.emptyState}>
          No highly compatible songs found. Try different tracks!
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.header}>
        Friend Songs for <span style={{ color: currentTrack.keyColor }}>{currentTrack.key}</span>{' '}
        🎵
      </h3>
      <div style={styles.trackList}>
        {compatibleTracks.map((track, index) => (
          <div
            key={track.id}
            style={styles.trackItem}
            onClick={() => onTrackSelect?.(track)}
          >
            {/* Rank Badge */}
            <div style={styles.rankBadge}>#{index + 1}</div>

            {/* Key Badge */}
            <div
              style={{
                ...styles.keyBadge,
                backgroundColor: track.keyColor,
              }}
            >
              {track.key}
            </div>

            {/* Track Info */}
            <div style={styles.trackInfo}>
              <div style={styles.trackTitle}>{track.title}</div>
              <div style={styles.trackMeta}>
                <span style={styles.tempoEmoji}>{getTempoEmoji(track.tempoCategory)}</span>
                <span style={styles.bpm}>{track.bpm} BPM</span>
              </div>
            </div>

            {/* Compatibility Stars */}
            <div style={styles.compatibilityStars}>
              {getStarsForLevel(track.compatibilityLevel)}
            </div>

            {/* Compatibility Score */}
            <div
              style={{
                ...styles.scoreCircle,
                backgroundColor: getScoreColor(track.compatibilityScore),
              }}
            >
              {track.compatibilityScore}
            </div>
          </div>
        ))}
      </div>

      {/* Why they're friends */}
      {compatibleTracks.length > 0 && (
        <div style={styles.explanation}>
          <strong>Why are they friends?</strong>
          <br />
          {getKidFriendlyCompatibilityReason(currentTrack, compatibleTracks[0])}
        </div>
      )}
    </div>
  );
};

function getStarsForLevel(level: CompatibilityLevel): string {
  switch (level) {
    case CompatibilityLevel.PERFECT:
      return '⭐⭐⭐';
    case CompatibilityLevel.EXCELLENT:
      return '⭐⭐⭐';
    case CompatibilityLevel.GOOD:
      return '⭐⭐';
    case CompatibilityLevel.OKAY:
      return '⭐';
    default:
      return '';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#4CAF50'; // Green
  if (score >= 75) return '#8BC34A'; // Light green
  if (score >= 60) return '#FFC107'; // Yellow
  return '#FF9800'; // Orange
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '12px',
    padding: '20px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '20px',
    marginBottom: '16px',
    marginTop: '0',
  },
  emptyState: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  trackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  trackItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  rankBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
  },
  keyBadge: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 'bold',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px',
  },
  trackMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tempoEmoji: {
    fontSize: '14px',
  },
  bpm: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  compatibilityStars: {
    fontSize: '16px',
  },
  scoreCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  explanation: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: 'rgba(100, 200, 255, 0.1)',
    borderRadius: '8px',
    border: '2px solid rgba(100, 200, 255, 0.3)',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    lineHeight: '1.5',
  },
};

export default CompatibleTracks;
