import { useState } from 'react';
import { FirstLesson } from './components/VirtualDJDeck/FirstLesson';
import { TutorialLesson } from './components/VirtualDJDeck/TutorialLesson';
import { KidsModeDemo } from './components/Demo/KidsModeDemo';
import { AudioErrorBoundary } from './components/ErrorBoundary';

type DemoMode = 'slammer' | 'simple-lesson' | 'pro-lesson';

function App() {
  const [demoMode, setDemoMode] = useState<DemoMode>('slammer');

  return (
    <div style={{ position: 'relative' }}>
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Mode Switcher */}
      <div style={styles.modeSwitcher} role="navigation" aria-label="Mode selection">
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'slammer' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('slammer')}
          aria-label="Switch to Slammer Mode"
          aria-pressed={demoMode === 'slammer'}
        >
          🎧 Slammer Mode
        </button>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'simple-lesson' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('simple-lesson')}
          aria-label="Switch to Simple Lesson mode"
          aria-pressed={demoMode === 'simple-lesson'}
        >
          📚 Simple Lesson
        </button>
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'pro-lesson' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('pro-lesson')}
          aria-label="Switch to Pro Lesson mode"
          aria-pressed={demoMode === 'pro-lesson'}
        >
          🎓 Pro Lesson
        </button>
      </div>

      {/* Content wrapped in Error Boundary */}
      <main id="main-content">
        <AudioErrorBoundary>
          {demoMode === 'slammer' ? (
            <KidsModeDemo />
          ) : demoMode === 'simple-lesson' ? (
            <FirstLesson />
          ) : (
            <TutorialLesson />
          )}
        </AudioErrorBoundary>
      </main>
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
