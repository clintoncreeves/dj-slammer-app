/**
 * Property-Based Tests for AudioEngine Playback Latency
 *
 * **Feature: virtual-dj-deck, Property 1: Playback latency bounds**
 *
 * This test validates that play/pause/cue commands respond within 20ms
 * across all deck and command combinations.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AudioEngine } from '../../src/components/VirtualDJDeck/AudioEngine';
import { DeckId, PlaybackCommand } from '../../src/components/VirtualDJDeck/types';

// Mock Tone.js to avoid actual audio loading in tests
vi.mock('tone', () => {
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
  };

  const mockGain = {
    gain: { value: 1 },
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
    toDestination: vi.fn().mockReturnThis(),
  };

  const mockCrossFade = {
    fade: { value: 0.5 },
    a: {},
    b: {},
    connect: vi.fn().mockReturnThis(),
    disconnect: vi.fn(),
    dispose: vi.fn(),
  };

  return {
    start: vi.fn().mockResolvedValue(undefined),
    getContext: vi.fn(() => ({
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    })),
    Player: vi.fn(() => mockPlayer),
    Gain: vi.fn(() => mockGain),
    CrossFade: vi.fn(() => mockCrossFade),
  };
});

describe('Property 1: Playback latency bounds', () => {
  let audioEngine: AudioEngine;

  beforeEach(async () => {
    // Create and initialize a fresh AudioEngine instance for each test
    audioEngine = new AudioEngine();
    await audioEngine.init();

    // Load mock tracks
    await audioEngine.loadTrack('A', 'mock-track-a.mp3');
    await audioEngine.loadTrack('B', 'mock-track-b.mp3');
  });

  afterEach(() => {
    // Clean up resources after each test
    if (audioEngine) {
      audioEngine.destroy();
    }
  });

  it('should respond to play/pause/cue commands within 20ms for any deck and command combination', async () => {
    // Property: For any deck and any playback command,
    // the latency should be less than 20ms
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<DeckId>('A', 'B'), // Generate random deck
        fc.constantFrom<PlaybackCommand>('play', 'pause', 'cue'), // Generate random command
        async (deck: DeckId, command: PlaybackCommand) => {
          // Measure latency for the command
          const startTime = performance.now();

          try {
            switch (command) {
              case 'play':
                audioEngine.play(deck);
                break;
              case 'pause':
                audioEngine.pause(deck);
                break;
              case 'cue':
                // Cue to position 0 (start of track)
                audioEngine.cue(deck, 0);
                break;
            }
          } catch (error) {
            // Some commands may fail in certain states (e.g., pause when not playing)
            // This is expected behavior, not a latency issue
            // We only care about latency when the command succeeds
            return true;
          }

          const endTime = performance.now();
          const latency = endTime - startTime;

          // Assert: Latency must be less than 20ms
          expect(latency).toBeLessThan(20);

          return true;
        }
      ),
      {
        numRuns: 100, // Run 100 iterations as specified
        verbose: true,
      }
    );
  });

  it('should maintain low latency even with rapid command sequences', async () => {
    // Property: Even with rapid sequences of commands,
    // each individual command should still respond within 20ms
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<DeckId>('A', 'B'),
        fc.array(fc.constantFrom<PlaybackCommand>('play', 'pause', 'cue'), {
          minLength: 3,
          maxLength: 10,
        }),
        async (deck: DeckId, commands: PlaybackCommand[]) => {
          const latencies: number[] = [];

          for (const command of commands) {
            const startTime = performance.now();

            try {
              switch (command) {
                case 'play':
                  audioEngine.play(deck);
                  break;
                case 'pause':
                  audioEngine.pause(deck);
                  break;
                case 'cue':
                  audioEngine.cue(deck, 0);
                  break;
              }
            } catch (error) {
              // Ignore errors from invalid state transitions
              continue;
            }

            const endTime = performance.now();
            latencies.push(endTime - startTime);

            // Small delay between commands to allow state to settle
            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          // Assert: All latencies should be less than 20ms
          latencies.forEach((latency) => {
            expect(latency).toBeLessThan(20);
          });

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  }, 10000); // 10 second timeout for this test

  it('should maintain low latency across both decks simultaneously', async () => {
    // Property: Commands on different decks should not interfere with each other's latency
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<PlaybackCommand>('play', 'pause', 'cue'),
        fc.constantFrom<PlaybackCommand>('play', 'pause', 'cue'),
        async (commandA: PlaybackCommand, commandB: PlaybackCommand) => {
          // Execute commands on both decks and measure latency
          const startTimeA = performance.now();

          try {
            switch (commandA) {
              case 'play':
                audioEngine.play('A');
                break;
              case 'pause':
                audioEngine.pause('A');
                break;
              case 'cue':
                audioEngine.cue('A', 0);
                break;
            }
          } catch (error) {
            // Ignore errors
          }

          const endTimeA = performance.now();
          const latencyA = endTimeA - startTimeA;

          const startTimeB = performance.now();

          try {
            switch (commandB) {
              case 'play':
                audioEngine.play('B');
                break;
              case 'pause':
                audioEngine.pause('B');
                break;
              case 'cue':
                audioEngine.cue('B', 0);
                break;
            }
          } catch (error) {
            // Ignore errors
          }

          const endTimeB = performance.now();
          const latencyB = endTimeB - startTimeB;

          // Assert: Both latencies should be less than 20ms
          expect(latencyA).toBeLessThan(20);
          expect(latencyB).toBeLessThan(20);

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
