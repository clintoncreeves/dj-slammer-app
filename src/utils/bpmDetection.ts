/**
 * BPM Detection Utility
 *
 * Detects BPM from an audio file URL using Web Audio API peak detection.
 * This is a simplified beat detection algorithm that works well for EDM
 * and other electronic music with clear beats.
 */

/**
 * Detect BPM from an audio file URL
 * @param url - URL of the audio file (can be a blob URL or HTTP URL)
 * @returns Promise<number> - Detected BPM, or null if detection fails
 */
export async function detectBPM(url: string): Promise<number | null> {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Fetch the audio file
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Decode the audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Get the audio data from the first channel
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    // Analyze a portion of the track (first 30 seconds or entire track if shorter)
    const analyzeLength = Math.min(channelData.length, sampleRate * 30);
    const samples = channelData.slice(0, analyzeLength);

    // Find peaks in the audio
    const peaks = findPeaks(samples, sampleRate);

    if (peaks.length < 2) {
      audioContext.close();
      return null;
    }

    // Calculate intervals between peaks
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    // Group similar intervals and find the most common one
    const bpm = calculateBPMFromIntervals(intervals, sampleRate);

    audioContext.close();
    return bpm;
  } catch (error) {
    console.warn('BPM detection failed:', error);
    return null;
  }
}

/**
 * Find peaks in audio data using a threshold-based approach
 */
function findPeaks(samples: Float32Array, sampleRate: number): number[] {
  const peaks: number[] = [];

  // Calculate RMS to determine threshold
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSquares / samples.length);
  const threshold = rms * 1.5;

  // Minimum distance between peaks (assuming max BPM of 200)
  const minPeakDistance = Math.floor(sampleRate * 60 / 200);

  let lastPeakIndex = -minPeakDistance;

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.abs(samples[i]);

    if (sample > threshold && i - lastPeakIndex >= minPeakDistance) {
      // Look for local maximum in a small window
      let isLocalMax = true;
      const windowSize = Math.floor(sampleRate * 0.01); // 10ms window

      for (let j = Math.max(0, i - windowSize); j <= Math.min(samples.length - 1, i + windowSize); j++) {
        if (Math.abs(samples[j]) > sample) {
          isLocalMax = false;
          break;
        }
      }

      if (isLocalMax) {
        peaks.push(i);
        lastPeakIndex = i;
      }
    }
  }

  return peaks;
}

/**
 * Calculate BPM from peak intervals
 */
function calculateBPMFromIntervals(intervals: number[], sampleRate: number): number {
  // Convert intervals to BPM values
  const bpmValues = intervals.map((interval) => (60 * sampleRate) / interval);

  // Group BPM values into buckets
  const buckets: Map<number, number> = new Map();
  const bucketSize = 2; // 2 BPM tolerance

  for (const bpm of bpmValues) {
    // Only consider reasonable BPM range
    if (bpm < 60 || bpm > 200) continue;

    const bucket = Math.round(bpm / bucketSize) * bucketSize;
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }

  // Find the most common bucket
  let maxCount = 0;
  let bestBPM = 120; // Default fallback

  buckets.forEach((count, bpm) => {
    if (count > maxCount) {
      maxCount = count;
      bestBPM = bpm;
    }
  });

  return bestBPM;
}

export default detectBPM;
