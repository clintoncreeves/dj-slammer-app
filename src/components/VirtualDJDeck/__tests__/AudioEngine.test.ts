/**
 * AudioEngine Unit Tests
 *
 * Tests for the core audio engine covering:
 * - Initialization
 * - Play/pause/cue methods
 * - Tempo control (setPlaybackRate)
 * - Crossfade control
 * - Deck volume control
 * - Cleanup/destroy
 *
 * Target: 80% code coverage for AudioEngine.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../AudioEngine';
import { DJDeckError, DJDeckErrorType } from '../types';
import * as Tone from 'tone';

// Mock Tone.js
vi.mock('tone', () => {
  const mockPlayer = {
    load: vi.fn().mockResolvedValue(undefined),
    start: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    loaded: false,
    state: 'stopped',
    playbackRate: 1,
    buffer: null,
    immediate: vi.fn().mockReturnValue(0),
  };

  const mockGain = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    toDestination: vi.fn(),
    gain: { value: 1 },
  };

  const mockCrossFade = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    fade: { value: 0.5 },
    a: {},
    b: {},
  };

  const mockContext = {
    state: 'running',
  };

  return {
    start: vi.fn().mockResolvedValue(undefined),
    Player: vi.fn(() => mockPlayer),
    Gain: vi.fn(() => mockGain),
    CrossFade: vi.fn(() => mockCrossFade),
    getContext: vi.fn(() => mockContext),
  };
});

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AudioEngine();
  });

  afterEach(() => {
    if (engine) {
      try {
        engine.destroy();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Initialization', () => {
    it('should create an AudioEngine instance', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(AudioEngine);
    });

    it('should initialize with default master volume', () => {
      expect(Tone.Gain).toHaveBeenCalledWith(1);
    });

    it('should initialize with custom master volume', () => {
      const customEngine = new AudioEngine({ masterVolume: 0.5 });
      expect(Tone.Gain).toHaveBeenCalledWith(0.5);
      customEngine.destroy();
    });

    it('should initialize crossfader at center position', () => {
      expect(Tone.CrossFade).toHaveBeenCalledWith(0.5);
    });

    it('should initialize audio context and create players', async () => {
      await engine.init();
      expect(Tone.start).toHaveBeenCalled();
      expect(Tone.Player).toHaveBeenCalledTimes(2); // Deck A and B
    });

    it('should throw DJDeckError if initialization fails', async () => {
      vi.mocked(Tone.start).mockRejectedValueOnce(new Error('Context blocked'));
      
      await expect(engine.init()).rejects.toThrow(DJDeckError);
      await expect(engine.init()).rejects.toThrow(DJDeckErrorType.AUDIO_CONTEXT_CREATION_FAILED);
    });

    it('should log warning if initialization takes over 500ms', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const slowStart = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 600)));
      vi.mocked(Tone.start).mockImplementation(slowStart);
      
      await engine.init();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Initialization took longer than 500ms target')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Play/Pause/Cue Methods', () => {
    beforeEach(async () => {
      await engine.init();
      // Mock loaded player
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = true;
      mockPlayer.state = 'stopped';
    });

    it('should throw error if calling play before init', () => {
      const uninitializedEngine = new AudioEngine();
      expect(() => uninitializedEngine.play('A')).toThrow(DJDeckError);
      expect(() => uninitializedEngine.play('A')).toThrow(DJDeckErrorType.AUDIO_CONTEXT_BLOCKED);
    });

    it('should play a track on Deck A', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      engine.play('A');
      
      expect(mockPlayer.start).toHaveBeenCalled();
    });

    it('should play a track on Deck B', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[1].value;
      
      engine.play('B');
      
      expect(mockPlayer.start).toHaveBeenCalled();
    });

    it('should throw error if track not loaded on play', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = false;
      
      expect(() => engine.play('A')).toThrow(DJDeckError);
      expect(() => engine.play('A')).toThrow(DJDeckErrorType.PLAYBACK_FAILED);
    });

    it('should not start player if already playing', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'started';
      
      engine.play('A');
      
      expect(mockPlayer.start).not.toHaveBeenCalled();
    });

    it('should pause a playing deck', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'started';
      
      engine.pause('A');
      
      expect(mockPlayer.stop).toHaveBeenCalled();
    });

    it('should not stop player if already stopped', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'stopped';
      
      engine.pause('A');
      
      expect(mockPlayer.stop).not.toHaveBeenCalled();
    });

    it('should seek to cue point and start playing', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'stopped';
      
      engine.cue('A', 30);
      
      expect(mockPlayer.start).toHaveBeenCalledWith(undefined, 30);
    });

    it('should stop deck before cueing if already playing', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'started';
      
      engine.cue('A', 30);
      
      expect(mockPlayer.stop).toHaveBeenCalled();
      expect(mockPlayer.start).toHaveBeenCalledWith(undefined, 30);
    });

    it('should throw error if track not loaded on cue', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = false;
      
      expect(() => engine.cue('A', 0)).toThrow(DJDeckError);
      expect(() => engine.cue('A', 0)).toThrow(DJDeckErrorType.PLAYBACK_FAILED);
    });

    it('should seek to position in track', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      engine.seek('A', 45.5);
      
      expect(mockPlayer.seek).toHaveBeenCalledWith(45.5);
    });

    it('should log warning if play latency exceeds 20ms', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      // Mock slow start
      mockPlayer.start.mockImplementation(() => {
        const start = performance.now();
        while (performance.now() - start < 25) {
          // Busy wait
        }
      });
      
      engine.play('A');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Play latency exceeded 20ms target')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('setPlaybackRate (Tempo Control)', () => {
    beforeEach(async () => {
      await engine.init();
    });

    it('should set playback rate for tempo control', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      engine.setPlaybackRate('A', 1.1);
      
      expect(mockPlayer.playbackRate).toBe(1.1);
    });

    it('should clamp playback rate to 0.8-1.2 range', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      engine.setPlaybackRate('A', 1.5);
      
      expect(mockPlayer.playbackRate).toBe(1.2); // Clamped to max
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('clamped to 1.2')
      );
      
      consoleSpy.mockRestore();
    });

    it('should clamp low playback rate', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      engine.setPlaybackRate('A', 0.5);
      
      expect(mockPlayer.playbackRate).toBe(0.8); // Clamped to min
    });

    it('should set playback rate for Deck B', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[1].value;
      
      engine.setPlaybackRate('B', 0.95);
      
      expect(mockPlayer.playbackRate).toBe(0.95);
    });

    it('should throw error if engine not initialized', () => {
      const uninitializedEngine = new AudioEngine();
      
      expect(() => uninitializedEngine.setPlaybackRate('A', 1.0)).toThrow(DJDeckError);
    });
  });

  describe('setCrossfade', () => {
    beforeEach(async () => {
      await engine.init();
    });

    it('should set crossfader to center position', () => {
      const mockCrossfade = vi.mocked(Tone.CrossFade).mock.results[0].value;
      
      engine.setCrossfade(0);
      
      expect(mockCrossfade.fade.value).toBe(0.5); // 0 -> 0.5
    });

    it('should set crossfader to full A (-1)', () => {
      const mockCrossfade = vi.mocked(Tone.CrossFade).mock.results[0].value;
      
      engine.setCrossfade(-1);
      
      expect(mockCrossfade.fade.value).toBe(0); // -1 -> 0
    });

    it('should set crossfader to full B (1)', () => {
      const mockCrossfade = vi.mocked(Tone.CrossFade).mock.results[0].value;
      
      engine.setCrossfade(1);
      
      expect(mockCrossfade.fade.value).toBe(1); // 1 -> 1
    });

    it('should clamp crossfade position to valid range', () => {
      const mockCrossfade = vi.mocked(Tone.CrossFade).mock.results[0].value;
      
      engine.setCrossfade(2); // Out of range
      
      expect(mockCrossfade.fade.value).toBe(1); // Clamped to 1
    });

    it('should clamp negative crossfade position', () => {
      const mockCrossfade = vi.mocked(Tone.CrossFade).mock.results[0].value;
      
      engine.setCrossfade(-2); // Out of range
      
      expect(mockCrossfade.fade.value).toBe(0); // Clamped to 0
    });

    it('should throw error if engine not initialized', () => {
      const uninitializedEngine = new AudioEngine();
      
      expect(() => uninitializedEngine.setCrossfade(0)).toThrow(DJDeckError);
    });
  });

  describe('setDeckVolume', () => {
    beforeEach(async () => {
      await engine.init();
    });

    it('should set volume for Deck A', () => {
      const mockGain = vi.mocked(Tone.Gain).mock.results[1].value; // Deck A gain
      
      engine.setDeckVolume('A', 0.7);
      
      expect(mockGain.gain.value).toBe(0.7);
    });

    it('should set volume for Deck B', () => {
      const mockGain = vi.mocked(Tone.Gain).mock.results[2].value; // Deck B gain
      
      engine.setDeckVolume('B', 0.5);
      
      expect(mockGain.gain.value).toBe(0.5);
    });

    it('should clamp volume to 0-1 range', () => {
      const mockGain = vi.mocked(Tone.Gain).mock.results[1].value;
      
      engine.setDeckVolume('A', 1.5);
      
      expect(mockGain.gain.value).toBe(1); // Clamped to max
    });

    it('should clamp negative volume', () => {
      const mockGain = vi.mocked(Tone.Gain).mock.results[1].value;
      
      engine.setDeckVolume('A', -0.5);
      
      expect(mockGain.gain.value).toBe(0); // Clamped to min
    });

    it('should throw error if engine not initialized', () => {
      const uninitializedEngine = new AudioEngine();
      
      expect(() => uninitializedEngine.setDeckVolume('A', 0.5)).toThrow(DJDeckError);
    });
  });

  describe('setMasterVolume', () => {
    beforeEach(async () => {
      await engine.init();
    });

    it('should set master volume', () => {
      const mockMasterGain = vi.mocked(Tone.Gain).mock.results[0].value;
      
      engine.setMasterVolume(0.8);
      
      expect(mockMasterGain.gain.value).toBe(0.8);
    });

    it('should clamp master volume to valid range', () => {
      const mockMasterGain = vi.mocked(Tone.Gain).mock.results[0].value;
      
      engine.setMasterVolume(2);
      
      expect(mockMasterGain.gain.value).toBe(1);
    });
  });

  describe('Track Loading', () => {
    beforeEach(async () => {
      await engine.init();
    });

    it('should load a track for Deck A', async () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      
      await engine.loadTrack('A', '/audio/test.mp3');
      
      expect(mockPlayer.load).toHaveBeenCalledWith('/audio/test.mp3');
    });

    it('should load a track for Deck B', async () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[1].value;
      
      await engine.loadTrack('B', '/audio/test2.mp3');
      
      expect(mockPlayer.load).toHaveBeenCalledWith('/audio/test2.mp3');
    });

    it('should throw DJDeckError if track load fails', async () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.load.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(engine.loadTrack('A', '/audio/bad.mp3')).rejects.toThrow(DJDeckError);
      await expect(engine.loadTrack('A', '/audio/bad.mp3')).rejects.toThrow(
        DJDeckErrorType.TRACK_LOAD_FAILED
      );
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await engine.init();
    });

    it('should check if deck is playing', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'started';
      
      expect(engine.isPlaying('A')).toBe(true);
    });

    it('should return false if deck is not playing', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'stopped';
      
      expect(engine.isPlaying('A')).toBe(false);
    });

    it('should check if track is loaded', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = true;
      
      expect(engine.isLoaded('A')).toBe(true);
    });

    it('should return false if track not loaded', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = false;
      
      expect(engine.isLoaded('A')).toBe(false);
    });

    it('should get current playback time', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = true;
      mockPlayer.immediate.mockReturnValue(42.5);
      
      expect(engine.getCurrentTime('A')).toBe(42.5);
    });

    it('should return 0 if track not loaded when getting time', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = false;
      
      expect(engine.getCurrentTime('A')).toBe(0);
    });

    it('should get track duration', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = true;
      mockPlayer.buffer = { duration: 180 };
      
      expect(engine.getDuration('A')).toBe(180);
    });

    it('should return 0 if no buffer when getting duration', () => {
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.loaded = true;
      mockPlayer.buffer = null;
      
      expect(engine.getDuration('A')).toBe(0);
    });

    it('should get audio context state', () => {
      expect(engine.getContextState()).toBe('running');
    });
  });

  describe('Cleanup/Destroy', () => {
    it('should dispose all resources on destroy', async () => {
      await engine.init();
      
      const mockPlayerA = vi.mocked(Tone.Player).mock.results[0].value;
      const mockPlayerB = vi.mocked(Tone.Player).mock.results[1].value;
      const mockGainA = vi.mocked(Tone.Gain).mock.results[1].value;
      const mockGainB = vi.mocked(Tone.Gain).mock.results[2].value;
      const mockCrossfade = vi.mocked(Tone.CrossFade).mock.results[0].value;
      const mockMasterGain = vi.mocked(Tone.Gain).mock.results[0].value;
      
      engine.destroy();
      
      expect(mockPlayerA.dispose).toHaveBeenCalled();
      expect(mockPlayerB.dispose).toHaveBeenCalled();
      expect(mockGainA.dispose).toHaveBeenCalled();
      expect(mockGainB.dispose).toHaveBeenCalled();
      expect(mockCrossfade.dispose).toHaveBeenCalled();
      expect(mockMasterGain.dispose).toHaveBeenCalled();
    });

    it('should stop playing decks before disposing', async () => {
      await engine.init();
      
      const mockPlayer = vi.mocked(Tone.Player).mock.results[0].value;
      mockPlayer.state = 'started';
      
      engine.destroy();
      
      expect(mockPlayer.stop).toHaveBeenCalled();
    });

    it('should clear internal state after destroy', async () => {
      await engine.init();
      
      engine.destroy();
      
      // Should not be able to use methods after destroy
      expect(() => engine.play('A')).toThrow(DJDeckError);
    });
  });
});
