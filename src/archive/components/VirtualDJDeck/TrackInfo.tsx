/**
 * TrackInfo Component
 *
 * Displays track information with kid-friendly key badges and tempo indicators
 */

import React from 'react';
import { TrackMetadata } from './types';
import { getTempoEmoji, getTempoLabel } from '../../utils/harmonicMixing';

interface TrackInfoProps {
  track: TrackMetadata | null;
  showDetailedInfo?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const TrackInfo: React.FC<TrackInfoProps> = ({
  track,
  showDetailedInfo = false,
  size = 'medium',
}) => {
  if (!track) {
    return (
      <div style={styles.container}>
        <div style={styles.noTrack}>No track loaded</div>
      </div>
    );
  }

  const sizeStyles = getSizeStyles(size);

  return (
    <div style={{ ...styles.container, ...sizeStyles.container }}>
      {/* Key Badge */}
      <div
        style={{
          ...styles.keyBadge,
          ...sizeStyles.keyBadge,
          backgroundColor: track.keyColor,
        }}
      >
        <div style={{ ...styles.keyLabel, ...sizeStyles.keyLabel }}>
          {track.key}
        </div>
        {showDetailedInfo && (
          <div style={styles.camelotCode}>{track.camelotCode}</div>
        )}
      </div>

      {/* Track Info */}
      <div style={styles.info}>
        <div style={{ ...styles.title, ...sizeStyles.title }}>{track.title}</div>
        <div style={{ ...styles.artist, ...sizeStyles.artist }}>{track.artist}</div>

        {/* BPM and Tempo */}
        <div style={styles.metadata}>
          <div style={styles.bpmContainer}>
            <span style={{ ...styles.tempoEmoji, ...sizeStyles.tempoEmoji }}>
              {getTempoEmoji(track.tempoCategory)}
            </span>
            <span style={{ ...styles.bpm, ...sizeStyles.bpm }}>{track.bpm} BPM</span>
          </div>
          {showDetailedInfo && (
            <div style={styles.tempoLabel}>
              {getTempoLabel(track.tempoCategory)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getSizeStyles(size: 'small' | 'medium' | 'large') {
  const sizes = {
    small: {
      container: { padding: '8px', gap: '8px' },
      keyBadge: { width: '40px', height: '40px', borderRadius: '8px' },
      keyLabel: { fontSize: '16px' },
      title: { fontSize: '12px' },
      artist: { fontSize: '10px' },
      bpm: { fontSize: '11px' },
      tempoEmoji: { fontSize: '14px' },
    },
    medium: {
      container: { padding: '12px', gap: '12px' },
      keyBadge: { width: '60px', height: '60px', borderRadius: '12px' },
      keyLabel: { fontSize: '24px' },
      title: { fontSize: '16px' },
      artist: { fontSize: '13px' },
      bpm: { fontSize: '14px' },
      tempoEmoji: { fontSize: '18px' },
    },
    large: {
      container: { padding: '16px', gap: '16px' },
      keyBadge: { width: '80px', height: '80px', borderRadius: '16px' },
      keyLabel: { fontSize: '32px' },
      title: { fontSize: '20px' },
      artist: { fontSize: '16px' },
      bpm: { fontSize: '16px' },
      tempoEmoji: { fontSize: '24px' },
    },
  };

  return sizes[size];
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  noTrack: {
    padding: '20px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
  },
  keyBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    border: '3px solid rgba(255, 255, 255, 0.8)',
  },
  keyLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
  },
  camelotCode: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    marginTop: '2px',
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artist: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Arial, sans-serif',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metadata: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
  },
  bpmContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tempoEmoji: {
    lineHeight: 1,
  },
  bpm: {
    color: '#fff',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  tempoLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Arial, sans-serif',
  },
};

export default TrackInfo;
