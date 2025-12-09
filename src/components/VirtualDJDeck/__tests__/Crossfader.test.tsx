/**
 * Crossfader Component Tests
 *
 * Tests for Crossfader component covering:
 * - Position changes
 * - Keyboard support
 * - Drag interaction
 * - Visual feedback
 * - Deck status indicators
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Crossfader } from '../Crossfader';

describe('Crossfader', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    position: 0,
    onChange: mockOnChange,
    colorA: '#00F0FF',
    colorB: '#FF006E',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render crossfader slider', () => {
      render(<Crossfader {...defaultProps} />);
      const slider = screen.getByRole('slider', { name: /Crossfader/i });
      expect(slider).toBeInTheDocument();
    });

    it('should display deck labels', () => {
      render(<Crossfader {...defaultProps} />);
      expect(screen.getByText('Deck A')).toBeInTheDocument();
      expect(screen.getByText('Deck B')).toBeInTheDocument();
      expect(screen.getByText('Mix')).toBeInTheDocument();
    });

    it('should show deck status indicators', () => {
      render(<Crossfader {...defaultProps} deckALoaded deckBLoaded />);
      const readyElements = screen.getAllByText('Ready');
      expect(readyElements).toHaveLength(2); // One for each deck
    });

    it('should apply highlighted class when highlighted', () => {
      const { container } = render(<Crossfader {...defaultProps} highlighted />);
      const firstChild = container.firstChild as HTMLElement | null;
      expect(firstChild?.className).toContain('highlighted');
    });
  });

  describe('Position', () => {
    it('should position thumb at center for position 0', () => {
      const { container } = render(<Crossfader {...defaultProps} position={0} />);
      const thumb = container.querySelector('[class*="thumb"]');
      expect(thumb).toHaveStyle({ left: '50%' });
    });

    it('should position thumb at left for position -1', () => {
      const { container } = render(<Crossfader {...defaultProps} position={-1} />);
      const thumb = container.querySelector('[class*="thumb"]');
      expect(thumb).toHaveStyle({ left: '0%' });
    });

    it('should position thumb at right for position 1', () => {
      const { container } = render(<Crossfader {...defaultProps} position={1} />);
      const thumb = container.querySelector('[class*="thumb"]');
      expect(thumb).toHaveStyle({ left: '100%' });
    });

    it('should set correct aria attributes', () => {
      render(<Crossfader {...defaultProps} position={0.5} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '-1');
      expect(slider).toHaveAttribute('aria-valuemax', '1');
      expect(slider).toHaveAttribute('aria-valuenow', '0.5');
    });
  });

  describe('Mouse Interaction', () => {
    it('should call onChange on mouse drag', () => {
      const { container } = render(<Crossfader {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        width: 200,
        top: 0,
        bottom: 50,
        right: 300,
        height: 50,
        x: 100,
        y: 0,
        toJSON: () => {},
      }));

      fireEvent.mouseDown(slider!, { clientX: 200 });
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should apply dragging class during drag', () => {
      const { container } = render(<Crossfader {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        width: 200,
        top: 0,
        bottom: 50,
        right: 300,
        height: 50,
        x: 100,
        y: 0,
        toJSON: () => {},
      }));

      fireEvent.mouseDown(slider!, { clientX: 200 });
      expect(slider!.className).toContain('dragging');
      
      fireEvent.mouseUp(window);
      expect(slider!.className).not.toContain('dragging');
    });
  });

  describe('Touch Interaction', () => {
    it('should support touch events', () => {
      const { container } = render(<Crossfader {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        width: 200,
        top: 0,
        bottom: 50,
        right: 300,
        height: 50,
        x: 100,
        y: 0,
        toJSON: () => {},
      }));

      fireEvent.touchStart(slider!, {
        touches: [{ clientX: 200 }],
      });
      
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Keyboard Support', () => {
    it('should move left on ArrowLeft', async () => {
      const user = userEvent.setup();
      render(<Crossfader {...defaultProps} position={0} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      await user.keyboard('{ArrowLeft}');
      
      expect(mockOnChange).toHaveBeenCalledWith(-0.1);
    });

    it('should move right on ArrowRight', async () => {
      const user = userEvent.setup();
      render(<Crossfader {...defaultProps} position={0} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      await user.keyboard('{ArrowRight}');
      
      expect(mockOnChange).toHaveBeenCalledWith(0.1);
    });

    it('should move to full A on Home', async () => {
      const user = userEvent.setup();
      render(<Crossfader {...defaultProps} position={0} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      await user.keyboard('{Home}');
      
      expect(mockOnChange).toHaveBeenCalledWith(-1);
    });

    it('should move to full B on End', async () => {
      const user = userEvent.setup();
      render(<Crossfader {...defaultProps} position={0} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      await user.keyboard('{End}');
      
      expect(mockOnChange).toHaveBeenCalledWith(1);
    });

    it('should center on Enter', async () => {
      const user = userEvent.setup();
      render(<Crossfader {...defaultProps} position={0.5} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      await user.keyboard('{Enter}');
      
      expect(mockOnChange).toHaveBeenCalledWith(0);
    });

    it('should center on Space', async () => {
      const user = userEvent.setup();
      render(<Crossfader {...defaultProps} position={0.5} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      await user.keyboard(' ');
      
      expect(mockOnChange).toHaveBeenCalledWith(0);
    });
  });

  describe('Double-Click', () => {
    it('should center on double-click', () => {
      const { container } = render(<Crossfader {...defaultProps} position={0.5} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      fireEvent.doubleClick(slider);
      expect(mockOnChange).toHaveBeenCalledWith(0);
    });
  });

  describe('Snap to Center', () => {
    it('should snap to center when close and snapToCenter enabled', () => {
      const { container } = render(<Crossfader {...defaultProps} snapToCenter />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        width: 200,
        top: 0,
        bottom: 50,
        right: 300,
        height: 50,
        x: 100,
        y: 0,
        toJSON: () => {},
      }));

      // Click near center (position ~0.05)
      fireEvent.mouseDown(slider!, { clientX: 205 });
      
      const calledPosition = mockOnChange.mock.calls[0][0];
      expect(calledPosition).toBe(0); // Snapped to center
    });
  });

  describe('Deck Status', () => {
    it('should show deck A loaded status', () => {
      render(<Crossfader {...defaultProps} deckALoaded />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should show deck A playing status', () => {
      render(<Crossfader {...defaultProps} deckALoaded deckAPlaying />);
      const playingElements = screen.getAllByText('Playing');
      expect(playingElements.length).toBeGreaterThan(0);
    });

    it('should show no track status when not loaded', () => {
      render(<Crossfader {...defaultProps} deckALoaded={false} deckBLoaded={false} />);
      const noTrackElements = screen.getAllByText('No Track');
      expect(noTrackElements).toHaveLength(2); // One for each deck
    });

    it('should display volume percentages', () => {
      const { container } = render(
        <Crossfader {...defaultProps} position={0} deckALoaded deckBLoaded />
      );
      
      // At center, both should show 50%
      const volumeLevels = container.querySelectorAll('[class*="volumeLevel"]');
      expect(volumeLevels).toHaveLength(2);
    });
  });

  describe('Visual Feedback', () => {
    it('should show active state when deck playing', () => {
      const { container } = render(
        <Crossfader {...defaultProps} position={-0.6} deckAPlaying />
      );
      
      const thumb = container.querySelector('[class*="thumb"]');
      expect(thumb?.className).toContain('active');
    });

    it('should apply deck colors', () => {
      const { container } = render(<Crossfader {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      expect(slider).toHaveStyle({
        '--color-a': '#00F0FF',
        '--color-b': '#FF006E',
      });
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', () => {
      render(<Crossfader {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('tabIndex', '0');
    });

    it('should provide aria-valuetext', () => {
      render(<Crossfader {...defaultProps} position={0} />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuetext');
      expect(slider!.getAttribute('aria-valuetext')).toContain('Position: 0.00');
    });
  });
});
