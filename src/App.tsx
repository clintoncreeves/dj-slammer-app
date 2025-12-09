import { useState, lazy, Suspense } from 'react';

// Lazy load components for better initial bundle size
const KidsModeDemo = lazy(() => import('./components/Demo/KidsModeDemo').then(m => ({ default: m.KidsModeDemo })));
const FirstLesson = lazy(() => import('./components/VirtualDJDeck/FirstLesson').then(m => ({ default: m.FirstLesson })));
const TutorialLesson = lazy(() => import('./components/VirtualDJDeck/TutorialLesson').then(m => ({ default: m.TutorialLesson })));

type DemoMode = 'slammer' | 'simple-lesson' | 'pro-lesson';

// Loading component
const LoadingSpinner = () => (
  <div style={styles.loadingContainer} role="status" aria-live="polite" aria-label="Loading DJ application">
    <div style={styles.spinner} aria-hidden="true">🎧</div>
    <p style={styles.loadingText}>Loading DJ Deck...</p>
  </div>
);

function App() {
  const [demoMode, setDemoMode] = useState<DemoMode>('slammer');

  return (
    <div style={{ position: 'relative' }}>
      {/* Skip to main content link for keyboard accessibility */}
      <a href="#main-content" style={styles.skipLink}>
        Skip to main content
      </a>

      {/* Mode Switcher */}
      <div style={styles.modeSwitcher} role="navigation" aria-label="Application mode selector">
        <button
          style={{
            ...styles.modeButton,
            backgroundColor: demoMode === 'slammer' ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
          }}
          onClick={() => setDemoMode('slammer')}
          aria-label="Switch to Slammer Mode - Kid-friendly DJ interface"
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
          aria-label="Switch to Simple Lesson - Beginner tutorial"
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
          aria-label="Switch to Pro Lesson - Advanced tutorial"
          aria-pressed={demoMode === 'pro-lesson'}
        >
          🎓 Pro Lesson
        </button>
      </div>

      {/* Content with Suspense for lazy loading */}
      <main id="main-content">
        <Suspense fallback={<LoadingSpinner />}>
          {demoMode === 'slammer' ? (
            <KidsModeDemo />
          ) : demoMode === 'simple-lesson' ? (
            <FirstLesson />
          ) : (
            <TutorialLesson />
          )}
        </Suspense>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  skipLink: {
    position: 'absolute',
    top: '-40px',
    left: '0',
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '0 0 4px 0',
    zIndex: 2000,
    fontWeight: 'bold',
    transition: 'top 0.2s',
  },
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  spinner: {
    fontSize: '48px',
    animation: 'spin 2s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '18px',
    fontFamily: 'Arial, sans-serif',
  },
};

export default App;
