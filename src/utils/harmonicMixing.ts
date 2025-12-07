/**
 * Harmonic Mixing Utilities
 *
 * This module provides functions for harmonic mixing based on the Camelot Wheel system.
 * It helps identify compatible tracks for smooth, harmonious DJ transitions.
 */

import { TrackMetadata } from '../components/VirtualDJDeck/types';

/**
 * Camelot Wheel mapping: Musical Key -> Camelot Code
 */
export const KEY_TO_CAMELOT: Record<string, string> = {
  // Major keys (B suffix)
  'C major': '8B',
  'G major': '9B',
  'D major': '3B',
  'A major': '11B',
  'E major': '12B',
  'B major': '1B',
  'F# major': '2B',
  'Db major': '3B',
  'Ab major': '4B',
  'Eb major': '5B',
  'Bb major': '6B',
  'F major': '7B',

  // Minor keys (A suffix)
  'A minor': '1A',
  'E minor': '9A',
  'B minor': '10A',
  'F# minor': '11A',
  'C# minor': '12A',
  'G# minor': '1A',
  'D# minor': '2A',
  'Bb minor': '3A',
  'F minor': '4A',
  'C minor': '5A',
  'G minor': '6A',
  'D minor': '7A',
};

/**
 * Get the numeric part of a Camelot code
 */
function getCamelotNumber(camelotCode: string): number {
  return parseInt(camelotCode.replace(/[AB]/, ''), 10);
}

/**
 * Get the letter part of a Camelot code (A or B)
 */
function getCamelotLetter(camelotCode: string): string {
  return camelotCode.match(/[AB]/)?.[0] || 'A';
}

/**
 * Calculate the "distance" between two Camelot codes on the wheel
 * Lower distance = more compatible
 */
function getCamelotDistance(code1: string, code2: string): number {
  const num1 = getCamelotNumber(code1);
  const num2 = getCamelotNumber(code2);
  const letter1 = getCamelotLetter(code1);
  const letter2 = getCamelotLetter(code2);

  // Same code = perfect match
  if (code1 === code2) return 0;

  // Same number, different letter (major/minor relative) = excellent match
  if (num1 === num2 && letter1 !== letter2) return 1;

  // Adjacent numbers on the wheel = good match
  const numDistance = Math.min(
    Math.abs(num1 - num2),
    12 - Math.abs(num1 - num2) // Handle wrap-around (12 -> 1)
  );

  if (numDistance === 1 && letter1 === letter2) return 2;

  // Two steps away = okay match
  if (numDistance === 2 && letter1 === letter2) return 3;

  // Everything else = not compatible
  return 10;
}

/**
 * Compatibility levels
 */
export enum CompatibilityLevel {
  PERFECT = 'perfect',      // Same key
  EXCELLENT = 'excellent',  // Relative major/minor
  GOOD = 'good',            // Adjacent on wheel
  OKAY = 'okay',            // Two steps away
  POOR = 'poor',            // Not compatible
}

/**
 * Get compatibility level between two tracks
 */
export function getCompatibilityLevel(track1: TrackMetadata, track2: TrackMetadata): CompatibilityLevel {
  const distance = getCamelotDistance(track1.camelotCode, track2.camelotCode);

  if (distance === 0) return CompatibilityLevel.PERFECT;
  if (distance === 1) return CompatibilityLevel.EXCELLENT;
  if (distance === 2) return CompatibilityLevel.GOOD;
  if (distance === 3) return CompatibilityLevel.OKAY;
  return CompatibilityLevel.POOR;
}

/**
 * Get compatibility score (0-100) between two tracks
 * Considers both key compatibility and BPM similarity
 */
export function getCompatibilityScore(track1: TrackMetadata, track2: TrackMetadata): number {
  // Key compatibility score (70% weight)
  const distance = getCamelotDistance(track1.camelotCode, track2.camelotCode);
  let keyScore = 0;

  switch (distance) {
    case 0: keyScore = 100; break; // Perfect
    case 1: keyScore = 90; break;  // Excellent
    case 2: keyScore = 75; break;  // Good
    case 3: keyScore = 50; break;  // Okay
    default: keyScore = 20; break; // Poor
  }

  // BPM compatibility score (30% weight)
  const bpmDiff = Math.abs(track1.bpm - track2.bpm);
  let bpmScore = 100;

  if (bpmDiff <= 3) {
    bpmScore = 100; // Very close BPM
  } else if (bpmDiff <= 10) {
    bpmScore = 80; // Close BPM
  } else if (bpmDiff <= 20) {
    bpmScore = 60; // Moderate difference
  } else if (bpmDiff <= 40) {
    bpmScore = 40; // Large difference
  } else {
    bpmScore = 20; // Very large difference
  }

  // Weighted total
  return Math.round(keyScore * 0.7 + bpmScore * 0.3);
}

/**
 * Get all compatible tracks for a given track
 * Returns tracks sorted by compatibility score (highest first)
 */
export function getCompatibleTracks(
  currentTrack: TrackMetadata,
  allTracks: TrackMetadata[],
  minScore: number = 50
): Array<TrackMetadata & { compatibilityScore: number; compatibilityLevel: CompatibilityLevel }> {
  return allTracks
    .filter(track => track.id !== currentTrack.id) // Exclude current track
    .map(track => ({
      ...track,
      compatibilityScore: getCompatibilityScore(currentTrack, track),
      compatibilityLevel: getCompatibilityLevel(currentTrack, track),
    }))
    .filter(track => track.compatibilityScore >= minScore) // Filter by minimum score
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore); // Sort by score descending
}

/**
 * Get the "next best" tracks for mixing
 * This suggests tracks that would create a good energy progression
 */
export function getNextTrackSuggestions(
  currentTrack: TrackMetadata,
  allTracks: TrackMetadata[],
  energyDirection: 'up' | 'down' | 'same' = 'same'
): TrackMetadata[] {
  const compatible = getCompatibleTracks(currentTrack, allTracks, 70); // Only highly compatible tracks

  // Filter by energy direction based on BPM
  let filtered = compatible;

  if (energyDirection === 'up') {
    filtered = compatible.filter(t => t.bpm >= currentTrack.bpm);
  } else if (energyDirection === 'down') {
    filtered = compatible.filter(t => t.bpm <= currentTrack.bpm);
  }

  // Sort by BPM based on direction
  if (energyDirection === 'up') {
    filtered.sort((a, b) => a.bpm - b.bpm); // Closest BPM first (gradual increase)
  } else if (energyDirection === 'down') {
    filtered.sort((a, b) => b.bpm - a.bpm); // Closest BPM first (gradual decrease)
  }

  return filtered.slice(0, 5); // Return top 5 suggestions
}

/**
 * Check if two tracks are in the same tempo category
 * Useful for kid-friendly UI
 */
export function haveSameTempoCategory(track1: TrackMetadata, track2: TrackMetadata): boolean {
  return track1.tempoCategory === track2.tempoCategory;
}

/**
 * Check if two tracks are "friends" (compatible for mixing)
 * Simplified check for kid-friendly UI
 */
export function areTracksFriends(track1: TrackMetadata, track2: TrackMetadata): boolean {
  const score = getCompatibilityScore(track1, track2);
  return score >= 70; // Good or better compatibility
}

/**
 * Get a kid-friendly description of why tracks are compatible
 */
export function getKidFriendlyCompatibilityReason(track1: TrackMetadata, track2: TrackMetadata): string {
  const level = getCompatibilityLevel(track1, track2);
  const sameTempo = haveSameTempoCategory(track1, track2);

  if (level === CompatibilityLevel.PERFECT) {
    return `These songs are twins! They have the exact same color (${track1.key}).`;
  }

  if (level === CompatibilityLevel.EXCELLENT) {
    return `These songs are best friends! They share the same notes and sound great together.`;
  }

  if (level === CompatibilityLevel.GOOD) {
    if (sameTempo) {
      return `These songs are friends! They have similar colors and the same speed.`;
    }
    return `These songs are friends! They have similar colors.`;
  }

  if (level === CompatibilityLevel.OKAY) {
    return `These songs can play together, but it might sound a little different.`;
  }

  return `These songs might not sound great together. Try finding songs with closer colors!`;
}

/**
 * Get tempo emoji for kid-friendly display
 */
export function getTempoEmoji(tempoCategory: 'slow' | 'medium' | 'fast'): string {
  switch (tempoCategory) {
    case 'slow': return '🐢';
    case 'medium': return '🐕';
    case 'fast': return '🐰';
  }
}

/**
 * Get tempo label for kid-friendly display
 */
export function getTempoLabel(tempoCategory: 'slow' | 'medium' | 'fast'): string {
  switch (tempoCategory) {
    case 'slow': return 'Slow & Chill';
    case 'medium': return 'Medium Speed';
    case 'fast': return 'Fast & Energetic';
  }
}

/**
 * Convert BPM to tempo category
 */
export function bpmToTempoCategory(bpm: number): 'slow' | 'medium' | 'fast' {
  if (bpm < 100) return 'slow';
  if (bpm < 130) return 'medium';
  return 'fast';
}
