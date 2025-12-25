/**
 * TrackLibrary Component
 *
 * A shared track library inspired by Rekordbox DJ that allows users to:
 * - Upload their own audio files
 * - See a list of available tracks with BPM, key, and compatibility info
 * - Search and filter tracks
 * - See compatible tracks based on what's currently playing
 * - Load tracks onto Deck A or Deck B
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { DeckId, TrackMetadata } from './types';
import { useDeck } from './DeckContext';
import { useLibrary } from './library/LibraryContext';
import { detectBPM } from '../../utils/bpmDetection';
import {
  getCompatibleTracks,
  formatCompatibilityScore,
  TrackCompatibility,
} from './utils/trackCompatibility';
import styles from './TrackLibrary.module.css';

interface Track {
  id: string;
  name: string;
  artist?: string;
  url: string;
  bpm: number;
  isUserUploaded: boolean;
  duration?: number;
  /** Suggested cue points at musical phrase boundaries */
  suggestedCuePoints?: number[];
  /** Musical key (e.g., "A", "C#", "F") */
  key?: string;
  /** Key mode (major or minor) */
  keyMode?: 'major' | 'minor';
  /** Camelot wheel code (e.g., "1A", "12B") */
  camelotCode?: string;
  /** Color for key visualization */
  keyColor?: string;
  /** Array of compatible Camelot codes */
  compatibleKeys?: string[];
}

/** Track metadata from tracks-metadata.json */
interface TrackMetadataJSON {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  filename: string;
  cuePoints: number[];
  waveformColor: string;
  key: string;
  keyMode: string;
  camelotCode: string;
  keyColor: string;
  tempoCategory: string;
  compatibleKeys: string[];
}

/**
 * Parse track name to extract artist and title
 * Handles formats like "Artist - Title" or just "Title"
 */
function parseTrackName(name: string): { artist: string; title: string } {
  const separators = [' - ', ' – ', ' — ', ' by '];
  for (const sep of separators) {
    if (name.includes(sep)) {
      const [artist, ...rest] = name.split(sep);
      return { artist: artist.trim(), title: rest.join(sep).trim() };
    }
  }
  return { artist: 'Unknown Artist', title: name };
}

/**
 * Convert Track to TrackMetadata for compatibility engine
 */
function trackToMetadata(track: Track): TrackMetadata | null {
  if (!track.camelotCode || !track.key) return null;

  return {
    id: track.id,
    title: track.name,
    artist: track.artist || 'Unknown',
    bpm: track.bpm,
    duration: track.duration || 0,
    filename: track.url.split('/').pop() || '',
    url: track.url,
    cuePoints: track.suggestedCuePoints || [],
    waveformColor: '#00F0FF',
    key: track.key,
    keyMode: track.keyMode || 'major',
    camelotCode: track.camelotCode,
    keyColor: track.keyColor || '#FFFFFF',
    tempoCategory: track.bpm < 100 ? 'slow' : track.bpm < 130 ? 'medium' : 'fast',
    compatibleKeys: track.compatibleKeys || [],
  };
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
  const library = useLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tracks, setTracks] = useState<Track[]>(preloadedTracks);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompatibleOnly, setShowCompatibleOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'bpm' | 'key' | 'compatibility'>('bpm');

  // Get current playlist filter from library context
  const activePlaylist = library.activePlaylistId
    ? library.playlists.find(p => p.id === library.activePlaylistId)
    : null;

  // Get master deck track (whichever is playing with crossfader position)
  const getMasterTrack = useCallback((): Track | null => {
    const { deckAState, deckBState, crossfaderPosition } = deck;

    let masterDeckState = null;

    if (deckAState.isPlaying && deckBState.isPlaying) {
      masterDeckState = crossfaderPosition <= 0 ? deckAState : deckBState;
    } else if (deckAState.isPlaying) {
      masterDeckState = deckAState;
    } else if (deckBState.isPlaying) {
      masterDeckState = deckBState;
    }

    if (!masterDeckState) return null;

    const masterTrackName = masterDeckState.trackName;
    return tracks.find(t =>
      t.name === masterTrackName ||
      t.name.includes(masterTrackName) ||
      masterTrackName.includes(t.name)
    ) || null;
  }, [deck, tracks]);

  // Calculate compatible tracks based on master
  const compatibleTracks = useMemo((): TrackCompatibility[] => {
    const masterTrack = getMasterTrack();
    if (!masterTrack) return [];

    const masterMetadata = trackToMetadata(masterTrack);
    if (!masterMetadata) return [];

    const allMetadata = tracks
      .map(trackToMetadata)
      .filter((m): m is TrackMetadata => m !== null);

    return getCompatibleTracks(masterMetadata, allMetadata, {
      minScore: 40,
      limit: 20,
      excludeReference: true,
    });
  }, [tracks, getMasterTrack]);

  // Create a map of track IDs to their compatibility info
  const compatibilityMap = useMemo(() => {
    const map = new Map<string, TrackCompatibility>();
    compatibleTracks.forEach(compat => {
      map.set(compat.track.id, compat);
    });
    return map;
  }, [compatibleTracks]);

  // Load track metadata from JSON to enrich tracks with cue points and key info
  useEffect(() => {
    if (metadataLoaded) return;

    const abortController = new AbortController();

    async function loadMetadata() {
      try {
        const response = await fetch('/audio/tracks-metadata.json', {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        if (!response.ok) {
          console.warn('[TrackLibrary] Could not load tracks metadata');
          return;
        }
        const data = await response.json() as { tracks: TrackMetadataJSON[] };

        if (abortController.signal.aborted) return;

        const metadataByFilename = new Map<string, TrackMetadataJSON>();
        data.tracks.forEach(meta => {
          metadataByFilename.set(meta.filename, meta);
        });

        // Enrich tracks with metadata (cue points, BPM, key info)
        setTracks(prev => prev.map(track => {
          const filename = track.url.split('/').pop() || '';
          const meta = metadataByFilename.get(filename);

          if (meta) {
            return {
              ...track,
              bpm: meta.bpm,
              duration: meta.duration,
              suggestedCuePoints: meta.cuePoints,
              artist: meta.artist,
              name: meta.title,
              key: meta.key,
              keyMode: meta.keyMode as 'major' | 'minor',
              camelotCode: meta.camelotCode,
              keyColor: meta.keyColor,
              compatibleKeys: meta.compatibleKeys,
            };
          }
          return track;
        }));

        setMetadataLoaded(true);
        console.log('[TrackLibrary] Loaded metadata for', data.tracks.length, 'tracks');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.warn('[TrackLibrary] Error loading track metadata:', err);
      }
    }

    loadMetadata();

    return () => {
      abortController.abort();
    };
  }, [metadataLoaded]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      tracks.forEach(track => {
        if (track.isUserUploaded && track.url.startsWith('blob:')) {
          URL.revokeObjectURL(track.url);
        }
      });
    };
  }, [tracks]);

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let result = [...tracks];

    // Playlist filter (from sidebar selection)
    if (activePlaylist) {
      const playlistTrackIds = new Set(activePlaylist.trackIds);
      result = result.filter(track => playlistTrackIds.has(track.id));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(track =>
        track.name.toLowerCase().includes(query) ||
        (track.artist && track.artist.toLowerCase().includes(query)) ||
        (track.camelotCode && track.camelotCode.toLowerCase().includes(query))
      );
    }

    // Compatible only filter
    if (showCompatibleOnly && getMasterTrack()) {
      const compatibleIds = new Set(compatibleTracks.map(c => c.track.id));
      result = result.filter(track => compatibleIds.has(track.id));
    }

    // Sort
    switch (sortBy) {
      case 'bpm':
        result.sort((a, b) => a.bpm - b.bpm);
        break;
      case 'key':
        result.sort((a, b) => (a.camelotCode || 'ZZZ').localeCompare(b.camelotCode || 'ZZZ'));
        break;
      case 'compatibility':
        result.sort((a, b) => {
          const compatA = compatibilityMap.get(a.id)?.overallScore || 0;
          const compatB = compatibilityMap.get(b.id)?.overallScore || 0;
          return compatB - compatA;
        });
        break;
      case 'name':
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [tracks, activePlaylist, searchQuery, showCompatibleOnly, sortBy, getMasterTrack, compatibleTracks, compatibilityMap]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        if (!file.type.startsWith('audio/')) {
          setUploadProgress(`Skipping ${file.name} - not an audio file`);
          continue;
        }

        setUploadProgress(`Processing ${file.name}...`);

        const url = URL.createObjectURL(file);

        setUploadProgress(`Detecting BPM for ${file.name}...`);
        let bpm = 120;
        try {
          const detectedBPM = await detectBPM(url);
          if (detectedBPM && detectedBPM > 60 && detectedBPM < 200) {
            bpm = Math.round(detectedBPM);
          }
        } catch (bpmError) {
          console.warn('Could not detect BPM, using default:', bpmError);
        }

        const track: Track = {
          id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Load track onto a deck
  const loadTrackToDeck = useCallback(async (track: Track, deckId: DeckId) => {
    try {
      const { artist, title } = track.artist
        ? { artist: track.artist, title: track.name }
        : parseTrackName(track.name);

      await deck.loadTrack(deckId, {
        url: track.url,
        name: title,
        artist: artist,
        bpm: track.bpm,
        cuePoint: 0,
        suggestedCuePoints: track.suggestedCuePoints,
      });
      onTrackLoaded?.(deckId, track);
      setSelectedTrack(null);
    } catch (error) {
      console.error(`Error loading track to deck ${deckId}:`, error);
    }
  }, [deck, onTrackLoaded]);

  const handleTrackClick = (trackId: string) => {
    setSelectedTrack(selectedTrack === trackId ? null : trackId);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeTrack = useCallback((trackId: string) => {
    setTracks(prev => {
      const trackToRemove = prev.find(t => t.id === trackId);

      if (trackToRemove?.isUserUploaded && trackToRemove.url.startsWith('blob:')) {
        URL.revokeObjectURL(trackToRemove.url);
      }

      return prev.filter(t => t.id !== trackId);
    });

    if (selectedTrack === trackId) {
      setSelectedTrack(null);
    }
  }, [selectedTrack]);

  const masterTrack = getMasterTrack();
  const hasCompatibilityData = compatibleTracks.length > 0;

  // Display title: show playlist name if selected, otherwise "All Tracks" or "Track Library"
  const displayTitle = activePlaylist
    ? activePlaylist.name
    : library.activeView === 'collection'
      ? 'All Tracks'
      : 'Track Library';

  const displayCount = activePlaylist
    ? `${filteredTracks.length} of ${activePlaylist.trackIds.length}`
    : `${filteredTracks.length} tracks`;

  return (
    <div className={`${styles.container} ${isExpanded ? styles.expanded : ''} ${className || ''}`}>
      {/* Header with toggle */}
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.headerIcon}>{activePlaylist ? '📋' : '🎵'}</span>
        <span className={styles.headerTitle}>{displayTitle}</span>
        <span className={styles.trackCount}>{displayCount}</span>
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {/* Search and filter section */}
          <div className={styles.searchSection}>
            <input
              type="text"
              placeholder="Search tracks, artists, or keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search tracks"
            />

            <div className={styles.filterRow}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className={styles.sortSelect}
                aria-label="Sort by"
              >
                <option value="name">Name</option>
                <option value="bpm">BPM</option>
                <option value="key">Key</option>
                {hasCompatibilityData && <option value="compatibility">Best Match</option>}
              </select>

              {masterTrack && (
                <label className={styles.filterCheckbox}>
                  <input
                    type="checkbox"
                    checked={showCompatibleOnly}
                    onChange={(e) => setShowCompatibleOnly(e.target.checked)}
                  />
                  <span>Compatible only</span>
                </label>
              )}
            </div>
          </div>

          {/* Compatible tracks recommendation */}
          {masterTrack && compatibleTracks.length > 0 && (
            <div className={styles.compatibleSection}>
              <div className={styles.compatibleHeader}>
                <span className={styles.compatibleIcon}>🎯</span>
                <span>Matches for "{masterTrack.name.slice(0, 20)}..."</span>
              </div>
              <div className={styles.compatibleList}>
                {compatibleTracks.slice(0, 3).map(compat => (
                  <button
                    key={compat.track.id}
                    className={styles.compatibleItem}
                    onClick={() => {
                      const track = tracks.find(t => t.id === compat.track.id);
                      if (track) {
                        const targetDeck = deck.deckAState.isPlaying ? 'B' : 'A';
                        loadTrackToDeck(track, targetDeck);
                      }
                    }}
                  >
                    <span className={styles.compatScore}>
                      {formatCompatibilityScore(compat.overallScore)}
                    </span>
                    <span className={styles.compatName}>{compat.track.title}</span>
                    <span className={styles.compatInfo}>
                      {compat.track.bpm} • {compat.track.camelotCode}
                    </span>
                    <span className={styles.compatPercent}>{compat.overallScore}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
            {filteredTracks.map(track => {
              const compatibility = compatibilityMap.get(track.id);

              return (
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
                    <span className={styles.trackBPM}>{track.bpm}</span>
                    {track.camelotCode && (
                      <span
                        className={styles.trackKey}
                        style={{ backgroundColor: track.keyColor || '#666' }}
                        title={`${track.key} ${track.keyMode}`}
                      >
                        {track.camelotCode}
                      </span>
                    )}
                    {compatibility && (
                      <span className={styles.trackCompat} title={compatibility.mixTip}>
                        {formatCompatibilityScore(compatibility.overallScore)}
                      </span>
                    )}
                  </button>

                  {/* Remove button for user-uploaded tracks */}
                  {track.isUserUploaded && (
                    <button
                      className={styles.removeButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTrack(track.id);
                      }}
                      title="Remove track"
                      aria-label={`Remove ${track.name}`}
                    >
                      ×
                    </button>
                  )}

                  {/* Deck selection and playlist buttons */}
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
                      {/* Add to playlist dropdown */}
                      {library.playlists.length > 0 && (
                        <select
                          className={styles.addToPlaylistSelect}
                          onChange={(e) => {
                            if (e.target.value) {
                              library.addToPlaylist([track.id], e.target.value);
                              e.target.value = '';
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          defaultValue=""
                          title="Add to playlist"
                        >
                          <option value="" disabled>+ Playlist</option>
                          {library.playlists.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Help text */}
          <p className={styles.helpText}>
            {masterTrack
              ? `🎯 Play a track to see compatible matches!`
              : 'Click a track to load it. Play one to see matching tracks!'}
          </p>
        </div>
      )}
    </div>
  );
}
