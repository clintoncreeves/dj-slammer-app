import { VirtualDJDeck, VirtualDJDeckConfig, TutorialConfig } from './components/VirtualDJDeck';
import { yourFirstMixLesson } from './components/VirtualDJDeck/lessons/yourFirstMix';
import './App.css';

function App() {
  const config: VirtualDJDeckConfig = {
    deckA: {
      trackUrl: '/audio/alone-296348.mp3',
      initialBPM: 120,
      cuePoint: 0,
      waveformColor: '#00F0FF',
    },
    deckB: {
      trackUrl: '/audio/baby-mandala-nepalese-drill-music-169039.mp3',
      initialBPM: 120,
      cuePoint: 0,
      waveformColor: '#FF006E',
    },
    onStateChange: (state) => {
      console.log('[App] Deck state changed:', state);
    },
    onError: (error) => {
      console.error('[App] DJ Deck error:', error);
    },
  };

  const tutorialConfig: TutorialConfig = {
    lesson: yourFirstMixLesson,
    enableCelebrations: true,
    hintDelaySeconds: 15,
    autoAdvance: false,
  };

  return (
    <div className="App">
      <h1>DJ Slammer - Virtual DJ Deck MVP</h1>
      <VirtualDJDeck config={config} tutorialConfig={tutorialConfig} />
    </div>
  );
}

export default App;
