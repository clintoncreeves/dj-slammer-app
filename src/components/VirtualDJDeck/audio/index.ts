/**
 * Audio Analysis Module
 *
 * This module provides high-accuracy BPM and key detection for DJ Slammer.
 *
 * Main exports:
 * - analyzeBPMAndKey: Core detection function for AudioBuffer
 * - analyzeBPMAndKeyFromURL: Detection from audio URL
 * - useBPMKeyDetection: React hook for component integration
 * - Various utility functions and types
 */

// Core detection functions
export {
  analyzeBPMAndKey,
  analyzeBPMAndKeyFromURL,
  createBPMKeyDetector,
  getDetectionSummary,
  getCompatibleCamelotCodes,
  formatBPM,
  getConfidenceLabel,
  doBPMsMatch,
  areHalfDoubleBPM,
  ENHARMONIC_NAMES,
} from './BPMKeyDetector';

// Types from BPMKeyDetector
export type {
  MusicalKey,
  BPMCandidate,
  KeyCandidate,
  DetectionResult,
  DetectionOptions,
} from './BPMKeyDetector';

// React hook and related
export {
  useBPMKeyDetection,
  analyzeTrackStandalone,
  analyzeBufferStandalone,
  detectionResultToMetadata,
  formatDetectionResult,
  getAnalysisProgressMessage,
} from './useBPMKeyDetection';

// Types from hook
export type {
  AnalysisState,
  DeckAnalysisResult,
  UseBPMKeyDetectionOptions,
  UseBPMKeyDetectionResult,
} from './useBPMKeyDetection';

// Default export
export { default as BPMKeyDetector } from './BPMKeyDetector';
