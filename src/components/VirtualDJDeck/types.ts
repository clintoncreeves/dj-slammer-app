/**
 * Virtual DJ Deck Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the Virtual DJ Deck component.
 */

import type { SpectralWaveformData } from '../../utils/waveformUtils';

/**
 * Configuration for a single deck (A or B)
 */
export interface DeckConfig {
  /** URL to audio file (HTTP URL or blob URL from file upload) */
  trackUrl: string;
  /** Track name/title */
  trackName?: string;
  /** Artist name */
  artistName?: string;
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

  /** Track name/title */
  trackName: string;
  /** Artist name */
  artistName: string;

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

  /** Current cue point position in seconds (user-set or default) */
  cuePoint: number;

  /** Suggested cue points at musical phrase boundaries (for DJ assistant) */
  suggestedCuePoints: number[];

  /** Pre-computed waveform data for visualization */
  waveformData: number[];

  /** Spectral waveform data with frequency analysis (for colored waveforms) */
  spectralWaveformData: SpectralWaveformData | null;

  /** Whether to display colored (spectral) waveform vs monochrome */
  showSpectralColors: boolean;

  /** EQ low band value in dB (-12 to +12) */
  eqLow: number;
  /** EQ mid band value in dB (-12 to +12) */
  eqMid: number;
  /** EQ high band value in dB (-12 to +12) */
  eqHigh: number;

  /** Filter position: -1 (full lowpass) to 1 (full highpass), 0 is bypass */
  filterPosition: number;
  /** Filter resonance/Q factor (0.5 to 15) */
  filterResonance: number;

  /** Loop start point in seconds (null if not set) */
  loopIn: number | null;
  /** Loop end point in seconds (null if not set) */
  loopOut: number | null;
  /** Whether looping is currently active */
  loopActive: boolean;
  /** Loop length in beats (1/8, 1/4, 1/2, 1, 2, 4, 8, 16) */
  loopLength: number;

  /** Detected musical key (e.g., "A", "C#", "F") */
  detectedKey: string;
  /** Detected key mode (major or minor) */
  detectedKeyMode: 'major' | 'minor';
  /** Camelot wheel code for harmonic mixing (e.g., "8A", "11B") */
  camelotCode: string;

  /** Active effects for this deck */
  effects: DeckEffect[];
}

/**
 * Effect types available in the DJ effects system
 */
export type EffectType = 'reverb' | 'delay' | 'echo' | 'flanger' | 'phaser';

/**
 * Effect state for a single effect
 */
export interface DeckEffect {
  /** Type of effect */
  type: EffectType;
  /** Wet/dry mix (0-1, 0 = fully dry, 1 = fully wet) */
  wet: number;
  /** Whether the effect is enabled */
  enabled: boolean;
  /** Effect-specific parameters */
  params: Record<string, number>;
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
export type PlaybackCommand = 'play' | 'pause' | 'cue' | 'setCue';

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
 * Crossfader curve types
 * Each curve provides a different mixing characteristic
 */
export type CrossfaderCurveType = 'linear' | 'constantPower' | 'fastCut' | 'slowCut';

/**
 * Crossfader curve configuration
 */
export interface CrossfaderCurve {
  type: CrossfaderCurveType;
  /** Display name for UI */
  name: string;
  /** Description of the curve behavior */
  description: string;
}

/**
 * Available crossfader curves with their display names and descriptions
 */
export const CROSSFADER_CURVES: Record<CrossfaderCurveType, CrossfaderCurve> = {
  linear: {
    type: 'linear',
    name: 'Linear',
    description: 'Smooth, even blend between decks',
  },
  constantPower: {
    type: 'constantPower',
    name: 'Constant Power',
    description: 'Equal power curve - prevents volume dip at center',
  },
  fastCut: {
    type: 'fastCut',
    name: 'Fast Cut',
    description: 'Quick transitions at edges - scratch DJ style',
  },
  slowCut: {
    type: 'slowCut',
    name: 'Slow Cut',
    description: 'Gradual S-curve transition - mixing style',
  },
};

/**
 * Calculate volume levels for each deck based on crossfader position and curve type
 *
 * @param position - Crossfader position: 0 = full A, 0.5 = center, 1 = full B
 * @param curveType - The type of crossfader curve to apply
 * @returns Object with volA and volB values (0-1)
 */
export function calculateCrossfaderVolumes(
  position: number,
  curveType: CrossfaderCurveType
): { volA: number; volB: number } {
  // Clamp position to valid range
  const pos = Math.max(0, Math.min(1, position));

  switch (curveType) {
    case 'linear':
      // Simple linear crossfade
      return {
        volA: 1 - pos,
        volB: pos,
      };

    case 'constantPower':
      // Equal power curve using sine/cosine
      // This maintains perceived loudness at center position
      return {
        volA: Math.cos(pos * Math.PI / 2),
        volB: Math.sin(pos * Math.PI / 2),
      };

    case 'fastCut':
      // Steep transitions at edges with quick cut
      // Center region has both at moderate volume
      if (pos < 0.1) {
        // Full A region (0-10%)
        return { volA: 1, volB: pos / 0.1 * 0.5 };
      } else if (pos > 0.9) {
        // Full B region (90-100%)
        return { volA: (1 - pos) / 0.1 * 0.5, volB: 1 };
      } else {
        // Center region (10-90%) - both at 50%
        return { volA: 0.5, volB: 0.5 };
      }

    case 'slowCut':
      // Smooth S-curve using smoothstep function
      // Provides gradual transition ideal for mixing
      const smoothstep = (x: number): number => {
        return x * x * (3 - 2 * x);
      };
      const smoothB = smoothstep(pos);
      return {
        volA: 1 - smoothB,
        volB: smoothB,
      };

    default:
      // Fallback to linear
      return {
        volA: 1 - pos,
        volB: pos,
      };
  }
}

// ============================================================================
// BPM and Key Detection Types
// ============================================================================

/**
 * Result from a single BPM detection method
 */
export interface BPMDetectionResult {
  /** Detected BPM value */
  bpm: number;
  /** Confidence score (0-100) */
  confidence: number;
  /** Detection method used */
  method: 'autocorrelation' | 'peak-detection' | 'combined';
}

/**
 * Result from key detection
 */
export interface KeyDetectionResult {
  /** Musical key (A-G with sharps/flats) */
  key: string;
  /** Key mode */
  mode: 'major' | 'minor';
  /** Camelot wheel code for harmonic mixing (e.g., "8A", "11B") */
  camelotCode: string;
  /** Confidence score (0-100) */
  confidence: number;
}

/**
 * Combined result from BPM and key detection
 */
export interface BPMKeyDetectionResult {
  /** Detected BPM value */
  bpm: number;
  /** BPM detection confidence (0-100) */
  bpmConfidence: number;
  /** Musical key (A-G with sharps/flats) */
  key: string;
  /** Key mode */
  keyMode: 'major' | 'minor';
  /** Camelot wheel code for harmonic mixing */
  camelotCode: string;
  /** Key detection confidence (0-100) */
  keyConfidence: number;
}

// ============================================================================
// Track Types
// ============================================================================

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
