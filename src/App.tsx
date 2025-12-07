import { useState } from 'react';
import { FirstLesson } from './components/VirtualDJDeck/FirstLesson';
import { KidsModeDemo } from './components/Demo/KidsModeDemo';

function App() {
  const [mode, setMode] = useState<'slammer' | 'lesson'>('slammer');

  return (
    <div style={{ position: 'relative' }}>
      {/* Mode Switcher */}
      <div style={styles.modeSwitcher}>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: mode === 'slammer' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setMode('slammer')}
        >
          🎧 Slammer Mode
        </button>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: mode === 'lesson' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setMode('lesson')}
        >
          📚 First Lesson
        </button>
      </div>

      {/* Content */}
      {mode === 'slammer' ? <KidsModeDemo /> : <FirstLesson />}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  modeSwitcher: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '8px',
    zIndex: 1000,
  },
  modeButton: {
    padding: '12px 20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default App;
