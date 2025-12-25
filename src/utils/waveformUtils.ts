/**
 * Waveform Utility Functions
 *
 * Utilities for generating waveform data from audio buffers for visualization
 * including spectral analysis for frequency-colored waveforms (Serato/Rekordbox style)
 */

/**
 * Waveform segment with amplitude and frequency energy data
 * Used for spectral coloring of waveforms
 */
export interface WaveformSegment {
  /** Normalized amplitude (0-1) */
  amplitude: number;
  /** Low frequency energy (bass, 20-250Hz) - normalized 0-1 */
  lowEnergy: number;
  /** Mid frequency energy (250-4000Hz) - normalized 0-1 */
  midEnergy: number;
  /** High frequency energy (4000-20000Hz) - normalized 0-1 */
  highEnergy: number;
}

/**
 * Pre-calculated color for a waveform segment
 * Stored to avoid recalculation during render
 */
export interface WaveformColor {
  /** CSS color string (hex or rgba) */
  color: string;
}

/**
 * Complete spectral waveform data including segments and pre-calculated colors
 */
export interface SpectralWaveformData {
  /** Array of waveform segments with frequency data */
  segments: WaveformSegment[];
  /** Pre-calculated colors for each segment */
  colors: string[];
}

/**
 * Generate waveform data from an AudioBuffer
 * Requirements: 4.1 - Waveform visualization
 *
 * @param audioBuffer - The audio buffer to analyze
 * @param samples - Number of data points to generate (default: 200)
 * @returns Array of normalized amplitude values (0-1)
 */
export function generateWaveformData(
  audioBuffer: AudioBuffer,
  samples: number = 200
): number[] {
  if (!audioBuffer || audioBuffer.length === 0) {
    return [];
  }

  const rawData = audioBuffer.getChannelData(0); // Use first channel (mono or left)
  const blockSize = Math.floor(rawData.length / samples);
  const waveformData: number[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let sum = 0;

    // Calculate RMS (Root Mean Square) for this block
    for (let j = start; j < end && j < rawData.length; j++) {
      sum += Math.abs(rawData[j]);
    }

    const average = sum / blockSize;
    waveformData.push(average);
  }

  // Normalize to 0-1 range
  const max = Math.max(...waveformData);
  if (max > 0) {
    return waveformData.map((value) => value / max);
  }

  return waveformData;
}

/**
 * Draw waveform on a canvas
 * Requirements: 4.1 - Animated waveform visualization
 *
 * @param canvas - Canvas element to draw on
 * @param waveformData - Array of waveform amplitudes (0-1)
 * @param color - Waveform color (hex string)
 * @param playheadPosition - Current playback position (0-1), or null to hide playhead
 */
export function drawWaveform(
  canvas: HTMLCanvasElement,
  waveformData: number[],
  color: string,
  playheadPosition: number | null = null
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || waveformData.length === 0) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const barWidth = width / waveformData.length;
  const centerY = height / 2;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw waveform bars
  ctx.fillStyle = color;
  waveformData.forEach((amplitude, index) => {
    const barHeight = amplitude * centerY;
    const x = index * barWidth;

    // Draw mirrored bars (top and bottom)
    ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
    ctx.fillRect(x, centerY, barWidth - 1, barHeight);
  });

  // Draw playhead if provided
  if (playheadPosition !== null) {
    const playheadX = playheadPosition * width;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow
  }
}

/**
 * Calculate playhead position based on current time and duration
 *
 * @param currentTime - Current playback time in seconds
 * @param duration - Total track duration in seconds
 * @returns Playhead position (0-1)
 */
export function calculatePlayheadPosition(
  currentTime: number,
  duration: number
): number {
  if (duration === 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, currentTime / duration));
}

/**
 * Frequency band boundaries in Hz
 * Based on typical DJ software frequency splits
 */
const FREQ_BANDS = {
  lowMax: 250,     // Bass: 20-250 Hz
  midMax: 4000,    // Mid: 250-4000 Hz
  // High: 4000-20000 Hz (or Nyquist)
};

/**
 * Color palette for spectral waveform (Serato/Rekordbox style)
 * - Bass-heavy: Blue/Purple
 * - Mid-heavy: Green/Yellow
 * - High-heavy: Orange/Red
 */
const SPECTRAL_COLORS = {
  bass: { r: 68, g: 0, b: 255 },      // #4400FF - Deep blue/purple
  bassLight: { r: 0, g: 102, b: 255 }, // #0066FF - Bright blue
  mid: { r: 0, g: 255, b: 0 },        // #00FF00 - Green
  midHigh: { r: 255, g: 255, b: 0 },  // #FFFF00 - Yellow
  high: { r: 255, g: 136, b: 0 },     // #FF8800 - Orange
  highPeak: { r: 255, g: 0, b: 0 },   // #FF0000 - Red
};

/**
 * Analyze frequency spectrum for a segment of audio data using FFT
 *
 * @param audioData - Float32Array of audio samples for this segment
 * @param sampleRate - Sample rate of the audio
 * @returns Object with low, mid, high energy values (0-1)
 */
function analyzeFrequencySpectrum(
  audioData: Float32Array,
  sampleRate: number
): { low: number; mid: number; high: number } {
  // Use a simple DFT-based approach for offline analysis
  // For each frequency band, sum the energy of relevant frequency components

  const n = audioData.length;
  if (n === 0) {
    return { low: 0, mid: 0, high: 0 };
  }

  // Simple energy calculation using sum of squared samples
  // This approximates the spectral energy without full FFT
  // For better accuracy, we analyze different frequency components

  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;

  // Apply a simplified spectral analysis
  // We use the autocorrelation property: low frequencies have slower variations

  // Calculate total RMS energy
  let totalEnergy = 0;
  for (let i = 0; i < n; i++) {
    totalEnergy += audioData[i] * audioData[i];
  }
  totalEnergy = Math.sqrt(totalEnergy / n);

  // Estimate low frequency energy using a simple low-pass approach
  // Low frequencies change slowly, so we look at average over larger windows
  const lowWindowSize = Math.max(1, Math.floor(sampleRate / FREQ_BANDS.lowMax));
  let lowSum = 0;
  for (let i = 0; i < n; i += lowWindowSize) {
    let windowSum = 0;
    const windowEnd = Math.min(i + lowWindowSize, n);
    for (let j = i; j < windowEnd; j++) {
      windowSum += audioData[j];
    }
    const windowAvg = windowSum / (windowEnd - i);
    lowSum += windowAvg * windowAvg;
  }
  lowEnergy = Math.sqrt(lowSum / Math.ceil(n / lowWindowSize));

  // Estimate high frequency energy using zero-crossing rate
  // High frequencies cross zero more frequently
  let zeroCrossings = 0;
  for (let i = 1; i < n; i++) {
    if ((audioData[i] >= 0 && audioData[i - 1] < 0) ||
        (audioData[i] < 0 && audioData[i - 1] >= 0)) {
      zeroCrossings++;
    }
  }
  const zeroCrossingRate = zeroCrossings / n;
  // Normalize zero crossing rate to 0-1 (typical range is 0-0.5)
  highEnergy = Math.min(1, zeroCrossingRate * 2) * totalEnergy;

  // Mid energy is the remainder
  midEnergy = Math.max(0, totalEnergy - lowEnergy - highEnergy * 0.5);

  // Normalize all values
  const maxEnergy = Math.max(lowEnergy, midEnergy, highEnergy, 0.0001);

  return {
    low: lowEnergy / maxEnergy,
    mid: midEnergy / maxEnergy,
    high: highEnergy / maxEnergy,
  };
}

/**
 * Calculate color based on frequency energy distribution
 * Uses Serato/Rekordbox-style coloring:
 * - Bass-heavy: Blue/Purple (#4400FF to #0066FF)
 * - Mid-heavy: Green/Yellow (#00FF00 to #FFFF00)
 * - High-heavy: Orange/Red (#FF8800 to #FF0000)
 *
 * @param low - Low frequency energy (0-1)
 * @param mid - Mid frequency energy (0-1)
 * @param high - High frequency energy (0-1)
 * @returns CSS color string
 */
export function calculateSpectralColor(
  low: number,
  mid: number,
  high: number
): string {
  // Normalize energy values to sum to 1
  const total = low + mid + high;
  if (total === 0) {
    return '#666666'; // Gray for silence
  }

  const lowNorm = low / total;
  const midNorm = mid / total;
  const highNorm = high / total;

  // Calculate color by blending based on frequency dominance
  let r = 0, g = 0, b = 0;

  // Bass contribution: Blue/Purple
  r += lowNorm * ((1 - lowNorm) * SPECTRAL_COLORS.bassLight.r + lowNorm * SPECTRAL_COLORS.bass.r);
  g += lowNorm * ((1 - lowNorm) * SPECTRAL_COLORS.bassLight.g + lowNorm * SPECTRAL_COLORS.bass.g);
  b += lowNorm * ((1 - lowNorm) * SPECTRAL_COLORS.bassLight.b + lowNorm * SPECTRAL_COLORS.bass.b);

  // Mid contribution: Green/Yellow
  r += midNorm * ((1 - midNorm) * SPECTRAL_COLORS.mid.r + midNorm * SPECTRAL_COLORS.midHigh.r);
  g += midNorm * ((1 - midNorm) * SPECTRAL_COLORS.mid.g + midNorm * SPECTRAL_COLORS.midHigh.g);
  b += midNorm * ((1 - midNorm) * SPECTRAL_COLORS.mid.b + midNorm * SPECTRAL_COLORS.midHigh.b);

  // High contribution: Orange/Red
  r += highNorm * ((1 - highNorm) * SPECTRAL_COLORS.high.r + highNorm * SPECTRAL_COLORS.highPeak.r);
  g += highNorm * ((1 - highNorm) * SPECTRAL_COLORS.high.g + highNorm * SPECTRAL_COLORS.highPeak.g);
  b += highNorm * ((1 - highNorm) * SPECTRAL_COLORS.high.b + highNorm * SPECTRAL_COLORS.highPeak.b);

  // Clamp values
  r = Math.round(Math.max(0, Math.min(255, r)));
  g = Math.round(Math.max(0, Math.min(255, g)));
  b = Math.round(Math.max(0, Math.min(255, b)));

  // Convert to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate spectral waveform data with frequency analysis
 * Pre-calculates colors for each segment for efficient rendering
 *
 * @param audioBuffer - The audio buffer to analyze
 * @param samples - Number of segments to generate (default: 200)
 * @returns SpectralWaveformData with segments and pre-calculated colors
 */
export function generateSpectralWaveformData(
  audioBuffer: AudioBuffer,
  samples: number = 200
): SpectralWaveformData {
  if (!audioBuffer || audioBuffer.length === 0) {
    return { segments: [], colors: [] };
  }

  const rawData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const blockSize = Math.floor(rawData.length / samples);

  const segments: WaveformSegment[] = [];
  const colors: string[] = [];

  // First pass: calculate all segments
  const rawSegments: { amplitude: number; low: number; mid: number; high: number }[] = [];

  for (let i = 0; i < samples; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, rawData.length);

    // Extract segment data
    const segmentData = rawData.slice(start, end);

    // Calculate amplitude (RMS)
    let sum = 0;
    for (let j = 0; j < segmentData.length; j++) {
      sum += Math.abs(segmentData[j]);
    }
    const amplitude = sum / segmentData.length;

    // Analyze frequency spectrum
    const spectrum = analyzeFrequencySpectrum(segmentData, sampleRate);

    rawSegments.push({
      amplitude,
      low: spectrum.low,
      mid: spectrum.mid,
      high: spectrum.high,
    });
  }

  // Normalize amplitudes
  const maxAmplitude = Math.max(...rawSegments.map(s => s.amplitude), 0.0001);

  // Second pass: normalize and calculate colors
  for (const seg of rawSegments) {
    const normalizedAmplitude = seg.amplitude / maxAmplitude;

    const segment: WaveformSegment = {
      amplitude: normalizedAmplitude,
      lowEnergy: seg.low,
      midEnergy: seg.mid,
      highEnergy: seg.high,
    };

    segments.push(segment);
    colors.push(calculateSpectralColor(seg.low, seg.mid, seg.high));
  }

  return { segments, colors };
}

/**
 * Convert spectral waveform data to simple amplitude array
 * for backward compatibility
 *
 * @param spectralData - SpectralWaveformData
 * @returns Array of normalized amplitude values (0-1)
 */
export function spectralToAmplitudeArray(spectralData: SpectralWaveformData): number[] {
  return spectralData.segments.map(s => s.amplitude);
}
