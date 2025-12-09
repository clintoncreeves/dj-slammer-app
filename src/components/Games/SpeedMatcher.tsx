/**
 * Speed Matcher Game
 *
 * Teaches kids to match BPM between two tracks by adjusting tempo
 * Visual characters bounce at different speeds based on BPM
 * Now includes half-time and double-time detection for advanced matching
 */

import React, { useState, useEffect } from 'react';
import { TrackMetadata } from '../VirtualDJDeck/types';
import { getTempoEmoji } from '../../utils/harmonicMixing';
import { canSync, calculateBPMSync } from '../../utils/bpmSync';

interface SpeedMatcherProps {
  trackA: TrackMetadata;
  trackB: TrackMetadata;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const SpeedMatcher: React.FC<SpeedMatcherProps> = ({
  trackA,
  trackB,
  onSuccess,
  onClose,
}) => {
  // Track B's BPM can be adjusted
  const [currentBPM_B, setCurrentBPM_B] = useState(trackB.bpm);
  const [isMatched, setIsMatched] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncType, setSyncType] = useState<'direct' | 'half-time' | 'double-time' | null>(null);

  // Check if BPMs are matched using professional sync algorithm
  useEffect(() => {
    // Check if sync is possible between the two tracks
    const syncPossible = canSync(trackA.bpm, currentBPM_B);

    if (syncPossible) {
      // Calculate the sync result to determine what kind of match it is
      const syncResult = calculateBPMSync(trackA.bpm, currentBPM_B, trackB.bpm);
      const matched = Math.abs(syncResult.adjustment) <= 3; // Within ±3 BPM of target

      setIsMatched(matched);
      setSyncType(matched ? syncResult.syncType : null);

      if (matched && !showSuccess) {
        setShowSuccess(true);
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
        // Call onSuccess callback if provided
        onSuccess?.();
      }
    } else {
      setIsMatched(false);
      setSyncType(null);
    }
  }, [currentBPM_B, trackA.bpm, trackB.bpm, showSuccess, onSuccess]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newBPM = parseInt(event.target.value);
    setCurrentBPM_B(newBPM);
    setAttempts(prev => prev + 1);
  };

  const bpmDifference = Math.abs(trackA.bpm - currentBPM_B);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Speed Matcher Game 🎮</h2>
          <button style={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.instruction}>
          Match the speeds! Make both characters dance together at the same speed.
        </div>

        {/* Character Area */}
        <div style={styles.characterArea}>
          {/* Track A Character */}
          <div style={styles.characterColumn}>
            <div style={styles.characterLabel}>
              DJ Dog 🐕
              <br />
              <span style={styles.trackName}>{trackA.title}</span>
            </div>
            <BouncingCharacter
              bpm={trackA.bpm}
              color="#FF6B9D"
              emoji="🐕"
              size={80}
            />
            <div style={styles.bpmDisplay}>
              <div style={styles.tempoEmoji}>{getTempoEmoji(trackA.tempoCategory)}</div>
              <div style={styles.bpmValue}>{trackA.bpm} BPM</div>
            </div>
          </div>

          {/* Match Indicator */}
          <div style={styles.matchIndicator}>
            {isMatched ? (
              <div style={styles.matchSuccess}>
                <div style={styles.matchIcon}>✨ 💚 ✨</div>
                <div style={styles.matchText}>
                  {syncType === 'direct' && 'PERFECT MATCH!'}
                  {syncType === 'half-time' && 'HALF-TIME MATCH! 🐢'}
                  {syncType === 'double-time' && 'DOUBLE-TIME MATCH! 🐰'}
                </div>
                {syncType !== 'direct' && (
                  <div style={styles.syncTypeHint}>
                    {syncType === 'half-time' && 'One track is twice as slow!'}
                    {syncType === 'double-time' && 'One track is twice as fast!'}
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.matchProgress}>
                <div style={styles.differenceText}>
                  {bpmDifference > 10 ? 'Too different!' : bpmDifference > 5 ? 'Getting close!' : 'Almost there!'}
                </div>
                <div style={styles.differenceNumber}>
                  Difference: {bpmDifference} BPM
                </div>
              </div>
            )}
          </div>

          {/* Track B Character */}
          <div style={styles.characterColumn}>
            <div style={styles.characterLabel}>
              DJ Cat 🐱
              <br />
              <span style={styles.trackName}>{trackB.title}</span>
            </div>
            <BouncingCharacter
              bpm={currentBPM_B}
              color="#4CAF50"
              emoji="🐱"
              size={80}
            />
            <div style={styles.bpmDisplay}>
              <div style={styles.tempoEmoji}>{getTempoEmoji(trackB.tempoCategory)}</div>
              <div style={styles.bpmValue}>{currentBPM_B} BPM</div>
            </div>
          </div>
        </div>

        {/* Speed Control */}
        <div style={styles.controlArea}>
          <div style={styles.sliderLabel}>Adjust DJ Cat's Speed</div>
          <div style={styles.sliderContainer}>
            <div style={styles.sliderMarker}>🐢 Slow</div>
            <input
              type="range"
              min={Math.max(60, trackB.bpm - 40)}
              max={Math.min(180, trackB.bpm + 40)}
              value={currentBPM_B}
              onChange={handleSliderChange}
              style={{
                ...styles.slider,
                background: isMatched
                  ? 'linear-gradient(to right, #4CAF50, #8BC34A)'
                  : 'linear-gradient(to right, #FF6B9D, #9C27B0)',
              }}
            />
            <div style={styles.sliderMarker}>🐰 Fast</div>
          </div>
        </div>

        {/* Stats */}
        <div style={styles.stats}>
          <div style={styles.statItem}>
            Attempts: <strong>{attempts}</strong>
          </div>
        </div>

        {/* Success Toast Notification */}
        {showSuccess && (
          <div style={styles.successToast}>
            <div style={styles.successContent}>
              <div style={styles.successEmoji}>🎉</div>
              <div style={styles.successTitle}>You Did It!</div>
              <div style={styles.successMessage}>
                You matched the speeds perfectly!
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Bouncing Character Component
 * Animates based on BPM
 */
interface BouncingCharacterProps {
  bpm: number;
  color: string;
  emoji: string;
  size: number;
}

const BouncingCharacter: React.FC<BouncingCharacterProps> = ({
  bpm,
  color,
  emoji,
  size,
}) => {
  const animationDuration = 60 / bpm; // seconds per beat

  return (
    <div style={styles.characterContainer}>
      <div
        style={{
          ...styles.character,
          backgroundColor: color,
          width: size,
          height: size,
          animation: `bounce ${animationDuration}s ease-in-out infinite`,
        }}
      >
        <div style={{ ...styles.characterEmoji, fontSize: size * 0.6 }}>{emoji}</div>
      </div>
      <style>
        {`
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0) scale(1);
            }
            50% {
              transform: translateY(-30px) scale(1.1);
            }
          }

          @keyframes successPop {
            0% {
              transform: translate(-50%, -50%) scale(0.8);
              opacity: 0;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.05);
            }
            100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
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
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '3px solid rgba(255, 255, 255, 0.1)',
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
  instruction: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    textAlign: 'center',
    marginBottom: '30px',
  },
  characterArea: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: '40px',
    gap: '20px',
  },
  characterColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },
  characterLabel: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  trackName: {
    fontSize: '12px',
    fontWeight: 'normal',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  characterContainer: {
    height: '150px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  character: {
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    border: '4px solid rgba(255, 255, 255, 0.8)',
  },
  characterEmoji: {
    lineHeight: 1,
  },
  bpmDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },
  tempoEmoji: {
    fontSize: '20px',
  },
  bpmValue: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  matchIndicator: {
    flex: 0.8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchSuccess: {
    textAlign: 'center',
  },
  matchIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  matchText: {
    color: '#4CAF50',
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
  },
  syncTypeHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    marginTop: '8px',
  },
  matchProgress: {
    textAlign: 'center',
  },
  differenceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    marginBottom: '8px',
  },
  differenceNumber: {
    color: '#FF6B9D',
    fontFamily: 'monospace',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  controlArea: {
    marginBottom: '24px',
  },
  sliderLabel: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    marginBottom: '12px',
    textAlign: 'center',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  sliderMarker: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    minWidth: '80px',
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    height: '12px',
    borderRadius: '6px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
  },
  statItem: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
  },
  successToast: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(76, 175, 80, 0.95)',
    padding: '24px 40px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(76, 175, 80, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.2)',
    animation: 'successPop 0.3s ease-out',
    zIndex: 100,
    pointerEvents: 'none',
  },
  successContent: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  successEmoji: {
    fontSize: '48px',
    lineHeight: 1,
  },
  successTitle: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  successMessage: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
  },
};

export default SpeedMatcher;
