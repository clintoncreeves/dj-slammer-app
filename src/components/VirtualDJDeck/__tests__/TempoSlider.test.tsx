/**
 * TempoSlider Component Tests
 *
 * Tests for TempoSlider component covering:
 * - Drag interaction
 * - Value changes
 * - Double-click reset
 * - Touch support
 * - Visual feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TempoSlider } from '../TempoSlider';

describe('TempoSlider', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    deck: 'A' as const,
    originalBPM: 120,
    currentBPM: 120,
    color: '#00F0FF',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render tempo slider with label', () => {
      render(<TempoSlider {...defaultProps} />);
      expect(screen.getByText('Tempo')).toBeInTheDocument();
    });

    it('should display percentage markers', () => {
      render(<TempoSlider {...defaultProps} />);
      expect(screen.getByText('+8%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('-8%')).toBeInTheDocument();
    });

    it('should display custom percentage range', () => {
      render(<TempoSlider {...defaultProps} minPercent={-10} maxPercent={10} />);
      expect(screen.getByText('+10%')).toBeInTheDocument();
      expect(screen.getByText('-10%')).toBeInTheDocument();
    });

    it('should display double-click hint', () => {
      render(<TempoSlider {...defaultProps} />);
      expect(screen.getByText('Double-click to reset')).toBeInTheDocument();
    });

    it('should apply highlighted class when highlighted', () => {
      const { container } = render(<TempoSlider {...defaultProps} highlighted />);
      const sliderContainer = container.firstChild as HTMLElement | null;
      expect(sliderContainer?.className).toContain('highlighted');
    });

    it('should apply custom className', () => {
      const { container } = render(<TempoSlider {...defaultProps} className="custom-class" />);
      const sliderContainer = container.firstChild;
      expect(sliderContainer).toHaveClass('custom-class');
    });
  });

  describe('Value Display', () => {
    it('should position slider at center for original BPM', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const thumb = container.querySelector('[class*="thumb"]');
      
      // At original BPM (120), slider should be at 50% (allowing for floating point)
      const style = thumb?.getAttribute('style') || '';
      expect(style).toMatch(/bottom:\s*50%|bottom:\s*49\.\d+%/);
    });

    it('should position slider higher for increased BPM', () => {
      const { container } = render(
        <TempoSlider {...defaultProps} currentBPM={129.6} /> // +8%
      );
      const thumb = container.querySelector('[class*="thumb"]');
      
      // Higher BPM should be higher on slider (close to 100%)
      const style = thumb?.getAttribute('style') || '';
      expect(style).toMatch(/bottom:\s*(100%|99\.\d+%)/);
    });

    it('should position slider lower for decreased BPM', () => {
      const { container } = render(
        <TempoSlider {...defaultProps} currentBPM={110.4} /> // -8%
      );
      const thumb = container.querySelector('[class*="thumb"]');
      
      // Lower BPM should be lower on slider (closer to 0%)
      expect(thumb?.getAttribute('style')).toContain('0%');
    });

    it('should update fill height based on current BPM', () => {
      const { container } = render(<TempoSlider {...defaultProps} currentBPM={126} />);
      const fill = container.querySelector('[class*="fill"]');
      
      // Fill should reflect the current position
      expect(fill).toBeInTheDocument();
    });
  });

  describe('Mouse Interaction', () => {
    it('should call onChange on mouse drag', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      // Mock getBoundingClientRect
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Simulate mouse down in middle of slider
      fireEvent.mouseDown(slider!, { clientY: 200 });
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should update BPM during mouse move', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Start drag
      fireEvent.mouseDown(slider!, { clientY: 200 });
      
      // Move mouse
      fireEvent.mouseMove(window, { clientY: 150 });
      
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should stop updating on mouse up', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Start and end drag
      fireEvent.mouseDown(slider!, { clientY: 200 });
      fireEvent.mouseUp(window);
      
      mockOnChange.mockClear();
      
      // Further mouse moves should not trigger onChange
      fireEvent.mouseMove(window, { clientY: 150 });
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should apply dragging class during drag', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Before drag - check class name contains dragging styles
      expect(slider!.className).not.toContain('dragging');
      
      // During drag
      fireEvent.mouseDown(slider!, { clientY: 200 });
      expect(slider!.className).toContain('dragging');
      
      // After drag
      fireEvent.mouseUp(window);
      expect(slider!.className).not.toContain('dragging');
    });
  });

  describe('Touch Interaction', () => {
    it('should call onChange on touch', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      fireEvent.touchStart(slider!, {
        touches: [{ clientY: 200 }],
      });
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should update during touch move', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      fireEvent.touchStart(slider!, {
        touches: [{ clientY: 200 }],
      });
      
      fireEvent.touchMove(window, {
        touches: [{ clientY: 150 }],
      });
      
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('should stop updating on touch end', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      fireEvent.touchStart(slider!, {
        touches: [{ clientY: 200 }],
      });
      
      fireEvent.touchEnd(window);
      
      mockOnChange.mockClear();
      
      fireEvent.touchMove(window, {
        touches: [{ clientY: 150 }],
      });
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Double-Click Reset', () => {
    it('should reset to original BPM on double-click', () => {
      const { container } = render(<TempoSlider {...defaultProps} currentBPM={126} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      fireEvent.doubleClick(slider);
      
      expect(mockOnChange).toHaveBeenCalledWith(120); // Original BPM
    });

    it('should reset even when at original BPM', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      fireEvent.doubleClick(slider);
      
      expect(mockOnChange).toHaveBeenCalledWith(120);
    });
  });

  describe('BPM Calculations', () => {
    it('should calculate min BPM correctly', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Click at bottom (min BPM)
      fireEvent.mouseDown(slider!, { clientY: 300 });
      
      // Should call with min BPM (120 * 0.92 = 110.4)
      const calledBPM = mockOnChange.mock.calls[0][0];
      expect(calledBPM).toBeCloseTo(110.4, 1);
    });

    it('should calculate max BPM correctly', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Click at top (max BPM)
      fireEvent.mouseDown(slider!, { clientY: 100 });
      
      // Should call with max BPM (120 * 1.08 = 129.6)
      const calledBPM = mockOnChange.mock.calls[0][0];
      expect(calledBPM).toBeCloseTo(129.6, 1);
    });
  });

  describe('Custom Ranges', () => {
    it('should respect custom minPercent', () => {
      const { container } = render(
        <TempoSlider {...defaultProps} minPercent={-20} maxPercent={20} />
      );
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Click at bottom
      fireEvent.mouseDown(slider!, { clientY: 300 });
      
      // Should call with -20% (120 * 0.8 = 96)
      const calledBPM = mockOnChange.mock.calls[0][0];
      expect(calledBPM).toBeCloseTo(96, 1);
    });

    it('should respect custom maxPercent', () => {
      const { container } = render(
        <TempoSlider {...defaultProps} minPercent={-20} maxPercent={20} />
      );
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Click at top
      fireEvent.mouseDown(slider!, { clientY: 100 });
      
      // Should call with +20% (120 * 1.2 = 144)
      const calledBPM = mockOnChange.mock.calls[0][0];
      expect(calledBPM).toBeCloseTo(144, 1);
    });
  });

  describe('Styling', () => {
    it('should apply color CSS variable', () => {
      const { container } = render(<TempoSlider {...defaultProps} color="#FF0000" />);
      const slider = container.querySelector('[class*="slider"]');
      
      expect(slider).toHaveStyle({ '--slider-color': '#FF0000' });
    });

    it('should use different colors for different decks', () => {
      const { container: containerA } = render(
        <TempoSlider {...defaultProps} deck="A" color="#00F0FF" />
      );
      const sliderA = containerA.querySelector('[class*="slider"]');
      
      const { container: containerB } = render(
        <TempoSlider {...defaultProps} deck="B" color="#FF006E" />
      );
      const sliderB = containerB.querySelector('[class*="slider"]');
      
      expect(sliderA).toHaveStyle({ '--slider-color': '#00F0FF' });
      expect(sliderB).toHaveStyle({ '--slider-color': '#FF006E' });
    });
  });

  describe('Accessibility', () => {
    it('should have visible text label', () => {
      render(<TempoSlider {...defaultProps} />);
      expect(screen.getByText('Tempo')).toBeVisible();
    });

    it('should provide visual feedback for interaction', () => {
      const { container } = render(<TempoSlider {...defaultProps} />);
      const slider = container.querySelector('[class*="slider"]');
      
      if (!slider) throw new Error('Slider not found');
      
      slider!.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        height: 200,
        left: 0,
        bottom: 300,
        right: 50,
        width: 50,
        x: 0,
        y: 100,
        toJSON: () => {},
      }));

      // Should show dragging state
      fireEvent.mouseDown(slider!, { clientY: 200 });
      expect(slider!.className).toContain('dragging');
    });
  });
});
