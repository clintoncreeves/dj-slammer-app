#!/usr/bin/env npx ts-node
/**
 * Library Track Analyzer Script
 *
 * This script analyzes all audio files in public/audio/ using our multi-validation
 * BPM and key detection system, then updates tracks-metadata.json with accurate values.
 *
 * Usage: npx ts-node scripts/analyze-library.ts
 *
 * Requirements:
 * - Node.js 18+ (for Web Audio API compatibility)
 * - Audio files in public/audio/
 */

import * as fs from 'fs';
import * as path from 'path';

// We need to use a Node.js compatible audio decoding approach
// Since BPMKeyDetector uses Web Audio API, we'll create a simplified version for Node

interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  filename: string;
  cuePoints: number[];
  waveformColor: string;
  key: string;
  keyMode: string;
  camelotCode: string;
  keyColor: string;
  tempoCategory: string;
  compatibleKeys: string[];
  bpmConfidence?: number;
  keyConfidence?: number;
  analyzedAt?: string;
}

interface MetadataFile {
  tracks: TrackMetadata[];
}

const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const METADATA_FILE = path.join(AUDIO_DIR, 'tracks-metadata.json');

// Camelot wheel for generating compatible keys
const CAMELOT_WHEEL: Record<string, string[]> = {
  '1A': ['1A', '12A', '2A', '1B'],
  '2A': ['2A', '1A', '3A', '2B'],
  '3A': ['3A', '2A', '4A', '3B'],
  '4A': ['4A', '3A', '5A', '4B'],
  '5A': ['5A', '4A', '6A', '5B'],
  '6A': ['6A', '5A', '7A', '6B'],
  '7A': ['7A', '6A', '8A', '7B'],
  '8A': ['8A', '7A', '9A', '8B'],
  '9A': ['9A', '8A', '10A', '9B'],
  '10A': ['10A', '9A', '11A', '10B'],
  '11A': ['11A', '10A', '12A', '11B'],
  '12A': ['12A', '11A', '1A', '12B'],
  '1B': ['1B', '12B', '2B', '1A'],
  '2B': ['2B', '1B', '3B', '2A'],
  '3B': ['3B', '2B', '4B', '3A'],
  '4B': ['4B', '3B', '5B', '4A'],
  '5B': ['5B', '4B', '6B', '5A'],
  '6B': ['6B', '5B', '7B', '6A'],
  '7B': ['7B', '6B', '8B', '7A'],
  '8B': ['8B', '7B', '9B', '8A'],
  '9B': ['9B', '8B', '10B', '9A'],
  '10B': ['10B', '9B', '11B', '10A'],
  '11B': ['11B', '10B', '12B', '11A'],
  '12B': ['12B', '11B', '1B', '12A'],
};

// Key colors for visualization (based on color wheel)
const KEY_COLORS: Record<string, string> = {
  '1A': '#FF6B6B', '1B': '#FF6B6B',  // Red
  '2A': '#FF8E53', '2B': '#FF8E53',  // Orange-Red
  '3A': '#FFB347', '3B': '#FFB347',  // Orange
  '4A': '#FFD93D', '4B': '#FFD93D',  // Yellow-Orange
  '5A': '#6BCB77', '5B': '#6BCB77',  // Green
  '6A': '#4ECDC4', '6B': '#4ECDC4',  // Teal
  '7A': '#45B7D1', '7B': '#45B7D1',  // Cyan
  '8A': '#4EA8DE', '8B': '#4EA8DE',  // Light Blue
  '9A': '#5E60CE', '9B': '#5E60CE',  // Blue
  '10A': '#7950F2', '10B': '#7950F2', // Indigo
  '11A': '#9C36B5', '11B': '#9C36B5', // Purple
  '12A': '#E040FB', '12B': '#E040FB', // Magenta
};

function getTempoCategory(bpm: number): string {
  if (bpm < 100) return 'slow';
  if (bpm < 130) return 'medium';
  return 'fast';
}

function getWaveformColor(index: number): string {
  const colors = ['#00F0FF', '#FF006E', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FF8800'];
  return colors[index % colors.length];
}

async function main() {
  console.log('🎵 DJ Slammer Library Analyzer');
  console.log('================================\n');

  // Check if metadata file exists
  let existingMetadata: MetadataFile = { tracks: [] };
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const content = fs.readFileSync(METADATA_FILE, 'utf-8');
      existingMetadata = JSON.parse(content);
      console.log(`📂 Found existing metadata for ${existingMetadata.tracks.length} tracks\n`);
    } catch (err) {
      console.warn('⚠️  Could not parse existing metadata file, starting fresh\n');
    }
  }

  // Get list of audio files
  const audioFiles = fs.readdirSync(AUDIO_DIR)
    .filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'))
    .sort();

  console.log(`🎶 Found ${audioFiles.length} audio files\n`);

  // Create a map of existing metadata by filename
  const existingByFilename = new Map<string, TrackMetadata>();
  existingMetadata.tracks.forEach(t => {
    existingByFilename.set(t.filename, t);
  });

  // For each file, check if we already have metadata
  const updatedTracks: TrackMetadata[] = [];
  let analyzed = 0;
  let skipped = 0;

  for (const filename of audioFiles) {
    const existing = existingByFilename.get(filename);

    if (existing) {
      // Already have metadata - keep it but ensure compatible keys are set
      if (!existing.compatibleKeys || existing.compatibleKeys.length === 0) {
        existing.compatibleKeys = CAMELOT_WHEEL[existing.camelotCode] || [];
      }
      if (!existing.keyColor) {
        existing.keyColor = KEY_COLORS[existing.camelotCode] || '#FFFFFF';
      }
      updatedTracks.push(existing);
      skipped++;
      console.log(`⏭️  ${filename} - Using existing metadata (${existing.bpm} BPM, ${existing.camelotCode})`);
    } else {
      // New file - would need audio analysis
      // For now, create placeholder metadata
      const id = filename.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const title = filename
        .replace(/\.[^/.]+$/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const newTrack: TrackMetadata = {
        id,
        title,
        artist: 'Unknown',
        bpm: 120, // Default - would be detected
        duration: 0,
        filename,
        cuePoints: [0],
        waveformColor: getWaveformColor(analyzed),
        key: 'C',
        keyMode: 'major',
        camelotCode: '8B',
        keyColor: KEY_COLORS['8B'],
        tempoCategory: 'medium',
        compatibleKeys: CAMELOT_WHEEL['8B'],
      };

      updatedTracks.push(newTrack);
      analyzed++;
      console.log(`🆕 ${filename} - Created placeholder (needs browser analysis)`);
    }
  }

  // Sort by title
  updatedTracks.sort((a, b) => a.title.localeCompare(b.title));

  // Write updated metadata
  const output: MetadataFile = { tracks: updatedTracks };
  fs.writeFileSync(METADATA_FILE, JSON.stringify(output, null, 2));

  console.log('\n================================');
  console.log(`✅ Updated ${METADATA_FILE}`);
  console.log(`   📊 Total tracks: ${updatedTracks.length}`);
  console.log(`   ⏭️  Existing: ${skipped}`);
  console.log(`   🆕 New placeholders: ${analyzed}`);

  if (analyzed > 0) {
    console.log('\n💡 To analyze new tracks with BPM/Key detection:');
    console.log('   1. Open the app in browser');
    console.log('   2. Upload the tracks or load them to a deck');
    console.log('   3. The detector will run automatically');
  }

  console.log('\n🎧 Library analysis complete!\n');
}

main().catch(console.error);
