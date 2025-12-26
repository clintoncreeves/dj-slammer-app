/**
 * MIDI Context for React Integration
 *
 * Provides MIDI controller functionality to React components.
 * Handles initialization, device management, and event routing.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import {
  midiController,
  MIDIDevice,
  MIDIEvent,
  MIDIMapping,
  MIDIControl,
  MIDIAction,
} from '../../services/MIDIController';
import { useDeck } from './DeckContext';

interface MIDIContextValue {
  /** Whether MIDI is enabled and available */
  isEnabled: boolean;
  /** Whether MIDI is currently initializing */
  isInitializing: boolean;
  /** List of connected MIDI devices */
  devices: MIDIDevice[];
  /** Current MIDI mappings */
  mappings: MIDIMapping[];
  /** Whether in MIDI learn mode */
  isLearning: boolean;
  /** Last received MIDI event (for debugging/display) */
  lastEvent: MIDIEvent | null;
  /** Initialize MIDI */
  initialize: () => Promise<boolean>;
  /** Disable MIDI */
  disable: () => Promise<void>;
  /** Start MIDI learn mode for an action */
  startLearn: (action: MIDIAction, callback: (control: MIDIControl) => void) => void;
  /** Stop MIDI learn mode */
  stopLearn: () => void;
  /** Set a mapping */
  setMapping: (mapping: MIDIMapping) => void;
  /** Remove a mapping */
  removeMapping: (id: string) => void;
  /** Reset mappings to defaults */
  resetMappings: () => void;
  /** Export mappings as JSON */
  exportMappings: () => string;
  /** Load mappings from JSON */
  loadMappings: (json: string) => void;
}

const MIDIContext = createContext<MIDIContextValue | undefined>(undefined);

interface MIDIProviderProps {
  children: ReactNode;
  /** Auto-initialize MIDI on mount */
  autoInit?: boolean;
}

export function MIDIProvider({ children, autoInit = false }: MIDIProviderProps) {
  const deck = useDeck();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [devices, setDevices] = useState<MIDIDevice[]>([]);
  const [mappings, setMappings] = useState<MIDIMapping[]>(midiController.getMappings());
  const [isLearning, setIsLearning] = useState(false);
  const [lastEvent, setLastEvent] = useState<MIDIEvent | null>(null);
  const learnCallbackRef = useRef<((control: MIDIControl) => void) | null>(null);
  // Store cleanup functions for event listeners to prevent memory leaks
  const eventCleanupRef = useRef<(() => void) | null>(null);
  const deviceCleanupRef = useRef<(() => void) | null>(null);

  // Handle MIDI events and route to deck actions
  const handleMIDIEvent = useCallback((event: MIDIEvent) => {
    setLastEvent(event);

    // Route event to appropriate deck action
    switch (event.action) {
      // Play/Pause controls
      case 'play_a':
        if (event.isNoteOn) deck.playDeck('A');
        break;
      case 'play_b':
        if (event.isNoteOn) deck.playDeck('B');
        break;
      case 'pause_a':
        if (event.isNoteOn) deck.pauseDeck('A');
        break;
      case 'pause_b':
        if (event.isNoteOn) deck.pauseDeck('B');
        break;

      // Cue controls
      case 'cue_a':
        if (event.isNoteOn) deck.cueDeck('A');
        break;
      case 'cue_b':
        if (event.isNoteOn) deck.cueDeck('B');
        break;

      // Sync controls
      case 'sync_a':
        if (event.isNoteOn) deck.syncDeck('A');
        break;
      case 'sync_b':
        if (event.isNoteOn) deck.syncDeck('B');
        break;

      // Crossfader (continuous control)
      case 'crossfader':
        deck.setCrossfader(event.value); // Already normalized to -1 to 1
        break;

      // EQ controls (continuous, already normalized to -12 to +12)
      case 'eq_low_a':
        deck.setDeckEQ('A', 'low', event.value);
        break;
      case 'eq_mid_a':
        deck.setDeckEQ('A', 'mid', event.value);
        break;
      case 'eq_high_a':
        deck.setDeckEQ('A', 'high', event.value);
        break;
      case 'eq_low_b':
        deck.setDeckEQ('B', 'low', event.value);
        break;
      case 'eq_mid_b':
        deck.setDeckEQ('B', 'mid', event.value);
        break;
      case 'eq_high_b':
        deck.setDeckEQ('B', 'high', event.value);
        break;

      // Jog wheels (seek relative)
      case 'jog_a': {
        const jogDelta = (event.raw.value - 64) / 64; // Center at 64, normalize to -1 to 1
        const seekAmount = jogDelta * 2; // 2 seconds per full jog rotation
        const newTime = Math.max(0, deck.deckAState.currentTime + seekAmount);
        deck.seekDeck('A', newTime);
        break;
      }
      case 'jog_b': {
        const jogDelta = (event.raw.value - 64) / 64;
        const seekAmount = jogDelta * 2;
        const newTime = Math.max(0, deck.deckBState.currentTime + seekAmount);
        deck.seekDeck('B', newTime);
        break;
      }

      // Pitch faders (playback rate)
      case 'pitch_a': {
        // Convert 0-1 to 0.8-1.2 range
        const rate = 0.8 + (event.value * 0.4);
        deck.setPlaybackRate('A', rate);
        break;
      }
      case 'pitch_b': {
        const rate = 0.8 + (event.value * 0.4);
        deck.setPlaybackRate('B', rate);
        break;
      }

      // Filter controls (bi-directional: -1 to +1)
      case 'filter_a':
        // Convert 0-1 to -1 to +1 (center = no filter)
        deck.setDeckFilter('A', (event.value * 2) - 1);
        break;
      case 'filter_b':
        deck.setDeckFilter('B', (event.value * 2) - 1);
        break;

      // Volume controls (0 to 1)
      case 'volume_a':
        deck.setVolume('A', event.value);
        break;
      case 'volume_b':
        deck.setVolume('B', event.value);
        break;

      // Hot cues - Deck A (1-8)
      case 'hotcue_1_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[0]) deck.jumpToHotCue('A', 1);
          else deck.setHotCue('A', 1);
        }
        break;
      case 'hotcue_2_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[1]) deck.jumpToHotCue('A', 2);
          else deck.setHotCue('A', 2);
        }
        break;
      case 'hotcue_3_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[2]) deck.jumpToHotCue('A', 3);
          else deck.setHotCue('A', 3);
        }
        break;
      case 'hotcue_4_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[3]) deck.jumpToHotCue('A', 4);
          else deck.setHotCue('A', 4);
        }
        break;
      case 'hotcue_5_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[4]) deck.jumpToHotCue('A', 5);
          else deck.setHotCue('A', 5);
        }
        break;
      case 'hotcue_6_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[5]) deck.jumpToHotCue('A', 6);
          else deck.setHotCue('A', 6);
        }
        break;
      case 'hotcue_7_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[6]) deck.jumpToHotCue('A', 7);
          else deck.setHotCue('A', 7);
        }
        break;
      case 'hotcue_8_a':
        if (event.isNoteOn) {
          if (deck.hotCuesA[7]) deck.jumpToHotCue('A', 8);
          else deck.setHotCue('A', 8);
        }
        break;

      // Hot cues - Deck B (1-8)
      case 'hotcue_1_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[0]) deck.jumpToHotCue('B', 1);
          else deck.setHotCue('B', 1);
        }
        break;
      case 'hotcue_2_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[1]) deck.jumpToHotCue('B', 2);
          else deck.setHotCue('B', 2);
        }
        break;
      case 'hotcue_3_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[2]) deck.jumpToHotCue('B', 3);
          else deck.setHotCue('B', 3);
        }
        break;
      case 'hotcue_4_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[3]) deck.jumpToHotCue('B', 4);
          else deck.setHotCue('B', 4);
        }
        break;
      case 'hotcue_5_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[4]) deck.jumpToHotCue('B', 5);
          else deck.setHotCue('B', 5);
        }
        break;
      case 'hotcue_6_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[5]) deck.jumpToHotCue('B', 6);
          else deck.setHotCue('B', 6);
        }
        break;
      case 'hotcue_7_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[6]) deck.jumpToHotCue('B', 7);
          else deck.setHotCue('B', 7);
        }
        break;
      case 'hotcue_8_b':
        if (event.isNoteOn) {
          if (deck.hotCuesB[7]) deck.jumpToHotCue('B', 8);
          else deck.setHotCue('B', 8);
        }
        break;

      // Loop In/Out controls
      case 'loop_in_a':
        if (event.isNoteOn) deck.setLoopIn('A');
        break;
      case 'loop_in_b':
        if (event.isNoteOn) deck.setLoopIn('B');
        break;
      case 'loop_out_a':
        if (event.isNoteOn) deck.setLoopOut('A');
        break;
      case 'loop_out_b':
        if (event.isNoteOn) deck.setLoopOut('B');
        break;

      // Loop toggle (activate/deactivate)
      case 'loop_toggle_a':
        if (event.isNoteOn) deck.toggleLoop('A');
        break;
      case 'loop_toggle_b':
        if (event.isNoteOn) deck.toggleLoop('B');
        break;

      // Loop double/halve
      case 'loop_double_a':
        if (event.isNoteOn) deck.doubleLoop('A');
        break;
      case 'loop_double_b':
        if (event.isNoteOn) deck.doubleLoop('B');
        break;
      case 'loop_halve_a':
        if (event.isNoteOn) deck.halveLoop('A');
        break;
      case 'loop_halve_b':
        if (event.isNoteOn) deck.halveLoop('B');
        break;

      // Auto-loop (1, 2, 4, 8 beats)
      case 'loop_1_a':
        if (event.isNoteOn) deck.setAutoLoop('A', 1);
        break;
      case 'loop_2_a':
        if (event.isNoteOn) deck.setAutoLoop('A', 2);
        break;
      case 'loop_4_a':
        if (event.isNoteOn) deck.setAutoLoop('A', 4);
        break;
      case 'loop_8_a':
        if (event.isNoteOn) deck.setAutoLoop('A', 8);
        break;
      case 'loop_1_b':
        if (event.isNoteOn) deck.setAutoLoop('B', 1);
        break;
      case 'loop_2_b':
        if (event.isNoteOn) deck.setAutoLoop('B', 2);
        break;
      case 'loop_4_b':
        if (event.isNoteOn) deck.setAutoLoop('B', 4);
        break;
      case 'loop_8_b':
        if (event.isNoteOn) deck.setAutoLoop('B', 8);
        break;

      // Beat sync (phase alignment)
      case 'beat_sync_a':
        if (event.isNoteOn) deck.syncBeatPhase('A');
        break;
      case 'beat_sync_b':
        if (event.isNoteOn) deck.syncBeatPhase('B');
        break;

      // Effects (toggle on/off) - placeholder for future implementation
      case 'fx_reverb_a':
      case 'fx_reverb_b':
      case 'fx_delay_a':
      case 'fx_delay_b':
      case 'fx_echo_a':
      case 'fx_echo_b':
      case 'fx_flanger_a':
      case 'fx_flanger_b':
        if (event.isNoteOn) {
          console.log(`[MIDI] Effect toggle: ${event.action}`);
          // TODO: Wire up effects when EffectsEngine integration is complete
        }
        break;
    }
  }, [deck]);

  // Initialize MIDI
  const initialize = useCallback(async (): Promise<boolean> => {
    if (isEnabled) return true;

    setIsInitializing(true);
    try {
      const success = await midiController.init();
      setIsEnabled(success);

      if (success) {
        // Set up event listener and store cleanup function
        eventCleanupRef.current = midiController.onEvent(handleMIDIEvent);

        // Set up device change listener and store cleanup function
        deviceCleanupRef.current = midiController.onDeviceChange(setDevices);

        // Load saved mappings from localStorage
        const savedMappings = localStorage.getItem('djslammer-midi-mappings');
        if (savedMappings) {
          midiController.loadMappings(savedMappings);
          setMappings(midiController.getMappings());
        }
      }

      return success;
    } finally {
      setIsInitializing(false);
    }
  }, [isEnabled, handleMIDIEvent]);

  // Disable MIDI
  const disable = useCallback(async () => {
    // Clean up event listeners to prevent memory leaks
    if (eventCleanupRef.current) {
      eventCleanupRef.current();
      eventCleanupRef.current = null;
    }
    if (deviceCleanupRef.current) {
      deviceCleanupRef.current();
      deviceCleanupRef.current = null;
    }
    await midiController.disable();
    setIsEnabled(false);
    setDevices([]);
  }, []);

  // Start MIDI learn
  const startLearn = useCallback((action: MIDIAction, callback: (control: MIDIControl) => void) => {
    learnCallbackRef.current = callback;
    setIsLearning(true);

    midiController.startLearn((control) => {
      // Create a new mapping with the learned control
      const mapping: MIDIMapping = {
        id: action,
        control,
        action,
        deck: action.endsWith('_a') ? 'A' : action.endsWith('_b') ? 'B' : 'both',
      };

      // Update the mapping
      midiController.setMapping(mapping);
      setMappings(midiController.getMappings());

      // Save to localStorage
      localStorage.setItem('djslammer-midi-mappings', midiController.exportMappings());

      // Call the callback
      if (learnCallbackRef.current) {
        learnCallbackRef.current(control);
      }

      // Stop learning
      midiController.stopLearn();
      setIsLearning(false);
      learnCallbackRef.current = null;
    });
  }, []);

  // Stop MIDI learn
  const stopLearn = useCallback(() => {
    midiController.stopLearn();
    setIsLearning(false);
    learnCallbackRef.current = null;
  }, []);

  // Set a mapping
  const setMapping = useCallback((mapping: MIDIMapping) => {
    midiController.setMapping(mapping);
    setMappings(midiController.getMappings());
    localStorage.setItem('djslammer-midi-mappings', midiController.exportMappings());
  }, []);

  // Remove a mapping
  const removeMapping = useCallback((id: string) => {
    midiController.removeMapping(id);
    setMappings(midiController.getMappings());
    localStorage.setItem('djslammer-midi-mappings', midiController.exportMappings());
  }, []);

  // Reset mappings
  const resetMappings = useCallback(() => {
    midiController.resetMappings();
    setMappings(midiController.getMappings());
    localStorage.removeItem('djslammer-midi-mappings');
  }, []);

  // Export mappings
  const exportMappings = useCallback(() => {
    return midiController.exportMappings();
  }, []);

  // Load mappings
  const loadMappings = useCallback((json: string) => {
    midiController.loadMappings(json);
    setMappings(midiController.getMappings());
    localStorage.setItem('djslammer-midi-mappings', json);
  }, []);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInit) {
      initialize();
    }

    // Cleanup on unmount - remove event listeners to prevent memory leaks
    return () => {
      if (eventCleanupRef.current) {
        eventCleanupRef.current();
        eventCleanupRef.current = null;
      }
      if (deviceCleanupRef.current) {
        deviceCleanupRef.current();
        deviceCleanupRef.current = null;
      }
      midiController.disable();
    };
  }, [autoInit, initialize]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<MIDIContextValue>(() => ({
    isEnabled,
    isInitializing,
    devices,
    mappings,
    isLearning,
    lastEvent,
    initialize,
    disable,
    startLearn,
    stopLearn,
    setMapping,
    removeMapping,
    resetMappings,
    exportMappings,
    loadMappings,
  }), [
    isEnabled,
    isInitializing,
    devices,
    mappings,
    isLearning,
    lastEvent,
    initialize,
    disable,
    startLearn,
    stopLearn,
    setMapping,
    removeMapping,
    resetMappings,
    exportMappings,
    loadMappings,
  ]);

  return <MIDIContext.Provider value={value}>{children}</MIDIContext.Provider>;
}

/**
 * Hook to access MIDI context
 */
export function useMIDI(): MIDIContextValue {
  const context = useContext(MIDIContext);
  if (context === undefined) {
    throw new Error('useMIDI must be used within a MIDIProvider');
  }
  return context;
}

/**
 * Hook to check if MIDI is available (without requiring MIDIProvider)
 */
export function useMIDIAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if Web MIDI API is available
    const checkMIDI = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          await navigator.requestMIDIAccess();
          setIsAvailable(true);
        } catch {
          setIsAvailable(false);
        }
      }
    };
    checkMIDI();
  }, []);

  return isAvailable;
}
