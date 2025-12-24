# Archived Code

This folder contains code that is no longer actively used in the application but has been preserved for reference.

## Archived Files

### VirtualDJDeck Components

| File | Description | Archived Date |
|------|-------------|---------------|
| `VirtualDJDeck.tsx` | Original basic DJ deck component, superseded by `VirtualDJDeck_Professional.tsx` | 2025-12-24 |
| `VirtualDJDeck.module.css` | CSS for the basic deck component | 2025-12-24 |
| `VirtualDJDeck_Rekordbox.tsx` | Alternative Rekordbox-style implementation | 2025-12-24 |
| `Crossfader_Rekordbox.tsx` | Rekordbox-style crossfader variant | 2025-12-24 |
| `Mixer_Rekordbox.tsx` | Rekordbox-style mixer variant | 2025-12-24 |
| `FirstLesson.module.css` | CSS for removed FirstLesson component | 2025-12-24 |
| `CompatibleTracks.tsx` | Kid-friendly compatible tracks feature (not integrated) | 2025-12-24 |
| `TrackInfo.tsx` | Track info display with kid-friendly badges (not integrated) | 2025-12-24 |

## Why Archived

These files were archived during the UX consolidation to a single "Pro Mode" experience:
- The Rekordbox variant was an alternative design that wasn't selected
- The basic VirtualDJDeck was superseded by the Professional version
- Kid-friendly components (CompatibleTracks, TrackInfo) weren't integrated into the current UI
- FirstLesson was removed as part of the UX redesign

## Restoration

If any of these components need to be restored, simply move them back to their original location in `src/components/VirtualDJDeck/` and update the index.tsx exports.
