/**
 * MIDI Controller Service
 *
 * Provides MIDI input/output handling using WebMIDI.js
 * Supports common DJ controllers with customizable mappings.
 *
 * Features:
 * - Auto-detection of MIDI devices
 * - Configurable control mappings
 * - Support for notes, control changes (CC), and pitch bend
 * - Event-based architecture for easy integration
 */

import { WebMidi, Input, NoteMessageEvent, ControlChangeMessageEvent } from 'webmidi';

export type MIDIControlType = 'note' | 'cc' | 'pitchbend';

export interface MIDIControl {
  /** Type of MIDI message */
  type: MIDIControlType;
  /** MIDI channel (1-16, or 'all') */
  channel: number | 'all';
  /** Note number or CC number (0-127) */
  number: number;
  /** Human-readable name */
  name: string;
}

export interface MIDIMapping {
  /** Unique identifier for this mapping */
  id: string;
  /** Control definition */
  control: MIDIControl;
  /** Action to trigger */
  action: MIDIAction;
  /** Optional: Deck this control affects */
  deck?: 'A' | 'B' | 'both';
}

export type MIDIAction =
  // Transport controls
  | 'play_a'
  | 'play_b'
  | 'pause_a'
  | 'pause_b'
  | 'cue_a'
  | 'cue_b'
  | 'sync_a'
  | 'sync_b'
  // Mixer controls
  | 'crossfader'
  | 'volume_a'
  | 'volume_b'
  // EQ controls
  | 'eq_low_a'
  | 'eq_mid_a'
  | 'eq_high_a'
  | 'eq_low_b'
  | 'eq_mid_b'
  | 'eq_high_b'
  // Jog/Pitch controls
  | 'jog_a'
  | 'jog_b'
  | 'pitch_a'
  | 'pitch_b'
  // Filter controls
  | 'filter_a'
  | 'filter_b'
  // Hot cues (8 per deck)
  | 'hotcue_1_a' | 'hotcue_2_a' | 'hotcue_3_a' | 'hotcue_4_a'
  | 'hotcue_5_a' | 'hotcue_6_a' | 'hotcue_7_a' | 'hotcue_8_a'
  | 'hotcue_1_b' | 'hotcue_2_b' | 'hotcue_3_b' | 'hotcue_4_b'
  | 'hotcue_5_b' | 'hotcue_6_b' | 'hotcue_7_b' | 'hotcue_8_b'
  // Loop controls
  | 'loop_in_a' | 'loop_in_b'
  | 'loop_out_a' | 'loop_out_b'
  | 'loop_toggle_a' | 'loop_toggle_b'
  | 'loop_double_a' | 'loop_double_b'
  | 'loop_halve_a' | 'loop_halve_b'
  // Auto loop (common sizes: 1, 2, 4, 8 beats)
  | 'loop_1_a' | 'loop_2_a' | 'loop_4_a' | 'loop_8_a'
  | 'loop_1_b' | 'loop_2_b' | 'loop_4_b' | 'loop_8_b'
  // Beat sync (phase alignment)
  | 'beat_sync_a' | 'beat_sync_b'
  // Effects (toggle on/off)
  | 'fx_reverb_a' | 'fx_reverb_b'
  | 'fx_delay_a' | 'fx_delay_b'
  | 'fx_echo_a' | 'fx_echo_b'
  | 'fx_flanger_a' | 'fx_flanger_b';

export interface MIDIEvent {
  action: MIDIAction;
  value: number; // 0-127 for CC/notes, -1 to 1 for normalized values
  velocity?: number; // For note events
  isNoteOn?: boolean;
  isNoteOff?: boolean;
  raw: {
    type: MIDIControlType;
    channel: number;
    number: number;
    value: number;
  };
}

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  type: 'input' | 'output';
  connected: boolean;
}

type MIDIEventCallback = (event: MIDIEvent) => void;
type MIDIDeviceCallback = (devices: MIDIDevice[]) => void;
type MIDILearnCallback = (control: MIDIControl) => void;

/**
 * Default MIDI mappings for common DJ controllers
 * These can be overridden or extended by the user
 *
 * Note: These are generic mappings. Most DJ controllers use different CC/note numbers.
 * Users should use MIDI Learn to map their specific controller.
 */
export const DEFAULT_MAPPINGS: MIDIMapping[] = [
  // ============================================================================
  // Transport Controls
  // ============================================================================

  // Deck A controls (typically left side, MIDI channel 1)
  { id: 'play_a', control: { type: 'note', channel: 1, number: 11, name: 'Play A' }, action: 'play_a', deck: 'A' },
  { id: 'pause_a', control: { type: 'note', channel: 1, number: 12, name: 'Pause A' }, action: 'pause_a', deck: 'A' },
  { id: 'cue_a', control: { type: 'note', channel: 1, number: 13, name: 'Cue A' }, action: 'cue_a', deck: 'A' },
  { id: 'sync_a', control: { type: 'note', channel: 1, number: 14, name: 'Sync A' }, action: 'sync_a', deck: 'A' },

  // Deck B controls (typically right side, MIDI channel 2)
  { id: 'play_b', control: { type: 'note', channel: 2, number: 11, name: 'Play B' }, action: 'play_b', deck: 'B' },
  { id: 'pause_b', control: { type: 'note', channel: 2, number: 12, name: 'Pause B' }, action: 'pause_b', deck: 'B' },
  { id: 'cue_b', control: { type: 'note', channel: 2, number: 13, name: 'Cue B' }, action: 'cue_b', deck: 'B' },
  { id: 'sync_b', control: { type: 'note', channel: 2, number: 14, name: 'Sync B' }, action: 'sync_b', deck: 'B' },

  // ============================================================================
  // Mixer Controls
  // ============================================================================

  { id: 'crossfader', control: { type: 'cc', channel: 1, number: 1, name: 'Crossfader' }, action: 'crossfader', deck: 'both' },
  { id: 'volume_a', control: { type: 'cc', channel: 1, number: 2, name: 'Volume A' }, action: 'volume_a', deck: 'A' },
  { id: 'volume_b', control: { type: 'cc', channel: 1, number: 3, name: 'Volume B' }, action: 'volume_b', deck: 'B' },

  // ============================================================================
  // EQ Controls
  // ============================================================================

  // Deck A EQ
  { id: 'eq_low_a', control: { type: 'cc', channel: 1, number: 4, name: 'EQ Low A' }, action: 'eq_low_a', deck: 'A' },
  { id: 'eq_mid_a', control: { type: 'cc', channel: 1, number: 5, name: 'EQ Mid A' }, action: 'eq_mid_a', deck: 'A' },
  { id: 'eq_high_a', control: { type: 'cc', channel: 1, number: 6, name: 'EQ High A' }, action: 'eq_high_a', deck: 'A' },

  // Deck B EQ
  { id: 'eq_low_b', control: { type: 'cc', channel: 2, number: 4, name: 'EQ Low B' }, action: 'eq_low_b', deck: 'B' },
  { id: 'eq_mid_b', control: { type: 'cc', channel: 2, number: 5, name: 'EQ Mid B' }, action: 'eq_mid_b', deck: 'B' },
  { id: 'eq_high_b', control: { type: 'cc', channel: 2, number: 6, name: 'EQ High B' }, action: 'eq_high_b', deck: 'B' },

  // ============================================================================
  // Jog Wheels & Pitch
  // ============================================================================

  { id: 'jog_a', control: { type: 'cc', channel: 1, number: 7, name: 'Jog A' }, action: 'jog_a', deck: 'A' },
  { id: 'jog_b', control: { type: 'cc', channel: 2, number: 7, name: 'Jog B' }, action: 'jog_b', deck: 'B' },
  { id: 'pitch_a', control: { type: 'cc', channel: 1, number: 8, name: 'Pitch A' }, action: 'pitch_a', deck: 'A' },
  { id: 'pitch_b', control: { type: 'cc', channel: 2, number: 8, name: 'Pitch B' }, action: 'pitch_b', deck: 'B' },

  // ============================================================================
  // Filter Controls
  // ============================================================================

  { id: 'filter_a', control: { type: 'cc', channel: 1, number: 9, name: 'Filter A' }, action: 'filter_a', deck: 'A' },
  { id: 'filter_b', control: { type: 'cc', channel: 2, number: 9, name: 'Filter B' }, action: 'filter_b', deck: 'B' },

  // ============================================================================
  // Hot Cues (8 per deck) - Common on pads/buttons
  // ============================================================================

  // Deck A Hot Cues (notes 36-43 = pads on many controllers)
  { id: 'hotcue_1_a', control: { type: 'note', channel: 1, number: 36, name: 'Hot Cue 1 A' }, action: 'hotcue_1_a', deck: 'A' },
  { id: 'hotcue_2_a', control: { type: 'note', channel: 1, number: 37, name: 'Hot Cue 2 A' }, action: 'hotcue_2_a', deck: 'A' },
  { id: 'hotcue_3_a', control: { type: 'note', channel: 1, number: 38, name: 'Hot Cue 3 A' }, action: 'hotcue_3_a', deck: 'A' },
  { id: 'hotcue_4_a', control: { type: 'note', channel: 1, number: 39, name: 'Hot Cue 4 A' }, action: 'hotcue_4_a', deck: 'A' },
  { id: 'hotcue_5_a', control: { type: 'note', channel: 1, number: 40, name: 'Hot Cue 5 A' }, action: 'hotcue_5_a', deck: 'A' },
  { id: 'hotcue_6_a', control: { type: 'note', channel: 1, number: 41, name: 'Hot Cue 6 A' }, action: 'hotcue_6_a', deck: 'A' },
  { id: 'hotcue_7_a', control: { type: 'note', channel: 1, number: 42, name: 'Hot Cue 7 A' }, action: 'hotcue_7_a', deck: 'A' },
  { id: 'hotcue_8_a', control: { type: 'note', channel: 1, number: 43, name: 'Hot Cue 8 A' }, action: 'hotcue_8_a', deck: 'A' },

  // Deck B Hot Cues
  { id: 'hotcue_1_b', control: { type: 'note', channel: 2, number: 36, name: 'Hot Cue 1 B' }, action: 'hotcue_1_b', deck: 'B' },
  { id: 'hotcue_2_b', control: { type: 'note', channel: 2, number: 37, name: 'Hot Cue 2 B' }, action: 'hotcue_2_b', deck: 'B' },
  { id: 'hotcue_3_b', control: { type: 'note', channel: 2, number: 38, name: 'Hot Cue 3 B' }, action: 'hotcue_3_b', deck: 'B' },
  { id: 'hotcue_4_b', control: { type: 'note', channel: 2, number: 39, name: 'Hot Cue 4 B' }, action: 'hotcue_4_b', deck: 'B' },
  { id: 'hotcue_5_b', control: { type: 'note', channel: 2, number: 40, name: 'Hot Cue 5 B' }, action: 'hotcue_5_b', deck: 'B' },
  { id: 'hotcue_6_b', control: { type: 'note', channel: 2, number: 41, name: 'Hot Cue 6 B' }, action: 'hotcue_6_b', deck: 'B' },
  { id: 'hotcue_7_b', control: { type: 'note', channel: 2, number: 42, name: 'Hot Cue 7 B' }, action: 'hotcue_7_b', deck: 'B' },
  { id: 'hotcue_8_b', control: { type: 'note', channel: 2, number: 43, name: 'Hot Cue 8 B' }, action: 'hotcue_8_b', deck: 'B' },

  // ============================================================================
  // Loop Controls
  // ============================================================================

  // Deck A Loop
  { id: 'loop_in_a', control: { type: 'note', channel: 1, number: 20, name: 'Loop In A' }, action: 'loop_in_a', deck: 'A' },
  { id: 'loop_out_a', control: { type: 'note', channel: 1, number: 21, name: 'Loop Out A' }, action: 'loop_out_a', deck: 'A' },
  { id: 'loop_toggle_a', control: { type: 'note', channel: 1, number: 22, name: 'Loop Toggle A' }, action: 'loop_toggle_a', deck: 'A' },
  { id: 'loop_double_a', control: { type: 'note', channel: 1, number: 23, name: 'Loop x2 A' }, action: 'loop_double_a', deck: 'A' },
  { id: 'loop_halve_a', control: { type: 'note', channel: 1, number: 24, name: 'Loop /2 A' }, action: 'loop_halve_a', deck: 'A' },

  // Deck B Loop
  { id: 'loop_in_b', control: { type: 'note', channel: 2, number: 20, name: 'Loop In B' }, action: 'loop_in_b', deck: 'B' },
  { id: 'loop_out_b', control: { type: 'note', channel: 2, number: 21, name: 'Loop Out B' }, action: 'loop_out_b', deck: 'B' },
  { id: 'loop_toggle_b', control: { type: 'note', channel: 2, number: 22, name: 'Loop Toggle B' }, action: 'loop_toggle_b', deck: 'B' },
  { id: 'loop_double_b', control: { type: 'note', channel: 2, number: 23, name: 'Loop x2 B' }, action: 'loop_double_b', deck: 'B' },
  { id: 'loop_halve_b', control: { type: 'note', channel: 2, number: 24, name: 'Loop /2 B' }, action: 'loop_halve_b', deck: 'B' },

  // Auto Loop (beat-based) - Deck A
  { id: 'loop_1_a', control: { type: 'note', channel: 1, number: 44, name: 'Loop 1 Beat A' }, action: 'loop_1_a', deck: 'A' },
  { id: 'loop_2_a', control: { type: 'note', channel: 1, number: 45, name: 'Loop 2 Beat A' }, action: 'loop_2_a', deck: 'A' },
  { id: 'loop_4_a', control: { type: 'note', channel: 1, number: 46, name: 'Loop 4 Beat A' }, action: 'loop_4_a', deck: 'A' },
  { id: 'loop_8_a', control: { type: 'note', channel: 1, number: 47, name: 'Loop 8 Beat A' }, action: 'loop_8_a', deck: 'A' },

  // Auto Loop (beat-based) - Deck B
  { id: 'loop_1_b', control: { type: 'note', channel: 2, number: 44, name: 'Loop 1 Beat B' }, action: 'loop_1_b', deck: 'B' },
  { id: 'loop_2_b', control: { type: 'note', channel: 2, number: 45, name: 'Loop 2 Beat B' }, action: 'loop_2_b', deck: 'B' },
  { id: 'loop_4_b', control: { type: 'note', channel: 2, number: 46, name: 'Loop 4 Beat B' }, action: 'loop_4_b', deck: 'B' },
  { id: 'loop_8_b', control: { type: 'note', channel: 2, number: 47, name: 'Loop 8 Beat B' }, action: 'loop_8_b', deck: 'B' },

  // ============================================================================
  // Beat Sync (Phase Alignment)
  // ============================================================================

  { id: 'beat_sync_a', control: { type: 'note', channel: 1, number: 15, name: 'Beat Sync A' }, action: 'beat_sync_a', deck: 'A' },
  { id: 'beat_sync_b', control: { type: 'note', channel: 2, number: 15, name: 'Beat Sync B' }, action: 'beat_sync_b', deck: 'B' },

  // ============================================================================
  // Effects (Toggle On/Off)
  // ============================================================================

  // Deck A Effects
  { id: 'fx_reverb_a', control: { type: 'note', channel: 1, number: 48, name: 'Reverb A' }, action: 'fx_reverb_a', deck: 'A' },
  { id: 'fx_delay_a', control: { type: 'note', channel: 1, number: 49, name: 'Delay A' }, action: 'fx_delay_a', deck: 'A' },
  { id: 'fx_echo_a', control: { type: 'note', channel: 1, number: 50, name: 'Echo A' }, action: 'fx_echo_a', deck: 'A' },
  { id: 'fx_flanger_a', control: { type: 'note', channel: 1, number: 51, name: 'Flanger A' }, action: 'fx_flanger_a', deck: 'A' },

  // Deck B Effects
  { id: 'fx_reverb_b', control: { type: 'note', channel: 2, number: 48, name: 'Reverb B' }, action: 'fx_reverb_b', deck: 'B' },
  { id: 'fx_delay_b', control: { type: 'note', channel: 2, number: 49, name: 'Delay B' }, action: 'fx_delay_b', deck: 'B' },
  { id: 'fx_echo_b', control: { type: 'note', channel: 2, number: 50, name: 'Echo B' }, action: 'fx_echo_b', deck: 'B' },
  { id: 'fx_flanger_b', control: { type: 'note', channel: 2, number: 51, name: 'Flanger B' }, action: 'fx_flanger_b', deck: 'B' },
];

export class MIDIController {
  private isEnabled = false;
  private mappings: MIDIMapping[] = [];
  private eventCallbacks: Set<MIDIEventCallback> = new Set();
  private deviceCallbacks: Set<MIDIDeviceCallback> = new Set();
  private learnCallback: MIDILearnCallback | null = null;
  private isLearning = false;
  private activeInputs: Set<Input> = new Set();

  constructor() {
    this.mappings = [...DEFAULT_MAPPINGS];
  }

  /**
   * Initialize WebMIDI and start listening for devices
   */
  async init(): Promise<boolean> {
    try {
      await WebMidi.enable();
      this.isEnabled = true;

      // Set up device connection listeners
      WebMidi.addListener('connected', () => this.handleDeviceChange());
      WebMidi.addListener('disconnected', () => this.handleDeviceChange());

      // Connect to all available inputs
      this.connectAllInputs();

      console.log('[MIDIController] WebMIDI enabled successfully');
      console.log('[MIDIController] Available inputs:', WebMidi.inputs.map(i => i.name));
      console.log('[MIDIController] Available outputs:', WebMidi.outputs.map(o => o.name));

      return true;
    } catch (error) {
      console.warn('[MIDIController] WebMIDI not available:', error);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Disable MIDI and clean up
   */
  async disable(): Promise<void> {
    this.disconnectAllInputs();
    if (WebMidi.enabled) {
      await WebMidi.disable();
    }
    this.isEnabled = false;
    console.log('[MIDIController] WebMIDI disabled');
  }

  /**
   * Check if MIDI is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get list of connected MIDI devices
   */
  getDevices(): MIDIDevice[] {
    if (!this.isEnabled) return [];

    const inputs: MIDIDevice[] = WebMidi.inputs.map(input => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer || 'Unknown',
      type: 'input' as const,
      connected: true,
    }));

    const outputs: MIDIDevice[] = WebMidi.outputs.map(output => ({
      id: output.id,
      name: output.name,
      manufacturer: output.manufacturer || 'Unknown',
      type: 'output' as const,
      connected: true,
    }));

    return [...inputs, ...outputs];
  }

  /**
   * Connect to all available MIDI inputs
   */
  private connectAllInputs(): void {
    for (const input of WebMidi.inputs) {
      this.connectInput(input);
    }
  }

  /**
   * Connect to a specific MIDI input
   */
  private connectInput(input: Input): void {
    if (this.activeInputs.has(input)) return;

    // Listen for note messages
    input.addListener('noteon', (e: NoteMessageEvent) => {
      this.handleNoteMessage(e, true);
    });

    input.addListener('noteoff', (e: NoteMessageEvent) => {
      this.handleNoteMessage(e, false);
    });

    // Listen for control change messages
    input.addListener('controlchange', (e: ControlChangeMessageEvent) => {
      this.handleCCMessage(e);
    });

    this.activeInputs.add(input);
    console.log(`[MIDIController] Connected to input: ${input.name}`);
  }

  /**
   * Disconnect from all MIDI inputs
   */
  private disconnectAllInputs(): void {
    for (const input of this.activeInputs) {
      input.removeListener();
    }
    this.activeInputs.clear();
  }

  /**
   * Handle device connection/disconnection
   */
  private handleDeviceChange(): void {
    // Reconnect to any new inputs
    this.connectAllInputs();

    // Notify listeners
    const devices = this.getDevices();
    for (const callback of this.deviceCallbacks) {
      callback(devices);
    }
  }

  /**
   * Handle note on/off messages
   */
  private handleNoteMessage(e: NoteMessageEvent, isNoteOn: boolean): void {
    const control: MIDIControl = {
      type: 'note',
      channel: e.message.channel,
      number: e.note.number,
      name: `Note ${e.note.identifier}`,
    };

    // If learning, report the control and stop
    if (this.isLearning && this.learnCallback) {
      this.learnCallback(control);
      return;
    }

    // Find matching mapping
    const mapping = this.findMapping(control);
    if (!mapping) return;

    const event: MIDIEvent = {
      action: mapping.action,
      value: isNoteOn ? e.note.attack : 0,
      velocity: isNoteOn ? Math.round(e.note.attack * 127) : 0,
      isNoteOn,
      isNoteOff: !isNoteOn,
      raw: {
        type: 'note',
        channel: e.message.channel,
        number: e.note.number,
        value: isNoteOn ? Math.round(e.note.attack * 127) : 0,
      },
    };

    this.emitEvent(event);
  }

  /**
   * Handle control change messages
   */
  private handleCCMessage(e: ControlChangeMessageEvent): void {
    const control: MIDIControl = {
      type: 'cc',
      channel: e.message.channel,
      number: e.controller.number,
      name: `CC ${e.controller.number}`,
    };

    // If learning, report the control and stop
    if (this.isLearning && this.learnCallback) {
      this.learnCallback(control);
      return;
    }

    // Find matching mapping
    const mapping = this.findMapping(control);
    if (!mapping) return;

    // Get the raw CC value (0-127) - handle different webmidi versions
    const rawValue = typeof e.value === 'number' ? e.value : (e.rawValue ?? 0);

    // Normalize value based on action type
    let normalizedValue = rawValue / 127;

    // For crossfader, convert to -1 to 1 range
    if (mapping.action === 'crossfader') {
      normalizedValue = normalizedValue * 2 - 1;
    }

    // For EQ, convert to -12 to +12 dB range
    if (mapping.action.startsWith('eq_')) {
      normalizedValue = (normalizedValue * 24) - 12;
    }

    const event: MIDIEvent = {
      action: mapping.action,
      value: normalizedValue,
      raw: {
        type: 'cc',
        channel: e.message.channel,
        number: e.controller.number,
        value: rawValue,
      },
    };

    this.emitEvent(event);
  }

  /**
   * Find a mapping for a given control
   */
  private findMapping(control: MIDIControl): MIDIMapping | undefined {
    return this.mappings.find(m =>
      m.control.type === control.type &&
      m.control.number === control.number &&
      (m.control.channel === 'all' || m.control.channel === control.channel)
    );
  }

  /**
   * Emit a MIDI event to all listeners
   */
  private emitEvent(event: MIDIEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[MIDIController] Error in event callback:', error);
      }
    }
  }

  /**
   * Subscribe to MIDI events
   */
  onEvent(callback: MIDIEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Subscribe to device connection changes
   */
  onDeviceChange(callback: MIDIDeviceCallback): () => void {
    this.deviceCallbacks.add(callback);
    // Immediately notify with current devices
    callback(this.getDevices());
    return () => this.deviceCallbacks.delete(callback);
  }

  /**
   * Start MIDI learn mode - the next MIDI input will be captured
   */
  startLearn(callback: MIDILearnCallback): void {
    this.isLearning = true;
    this.learnCallback = callback;
    console.log('[MIDIController] MIDI Learn started - press a button or move a control');
  }

  /**
   * Stop MIDI learn mode
   */
  stopLearn(): void {
    this.isLearning = false;
    this.learnCallback = null;
    console.log('[MIDIController] MIDI Learn stopped');
  }

  /**
   * Check if currently in learn mode
   */
  get learning(): boolean {
    return this.isLearning;
  }

  /**
   * Get current mappings
   */
  getMappings(): MIDIMapping[] {
    return [...this.mappings];
  }

  /**
   * Set a new mapping
   */
  setMapping(mapping: MIDIMapping): void {
    const index = this.mappings.findIndex(m => m.id === mapping.id);
    if (index >= 0) {
      this.mappings[index] = mapping;
    } else {
      this.mappings.push(mapping);
    }
    console.log(`[MIDIController] Mapping updated: ${mapping.id}`);
  }

  /**
   * Remove a mapping
   */
  removeMapping(id: string): void {
    this.mappings = this.mappings.filter(m => m.id !== id);
    console.log(`[MIDIController] Mapping removed: ${id}`);
  }

  /**
   * Reset mappings to defaults
   */
  resetMappings(): void {
    this.mappings = [...DEFAULT_MAPPINGS];
    console.log('[MIDIController] Mappings reset to defaults');
  }

  /**
   * Load mappings from JSON
   */
  loadMappings(json: string): void {
    try {
      const mappings = JSON.parse(json) as MIDIMapping[];
      this.mappings = mappings;
      console.log(`[MIDIController] Loaded ${mappings.length} mappings`);
    } catch (error) {
      console.error('[MIDIController] Failed to load mappings:', error);
    }
  }

  /**
   * Export mappings to JSON
   */
  exportMappings(): string {
    return JSON.stringify(this.mappings, null, 2);
  }

  /**
   * Send MIDI output (for controller feedback LEDs, etc.)
   */
  sendNote(outputId: string, channel: number, note: number, velocity: number): void {
    const output = WebMidi.getOutputById(outputId);
    if (output) {
      output.playNote(note, { channels: channel, attack: velocity / 127 });
    }
  }

  /**
   * Send CC output
   */
  sendCC(outputId: string, channel: number, cc: number, value: number): void {
    const output = WebMidi.getOutputById(outputId);
    if (output) {
      output.sendControlChange(cc, value, { channels: channel });
    }
  }
}

// Singleton instance
export const midiController = new MIDIController();
