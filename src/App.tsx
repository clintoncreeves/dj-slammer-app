import { TutorialLesson } from './components/VirtualDJDeck/TutorialLesson';
import { AudioErrorBoundary } from './components/ErrorBoundary';

/**
 * DJ Slammer - Main Application
 *
 * A professional DJ learning tool that teaches real mixing skills.
 * Single, cohesive experience - no mode switching.
 */
function App() {
  return (
    <div style={{ position: 'relative' }}>
      {/* Skip to content link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Main Content */}
      <main id="main-content">
        <AudioErrorBoundary>
          <TutorialLesson />
        </AudioErrorBoundary>
      </main>
    </div>
  );
}

export default App;
