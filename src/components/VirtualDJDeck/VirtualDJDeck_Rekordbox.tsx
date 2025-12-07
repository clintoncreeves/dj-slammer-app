import React, { useState, useEffect, useRef } from 'react';
import { VirtualDJDeckConfig, VirtualDJDeckState, DeckState } from './types';
import { TutorialConfig } from './tutorialTypes';
import { TutorialInstructionPanel } from './TutorialInstructionPanel';
import { Crossfader_Rekordbox } from './Crossfader_Rekordbox';
import { useTutorial } from './useTutorial';

export interface VirtualDJDeck_RekordboxProps {
  config: VirtualDJDeckConfig;
  tutorialConfig?: TutorialConfig | null;
}

// Create initial deck state
const createInitialDeckState = (bpm: number): DeckState => ({
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  originalBPM: bpm,
  currentBPM: bpm,
  playbackRate: 1.0,
  volume: 0.8,
  isLoaded: false,
  cuePoint: 0,
  waveformData: [],
});

export const VirtualDJDeck_Rekordbox: React.FC<VirtualDJDeck_RekordboxProps> = ({ config, tutorialConfig }) => {
  const [comboCount, setComboCount] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);

  // Virtual DJ Deck state for tutorial validation
  const [deckState, setDeckState] = useState<VirtualDJDeckState>({
    deckA: createInitialDeckState(config.deckA.initialBPM),
    deckB: createInitialDeckState(config.deckB.initialBPM),
    crossfaderPosition: 0,
  });

  const tutorialHook = tutorialConfig ? useTutorial(tutorialConfig, deckState) : null;

  useEffect(() => {
    if (tutorialHook?.progress && tutorialConfig) {
      const totalSteps = tutorialConfig.lesson.steps.length;
      const newProgress = Math.round(((tutorialHook.progress.currentStepIndex + 1) / totalSteps) * 100);
      setProgressPercent(newProgress);
    }
  }, [tutorialHook?.progress, tutorialConfig]);

  // Highlight tutorial target elements
  useEffect(() => {
    if (!tutorialHook?.currentStep) return;

    const step = tutorialHook.currentStep;
    const target = step.highlightTarget;

    let elementId: string | null = null;

    // Map highlight target to element ID
    if (target.type === 'button' && target.deck && target.control) {
      elementId = `deck${target.deck}${target.control.charAt(0).toUpperCase()}${target.control.slice(1)}Button`;
    } else if (target.type === 'crossfader') {
      elementId = 'crossfader';
    } else if (target.type === 'deck' && target.deck) {
      // Highlight entire deck section
      const deckSections = document.querySelectorAll('.dj-deck');
      const deckElement = target.deck === 'A' ? deckSections[0] : deckSections[1];
      if (deckElement) {
        deckElement.classList.add('tutorial-highlight');
        return () => deckElement.classList.remove('tutorial-highlight');
      }
    }

    if (!elementId) return;

    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('tutorial-highlight');
      return () => element.classList.remove('tutorial-highlight');
    }
  }, [tutorialHook?.currentStep]);

  const incrementCombo = () => {
    setComboCount(prev => prev + 1);

    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }

    comboTimeoutRef.current = window.setTimeout(() => {
      setComboCount(0);
    }, 3000);

    if (comboCount + 1 === 5 && !achievements.includes('combo-5')) {
      showAchievement('🔥', 'Combo Master!', 'You hit a 5x combo!');
      setAchievements(prev => [...prev, 'combo-5']);
    }
  };

  const showAchievement = (icon: string, title: string, description: string) => {
    const popup = document.getElementById('achievementPopup');
    if (popup) {
      const iconEl = popup.querySelector('.achievement-icon');
      const titleEl = popup.querySelector('.achievement-title');
      const descEl = popup.querySelector('.achievement-description');

      if (iconEl) iconEl.textContent = icon;
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = description;

      popup.style.display = 'block';
      setTimeout(() => {
        popup.style.display = 'none';
      }, 4000);
    }
  };

  const showFeedback = (type: string) => {
    const emojis: Record<string, string> = {
      good: '👍',
      perfect: '⭐',
      practice: '💪'
    };

    const feedback = document.createElement('div');
    feedback.className = `feedback-indicator feedback-${type}`;
    feedback.textContent = emojis[type] || emojis.good;
    document.body.appendChild(feedback);

    setTimeout(() => feedback.remove(), 800);
  };

  const handleDeckButton = (deck: 'A' | 'B', action: string) => {
    console.log(`[Rekordbox] Deck ${deck} - ${action}`);

    // Update deck state
    setDeckState(prevState => {
      const newState = { ...prevState };
      const deckKey = `deck${deck}` as 'deckA' | 'deckB';

      if (action === 'play') {
        newState[deckKey] = { ...newState[deckKey], isPlaying: true, isPaused: false };
      } else if (action === 'pause') {
        newState[deckKey] = { ...newState[deckKey], isPlaying: false, isPaused: true };
      }

      // Validate tutorial step
      if (tutorialHook) {
        tutorialHook.validateStep(newState);
      }

      return newState;
    });

    showFeedback('good');
    incrementCombo();
  };

  const handleTrackClick = (trackIndex: number) => {
    setSelectedTrack(trackIndex);

    if (trackIndex === 0 && !achievements.includes('first-track')) {
      showAchievement('🎵', 'First Track!', 'You loaded your first track!');
      setAchievements(prev => [...prev, 'first-track']);
    }

    // Validate tutorial step
    if (tutorialHook) {
      tutorialHook.validateStep(deckState);
    }
  };

  const handleCrossfaderChange = (value: number) => {
    console.log(`[Rekordbox] Crossfader moved to: ${value}`);

    setDeckState(prevState => {
      const newState = { ...prevState, crossfaderPosition: value };

      // Validate tutorial step
      if (tutorialHook) {
        tutorialHook.validateStep(newState);
      }

      return newState;
    });

    showFeedback('good');
    incrementCombo();

    // Achievement for first crossfader use
    if (Math.abs(value) > 0.1 && !achievements.includes('first-crossfade')) {
      showAchievement('🎚️', 'Crossfader Pro!', 'You moved the crossfader!');
      setAchievements(prev => [...prev, 'first-crossfade']);
    }
  };

  const generateWaveformBars = (count: number = 40) => {
    return Array.from({ length: count }, (_, i) => {
      const height = 30 + Math.random() * 70;
      return (
        <div
          key={i}
          className="waveform-bar"
          style={{ '--bar-height': `${height}%` } as React.CSSProperties}
        />
      );
    });
  };

  return (
    <div className="dj-app">
      {/* Tutorial Instruction Panel */}
      {tutorialConfig && tutorialHook && tutorialHook.currentStep && (
        <TutorialInstructionPanel
          lesson={tutorialConfig.lesson}
          progress={tutorialHook.progress}
          currentStep={tutorialHook.currentStep}
          showCelebration={tutorialHook.showCelebration}
        />
      )}

      {/* Lesson Badge */}
      {tutorialConfig && (
        <div className="lesson-badge">
          <div className="lesson-number">01</div>
          <div className="lesson-title">{tutorialConfig.lesson.title}</div>
        </div>
      )}

      {/* Combo Counter */}
      <div
        className="combo-counter"
        style={{ display: comboCount > 0 ? 'flex' : 'none' }}
        id="comboCounter"
      >
        <div className="combo-number">{comboCount}</div>
        <div className="combo-label">Combo!</div>
      </div>

      {/* Achievement Popup */}
      <div className="achievement-popup" style={{ display: 'none' }} id="achievementPopup">
        <div className="achievement-icon">🏆</div>
        <div className="achievement-title">Achievement!</div>
        <div className="achievement-description">You did something awesome!</div>
      </div>

      {/* Top Header */}
      <header className="dj-header">
        <div className="dj-logo">
          <span className="dj-logo-emoji">🎧</span>
          DJ SLAMMER
        </div>
        <div className="dj-header-controls">
          <div className="dj-mode-badge">LEARNING MODE</div>
          <div className="dj-time">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
        </div>
      </header>

      {/* Waveform Display */}
      <section className="dj-waveform-container">
        <div className="dj-waveform" id="waveformDisplay">
          <div className="waveform-grid"></div>
          <div className="waveform-beats"></div>

          <div className="waveform-time-markers">
            <span className="time-marker">0:00</span>
            <span className="time-marker">1:00</span>
            <span className="time-marker">2:00</span>
            <span className="time-marker">3:00</span>
            <span className="time-marker">4:07</span>
          </div>

          {/* Cue points */}
          <div className="waveform-cue cue-red" style={{ left: '15%' }} data-number="1"></div>
          <div className="waveform-cue cue-yellow" style={{ left: '35%' }} data-number="2"></div>
          <div className="waveform-cue cue-green" style={{ left: '65%' }} data-number="3"></div>

          {/* Animated waveform bars */}
          <div className="waveform-bars">
            {generateWaveformBars(40)}
          </div>

          <div className="waveform-playhead"></div>
        </div>
      </section>

      {/* Deck Section */}
      <section className="dj-decks">
        {/* Deck A */}
        <div className="dj-deck deck-left">
          <div className="deck-track-info">
            <div className="deck-artwork">🎵</div>
            <div className="deck-track-details">
              <div className="deck-track-title">Can't Sleep</div>
              <div className="deck-track-artist">Juliet Fox</div>
            </div>
            <div className="deck-track-time">04:07</div>
          </div>

          <div className="deck-bpm-display" id="deckABPM">
            <div className="bpm-circle" style={{ '--bpm-progress': '270deg' } as React.CSSProperties}>
              <div className="bpm-ring">
                <div className="bpm-inner">
                  <div className="bpm-value">{config.deckA.initialBPM}.0</div>
                  <div className="bpm-label">BPM</div>
                </div>
              </div>
            </div>
          </div>

          <div className="deck-controls">
            <button
              className={`deck-button ${deckState.deckA.isPlaying ? 'active' : ''}`}
              onClick={() => handleDeckButton('A', 'play')}
              id="deckAPlayButton"
            >
              <span className="deck-button-emoji">▶️</span>
              Play
            </button>
            <button
              className={`deck-button ${deckState.deckA.isPaused ? 'active' : ''}`}
              onClick={() => handleDeckButton('A', 'pause')}
              id="deckAPauseButton"
            >
              <span className="deck-button-emoji">⏸️</span>
              Pause
            </button>
            <button className="deck-button" id="deckALoopButton">
              <span className="deck-button-emoji">🔁</span>
              Loop
            </button>
            <button className="deck-button" id="deckACueButton">
              <span className="deck-button-emoji">⚡</span>
              Hot Cue
            </button>
          </div>
        </div>

        {/* Deck B */}
        <div className="dj-deck deck-right">
          <div className="deck-track-info">
            <div className="deck-artwork" style={{ background: 'linear-gradient(135deg, #00D4FF, #9370DB)' }}>🎶</div>
            <div className="deck-track-details">
              <div className="deck-track-title">Jupiter Rising</div>
              <div className="deck-track-artist">Kysus & Young feat Tino</div>
            </div>
            <div className="deck-track-time">00:15</div>
          </div>

          <div className="deck-bpm-display" id="deckBBPM">
            <div className="bpm-circle" style={{ '--bpm-progress': '280deg' } as React.CSSProperties}>
              <div className="bpm-ring">
                <div className="bpm-inner">
                  <div className="bpm-value">{config.deckB.initialBPM}.0</div>
                  <div className="bpm-label">BPM</div>
                </div>
              </div>
            </div>
          </div>

          <div className="deck-controls">
            <button
              className={`deck-button ${deckState.deckB.isPlaying ? 'active' : ''}`}
              onClick={() => handleDeckButton('B', 'play')}
              id="deckBPlayButton"
            >
              <span className="deck-button-emoji">▶️</span>
              Play
            </button>
            <button
              className={`deck-button ${deckState.deckB.isPaused ? 'active' : ''}`}
              onClick={() => handleDeckButton('B', 'pause')}
              id="deckBPauseButton"
            >
              <span className="deck-button-emoji">⏸️</span>
              Pause
            </button>
            <button className="deck-button" id="deckBLoopButton">
              <span className="deck-button-emoji">🔁</span>
              Loop
            </button>
            <button className="deck-button" id="deckBCueButton">
              <span className="deck-button-emoji">⚡</span>
              Hot Cue
            </button>
          </div>
        </div>
      </section>

      {/* Crossfader - Professional Mixer Control */}
      <Crossfader_Rekordbox
        value={deckState.crossfaderPosition}
        onChange={handleCrossfaderChange}
        id="crossfader"
      />

      {/* Main Content Area */}
      <div className="dj-main">
        {/* Sidebar */}
        <aside className="dj-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">🎵 Collection</h3>
            <ul className="sidebar-list">
              <li className="sidebar-item active">
                <span className="sidebar-icon">📀</span>
                Main Floor
              </li>
              <li className="sidebar-item">
                <span className="sidebar-icon">🔥</span>
                Hot List
              </li>
              <li className="sidebar-item">
                <span className="sidebar-icon">🎤</span>
                Hip-Hop
              </li>
              <li className="sidebar-item">
                <span className="sidebar-icon">🎹</span>
                Jazz
              </li>
            </ul>
          </div>
        </aside>

        {/* Track Browser */}
        <main className="dj-track-browser">
          <div className="browser-header">
            <h2 className="browser-title">Main Floor</h2>
            <div className="browser-count">11 Tracks</div>
          </div>

          {/* Progress Tracker */}
          {tutorialConfig && (
            <div className="progress-tracker">
              <div className="progress-header">
                <div className="progress-title">🎯 Lesson Progress</div>
                <div className="progress-percentage">{progressPercent}%</div>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="progress-stars">
                <span className={`star ${progressPercent >= 33 ? 'earned' : ''}`}>⭐</span>
                <span className={`star ${progressPercent >= 66 ? 'earned' : ''}`}>⭐</span>
                <span className={`star ${progressPercent >= 100 ? 'earned' : ''}`}>⭐</span>
              </div>
            </div>
          )}

          {/* Track Table */}
          <table className="track-table" id="trackBrowser">
            <thead>
              <tr>
                <th>#</th>
                <th>BPM</th>
                <th>Preview</th>
                <th>Artwork</th>
                <th>Track Title</th>
                <th>Artist</th>
                <th>Difficulty</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[
                { num: 1, bpm: 124, title: 'Epiphany Vip', artist: 'The Golden Boy', difficulty: 'easy', time: '05:46', emoji: '🎧', color: '' },
                { num: 2, bpm: 124, title: 'Around Summer', artist: 'Yousaf & Bonian', difficulty: 'easy', time: '07:30', emoji: '🎶', color: 'linear-gradient(135deg, #FF69B4, #9370DB)' },
                { num: 3, bpm: 123, title: 'Believe (ANNA remix)', artist: 'Yousaf & Bonian', difficulty: 'medium', time: '06:33', emoji: '🎸', color: 'linear-gradient(135deg, #FFD700, #FF8C42)' },
                { num: 4, bpm: 123, title: 'Believe (DENNEY REMIX)', artist: 'Yousaf & Bonian', difficulty: 'medium', time: '06:23', emoji: '🎤', color: 'linear-gradient(135deg, #FF4444, #FF1493)' },
                { num: 5, bpm: 120, title: 'Believe (Into Mars Remix)', artist: 'Yousaf & Bonian', difficulty: 'hard', time: '07:32', emoji: '🎹', color: 'linear-gradient(135deg, #39FF14, #00D4FF)' },
                { num: 6, bpm: 123, title: 'Believe in Love', artist: 'Yousaf feat Roy Davis Jnr', difficulty: 'easy', time: '06:17', emoji: '🎺', color: 'linear-gradient(135deg, #B537F2, #FF006E)' },
                { num: 7, bpm: 123, title: 'Believe', artist: 'Yousaf & Bonian ft The Angel', difficulty: 'easy', time: '06:19', emoji: '🥁', color: 'linear-gradient(135deg, #FF8C42, #FFD700)' },
                { num: 8, bpm: 123, title: 'Big', artist: 'Rene Amesz', difficulty: 'medium', time: '07:28', emoji: '🎼', color: 'linear-gradient(135deg, #FF1493, #B537F2)' },
                { num: 9, bpm: 125, title: 'Break It Down', artist: 'Loco & Jam', difficulty: 'medium', time: '06:10', emoji: '🎷', color: 'linear-gradient(135deg, #00D4FF, #39FF14)' },
                { num: 10, bpm: 127, title: 'Breathe', artist: 'Brett Johnson', difficulty: 'hard', time: '04:51', emoji: '🎸', color: 'linear-gradient(135deg, #FFD700, #FF4444)' },
                { num: 11, bpm: 124, title: 'Can\'t Sleep', artist: 'Juliet Fox', difficulty: 'easy', time: '06:01', emoji: '🎹', color: 'linear-gradient(135deg, #9370DB, #00D4FF)' },
              ].map((track, idx) => (
                <tr
                  key={track.num}
                  className={selectedTrack === idx ? 'playing' : ''}
                  onClick={() => handleTrackClick(idx)}
                >
                  <td className="track-number">{track.num}</td>
                  <td className="track-bpm">{track.bpm}.00</td>
                  <td>{selectedTrack === idx ? '▶️' : '🎵'}</td>
                  <td className="track-artwork-cell">
                    <div
                      className="track-artwork-small"
                      style={track.color ? { background: track.color } : {}}
                    >
                      {track.emoji}
                    </div>
                  </td>
                  <td className="track-title-cell">{track.title}</td>
                  <td className="track-artist-cell">{track.artist}</td>
                  <td>
                    {track.difficulty === 'easy' && <span className="difficulty-badge difficulty-easy">👍 Easy</span>}
                    {track.difficulty === 'medium' && <span className="difficulty-badge difficulty-medium">⚡ Medium</span>}
                    {track.difficulty === 'hard' && <span className="difficulty-badge difficulty-hard">🔥 Hard</span>}
                  </td>
                  <td className="track-time-cell">{track.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
};

export default VirtualDJDeck_Rekordbox;
