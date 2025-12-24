/**
 * MIDI Settings Component
 *
 * Provides UI for:
 * - Enabling/disabling MIDI
 * - Viewing connected devices
 * - Configuring control mappings with MIDI learn
 * - Import/export mappings
 */

import { useState } from 'react';
import { useMIDI } from './MIDIContext';
import { MIDIAction, MIDIMapping } from '../../services/MIDIController';
import styles from './MIDISettings.module.css';

// Organized list of mappable actions
const MAPPABLE_ACTIONS: { category: string; actions: { action: MIDIAction; label: string }[] }[] = [
  {
    category: 'Deck A',
    actions: [
      { action: 'play_a', label: 'Play' },
      { action: 'pause_a', label: 'Pause' },
      { action: 'cue_a', label: 'Cue' },
      { action: 'sync_a', label: 'Sync' },
      { action: 'jog_a', label: 'Jog Wheel' },
      { action: 'pitch_a', label: 'Pitch Fader' },
      { action: 'volume_a', label: 'Volume' },
      { action: 'eq_low_a', label: 'EQ Low' },
      { action: 'eq_mid_a', label: 'EQ Mid' },
      { action: 'eq_high_a', label: 'EQ High' },
      { action: 'filter_a', label: 'Filter' },
    ],
  },
  {
    category: 'Deck B',
    actions: [
      { action: 'play_b', label: 'Play' },
      { action: 'pause_b', label: 'Pause' },
      { action: 'cue_b', label: 'Cue' },
      { action: 'sync_b', label: 'Sync' },
      { action: 'jog_b', label: 'Jog Wheel' },
      { action: 'pitch_b', label: 'Pitch Fader' },
      { action: 'volume_b', label: 'Volume' },
      { action: 'eq_low_b', label: 'EQ Low' },
      { action: 'eq_mid_b', label: 'EQ Mid' },
      { action: 'eq_high_b', label: 'EQ High' },
      { action: 'filter_b', label: 'Filter' },
    ],
  },
  {
    category: 'Mixer',
    actions: [
      { action: 'crossfader', label: 'Crossfader' },
    ],
  },
];

export function MIDISettings() {
  const midi = useMIDI();
  const [learningAction, setLearningAction] = useState<MIDIAction | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Get mapping for an action
  const getMappingForAction = (action: MIDIAction): MIDIMapping | undefined => {
    return midi.mappings.find(m => m.action === action);
  };

  // Format control for display
  const formatControl = (mapping: MIDIMapping | undefined): string => {
    if (!mapping) return 'Not mapped';
    const { control } = mapping;
    if (control.type === 'note') {
      return `Note ${control.number} (Ch ${control.channel})`;
    } else if (control.type === 'cc') {
      return `CC ${control.number} (Ch ${control.channel})`;
    }
    return `${control.type} ${control.number}`;
  };

  // Handle learn button click
  const handleLearn = (action: MIDIAction) => {
    if (learningAction === action) {
      // Cancel learning
      midi.stopLearn();
      setLearningAction(null);
    } else {
      // Start learning
      setLearningAction(action);
      midi.startLearn(action, () => {
        setLearningAction(null);
      });
    }
  };

  // Handle export
  const handleExport = () => {
    const json = midi.exportMappings();
    navigator.clipboard.writeText(json);
    setShowExport(true);
    setTimeout(() => setShowExport(false), 2000);
  };

  // Handle import
  const handleImport = () => {
    if (importJson.trim()) {
      try {
        midi.loadMappings(importJson);
        setImportJson('');
      } catch (e) {
        console.error('Failed to import mappings:', e);
      }
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        <span className={styles.midiIcon}>🎹</span>
        MIDI Controller Settings
      </h2>

      {/* Connection Status */}
      <section className={styles.section}>
        <h3>Connection</h3>
        <div className={styles.connectionStatus}>
          {!midi.isEnabled ? (
            <button
              className={styles.enableButton}
              onClick={() => midi.initialize()}
              disabled={midi.isInitializing}
            >
              {midi.isInitializing ? 'Connecting...' : 'Enable MIDI'}
            </button>
          ) : (
            <>
              <span className={styles.statusConnected}>MIDI Enabled</span>
              <button className={styles.disableButton} onClick={() => midi.disable()}>
                Disable
              </button>
            </>
          )}
        </div>
      </section>

      {/* Connected Devices */}
      {midi.isEnabled && (
        <section className={styles.section}>
          <h3>Connected Devices</h3>
          {midi.devices.length === 0 ? (
            <p className={styles.noDevices}>No MIDI devices detected</p>
          ) : (
            <ul className={styles.deviceList}>
              {midi.devices.map(device => (
                <li key={device.id} className={styles.device}>
                  <span className={styles.deviceType}>
                    {device.type === 'input' ? '⬅️' : '➡️'}
                  </span>
                  <span className={styles.deviceName}>{device.name}</span>
                  <span className={styles.deviceManufacturer}>{device.manufacturer}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Control Mappings */}
      {midi.isEnabled && (
        <section className={styles.section}>
          <h3>Control Mappings</h3>
          <p className={styles.hint}>
            Click "Learn" then press a button or move a control on your MIDI device.
          </p>

          {MAPPABLE_ACTIONS.map(category => (
            <div key={category.category} className={styles.mappingCategory}>
              <h4>{category.category}</h4>
              <div className={styles.mappingList}>
                {category.actions.map(({ action, label }) => {
                  const mapping = getMappingForAction(action);
                  const isLearning = learningAction === action;

                  return (
                    <div
                      key={action}
                      className={`${styles.mappingRow} ${isLearning ? styles.learning : ''}`}
                    >
                      <span className={styles.actionLabel}>{label}</span>
                      <span className={styles.controlValue}>{formatControl(mapping)}</span>
                      <button
                        className={`${styles.learnButton} ${isLearning ? styles.learningActive : ''}`}
                        onClick={() => handleLearn(action)}
                      >
                        {isLearning ? 'Press a control...' : 'Learn'}
                      </button>
                      {mapping && (
                        <button
                          className={styles.clearButton}
                          onClick={() => midi.removeMapping(action)}
                          title="Clear mapping"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Reset Mappings */}
          <div className={styles.resetSection}>
            <button className={styles.resetButton} onClick={() => midi.resetMappings()}>
              Reset to Defaults
            </button>
          </div>
        </section>
      )}

      {/* Import/Export */}
      {midi.isEnabled && (
        <section className={styles.section}>
          <h3>Import / Export</h3>
          <div className={styles.importExport}>
            <button className={styles.exportButton} onClick={handleExport}>
              {showExport ? 'Copied!' : 'Copy Mappings to Clipboard'}
            </button>
            <div className={styles.importGroup}>
              <textarea
                className={styles.importTextarea}
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder="Paste mappings JSON here..."
                rows={3}
              />
              <button
                className={styles.importButton}
                onClick={handleImport}
                disabled={!importJson.trim()}
              >
                Import
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Debug Info */}
      {midi.isEnabled && midi.lastEvent && (
        <section className={styles.section}>
          <h3>Last MIDI Event</h3>
          <pre className={styles.debugInfo}>
            {JSON.stringify(midi.lastEvent, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
