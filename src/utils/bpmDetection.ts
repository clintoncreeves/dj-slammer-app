/**
 * BPM Detection Utility
 *
 * Uses realtime-bpm-analyzer for accurate BPM detection.
 * Supports both offline file analysis and realtime streaming detection.
 */

import { analyzeFullBuffer } from 'realtime-bpm-analyzer';

/**
 * Detect BPM from an audio file URL using realtime-bpm-analyzer
 * @param url - URL of the audio file (can be a blob URL or HTTP URL)
 * @returns Promise<number> - Detected BPM, or null if detection fails
 */
export async function detectBPM(url: string): Promise<number | null> {
  let audioContext: AudioContext | null = null;

  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // Fetch the audio file
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    // Decode the audio
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Use realtime-bpm-analyzer's analyzeFullBuffer for accurate detection
    const tempos = await analyzeFullBuffer(audioBuffer, {
      frequencyValue: 150, // Focus on bass frequencies for beat detection
      qualityValue: 1,
    });

    if (tempos.length > 0) {
      // Return the most confident BPM (first candidate)
      const detectedBPM = Math.round(tempos[0].tempo);
      console.log(`[BPM Detection] Detected ${detectedBPM} BPM with confidence ${tempos[0].count}`);
      return detectedBPM;
    }

    return null;
  } catch (error) {
    console.warn('[BPM Detection] Detection failed:', error);
    return null;
  } finally {
    // Ensure AudioContext is always closed to prevent resource leaks
    if (audioContext) {
      audioContext.close();
    }
  }
}

/**
 * Detect BPM from an AudioBuffer directly
 * Useful when you already have the buffer loaded
 */
export async function detectBPMFromBuffer(audioBuffer: AudioBuffer): Promise<number | null> {
  try {
    const tempos = await analyzeFullBuffer(audioBuffer, {
      frequencyValue: 150,
      qualityValue: 1,
    });

    if (tempos.length > 0) {
      return Math.round(tempos[0].tempo);
    }

    return null;
  } catch (error) {
    console.warn('[BPM Detection] Buffer analysis failed:', error);
    return null;
  }
}

export default detectBPM;
