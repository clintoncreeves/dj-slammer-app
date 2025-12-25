/**
 * EffectsPad - DJ Effects Control Panel
 *
 * Provides an interactive UI for controlling DJ effects:
 * - Reverb: Ambient space and depth
 * - Delay: Beat-synced echo with feedback
 * - Echo: Ping-pong stereo delay
 * - Flanger: Classic chorus/flanger effect
 * - Phaser: Phase-shifting modulation
 *
 * Features:
 * - Effect on/off toggle buttons with visual feedback
 * - Wet/dry knob per effect
 * - Beat division selector for synced effects
 * - Parameter controls for each effect type
 */

import React, { useState, useCallback } from 'react';
import { DeckId, EffectType, DeckEffect } from './types';
import { BEAT_DIVISIONS, DEFAULT_EFFECT_PARAMS } from './EffectsEngine';
import styles from './EffectsPad.module.css';

interface EffectsPadProps {
  deck: DeckId;
  effects: DeckEffect[];
  currentBPM: number;
  onSetEffectWet: (deck: DeckId, effectType: EffectType, wet: number) => void;
  onToggleEffect: (deck: DeckId, effectType: EffectType) => void;
  onSetEffectParam: (deck: DeckId, effectType: EffectType, param: string, value: number) => void;
}

/**
 * Effect configuration with display info
 */
interface EffectConfig {
  type: EffectType;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
}

const EFFECT_CONFIGS: EffectConfig[] = [
  {
    type: 'reverb',
    name: 'Reverb',
    shortName: 'REV',
    icon: '~',
    color: '#00d4ff',
    description: 'Ambient space',
  },
  {
    type: 'delay',
    name: 'Delay',
    shortName: 'DLY',
    icon: '>>',
    color: '#ff6b00',
    description: 'Beat-synced echo',
  },
  {
    type: 'echo',
    name: 'Echo',
    shortName: 'ECH',
    icon: '<>',
    color: '#00ff88',
    description: 'Ping-pong delay',
  },
  {
    type: 'flanger',
    name: 'Flanger',
    shortName: 'FLG',
    icon: '~/',
    color: '#ff00ff',
    description: 'Chorus effect',
  },
  {
    type: 'phaser',
    name: 'Phaser',
    shortName: 'PHA',
    icon: '/\\',
    color: '#ffff00',
    description: 'Phase shift',
  },
];

/**
 * Get effect state from effects array or return default
 */
function getEffectState(effects: DeckEffect[], type: EffectType): DeckEffect {
  const effect = effects.find((e) => e.type === type);
  if (effect) return effect;

  // Return default state
  return {
    type,
    wet: 0,
    enabled: false,
    params: { ...DEFAULT_EFFECT_PARAMS[type] },
  };
}

/**
 * Effect button component
 */
interface EffectButtonProps {
  config: EffectConfig;
  effect: DeckEffect;
  onToggle: () => void;
  onWetChange: (wet: number) => void;
}

function EffectButton({ config, effect, onToggle, onWetChange }: EffectButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startWet, setStartWet] = useState(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        setIsDragging(true);
        setStartY(e.clientY);
        setStartWet(effect.wet);
        e.preventDefault();
      }
    },
    [effect.wet]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        // Vertical drag to adjust wet amount
        const deltaY = startY - e.clientY;
        const deltaWet = deltaY / 100; // 100px = full range
        const newWet = Math.max(0, Math.min(1, startWet + deltaWet));
        onWetChange(newWet);
      }
    },
    [isDragging, startY, startWet, onWetChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only toggle if not dragging
      if (!isDragging && Math.abs(e.clientY - startY) < 5) {
        onToggle();
      }
    },
    [isDragging, startY, onToggle]
  );

  const wetPercent = Math.round(effect.wet * 100);

  return (
    <button
      className={`${styles.effectButton} ${effect.enabled ? styles.effectActive : ''}`}
      style={{
        '--effect-color': config.color,
        '--wet-level': `${wetPercent}%`,
      } as React.CSSProperties}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={`${config.name}: ${config.description}\nDrag up/down to adjust wet level\nClick to toggle`}
    >
      <div className={styles.effectIcon}>{config.icon}</div>
      <div className={styles.effectName}>{config.shortName}</div>
      <div className={styles.wetIndicator}>
        <div className={styles.wetFill} />
      </div>
      <div className={styles.wetValue}>{wetPercent}%</div>
    </button>
  );
}

/**
 * Beat division selector for delay effects
 */
interface BeatDivisionSelectorProps {
  currentDivision: number;
  currentBPM: number;
  onChange: (division: number) => void;
}

function BeatDivisionSelector({ currentDivision, currentBPM, onChange }: BeatDivisionSelectorProps) {
  // Calculate delay time for display
  const beatFractions: Record<string, number> = {
    '1/16': 0.0625,
    '1/8': 0.125,
    '1/4': 0.25,
    '1/2': 0.5,
    '1': 1,
    '2': 2,
  };

  const division = BEAT_DIVISIONS[currentDivision] || '1/4';
  const delayTime = (60 / currentBPM) * (beatFractions[division] || 0.25);

  return (
    <div className={styles.beatDivisionSelector}>
      <div className={styles.beatDivisionLabel}>BEAT</div>
      <div className={styles.beatDivisionButtons}>
        {BEAT_DIVISIONS.map((div, index) => (
          <button
            key={div}
            className={`${styles.beatDivisionButton} ${index === currentDivision ? styles.beatDivisionActive : ''}`}
            onClick={() => onChange(index)}
          >
            {div}
          </button>
        ))}
      </div>
      <div className={styles.delayTimeDisplay}>{(delayTime * 1000).toFixed(0)}ms</div>
    </div>
  );
}

/**
 * Parameter slider for effect-specific controls
 */
interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function ParamSlider({ label, value, min, max, step, unit = '', onChange }: ParamSliderProps) {
  return (
    <div className={styles.paramSlider}>
      <label className={styles.paramLabel}>{label}</label>
      <input
        type="range"
        className={styles.paramRange}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className={styles.paramValue}>
        {value.toFixed(step < 1 ? 2 : 0)}
        {unit}
      </span>
    </div>
  );
}

/**
 * Expanded effect panel with detailed controls
 */
interface EffectDetailPanelProps {
  config: EffectConfig;
  effect: DeckEffect;
  currentBPM: number;
  onParamChange: (param: string, value: number) => void;
  onClose: () => void;
}

function EffectDetailPanel({ config, effect, currentBPM, onParamChange, onClose }: EffectDetailPanelProps) {
  const params = effect.params;

  return (
    <div className={styles.effectDetailPanel} style={{ '--effect-color': config.color } as React.CSSProperties}>
      <div className={styles.detailHeader}>
        <span className={styles.detailTitle}>{config.name}</span>
        <button className={styles.detailClose} onClick={onClose}>
          x
        </button>
      </div>

      <div className={styles.detailParams}>
        {config.type === 'reverb' && (
          <>
            <ParamSlider
              label="Decay"
              value={params.decay || 2.5}
              min={0.5}
              max={10}
              step={0.1}
              unit="s"
              onChange={(v) => onParamChange('decay', v)}
            />
            <ParamSlider
              label="Pre-Delay"
              value={(params.preDelay || 0.01) * 1000}
              min={0}
              max={100}
              step={1}
              unit="ms"
              onChange={(v) => onParamChange('preDelay', v / 1000)}
            />
          </>
        )}

        {(config.type === 'delay' || config.type === 'echo') && (
          <>
            <BeatDivisionSelector
              currentDivision={params.beatDivision || 2}
              currentBPM={currentBPM}
              onChange={(v) => onParamChange('beatDivision', v)}
            />
            <ParamSlider
              label="Feedback"
              value={(params.feedback || 0.4) * 100}
              min={0}
              max={90}
              step={1}
              unit="%"
              onChange={(v) => onParamChange('feedback', v / 100)}
            />
          </>
        )}

        {config.type === 'flanger' && (
          <>
            <ParamSlider
              label="Rate"
              value={params.frequency || 0.5}
              min={0.1}
              max={10}
              step={0.1}
              unit="Hz"
              onChange={(v) => onParamChange('frequency', v)}
            />
            <ParamSlider
              label="Depth"
              value={(params.depth || 0.7) * 100}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(v) => onParamChange('depth', v / 100)}
            />
            <ParamSlider
              label="Feedback"
              value={(params.feedback || 0.3) * 100}
              min={0}
              max={90}
              step={1}
              unit="%"
              onChange={(v) => onParamChange('feedback', v / 100)}
            />
          </>
        )}

        {config.type === 'phaser' && (
          <>
            <ParamSlider
              label="Rate"
              value={params.frequency || 0.5}
              min={0.1}
              max={10}
              step={0.1}
              unit="Hz"
              onChange={(v) => onParamChange('frequency', v)}
            />
            <ParamSlider
              label="Octaves"
              value={params.octaves || 3}
              min={1}
              max={6}
              step={1}
              unit=""
              onChange={(v) => onParamChange('octaves', v)}
            />
            <ParamSlider
              label="Base Freq"
              value={params.baseFrequency || 350}
              min={100}
              max={1000}
              step={10}
              unit="Hz"
              onChange={(v) => onParamChange('baseFrequency', v)}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Main EffectsPad component
 */
export function EffectsPad({
  deck,
  effects,
  currentBPM,
  onSetEffectWet,
  onToggleEffect,
  onSetEffectParam,
}: EffectsPadProps) {
  const [expandedEffect, setExpandedEffect] = useState<EffectType | null>(null);

  const handleToggle = useCallback(
    (type: EffectType) => {
      onToggleEffect(deck, type);
    },
    [deck, onToggleEffect]
  );

  const handleWetChange = useCallback(
    (type: EffectType, wet: number) => {
      onSetEffectWet(deck, type, wet);
    },
    [deck, onSetEffectWet]
  );

  const handleParamChange = useCallback(
    (type: EffectType, param: string, value: number) => {
      onSetEffectParam(deck, type, param, value);
    },
    [deck, onSetEffectParam]
  );

  const handleDoubleClick = useCallback((type: EffectType) => {
    setExpandedEffect((prev) => (prev === type ? null : type));
  }, []);

  return (
    <div className={styles.effectsPad}>
      <div className={styles.effectsHeader}>
        <span className={styles.effectsTitle}>FX</span>
        <span className={styles.deckLabel}>DECK {deck}</span>
      </div>

      <div className={styles.effectsGrid}>
        {EFFECT_CONFIGS.map((config) => {
          const effect = getEffectState(effects, config.type);
          return (
            <div key={config.type} onDoubleClick={() => handleDoubleClick(config.type)}>
              <EffectButton
                config={config}
                effect={effect}
                onToggle={() => handleToggle(config.type)}
                onWetChange={(wet) => handleWetChange(config.type, wet)}
              />
            </div>
          );
        })}
      </div>

      {expandedEffect && (
        <EffectDetailPanel
          config={EFFECT_CONFIGS.find((c) => c.type === expandedEffect)!}
          effect={getEffectState(effects, expandedEffect)}
          currentBPM={currentBPM}
          onParamChange={(param, value) => handleParamChange(expandedEffect, param, value)}
          onClose={() => setExpandedEffect(null)}
        />
      )}
    </div>
  );
}

export default EffectsPad;
