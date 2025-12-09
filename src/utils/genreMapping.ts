/**
 * Genre Mapping Utilities
 *
 * Functions for mapping raw genres to simplified categories,
 * checking genre compatibility, and providing genre-based recommendations
 */

import { SimplifiedGenre, GenreCompatibility, TrackMetadata } from '../components/VirtualDJDeck/types';
import { getGenreConfig } from '../config/genreConfig';

/**
 * Genre compatibility matrix
 * Defines how well different genres mix together
 */
const GENRE_COMPATIBILITY: Record<SimplifiedGenre, Record<SimplifiedGenre, GenreCompatibility>> = {
  electronic: {
    electronic: 'perfect',
    dance: 'excellent',
    hiphop: 'good',
    pop: 'good',
    rock: 'okay',
    chill: 'okay',
    classical: 'challenging',
    world: 'okay',
  },
  dance: {
    dance: 'perfect',
    electronic: 'excellent',
    pop: 'excellent',
    hiphop: 'good',
    rock: 'okay',
    chill: 'okay',
    world: 'good',
    classical: 'challenging',
  },
  hiphop: {
    hiphop: 'perfect',
    pop: 'excellent',
    electronic: 'good',
    dance: 'good',
    rock: 'good',
    world: 'good',
    chill: 'okay',
    classical: 'challenging',
  },
  pop: {
    pop: 'perfect',
    dance: 'excellent',
    hiphop: 'excellent',
    electronic: 'good',
    rock: 'good',
    world: 'good',
    chill: 'okay',
    classical: 'okay',
  },
  rock: {
    rock: 'perfect',
    pop: 'good',
    hiphop: 'good',
    electronic: 'okay',
    dance: 'okay',
    world: 'okay',
    chill: 'okay',
    classical: 'challenging',
  },
  chill: {
    chill: 'perfect',
    electronic: 'good',
    world: 'good',
    classical: 'good',
    pop: 'okay',
    hiphop: 'okay',
    dance: 'okay',
    rock: 'okay',
  },
  classical: {
    classical: 'perfect',
    chill: 'good',
    world: 'okay',
    pop: 'okay',
    electronic: 'challenging',
    dance: 'challenging',
    hiphop: 'challenging',
    rock: 'challenging',
  },
  world: {
    world: 'perfect',
    dance: 'excellent',
    pop: 'good',
    hiphop: 'good',
    chill: 'good',
    electronic: 'okay',
    rock: 'okay',
    classical: 'okay',
  },
};

/**
 * Map raw genre string to simplified genre category
 */
export function mapToSimplifiedGenre(rawGenre: string): SimplifiedGenre {
  const normalized = rawGenre.toLowerCase().trim();

  // Electronic genres
  if (
    normalized.includes('electronic') ||
    normalized.includes('house') ||
    normalized.includes('techno') ||
    normalized.includes('trance') ||
    normalized.includes('dubstep') ||
    normalized.includes('edm') ||
    normalized.includes('electro') ||
    normalized.includes('synth')
  ) {
    return 'electronic';
  }

  // Hip-Hop genres
  if (
    normalized.includes('hip') ||
    normalized.includes('hop') ||
    normalized.includes('rap') ||
    normalized.includes('trap') ||
    normalized.includes('drill')
  ) {
    return 'hiphop';
  }

  // Dance genres
  if (
    normalized.includes('dance') ||
    normalized.includes('disco') ||
    normalized.includes('funk') ||
    normalized.includes('breakbeat') ||
    normalized.includes('garage')
  ) {
    return 'dance';
  }

  // Pop genres
  if (normalized.includes('pop')) {
    return 'pop';
  }

  // Rock genres
  if (
    normalized.includes('rock') ||
    normalized.includes('alternative') ||
    normalized.includes('indie') ||
    normalized.includes('punk') ||
    normalized.includes('grunge')
  ) {
    return 'rock';
  }

  // Chill genres
  if (
    normalized.includes('chill') ||
    normalized.includes('lofi') ||
    normalized.includes('lo-fi') ||
    normalized.includes('ambient') ||
    normalized.includes('downtempo') ||
    normalized.includes('jazz') ||
    normalized.includes('soul')
  ) {
    return 'chill';
  }

  // Classical genres
  if (
    normalized.includes('classical') ||
    normalized.includes('piano') ||
    normalized.includes('orchestra') ||
    normalized.includes('baroque') ||
    normalized.includes('symphony')
  ) {
    return 'classical';
  }

  // World genres
  if (
    normalized.includes('latin') ||
    normalized.includes('african') ||
    normalized.includes('reggae') ||
    normalized.includes('world') ||
    normalized.includes('bollywood') ||
    normalized.includes('salsa') ||
    normalized.includes('samba')
  ) {
    return 'world';
  }

  // Default fallback - try to guess by BPM if we have it
  // (This would require passing BPM, but we'll default to electronic for now)
  return 'electronic';
}

/**
 * Check genre compatibility between two tracks
 */
export function getGenreCompatibility(
  genreA: SimplifiedGenre,
  genreB: SimplifiedGenre
): GenreCompatibility {
  return GENRE_COMPATIBILITY[genreA][genreB];
}

/**
 * Check if two genres are compatible for mixing
 * Returns true if compatibility is 'perfect', 'excellent', or 'good'
 */
export function areGenresCompatible(
  genreA: SimplifiedGenre,
  genreB: SimplifiedGenre
): boolean {
  const compatibility = getGenreCompatibility(genreA, genreB);
  return ['perfect', 'excellent', 'good'].includes(compatibility);
}

/**
 * Get a numeric score for genre compatibility (0-100)
 */
export function getGenreCompatibilityScore(
  genreA: SimplifiedGenre,
  genreB: SimplifiedGenre
): number {
  const compatibility = getGenreCompatibility(genreA, genreB);

  const scores: Record<GenreCompatibility, number> = {
    perfect: 100,
    excellent: 85,
    good: 70,
    okay: 50,
    challenging: 25,
  };

  return scores[compatibility];
}

/**
 * Find compatible tracks from a library based on a reference track
 * Considers both genre and BPM compatibility
 */
export function findCompatibleTracks(
  referenceTrack: TrackMetadata,
  trackLibrary: TrackMetadata[],
  options: {
    maxBPMDifference?: number;
    minCompatibilityScore?: number;
    limitResults?: number;
  } = {}
): TrackMetadata[] {
  const {
    maxBPMDifference = 20,
    minCompatibilityScore = 50,
    limitResults = 10,
  } = options;

  return trackLibrary
    .filter((track) => track.id !== referenceTrack.id) // Exclude the reference track itself
    .map((track) => {
      // Calculate genre compatibility score
      const genreScore = getGenreCompatibilityScore(
        referenceTrack.simplifiedGenre,
        track.simplifiedGenre
      );

      // Calculate BPM compatibility score
      const bpmDiff = Math.abs(track.bpm - referenceTrack.bpm);
      const bpmScore = Math.max(0, 100 - (bpmDiff / maxBPMDifference) * 100);

      // Combined score: 60% genre, 40% BPM
      const totalScore = genreScore * 0.6 + bpmScore * 0.4;

      return { track, score: totalScore };
    })
    .filter(({ score }) => score >= minCompatibilityScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limitResults)
    .map(({ track }) => track);
}

/**
 * Get genre description for kids
 */
export function getGenreDescription(genre: SimplifiedGenre): string {
  const config = getGenreConfig(genre);
  return config.description;
}

/**
 * Get genre compatibility message for kids
 */
export function getCompatibilityMessage(compatibility: GenreCompatibility): string {
  const messages: Record<GenreCompatibility, string> = {
    perfect: '🌟 Perfect Match! These songs go together perfectly!',
    excellent: '✨ Great Mix! These songs sound awesome together!',
    good: '👍 Nice Mix! These songs can work together!',
    okay: '🤔 Tricky Mix - You can make it work with practice!',
    challenging: '⚠️ Super Tricky! This is a hard mix - try something easier first!',
  };

  return messages[compatibility];
}

/**
 * Determine energy level based on BPM and genre
 */
export function determineEnergyLevel(bpm: number, genre: SimplifiedGenre): 'low' | 'medium' | 'high' {
  // Chill and classical are typically low energy regardless of BPM
  if (genre === 'chill' || genre === 'classical') {
    return bpm > 120 ? 'medium' : 'low';
  }

  // For other genres, use BPM thresholds
  if (bpm < 100) return 'low';
  if (bpm < 130) return 'medium';
  return 'high';
}

/**
 * Get energy emoji
 */
export function getEnergyEmoji(energy: 'low' | 'medium' | 'high'): string {
  const emojis = {
    low: '🐢',
    medium: '🚶',
    high: '🏃',
  };
  return emojis[energy];
}
