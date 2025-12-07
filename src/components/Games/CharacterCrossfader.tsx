/**
 * Character Crossfader Component
 *
 * Kid-friendly crossfader with DJ Dog and DJ Cat characters
 * Characters grow/shrink and animate based on crossfader position
 */

import React, { useEffect, useState } from 'react';

interface CharacterCrossfaderProps {
  position: number; // -1 (full left) to 1 (full right)
  onPositionChange: (position: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}

export const CharacterCrossfader: React.FC<CharacterCrossfaderProps> = ({
  position,
  onPositionChange,
  leftLabel = 'DJ Dog',
  rightLabel = 'DJ Cat',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  // Convert position from [-1, 1] to [0, 100] for visual display
  const sliderValue = ((position + 1) / 2) * 100;

  // Calculate character scales and opacities
  // Left character: full size at -1, tiny at +1
  const leftScale = 0.5 + (1 - (position + 1) / 2) * 0.5; // 0.5 to 1.0
  const leftOpacity = 0.3 + (1 - (position + 1) / 2) * 0.7; // 0.3 to 1.0

  // Right character: tiny at -1, full size at +1
  const rightScale = 0.5 + ((position + 1) / 2) * 0.5; // 0.5 to 1.0
  const rightOpacity = 0.3 + ((position + 1) / 2) * 0.7; // 0.3 to 1.0

  // Musical note particles
  const [particles, setParticles] = useState<Array<{ id: number; side: 'left' | 'right' }>>([]);

  useEffect(() => {
    if (isDragging || Math.abs(position) < 0.9) {
      const interval = setInterval(() => {
        const side: 'left' | 'right' = position < 0 ? 'left' : 'right';
        const newParticle = { id: Date.now(), side };
        setParticles(prev => [...prev, newParticle]);

        // Remove particle after animation
        setTimeout(() => {
          setParticles(prev => prev.filter(p => p.id !== newParticle.id));
        }, 1000);
      }, 300);

      return () => clearInterval(interval);
    }
  }, [position, isDragging]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    // Convert from [0, 100] to [-1, 1]
    const newPosition = (value / 100) * 2 - 1;
    onPositionChange(newPosition);
  };

  return (
    <div style={styles.container}>
      {/* Characters Area */}
      <div style={styles.charactersArea}>
        {/* Left Character (DJ Dog) */}
        <div
          style={{
            ...styles.characterContainer,
            transform: `scale(${leftScale})`,
            opacity: leftOpacity,
          }}
        >
          <div style={{ ...styles.character, backgroundColor: '#FF6B9D' }}>
            <div style={styles.characterEmoji}>🐕</div>
          </div>
          <div style={styles.characterLabel}>{leftLabel}</div>
          {position < -0.3 && (
            <div style={styles.playingIndicator}>
              <div style={styles.pulseRing} />
              Playing!
            </div>
          )}
        </div>

        {/* Center Info */}
        <div style={styles.centerInfo}>
          <div style={styles.crossfaderLabel}>Mix Control</div>
          <div style={styles.positionDisplay}>
            {position < -0.3 && '← DJ Dog'}
            {position >= -0.3 && position <= 0.3 && 'Both Playing'}
            {position > 0.3 && 'DJ Cat →'}
          </div>
        </div>

        {/* Right Character (DJ Cat) */}
        <div
          style={{
            ...styles.characterContainer,
            transform: `scale(${rightScale})`,
            opacity: rightOpacity,
          }}
        >
          <div style={{ ...styles.character, backgroundColor: '#4CAF50' }}>
            <div style={styles.characterEmoji}>🐱</div>
          </div>
          <div style={styles.characterLabel}>{rightLabel}</div>
          {position > 0.3 && (
            <div style={styles.playingIndicator}>
              <div style={styles.pulseRing} />
              Playing!
            </div>
          )}
        </div>
      </div>

      {/* Musical Note Particles */}
      <div style={styles.particlesContainer}>
        {particles.map(particle => (
          <MusicParticle key={particle.id} side={particle.side} />
        ))}
      </div>

      {/* Crossfader Slider */}
      <div style={styles.sliderArea}>
        <div style={styles.sliderTrack}>
          <div style={styles.sliderLabel}>🐕</div>
          <div style={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={sliderValue}
              onChange={handleSliderChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              disabled={disabled}
              style={{
                ...styles.slider,
                background: `linear-gradient(to right,
                  #FF6B9D 0%,
                  #FF6B9D ${sliderValue}%,
                  #4CAF50 ${sliderValue}%,
                  #4CAF50 100%)`,
              }}
            />
            {/* Center marker */}
            <div style={{ ...styles.centerMarker, left: '50%' }}>
              <div style={styles.centerDot} />
            </div>
          </div>
          <div style={styles.sliderLabel}>🐱</div>
        </div>
      </div>

      {/* Instruction Text */}
      <div style={styles.instructionText}>
        Drag the slider to mix between DJ Dog and DJ Cat!
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.3;
            }
          }

          @keyframes float-up {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(-100px) rotate(360deg);
              opacity: 0;
            }
          }

          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            border: 3px solid #333;
          }

          input[type="range"]::-moz-range-thumb {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            border: 3px solid #333;
          }
        `}
      </style>
    </div>
  );
};

/**
 * Musical Note Particle Component
 */
const MusicParticle: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const notes = ['♪', '♫', '♬', '♩'];
  const note = notes[Math.floor(Math.random() * notes.length)];
  const left = side === 'left' ? '20%' : '80%';
  const randomOffset = (Math.random() - 0.5) * 100; // -50 to 50px

  return (
    <div
      style={{
        ...styles.particle,
        left: `calc(${left} + ${randomOffset}px)`,
      }}
    >
      {note}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '16px',
    padding: '24px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  charactersArea: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: '40px',
    minHeight: '200px',
  },
  characterContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'transform 0.2s ease, opacity 0.2s ease',
  },
  character: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    border: '4px solid rgba(255, 255, 255, 0.8)',
    transition: 'transform 0.2s ease',
  },
  characterEmoji: {
    fontSize: '50px',
    lineHeight: 1,
  },
  characterLabel: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  playingIndicator: {
    color: '#4CAF50',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 'bold',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  pulseRing: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    opacity: 0.5,
    animation: 'pulse 1s ease-in-out infinite',
  },
  centerInfo: {
    textAlign: 'center',
    padding: '16px',
  },
  crossfaderLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '12px',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  positionDisplay: {
    color: '#fff',
    fontFamily: 'Arial, sans-serif',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '20px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    bottom: '30%',
    fontSize: '24px',
    animation: 'float-up 1s ease-out forwards',
  },
  sliderArea: {
    marginBottom: '16px',
  },
  sliderTrack: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  sliderLabel: {
    fontSize: '28px',
    lineHeight: 1,
  },
  sliderContainer: {
    flex: 1,
    position: 'relative',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    height: '12px',
    borderRadius: '6px',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    position: 'relative',
    zIndex: 1,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: 2,
  },
  centerDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    border: '2px solid #333',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    textAlign: 'center',
  },
};

export default CharacterCrossfader;
