/**
 * BPMKeyDetector - Multi-validation BPM and Musical Key Detection System
 *
 * This module provides high-accuracy offline analysis of audio buffers to detect:
 * - BPM (Beats Per Minute) using multiple algorithms with cross-validation
 * - Musical key using chroma feature extraction and the Krumhansl-Schmuckler algorithm
 *
 * BPM Detection Methods:
 * 1. Autocorrelation analysis - finds periodicity in the audio signal
 * 2. Peak detection - analyzes intervals between volume peaks (onsets)
 * 3. Cross-validation - compares results for consensus
 *
 * Key Detection:
 * - Chroma feature extraction (12-bin pitch class histogram)
 * - Krumhansl-Schmuckler key profile matching
 * - Camelot wheel code calculation for harmonic mixing
 */

import { BPMDetectionResult, KeyDetectionResult, BPMKeyDetectionResult } from './types';

// ============================================================================
// Constants
// ============================================================================

/** Minimum reasonable BPM for dance music */
const MIN_BPM = 60;
/** Maximum reasonable BPM for dance music */
const MAX_BPM = 200;
/** Sample rate for downsampled analysis (lower = faster, higher = more accurate) */
const ANALYSIS_SAMPLE_RATE = 22050;
/** FFT size for frequency analysis */
const FFT_SIZE = 4096;
/** Hop size for STFT (Short-Time Fourier Transform) */
const HOP_SIZE = 512;

/**
 * Krumhansl-Schmuckler key profiles
 * These represent the expected distribution of pitch classes for each key
 * Based on cognitive studies of tonal music perception
 */
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88
];

const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17
];

/** Note names for key detection output */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Camelot wheel mapping for harmonic mixing
 * Maps (note index, mode) to Camelot code
 * Major keys are B (outer wheel), minor keys are A (inner wheel)
 */
const CAMELOT_WHEEL: Record<string, string> = {
  // Major keys (B)
  'C-major': '8B', 'G-major': '9B', 'D-major': '10B', 'A-major': '11B',
  'E-major': '12B', 'B-major': '1B', 'F#-major': '2B', 'Db-major': '3B',
  'Ab-major': '4B', 'Eb-major': '5B', 'Bb-major': '6B', 'F-major': '7B',
  // Minor keys (A)
  'A-minor': '8A', 'E-minor': '9A', 'B-minor': '10A', 'F#-minor': '11A',
  'C#-minor': '12A', 'G#-minor': '1A', 'D#-minor': '2A', 'Bb-minor': '3A',
  'F-minor': '4A', 'C-minor': '5A', 'G-minor': '6A', 'D-minor': '7A',
};

/** Alternative note names mapping (flats to sharps for lookup) */
const NOTE_ALIASES: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
};

// ============================================================================
// BPM Detection - Method 1: Autocorrelation
// ============================================================================

/**
 * Detect BPM using autocorrelation analysis
 * Autocorrelation finds periodicity by comparing the signal with time-shifted versions
 *
 * @param audioData - Mono audio samples (normalized -1 to 1)
 * @param sampleRate - Sample rate of the audio data
 * @returns BPM detection result with confidence score
 */
function detectBPMAutocorrelation(audioData: Float32Array, sampleRate: number): BPMDetectionResult {
  // Apply onset detection first to emphasize beat positions
  const onsetEnvelope = computeOnsetEnvelope(audioData, sampleRate);

  // Calculate autocorrelation on the onset envelope
  const minLag = Math.floor(sampleRate * 60 / MAX_BPM); // Lag for max BPM
  const maxLag = Math.floor(sampleRate * 60 / MIN_BPM); // Lag for min BPM

  const autocorr = new Float32Array(maxLag - minLag + 1);
  const envelopeLength = onsetEnvelope.length;

  // Compute autocorrelation for each lag value
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < envelopeLength - lag; i++) {
      sum += onsetEnvelope[i] * onsetEnvelope[i + lag];
      count++;
    }
    autocorr[lag - minLag] = count > 0 ? sum / count : 0;
  }

  // Normalize autocorrelation
  const maxAutocorr = Math.max(...autocorr);
  if (maxAutocorr > 0) {
    for (let i = 0; i < autocorr.length; i++) {
      autocorr[i] /= maxAutocorr;
    }
  }

  // Find peaks in the autocorrelation
  const peaks: Array<{ lag: number; value: number }> = [];
  for (let i = 1; i < autocorr.length - 1; i++) {
    if (autocorr[i] > autocorr[i - 1] && autocorr[i] > autocorr[i + 1] && autocorr[i] > 0.1) {
      peaks.push({ lag: minLag + i, value: autocorr[i] });
    }
  }

  // Sort peaks by value (strongest first)
  peaks.sort((a, b) => b.value - a.value);

  if (peaks.length === 0) {
    return { bpm: 120, confidence: 0, method: 'autocorrelation' };
  }

  // Calculate BPM from the strongest peak
  const bestLag = peaks[0].lag;
  const bpm = (sampleRate * 60) / bestLag;
  const confidence = Math.min(100, peaks[0].value * 100);

  return {
    bpm: Math.round(bpm * 10) / 10,
    confidence: Math.round(confidence),
    method: 'autocorrelation',
  };
}

/**
 * Compute onset envelope using spectral flux
 * This emphasizes transients (beats) in the audio
 *
 * @param audioData - Mono audio samples
 * @param sampleRate - Sample rate
 * @returns Onset envelope (one value per hop)
 */
function computeOnsetEnvelope(audioData: Float32Array, sampleRate: number): Float32Array {
  const hopSize = Math.floor(sampleRate / 100); // 10ms hops
  const frameSize = hopSize * 4; // 40ms frames
  const numFrames = Math.floor((audioData.length - frameSize) / hopSize);

  if (numFrames <= 0) {
    return new Float32Array(0);
  }

  const envelope = new Float32Array(numFrames);
  let prevEnergy = 0;

  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    let energy = 0;

    // Compute RMS energy of the frame
    for (let j = 0; j < frameSize && start + j < audioData.length; j++) {
      energy += audioData[start + j] * audioData[start + j];
    }
    energy = Math.sqrt(energy / frameSize);

    // Spectral flux: positive difference in energy
    envelope[i] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }

  // Half-wave rectification and smoothing
  const smoothedEnvelope = new Float32Array(numFrames);
  const smoothWindow = 3;

  for (let i = 0; i < numFrames; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -smoothWindow; j <= smoothWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < numFrames) {
        sum += envelope[idx];
        count++;
      }
    }
    smoothedEnvelope[i] = count > 0 ? sum / count : 0;
  }

  return smoothedEnvelope;
}

// ============================================================================
// BPM Detection - Method 2: Peak Detection (Onset Intervals)
// ============================================================================

/**
 * Detect BPM by finding peaks in the audio and measuring intervals
 * This method is good for music with clear transients
 *
 * @param audioData - Mono audio samples
 * @param sampleRate - Sample rate
 * @returns BPM detection result with confidence score
 */
function detectBPMPeakDetection(audioData: Float32Array, sampleRate: number): BPMDetectionResult {
  // Compute onset envelope
  const envelope = computeOnsetEnvelope(audioData, sampleRate);
  const hopSize = Math.floor(sampleRate / 100);

  if (envelope.length === 0) {
    return { bpm: 120, confidence: 0, method: 'peak-detection' };
  }

  // Find threshold for peak detection (adaptive threshold)
  const sortedEnvelope = [...envelope].sort((a, b) => b - a);
  const threshold = sortedEnvelope[Math.floor(envelope.length * 0.15)] || 0.01;

  // Find peaks above threshold with minimum spacing
  const minPeakSpacing = Math.floor(sampleRate / hopSize * 60 / MAX_BPM); // Min samples between peaks
  const peaks: number[] = [];

  let lastPeakIdx = -minPeakSpacing;
  for (let i = 1; i < envelope.length - 1; i++) {
    if (envelope[i] > threshold &&
        envelope[i] > envelope[i - 1] &&
        envelope[i] > envelope[i + 1] &&
        i - lastPeakIdx >= minPeakSpacing) {
      peaks.push(i);
      lastPeakIdx = i;
    }
  }

  if (peaks.length < 4) {
    return { bpm: 120, confidence: 0, method: 'peak-detection' };
  }

  // Calculate intervals between peaks
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  // Convert intervals to BPM and create histogram
  const bpmCandidates: Map<number, number> = new Map();

  for (const interval of intervals) {
    const intervalSeconds = (interval * hopSize) / sampleRate;
    let bpm = 60 / intervalSeconds;

    // Normalize to 60-200 BPM range by doubling or halving
    while (bpm < MIN_BPM) bpm *= 2;
    while (bpm > MAX_BPM) bpm /= 2;

    // Round to nearest integer for histogram
    const roundedBPM = Math.round(bpm);
    bpmCandidates.set(roundedBPM, (bpmCandidates.get(roundedBPM) || 0) + 1);
  }

  // Find the most common BPM
  let bestBPM = 120;
  let maxCount = 0;

  for (const [bpm, count] of bpmCandidates) {
    if (count > maxCount) {
      maxCount = count;
      bestBPM = bpm;
    }
  }

  // Calculate confidence based on consistency
  const totalIntervals = intervals.length;
  const confidence = Math.min(100, (maxCount / totalIntervals) * 100 * 1.5);

  return {
    bpm: bestBPM,
    confidence: Math.round(confidence),
    method: 'peak-detection',
  };
}

// ============================================================================
// BPM Detection - Cross-Validation and Consensus
// ============================================================================

/**
 * Normalize BPM to handle half/double tempo detection
 * Adjusts BPM to fall within the 80-160 range which is typical for dance music
 *
 * @param bpm - Raw BPM value
 * @returns Normalized BPM in the 80-160 range (or as close as possible)
 */
function normalizeBPM(bpm: number): number {
  const TARGET_MIN = 80;
  const TARGET_MAX = 160;

  let normalized = bpm;

  // Double if too slow
  while (normalized < TARGET_MIN && normalized * 2 <= MAX_BPM) {
    normalized *= 2;
  }

  // Halve if too fast
  while (normalized > TARGET_MAX && normalized / 2 >= MIN_BPM) {
    normalized /= 2;
  }

  return Math.round(normalized * 10) / 10;
}

/**
 * Check if two BPM values are harmonically related (half/double/same)
 *
 * @param bpm1 - First BPM
 * @param bpm2 - Second BPM
 * @param tolerance - Tolerance in BPM (default 2)
 * @returns True if the BPMs are harmonically related
 */
function areHarmonicallyRelated(bpm1: number, bpm2: number, tolerance = 2): boolean {
  const ratios = [0.5, 1, 2];

  for (const ratio of ratios) {
    if (Math.abs(bpm1 * ratio - bpm2) < tolerance) {
      return true;
    }
  }

  return false;
}

/**
 * Combine multiple BPM detection results using consensus
 *
 * @param results - Array of BPM detection results from different methods
 * @returns Combined result with confidence score
 */
function combineResults(results: BPMDetectionResult[]): BPMDetectionResult {
  if (results.length === 0) {
    return { bpm: 120, confidence: 0, method: 'combined' };
  }

  // Normalize all BPMs to the same range
  const normalizedResults = results.map(r => ({
    ...r,
    normalizedBPM: normalizeBPM(r.bpm),
  }));

  // Find the best consensus
  let bestBPM = normalizedResults[0].normalizedBPM;
  let bestConfidence = 0;
  let agreementCount = 0;

  // Weight results by their individual confidence
  const weightedVotes: Map<number, number> = new Map();

  for (const result of normalizedResults) {
    const bpm = Math.round(result.normalizedBPM);
    const currentWeight = weightedVotes.get(bpm) || 0;
    weightedVotes.set(bpm, currentWeight + result.confidence);
  }

  // Find BPM with highest weighted vote
  for (const [bpm, weight] of weightedVotes) {
    if (weight > bestConfidence) {
      bestConfidence = weight;
      bestBPM = bpm;
    }
  }

  // Count how many methods agree (within tolerance)
  for (const result of normalizedResults) {
    if (areHarmonicallyRelated(result.normalizedBPM, bestBPM, 3)) {
      agreementCount++;
    }
  }

  // Boost confidence if multiple methods agree
  const agreementBonus = (agreementCount / results.length) * 30;
  const finalConfidence = Math.min(100, (bestConfidence / results.length) + agreementBonus);

  return {
    bpm: bestBPM,
    confidence: Math.round(finalConfidence),
    method: 'combined',
  };
}

// ============================================================================
// Key Detection - Chroma Feature Extraction
// ============================================================================

/**
 * Extract chroma features from audio (12-bin pitch class histogram)
 * Uses FFT to analyze frequency content and maps to pitch classes
 *
 * @param audioData - Mono audio samples
 * @param sampleRate - Sample rate
 * @returns 12-element array representing pitch class distribution
 */
function extractChromaFeatures(audioData: Float32Array, sampleRate: number): Float32Array {
  const chroma = new Float32Array(12);
  const numFrames = Math.floor(audioData.length / HOP_SIZE);

  if (numFrames === 0) {
    return chroma;
  }

  // Create Hann window
  const window = new Float32Array(FFT_SIZE);
  for (let i = 0; i < FFT_SIZE; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
  }

  // Pre-compute frequency to note mapping
  const freqToChroma: Int8Array = new Int8Array(FFT_SIZE / 2);
  for (let bin = 1; bin < FFT_SIZE / 2; bin++) {
    const freq = (bin * sampleRate) / FFT_SIZE;
    if (freq >= 27.5 && freq <= 4186) { // A0 to C8
      const noteNum = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = Math.round(noteNum) % 12;
      freqToChroma[bin] = pitchClass >= 0 ? pitchClass : pitchClass + 12;
    } else {
      freqToChroma[bin] = -1; // Out of range
    }
  }

  // Process each frame
  const frameBuffer = new Float32Array(FFT_SIZE);
  let frameCount = 0;

  for (let frame = 0; frame < numFrames && frame * HOP_SIZE + FFT_SIZE <= audioData.length; frame++) {
    const startIdx = frame * HOP_SIZE;

    // Apply window and copy to buffer
    for (let i = 0; i < FFT_SIZE; i++) {
      frameBuffer[i] = audioData[startIdx + i] * window[i];
    }

    // Compute magnitude spectrum using simple DFT (real-valued input)
    // For efficiency, we only compute the bins we need
    const magnitudes = computeMagnitudeSpectrum(frameBuffer);

    // Accumulate chroma from magnitude spectrum
    for (let bin = 1; bin < FFT_SIZE / 2; bin++) {
      const pitchClass = freqToChroma[bin];
      if (pitchClass >= 0) {
        chroma[pitchClass] += magnitudes[bin];
      }
    }

    frameCount++;
  }

  // Normalize chroma vector
  if (frameCount > 0) {
    const sum = chroma.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < 12; i++) {
        chroma[i] /= sum;
      }
    }
  }

  return chroma;
}

/**
 * Compute magnitude spectrum using optimized DFT
 * Uses a simplified approach suitable for chroma extraction
 *
 * @param buffer - Windowed audio frame
 * @returns Magnitude values for each frequency bin
 */
function computeMagnitudeSpectrum(buffer: Float32Array): Float32Array {
  const N = buffer.length;
  const magnitudes = new Float32Array(N / 2);

  // Compute DFT for positive frequencies only
  // We use a stride to reduce computation (only every 4th bin for efficiency)
  const stride = 4;

  for (let k = 0; k < N / 2; k += stride) {
    let real = 0;
    let imag = 0;
    const angle = -2 * Math.PI * k / N;

    for (let n = 0; n < N; n += 4) { // Skip samples for speed
      const cos = Math.cos(angle * n);
      const sin = Math.sin(angle * n);
      real += buffer[n] * cos;
      imag += buffer[n] * sin;
    }

    const magnitude = Math.sqrt(real * real + imag * imag);

    // Fill in skipped bins with same value
    for (let i = 0; i < stride && k + i < N / 2; i++) {
      magnitudes[k + i] = magnitude;
    }
  }

  return magnitudes;
}

// ============================================================================
// Key Detection - Krumhansl-Schmuckler Algorithm
// ============================================================================

/**
 * Detect musical key using Krumhansl-Schmuckler algorithm
 * Correlates chroma features against major and minor key profiles
 *
 * @param chroma - 12-bin chroma features
 * @returns Key detection result with confidence
 */
function detectKeyFromChroma(chroma: Float32Array): KeyDetectionResult {
  let bestKey = 0;
  let bestMode: 'major' | 'minor' = 'major';
  let bestCorrelation = -Infinity;

  // Try all 12 keys in both major and minor modes
  for (let key = 0; key < 12; key++) {
    // Rotate chroma to match key
    const rotatedChroma = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
      rotatedChroma[i] = chroma[(i + key) % 12];
    }

    // Correlate with major profile
    const majorCorr = pearsonCorrelation(rotatedChroma, MAJOR_PROFILE);
    if (majorCorr > bestCorrelation) {
      bestCorrelation = majorCorr;
      bestKey = key;
      bestMode = 'major';
    }

    // Correlate with minor profile
    const minorCorr = pearsonCorrelation(rotatedChroma, MINOR_PROFILE);
    if (minorCorr > bestCorrelation) {
      bestCorrelation = minorCorr;
      bestKey = key;
      bestMode = 'minor';
    }
  }

  // Convert key index to note name
  const keyName = NOTE_NAMES[bestKey];

  // Get Camelot code
  const camelotKey = `${keyName}-${bestMode}`;
  let camelotCode = CAMELOT_WHEEL[camelotKey];

  // Try with flat equivalent if not found
  if (!camelotCode) {
    for (const [flat, sharp] of Object.entries(NOTE_ALIASES)) {
      if (sharp === keyName) {
        camelotCode = CAMELOT_WHEEL[`${flat}-${bestMode}`];
        break;
      }
    }
  }

  // Fallback if still not found
  if (!camelotCode) {
    camelotCode = '1A';
  }

  // Calculate confidence from correlation (scale to 0-100)
  // Pearson correlation ranges from -1 to 1
  const confidence = Math.round(Math.max(0, Math.min(100, (bestCorrelation + 1) * 50)));

  return {
    key: keyName,
    mode: bestMode,
    camelotCode,
    confidence,
  };
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 *
 * @param x - First array
 * @param y - Second array (reference profile)
 * @returns Correlation coefficient (-1 to 1)
 */
function pearsonCorrelation(x: Float32Array, y: readonly number[]): number {
  const n = x.length;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect BPM and musical key from an AudioBuffer
 * Uses multi-validation approach for high accuracy
 *
 * @param audioBuffer - Web Audio API AudioBuffer to analyze
 * @returns Promise with BPM, confidence, key, mode, and Camelot code
 */
export async function detectBPMAndKey(audioBuffer: AudioBuffer): Promise<BPMKeyDetectionResult> {
  // Convert to mono and downsample for efficiency
  const monoData = convertToMono(audioBuffer);
  const resampledData = downsample(monoData, audioBuffer.sampleRate, ANALYSIS_SAMPLE_RATE);

  console.log('[BPMKeyDetector] Analyzing audio:', {
    originalSampleRate: audioBuffer.sampleRate,
    analysisSampleRate: ANALYSIS_SAMPLE_RATE,
    duration: audioBuffer.duration.toFixed(2) + 's',
    samples: resampledData.length,
  });

  // Run BPM detection with multiple methods
  const autocorrResult = detectBPMAutocorrelation(resampledData, ANALYSIS_SAMPLE_RATE);
  const peakResult = detectBPMPeakDetection(resampledData, ANALYSIS_SAMPLE_RATE);

  console.log('[BPMKeyDetector] Autocorrelation result:', autocorrResult);
  console.log('[BPMKeyDetector] Peak detection result:', peakResult);

  // Combine results for consensus
  const combinedBPM = combineResults([autocorrResult, peakResult]);

  console.log('[BPMKeyDetector] Combined BPM result:', combinedBPM);

  // Extract chroma features for key detection
  const chroma = extractChromaFeatures(resampledData, ANALYSIS_SAMPLE_RATE);

  // Detect key using Krumhansl-Schmuckler algorithm
  const keyResult = detectKeyFromChroma(chroma);

  console.log('[BPMKeyDetector] Key detection result:', keyResult);

  return {
    bpm: combinedBPM.bpm,
    bpmConfidence: combinedBPM.confidence,
    key: keyResult.key,
    keyMode: keyResult.mode,
    camelotCode: keyResult.camelotCode,
    keyConfidence: keyResult.confidence,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert stereo audio buffer to mono
 *
 * @param audioBuffer - Input audio buffer (may be stereo)
 * @returns Mono audio data
 */
function convertToMono(audioBuffer: AudioBuffer): Float32Array {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  if (numChannels === 1) {
    return audioBuffer.getChannelData(0);
  }

  // Mix channels to mono
  const mono = new Float32Array(length);
  const channels: Float32Array[] = [];

  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += channels[ch][i];
    }
    mono[i] = sum / numChannels;
  }

  return mono;
}

/**
 * Downsample audio data to a lower sample rate
 * Uses simple linear interpolation
 *
 * @param data - Input audio samples
 * @param fromRate - Original sample rate
 * @param toRate - Target sample rate
 * @returns Downsampled audio data
 */
function downsample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) {
    return data;
  }

  const ratio = fromRate / toRate;
  const newLength = Math.floor(data.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, data.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    result[i] = data[srcIndexFloor] * (1 - fraction) + data[srcIndexCeil] * fraction;
  }

  return result;
}

/**
 * Get compatible Camelot codes for harmonic mixing
 *
 * @param camelotCode - Current track's Camelot code
 * @returns Array of compatible Camelot codes for harmonic mixing
 */
export function getCompatibleKeys(camelotCode: string): string[] {
  const match = camelotCode.match(/^(\d+)([AB])$/);
  if (!match) return [];

  const num = parseInt(match[1], 10);
  const letter = match[2];

  const compatible: string[] = [];

  // Same key (perfect match)
  compatible.push(camelotCode);

  // Adjacent keys on the wheel (+1 and -1)
  const prev = num === 1 ? 12 : num - 1;
  const next = num === 12 ? 1 : num + 1;
  compatible.push(`${prev}${letter}`);
  compatible.push(`${next}${letter}`);

  // Relative major/minor (same number, different letter)
  const otherLetter = letter === 'A' ? 'B' : 'A';
  compatible.push(`${num}${otherLetter}`);

  return compatible;
}
