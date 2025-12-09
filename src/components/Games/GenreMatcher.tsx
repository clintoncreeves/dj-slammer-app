/**
 * Genre Matcher Game
 *
 * Teaches kids to identify and match music genres
 * Multiple game modes with progressive difficulty
 */

import React, { useState, useEffect } from 'react';
import { TrackMetadata, SimplifiedGenre } from '../VirtualDJDeck/types';
import { getGenreCompatibility, getCompatibilityMessage } from '../../utils/genreMapping';
import { getGenreConfig } from '../../config/genreConfig';

type GameMode = 'identify' | 'match' | 'compatibility';

interface GenreMatcherProps {
  tracks: TrackMetadata[];
  onSuccess?: () => void;
  onClose?: () => void;
  mode?: GameMode;
}

export const GenreMatcher: React.FC<GenreMatcherProps> = ({
  tracks,
  onSuccess,
  onClose,
  mode = 'identify',
}) => {
  const [currentTrack, setCurrentTrack] = useState<TrackMetadata | null>(null);
  const [trackA, setTrackA] = useState<TrackMetadata | null>(null);
  const [trackB, setTrackB] = useState<TrackMetadata | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<SimplifiedGenre | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  // Initialize game based on mode
  useEffect(() => {
    startNewRound();
  }, [mode, tracks]);

  const startNewRound = () => {
    setShowResult(false);
    setSelectedGenre(null);

    if (mode === 'identify') {
      // Pick a random track
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
      setCurrentTrack(randomTrack);
    } else {
      // Pick two random tracks for matching/compatibility modes
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      setTrackA(shuffled[0]);
      setTrackB(shuffled[1]);
    }
  };

  const handleGenreSelect = (genre: SimplifiedGenre) => {
    if (showResult) return;

    setSelectedGenre(genre);
    setAttempts(prev => prev + 1);

    // Check if correct
    let correct = false;
    if (mode === 'identify' && currentTrack) {
      correct = genre === currentTrack.simplifiedGenre;
    } else if (mode === 'match' && trackA && trackB) {
      // In match mode, check if selected genre matches either track
      correct = genre === trackA.simplifiedGenre || genre === trackB.simplifiedGenre;
    } else if (mode === 'compatibility' && trackA && trackB) {
      // In compatibility mode, check if genres are compatible
      const compatibility = getGenreCompatibility(trackA.simplifiedGenre, trackB.simplifiedGenre);
      correct = ['perfect', 'excellent', 'good'].includes(compatibility);
    }

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setScore(prev => prev + 1);
      setTimeout(() => {
        onSuccess?.();
        startNewRound();
      }, 2000);
    }
  };

  const handleTryAgain = () => {
    setShowResult(false);
    setSelectedGenre(null);
  };

  const getGenreOptions = (): SimplifiedGenre[] => {
    // Return unique genres from available tracks
    const uniqueGenres = Array.from(new Set(tracks.map(t => t.simplifiedGenre)));
    return uniqueGenres.slice(0, 6) as SimplifiedGenre[]; // Limit to 6 options max
  };

  const genreOptions = getGenreOptions();

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Genre Matcher Game 🎵</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Score */}
        <div style={styles.scoreBoard}>
          <div style={styles.scoreItem}>
            Score: <strong>{score}</strong>
          </div>
          <div style={styles.scoreItem}>
            Attempts: <strong>{attempts}</strong>
          </div>
          <div style={styles.scoreItem}>
            Accuracy: <strong>{attempts > 0 ? Math.round((score / attempts) * 100) : 0}%</strong>
          </div>
        </div>

        {/* Game Area */}
        {mode === 'identify' && currentTrack && (
          <div style={styles.gameArea}>
            <div style={styles.instruction}>
              🎧 Listen and identify the genre of this track!
            </div>

            {/* Track Display */}
            <div style={styles.trackDisplay}>
              <div style={styles.trackCard}>
                <div style={styles.trackEmoji}>🎵</div>
                <div style={styles.trackTitle}>{currentTrack.title}</div>
                <div style={styles.trackInfo}>
                  {currentTrack.bpm} BPM • {currentTrack.tempoCategory} tempo
                </div>
                {showResult && (
                  <div style={styles.correctGenre}>
                    {currentTrack.genreEmoji} {getGenreConfig(currentTrack.simplifiedGenre).kidFriendlyName}
                  </div>
                )}
              </div>
            </div>

            {/* Genre Options */}
            <div style={styles.genreGrid}>
              {genreOptions.map(genre => {
                const config = getGenreConfig(genre);
                const isSelected = selectedGenre === genre;
                const isCorrectAnswer = showResult && genre === currentTrack.simplifiedGenre;

                return (
                  <button
                    key={genre}
                    style={{
                      ...styles.genreOption,
                      backgroundColor: isSelected
                        ? isCorrect
                          ? 'rgba(76, 175, 80, 0.3)'
                          : 'rgba(244, 67, 54, 0.3)'
                        : isCorrectAnswer
                          ? 'rgba(76, 175, 80, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected || isCorrectAnswer
                        ? `3px solid ${isSelected && isCorrect ? '#4CAF50' : isCorrectAnswer ? '#4CAF50' : '#F44336'}`
                        : '2px solid rgba(255, 255, 255, 0.2)',
                    }}
                    onClick={() => handleGenreSelect(genre)}
                    disabled={showResult}
                  >
                    <div style={styles.genreEmoji}>{config.emoji}</div>
                    <div style={styles.genreName}>{config.kidFriendlyName}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'compatibility' && trackA && trackB && (
          <div style={styles.gameArea}>
            <div style={styles.instruction}>
              🎚️ Do these tracks go well together?
            </div>

            {/* Track Pair Display */}
            <div style={styles.trackPair}>
              <div style={styles.trackCard}>
                <div style={styles.deckLabel}>Track A</div>
                <div style={styles.genreEmoji}>{trackA.genreEmoji}</div>
                <div style={styles.trackTitle}>{trackA.title}</div>
                {showResult && (
                  <div style={styles.genreTag}>
                    {getGenreConfig(trackA.simplifiedGenre).kidFriendlyName}
                  </div>
                )}
              </div>

              <div style={styles.vs}>VS</div>

              <div style={styles.trackCard}>
                <div style={styles.deckLabel}>Track B</div>
                <div style={styles.genreEmoji}>{trackB.genreEmoji}</div>
                <div style={styles.trackTitle}>{trackB.title}</div>
                {showResult && (
                  <div style={styles.genreTag}>
                    {getGenreConfig(trackB.simplifiedGenre).kidFriendlyName}
                  </div>
                )}
              </div>
            </div>

            {/* Compatibility Options */}
            <div style={styles.compatibilityOptions}>
              <button
                style={{
                  ...styles.compatibilityButton,
                  ...styles.yesButton,
                  opacity: showResult && !isCorrect ? 0.5 : 1,
                }}
                onClick={() => {
                  const compatibility = getGenreCompatibility(trackA.simplifiedGenre, trackB.simplifiedGenre);
                  const compatible = ['perfect', 'excellent', 'good'].includes(compatibility);
                  setIsCorrect(compatible);
                  setShowResult(true);
                  setAttempts(prev => prev + 1);
                  if (compatible) {
                    setScore(prev => prev + 1);
                    setTimeout(() => {
                      onSuccess?.();
                      startNewRound();
                    }, 3000);
                  }
                }}
                disabled={showResult}
              >
                <div style={styles.optionEmoji}>✅</div>
                <div style={styles.optionText}>Yes, they match!</div>
              </button>

              <button
                style={{
                  ...styles.compatibilityButton,
                  ...styles.noButton,
                  opacity: showResult && isCorrect ? 0.5 : 1,
                }}
                onClick={() => {
                  const compatibility = getGenreCompatibility(trackA.simplifiedGenre, trackB.simplifiedGenre);
                  const compatible = ['perfect', 'excellent', 'good'].includes(compatibility);
                  setIsCorrect(!compatible);
                  setShowResult(true);
                  setAttempts(prev => prev + 1);
                  if (!compatible) {
                    setScore(prev => prev + 1);
                    setTimeout(() => {
                      onSuccess?.();
                      startNewRound();
                    }, 3000);
                  }
                }}
                disabled={showResult}
              >
                <div style={styles.optionEmoji}>❌</div>
                <div style={styles.optionText}>No, they clash!</div>
              </button>
            </div>

            {/* Result Message */}
            {showResult && trackA && trackB && (
              <div style={styles.resultMessage}>
                <div style={isCorrect ? styles.correctMessage : styles.wrongMessage}>
                  {isCorrect ? '🎉 Correct!' : '❌ Try again!'}
                </div>
                <div style={styles.compatibilityInfo}>
                  {getCompatibilityMessage(getGenreCompatibility(trackA.simplifiedGenre, trackB.simplifiedGenre))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result Feedback */}
        {showResult && !isCorrect && mode === 'identify' && (
          <div style={styles.tryAgainSection}>
            <button style={styles.tryAgainButton} onClick={handleTryAgain}>
              Try Again
            </button>
          </div>
        )}

        {/* Success Toast */}
        {showResult && isCorrect && (
          <div style={styles.successToast}>
            <div style={styles.successEmoji}>🎉</div>
            <div style={styles.successText}>Perfect!</div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: '20px',
    padding: '30px',
    maxWidth: '900px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '28px',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    color: '#fff',
    fontSize: '24px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBoard: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  scoreItem: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
  },
  gameArea: {
    marginBottom: '24px',
  },
  instruction: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    textAlign: 'center',
    marginBottom: '24px',
    fontWeight: 'bold',
  },
  trackDisplay: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '32px',
  },
  trackPair: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px',
  },
  vs: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    padding: '0 16px',
  },
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center',
    minWidth: '200px',
  },
  deckLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
    fontFamily: 'Arial, sans-serif',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  trackEmoji: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  trackTitle: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  trackInfo: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
  },
  correctGenre: {
    marginTop: '12px',
    padding: '8px 16px',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    border: '2px solid #4CAF50',
    borderRadius: '8px',
    color: '#4CAF50',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  genreTag: {
    marginTop: '12px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  genreGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  genreOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'Arial, sans-serif',
  },
  genreEmoji: {
    fontSize: '36px',
    lineHeight: 1,
  },
  genreName: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  compatibilityOptions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  compatibilityButton: {
    padding: '24px',
    borderRadius: '12px',
    border: '3px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  yesButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    color: '#fff',
  },
  noButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: '#F44336',
    color: '#fff',
  },
  optionEmoji: {
    fontSize: '48px',
  },
  optionText: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  resultMessage: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  correctMessage: {
    color: '#4CAF50',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  wrongMessage: {
    color: '#F44336',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  compatibilityInfo: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '16px',
    fontFamily: 'Arial, sans-serif',
  },
  tryAgainSection: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  },
  tryAgainButton: {
    padding: '12px 32px',
    backgroundColor: '#9C27B0',
    color: '#fff',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Arial, sans-serif',
    transition: 'all 0.2s',
  },
  successToast: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    padding: '24px 48px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(76, 175, 80, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    animation: 'successPop 0.3s ease-out',
    pointerEvents: 'none',
    zIndex: 100,
  },
  successEmoji: {
    fontSize: '48px',
  },
  successText: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
  },
};

export default GenreMatcher;
