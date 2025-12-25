# MIDI Controller Setup Guide - For Tanner

This guide will help you connect a MIDI DJ controller to DJ Slammer so you can mix with real hardware instead of clicking with your mouse!

---

## What is MIDI?

MIDI (Musical Instrument Digital Interface) is how music equipment talks to computers. When you move a knob or push a button on a DJ controller, it sends a MIDI message that DJ Slammer can understand.

---

## What You'll Need

1. **A MIDI DJ Controller** - Examples:
   - Numark DJ2GO2
   - Hercules DJControl
   - Pioneer DDJ series
   - Native Instruments Traktor controllers
   - Any USB MIDI controller with faders and buttons

2. **A USB cable** to connect the controller to your computer

3. **Google Chrome browser** (MIDI only works in Chrome, not Safari or Firefox)

---

## Step 1: Connect Your Controller

1. **Plug in your DJ controller** using the USB cable
2. Your computer should recognize it automatically
3. Some controllers have a power switch - make sure it's ON

---

## Step 2: Enable MIDI in DJ Slammer

1. **Open DJ Slammer** in Google Chrome
2. Look for the **MIDI icon** (looks like a 5-pin connector) in the interface
3. **Click it** to open MIDI settings
4. Chrome will ask for permission: **"DJ Slammer wants to access your MIDI devices"**
5. Click **"Allow"**

---

## Step 3: Select Your Controller

1. After allowing MIDI access, you'll see a list of connected MIDI devices
2. **Find your controller** in the list (it will show the controller's name)
3. **Click to select it**
4. The status should change to "Connected"

---

## How Controls Are Mapped

DJ Slammer automatically maps common DJ controller layouts. Here's what typically controls what:

### Deck A (Left Side of Controller)
| Controller Part | What It Does |
|-----------------|--------------|
| Left Play button | Play/Pause Deck A |
| Left Cue button | Cue Deck A |
| Left Sync button | Sync Deck A to Deck B |
| Left volume fader | Deck A volume |
| Left tempo slider | Deck A tempo/pitch |
| Left EQ knobs | Deck A LOW/MID/HIGH |
| Left jog wheel | Scratch/seek Deck A |

### Deck B (Right Side of Controller)
| Controller Part | What It Does |
|-----------------|--------------|
| Right Play button | Play/Pause Deck B |
| Right Cue button | Cue Deck B |
| Right Sync button | Sync Deck B to Deck A |
| Right volume fader | Deck B volume |
| Right tempo slider | Deck B tempo/pitch |
| Right EQ knobs | Deck B LOW/MID/HIGH |
| Right jog wheel | Scratch/seek Deck B |

### Center Controls
| Controller Part | What It Does |
|-----------------|--------------|
| Crossfader | Mix between Deck A and Deck B |

---

## MIDI Learn Mode (Custom Mapping)

If your controller isn't automatically recognized, or you want to change what controls what:

1. **Open MIDI Settings** (click the MIDI icon)
2. **Click "MIDI Learn"** button
3. **Click on a control in DJ Slammer** (like the Deck A play button)
4. **Move the control on your DJ controller** that you want to use
5. DJ Slammer will link them together!
6. **Repeat** for each control you want to map
7. **Click "Save Mapping"** when done

Your custom mapping will be saved and remembered next time!

---

## Common DJ Controller Setups

### Numark DJ2GO2 Touch
This is a great beginner controller:
- Small and portable
- Has all the essential controls
- Plugs right into USB
- Should auto-map in DJ Slammer

### Hercules DJControl Inpulse 200/300
Popular beginner controller:
- Larger with better jog wheels
- Built-in sound card
- Light-up pads
- Great for learning

### Pioneer DDJ-200/400
Industry standard brand:
- Professional feel
- Excellent build quality
- More features for advanced mixing

---

## Troubleshooting

### "No MIDI devices found"
1. Make sure your controller is plugged in via USB
2. Make sure it's powered on
3. Try unplugging and plugging it back in
4. Refresh the browser page
5. Try a different USB port

### "MIDI access denied"
1. Make sure you're using **Google Chrome** (not Safari or Firefox)
2. When Chrome asks for MIDI permission, click **"Allow"**
3. If you accidentally clicked "Block", go to Chrome settings:
   - Click the lock icon in the URL bar
   - Find "MIDI" in the permissions
   - Change it to "Allow"
   - Refresh the page

### Controller connected but nothing happens
1. Check that the correct device is selected in DJ Slammer's MIDI settings
2. Try the **MIDI Learn** feature to manually map controls
3. Make sure you're moving the controls on the correct side (left = Deck A, right = Deck B)

### Jog wheels not working
Jog wheels can be tricky:
- They might need to be mapped manually via MIDI Learn
- Some jog wheels have a "vinyl mode" switch - try toggling it
- Touch-sensitive jog wheels might need special setup

### Faders moving but values jumping around
This usually means the fader range needs calibration:
1. Open MIDI Settings
2. Look for "Calibrate" option
3. Move each fader from minimum to maximum
4. This tells DJ Slammer the full range of your faders

---

## Tips for Using Hardware

### 1. Start with Just the Crossfader
Get comfortable using the crossfader on your controller first. It's the most important control!

### 2. Use the Volume Faders
Practice bringing tracks in and out with the volume faders - it's smoother than just the crossfader.

### 3. Learn the EQ Knobs
Twist the LOW knob down before bringing in a new track, then swap the bass as you mix.

### 4. The Jog Wheel Takes Practice
Scratching and beatmatching with the jog wheel takes time. Don't get frustrated!

### 5. Muscle Memory
The more you use your controller, the more natural it will feel. Practice makes perfect!

---

## Ask Zach for Help!

If you're having trouble:
- Getting the controller connected
- Understanding how to map controls
- Figuring out why something isn't working

Zach can help you troubleshoot! MIDI can sometimes be finicky, and having someone experienced look at it makes things much easier.

---

## Advanced: Manual MIDI Mapping Reference

If you need to manually map your controller, here are the control types in DJ Slammer:

| Control | Type | Notes |
|---------|------|-------|
| Play buttons | Note On/Off | Usually Note 11 or similar |
| Cue buttons | Note On/Off | Usually Note 12 or similar |
| Sync buttons | Note On/Off | Varies by controller |
| Volume faders | CC (Control Change) | Value 0-127 |
| Crossfader | CC | Value 0-127 |
| Tempo sliders | CC | Value 0-127, center = 64 |
| EQ knobs | CC | Value 0-127, center = 64 |
| Jog wheels | CC or Pitch Bend | Can be relative or absolute |

Each control sends on a specific MIDI channel and CC number. Use MIDI Learn to figure out what your controller sends, or check your controller's manual.

---

Happy mixing with your controller! 🎛️🎧
