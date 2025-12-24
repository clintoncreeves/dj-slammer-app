/**
 * useRewards Hook
 *
 * Wraps react-rewards library for celebration effects throughout the app.
 * Configured with kid-friendly defaults for a fun, exciting experience.
 */

import { useReward } from 'react-rewards';

export type RewardType = 'confetti' | 'balloons' | 'emoji';

interface UseRewardsOptions {
  /** Type of reward animation */
  type?: RewardType;
  /** Custom emoji for emoji type */
  emoji?: string[];
  /** Number of particles */
  elementCount?: number;
  /** Size of particles */
  elementSize?: number;
  /** Animation duration in milliseconds */
  lifetime?: number;
  /** Particle spread angle */
  angle?: number;
  /** Speed of particle decay */
  decay?: number;
  /** Custom colors for confetti */
  colors?: string[];
}

interface RewardFunctions {
  /** Trigger a small celebration (for step completion) */
  rewardSmall: () => void;
  /** Trigger a big celebration (for lesson completion) */
  rewardBig: () => void;
  /** Trigger a custom celebration */
  rewardCustom: () => void;
}

/**
 * Kid-friendly celebration defaults
 */
const KID_FRIENDLY_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#95E1D3', // Mint
  '#FF69B4', // Hot Pink
  '#FFA500', // Orange
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#2ECC71', // Green
  '#F39C12', // Yellow
];

const SMALL_CELEBRATION_CONFIG = {
  elementCount: 50,
  spread: 60,
  startVelocity: 25,
  decay: 0.92,
  lifetime: 150,
};

const BIG_CELEBRATION_CONFIG = {
  elementCount: 150,
  spread: 120,
  startVelocity: 45,
  decay: 0.91,
  lifetime: 200,
};

/**
 * Hook for triggering celebration animations
 *
 * @param id - Unique ID for the reward element (must match the element's id attribute)
 * @param options - Configuration options for the reward
 * @returns Object with reward trigger functions
 */
export const useRewards = (
  id: string,
  options: UseRewardsOptions = {}
): RewardFunctions => {
  const {
    type = 'confetti',
    emoji = ['🎉', '⭐', '🎵', '🎧', '🔥', '✨'],
    elementCount = 80,
    elementSize = 20,
    lifetime = 180,
    angle = 90,
    decay = 0.91,
    colors = KID_FRIENDLY_COLORS,
  } = options;

  // Small celebration (step completion)
  const { reward: rewardSmall } = useReward(id, type, {
    ...SMALL_CELEBRATION_CONFIG,
    elementSize,
    colors,
    emoji,
    angle,
  });

  // Big celebration (lesson completion)
  const { reward: rewardBig } = useReward(id, type, {
    ...BIG_CELEBRATION_CONFIG,
    elementSize: elementSize + 5,
    colors,
    emoji,
    angle,
  });

  // Custom celebration
  const { reward: rewardCustom } = useReward(id, type, {
    elementCount,
    elementSize,
    lifetime,
    angle,
    decay,
    colors,
    emoji,
    spread: 90,
    startVelocity: 35,
  });

  return {
    rewardSmall,
    rewardBig,
    rewardCustom,
  };
};

/**
 * Pre-configured emoji celebrations
 */
export const DJ_EMOJIS = ['🎧', '🎵', '🎶', '🔊', '🎤', '💿'];
export const PARTY_EMOJIS = ['🎉', '🎊', '✨', '⭐', '🌟', '💫'];
export const FIRE_EMOJIS = ['🔥', '💥', '⚡', '💯'];
export const MUSIC_EMOJIS = ['🎹', '🎸', '🥁', '🎺', '🎷'];
