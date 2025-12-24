/**
 * Virtual DJ Deck Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Virtual DJ Deck component.
 */

/**
 * Configuration for a single deck (A or B)
 */
export interface DeckConfig {
  /** URL to audio file (HTTP URL or blob URL from file upload) */
  trackUrl: string;
  /** Initial BPM (beats per minute) of the track */
  initialBPM: number;
  /** Cue point position in seconds */
  cuePoint: number;
  /** Color for waveform visualization (hex color) */
  waveformColor: string;
}

/**
 * Configuration for the Virtual DJ Deck component
 */
export interface VirtualDJDeckConfig {
  /** Configuration for Deck A */
  deckA: DeckConfig;
  /** Configuration for Deck B */
  deckB: DeckConfig;
  /** Optional callback when deck state changes */
  onStateChange?: (state: VirtualDJDeckState) => void;
  /** Optional callback when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * State for a single deck
 */
export interface DeckState {
  /** Whether the deck is currently playing */
  isPlaying: boolean;
  /** Whether the deck is paused */
  isPaused: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of the track in seconds */
  duration: number;

  /** Original BPM of the track */
  originalBPM: number;
  /** Current BPM (after tempo adjustment) */
  currentBPM: number;
  /** Playback rate multiplier (currentBPM / originalBPM) */
  playbackRate: number;

  /** Current volume (0-1) */
  volume: number;
  /** Whether the track is fully loaded and buffered */
  isLoaded: boolean;

  /** Cue point position in seconds */
  cuePoint: number;

  /** Pre-computed waveform data for visualization */
  waveformData: number[];

  /** EQ low band value in dB (-12 to +12) */
  eqLow: number;
  /** EQ mid band value in dB (-12 to +12) */
  eqMid: number;
  /** EQ high band value in dB (-12 to +12) */
  eqHigh: number;
}

/**
 * Complete state of the Virtual DJ Deck (both decks + crossfader)
 */
export interface VirtualDJDeckState {
  /** State of Deck A */
  deckA: DeckState;
  /** State of Deck B */
  deckB: DeckState;
  /** Crossfader position: -1 (full A) to 1 (full B), 0 is center */
  crossfaderPosition: number;
}

/**
 * State of the Audio Engine
 */
export interface AudioEngineState {
  /** Whether the audio engine is initialized */
  isInitialized: boolean;
  /** Current state of the Audio Context */
  contextState: 'suspended' | 'running' | 'closed';
  /** Crossfader position: -1 (full A) to 1 (full B) */
  crossfaderPosition: number;
  /** Master volume (0-1) */
  masterVolume: number;
}

/**
 * Deck identifier
 */
export type DeckId = 'A' | 'B';

/**
 * Playback command
 */
export type PlaybackCommand = 'play' | 'pause' | 'cue';

/**
 * Error types that can occur in the Virtual DJ Deck
 */
export enum DJDeckErrorType {
  AUDIO_CONTEXT_BLOCKED = 'AUDIO_CONTEXT_BLOCKED',
  AUDIO_CONTEXT_CREATION_FAILED = 'AUDIO_CONTEXT_CREATION_FAILED',
  TRACK_LOAD_FAILED = 'TRACK_LOAD_FAILED',
  TRACK_FORMAT_UNSUPPORTED = 'TRACK_FORMAT_UNSUPPORTED',
  PLAYBACK_FAILED = 'PLAYBACK_FAILED',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED',
}

/**
 * Custom error class for DJ Deck errors
 */
export class DJDeckError extends Error {
  constructor(
    public type: DJDeckErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DJDeckError';
  }
}

/**
 * Track metadata
 */
export interface TrackMetadata {
  /** Track ID */
  id: string;
  /** Track title */
  title: string;
  /** Artist name */
  artist: string;
  /** BPM (beats per minute) */
  bpm: number;
  /** Duration in seconds */
  duration: number;
  /** Audio filename */
  filename: string;
  /** Full URL to audio file (constructed from filename) */
  url?: string;
  /** Suggested cue points in seconds */
  cuePoints: number[];
  /** Waveform display color */
  waveformColor: string;
  /** Musical key (e.g., "A", "C#", "F") */
  key: string;
  /** Key mode (major or minor) */
  keyMode: 'major' | 'minor';
  /** Camelot wheel code (e.g., "1A", "12B") */
  camelotCode: string;
  /** Color for key visualization */
  keyColor: string;
  /** Tempo category for kids */
  tempoCategory: 'slow' | 'medium' | 'fast';
  /** Array of compatible Camelot codes */
  compatibleKeys: string[];
}
