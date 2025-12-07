#!/bin/bash
# Optimize audio files for web deployment
# This script converts audio files to MP3 at 128kbps for optimal web performance

echo "🎵 DJ Slammer Audio Optimization Script"
echo "========================================"
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed"
    echo ""
    echo "Install ffmpeg:"
    echo "  Mac: brew install ffmpeg"
    echo "  Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p public/audio

# Process all audio files
count=0
for file in public/audio/*.{wav,mp3,m4a,aiff,flac}; do
  # Check if file exists (glob might not match anything)
  if [ ! -f "$file" ]; then
    continue
  fi

  filename=$(basename "$file")
  name="${filename%.*}"
  extension="${filename##*.}"

  echo "Processing: $filename"

  # Skip if already optimized
  if [[ $filename == *"_optimized"* ]]; then
    echo "  ⏭️  Already optimized, skipping"
    echo ""
    continue
  fi

  # Convert to MP3 at 128kbps (good quality, small size)
  output="public/audio/${name}_optimized.mp3"

  ffmpeg -i "$file" \
    -codec:a libmp3lame \
    -b:a 128k \
    -ar 44100 \
    -ac 2 \
    "$output" \
    -y \
    -loglevel error

  if [ $? -eq 0 ]; then
    original_size=$(du -h "$file" | cut -f1)
    new_size=$(du -h "$output" | cut -f1)
    echo "  ✓ Created: ${name}_optimized.mp3"
    echo "  📊 Size: $original_size → $new_size"
    ((count++))
  else
    echo "  ❌ Failed to optimize $filename"
  fi

  echo ""
done

if [ $count -eq 0 ]; then
  echo "No audio files found to optimize."
  echo ""
  echo "Place audio files in public/audio/ with these extensions:"
  echo "  .wav, .mp3, .m4a, .aiff, .flac"
else
  echo "========================================"
  echo "✓ Optimized $count audio file(s)!"
  echo ""
  echo "Next steps:"
  echo "1. Update your code to use *_optimized.mp3 files"
  echo "2. Test audio playback in your app"
  echo "3. Deploy to Vercel"
fi
