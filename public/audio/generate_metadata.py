#!/usr/bin/env python3
import json
import subprocess
import os
import re

def get_duration(filepath):
    """Get duration of audio file in seconds"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', filepath],
            capture_output=True,
            text=True,
            check=True
        )
        return int(float(result.stdout.strip()))
    except:
        return 180  # Default fallback

def filename_to_title(filename):
    """Convert filename to readable title"""
    # Remove file extension and numbers
    name = re.sub(r'-\d+\.mp3$', '', filename)
    # Replace hyphens with spaces
    name = name.replace('-', ' ')
    # Capitalize each word
    return name.title()

def generate_track_id(filename):
    """Generate track ID from filename"""
    return filename.replace('.mp3', '')

# Get all MP3 files
audio_dir = '/Users/anniereeves/Project3a/djslammer/dj-slammer-app/public/audio'
mp3_files = sorted([f for f in os.listdir(audio_dir) if f.endswith('.mp3')])

tracks = []
colors = [
    "#00F0FF", "#FF006E", "#00FF00", "#FFFF00", "#FF00FF",
    "#00FFFF", "#FF8800", "#8800FF", "#FF0088", "#88FF00",
    "#0088FF", "#FF8888", "#88FF88", "#8888FF", "#FFAA00",
    "#AA00FF", "#00FFAA", "#FF00AA"
]

for idx, filename in enumerate(mp3_files):
    filepath = os.path.join(audio_dir, filename)
    duration = get_duration(filepath)

    track = {
        "id": generate_track_id(filename),
        "title": filename_to_title(filename),
        "artist": "Pixabay",
        "bpm": 120,  # Placeholder - can be updated later
        "duration": duration,
        "filename": filename,
        "cuePoints": [0],
        "waveformColor": colors[idx % len(colors)]
    }
    tracks.append(track)

# Create metadata structure
metadata = {"tracks": tracks}

# Write to file
output_path = os.path.join(audio_dir, 'tracks-metadata.json')
with open(output_path, 'w') as f:
    json.dump(metadata, f, indent=2)

print(f"Generated metadata for {len(tracks)} tracks")
print(f"Written to: {output_path}")
