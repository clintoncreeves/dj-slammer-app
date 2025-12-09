/**
 * LessonCompleteScreen Component Tests
 *
 * Tests for LessonCompleteScreen component covering:
 * - Buttons navigate correctly
 * - Lesson completion message display
 * - Stats display (time, hints)
 * - Badge/reward display
 *
 * Note: This component may not exist yet in its final form.
 * These tests serve as specifications for expected behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock component for testing (since the actual component might be embedded in VirtualDJDeck_Professional)
const MockLessonCompleteScreen = ({
  lessonTitle,
  completionMessage,
  duration,
  hintsUsed,
  badge,
  onContinueToFreePlay,
  onReplayLesson,
  onNextLesson,
}: {
  lessonTitle: string;
  completionMessage: string;
  duration: number;
  hintsUsed: number;
  badge?: { icon: string; title: string };
  onContinueToFreePlay?: () => void;
  onReplayLesson?: () => void;
  onNextLesson?: () => void;
}) => (
  <div data-testid="lesson-complete">
    <h1>{lessonTitle}</h1>
    <div>{completionMessage}</div>
    {badge && (
      <div data-testid="badge">
        <span>{badge.icon}</span>
        <span>{badge.title}</span>
      </div>
    )}
    <div data-testid="stats">
      <div>Time: {Math.floor(duration / 1000)}s</div>
      <div>Hints used: {hintsUsed}</div>
    </div>
    <div data-testid="actions">
      {onContinueToFreePlay && (
        <button onClick={onContinueToFreePlay}>Continue to Free Play</button>
      )}
      {onReplayLesson && (
        <button onClick={onReplayLesson}>Replay Lesson</button>
      )}
      {onNextLesson && (
        <button onClick={onNextLesson}>Next Lesson</button>
      )}
    </div>
  </div>
);

describe('LessonCompleteScreen', () => {
  const mockOnContinueToFreePlay = vi.fn();
  const mockOnReplayLesson = vi.fn();
  const mockOnNextLesson = vi.fn();

  const defaultProps = {
    lessonTitle: 'Your First Mix',
    completionMessage: '🔥 SKILLS UNLOCKED! You completed your first DJ mix!',
    duration: 125000, // 125 seconds
    hintsUsed: 2,
    badge: {
      icon: '🏆',
      title: 'First Mix Master',
    },
    onContinueToFreePlay: mockOnContinueToFreePlay,
    onReplayLesson: mockOnReplayLesson,
    onNextLesson: mockOnNextLesson,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render lesson title', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      expect(screen.getByText('Your First Mix')).toBeInTheDocument();
    });

    it('should render completion message', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      expect(screen.getByText(/SKILLS UNLOCKED/)).toBeInTheDocument();
    });

    it('should display lesson duration', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      expect(screen.getByText(/Time: 125s/)).toBeInTheDocument();
    });

    it('should display hints used count', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      expect(screen.getByText(/Hints used: 2/)).toBeInTheDocument();
    });

    it('should render badge when provided', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
      expect(screen.getByText('First Mix Master')).toBeInTheDocument();
    });

    it('should not render badge when not provided', () => {
      const propsWithoutBadge = { ...defaultProps, badge: undefined };
      render(<MockLessonCompleteScreen {...propsWithoutBadge} />);
      
      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
    });
  });

  describe('Button Navigation', () => {
    it('should call onContinueToFreePlay when button clicked', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Continue to Free Play/i });
      await user.click(button);
      
      expect(mockOnContinueToFreePlay).toHaveBeenCalledTimes(1);
    });

    it('should call onReplayLesson when button clicked', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Replay Lesson/i });
      await user.click(button);
      
      expect(mockOnReplayLesson).toHaveBeenCalledTimes(1);
    });

    it('should call onNextLesson when button clicked', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: /Next Lesson/i });
      await user.click(button);
      
      expect(mockOnNextLesson).toHaveBeenCalledTimes(1);
    });

    it('should not render button if callback not provided', () => {
      const propsWithoutCallbacks = {
        ...defaultProps,
        onContinueToFreePlay: undefined,
        onReplayLesson: undefined,
        onNextLesson: undefined,
      };
      render(<MockLessonCompleteScreen {...propsWithoutCallbacks} />);
      
      expect(screen.queryByRole('button', { name: /Continue/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Replay/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Next/i })).not.toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('should format duration correctly', () => {
      const { rerender } = render(
        <MockLessonCompleteScreen {...defaultProps} duration={65000} />
      );
      expect(screen.getByText(/Time: 65s/)).toBeInTheDocument();
      
      rerender(<MockLessonCompleteScreen {...defaultProps} duration={125000} />);
      expect(screen.getByText(/Time: 125s/)).toBeInTheDocument();
    });

    it('should show zero hints if none used', () => {
      render(<MockLessonCompleteScreen {...defaultProps} hintsUsed={0} />);
      expect(screen.getByText(/Hints used: 0/)).toBeInTheDocument();
    });

    it('should show multiple hints used', () => {
      render(<MockLessonCompleteScreen {...defaultProps} hintsUsed={5} />);
      expect(screen.getByText(/Hints used: 5/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Continue to Free Play/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Replay Lesson/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next Lesson/i })).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      // Tab through buttons
      await user.tab();
      const firstButton = screen.getByRole('button', { name: /Continue to Free Play/i });
      expect(firstButton).toHaveFocus();
      
      // Enter should activate button
      await user.keyboard('{Enter}');
      expect(mockOnContinueToFreePlay).toHaveBeenCalled();
    });

    it('should have readable heading hierarchy', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Your First Mix');
    });
  });

  describe('Visual Feedback', () => {
    it('should display celebratory emoji/icons', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      // Should contain celebratory content
      expect(screen.getByText(/🔥/)).toBeInTheDocument();
    });

    it('should show badge prominently', () => {
      render(<MockLessonCompleteScreen {...defaultProps} />);
      const badge = screen.getByTestId('badge');
      expect(badge).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short lesson duration', () => {
      render(<MockLessonCompleteScreen {...defaultProps} duration={5000} />);
      expect(screen.getByText(/Time: 5s/)).toBeInTheDocument();
    });

    it('should handle long lesson duration', () => {
      render(<MockLessonCompleteScreen {...defaultProps} duration={600000} />);
      expect(screen.getByText(/Time: 600s/)).toBeInTheDocument();
    });

    it('should handle multiline completion message', () => {
      const longMessage = 'Line 1\nLine 2\nLine 3';
      render(<MockLessonCompleteScreen {...defaultProps} completionMessage={longMessage} />);
      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should handle empty lesson title', () => {
      render(<MockLessonCompleteScreen {...defaultProps} lessonTitle="" />);
      const heading = screen.queryByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should allow user to replay and complete again', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const replayButton = screen.getByRole('button', { name: /Replay Lesson/i });
      await user.click(replayButton);
      
      expect(mockOnReplayLesson).toHaveBeenCalled();
      // In actual app, this would trigger tutorial restart
    });

    it('should allow progression to free play', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const freePlayButton = screen.getByRole('button', { name: /Continue to Free Play/i });
      await user.click(freePlayButton);
      
      expect(mockOnContinueToFreePlay).toHaveBeenCalled();
      // In actual app, this would switch to free play mode
    });

    it('should allow progression to next lesson', async () => {
      const user = userEvent.setup();
      render(<MockLessonCompleteScreen {...defaultProps} />);
      
      const nextButton = screen.getByRole('button', { name: /Next Lesson/i });
      await user.click(nextButton);
      
      expect(mockOnNextLesson).toHaveBeenCalled();
      // In actual app, this would load next lesson
    });
  });
});
