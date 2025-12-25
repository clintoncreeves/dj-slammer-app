import { TutorialLesson } from './components/VirtualDJDeck/TutorialLesson';
import { AudioErrorBoundary } from './components/ErrorBoundary';
import { LibraryAnalyzer } from './components/VirtualDJDeck/library/LibraryAnalyzer';

/**
 * DJ Slammer - Main Application
 *
 * A professional DJ learning tool that teaches real mixing skills.
 * Single, cohesive experience - no mode switching.
 */
function App() {
  // Check for analyzer mode via query param: ?analyze=true
  const isAnalyzerMode = new URLSearchParams(window.location.search).get('analyze') === 'true';

  // Show analyzer tool for library metadata generation
  if (isAnalyzerMode) {
    return <LibraryAnalyzer />;
  }

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
