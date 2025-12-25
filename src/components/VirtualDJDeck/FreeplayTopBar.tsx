/**
 * FreeplayTopBar Component
 *
 * Top navigation bar for freeplay mode that contains:
 * - Mode indicator (showing "Free Play")
 * - DJ Mentor help button (always visible)
 * - MIDI settings button
 * - Playlist sidebar toggle
 */

import styles from './FreeplayTopBar.module.css';

interface FreeplayTopBarProps {
  /** Whether the mentor is enabled */
  mentorEnabled: boolean;
  /** Callback when help is requested */
  onRequestHelp: () => void;
  /** Whether sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Toggle sidebar visibility */
  onToggleSidebar: () => void;
  /** Callback when MIDI settings is requested */
  onOpenMIDISettings: () => void;
  /** Whether MIDI is connected */
  midiConnected?: boolean;
  /** Optional class name */
  className?: string;
}

export function FreeplayTopBar({
  mentorEnabled,
  onRequestHelp,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMIDISettings,
  midiConnected = false,
  className,
}: FreeplayTopBarProps) {
  return (
    <div className={`${styles.topBar} ${className || ''}`}>
      {/* Left side - Sidebar toggle and mode */}
      <div className={styles.leftSection}>
        <button
          className={styles.sidebarToggle}
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Show playlists' : 'Hide playlists'}
          title={sidebarCollapsed ? 'Show Playlists' : 'Hide Playlists'}
        >
          <span className={styles.sidebarIcon}>
            {sidebarCollapsed ? '📋' : '◀'}
          </span>
          <span className={styles.sidebarLabel}>
            {sidebarCollapsed ? 'Playlists' : 'Hide'}
          </span>
        </button>

        <div className={styles.modeIndicator}>
          <span className={styles.modeIcon}>🎧</span>
          <span className={styles.modeLabel}>Free Play</span>
        </div>
      </div>

      {/* Right side - MIDI and Mentor help */}
      <div className={styles.rightSection}>
        <button
          className={`${styles.midiButton} ${midiConnected ? styles.midiConnected : ''}`}
          onClick={onOpenMIDISettings}
          aria-label="MIDI Controller Settings"
          title="MIDI Controller Settings"
        >
          <span className={styles.midiIcon}>🎹</span>
          <span className={styles.midiLabel}>MIDI</span>
          {midiConnected && <span className={styles.midiStatus} />}
        </button>

        <button
          className={`${styles.mentorButton} ${mentorEnabled ? styles.mentorActive : ''}`}
          onClick={onRequestHelp}
          aria-label="Get DJ tips and help"
          title="DJ Mentor - Get Tips"
        >
          <span className={styles.mentorIcon}>🎓</span>
          <span className={styles.mentorLabel}>DJ Tips</span>
        </button>
      </div>
    </div>
  );
}

export default FreeplayTopBar;
