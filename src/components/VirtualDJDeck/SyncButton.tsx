/**
 * SyncButton Component
 *
 * Professional BPM sync button with visual feedback for sync type.
 * Implements industry-standard BPM synchronization with half-time/double-time detection.
 *
 * Features:
 * - One-click BPM synchronization
 * - Visual indicator of sync type (direct, half-time, double-time)
 * - Touch-friendly (≥44x44px)
 * - Professional neon glow effects
 */

import { useState, useEffect } from 'react';
import { DeckId } from './types';
import styles from './SyncButton.module.css';

interface SyncButtonProps {
  /** The deck this sync button controls (will be synced TO the other deck) */
  deck: DeckId;
  /** Whether tracks are loaded on both decks */
  canSync: boolean;
  /** Callback when sync button is clicked */
  onSync: () => void;
  /** Current sync status */
  syncType?: 'direct' | 'half-time' | 'double-time' | null;
  /** Color theme */
  color: string;
  /** Additional CSS class */
  className?: string;
}

export function SyncButton({
  deck,
  canSync,
  onSync,
  syncType,
  color,
  className,
}: SyncButtonProps) {
  const [justSynced, setJustSynced] = useState(false);

  // Reset the "just synced" indicator after animation
  useEffect(() => {
    if (syncType) {
      setJustSynced(true);
      const timer = setTimeout(() => setJustSynced(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncType]);

  const getSyncIcon = () => {
    if (syncType === 'half-time') return '½×';
    if (syncType === 'double-time') return '2×';
    return '⚡';
  };

  const getSyncLabel = () => {
    if (syncType === 'half-time') return 'Half-Time';
    if (syncType === 'double-time') return 'Double-Time';
    return 'Sync';
  };

  return (
    <button
      className={`${styles.button} ${className || ''} ${
        justSynced ? styles.synced : ''
      } ${syncType ? styles[syncType] : ''}`}
      onClick={onSync}
      disabled={!canSync}
      style={{
        '--button-color': color,
      } as React.CSSProperties}
      aria-label={`Sync Deck ${deck}`}
      title={`Sync Deck ${deck} BPM to opposite deck`}
    >
      <div className={styles.icon}>{getSyncIcon()}</div>
      <span className={styles.label}>{getSyncLabel()}</span>
    </button>
  );
}
