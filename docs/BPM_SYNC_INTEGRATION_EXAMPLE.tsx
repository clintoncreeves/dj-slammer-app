/**
 * BPM Sync Integration Example
 *
 * This example demonstrates how to integrate the new BPM sync functionality
 * with sync buttons in the VirtualDJDeck component.
 */

import { useRef, useState } from 'react';
import { VirtualDJDeck, VirtualDJDeckHandle } from '../src/components/VirtualDJDeck';
import { SyncButton } from '../src/components/VirtualDJDeck/SyncButton';
import { BPMSyncResult } from '../src/utils/bpmSync';

export function DJDeckWithSync() {
  const deckRef = useRef<VirtualDJDeckHandle>(null);
  const [syncResultA, setSyncResultA] = useState<BPMSyncResult | null>(null);
  const [syncResultB, setSyncResultB] = useState<BPMSyncResult | null>(null);

  // Configuration for the DJ decks
  const config = {
    deckA: {
      trackUrl: '/audio/track1.mp3',
      initialBPM: 128,
      cuePoint: 0,
    },
    deckB: {
      trackUrl: '/audio/track2.mp3',
      initialBPM: 140,
      cuePoint: 0,
    },
  };

  // Handle sync Deck A to Deck B (B is master)
  const handleSyncA = () => {
    if (!deckRef.current) return;
    
    const result = deckRef.current.syncBPM('A', 'B');
    setSyncResultA(result);
    
    if (result) {
      console.log(`Deck A synced: ${result.syncType} - ${result.targetBPM} BPM`);
    }
  };

  // Handle sync Deck B to Deck A (A is master)
  const handleSyncB = () => {
    if (!deckRef.current) return;
    
    const result = deckRef.current.syncBPM('B', 'A');
    setSyncResultB(result);
    
    if (result) {
      console.log(`Deck B synced: ${result.syncType} - ${result.targetBPM} BPM`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <VirtualDJDeck ref={deckRef} config={config} />
      
      {/* Sync Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '40px',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Deck A</h3>
          <SyncButton
            deck="A"
            canSync={true}
            onSync={handleSyncA}
            syncType={syncResultA?.syncType}
            color="#FF6B9D"
          />
          {syncResultA && (
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'center' }}>
              <div>{syncResultA.syncType} sync</div>
              <div>{syncResultA.targetBPM.toFixed(1)} BPM</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>Deck B</h3>
          <SyncButton
            deck="B"
            canSync={true}
            onSync={handleSyncB}
            syncType={syncResultB?.syncType}
            color="#9C27B0"
          />
          {syncResultB && (
            <div style={{ color: '#fff', fontSize: '12px', textAlign: 'center' }}>
              <div>{syncResultB.syncType} sync</div>
              <div>{syncResultB.targetBPM.toFixed(1)} BPM</div>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div style={{
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '10px',
        color: '#fff'
      }}>
        <h4>BPM Sync Information</h4>
        <ul>
          <li>Click "Sync A" to match Deck A to Deck B's tempo</li>
          <li>Click "Sync B" to match Deck B to Deck A's tempo</li>
          <li>⚡ Direct sync: BPMs within ±10</li>
          <li>½× Half-time: One track at half speed</li>
          <li>2× Double-time: One track at double speed</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Alternative: Integration directly in VirtualDJDeck_Professional
 * 
 * To add sync buttons directly to the VirtualDJDeck_Professional component:
 */

/*
// In VirtualDJDeck_Professional.tsx, after imports:
import { SyncButton } from './SyncButton';
import { BPMSyncResult } from '../../utils/bpmSync';

// Add state for sync results:
const [syncResultA, setSyncResultA] = useState<BPMSyncResult | null>(null);
const [syncResultB, setSyncResultB] = useState<BPMSyncResult | null>(null);

// Add sync handlers:
const handleSyncA = () => {
  const result = syncBPM('A', 'B');
  setSyncResultA(result);
};

const handleSyncB = () => {
  const result = syncBPM('B', 'A');
  setSyncResultB(result);
};

// In the JSX, add sync buttons near the DeckControls:
<div className={styles.deckPanel}>
  <DeckControls
    deck="A"
    isPlaying={deckAState.isPlaying}
    isLoaded={deckAState.isLoaded}
    color={DECK_A_COLOR}
    onPlay={() => playDeck('A')}
    onPause={() => pauseDeck('A')}
    onCue={() => cueDeck('A')}
  />
  
  <SyncButton
    deck="A"
    canSync={deckAState.isLoaded && deckBState.isLoaded}
    onSync={handleSyncA}
    syncType={syncResultA?.syncType}
    color={DECK_A_COLOR}
  />
</div>
*/

export default DJDeckWithSync;
