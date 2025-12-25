/**
 * WelcomeScreen Component
 *
 * Professional welcome experience for DJ Slammer.
 * Clean, Apple/Spotify-inspired design that sets the tone for the app.
 */

import React from 'react';
import styles from './WelcomeScreen.module.css';

interface WelcomeScreenProps {
  onStart: () => void;
  isLoading?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, isLoading = false }) => {
  return (
    <div className={styles.container}>
      {/* Background gradient animation */}
      <div className={styles.backgroundGlow} />

      {/* Spacer for top to balance space-between layout */}
      <div aria-hidden="true" />

      {/* Main content */}
      <div className={styles.content}>
        {/* Logo/Brand */}
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={styles.logoSvg}
            >
              {/* Stylized DJ turntable/record icon */}
              <circle cx="50" cy="50" r="45" stroke="url(#gradient)" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="35" stroke="url(#gradient)" strokeWidth="1.5" fill="none" opacity="0.6" />
              <circle cx="50" cy="50" r="25" stroke="url(#gradient)" strokeWidth="1" fill="none" opacity="0.4" />
              <circle cx="50" cy="50" r="8" fill="url(#gradient)" />
              {/* Tonearm */}
              <line x1="75" y1="25" x2="55" y2="45" stroke="url(#gradient)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="78" cy="22" r="5" fill="url(#gradient)" opacity="0.8" />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="100%" stopColor="#FF006E" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className={styles.title}>DJ Slammer</h1>
          <p className={styles.tagline}>Learn to mix like a pro</p>
        </div>

        {/* Value proposition */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </span>
            <span className={styles.featureText}>Real DJ controls</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </span>
            <span className={styles.featureText}>Step-by-step lessons</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </span>
            <span className={styles.featureText}>Professional skills</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          className={styles.startButton}
          onClick={onStart}
          disabled={isLoading}
          aria-label="Start learning to DJ"
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <span className={styles.buttonText}>Start Learning</span>
              <span className={styles.buttonArrow}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </span>
            </>
          )}
        </button>

        {/* Subtle hint */}
        <p className={styles.hint}>
          Your browser will ask for audio permission
        </p>

        {/* Help links */}
        <div className={styles.helpLinks}>
          <a
            href="https://github.com/clintoncreeves/dj-slammer-app/blob/main/docs/TANNER_DJ_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.helpLink}
          >
            <span className={styles.helpIcon}>📖</span>
            <span>DJ Guide</span>
          </a>
          <a
            href="https://github.com/clintoncreeves/dj-slammer-app/blob/main/docs/TANNER_MIDI_SETUP.md"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.helpLink}
          >
            <span className={styles.helpIcon}>🎛️</span>
            <span>MIDI Setup</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>Built for Tanner</p>
      </footer>
    </div>
  );
};

export default WelcomeScreen;
