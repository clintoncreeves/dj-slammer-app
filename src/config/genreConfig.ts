/**
 * Genre Configuration
 *
 * Visual identity and metadata for each simplified genre category
 */

import { SimplifiedGenre } from '../components/VirtualDJDeck/types';

export interface GenreConfig {
  id: SimplifiedGenre;
  name: string;
  kidFriendlyName: string;
  emoji: string;
  color: string;
  description: string;
  character: string; // Character association for kids
  examples: string[]; // Example artists/styles
}

/**
 * Genre configurations with kid-friendly names and visual identity
 */
export const GENRE_CONFIGS: Record<SimplifiedGenre, GenreConfig> = {
  electronic: {
    id: 'electronic',
    name: 'Electronic',
    kidFriendlyName: '🤖 Robot Music',
    emoji: '🤖',
    color: '#00D9FF', // Cyan
    description: 'Computer-made beats and sounds',
    character: 'Robo DJ',
    examples: ['House', 'Techno', 'Trance', 'Dubstep', 'EDM'],
  },
  hiphop: {
    id: 'hiphop',
    name: 'Hip-Hop',
    kidFriendlyName: '🎤 Rap & Rhymes',
    emoji: '🎤',
    color: '#FF6B9D', // Pink
    description: 'Rhyming words over beats',
    character: 'MC Doggy',
    examples: ['Rap', 'Hip-Hop', 'Trap', 'Drill'],
  },
  pop: {
    id: 'pop',
    name: 'Pop',
    kidFriendlyName: '⭐ Sing-Along',
    emoji: '⭐',
    color: '#FFD700', // Gold
    description: 'Catchy songs everyone knows',
    character: 'Pop Star Kitty',
    examples: ['Pop', 'Top 40', 'Radio Hits'],
  },
  rock: {
    id: 'rock',
    name: 'Rock',
    kidFriendlyName: '🎸 Rock Power',
    emoji: '🎸',
    color: '#FF4500', // Orange-Red
    description: 'Guitars, drums, and energy',
    character: 'Rock Pup',
    examples: ['Rock', 'Alternative', 'Indie Rock', 'Punk'],
  },
  dance: {
    id: 'dance',
    name: 'Dance',
    kidFriendlyName: '💃 Dance Party',
    emoji: '💃',
    color: '#9C27B0', // Purple
    description: 'Music that makes you move',
    character: 'Dance Bunny',
    examples: ['Dance Pop', 'Disco', 'Funk', 'Breakbeat'],
  },
  chill: {
    id: 'chill',
    name: 'Chill',
    kidFriendlyName: '😌 Calm Vibes',
    emoji: '😌',
    color: '#4CAF50', // Green
    description: 'Relaxing and peaceful sounds',
    character: 'Chill Turtle',
    examples: ['Lo-Fi', 'Chillout', 'Ambient', 'Downtempo'],
  },
  classical: {
    id: 'classical',
    name: 'Classical',
    kidFriendlyName: '🎻 Orchestra',
    emoji: '🎻',
    color: '#8B4513', // Brown
    description: 'Music from orchestras and pianos',
    character: 'Maestro Mouse',
    examples: ['Classical', 'Piano', 'Orchestra', 'Baroque'],
  },
  world: {
    id: 'world',
    name: 'World',
    kidFriendlyName: '🌍 World Beats',
    emoji: '🌍',
    color: '#FF8C00', // Dark Orange
    description: 'Music from around the globe',
    character: 'World Traveler',
    examples: ['Latin', 'African', 'Asian', 'Reggae', 'Bollywood'],
  },
};

/**
 * Get genre configuration by ID
 */
export function getGenreConfig(genre: SimplifiedGenre): GenreConfig {
  return GENRE_CONFIGS[genre];
}

/**
 * Get all genre configurations as an array
 */
export function getAllGenreConfigs(): GenreConfig[] {
  return Object.values(GENRE_CONFIGS);
}

/**
 * Get genre emoji
 */
export function getGenreEmoji(genre: SimplifiedGenre): string {
  return GENRE_CONFIGS[genre].emoji;
}

/**
 * Get genre color
 */
export function getGenreColor(genre: SimplifiedGenre): string {
  return GENRE_CONFIGS[genre].color;
}

/**
 * Get kid-friendly genre name
 */
export function getGenreKidName(genre: SimplifiedGenre): string {
  return GENRE_CONFIGS[genre].kidFriendlyName;
}
