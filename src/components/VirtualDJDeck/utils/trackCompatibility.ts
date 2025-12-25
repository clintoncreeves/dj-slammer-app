/**
 * Track Compatibility Engine
 *
 * Calculates compatibility between tracks based on BPM and musical key
 * using the Camelot wheel system for harmonic mixing.
 *
 * Inspired by Rekordbox DJ for helping Tanner find the perfect next track!
 */

import { TrackMetadata } from '../types';

/**
 * BPM match levels
 */
export type BPMMatchLevel = 'exact' | 'close' | 'compatible' | 'incompatible';

/**
 * Key match levels based on Camelot wheel
 */
export type KeyMatchLevel = 'same' | 'compatible' | 'incompatible';

/**
 * Relationship type on Camelot wheel
 */
export type KeyRelationship =
  | 'same'           // Same key (8A → 8A)
  | 'adjacent-up'    // +1 number, energy boost (8A → 9A)
  | 'adjacent-down'  // -1 number, energy drop (8A → 7A)
  | 'relative'       // Same number, different letter (8A → 8B)
  | 'incompatible';  // Too far apart

/**
 * Result of track compatibility calculation
 */
export interface TrackCompatibility {
  /** Track being compared */
  track: TrackMetadata;
  /** BPM match level */
  bpmMatch: BPMMatchLevel;
  /** Percentage difference in BPM (0-100) */
  bpmDifference: number;
  /** Whether BPM matches at half or double time */
  halfDoubleTime: boolean;
  /** Key match level */
  keyMatch: KeyMatchLevel;
  /** Relationship on Camelot wheel */
  keyRelationship: KeyRelationship;
  /** Human-readable key relationship */
  keyRelationshipLabel: string;
  /** Overall compatibility score (0-100) */
  overallScore: number;
  /** DJ tip for this match */
  mixTip?: string;
}

/**
 * BPM matching thresholds
 */
const BPM_THRESHOLDS = {
  EXACT: 0,      // 0% difference
  CLOSE: 2,      // ±2% difference
  COMPATIBLE: 6, // ±6% difference
};

/**
 * Calculate BPM difference percentage
 */
function getBPMDifference(bpm1: number, bpm2: number): number {
  return Math.abs((bpm2 - bpm1) / bpm1) * 100;
}

/**
 * Check if BPM matches at half or double time
 * e.g., 140 BPM matches with 70 BPM (half time) or 128 matches with 64
 */
function checkHalfDoubleTime(bpm1: number, bpm2: number): boolean {
  const halfBpm1 = bpm1 / 2;
  const doubleBpm1 = bpm1 * 2;

  // Check within 3% tolerance
  const tolerance = 0.03;

  const matchesHalf = Math.abs((bpm2 - halfBpm1) / halfBpm1) <= tolerance;
  const matchesDouble = Math.abs((bpm2 - doubleBpm1) / doubleBpm1) <= tolerance;

  return matchesHalf || matchesDouble;
}

/**
 * Get BPM match level
 */
function getBPMMatchLevel(bpm1: number, bpm2: number): { level: BPMMatchLevel; difference: number; halfDouble: boolean } {
  const difference = getBPMDifference(bpm1, bpm2);

  if (difference <= BPM_THRESHOLDS.EXACT + 0.5) {
    return { level: 'exact', difference, halfDouble: false };
  }
  if (difference <= BPM_THRESHOLDS.CLOSE) {
    return { level: 'close', difference, halfDouble: false };
  }
  if (difference <= BPM_THRESHOLDS.COMPATIBLE) {
    return { level: 'compatible', difference, halfDouble: false };
  }

  // Check half/double time
  if (checkHalfDoubleTime(bpm1, bpm2)) {
    return { level: 'compatible', difference, halfDouble: true };
  }

  return { level: 'incompatible', difference, halfDouble: false };
}

/**
 * Parse Camelot code into number and letter
 * e.g., "8A" → { number: 8, letter: 'A' }
 */
function parseCamelotCode(code: string): { number: number; letter: 'A' | 'B' } | null {
  const match = code.match(/^(\d{1,2})([AB])$/);
  if (!match) return null;

  return {
    number: parseInt(match[1], 10),
    letter: match[2] as 'A' | 'B',
  };
}

/**
 * Get key relationship between two Camelot codes
 */
function getKeyRelationship(code1: string, code2: string): {
  match: KeyMatchLevel;
  relationship: KeyRelationship;
  label: string;
} {
  const parsed1 = parseCamelotCode(code1);
  const parsed2 = parseCamelotCode(code2);

  if (!parsed1 || !parsed2) {
    return { match: 'incompatible', relationship: 'incompatible', label: 'Unknown key' };
  }

  const { number: n1, letter: l1 } = parsed1;
  const { number: n2, letter: l2 } = parsed2;

  // Same key
  if (n1 === n2 && l1 === l2) {
    return { match: 'same', relationship: 'same', label: 'Same key' };
  }

  // Relative major/minor (same number, different letter)
  if (n1 === n2 && l1 !== l2) {
    const label = l1 === 'A' ? 'Relative major' : 'Relative minor';
    return { match: 'compatible', relationship: 'relative', label };
  }

  // Adjacent keys (same letter, ±1 number with wrapping 1-12)
  if (l1 === l2) {
    // Handle Camelot wheel wrapping (12 → 1, 1 → 12)
    const distance = Math.abs(n2 - n1);
    const wrappedDistance = Math.min(distance, 12 - distance);

    if (wrappedDistance === 1) {
      // Determine direction for energy
      const isUp = (n2 - n1 + 12) % 12 === 1;
      const relationship = isUp ? 'adjacent-up' : 'adjacent-down';
      const label = isUp ? 'Energy boost (+1)' : 'Energy drop (-1)';
      return { match: 'compatible', relationship, label };
    }

    if (wrappedDistance === 2) {
      return { match: 'compatible', relationship: 'adjacent-up', label: 'Two steps away' };
    }
  }

  // Check if it's in the compatible keys list (allows for cross-letter adjacent)
  // This handles cases like 8A → 9B (diagonal on wheel)

  return { match: 'incompatible', relationship: 'incompatible', label: 'Keys may clash' };
}

/**
 * Calculate overall compatibility score (0-100)
 */
function calculateOverallScore(
  bpmMatch: BPMMatchLevel,
  bpmDifference: number,
  keyMatch: KeyMatchLevel,
  keyRelationship: KeyRelationship
): number {
  let score = 0;

  // BPM contributes 40 points max
  switch (bpmMatch) {
    case 'exact':
      score += 40;
      break;
    case 'close':
      score += 35 - (bpmDifference * 2);
      break;
    case 'compatible':
      score += 25 - (bpmDifference * 1.5);
      break;
    case 'incompatible':
      score += Math.max(0, 15 - bpmDifference);
      break;
  }

  // Key contributes 60 points max
  switch (keyMatch) {
    case 'same':
      score += 60;
      break;
    case 'compatible':
      // Relative and adjacent get slightly different scores
      if (keyRelationship === 'relative') {
        score += 55; // Relative major/minor is very smooth
      } else if (keyRelationship === 'adjacent-up') {
        score += 50; // Energy boost is exciting
      } else if (keyRelationship === 'adjacent-down') {
        score += 48; // Energy drop is smooth
      } else {
        score += 40; // Other compatible
      }
      break;
    case 'incompatible':
      score += 10;
      break;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Generate a DJ tip for the track match
 */
function generateMixTip(
  compatibility: Pick<TrackCompatibility, 'bpmMatch' | 'bpmDifference' | 'keyMatch' | 'keyRelationship' | 'halfDoubleTime'>
): string | undefined {
  const { bpmMatch, bpmDifference, keyMatch, keyRelationship, halfDoubleTime } = compatibility;

  // Perfect match
  if (bpmMatch === 'exact' && keyMatch === 'same') {
    return "Perfect match! Same key and BPM - smooth mix incoming! ✨";
  }

  // Great harmonic match with close BPM
  if (keyMatch === 'same' && bpmMatch === 'close') {
    return `Same key! Nudge the tempo ${bpmDifference > 0 ? 'down' : 'up'} ${Math.round(bpmDifference)}% to sync.`;
  }

  // Energy boost
  if (keyRelationship === 'adjacent-up' && (bpmMatch === 'exact' || bpmMatch === 'close')) {
    return "Energy boost! This will lift the energy up. Great for building to a drop! 🔥";
  }

  // Relative key
  if (keyRelationship === 'relative') {
    return "Relative key - switching between major and minor for nice mood shift!";
  }

  // Half/double time match
  if (halfDoubleTime) {
    return "Half-time/double-time match! Great for tempo transitions.";
  }

  // BPM needs adjustment
  if (bpmMatch === 'compatible' && keyMatch !== 'incompatible') {
    return `Adjust tempo by ~${Math.round(bpmDifference)}% to sync the beats.`;
  }

  // Key clash warning
  if (keyMatch === 'incompatible' && (bpmMatch === 'exact' || bpmMatch === 'close')) {
    return "⚠️ Keys don't match - the mix might sound off. Try a different track!";
  }

  return undefined;
}

/**
 * Calculate compatibility between a reference track and another track
 */
export function calculateTrackCompatibility(
  referenceTrack: TrackMetadata,
  compareTrack: TrackMetadata
): TrackCompatibility {
  // Get BPM match
  const bpmResult = getBPMMatchLevel(referenceTrack.bpm, compareTrack.bpm);

  // Get key match
  const keyResult = getKeyRelationship(
    referenceTrack.camelotCode,
    compareTrack.camelotCode
  );

  // Calculate overall score
  const overallScore = calculateOverallScore(
    bpmResult.level,
    bpmResult.difference,
    keyResult.match,
    keyResult.relationship
  );

  const compatibility = {
    track: compareTrack,
    bpmMatch: bpmResult.level,
    bpmDifference: Math.round(bpmResult.difference * 10) / 10,
    halfDoubleTime: bpmResult.halfDouble,
    keyMatch: keyResult.match,
    keyRelationship: keyResult.relationship,
    keyRelationshipLabel: keyResult.label,
    overallScore,
  };

  return {
    ...compatibility,
    mixTip: generateMixTip(compatibility),
  };
}

/**
 * Get all compatible tracks sorted by compatibility score
 */
export function getCompatibleTracks(
  referenceTrack: TrackMetadata,
  allTracks: TrackMetadata[],
  options: {
    /** Minimum score to include (0-100) */
    minScore?: number;
    /** Maximum number of results */
    limit?: number;
    /** Exclude the reference track from results */
    excludeReference?: boolean;
  } = {}
): TrackCompatibility[] {
  const { minScore = 50, limit = 10, excludeReference = true } = options;

  const compatibilities = allTracks
    // Optionally exclude reference track
    .filter(track => !excludeReference || track.id !== referenceTrack.id)
    // Calculate compatibility for each
    .map(track => calculateTrackCompatibility(referenceTrack, track))
    // Filter by minimum score
    .filter(compat => compat.overallScore >= minScore)
    // Sort by score descending
    .sort((a, b) => b.overallScore - a.overallScore);

  return limit ? compatibilities.slice(0, limit) : compatibilities;
}

/**
 * Get a smart DJ suggestion based on what's currently playing
 */
export function getDJSuggestion(
  masterTrack: TrackMetadata,
  allTracks: TrackMetadata[],
  currentDeckB?: TrackMetadata
): {
  topMatch: TrackCompatibility | null;
  currentDeckBCompatibility: TrackCompatibility | null;
  suggestion: string;
} {
  const compatible = getCompatibleTracks(masterTrack, allTracks, { limit: 3 });
  const topMatch = compatible[0] || null;

  // Check current Deck B compatibility if a track is loaded
  const currentDeckBCompatibility = currentDeckB
    ? calculateTrackCompatibility(masterTrack, currentDeckB)
    : null;

  let suggestion = '';

  if (!topMatch) {
    suggestion = "No perfect matches found - try experimenting!";
  } else if (currentDeckBCompatibility && currentDeckBCompatibility.overallScore >= 80) {
    suggestion = currentDeckBCompatibility.mixTip || "Great match already loaded! Go for it!";
  } else if (topMatch.overallScore >= 90) {
    suggestion = `Try "${topMatch.track.title}" - ${topMatch.mixTip || 'great match!'}`;
  } else if (topMatch.overallScore >= 70) {
    suggestion = `"${topMatch.track.title}" could work nicely (${topMatch.overallScore}% match)`;
  } else {
    suggestion = `Best option: "${topMatch.track.title}" (${topMatch.overallScore}% match)`;
  }

  return { topMatch, currentDeckBCompatibility, suggestion };
}

/**
 * Format compatibility score for display
 */
export function formatCompatibilityScore(score: number): string {
  if (score >= 90) return '⭐⭐⭐';
  if (score >= 75) return '⭐⭐';
  if (score >= 50) return '⭐';
  return '○';
}

/**
 * Get BPM match color for UI
 */
export function getBPMMatchColor(match: BPMMatchLevel): string {
  switch (match) {
    case 'exact': return '#00FF88';
    case 'close': return '#88FF00';
    case 'compatible': return '#FFFF00';
    case 'incompatible': return '#FF6666';
  }
}

/**
 * Get key match color for UI
 */
export function getKeyMatchColor(match: KeyMatchLevel): string {
  switch (match) {
    case 'same': return '#00FF88';
    case 'compatible': return '#88FF00';
    case 'incompatible': return '#FF6666';
  }
}
