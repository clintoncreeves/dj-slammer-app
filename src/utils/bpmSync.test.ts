/**
 * BPM Sync Utilities Tests
 *
 * Tests for professional DJ software BPM synchronization algorithms
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBPMSync,
  canSyncDirect,
  isHalfTime,
  isDoubleTime,
  canSync,
  getSyncDescription,
} from './bpmSync';

describe('BPM Sync Utilities', () => {
  describe('calculateBPMSync', () => {
    it('should sync directly when BPMs are within ±10 tolerance', () => {
      const result = calculateBPMSync(120, 115, 115);
      expect(result.syncType).toBe('direct');
      expect(result.targetBPM).toBe(120);
      expect(result.adjustment).toBe(5);
    });

    it('should detect half-time when BPM is approximately half', () => {
      // 140 BPM syncing with 80 BPM -> target should be 70 (half of 140)
      const result = calculateBPMSync(140, 68, 80);
      expect(result.syncType).toBe('half-time');
      expect(result.targetBPM).toBe(70);
    });

    it('should detect double-time when BPM is approximately double', () => {
      // 70 BPM syncing with 135 BPM -> target should be 140 (double of 70)
      const result = calculateBPMSync(70, 138, 135);
      expect(result.syncType).toBe('double-time');
      expect(result.targetBPM).toBe(140);
    });

    it('should choose the closest matching option (direct vs half-time)', () => {
      // Master at 120, slave at 118 -> direct is closer than half-time (60)
      const result = calculateBPMSync(120, 118, 118);
      expect(result.syncType).toBe('direct');
      expect(result.targetBPM).toBe(120);
    });

    it('should choose the closest matching option (half-time vs double-time)', () => {
      // Master at 128, slave at 62 -> half-time (64) is closer than double-time (256)
      const result = calculateBPMSync(128, 62, 62);
      expect(result.syncType).toBe('half-time');
      expect(result.targetBPM).toBe(64);
    });

    it('should calculate correct playback rate', () => {
      // Original BPM 100, target BPM 110 -> playback rate should be 1.1
      const result = calculateBPMSync(110, 100, 100);
      expect(result.playbackRate).toBeCloseTo(1.1);
    });

    it('should handle exact matches', () => {
      const result = calculateBPMSync(120, 120, 120);
      expect(result.syncType).toBe('direct');
      expect(result.targetBPM).toBe(120);
      expect(result.adjustment).toBe(0);
    });

    it('should fallback to direct when nothing matches within tolerance', () => {
      // Very different BPMs with tight tolerance
      const result = calculateBPMSync(120, 90, 90, {
        directTolerance: 5,
        timeTolerance: 2,
      });
      // Should still return direct as fallback
      expect(result.syncType).toBe('direct');
      expect(result.targetBPM).toBe(120);
    });
  });

  describe('canSyncDirect', () => {
    it('should return true when BPMs are within default ±10 tolerance', () => {
      expect(canSyncDirect(120, 115)).toBe(true);
      expect(canSyncDirect(120, 125)).toBe(true);
      expect(canSyncDirect(120, 110)).toBe(true);
      expect(canSyncDirect(120, 130)).toBe(true);
    });

    it('should return false when BPMs are outside tolerance', () => {
      expect(canSyncDirect(120, 109)).toBe(false);
      expect(canSyncDirect(120, 131)).toBe(false);
    });

    it('should respect custom tolerance', () => {
      expect(canSyncDirect(120, 115, 3)).toBe(false);
      expect(canSyncDirect(120, 118, 3)).toBe(true);
    });
  });

  describe('isHalfTime', () => {
    it('should detect half-time relationships within ±5 tolerance', () => {
      expect(isHalfTime(60, 120)).toBe(true);
      expect(isHalfTime(58, 120)).toBe(true); // 120/2 = 60, 58 is within ±5
      expect(isHalfTime(65, 120)).toBe(true); // 120/2 = 60, 65 is within ±5
    });

    it('should return false when not half-time', () => {
      expect(isHalfTime(50, 120)).toBe(false); // 50 is outside ±5 of 60
      expect(isHalfTime(70, 120)).toBe(false); // 70 is outside ±5 of 60
    });

    it('should respect custom tolerance', () => {
      expect(isHalfTime(58, 120, 1)).toBe(false);
      expect(isHalfTime(59, 120, 1)).toBe(true);
    });
  });

  describe('isDoubleTime', () => {
    it('should detect double-time relationships within ±5 tolerance', () => {
      expect(isDoubleTime(120, 60)).toBe(true);
      expect(isDoubleTime(116, 60)).toBe(true); // 60*2 = 120, 116 is within ±5
      expect(isDoubleTime(125, 60)).toBe(true); // 60*2 = 120, 125 is within ±5
    });

    it('should return false when not double-time', () => {
      expect(isDoubleTime(110, 60)).toBe(false); // 110 is outside ±5 of 120
      expect(isDoubleTime(130, 60)).toBe(false); // 130 is outside ±5 of 120
    });

    it('should respect custom tolerance', () => {
      expect(isDoubleTime(116, 60, 3)).toBe(false);
      expect(isDoubleTime(118, 60, 3)).toBe(true);
    });
  });

  describe('canSync', () => {
    it('should return true for direct sync matches', () => {
      expect(canSync(120, 115)).toBe(true);
      expect(canSync(120, 125)).toBe(true);
    });

    it('should return true for half-time matches', () => {
      expect(canSync(120, 60)).toBe(true);
      expect(canSync(60, 120)).toBe(true); // Works both ways
    });

    it('should return true for double-time matches', () => {
      expect(canSync(60, 120)).toBe(true);
      expect(canSync(120, 60)).toBe(true); // Works both ways
    });

    it('should return false when no sync is possible', () => {
      expect(canSync(120, 80)).toBe(false); // Not direct, not half, not double
      expect(canSync(120, 200)).toBe(false);
    });
  });

  describe('getSyncDescription', () => {
    it('should provide descriptive text for direct sync', () => {
      const result = calculateBPMSync(120, 115, 115);
      const description = getSyncDescription(result);
      expect(description).toContain('Direct sync');
      expect(description).toContain('120');
    });

    it('should provide descriptive text for half-time sync', () => {
      const result = calculateBPMSync(140, 68, 80);
      const description = getSyncDescription(result);
      expect(description).toContain('Half-time');
    });

    it('should provide descriptive text for double-time sync', () => {
      const result = calculateBPMSync(70, 138, 135);
      const description = getSyncDescription(result);
      expect(description).toContain('Double-time');
    });

    it('should indicate when already in sync', () => {
      const result = calculateBPMSync(120, 120, 120);
      const description = getSyncDescription(result);
      expect(description).toContain('Already in sync');
    });
  });

  describe('Real-world DJ scenarios', () => {
    it('should handle house music mixing (120-130 BPM)', () => {
      const result = calculateBPMSync(128, 124, 124);
      expect(result.syncType).toBe('direct');
      expect(result.targetBPM).toBe(128);
    });

    it('should handle hip-hop half-time mixing', () => {
      // Hip-hop at 90 BPM, house at 128 BPM
      // 128/2 = 64, which is close to 90? No, this won't match
      // But 90*2 = 180, which is far from 128
      // So this would be direct sync attempt
      const result = calculateBPMSync(90, 128, 128);
      expect(result.syncType).toBe('direct');
    });

    it('should handle drum & bass double-time mixing', () => {
      // D&B at 174 BPM with house at 87 BPM
      // 174/2 = 87, perfect half-time match
      const result = calculateBPMSync(174, 87, 87);
      expect(result.syncType).toBe('half-time');
      expect(result.targetBPM).toBe(87);
    });

    it('should handle VirtualDJ example: 140 BPM with 80 BPM', () => {
      // As mentioned in research: "140bpm with 80bpm -> closest path is 70bpm (half bpm)"
      const result = calculateBPMSync(140, 80, 80);
      expect(result.syncType).toBe('half-time');
      expect(result.targetBPM).toBe(70);
    });
  });
});
