/**
 * Mentor Tips Library - Context-aware guidance with DJ mentor personality
 *
 * Tips organized by skill level and trigger context.
 * Each tip has a friendly, encouraging DJ mentor voice.
 */

import { MentorTip } from './mentorTypes';

/**
 * All mentor tips organized by category
 */
export const MENTOR_TIPS: MentorTip[] = [
  // ==========================================
  // BEGINNER TIPS - Basic Operations
  // ==========================================

  // Session start tips
  {
    id: 'welcome-first-session',
    content: "Yo DJ! Ready to spin some tracks? Hit that PLAY button on Deck A to get the party started!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'deck_loaded', deck: 'A' },
        { type: 'deck_stopped', deck: 'both' },
      ],
    },
    highlightTarget: { type: 'button', deck: 'A', control: 'play' },
    priority: 10,
    showOnce: true,
  },

  // Playback basics
  {
    id: 'try-play-deck-b',
    content: "Nice! Deck A is rolling! Now try loading and playing something on Deck B - that's where the magic happens!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'deck_playing', deck: 'A' },
        { type: 'deck_stopped', deck: 'B' },
        { type: 'deck_loaded', deck: 'B' },
      ],
    },
    highlightTarget: { type: 'button', deck: 'B', control: 'play' },
    priority: 8,
    showOnce: true,
    cooldown: 60000,
  },

  // Volume introduction
  {
    id: 'volume-intro',
    content: "Pro tip: The volume faders control how loud each deck is. Slide them up and down to balance your mix!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'deck_playing', deck: 'any' },
      ],
    },
    highlightTarget: { type: 'slider', deck: 'A', control: 'volume' },
    priority: 6,
    showOnce: true,
    cooldown: 120000,
  },

  // Crossfader introduction
  {
    id: 'crossfader-intro',
    content: "See that crossfader at the bottom? Slide it left for Deck A, right for Deck B, or keep it centered to hear both!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'crossfader_center' },
      ],
    },
    highlightTarget: { type: 'crossfader' },
    priority: 9,
    showOnce: true,
  },

  // Cue point basics
  {
    id: 'cue-point-intro',
    content: "The CUE button is like a bookmark! Press SET to mark a spot, then hit CUE to jump back to it anytime.",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'deck_playing', deck: 'any' },
      ],
    },
    highlightTarget: { type: 'button', deck: 'A', control: 'cue' },
    priority: 5,
    showOnce: true,
    cooldown: 180000,
  },

  // Idle encouragement
  {
    id: 'idle-encouragement',
    content: "Don't be shy! Try pressing some buttons and moving those faders. There's no wrong way to have fun!",
    category: 'beginner',
    context: {
      trigger: 'idle',
      conditions: [
        { type: 'idle_time', threshold: 15000 },
        { type: 'deck_loaded', deck: 'any' },
      ],
    },
    priority: 3,
    cooldown: 60000,
  },

  // ==========================================
  // BEGINNER TIPS - Celebrations
  // ==========================================

  {
    id: 'first-both-playing',
    content: "Both decks rolling - now you're cooking! This is how real DJs do it!",
    category: 'beginner',
    context: {
      trigger: 'milestone',
      conditions: [
        { type: 'both_playing' },
        { type: 'first_time_action', actionType: 'both_decks_playing' },
      ],
    },
    celebrationVariant: 'party',
    priority: 10,
    showOnce: true,
  },

  {
    id: 'first-crossfade',
    content: "Smooth moves! You just did your first crossfade - the heart of DJ mixing!",
    category: 'beginner',
    context: {
      trigger: 'action',
      conditions: [
        { type: 'both_playing' },
        { type: 'crossfader_extreme' },
        { type: 'first_time_action', actionType: 'use_crossfader' },
      ],
    },
    celebrationVariant: 'fire',
    priority: 9,
    showOnce: true,
  },

  // ==========================================
  // INTERMEDIATE TIPS - BPM & Tempo
  // ==========================================

  {
    id: 'bpm-mismatch-warning',
    content: "Heads up! The BPMs don't match - the beats might clash. Try using the SYNC button or adjust the tempo slider!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'bpm_mismatch' },
      ],
    },
    highlightTarget: { type: 'bpm', deck: 'B' },
    priority: 8,
    cooldown: 30000,
  },

  {
    id: 'bpm-synced-celebration',
    content: "Locked in! The beats are synced perfectly - that's the foundation of smooth mixing!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'bpm_matched' },
      ],
    },
    celebrationVariant: 'sync',
    priority: 7,
    cooldown: 60000,
  },

  {
    id: 'tempo-slider-intro',
    content: "Real DJs match tempos by ear! Try adjusting the tempo slider to speed up or slow down a track.",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'bpm_mismatch' },
      ],
    },
    highlightTarget: { type: 'slider', deck: 'B', control: 'tempo' },
    priority: 6,
    showOnce: true,
    cooldown: 120000,
  },

  // ==========================================
  // INTERMEDIATE TIPS - EQ Introduction
  // ==========================================

  {
    id: 'eq-intro',
    content: "Level up: The EQ knobs let you control bass, mids, and treble. Cut the bass on one track when mixing in another!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
      ],
    },
    highlightTarget: { type: 'eq', deck: 'A', control: 'low' },
    priority: 7,
    showOnce: true,
    cooldown: 180000,
  },

  {
    id: 'eq-bass-swap-tip',
    content: "Pro move: When transitioning, cut the bass on the outgoing track while boosting it on the incoming one. Smooth!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'crossfader_center' },
      ],
    },
    highlightTarget: { type: 'eq', control: 'low' },
    priority: 6,
    showOnce: true,
    cooldown: 240000,
  },

  // ==========================================
  // INTERMEDIATE TIPS - Transitions
  // ==========================================

  {
    id: 'transition-tip-slow',
    content: "For smooth transitions, move the crossfader slowly over 8-16 beats. Let the tracks blend naturally!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'crossfader_center' },
        { type: 'bpm_matched' },
      ],
    },
    highlightTarget: { type: 'crossfader' },
    priority: 5,
    cooldown: 120000,
  },

  {
    id: 'waveform-seek-tip',
    content: "Click on the waveform to jump to any part of the track. Great for finding the perfect drop!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'deck_loaded', deck: 'any' },
        { type: 'deck_stopped', deck: 'any' },
      ],
    },
    highlightTarget: { type: 'waveform', deck: 'A' },
    priority: 4,
    showOnce: true,
    cooldown: 180000,
  },

  // ==========================================
  // ADVANCED TIPS - Pro Techniques
  // ==========================================

  {
    id: 'eq-mixing-advanced',
    content: "Advanced technique: Try cutting mids AND bass on the incoming track, then gradually bring them back during the transition.",
    category: 'advanced',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'bpm_matched' },
        { type: 'eq_cut', deck: 'any' },
      ],
    },
    highlightTarget: { type: 'eq', control: 'mid' },
    priority: 6,
    cooldown: 300000,
  },

  {
    id: 'drop-timing-tip',
    content: "Real DJs know: The drop hits hardest when you bring in the full track right on the 1! Watch those waveforms!",
    category: 'advanced',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'crossfader_center' },
      ],
    },
    priority: 5,
    cooldown: 240000,
  },

  {
    id: 'energy-management',
    content: "Pro tip: Building energy is about tension and release. Cut the bass, let it build, then DROP IT!",
    category: 'advanced',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'eq_cut', threshold: -6 },
      ],
    },
    celebrationVariant: 'buildup',
    priority: 5,
    cooldown: 300000,
  },

  {
    id: 'volume-precision',
    content: "Volume riding: Subtle volume adjustments keep your mix sounding professional. Watch those peaks!",
    category: 'advanced',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'both_playing' },
        { type: 'volume_high', deck: 'any' },
      ],
    },
    highlightTarget: { type: 'slider', control: 'volume' },
    priority: 4,
    cooldown: 300000,
  },

  {
    id: 'cue-mastery',
    content: "Master move: Set cue points at key moments - drops, breakdowns, vocals. Jump between them for creative mixing!",
    category: 'advanced',
    context: {
      trigger: 'state',
      conditions: [
        { type: 'deck_playing', deck: 'any' },
      ],
    },
    highlightTarget: { type: 'button', control: 'setCue' },
    priority: 4,
    showOnce: true,
    cooldown: 360000,
  },

  // ==========================================
  // CONTEXTUAL CELEBRATIONS
  // ==========================================

  {
    id: 'smooth-transition-detected',
    content: "Butter smooth! That transition was fire!",
    category: 'intermediate',
    context: {
      trigger: 'action',
      conditions: [
        { type: 'crossfader_extreme' },
        { type: 'bpm_matched' },
      ],
    },
    celebrationVariant: 'fire',
    priority: 8,
    cooldown: 45000,
  },

  {
    id: 'eq-work-detected',
    content: "Nice EQ work! You're shaping that sound like a pro!",
    category: 'intermediate',
    context: {
      trigger: 'action',
      conditions: [
        { type: 'eq_cut', deck: 'any' },
        { type: 'both_playing' },
      ],
    },
    celebrationVariant: 'sparkle',
    priority: 6,
    cooldown: 60000,
  },

  // ==========================================
  // IDLE/ENCOURAGEMENT TIPS
  // ==========================================

  {
    id: 'idle-intermediate',
    content: "Taking a break? When you're ready, try mixing those two tracks together!",
    category: 'intermediate',
    context: {
      trigger: 'idle',
      conditions: [
        { type: 'idle_time', threshold: 20000 },
        { type: 'deck_loaded', deck: 'both' },
      ],
    },
    priority: 2,
    cooldown: 90000,
  },

  {
    id: 'idle-advanced',
    content: "You've got skills! Try something new - maybe a quick cut transition or an EQ bass swap?",
    category: 'advanced',
    context: {
      trigger: 'idle',
      conditions: [
        { type: 'idle_time', threshold: 25000 },
        { type: 'both_playing' },
      ],
    },
    priority: 2,
    cooldown: 120000,
  },

  // ==========================================
  // GENERAL HELP TIPS (for on-demand help panel)
  // ==========================================

  {
    id: 'help-play-pause',
    content: "PLAY/PAUSE: Click to start or stop the music on each deck.",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [], // Always available
    },
    highlightTarget: { type: 'button', control: 'play' },
    priority: 1,
  },

  {
    id: 'help-volume',
    content: "VOLUME: Slide up/down to control how loud each deck plays.",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'slider', control: 'volume' },
    priority: 1,
  },

  {
    id: 'help-crossfader',
    content: "CROSSFADER: Left = Deck A, Right = Deck B, Center = Both. Use it to blend between tracks!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'crossfader' },
    priority: 1,
  },

  {
    id: 'help-tempo',
    content: "TEMPO: Adjust the speed of each track. Match BPMs for smooth mixing!",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'slider', control: 'tempo' },
    priority: 1,
  },

  {
    id: 'help-eq',
    content: "EQ: LOW controls bass, MID controls vocals/instruments, HIGH controls cymbals/brightness.",
    category: 'intermediate',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'eq' },
    priority: 1,
  },

  {
    id: 'help-sync',
    content: "SYNC: Automatically matches the BPM of both decks. Great for beginners!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'bpm' },
    priority: 1,
  },

  {
    id: 'help-cue',
    content: "CUE: Set a bookmark (SET button) and jump back to it anytime (CUE button).",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'button', control: 'cue' },
    priority: 1,
  },

  {
    id: 'help-waveform',
    content: "WAVEFORM: Shows the audio visually. Click anywhere to jump to that position!",
    category: 'beginner',
    context: {
      trigger: 'state',
      conditions: [],
    },
    highlightTarget: { type: 'waveform' },
    priority: 1,
  },
];

/**
 * Get tips filtered by category
 */
export function getTipsByCategory(category: 'beginner' | 'intermediate' | 'advanced'): MentorTip[] {
  return MENTOR_TIPS.filter((tip) => tip.category === category);
}

/**
 * Get general help tips (for help panel)
 */
export function getHelpPanelTips(): MentorTip[] {
  return MENTOR_TIPS.filter((tip) => tip.id.startsWith('help-'));
}

/**
 * Get celebration tips
 */
export function getCelebrationTips(): MentorTip[] {
  return MENTOR_TIPS.filter((tip) => tip.celebrationVariant);
}
