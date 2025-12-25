/**
 * PlaylistSidebar Component
 *
 * A collapsible sidebar for managing playlists and folders.
 * Features:
 * - Playlist/folder tree navigation
 * - Favorite banks for quick access
 * - Create, rename, delete playlists
 * - Drag and drop organization (future)
 */

import { useState } from 'react';
import { useLibrary, Playlist, Folder } from './LibraryContext';
import styles from './PlaylistSidebar.module.css';

interface PlaylistSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function PlaylistSidebar({
  className,
  isCollapsed = false,
  onToggleCollapse,
}: PlaylistSidebarProps) {
  const library = useLibrary();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Get playlists not in any folder
  const standalonePlaylistIds = new Set(
    library.folders.flatMap(f => f.playlistIds)
  );
  const standalonePlaylists = library.playlists.filter(
    p => !standalonePlaylistIds.has(p.id)
  );

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      library.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  const handleStartEdit = (playlist: Playlist) => {
    setEditingId(playlist.id);
    setEditName(playlist.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      library.renamePlaylist(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this playlist?')) {
      library.deletePlaylist(id);
    }
  };

  const renderPlaylistItem = (playlist: Playlist) => {
    const isActive = library.activePlaylistId === playlist.id;
    const isEditing = editingId === playlist.id;

    return (
      <div
        key={playlist.id}
        className={`${styles.playlistItem} ${isActive ? styles.active : ''}`}
        onClick={() => library.setActivePlaylist(playlist.id)}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') {
                setEditingId(null);
                setEditName('');
              }
            }}
            className={styles.editInput}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span
              className={styles.playlistIcon}
              style={playlist.color ? { color: playlist.color } : undefined}
            >
              📋
            </span>
            <span className={styles.playlistName}>{playlist.name}</span>
            <span className={styles.trackCount}>{playlist.trackIds.length}</span>
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(playlist);
                }}
                title="Rename"
              >
                ✏️
              </button>
              <button
                className={styles.actionBtn}
                onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFolder = (folder: Folder) => {
    const folderPlaylists = library.playlists.filter(p =>
      folder.playlistIds.includes(p.id)
    );

    return (
      <div key={folder.id} className={styles.folder}>
        <button
          className={styles.folderHeader}
          onClick={() => library.toggleFolderExpanded(folder.id)}
        >
          <span className={styles.folderIcon}>
            {folder.isExpanded ? '📂' : '📁'}
          </span>
          <span className={styles.folderName}>{folder.name}</span>
          <span className={styles.folderCount}>{folderPlaylists.length}</span>
        </button>
        {folder.isExpanded && (
          <div className={styles.folderContent}>
            {folderPlaylists.map(renderPlaylistItem)}
          </div>
        )}
      </div>
    );
  };

  if (isCollapsed) {
    return (
      <div className={`${styles.container} ${styles.collapsed} ${className || ''}`}>
        <button className={styles.expandBtn} onClick={onToggleCollapse} title="Expand sidebar">
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Header with New Playlist button */}
      <div className={styles.header}>
        <span className={styles.title}>Playlists</span>
        <div className={styles.headerActions}>
          {isCreating ? (
            <div className={styles.createFormInline}>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Name..."
                className={styles.createInputInline}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreatePlaylist();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewPlaylistName('');
                  }
                }}
              />
              <button
                className={styles.createConfirmInline}
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                title="Create"
              >
                ✓
              </button>
              <button
                className={styles.createCancelInline}
                onClick={() => {
                  setIsCreating(false);
                  setNewPlaylistName('');
                }}
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className={styles.newPlaylistBtn}
              onClick={() => setIsCreating(true)}
              title="New Playlist"
            >
              +
            </button>
          )}
          {onToggleCollapse && (
            <button className={styles.collapseBtn} onClick={onToggleCollapse} title="Collapse">
              ◀
            </button>
          )}
        </div>
      </div>

      {/* Favorite Banks */}
      <div className={styles.favoriteBanks}>
        <div className={styles.banksLabel}>Quick Access</div>
        <div className={styles.banksGrid}>
          {library.favoriteBanks.map(bank => {
            const playlist = library.playlists.find(p => p.id === bank.playlistId);
            return (
              <button
                key={bank.slot}
                className={`${styles.bankSlot} ${playlist ? styles.filled : ''}`}
                onClick={() => library.activateFavoriteBank(bank.slot)}
                title={playlist ? playlist.name : `Bank ${bank.slot} (empty)`}
              >
                {bank.slot}
              </button>
            );
          })}
        </div>
      </div>

      {/* Collection link */}
      <button
        className={`${styles.collectionBtn} ${library.activeView === 'collection' ? styles.active : ''}`}
        onClick={() => {
          library.setActiveView('collection');
          library.setActivePlaylist(null);
        }}
      >
        <span className={styles.collectionIcon}>🎵</span>
        <span>All Tracks</span>
      </button>

      {/* Folders */}
      <div className={styles.section}>
        {library.folders.map(renderFolder)}
      </div>

      {/* Standalone Playlists */}
      <div className={styles.section}>
        {standalonePlaylists.map(renderPlaylistItem)}
      </div>
    </div>
  );
}

export default PlaylistSidebar;
