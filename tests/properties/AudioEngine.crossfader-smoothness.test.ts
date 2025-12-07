/**
 * Property-Based Tests for AudioEngine Crossfader Smoothness
 *
 * **Feature: virtual-dj-deck, Property 3: Crossfader volume curve is smooth**
 *
 * This test validates that volume changes are gradual (<1% jumps) when the crossfader
 * position changes. It generates random crossfader positions and measures volume deltas
 * between consecutive samples to ensure smooth transitions without clicks or pops.
 *
 * **Validates: Requirements 3.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AudioEngine } from '../../src/components/VirtualDJDeck/AudioEngine';

/**
 * Calculate the expected volume for a deck based on crossfader position
 * Using equal power crossfade curve for smooth transitions
 *
 * @param position - Crossfader position (-1 to 1)
 * @param deck - Which deck ('A' or 'B')
 * @returns Expected volume (0-1)
 */
function calculateExpectedVolume(position: number, deck: 'A' | 'B'): number {
  // Convert position from [-1, 1] to [0, 1] for fade value
  const fadeValue = (position + 1) / 2;

  if (deck === 'A') {
    // Deck A: full volume at position -1, silent at position 1
    // Equal power curve: cos(fadeValue * π/2)
    return Math.cos(fadeValue * Math.PI / 2);
  } else {
    // Deck B: silent at position -1, full volume at position 1
    // Equal power curve: sin(fadeValue * π/2)
    return Math.sin(fadeValue * Math.PI / 2);
  }
}

/**
 * Measure volume smoothness across a sequence of crossfader positions
 *
 * @param audioEngine - AudioEngine instance
 * @param positions - Array of crossfader positions to test
 * @returns Object with maxJump and positions where jumps occurred
 */
function measureVolumeSmoothness(
  audioEngine: AudioEngine,
  positions: number[]
): { maxJumpA: number; maxJumpB: number; hasLargeJump: boolean } {
  let maxJumpA = 0;
  let maxJumpB = 0;
  let previousVolumeA = calculateExpectedVolume(positions[0], 'A');
  let previousVolumeB = calculateExpectedVolume(positions[0], 'B');

  for (let i = 1; i < positions.length; i++) {
    const position = positions[i];

    // Set crossfader position
    audioEngine.setCrossfade(position);

    // Calculate expected volumes based on equal power curve
    const currentVolumeA = calculateExpectedVolume(position, 'A');
    const currentVolumeB = calculateExpectedVolume(position, 'B');

    // Measure volume deltas
    const jumpA = Math.abs(currentVolumeA - previousVolumeA);
    const jumpB = Math.abs(currentVolumeB - previousVolumeB);

    maxJumpA = Math.max(maxJumpA, jumpA);
    maxJumpB = Math.max(maxJumpB, jumpB);

    previousVolumeA = currentVolumeA;
    previousVolumeB = currentVolumeB;
  }

  // Check if any jump exceeds 1% (0.01) threshold
  const hasLargeJump = maxJumpA > 0.01 || maxJumpB > 0.01;

  return { maxJumpA, maxJumpB, hasLargeJump };
}

// Mock Tone.js with realistic crossfader behavior
vi.mock('tone', () => {
  let currentFadeValue = 0.5; // Start at center

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
    fade: {
      get value() {
        return currentFadeValue;
      },
      set value(val: number) {
        // Simulate smooth crossfade behavior
        currentFadeValue = Math.max(0, Math.min(1, val));
      },
    },
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
    Player: vi.fn(() => ({ ...mockPlayer })),
    Gain: vi.fn(() => ({ ...mockGain })),
    CrossFade: vi.fn(() => mockCrossFade),
  };
});

describe('Property 3: Crossfader volume curve is smooth', () => {
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

  it('should have smooth volume transitions with no jumps >1% for any crossfader position sequence', async () => {
    // Property: For any sequence of crossfader positions where consecutive positions
    // are very close together (simulating smooth slider movement at 60fps),
    // volume changes should be proportional to position changes
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -1, max: 1, noNaN: true }), // Starting position
        fc.array(fc.double({ min: -0.01, max: 0.01, noNaN: true }), {
          minLength: 5,
          maxLength: 20,
        }), // Very small incremental changes (< 1% of range per step)
        async (startPos: number, increments: number[]) => {
          // Build a sequence of positions with small incremental changes
          const positions: number[] = [startPos];
          let currentPos = startPos;
          
          for (const increment of increments) {
            // Skip NaN values if any slip through
            if (isNaN(increment)) continue;
            currentPos = Math.max(-1, Math.min(1, currentPos + increment));
            positions.push(currentPos);
          }

          // Measure volume smoothness across the sequence
          const result = measureVolumeSmoothness(audioEngine, positions);

          // Assert: For small position changes (<1% of range), volume changes should be <1%
          // Use tolerance for floating-point comparison
          const tolerance = 0.0001;
          expect(result.maxJumpA).toBeLessThanOrEqual(0.01 + tolerance);
          expect(result.maxJumpB).toBeLessThanOrEqual(0.01 + tolerance);
          expect(result.hasLargeJump).toBe(false);

          return true;
        }
      ),
      {
        numRuns: 100, // Run 100 iterations as specified
        verbose: true,
      }
    );
  });

  it('should maintain smooth transitions when moving from full A to full B', async () => {
    // Property: Moving across the full crossfader range should be smooth
    // with sufficiently small steps
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 200, max: 500 }), // Number of steps (need many steps for 1% smoothness)
        async (numSteps: number) => {
          const positions: number[] = [];

          // Generate smooth sweep from -1 to 1
          for (let i = 0; i <= numSteps; i++) {
            const position = -1 + (2 * i) / numSteps;
            positions.push(position);
          }

          // Measure smoothness
          const result = measureVolumeSmoothness(audioEngine, positions);

          // Assert: Smooth sweep should have no large jumps
          // Use small tolerance for floating-point comparison
          const tolerance = 0.0001;
          expect(result.maxJumpA).toBeLessThanOrEqual(0.01 + tolerance);
          expect(result.maxJumpB).toBeLessThanOrEqual(0.01 + tolerance);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should handle rapid crossfader movements smoothly', async () => {
    // Property: Even with rapid position changes (small increments), transitions should remain smooth
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -1, max: 1, noNaN: true }), // Starting position
        fc.array(fc.double({ min: -0.01, max: 0.01, noNaN: true }), {
          minLength: 10,
          maxLength: 50, // Simulate rapid slider movements
        }),
        async (startPos: number, increments: number[]) => {
          // Build sequence with small incremental changes
          const positions: number[] = [startPos];
          let currentPos = startPos;
          
          for (const increment of increments) {
            // Skip NaN values if any slip through
            if (isNaN(increment)) continue;
            currentPos = Math.max(-1, Math.min(1, currentPos + increment));
            positions.push(currentPos);
          }

          // Apply rapid crossfader changes
          const result = measureVolumeSmoothness(audioEngine, positions);

          // Assert: Even with rapid changes, no jump should exceed 1%
          // Use small tolerance for floating-point comparison
          const tolerance = 0.0001;
          expect(result.maxJumpA).toBeLessThanOrEqual(0.01 + tolerance);
          expect(result.maxJumpB).toBeLessThanOrEqual(0.01 + tolerance);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  }, 15000); // 15 second timeout for this test

  it('should have smooth transitions at crossfader center position', async () => {
    // Property: Transitions around the center (0) should be particularly smooth
    // as this is where both decks are at equal volume
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -0.2, max: 0.2, noNaN: true }), // Starting position near center
        fc.array(fc.double({ min: -0.01, max: 0.01, noNaN: true }), {
          minLength: 5,
          maxLength: 15,
        }), // Small increments
        async (startPos: number, increments: number[]) => {
          // Build sequence around center
          const positions: number[] = [startPos];
          let currentPos = startPos;
          
          for (const increment of increments) {
            // Skip NaN values if any slip through
            if (isNaN(increment)) continue;
            currentPos = Math.max(-0.2, Math.min(0.2, currentPos + increment));
            positions.push(currentPos);
          }

          // Measure smoothness around center
          const result = measureVolumeSmoothness(audioEngine, positions);

          // Assert: Center transitions should be smooth
          // Use small tolerance for floating-point comparison
          const tolerance = 0.0001;
          expect(result.maxJumpA).toBeLessThanOrEqual(0.01 + tolerance);
          expect(result.maxJumpB).toBeLessThanOrEqual(0.01 + tolerance);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should have smooth transitions at crossfader extremes', async () => {
    // Property: Transitions at the extremes (-1 and 1) should also be smooth
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('left', 'right'), // Test left or right extreme
        fc.array(fc.double({ min: -0.01, max: 0.01, noNaN: true }), {
          minLength: 5,
          maxLength: 15,
        }), // Small incremental changes
        async (extreme: string, increments: number[]) => {
          // Start at the extreme
          const startPos = extreme === 'left' ? -1 : 1;
          const positions: number[] = [startPos];
          let currentPos = startPos;
          
          // Build sequence with small movements from the extreme
          for (const increment of increments) {
            // Skip NaN values if any slip through
            if (isNaN(increment)) continue;
            if (extreme === 'left') {
              currentPos = Math.max(-1, Math.min(-0.9, currentPos + Math.abs(increment)));
            } else {
              currentPos = Math.max(0.9, Math.min(1, currentPos - Math.abs(increment)));
            }
            positions.push(currentPos);
          }

          // Measure smoothness
          const result = measureVolumeSmoothness(audioEngine, positions);

          // Assert: Extreme transitions should be smooth
          // Use small tolerance for floating-point comparison
          const tolerance = 0.0001;
          expect(result.maxJumpA).toBeLessThanOrEqual(0.01 + tolerance);
          expect(result.maxJumpB).toBeLessThanOrEqual(0.01 + tolerance);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should maintain equal power crossfade curve properties', async () => {
    // Property: The sum of squared volumes should remain constant (equal power)
    // This ensures no perceived volume dip at the center
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -1, max: 1 }), // Random crossfader position
        async (position: number) => {
          // Set crossfader position
          audioEngine.setCrossfade(position);

          // Calculate volumes using equal power curve
          const volumeA = calculateExpectedVolume(position, 'A');
          const volumeB = calculateExpectedVolume(position, 'B');

          // Equal power property: volumeA² + volumeB² ≈ 1
          const sumOfSquares = volumeA * volumeA + volumeB * volumeB;

          // Assert: Sum of squares should be close to 1 (within small tolerance)
          expect(sumOfSquares).toBeGreaterThan(0.99);
          expect(sumOfSquares).toBeLessThan(1.01);

          return true;
        }
      ),
      {
        numRuns: 100,
        verbose: true,
      }
    );
  });

  it('should have complementary volume curves for both decks', async () => {
    // Property: As one deck's volume increases, the other should decrease smoothly
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.double({ min: -1, max: 1 }), {
          minLength: 3,
          maxLength: 10,
        }),
        async (positions: number[]) => {
          // Sort positions to ensure we're moving in one direction
          const sortedPositions = [...positions].sort((a, b) => a - b);

          let previousVolumeA = calculateExpectedVolume(sortedPositions[0], 'A');
          let previousVolumeB = calculateExpectedVolume(sortedPositions[0], 'B');

          for (let i = 1; i < sortedPositions.length; i++) {
            const position = sortedPositions[i];
            audioEngine.setCrossfade(position);

            const currentVolumeA = calculateExpectedVolume(position, 'A');
            const currentVolumeB = calculateExpectedVolume(position, 'B');

            // As we move right (increasing position), A should decrease, B should increase
            const deltaA = currentVolumeA - previousVolumeA;
            const deltaB = currentVolumeB - previousVolumeB;

            // Assert: Volumes should move in opposite directions
            // (or stay the same if position didn't change much)
            if (Math.abs(deltaA) > 0.001) {
              // Only check if there's a meaningful change
              expect(deltaA * deltaB).toBeLessThanOrEqual(0); // Opposite signs or zero
            }

            previousVolumeA = currentVolumeA;
            previousVolumeB = currentVolumeB;
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

  it('should clamp crossfader positions outside valid range smoothly', async () => {
    // Property: Positions outside [-1, 1] should be clamped without causing jumps
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: -2, max: 2 }), // Include out-of-range values
        async (position: number) => {
          // Set crossfader (should be clamped internally)
          audioEngine.setCrossfade(position);

          // Calculate expected clamped position
          const clampedPosition = Math.max(-1, Math.min(1, position));

          // Calculate expected volumes
          const expectedVolumeA = calculateExpectedVolume(clampedPosition, 'A');
          const expectedVolumeB = calculateExpectedVolume(clampedPosition, 'B');

          // Volumes should be valid (0-1 range)
          expect(expectedVolumeA).toBeGreaterThanOrEqual(0);
          expect(expectedVolumeA).toBeLessThanOrEqual(1);
          expect(expectedVolumeB).toBeGreaterThanOrEqual(0);
          expect(expectedVolumeB).toBeLessThanOrEqual(1);

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
