import { useState } from 'react';
import { FirstLesson } from './components/VirtualDJDeck/FirstLesson';
import { TutorialLesson } from './components/VirtualDJDeck/TutorialLesson';
import { KidsModeDemo } from './components/Demo/KidsModeDemo';

type DemoMode = 'slammer' | 'simple-lesson' | 'pro-lesson';

function App() {
  const [demoMode, setDemoMode] = useState<DemoMode>('slammer');

  return (
    <div style={{ position: 'relative' }}>
      {/* Mode Switcher */}
      <div style={styles.modeSwitcher}>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'slammer' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('slammer')}
        >
          🎧 Slammer Mode
        </button>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'simple-lesson' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('simple-lesson')}
        >
          📚 Simple Lesson
        </button>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'pro-lesson' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('pro-lesson')}
        >
          🎓 Pro Lesson
        </button>
      </div>

      {/* Content */}
      {demoMode === 'slammer' ? (
        <KidsModeDemo />
      ) : demoMode === 'simple-lesson' ? (
        <FirstLesson />
      ) : (
        <TutorialLesson />
      )}
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
