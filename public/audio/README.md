# Demo Audio Tracks

This directory should contain royalty-free demo audio tracks for the Virtual DJ Deck component.

## Required Tracks

For the MVP, we need **2-4 royalty-free music tracks** with the following characteristics:

### Track Requirements
- **Format**: MP3 (256kbps or higher)
- **BPM**: Similar tempo, ideally 120-125 BPM range
- **Duration**: 2-3 minutes each
- **Quality**: Clear beats, good for beat mixing practice
- **License**: Royalty-free, suitable for educational use
- **File Size**: <10MB per track

### Recommended Sources
1. **Free Music Archive** (freemusicarchive.org)
   - Filter by: Electronic, House, or Hip-Hop genres
   - License: CC BY or CC0

2. **Bensound** (bensound.com)
   - Many tracks with clear beats
   - License: Free with attribution

3. **Incompetech** (incompetech.com)
   - Kevin MacLeod's music library
   - License: CC BY 3.0

4. **YouTube Audio Library**
   - Genre: Electronic, Dance & EDM
   - License: Free to use

### File Structure
```
public/audio/
├── demo-track-1.mp3
├── demo-track-2.mp3
├── demo-track-3.mp3 (optional)
├── demo-track-4.mp3 (optional)
├── tracks-metadata.json
└── README.md (this file)
```

### Metadata Configuration
After adding tracks, update `tracks-metadata.json` with:
- Actual BPM (use a BPM detector tool)
- Exact duration
- Good cue points (beat-aligned positions)

### BPM Detection Tools
- Web: https://tunebat.com/Analyzer
- Desktop: MixMeister BPM Analyzer (free)
- Command line: `ffmpeg` + `aubio`

## Testing Placeholder
For development without actual tracks, the AudioEngine will handle missing files gracefully and display appropriate error messages.
