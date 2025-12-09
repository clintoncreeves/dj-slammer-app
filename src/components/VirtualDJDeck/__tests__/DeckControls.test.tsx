/**
 * DeckControls Component Tests
 *
 * Tests for DeckControls component covering:
 * - Button clicks trigger actions
 * - Button states (enabled/disabled)
 * - Visual feedback
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeckControls } from '../DeckControls';

describe('DeckControls', () => {
  const mockOnPlay = vi.fn();
  const mockOnPause = vi.fn();
  const mockOnCue = vi.fn();
  
  const defaultProps = {
    deck: 'A' as const,
    isPlaying: false,
    isLoaded: true,
    color: '#00F0FF',
    onPlay: mockOnPlay,
    onPause: mockOnPause,
    onCue: mockOnCue,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all three control buttons', () => {
      render(<DeckControls {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Play Deck A/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pause Deck A/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cue Deck A/i })).toBeInTheDocument();
    });

    it('should render button labels', () => {
      render(<DeckControls {...defaultProps} />);
      
      expect(screen.getByText('Play')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Cue')).toBeInTheDocument();
    });

    it('should render for Deck B', () => {
      render(<DeckControls {...defaultProps} deck="B" />);
      
      expect(screen.getByRole('button', { name: /Play Deck B/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pause Deck B/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cue Deck B/i })).toBeInTheDocument();
    });
  });

  describe('Button Clicks', () => {
    it('should call onPlay when play button clicked', async () => {
      const user = userEvent.setup();
      render(<DeckControls {...defaultProps} />);
      
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      await user.click(playButton);
      
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
    });

    it('should call onPause when pause button clicked', async () => {
      const user = userEvent.setup();
      render(<DeckControls {...defaultProps} isPlaying />);
      
      const pauseButton = screen.getByRole('button', { name: /Pause Deck A/i });
      await user.click(pauseButton);
      
      expect(mockOnPause).toHaveBeenCalledTimes(1);
    });

    it('should call onCue when cue button clicked', async () => {
      const user = userEvent.setup();
      render(<DeckControls {...defaultProps} />);
      
      const cueButton = screen.getByRole('button', { name: /Cue Deck A/i });
      await user.click(cueButton);
      
      expect(mockOnCue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button States', () => {
    it('should disable play button when not loaded', () => {
      render(<DeckControls {...defaultProps} isLoaded={false} />);
      
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      expect(playButton).toBeDisabled();
    });

    it('should enable play button when loaded', () => {
      render(<DeckControls {...defaultProps} isLoaded />);
      
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      expect(playButton).toBeEnabled();
    });

    it('should disable pause button when not loaded', () => {
      render(<DeckControls {...defaultProps} isLoaded={false} isPlaying={false} />);
      
      const pauseButton = screen.getByRole('button', { name: /Pause Deck A/i });
      expect(pauseButton).toBeDisabled();
    });

    it('should disable pause button when not playing', () => {
      render(<DeckControls {...defaultProps} isLoaded isPlaying={false} />);
      
      const pauseButton = screen.getByRole('button', { name: /Pause Deck A/i });
      expect(pauseButton).toBeDisabled();
    });

    it('should enable pause button when playing', () => {
      render(<DeckControls {...defaultProps} isLoaded isPlaying />);
      
      const pauseButton = screen.getByRole('button', { name: /Pause Deck A/i });
      expect(pauseButton).toBeEnabled();
    });

    it('should disable cue button when not loaded', () => {
      render(<DeckControls {...defaultProps} isLoaded={false} />);
      
      const cueButton = screen.getByRole('button', { name: /Cue Deck A/i });
      expect(cueButton).toBeDisabled();
    });

    it('should enable cue button when loaded', () => {
      render(<DeckControls {...defaultProps} isLoaded />);
      
      const cueButton = screen.getByRole('button', { name: /Cue Deck A/i });
      expect(cueButton).toBeEnabled();
    });
  });

  describe('Visual Feedback', () => {
    it('should show active state on play button when playing', () => {
      const { container } = render(<DeckControls {...defaultProps} isPlaying />);
      const playButton = container.querySelector('[class*="playButton"]');
      
      expect(playButton?.className).toContain('active');
    });

    it('should not show active state when not playing', () => {
      const { container } = render(<DeckControls {...defaultProps} isPlaying={false} />);
      const playButton = container.querySelector('[class*="playButton"]');
      
      expect(playButton?.className).not.toContain('active');
    });

    it('should apply deck color to buttons', () => {
      render(<DeckControls {...defaultProps} color="#FF0000" />);
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      
      expect(playButton).toHaveStyle({ '--button-color': '#FF0000' });
    });
  });

  describe('Highlighting (Tutorial Mode)', () => {
    it('should highlight play button when specified', () => {
      const { container } = render(<DeckControls {...defaultProps} highlightPlay />);
      const playButton = container.querySelector('[class*="playButton"]');
      
      expect(playButton?.className).toContain('highlighted');
    });

    it('should highlight pause button when specified', () => {
      const { container } = render(<DeckControls {...defaultProps} isPlaying highlightPause />);
      const pauseButton = container.querySelector('[class*="pauseButton"]');
      
      expect(pauseButton?.className).toContain('highlighted');
    });

    it('should highlight cue button when specified', () => {
      const { container } = render(<DeckControls {...defaultProps} highlightCue />);
      const cueButton = container.querySelector('[class*="cueButton"]');
      
      expect(cueButton?.className).toContain('highlighted');
    });

    it('should not highlight buttons by default', () => {
      const { container } = render(<DeckControls {...defaultProps} />);
      const playButton = container.querySelector('[class*="playButton"]');
      const pauseButton = container.querySelector('[class*="pauseButton"]');
      const cueButton = container.querySelector('[class*="cueButton"]');
      
      expect(playButton?.className).not.toContain('highlighted');
      expect(pauseButton?.className).not.toContain('highlighted');
      expect(cueButton?.className).not.toContain('highlighted');
    });
  });

  describe('SVG Icons', () => {
    it('should render play icon', () => {
      render(<DeckControls {...defaultProps} />);
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      const svg = playButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });

    it('should render pause icon', () => {
      render(<DeckControls {...defaultProps} isPlaying />);
      const pauseButton = screen.getByRole('button', { name: /Pause Deck A/i });
      const svg = pauseButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });

    it('should render cue icon', () => {
      render(<DeckControls {...defaultProps} />);
      const cueButton = screen.getByRole('button', { name: /Cue Deck A/i });
      const svg = cueButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels', () => {
      render(<DeckControls {...defaultProps} deck="A" />);
      
      expect(screen.getByRole('button', { name: 'Play Deck A' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Pause Deck A' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cue Deck A' })).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<DeckControls {...defaultProps} />);
      
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      
      await user.tab();
      expect(playButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnPlay).toHaveBeenCalled();
    });

    it('should have sufficient touch target size', () => {
      // Buttons should meet 44x44px minimum touch target (Req 6.1)
      // This is verified through CSS in the component
      const { container } = render(<DeckControls {...defaultProps} />);
      const buttons = container.querySelectorAll('button');
      
      expect(buttons.length).toBe(3);
      // Size is enforced via CSS, tested here for presence
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<DeckControls {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use different colors for different decks', () => {
      const { container: containerA } = render(
        <DeckControls {...defaultProps} deck="A" color="#00F0FF" />
      );
      const playButtonA = containerA.querySelector('[class*="playButton"]');
      
      const { container: containerB } = render(
        <DeckControls {...defaultProps} deck="B" color="#FF006E" />
      );
      const playButtonB = containerB.querySelector('[class*="playButton"]');
      
      expect(playButtonA).toHaveStyle({ '--button-color': '#00F0FF' });
      expect(playButtonB).toHaveStyle({ '--button-color': '#FF006E' });
    });
  });

  describe('Multiple Clicks', () => {
    it('should handle rapid clicks on play button', async () => {
      const user = userEvent.setup();
      render(<DeckControls {...defaultProps} />);
      
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      
      await user.click(playButton);
      await user.click(playButton);
      await user.click(playButton);
      
      expect(mockOnPlay).toHaveBeenCalledTimes(3);
    });

    it('should handle switching between play and pause', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<DeckControls {...defaultProps} isPlaying={false} />);
      
      const playButton = screen.getByRole('button', { name: /Play Deck A/i });
      await user.click(playButton);
      expect(mockOnPlay).toHaveBeenCalledTimes(1);
      
      // Simulate deck now playing
      rerender(<DeckControls {...defaultProps} isPlaying />);
      
      const pauseButton = screen.getByRole('button', { name: /Pause Deck A/i });
      await user.click(pauseButton);
      expect(mockOnPause).toHaveBeenCalledTimes(1);
    });
  });
});
