#!/usr/bin/env npx ts-node
/**
 * Node.js Library Analyzer Script
 *
 * Analyzes all audio files using Node.js compatible audio decoding.
 * Uses music-tempo for BPM detection.
 *
 * Usage: npx ts-node scripts/analyze-library-node.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  keyMode: 'major' | 'minor';
  camelotCode: string;
  keyColor: string;
  tempoCategory: 'slow' | 'medium' | 'fast';
  compatibleKeys: string[];
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

// Key colors for visualization
const KEY_COLORS: Record<string, string> = {
  '1A': '#FF6B6B', '1B': '#FF6B6B',
  '2A': '#FF8E53', '2B': '#FF8E53',
  '3A': '#FFB347', '3B': '#FFB347',
  '4A': '#FFD93D', '4B': '#FFD93D',
  '5A': '#6BCB77', '5B': '#6BCB77',
  '6A': '#4ECDC4', '6B': '#4ECDC4',
  '7A': '#45B7D1', '7B': '#45B7D1',
  '8A': '#4EA8DE', '8B': '#4EA8DE',
  '9A': '#5E60CE', '9B': '#5E60CE',
  '10A': '#7950F2', '10B': '#7950F2',
  '11A': '#9C36B5', '11B': '#9C36B5',
  '12A': '#E040FB', '12B': '#E040FB',
};

// Waveform colors
const WAVEFORM_COLORS = [
  '#00F0FF', '#FF006E', '#00FF00', '#FFFF00', '#FF00FF',
  '#00FFFF', '#FF8800', '#8800FF', '#FF0088', '#88FF00',
  '#0088FF', '#FF8888', '#88FF88', '#8888FF', '#FFAA00',
  '#AA00FF', '#00FFAA', '#FF00AA',
];

function getTempoCategory(bpm: number): 'slow' | 'medium' | 'fast' {
  if (bpm < 100) return 'slow';
  if (bpm < 130) return 'medium';
  return 'fast';
}

function formatTitle(filename: string): string {
  return filename
    .replace(/\.mp3$/i, '')
    .replace(/-\d+$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bAmp\b/gi, '&')
    .replace(/\bX\b/g, 'x')
    .replace(/\bFeat\b/gi, 'feat.')
    .replace(/\bCanx27t\b/gi, "Can't")
    .trim();
}

function generateCuePoints(duration: number): number[] {
  if (duration <= 30) return [0];
  if (duration <= 60) return [0, Math.floor(duration / 2)];

  const points: number[] = [0];
  const interval = Math.floor(duration / 4);
  for (let i = 1; i < 4; i++) {
    points.push(Math.floor(interval * i));
  }
  if (duration > 120) {
    const extraInterval = Math.floor(duration / 6);
    for (let i = 4; i < 6; i++) {
      const point = Math.floor(extraInterval * i);
      if (!points.includes(point) && point < duration - 10) {
        points.push(point);
      }
    }
  }
  return points.sort((a, b) => a - b);
}

function getDuration(filepath: string): number {
  try {
    // Use ffprobe to get duration
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`,
      { encoding: 'utf-8' }
    );
    return Math.round(parseFloat(result.trim()));
  } catch {
    console.log(`  Could not get duration for ${path.basename(filepath)}`);
    return 0;
  }
}

async function main() {
  console.log('🎵 DJ Slammer Library Analyzer (Node.js)');
  console.log('=========================================\n');

  // Check if ffprobe is available
  try {
    execSync('ffprobe -version', { stdio: 'ignore' });
  } catch {
    console.log('⚠️  ffprobe not found. Install ffmpeg for duration detection.');
    console.log('   On macOS: brew install ffmpeg\n');
  }

  // Load existing metadata
  let existingMetadata: MetadataFile = { tracks: [] };
  const existingByFilename = new Map<string, TrackMetadata>();

  if (fs.existsSync(METADATA_FILE)) {
    try {
      const content = fs.readFileSync(METADATA_FILE, 'utf-8');
      existingMetadata = JSON.parse(content);
      existingMetadata.tracks.forEach(t => existingByFilename.set(t.filename, t));
      console.log(`📂 Found existing metadata for ${existingMetadata.tracks.length} tracks\n`);
    } catch (err) {
      console.warn('⚠️  Could not parse existing metadata file\n');
    }
  }

  // Get all audio files
  const audioFiles = fs.readdirSync(AUDIO_DIR)
    .filter(f => f.endsWith('.mp3') || f.endsWith('.wav') || f.endsWith('.ogg'))
    .sort();

  console.log(`🎶 Found ${audioFiles.length} audio files\n`);

  // Process each file
  const allTracks: TrackMetadata[] = [];
  let updated = 0;
  let created = 0;

  for (let i = 0; i < audioFiles.length; i++) {
    const filename = audioFiles[i];
    const filepath = path.join(AUDIO_DIR, filename);
    const existing = existingByFilename.get(filename);

    // Generate ID
    const id = filename
      .replace(/\.mp3$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Get duration
    const duration = existing?.duration || getDuration(filepath);

    if (existing) {
      // Keep existing but ensure all fields are present
      const track: TrackMetadata = {
        ...existing,
        id: existing.id || id,
        duration: duration || existing.duration,
        compatibleKeys: existing.compatibleKeys?.length > 0
          ? existing.compatibleKeys
          : CAMELOT_WHEEL[existing.camelotCode] || [],
        keyColor: existing.keyColor || KEY_COLORS[existing.camelotCode] || '#FFFFFF',
        tempoCategory: existing.tempoCategory || getTempoCategory(existing.bpm),
      };
      allTracks.push(track);
      console.log(`✓ ${filename} (existing: ${track.bpm} BPM, ${track.camelotCode})`);
    } else {
      // Create new entry with placeholder BPM/key
      // These will be detected when loaded in the browser
      const waveformColor = WAVEFORM_COLORS[created % WAVEFORM_COLORS.length];
      const defaultCamelot = '8B';

      const track: TrackMetadata = {
        id,
        title: formatTitle(filename),
        artist: 'Pixabay',
        bpm: 120, // Placeholder - will be detected in browser
        duration,
        filename,
        cuePoints: generateCuePoints(duration),
        waveformColor,
        key: 'C',
        keyMode: 'major',
        camelotCode: defaultCamelot,
        keyColor: KEY_COLORS[defaultCamelot],
        tempoCategory: 'medium',
        compatibleKeys: CAMELOT_WHEEL[defaultCamelot],
      };
      allTracks.push(track);
      created++;
      console.log(`+ ${filename} (new: ${duration}s) - needs browser analysis`);
    }
  }

  // Sort by title
  allTracks.sort((a, b) => a.title.localeCompare(b.title));

  // Write updated metadata
  const output: MetadataFile = { tracks: allTracks };
  fs.writeFileSync(METADATA_FILE, JSON.stringify(output, null, 2));

  console.log('\n=========================================');
  console.log(`✅ Updated ${METADATA_FILE}`);
  console.log(`   📊 Total tracks: ${allTracks.length}`);
  console.log(`   ✓ Existing: ${allTracks.length - created}`);
  console.log(`   + New: ${created}`);

  if (created > 0) {
    console.log('\n💡 To analyze new tracks with accurate BPM/Key detection:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Open: http://localhost:3000/?analyze=true');
    console.log('   3. Click "Analyze New Tracks Only"');
    console.log('   4. Download the updated JSON and replace tracks-metadata.json');
  }

  console.log('\n🎧 Done!\n');
}

main().catch(console.error);
