/**
 * EffectsEngine - DJ Effects System using Tone.js
 *
 * Provides professional DJ effects including:
 * - Reverb: Ambient space and depth
 * - Delay: Beat-synced echo with feedback
 * - Echo: Ping-pong stereo delay
 * - Filter Sweep: Auto-modulating filter
 * - Flanger: Classic chorus/flanger effect
 *
 * Features:
 * - Beat-synced delay times based on BPM
 * - Smooth dry/wet crossfading for glitch-free toggling
 * - Per-deck effect chains
 */

import * as Tone from 'tone';
import { DeckId } from './types';

/**
 * Available effect types
 */
export type EffectType = 'reverb' | 'delay' | 'echo' | 'flanger' | 'phaser';

/**
 * Beat division for synced delays
 */
export type BeatDivision = '1/16' | '1/8' | '1/4' | '1/2' | '1' | '2';

/**
 * Effect configuration interface
 */
export interface Effect {
  type: EffectType;
  wet: number; // 0-1 dry/wet mix
  enabled: boolean;
  params: Record<string, number>;
}

/**
 * Default parameters for each effect type
 */
export const DEFAULT_EFFECT_PARAMS: Record<EffectType, Record<string, number>> = {
  reverb: {
    decay: 2.5,      // Reverb decay time in seconds (0.5-10)
    preDelay: 0.01,  // Pre-delay before reverb starts (0-0.1)
  },
  delay: {
    delayTime: 0.25,  // Delay time in seconds (will be synced to BPM)
    feedback: 0.4,    // Amount of signal fed back (0-0.9)
    beatDivision: 2,  // 1/4 beat division (index into BEAT_DIVISIONS)
  },
  echo: {
    delayTime: 0.25,  // Ping-pong delay time
    feedback: 0.3,    // Feedback amount
    beatDivision: 2,  // 1/4 beat division
  },
  flanger: {
    frequency: 0.5,   // LFO rate in Hz (0.1-10)
    depth: 0.7,       // Modulation depth (0-1)
    delayTime: 3.5,   // Base delay in milliseconds (2-20)
    feedback: 0.3,    // Feedback amount (0-0.9)
  },
  phaser: {
    frequency: 0.5,   // LFO rate (0.1-10)
    octaves: 3,       // Frequency spread in octaves (1-6)
    baseFrequency: 350, // Base frequency in Hz
  },
};

/**
 * Beat divisions for synced effects
 */
export const BEAT_DIVISIONS: BeatDivision[] = ['1/16', '1/8', '1/4', '1/2', '1', '2'];

/**
 * Convert beat division to multiplier
 */
function beatDivisionToMultiplier(division: BeatDivision): number {
  switch (division) {
    case '1/16': return 0.0625;
    case '1/8': return 0.125;
    case '1/4': return 0.25;
    case '1/2': return 0.5;
    case '1': return 1;
    case '2': return 2;
    default: return 0.25;
  }
}

/**
 * Calculate delay time from BPM and beat division
 * Formula: delayTime = (60 / bpm) * beatFraction
 */
export function calculateDelayTime(bpm: number, beatDivision: BeatDivision): number {
  const secondsPerBeat = 60 / bpm;
  const multiplier = beatDivisionToMultiplier(beatDivision);
  return secondsPerBeat * multiplier;
}

/**
 * Effect node wrapper for smooth transitions
 */
interface EffectNode {
  effect: Tone.ToneAudioNode;
  crossfade: Tone.CrossFade;
  type: EffectType;
}

/**
 * EffectsEngine - Manages DJ effects for both decks
 */
export class EffectsEngine {
  private effectNodes: Map<DeckId, Map<EffectType, EffectNode>> = new Map();
  private effectStates: Map<DeckId, Map<EffectType, Effect>> = new Map();
  private bpm: Map<DeckId, number> = new Map();
  private inputNodes: Map<DeckId, Tone.Gain> = new Map();
  private outputNodes: Map<DeckId, Tone.Gain> = new Map();
  private isInitialized = false;

  constructor() {
    this.effectNodes.set('A', new Map());
    this.effectNodes.set('B', new Map());
    this.effectStates.set('A', new Map());
    this.effectStates.set('B', new Map());
    this.bpm.set('A', 120);
    this.bpm.set('B', 120);
  }

  /**
   * Initialize effects for a deck
   * Creates all effect nodes and connects them in parallel with crossfades
   */
  init(deck: DeckId): { input: Tone.Gain; output: Tone.Gain } {
    // Create input and output gain nodes
    const input = new Tone.Gain(1);
    const output = new Tone.Gain(1);

    this.inputNodes.set(deck, input);
    this.outputNodes.set(deck, output);

    // Create all effect nodes
    this.createEffectNode(deck, 'reverb');
    this.createEffectNode(deck, 'delay');
    this.createEffectNode(deck, 'echo');
    this.createEffectNode(deck, 'flanger');
    this.createEffectNode(deck, 'phaser');

    // Connect effects chain
    // Input -> [Effect Crossfades in parallel] -> Output
    // Each effect has a crossfade that blends between dry (input) and wet (effect)
    this.connectEffectsChain(deck);

    this.isInitialized = true;
    console.log(`[EffectsEngine] Initialized effects for Deck ${deck}`);

    return { input, output };
  }

  /**
   * Create an effect node with crossfade for smooth toggling
   */
  private createEffectNode(deck: DeckId, type: EffectType): void {
    let effect: Tone.ToneAudioNode;
    const params = DEFAULT_EFFECT_PARAMS[type];

    switch (type) {
      case 'reverb':
        effect = new Tone.Reverb({
          decay: params.decay,
          preDelay: params.preDelay,
          wet: 1, // Full wet, we control mix via crossfade
        });
        break;

      case 'delay':
        effect = new Tone.FeedbackDelay({
          delayTime: this.calculateSyncedDelayTime(deck, params.beatDivision),
          feedback: params.feedback,
          wet: 1,
        });
        break;

      case 'echo':
        effect = new Tone.PingPongDelay({
          delayTime: this.calculateSyncedDelayTime(deck, params.beatDivision),
          feedback: params.feedback,
          wet: 1,
        });
        break;

      case 'flanger':
        // Use Chorus with short delay times for flanger effect
        effect = new Tone.Chorus({
          frequency: params.frequency,
          depth: params.depth,
          delayTime: params.delayTime,
          feedback: params.feedback,
          wet: 1,
        });
        // Start the LFO
        (effect as Tone.Chorus).start();
        break;

      case 'phaser':
        effect = new Tone.Phaser({
          frequency: params.frequency,
          octaves: params.octaves,
          baseFrequency: params.baseFrequency,
          wet: 1,
        });
        break;

      default:
        throw new Error(`Unknown effect type: ${type}`);
    }

    // Create crossfade for smooth wet/dry control
    const crossfade = new Tone.CrossFade(0); // Start fully dry

    // Store the effect node
    const deckNodes = this.effectNodes.get(deck)!;
    deckNodes.set(type, { effect, crossfade, type });

    // Initialize effect state
    const deckStates = this.effectStates.get(deck)!;
    deckStates.set(type, {
      type,
      wet: 0,
      enabled: false,
      params: { ...params },
    });

    console.log(`[EffectsEngine] Created ${type} effect for Deck ${deck}`);
  }

  /**
   * Connect effects in chain
   * Architecture: Input -> Reverb -> Delay -> Echo -> Flanger -> Phaser -> Output
   * Each effect uses crossfade for smooth dry/wet control
   */
  private connectEffectsChain(deck: DeckId): void {
    const input = this.inputNodes.get(deck)!;
    const output = this.outputNodes.get(deck)!;
    const nodes = this.effectNodes.get(deck)!;

    const effectOrder: EffectType[] = ['reverb', 'delay', 'echo', 'flanger', 'phaser'];

    let previousNode: Tone.ToneAudioNode = input;

    for (const effectType of effectOrder) {
      const effectNode = nodes.get(effectType);
      if (!effectNode) continue;

      const { effect, crossfade } = effectNode;

      // Connect dry path (previous -> crossfade.a)
      previousNode.connect(crossfade.a);

      // Connect wet path (previous -> effect -> crossfade.b)
      previousNode.connect(effect);
      effect.connect(crossfade.b);

      // Crossfade output becomes input for next effect
      previousNode = crossfade;
    }

    // Final connection to output
    previousNode.connect(output);

    console.log(`[EffectsEngine] Connected effects chain for Deck ${deck}`);
  }

  /**
   * Calculate beat-synced delay time for a deck
   */
  private calculateSyncedDelayTime(deck: DeckId, beatDivisionIndex: number): number {
    const bpm = this.bpm.get(deck) || 120;
    const division = BEAT_DIVISIONS[beatDivisionIndex] || '1/4';
    return calculateDelayTime(bpm, division);
  }

  /**
   * Set effect wet/dry mix (0-1)
   */
  setEffectWet(deck: DeckId, type: EffectType, wet: number): void {
    const nodes = this.effectNodes.get(deck);
    const states = this.effectStates.get(deck);
    if (!nodes || !states) return;

    const effectNode = nodes.get(type);
    const effectState = states.get(type);
    if (!effectNode || !effectState) return;

    // Clamp wet value
    const clampedWet = Math.max(0, Math.min(1, wet));

    // Update crossfade - smooth transition using rampTo
    effectNode.crossfade.fade.rampTo(clampedWet, 0.05);

    // Update state
    effectState.wet = clampedWet;
    effectState.enabled = clampedWet > 0;

    console.log(`[EffectsEngine] Deck ${deck} ${type} wet: ${(clampedWet * 100).toFixed(0)}%`);
  }

  /**
   * Toggle effect on/off
   */
  toggleEffect(deck: DeckId, type: EffectType): boolean {
    const states = this.effectStates.get(deck);
    if (!states) return false;

    const effectState = states.get(type);
    if (!effectState) return false;

    if (effectState.enabled) {
      // Turn off - ramp to 0
      this.setEffectWet(deck, type, 0);
    } else {
      // Turn on - ramp to previous wet level or default 0.5
      const targetWet = effectState.wet > 0 ? effectState.wet : 0.5;
      this.setEffectWet(deck, type, targetWet);
    }

    return !effectState.enabled;
  }

  /**
   * Set effect parameter
   */
  setEffectParam(deck: DeckId, type: EffectType, param: string, value: number): void {
    const nodes = this.effectNodes.get(deck);
    const states = this.effectStates.get(deck);
    if (!nodes || !states) return;

    const effectNode = nodes.get(type);
    const effectState = states.get(type);
    if (!effectNode || !effectState) return;

    // Update state
    effectState.params[param] = value;

    // Apply to effect - cast to unknown first to avoid type errors
    const effect = effectNode.effect;

    switch (type) {
      case 'reverb':
        if (param === 'decay') {
          (effect as unknown as Tone.Reverb).decay = value;
        }
        // Note: preDelay isn't directly settable after creation
        break;

      case 'delay':
        if (param === 'feedback') {
          (effect as unknown as Tone.FeedbackDelay).feedback.rampTo(value, 0.05);
        } else if (param === 'beatDivision') {
          const delayTime = this.calculateSyncedDelayTime(deck, value);
          (effect as unknown as Tone.FeedbackDelay).delayTime.rampTo(delayTime, 0.1);
        }
        break;

      case 'echo':
        if (param === 'feedback') {
          (effect as unknown as Tone.PingPongDelay).feedback.rampTo(value, 0.05);
        } else if (param === 'beatDivision') {
          const delayTime = this.calculateSyncedDelayTime(deck, value);
          (effect as unknown as Tone.PingPongDelay).delayTime.rampTo(delayTime, 0.1);
        }
        break;

      case 'flanger':
        if (param === 'frequency') {
          (effect as unknown as Tone.Chorus).frequency.rampTo(value, 0.1);
        } else if (param === 'depth') {
          (effect as unknown as Tone.Chorus).depth = value;
        } else if (param === 'feedback') {
          (effect as unknown as Tone.Chorus).feedback.rampTo(value, 0.05);
        }
        break;

      case 'phaser':
        if (param === 'frequency') {
          (effect as unknown as Tone.Phaser).frequency.rampTo(value, 0.1);
        } else if (param === 'octaves') {
          (effect as unknown as Tone.Phaser).octaves = value;
        } else if (param === 'baseFrequency') {
          (effect as unknown as Tone.Phaser).baseFrequency = value;
        }
        break;
    }

    console.log(`[EffectsEngine] Deck ${deck} ${type} ${param}: ${value}`);
  }

  /**
   * Update BPM for beat-synced effects
   */
  setBPM(deck: DeckId, bpm: number): void {
    this.bpm.set(deck, bpm);

    // Update all beat-synced effects
    const states = this.effectStates.get(deck);
    const nodes = this.effectNodes.get(deck);
    if (!states || !nodes) return;

    // Update delay
    const delayState = states.get('delay');
    if (delayState) {
      const delayTime = this.calculateSyncedDelayTime(deck, delayState.params.beatDivision);
      const delayNode = nodes.get('delay');
      if (delayNode) {
        (delayNode.effect as Tone.FeedbackDelay).delayTime.rampTo(delayTime, 0.1);
      }
    }

    // Update echo
    const echoState = states.get('echo');
    if (echoState) {
      const delayTime = this.calculateSyncedDelayTime(deck, echoState.params.beatDivision);
      const echoNode = nodes.get('echo');
      if (echoNode) {
        (echoNode.effect as Tone.PingPongDelay).delayTime.rampTo(delayTime, 0.1);
      }
    }

    console.log(`[EffectsEngine] Deck ${deck} BPM updated to ${bpm}`);
  }

  /**
   * Get current effect state
   */
  getEffectState(deck: DeckId, type: EffectType): Effect | undefined {
    const states = this.effectStates.get(deck);
    if (!states) return undefined;
    return states.get(type);
  }

  /**
   * Get all effect states for a deck
   */
  getAllEffects(deck: DeckId): Effect[] {
    const states = this.effectStates.get(deck);
    if (!states) return [];
    return Array.from(states.values());
  }

  /**
   * Get input node for connecting audio source
   */
  getInput(deck: DeckId): Tone.Gain | undefined {
    return this.inputNodes.get(deck);
  }

  /**
   * Get output node for connecting to destination
   */
  getOutput(deck: DeckId): Tone.Gain | undefined {
    return this.outputNodes.get(deck);
  }

  /**
   * Check if engine is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    // Disconnect and dispose all effect nodes
    for (const deck of ['A', 'B'] as DeckId[]) {
      const nodes = this.effectNodes.get(deck);
      if (nodes) {
        nodes.forEach(({ effect, crossfade }) => {
          effect.disconnect();
          effect.dispose();
          crossfade.disconnect();
          crossfade.dispose();
        });
        nodes.clear();
      }

      // Dispose input/output nodes
      const input = this.inputNodes.get(deck);
      const output = this.outputNodes.get(deck);
      if (input) {
        input.disconnect();
        input.dispose();
      }
      if (output) {
        output.disconnect();
        output.dispose();
      }
    }

    this.effectNodes.clear();
    this.effectStates.clear();
    this.inputNodes.clear();
    this.outputNodes.clear();
    this.isInitialized = false;

    console.log('[EffectsEngine] Destroyed');
  }
}

/**
 * Singleton instance for global effects management
 */
let effectsEngineInstance: EffectsEngine | null = null;

export function getEffectsEngine(): EffectsEngine {
  if (!effectsEngineInstance) {
    effectsEngineInstance = new EffectsEngine();
  }
  return effectsEngineInstance;
}

export function destroyEffectsEngine(): void {
  if (effectsEngineInstance) {
    effectsEngineInstance.destroy();
    effectsEngineInstance = null;
  }
}
