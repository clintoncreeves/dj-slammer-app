/**
 * Property-Based Tests for AudioEngine Resource Cleanup
 *
 * **Feature: virtual-dj-deck, Property 7: Resource cleanup is complete**
 *
 * This test validates that all Audio Context resources (players, gain nodes, buffers)
 * are properly disconnected and garbage collected when AudioEngine instances are destroyed.
 *
 * **Validates: Requirements 7.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AudioEngine } from '../../src/components/VirtualDJDeck/AudioEngine';
import { DeckId } from '../../src/components/VirtualDJDeck/types';

// Track mock instances for cleanup verification
const mockPlayerInstances: any[] = [];
const mockGainInstances: any[] = [];
const mockCrossFadeInstances: any[] = [];

// Mock Tone.js to track resource creation and cleanup
vi.mock('tone', () => {
  const createMockPlayer = () => {
    const mockPlayer = {
      loaded: true,
      state: 'stopped',
      buffer: {
        duration: 10,
        get: () => ({
          duration: 10,
          numberOfChannels: 2,
          sampleRate: 44100,
          getChannelData: () => new Float32Array(44100),
        }),
      },
      load: vi.fn().mockResolvedValue(undefined),
      start: vi.fn(function (this: any) {
        this.state = 'started';
      }),
      stop: vi.fn(function (this: any) {
        this.state = 'stopped';
      }),
      seek: vi.fn(),
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      immediate: vi.fn().mockReturnValue(0),
      playbackRate: 1,
      _disposed: false,
    };

    // Override dispose to mark as disposed
    const originalDispose = mockPlayer.dispose;
    mockPlayer.dispose = vi.fn(() => {
      mockPlayer._disposed = true;
      originalDispose();
    });

    mockPlayerInstances.push(mockPlayer);
    return mockPlayer;
  };

  const createMockGain = () => {
    const mockGain = {
      gain: { value: 1 },
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      toDestination: vi.fn().mockReturnThis(),
      _disposed: false,
    };

    // Override dispose to mark as disposed
    const originalDispose = mockGain.dispose;
    mockGain.dispose = vi.fn(() => {
      mockGain._disposed = true;
      originalDispose();
    });

    mockGainInstances.push(mockGain);
    return mockGain;
  };

  const createMockCrossFade = () => {
    const mockCrossFade = {
      fade: { value: 0.5 },
      a: {},
      b: {},
      connect: vi.fn().mockReturnThis(),
      disconnect: vi.fn(),
      dispose: vi.fn(),
      _disposed: false,
    };

    // Override dispose to mark as disposed
    const originalDispose = mockCrossFade.dispose;
    mockCrossFade.dispose = vi.fn(() => {
      mockCrossFade._disposed = true;
      originalDispose();
    });

    mockCrossFadeInstances.push(mockCrossFade);
    return mockCrossFade;
  };

  return {
    start: vi.fn().mockResolvedValue(undefined),
    getContext: vi.fn(() => ({
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    })),
    Player: vi.fn(createMockPlayer),
    Gain: vi.fn(createMockGain),
    CrossFade: vi.fn(createMockCrossFade),
  };
});

describe('Property 7: Resource cleanup is complete', () => {
  beforeEach(() => {
    // Clear tracking arrays before each test
    mockPlayerInstances.length = 0;
    mockGainInstances.length = 0;
    mockCrossFadeInstances.length = 0;
  });

  afterEach(() => {
    // Clear tracking arrays after each test
    mockPlayerInstances.length = 0;
    mockGainInstances.length = 0;
    mockCrossFadeInstances.length = 0;
  });

  it('should properly dispose all resources when a single instance is destroyed', async () => {
    // Property: For any AudioEngine instance that is destroyed,
    // all resources should be properly disposed
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether to load tracks
        fc.boolean(), // Whether to play before destroying
        async (shouldLoadTracks: boolean, shouldPlay: boolean) => {
          // Create and initialize AudioEngine
          const audioEngine = new AudioEngine();
          await audioEngine.init();

          // Track the number of resources created for this instance
          const initialPlayerCount = mockPlayerInstances.length;
          const initialGainCount = mockGainInstances.length;
          const initialCrossFadeCount = mockCrossFadeInstances.length;

          // Optionally load tracks
          if (shouldLoadTracks) {
            await audioEngine.loadTrack('A', 'mock-track-a.mp3');
            await audioEngine.loadTrack('B', 'mock-track-b.mp3');
          }

          // Optionally play
          if (shouldPlay && shouldLoadTracks) {
            try {
              audioEngine.play('A');
              audioEngine.play('B');
            } catch (error) {
              // Ignore errors if tracks not loaded
            }
          }

          // Destroy the instance
          audioEngine.destroy();

          // Verify all players created for this instance are disposed
          const playersForThisInstance = mockPlayerInstances.slice(initialPlayerCount);
          playersForThisInstance.forEach((player) => {
            expect(player.dispose).toHaveBeenCalled();
            expect(player._disposed).toBe(true);
            expect(player.disconnect).toHaveBeenCalled();
          });

          // Verify all gains created for this instance are disposed
          const gainsForThisInstance = mockGainInstances.slice(initialGainCount);
          gainsForThisInstance.forEach((gain) => {
            expect(gain.dispose).toHaveBeenCalled();
            expect(gain._disposed).toBe(true);
            expect(gain.disconnect).toHaveBeenCalled();
          });

          // Verify crossfader is disposed
          const crossfadersForThisInstance = mockCrossFadeInstances.slice(
            initialCrossFadeCount
          );
          crossfadersForThisInstance.forEach((crossfader) => {
            expect(crossfader.dispose).toHaveBeenCalled();
            expect(crossfader._disposed).toBe(true);
            expect(crossfader.disconnect).toHaveBeenCalled();
          });

          return true;
        }
      ),
      {
        numRuns: 100, // Run 100 iterations as specified
        verbose: true,
      }
    );
  });

  it('should properly clean up resources for multiple instances created and destroyed', async () => {
    // Property: For any number of AudioEngine instances created and destroyed,
    // all resources should be properly cleaned up without leaks
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of instances to create
        async (numInstances: number) => {
          const instances: AudioEngine[] = [];

          // Track initial resource counts
          const initialPlayerCount = mockPlayerInstances.length;
          const initialGainCount = mockGainInstances.length;
          const initialCrossFadeCount = mockCrossFadeInstances.length;

          // Create multiple instances
          for (let i = 0; i < numInstances; i++) {
            const audioEngine = new AudioEngine();
            await audioEngine.init();
            instances.push(audioEngine);
          }

          // Verify resources were created
          expect(mockPlayerInstances.length).toBeGreaterThan(initialPlayerCount);
          expect(mockGainInstances.length).toBeGreaterThan(initialGainCount);
          expect(mockCrossFadeInstances.length).toBeGreaterThan(initialCrossFadeCount);

          // Destroy all instances
          instances.forEach((instance) => {
            instance.destroy();
          });

          // Verify all resources created for these instances are disposed
          const playersForTheseInstances = mockPlayerInstances.slice(initialPlayerCount);
          playersForTheseInstances.forEach((player) => {
            expect(player.dispose).toHaveBeenCalled();
            expect(player._disposed).toBe(true);
          });

          const gainsForTheseInstances = mockGainInstances.slice(initialGainCount);
          gainsForTheseInstances.forEach((gain) => {
            expect(gain.dispose).toHaveBeenCalled();
            expect(gain._disposed).toBe(true);
          });

          const crossfadersForTheseInstances = mockCrossFadeInstances.slice(
            initialCrossFadeCount
          );
          crossfadersForTheseInstances.forEach((crossfader) => {
            expect(crossfader.dispose).toHaveBeenCalled();
            expect(crossfader._disposed).toBe(true);
          });

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should handle destroy being called multiple times without errors', async () => {
    // Property: Calling destroy() multiple times should be safe and not cause errors
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // Number of times to call destroy
        async (numDestroyCalls: number) => {
          // Create and initialize AudioEngine
          const audioEngine = new AudioEngine();
          await audioEngine.init();

          // Call destroy multiple times
          for (let i = 0; i < numDestroyCalls; i++) {
            expect(() => audioEngine.destroy()).not.toThrow();
          }

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should stop all playing decks before cleanup', async () => {
    // Property: When destroying an instance with playing decks,
    // all players should be stopped before disposal
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom<DeckId>('A', 'B'), { minLength: 0, maxLength: 2 }), // Which decks to play
        async (decksToPlay: DeckId[]) => {
          // Create and initialize AudioEngine
          const audioEngine = new AudioEngine();
          await audioEngine.init();

          // Load tracks
          await audioEngine.loadTrack('A', 'mock-track-a.mp3');
          await audioEngine.loadTrack('B', 'mock-track-b.mp3');

          // Track initial player count
          const initialPlayerCount = mockPlayerInstances.length;

          // Play specified decks
          decksToPlay.forEach((deck) => {
            audioEngine.play(deck);
          });

          // Destroy the instance
          audioEngine.destroy();

          // Verify all players were stopped before disposal
          const playersForThisInstance = mockPlayerInstances.slice(initialPlayerCount);
          playersForThisInstance.forEach((player) => {
            // Player should be stopped (either explicitly or via dispose)
            expect(player.stop).toHaveBeenCalled();
            expect(player.dispose).toHaveBeenCalled();
          });

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should clear all internal state after destroy', async () => {
    // Property: After destroy, the AudioEngine should not be usable
    // and should throw appropriate errors
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<DeckId>('A', 'B'),
        async (deck: DeckId) => {
          // Create and initialize AudioEngine
          const audioEngine = new AudioEngine();
          await audioEngine.init();

          // Destroy the instance
          audioEngine.destroy();

          // Attempting to use the engine after destroy should throw
          expect(() => audioEngine.play(deck)).toThrow();
          expect(() => audioEngine.pause(deck)).toThrow();
          expect(() => audioEngine.setCrossfade(0)).toThrow();

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should handle destroy of instances with partially loaded tracks', async () => {
    // Property: Destroying an instance while tracks are loading should not cause errors
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // Whether to load deck A
        fc.boolean(), // Whether to load deck B
        async (loadDeckA: boolean, loadDeckB: boolean) => {
          // Create and initialize AudioEngine
          const audioEngine = new AudioEngine();
          await audioEngine.init();

          // Track initial resource count
          const initialPlayerCount = mockPlayerInstances.length;

          // Optionally load tracks
          if (loadDeckA) {
            await audioEngine.loadTrack('A', 'mock-track-a.mp3');
          }
          if (loadDeckB) {
            await audioEngine.loadTrack('B', 'mock-track-b.mp3');
          }

          // Destroy should not throw regardless of loading state
          expect(() => audioEngine.destroy()).not.toThrow();

          // Verify resources are disposed
          const playersForThisInstance = mockPlayerInstances.slice(initialPlayerCount);
          playersForThisInstance.forEach((player) => {
            expect(player.dispose).toHaveBeenCalled();
          });

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });
});
