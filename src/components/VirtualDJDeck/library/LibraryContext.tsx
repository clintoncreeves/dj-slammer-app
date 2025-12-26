/**
 * Library Context - Track Organization & Playlist Management
 *
 * Inspired by Rekordbox DJ, this context manages:
 * - Playlists and folders
 * - Favorite banks (quick-access slots)
 * - Library filters and search
 * - Track tagging (colors, ratings)
 *
 * All state is persisted to localStorage for session continuity.
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { TrackMetadata } from '../types';

// ==========================================
// Type Definitions
// ==========================================

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  color?: string;
  order: number;
}

export interface Folder {
  id: string;
  name: string;
  playlistIds: string[];
  isExpanded: boolean;
  order: number;
}

export interface FavoriteBank {
  slot: number; // 1-9
  playlistId: string | null;
  label?: string;
}

export interface TrackTag {
  trackId: string;
  color?: string;
  rating?: number; // 1-5 stars
}

export interface LibraryFilters {
  bpmRange: { min: number; max: number } | null;
  keyMode: 'any' | 'compatible' | 'exact';
  referenceKey: string | null;
  genre: string | null;
  minEnergy: number | null;
  minRating: number | null;
  colors: string[];
}

export type SortColumn = 'title' | 'artist' | 'bpm' | 'key' | 'duration' | 'rating' | 'dateAdded';
export type SortDirection = 'asc' | 'desc';
export type ViewType = 'collection' | 'playlist' | 'browse';

// ==========================================
// Storage Keys
// ==========================================

const STORAGE_KEYS = {
  PLAYLISTS: 'djslammer-playlists',
  FOLDERS: 'djslammer-folders',
  FAVORITES: 'djslammer-favorites',
  TRACK_TAGS: 'djslammer-track-tags',
  PREFERENCES: 'djslammer-library-prefs',
};

// ==========================================
// Default Values
// ==========================================

const DEFAULT_FILTERS: LibraryFilters = {
  bpmRange: null,
  keyMode: 'any',
  referenceKey: null,
  genre: null,
  minEnergy: null,
  minRating: null,
  colors: [],
};

const DEFAULT_FAVORITE_BANKS: FavoriteBank[] = Array.from({ length: 9 }, (_, i) => ({
  slot: i + 1,
  playlistId: null,
}));

/**
 * Default playlists with harmonically compatible tracks
 * Tracks in each playlist share compatible BPM (within ±5) and Camelot keys
 * This allows smooth mixing between any tracks in the playlist
 */
const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'playlist-default-1',
    name: '🔥 Energy Mix (129 BPM, 7A-9A)',
    trackIds: [
      'dance-until-dark-329026',
      'davik-x-zyroz-fire-royalty-free-music-166955',
      'remix-453493',
      'alfarex-need-your-love-royalty-free-music-166731',
      'get-ready-to-move,-feel-the-groove',
      'ryva-deja-vu-royalty-free-music-166957',
      'trance-no-copyright-dj-music-440685',
      'kawaii-dance-upbeat-japan-anime-edm-242104',
      'luthfi-syach-amp-shirina-biswas-without-you-royalty-free-music-176255',
      'party-music-348444',
      'back-base-455019',
      'electric-hoedown-full-version-455917',
      'happy-summer-145530',
    ],
    createdAt: Date.now(),
    color: '#45B7D1', // Teal for 7A-9A range
    order: 0,
  },
  {
    id: 'playlist-default-2',
    name: '✨ Uplifting Vibes (129 BPM, 9B-11B)',
    trackIds: [
      'heartburst',
      'ultra-line-love-you-forever-royalty-free-music-177694',
      'anthony-love-me-royalty-free-music-177759',
      'lukz-amp-wily-amp-edward-jason-deserve-better-feat-mairy-164891',
      'santa-banta-compliments-of-the-season-merry-xmas-454954',
      'phanhung-amp-flamez-nguyen-closer-royalty-free-music-176250',
      'dj-slammer-tag-2',
      '1am-gridlock',
      'sunshine-on-the-floor',
    ],
    createdAt: Date.now(),
    color: '#9C36B5', // Purple for 10B-11B range
    order: 1,
  },
  {
    id: 'playlist-default-3',
    name: '🎉 Party Starters (129 BPM, 1A-4B)',
    trackIds: [
      'rooftop-at-sunset',
      'dxyll-we-made-it-royalty-free-music-166954',
      'ozee-not-what-i-need-royalty-free-music-164888',
      'pulse-456174',
      'get-ready-to-move,-feel-the-groove-2',
      'rayz-amp-musicbyritchie7ta-sweet-candy-royalty-free-music-164890',
      'midnight-gridlock',
      'dj-slammer-tag',
    ],
    createdAt: Date.now(),
    color: '#FF6B6B', // Red-pink for 1A-4B range
    order: 2,
  },
  {
    id: 'playlist-default-4',
    name: '🌙 Late Night Grooves (118-123 BPM)',
    trackIds: [
      '2am-shuffle',
      'aye',
      'good-day',
      'zoom',
      'underground-time-circuit',
      'get-yo-self-on-the-dancefloor',
      'shake-it-up',
      'darkwave-454934',
      'legacy-of-tchaikovsky-swan-lake-house-background-music-for-video-vlog-398013',
      'legendary-bach-badinerie-house-background-music-for-video-short-ver-394172',
      'bl-official-you-royalty-free-music-177852',
      'i-will-be-here-upbeat-vlog-vocal-pop-edm-140857',
    ],
    createdAt: Date.now(),
    color: '#FFB347', // Orange for slower vibes
    order: 3,
  },
];

// ==========================================
// Context Definition
// ==========================================

export interface LibraryContextValue {
  // Playlists & Folders
  playlists: Playlist[];
  folders: Folder[];
  favoriteBanks: FavoriteBank[];

  // View state
  activeView: ViewType;
  activePlaylistId: string | null;
  searchQuery: string;
  filters: LibraryFilters;
  sortColumn: SortColumn;
  sortDirection: SortDirection;

  // Track tags
  trackTags: Map<string, TrackTag>;

  // Playlist operations
  createPlaylist: (name: string, color?: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  setPlaylistColor: (id: string, color: string) => void;
  addToPlaylist: (trackIds: string[], playlistId: string) => void;
  removeFromPlaylist: (trackIds: string[], playlistId: string) => void;
  reorderPlaylist: (playlistId: string, trackIds: string[]) => void;
  duplicatePlaylist: (id: string) => Playlist;

  // Folder operations
  createFolder: (name: string) => Folder;
  deleteFolder: (id: string) => void;
  renameFolder: (id: string, name: string) => void;
  toggleFolderExpanded: (id: string) => void;
  movePlaylistToFolder: (playlistId: string, folderId: string | null) => void;

  // Favorite banks
  setFavoriteBank: (slot: number, playlistId: string | null, label?: string) => void;
  activateFavoriteBank: (slot: number) => void;

  // View & filter controls
  setActiveView: (view: ViewType) => void;
  setActivePlaylist: (playlistId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<LibraryFilters>) => void;
  clearFilters: () => void;
  setSortColumn: (column: SortColumn) => void;
  toggleSortDirection: () => void;

  // Track tagging
  tagTrack: (trackId: string, updates: Partial<TrackTag>) => void;
  getTrackTag: (trackId: string) => TrackTag | undefined;

  // Utility
  getPlaylistTracks: (playlistId: string, allTracks: TrackMetadata[]) => TrackMetadata[];
  isTrackInPlaylist: (trackId: string, playlistId: string) => boolean;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

// ==========================================
// Provider Component
// ==========================================

interface LibraryProviderProps {
  children: ReactNode;
}

export function LibraryProvider({ children }: LibraryProviderProps) {
  // Load initial state from localStorage, falling back to default playlists
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Return defaults if stored is empty array
        return parsed.length > 0 ? parsed : DEFAULT_PLAYLISTS;
      }
      return DEFAULT_PLAYLISTS;
    } catch {
      return DEFAULT_PLAYLISTS;
    }
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [favoriteBanks, setFavoriteBanks] = useState<FavoriteBank[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return stored ? JSON.parse(stored) : DEFAULT_FAVORITE_BANKS;
    } catch {
      return DEFAULT_FAVORITE_BANKS;
    }
  });

  const [trackTags, setTrackTags] = useState<Map<string, TrackTag>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRACK_TAGS);
      if (stored) {
        const arr = JSON.parse(stored) as TrackTag[];
        return new Map(arr.map(tag => [tag.trackId, tag]));
      }
      return new Map();
    } catch {
      return new Map();
    }
  });

  // View state (not persisted)
  const [activeView, setActiveView] = useState<ViewType>('collection');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [sortColumn, setSortColumn] = useState<SortColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoriteBanks));
  }, [favoriteBanks]);

  useEffect(() => {
    const arr = Array.from(trackTags.values());
    localStorage.setItem(STORAGE_KEYS.TRACK_TAGS, JSON.stringify(arr));
  }, [trackTags]);

  // ==========================================
  // Playlist Operations
  // ==========================================

  const createPlaylist = useCallback((name: string, color?: string): Playlist => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      trackIds: [],
      createdAt: Date.now(),
      color,
      order: playlists.length,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  }, [playlists.length]);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    // Remove from folders
    setFolders(prev => prev.map(f => ({
      ...f,
      playlistIds: f.playlistIds.filter(pid => pid !== id),
    })));
    // Remove from favorite banks
    setFavoriteBanks(prev => prev.map(b =>
      b.playlistId === id ? { ...b, playlistId: null, label: undefined } : b
    ));
    // Clear active if deleted
    if (activePlaylistId === id) {
      setActivePlaylistId(null);
      setActiveView('collection');
    }
  }, [activePlaylistId]);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === id ? { ...p, name } : p
    ));
  }, []);

  const setPlaylistColor = useCallback((id: string, color: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === id ? { ...p, color } : p
    ));
  }, []);

  const addToPlaylist = useCallback((trackIds: string[], playlistId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      // Add only tracks not already in playlist
      const existingIds = new Set(p.trackIds);
      const newIds = trackIds.filter(id => !existingIds.has(id));
      return { ...p, trackIds: [...p.trackIds, ...newIds] };
    }));
  }, []);

  const removeFromPlaylist = useCallback((trackIds: string[], playlistId: string) => {
    const idsToRemove = new Set(trackIds);
    setPlaylists(prev => prev.map(p => {
      if (p.id !== playlistId) return p;
      return { ...p, trackIds: p.trackIds.filter(id => !idsToRemove.has(id)) };
    }));
  }, []);

  const reorderPlaylist = useCallback((playlistId: string, trackIds: string[]) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId ? { ...p, trackIds } : p
    ));
  }, []);

  const duplicatePlaylist = useCallback((id: string): Playlist => {
    const original = playlists.find(p => p.id === id);
    if (!original) {
      throw new Error(`Playlist ${id} not found`);
    }
    const newPlaylist: Playlist = {
      ...original,
      id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${original.name} (Copy)`,
      createdAt: Date.now(),
      order: playlists.length,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  }, [playlists]);

  // ==========================================
  // Folder Operations
  // ==========================================

  const createFolder = useCallback((name: string): Folder => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      playlistIds: [],
      isExpanded: true,
      order: folders.length,
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  }, [folders.length]);

  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders(prev => prev.map(f =>
      f.id === id ? { ...f, name } : f
    ));
  }, []);

  const toggleFolderExpanded = useCallback((id: string) => {
    setFolders(prev => prev.map(f =>
      f.id === id ? { ...f, isExpanded: !f.isExpanded } : f
    ));
  }, []);

  const movePlaylistToFolder = useCallback((playlistId: string, folderId: string | null) => {
    setFolders(prev => prev.map(f => {
      // Remove from all folders first
      const withoutPlaylist = { ...f, playlistIds: f.playlistIds.filter(id => id !== playlistId) };
      // Add to target folder
      if (folderId === f.id) {
        return { ...withoutPlaylist, playlistIds: [...withoutPlaylist.playlistIds, playlistId] };
      }
      return withoutPlaylist;
    }));
  }, []);

  // ==========================================
  // Favorite Banks
  // ==========================================

  const setFavoriteBank = useCallback((slot: number, playlistId: string | null, label?: string) => {
    setFavoriteBanks(prev => prev.map(b =>
      b.slot === slot ? { ...b, playlistId, label } : b
    ));
  }, []);

  const activateFavoriteBank = useCallback((slot: number) => {
    const bank = favoriteBanks.find(b => b.slot === slot);
    if (bank?.playlistId) {
      setActivePlaylistId(bank.playlistId);
      setActiveView('playlist');
    }
  }, [favoriteBanks]);

  // ==========================================
  // View & Filter Controls
  // ==========================================

  const setActivePlaylist = useCallback((playlistId: string | null) => {
    setActivePlaylistId(playlistId);
    if (playlistId) {
      setActiveView('playlist');
    }
  }, []);

  const setFilters = useCallback((newFilters: Partial<LibraryFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // ==========================================
  // Track Tagging
  // ==========================================

  const tagTrack = useCallback((trackId: string, updates: Partial<TrackTag>) => {
    setTrackTags(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(trackId) || { trackId };
      newMap.set(trackId, { ...existing, ...updates });
      return newMap;
    });
  }, []);

  const getTrackTag = useCallback((trackId: string): TrackTag | undefined => {
    return trackTags.get(trackId);
  }, [trackTags]);

  // ==========================================
  // Utility Functions
  // ==========================================

  const getPlaylistTracks = useCallback((playlistId: string, allTracks: TrackMetadata[]): TrackMetadata[] => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return [];

    const trackMap = new Map(allTracks.map(t => [t.id, t]));
    return playlist.trackIds
      .map(id => trackMap.get(id))
      .filter((t): t is TrackMetadata => t !== undefined);
  }, [playlists]);

  const isTrackInPlaylist = useCallback((trackId: string, playlistId: string): boolean => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist?.trackIds.includes(trackId) ?? false;
  }, [playlists]);

  // ==========================================
  // Context Value
  // ==========================================

  const value = useMemo<LibraryContextValue>(() => ({
    // State
    playlists,
    folders,
    favoriteBanks,
    activeView,
    activePlaylistId,
    searchQuery,
    filters,
    sortColumn,
    sortDirection,
    trackTags,

    // Playlist operations
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    setPlaylistColor,
    addToPlaylist,
    removeFromPlaylist,
    reorderPlaylist,
    duplicatePlaylist,

    // Folder operations
    createFolder,
    deleteFolder,
    renameFolder,
    toggleFolderExpanded,
    movePlaylistToFolder,

    // Favorite banks
    setFavoriteBank,
    activateFavoriteBank,

    // View & filter controls
    setActiveView,
    setActivePlaylist,
    setSearchQuery,
    setFilters,
    clearFilters,
    setSortColumn,
    toggleSortDirection,

    // Track tagging
    tagTrack,
    getTrackTag,

    // Utility
    getPlaylistTracks,
    isTrackInPlaylist,
  }), [
    playlists, folders, favoriteBanks, activeView, activePlaylistId,
    searchQuery, filters, sortColumn, sortDirection, trackTags,
    createPlaylist, deletePlaylist, renamePlaylist, setPlaylistColor,
    addToPlaylist, removeFromPlaylist, reorderPlaylist, duplicatePlaylist,
    createFolder, deleteFolder, renameFolder, toggleFolderExpanded, movePlaylistToFolder,
    setFavoriteBank, activateFavoriteBank,
    setActivePlaylist, setFilters, clearFilters, toggleSortDirection,
    tagTrack, getTrackTag, getPlaylistTracks, isTrackInPlaylist,
  ]);

  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}

export default LibraryContext;
