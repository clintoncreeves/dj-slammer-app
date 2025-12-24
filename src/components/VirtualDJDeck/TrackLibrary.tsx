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

// Default preloaded tracks - all 57 tracks from /public/audio/
const DEFAULT_TRACKS: Track[] = [
  { id: 'alfarex-need-your-love', name: 'Alfarex - Need Your Love', url: '/audio/alfarex-need-your-love-royalty-free-music-166731.mp3', bpm: 128, isUserUploaded: false },
  { id: 'alone', name: 'Alone', url: '/audio/alone-296348.mp3', bpm: 120, isUserUploaded: false },
  { id: 'anthony-love-me', name: 'Anthony - Love Me', url: '/audio/anthony-love-me-royalty-free-music-177759.mp3', bpm: 124, isUserUploaded: false },
  { id: 'at-the-edge', name: 'At The Edge', url: '/audio/at-the-edge-450649.mp3', bpm: 126, isUserUploaded: false },
  { id: 'baby-mandala', name: 'Baby Mandala (Nepalese Drill)', url: '/audio/baby-mandala-nepalese-drill-music-169039.mp3', bpm: 140, isUserUploaded: false },
  { id: 'back-base', name: 'Back Base', url: '/audio/back-base-455019.mp3', bpm: 128, isUserUploaded: false },
  { id: 'bl-official-you', name: 'BL Official - You', url: '/audio/bl-official-you-royalty-free-music-177852.mp3', bpm: 126, isUserUploaded: false },
  { id: 'dance-gabino', name: 'Dance Gabino (Latin Slap House)', url: '/audio/dance-gabino-latin-slap-house-background-music-for-vlog-video-stories-382424.mp3', bpm: 124, isUserUploaded: false },
  { id: 'dance-until-dark', name: 'Dance Until Dark', url: '/audio/dance-until-dark-329026.mp3', bpm: 128, isUserUploaded: false },
  { id: 'darkwave', name: 'Darkwave', url: '/audio/darkwave-454934.mp3', bpm: 128, isUserUploaded: false },
  { id: 'davik-zyroz-fire', name: 'Davik x Zyroz - Fire', url: '/audio/davik-x-zyroz-fire-royalty-free-music-166955.mp3', bpm: 130, isUserUploaded: false },
  { id: 'drive-breakbeat', name: 'Drive Breakbeat', url: '/audio/drive-breakbeat-173062.mp3', bpm: 140, isUserUploaded: false },
  { id: 'dxyll-we-made-it', name: 'Dxyll - We Made It', url: '/audio/dxyll-we-made-it-royalty-free-music-166954.mp3', bpm: 128, isUserUploaded: false },
  { id: 'echoes-spiral', name: 'Echoes of the Spiral', url: '/audio/echoes-of-the-spiral-454559.mp3', bpm: 120, isUserUploaded: false },
  { id: 'echoes-yesterday', name: 'Echoes of Yesterday (Piano)', url: '/audio/echoes-of-yesterday-emotional-piano-227344.mp3', bpm: 80, isUserUploaded: false },
  { id: 'electric-hoedown', name: 'Electric Hoedown', url: '/audio/electric-hoedown-full-version-455917.mp3', bpm: 130, isUserUploaded: false },
  { id: 'fantasy-muszik', name: 'Fantasy Muszik - Mmafia', url: '/audio/fantasy-muszik-mmafia-royalty-free-music-174835.mp3', bpm: 126, isUserUploaded: false },
  { id: 'for-the-only-fan', name: 'For The Only Fan', url: '/audio/for-the-only-fan-456172.mp3', bpm: 124, isUserUploaded: false },
  { id: 'fragments-sound', name: 'Fragments of Sound', url: '/audio/fragments-of-sound-447906.mp3', bpm: 118, isUserUploaded: false },
  { id: 'future-bass-vlog', name: 'Future Bass Vlog', url: '/audio/future-bass-vlog-9693.mp3', bpm: 150, isUserUploaded: false },
  { id: 'futuristic-motivation', name: 'Futuristic Motivation Synthwave', url: '/audio/futuristic-motivation-synthwave-431078.mp3', bpm: 118, isUserUploaded: false },
  { id: 'gorila', name: 'Gorila', url: '/audio/gorila-315977.mp3', bpm: 128, isUserUploaded: false },
  { id: 'happy-summer', name: 'Happy Summer', url: '/audio/happy-summer-145530.mp3', bpm: 120, isUserUploaded: false },
  { id: 'i-will-be-here', name: 'I Will Be Here (Upbeat Pop EDM)', url: '/audio/i-will-be-here-upbeat-vlog-vocal-pop-edm-140857.mp3', bpm: 128, isUserUploaded: false },
  { id: 'infinity-motion', name: 'Infinity Motion', url: '/audio/infinity-motion-452867.mp3', bpm: 125, isUserUploaded: false },
  { id: 'kawaii-dance', name: 'Kawaii Dance (Anime EDM)', url: '/audio/kawaii-dance-upbeat-japan-anime-edm-242104.mp3', bpm: 160, isUserUploaded: false },
  { id: 'kosmo-all-i-need', name: 'Kosmo - All I Need', url: '/audio/kosmo-all-i-need-royalty-free-music-171753.mp3', bpm: 124, isUserUploaded: false },
  { id: 'legacy-tchaikovsky', name: 'Legacy of Tchaikovsky (Swan Lake House)', url: '/audio/legacy-of-tchaikovsky-swan-lake-house-background-music-for-video-vlog-398013.mp3', bpm: 124, isUserUploaded: false },
  { id: 'legendary-bach', name: 'Legendary Bach Badinerie House', url: '/audio/legendary-bach-badinerie-house-background-music-for-video-short-ver-394172.mp3', bpm: 126, isUserUploaded: false },
  { id: 'lofi-chill', name: 'Lofi Chill Commercial', url: '/audio/lofi-chill-commercial-fashion-vlog-140858.mp3', bpm: 90, isUserUploaded: false },
  { id: 'lukz-deserve-better', name: 'Lukz & Wily - Deserve Better', url: '/audio/lukz-amp-wily-amp-edward-jason-deserve-better-feat-mairy-164891.mp3', bpm: 128, isUserUploaded: false },
  { id: 'lusit-run-away', name: 'Lusit - Run Away', url: '/audio/lusit-run-away-royalty-free-music-168328.mp3', bpm: 126, isUserUploaded: false },
  { id: 'luthfi-without-you', name: 'Luthfi & Shirina - Without You', url: '/audio/luthfi-syach-amp-shirina-biswas-without-you-royalty-free-music-176255.mp3', bpm: 124, isUserUploaded: false },
  { id: 'miami-beach', name: 'Miami Beach EDM', url: '/audio/miami-beach-edm-454166.mp3', bpm: 128, isUserUploaded: false },
  { id: 'neon-overdrive', name: 'Neon Overdrive (Cyberpunk Gaming)', url: '/audio/neon-overdrive-cyberpunk-gaming-edm-415723.mp3', bpm: 140, isUserUploaded: false },
  { id: 'one-fury-bar', name: 'One Fury Bar - Walking Dead', url: '/audio/one-fury-bar-buried-walking-dead-royalty-free-music-170292.mp3', bpm: 130, isUserUploaded: false },
  { id: 'ootd-summer-house', name: 'OOTD Upbeat Summer House', url: '/audio/ootd-upbeat-summer-house-242100.mp3', bpm: 124, isUserUploaded: false },
  { id: 'ozee-not-what-i-need', name: 'Ozee - Not What I Need', url: '/audio/ozee-not-what-i-need-royalty-free-music-164888.mp3', bpm: 126, isUserUploaded: false },
  { id: 'party-music', name: 'Party Music', url: '/audio/party-music-348444.mp3', bpm: 128, isUserUploaded: false },
  { id: 'phanhung-closer', name: 'Phanhung & Flamez - Closer', url: '/audio/phanhung-amp-flamez-nguyen-closer-royalty-free-music-176250.mp3', bpm: 124, isUserUploaded: false },
  { id: 'pulse', name: 'Pulse', url: '/audio/pulse-456174.mp3', bpm: 126, isUserUploaded: false },
  { id: 'rayz-sweet-candy', name: 'Rayz - Sweet Candy', url: '/audio/rayz-amp-musicbyritchie7ta-sweet-candy-royalty-free-music-164890.mp3', bpm: 128, isUserUploaded: false },
  { id: 'remix', name: 'Remix', url: '/audio/remix-453493.mp3', bpm: 128, isUserUploaded: false },
  { id: 'renegate', name: 'Renegate', url: '/audio/renegate-456176.mp3', bpm: 130, isUserUploaded: false },
  { id: 'riding-blue-skies', name: 'Riding Through Blue Skies', url: '/audio/riding-through-blue-skies-298649.mp3', bpm: 120, isUserUploaded: false },
  { id: 'running-night', name: 'Running Night', url: '/audio/running-night-393139.mp3', bpm: 128, isUserUploaded: false },
  { id: 'ryva-deja-vu', name: 'Ryva - Deja Vu', url: '/audio/ryva-deja-vu-royalty-free-music-166957.mp3', bpm: 128, isUserUploaded: false },
  { id: 'samethoughts-let-me-fall', name: 'Samethoughts - Let Me Fall', url: '/audio/samethoughts-let-me-fall-feat-solina-173612.mp3', bpm: 124, isUserUploaded: false },
  { id: 'santa-banta', name: 'Santa Banta Xmas', url: '/audio/santa-banta-compliments-of-the-season-merry-xmas-454954.mp3', bpm: 120, isUserUploaded: false },
  { id: 'solar-dream', name: 'Solar Dream', url: '/audio/solar-dream-330894.mp3', bpm: 118, isUserUploaded: false },
  { id: 'the-maximus-for-you', name: 'The Maximus & Paultrixx - For You', url: '/audio/the-maximus-amp-paultrixx-for-you-royalty-free-music-166960.mp3', bpm: 128, isUserUploaded: false },
  { id: 'trance-no-copyright', name: 'Trance DJ Music', url: '/audio/trance-no-copyright-dj-music-440685.mp3', bpm: 138, isUserUploaded: false },
  { id: 'tropical-summer-pop', name: 'Tropical Summer Pop', url: '/audio/tropical-summer-pop-music-345813.mp3', bpm: 120, isUserUploaded: false },
  { id: 'ultra-line-love', name: 'Ultra Line - Love You Forever', url: '/audio/ultra-line-love-you-forever-royalty-free-music-177694.mp3', bpm: 126, isUserUploaded: false },
  { id: 'vivid-electronic', name: 'Vivid Inspiring Electronic', url: '/audio/vivid-inspiring-electronic-454158.mp3', bpm: 124, isUserUploaded: false },
  { id: 'vegas', name: 'Weekend in Vegas', url: '/audio/weekend-in-las-vegas-slap-house-background-music-for-video-stories-382430.mp3', bpm: 124, isUserUploaded: false },
  { id: 'will-deezy-cant-go-back', name: "Will Deezy - Can't Go Back", url: '/audio/will-deezy-canx27t-go-back-royalty-free-music-177835.mp3', bpm: 126, isUserUploaded: false },
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
