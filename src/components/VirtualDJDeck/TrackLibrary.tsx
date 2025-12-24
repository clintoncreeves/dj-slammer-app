/**
 * TrackLibrary Component
 *
 * A shared track library that allows users to:
 * - Upload their own audio files
 * - See a list of available tracks (uploaded + preloaded)
 * - Load tracks onto Deck A or Deck B
 */

import { useState, useRef, useCallback } from 'react';
import { DeckId } from './types';
import { useDeck } from './DeckContext';
import { detectBPM } from '../../utils/bpmDetection';
import styles from './TrackLibrary.module.css';

interface Track {
  id: string;
  name: string;
  url: string;
  bpm: number;
  isUserUploaded: boolean;
  duration?: number;
}

interface TrackLibraryProps {
  /** Pre-loaded tracks from the app */
  preloadedTracks?: Track[];
  /** Callback when a track is loaded onto a deck */
  onTrackLoaded?: (deck: DeckId, track: Track) => void;
  /** Additional CSS class */
  className?: string;
}

// Default preloaded tracks
const DEFAULT_TRACKS: Track[] = [
  { id: 'darkwave', name: 'Darkwave', url: '/audio/darkwave-454934.mp3', bpm: 128, isUserUploaded: false },
  { id: 'for-the-only-fan', name: 'For The Only Fan', url: '/audio/for-the-only-fan-456172.mp3', bpm: 124, isUserUploaded: false },
  { id: 'miami-beach', name: 'Miami Beach EDM', url: '/audio/miami-beach-edm-454166.mp3', bpm: 128, isUserUploaded: false },
  { id: 'pulse', name: 'Pulse', url: '/audio/pulse-456174.mp3', bpm: 126, isUserUploaded: false },
  { id: 'renegate', name: 'Renegate', url: '/audio/renegate-456176.mp3', bpm: 130, isUserUploaded: false },
  { id: 'santa-banta', name: 'Santa Banta Xmas', url: '/audio/santa-banta-compliments-of-the-season-merry-xmas-454954.mp3', bpm: 120, isUserUploaded: false },
  { id: 'vegas', name: 'Weekend in Vegas', url: '/audio/weekend-in-las-vegas-slap-house-background-music-for-video-stories-382430.mp3', bpm: 124, isUserUploaded: false },
];

export function TrackLibrary({
  preloadedTracks = DEFAULT_TRACKS,
  onTrackLoaded,
  className,
}: TrackLibraryProps) {
  const deck = useDeck();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tracks, setTracks] = useState<Track[]>(preloadedTracks);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
          setUploadProgress(`Skipping ${file.name} - not an audio file`);
          continue;
        }

        setUploadProgress(`Processing ${file.name}...`);

        // Create object URL for the file
        const url = URL.createObjectURL(file);

        // Detect BPM
        setUploadProgress(`Detecting BPM for ${file.name}...`);
        let bpm = 120; // Default BPM
        try {
          const detectedBPM = await detectBPM(url);
          if (detectedBPM && detectedBPM > 60 && detectedBPM < 200) {
            bpm = Math.round(detectedBPM);
          }
        } catch (bpmError) {
          console.warn('Could not detect BPM, using default:', bpmError);
        }

        // Create track entry
        const track: Track = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          url,
          bpm,
          isUserUploaded: true,
        };

        setTracks(prev => [...prev, track]);
        setUploadProgress(`Added ${file.name} (${bpm} BPM)`);
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploadProgress(`Error uploading ${file.name}`);
      }
    }

    setIsUploading(false);
    setUploadProgress('');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Load track onto a deck
  const loadTrackToDeck = useCallback(async (track: Track, deckId: DeckId) => {
    try {
      await deck.loadTrack(deckId, track.url, track.bpm, 0);
      onTrackLoaded?.(deckId, track);
      setSelectedTrack(null);
    } catch (error) {
      console.error(`Error loading track to deck ${deckId}:`, error);
    }
  }, [deck, onTrackLoaded]);

  // Handle track click - show deck selection
  const handleTrackClick = (trackId: string) => {
    setSelectedTrack(selectedTrack === trackId ? null : trackId);
  };

  // Trigger file input
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`${styles.container} ${isExpanded ? styles.expanded : ''} ${className || ''}`}>
      {/* Header with toggle */}
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.headerIcon}>🎵</span>
        <span className={styles.headerTitle}>Track Library</span>
        <span className={styles.trackCount}>{tracks.length} tracks</span>
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {/* Upload section */}
          <div className={styles.uploadSection}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileUpload}
              className={styles.fileInput}
              aria-label="Upload audio files"
            />
            <button
              className={styles.uploadButton}
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? '⏳ Processing...' : '📁 Upload Songs'}
            </button>
            {uploadProgress && (
              <span className={styles.uploadProgress}>{uploadProgress}</span>
            )}
          </div>

          {/* Track list */}
          <div className={styles.trackList}>
            {tracks.map(track => (
              <div
                key={track.id}
                className={`${styles.trackItem} ${selectedTrack === track.id ? styles.selected : ''}`}
              >
                <button
                  className={styles.trackInfo}
                  onClick={() => handleTrackClick(track.id)}
                >
                  <span className={styles.trackIcon}>
                    {track.isUserUploaded ? '📤' : '🎶'}
                  </span>
                  <span className={styles.trackName}>{track.name}</span>
                  <span className={styles.trackBPM}>{track.bpm} BPM</span>
                </button>

                {/* Deck selection buttons */}
                {selectedTrack === track.id && (
                  <div className={styles.deckButtons}>
                    <button
                      className={`${styles.deckButton} ${styles.deckA}`}
                      onClick={() => loadTrackToDeck(track, 'A')}
                      title="Load to Deck A"
                    >
                      Load A
                    </button>
                    <button
                      className={`${styles.deckButton} ${styles.deckB}`}
                      onClick={() => loadTrackToDeck(track, 'B')}
                      title="Load to Deck B"
                    >
                      Load B
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Help text */}
          <p className={styles.helpText}>
            Click a track to load it onto a deck. Upload your own MP3s to mix!
          </p>
        </div>
      )}
    </div>
  );
}
