#!/usr/bin/env python3
"""
Audio Analysis Pipeline for DJ Slammer
Extracts BPM, duration, and other metadata from audio files
"""
import json
import os
import subprocess
import librosa
import numpy as np
from pathlib import Path

class AudioAnalyzer:
    def __init__(self, audio_dir):
        self.audio_dir = Path(audio_dir)

    def get_duration_ffprobe(self, filepath):
        """Get duration using ffprobe (more accurate for MP3)"""
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1', str(filepath)],
                capture_output=True,
                text=True,
                check=True
            )
            return int(float(result.stdout.strip()))
        except:
            return None

    def detect_bpm(self, filepath):
        """Detect BPM using librosa's beat tracking"""
        try:
            # Load audio file
            y, sr = librosa.load(str(filepath), duration=120)  # Analyze first 2 minutes

            # Extract tempo (BPM)
            tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)

            # Handle both scalar and array returns
            if isinstance(tempo, np.ndarray):
                tempo = float(tempo[0]) if len(tempo) > 0 else float(tempo)
            else:
                tempo = float(tempo)

            # Return rounded BPM
            return int(round(tempo))
        except Exception as e:
            print(f"  Warning: Could not detect BPM for {filepath.name}: {e}")
            return 120  # Default fallback

    def detect_key(self, filepath):
        """Detect musical key using chromagram analysis"""
        try:
            y, sr = librosa.load(str(filepath), duration=30)  # Analyze first 30 seconds

            # Compute chromagram
            chroma = librosa.feature.chroma_cqt(y=y, sr=sr)

            # Average chroma across time
            chroma_avg = np.mean(chroma, axis=1)

            # Find dominant pitch class
            key_index = np.argmax(chroma_avg)

            # Map to key names
            keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

            return keys[key_index]
        except Exception as e:
            print(f"  Warning: Could not detect key for {filepath.name}: {e}")
            return None

    def generate_cue_points(self, duration, bpm):
        """Generate cue points at regular intervals (every 16 bars)"""
        # Calculate seconds per beat
        seconds_per_beat = 60.0 / bpm

        # 16 bars = 64 beats (assuming 4/4 time)
        seconds_per_16_bars = seconds_per_beat * 64

        cue_points = [0]  # Always start at 0

        # Add cue points every 16 bars
        current_time = seconds_per_16_bars
        while current_time < duration - 10:  # Stop 10 seconds before end
            cue_points.append(int(current_time))
            current_time += seconds_per_16_bars

        return cue_points

    def analyze_track(self, filepath):
        """Analyze a single audio track and return metadata"""
        print(f"Analyzing: {filepath.name}")

        # Get duration
        duration = self.get_duration_ffprobe(filepath)
        if duration is None:
            print(f"  Error: Could not get duration")
            return None

        # Detect BPM
        bpm = self.detect_bpm(filepath)
        print(f"  BPM: {bpm}")

        # Detect key
        key = self.detect_key(filepath)
        if key:
            print(f"  Key: {key}")

        # Generate cue points
        cue_points = self.generate_cue_points(duration, bpm)

        return {
            'duration': duration,
            'bpm': bpm,
            'key': key,
            'cue_points': cue_points
        }

    def filename_to_title(self, filename):
        """Convert filename to readable title"""
        import re
        # Remove file extension and numbers
        name = re.sub(r'-\d+\.mp3$', '', filename)
        # Replace hyphens with spaces
        name = name.replace('-', ' ')
        # Capitalize each word
        return name.title()

    def generate_track_id(self, filename):
        """Generate track ID from filename"""
        return filename.replace('.mp3', '')

    def analyze_all_tracks(self):
        """Analyze all MP3 files in the audio directory"""
        # Get all MP3 files
        mp3_files = sorted(self.audio_dir.glob('*.mp3'))

        if not mp3_files:
            print("No MP3 files found!")
            return

        print(f"Found {len(mp3_files)} tracks to analyze\n")

        tracks = []
        colors = [
            "#00F0FF", "#FF006E", "#00FF00", "#FFFF00", "#FF00FF",
            "#00FFFF", "#FF8800", "#8800FF", "#FF0088", "#88FF00",
            "#0088FF", "#FF8888", "#88FF88", "#8888FF", "#FFAA00",
            "#AA00FF", "#00FFAA", "#FF00AA"
        ]

        for idx, filepath in enumerate(mp3_files):
            # Analyze track
            analysis = self.analyze_track(filepath)

            if analysis is None:
                continue

            # Build track metadata
            track = {
                "id": self.generate_track_id(filepath.name),
                "title": self.filename_to_title(filepath.name),
                "artist": "Pixabay",
                "bpm": analysis['bpm'],
                "duration": analysis['duration'],
                "filename": filepath.name,
                "cuePoints": analysis['cue_points'],
                "waveformColor": colors[idx % len(colors)]
            }

            # Add key if detected
            if analysis['key']:
                track['key'] = analysis['key']

            tracks.append(track)
            print()  # Empty line between tracks

        # Create metadata structure
        metadata = {"tracks": tracks}

        # Write to file
        output_path = self.audio_dir / 'tracks-metadata.json'
        with open(output_path, 'w') as f:
            json.dump(metadata, f, indent=2)

        print(f"✓ Generated metadata for {len(tracks)} tracks")
        print(f"✓ Written to: {output_path}")

        return metadata

def main():
    audio_dir = '/Users/anniereeves/Project3a/djslammer/dj-slammer-app/public/audio'
    analyzer = AudioAnalyzer(audio_dir)
    analyzer.analyze_all_tracks()

if __name__ == '__main__':
    main()
