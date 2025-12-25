/**
 * useBPMKeyDetection - React Hook for BPM and Key Detection
 *
 * This hook provides a convenient interface for analyzing audio tracks
 * and integrating the results with the DeckContext.
 *
 * Features:
 * - Automatic analysis when tracks are loaded
 * - State management for analysis results
 * - Integration with DeckContext for updating track metadata
 * - Caching of results to avoid re-analysis
 */

import { useState, useCallback, useRef } from 'react';
import {
  analyzeBPMAndKey,
  analyzeBPMAndKeyFromURL,
  DetectionResult,
  DetectionOptions,
} from './BPMKeyDetector';
import { DeckId } from '../types';

// ==========================================
// Types
// ==========================================

export interface AnalysisState {
  /** Whether analysis is currently in progress */
  isAnalyzing: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current analysis stage */
  stage: 'idle' | 'loading' | 'analyzing-bpm' | 'analyzing-key' | 'complete' | 'error';
  /** Error message if analysis failed */
  error: string | null;
}

export interface DeckAnalysisResult {
  /** Deck identifier */
  deck: DeckId;
  /** Track URL that was analyzed */
  url: string;
  /** Detection result */
  result: DetectionResult;
  /** Timestamp of analysis */
  timestamp: number;
}

export interface UseBPMKeyDetectionOptions extends DetectionOptions {
  /** Enable caching of results (default: true) */
  enableCache?: boolean;
  /** Cache duration in milliseconds (default: 1 hour) */
  cacheDuration?: number;
  /** Callback when analysis completes */
  onAnalysisComplete?: (deck: DeckId, result: DetectionResult) => void;
  /** Callback when analysis fails */
  onAnalysisError?: (deck: DeckId, error: Error) => void;
}

export interface UseBPMKeyDetectionResult {
  /** Analysis state for Deck A */
  deckAState: AnalysisState;
  /** Analysis state for Deck B */
  deckBState: AnalysisState;
  /** Latest result for Deck A */
  deckAResult: DetectionResult | null;
  /** Latest result for Deck B */
  deckBResult: DetectionResult | null;
  /** Analyze a track by URL for a specific deck */
  analyzeTrack: (deck: DeckId, url: string) => Promise<DetectionResult>;
  /** Analyze an AudioBuffer for a specific deck */
  analyzeBuffer: (deck: DeckId, buffer: AudioBuffer, url?: string) => Promise<DetectionResult>;
  /** Clear results and cache for a deck */
  clearResults: (deck: DeckId) => void;
  /** Clear all results and cache */
  clearAllResults: () => void;
  /** Get cached result for a URL */
  getCachedResult: (url: string) => DetectionResult | null;
  /** Check if a result needs verification */
  needsVerification: (deck: DeckId) => boolean;
}

// ==========================================
// Default State
// ==========================================

const DEFAULT_ANALYSIS_STATE: AnalysisState = {
  isAnalyzing: false,
  progress: 0,
  stage: 'idle',
  error: null,
};

// ==========================================
// Cache Implementation
// ==========================================

interface CacheEntry {
  result: DetectionResult;
  timestamp: number;
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private maxDuration: number;

  constructor(maxDuration: number = 3600000) {
    this.maxDuration = maxDuration;
  }

  get(url: string): DetectionResult | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxDuration) {
      this.cache.delete(url);
      return null;
    }

    return entry.result;
  }

  set(url: string, result: DetectionResult): void {
    this.cache.set(url, {
      result,
      timestamp: Date.now(),
    });
  }

  delete(url: string): void {
    this.cache.delete(url);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [url, entry] of this.cache) {
      if (now - entry.timestamp > this.maxDuration) {
        this.cache.delete(url);
      }
    }
  }
}

// Global cache instance
const globalCache = new AnalysisCache();

// ==========================================
// Hook Implementation
// ==========================================

/**
 * React hook for BPM and Key detection
 *
 * @param options - Detection and hook options
 * @returns Detection state and functions
 */
export function useBPMKeyDetection(
  options: UseBPMKeyDetectionOptions = {}
): UseBPMKeyDetectionResult {
  const {
    enableCache = true,
    cacheDuration = 3600000, // 1 hour
    onAnalysisComplete,
    onAnalysisError,
    ...detectionOptions
  } = options;

  // State for each deck
  const [deckAState, setDeckAState] = useState<AnalysisState>(DEFAULT_ANALYSIS_STATE);
  const [deckBState, setDeckBState] = useState<AnalysisState>(DEFAULT_ANALYSIS_STATE);
  const [deckAResult, setDeckAResult] = useState<DetectionResult | null>(null);
  const [deckBResult, setDeckBResult] = useState<DetectionResult | null>(null);

  // Track URLs for cache association
  const deckAUrl = useRef<string | null>(null);
  const deckBUrl = useRef<string | null>(null);

  // Get state setter for a deck
  const getStateSetter = useCallback((deck: DeckId) => {
    return deck === 'A' ? setDeckAState : setDeckBState;
  }, []);

  // Get result setter for a deck
  const getResultSetter = useCallback((deck: DeckId) => {
    return deck === 'A' ? setDeckAResult : setDeckBResult;
  }, []);

  // Get URL ref for a deck
  const getUrlRef = useCallback((deck: DeckId) => {
    return deck === 'A' ? deckAUrl : deckBUrl;
  }, []);

  /**
   * Analyze an AudioBuffer
   */
  const analyzeBuffer = useCallback(async (
    deck: DeckId,
    buffer: AudioBuffer,
    url?: string
  ): Promise<DetectionResult> => {
    const setState = getStateSetter(deck);
    const setResult = getResultSetter(deck);
    const urlRef = getUrlRef(deck);

    // Check cache first
    if (enableCache && url) {
      const cached = globalCache.get(url);
      if (cached) {
        console.log(`[useBPMKeyDetection] Using cached result for Deck ${deck}`);
        setResult(cached);
        urlRef.current = url;
        onAnalysisComplete?.(deck, cached);
        return cached;
      }
    }

    try {
      // Update state: loading
      setState({
        isAnalyzing: true,
        progress: 10,
        stage: 'analyzing-bpm',
        error: null,
      });

      // Run analysis
      const result = await analyzeBPMAndKey(buffer, detectionOptions);

      // Update state: complete
      setState({
        isAnalyzing: false,
        progress: 100,
        stage: 'complete',
        error: null,
      });

      // Store result
      setResult(result);
      urlRef.current = url || null;

      // Cache result
      if (enableCache && url) {
        globalCache.set(url, result);
      }

      // Callback
      onAnalysisComplete?.(deck, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';

      setState({
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        error: errorMessage,
      });

      onAnalysisError?.(deck, error instanceof Error ? error : new Error(errorMessage));

      throw error;
    }
  }, [
    enableCache,
    detectionOptions,
    getStateSetter,
    getResultSetter,
    getUrlRef,
    onAnalysisComplete,
    onAnalysisError,
  ]);

  /**
   * Analyze a track by URL
   */
  const analyzeTrack = useCallback(async (
    deck: DeckId,
    url: string
  ): Promise<DetectionResult> => {
    const setState = getStateSetter(deck);
    const setResult = getResultSetter(deck);
    const urlRef = getUrlRef(deck);

    // Check cache first
    if (enableCache) {
      const cached = globalCache.get(url);
      if (cached) {
        console.log(`[useBPMKeyDetection] Using cached result for Deck ${deck}`);
        setResult(cached);
        urlRef.current = url;
        onAnalysisComplete?.(deck, cached);
        return cached;
      }
    }

    try {
      // Update state: loading
      setState({
        isAnalyzing: true,
        progress: 5,
        stage: 'loading',
        error: null,
      });

      // Run analysis
      const result = await analyzeBPMAndKeyFromURL(url, detectionOptions);

      // Update state: complete
      setState({
        isAnalyzing: false,
        progress: 100,
        stage: 'complete',
        error: null,
      });

      // Store result
      setResult(result);
      urlRef.current = url;

      // Cache result
      if (enableCache) {
        globalCache.set(url, result);
      }

      // Callback
      onAnalysisComplete?.(deck, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';

      setState({
        isAnalyzing: false,
        progress: 0,
        stage: 'error',
        error: errorMessage,
      });

      onAnalysisError?.(deck, error instanceof Error ? error : new Error(errorMessage));

      throw error;
    }
  }, [
    enableCache,
    detectionOptions,
    getStateSetter,
    getResultSetter,
    getUrlRef,
    onAnalysisComplete,
    onAnalysisError,
  ]);

  /**
   * Clear results for a deck
   */
  const clearResults = useCallback((deck: DeckId) => {
    const setState = getStateSetter(deck);
    const setResult = getResultSetter(deck);
    const urlRef = getUrlRef(deck);

    setState(DEFAULT_ANALYSIS_STATE);
    setResult(null);

    // Clear from cache
    if (urlRef.current) {
      globalCache.delete(urlRef.current);
      urlRef.current = null;
    }
  }, [getStateSetter, getResultSetter, getUrlRef]);

  /**
   * Clear all results
   */
  const clearAllResults = useCallback(() => {
    clearResults('A');
    clearResults('B');
    globalCache.clear();
  }, [clearResults]);

  /**
   * Get cached result for a URL
   */
  const getCachedResult = useCallback((url: string): DetectionResult | null => {
    return globalCache.get(url);
  }, []);

  /**
   * Check if a deck's result needs verification
   */
  const needsVerification = useCallback((deck: DeckId): boolean => {
    const result = deck === 'A' ? deckAResult : deckBResult;
    return result?.needsVerification ?? false;
  }, [deckAResult, deckBResult]);

  return {
    deckAState,
    deckBState,
    deckAResult,
    deckBResult,
    analyzeTrack,
    analyzeBuffer,
    clearResults,
    clearAllResults,
    getCachedResult,
    needsVerification,
  };
}

// ==========================================
// Standalone Analysis Functions
// ==========================================

/**
 * Analyze a single track (non-hook version for use outside React components)
 */
export async function analyzeTrackStandalone(
  url: string,
  options: DetectionOptions = {}
): Promise<DetectionResult> {
  // Check global cache
  const cached = globalCache.get(url);
  if (cached) {
    console.log('[analyzeTrackStandalone] Using cached result');
    return cached;
  }

  const result = await analyzeBPMAndKeyFromURL(url, options);

  // Cache result
  globalCache.set(url, result);

  return result;
}

/**
 * Analyze an AudioBuffer (non-hook version)
 */
export async function analyzeBufferStandalone(
  buffer: AudioBuffer,
  options: DetectionOptions = {}
): Promise<DetectionResult> {
  return await analyzeBPMAndKey(buffer, options);
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Convert detection result to track metadata format
 */
export function detectionResultToMetadata(result: DetectionResult): {
  bpm: number;
  key: string;
  keyMode: 'major' | 'minor';
  camelotCode: string;
  keyColor: string;
  bpmConfidence: number;
  keyConfidence: number;
} {
  return {
    bpm: result.bpm,
    key: result.key.root,
    keyMode: result.key.mode,
    camelotCode: result.key.camelotCode,
    keyColor: result.key.color,
    bpmConfidence: result.bpmConfidence,
    keyConfidence: result.keyConfidence,
  };
}

/**
 * Format detection result for display
 */
export function formatDetectionResult(result: DetectionResult): string {
  const bpm = `${result.bpm} BPM`;
  const key = `${result.key.root} ${result.key.mode}`;
  const camelot = result.key.camelotCode;

  if (result.needsVerification) {
    return `${bpm} (${result.bpmConfidence}%) | ${key} (${camelot}) - Verify`;
  }

  return `${bpm} | ${key} (${camelot})`;
}

/**
 * Get analysis progress message
 */
export function getAnalysisProgressMessage(state: AnalysisState): string {
  switch (state.stage) {
    case 'idle':
      return 'Ready to analyze';
    case 'loading':
      return 'Loading audio...';
    case 'analyzing-bpm':
      return 'Detecting BPM...';
    case 'analyzing-key':
      return 'Detecting key...';
    case 'complete':
      return 'Analysis complete';
    case 'error':
      return `Error: ${state.error}`;
    default:
      return '';
  }
}

// Re-export types and functions from BPMKeyDetector
export type {
  DetectionResult,
  DetectionOptions,
  MusicalKey,
  BPMCandidate,
  KeyCandidate,
} from './BPMKeyDetector';

export {
  getDetectionSummary,
  getCompatibleCamelotCodes,
  formatBPM,
  getConfidenceLabel,
  doBPMsMatch,
} from './BPMKeyDetector';

export default useBPMKeyDetection;
