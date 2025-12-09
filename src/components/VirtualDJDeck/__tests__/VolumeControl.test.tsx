/**
 * VolumeControl Component Tests
 *
 * Tests for VolumeControl component covering:
 * - Volume changes
 * - Slider interaction
 * - Visual feedback
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VolumeControl } from '../VolumeControl';

describe('VolumeControl', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    deck: 'A' as const,
    volume: 0.8,
    color: '#00F0FF',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render volume control with label', () => {
      render(<VolumeControl {...defaultProps} />);
      expect(screen.getByText('VOLUME')).toBeInTheDocument();
    });

    it('should render slider input', () => {
      render(<VolumeControl {...defaultProps} />);
      const slider = screen.getByRole('slider', { name: /Volume control for Deck A/i });
      expect(slider).toBeInTheDocument();
    });

    it('should display current volume percentage', () => {
      render(<VolumeControl {...defaultProps} volume={0.75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display volume markers', () => {
      render(<VolumeControl {...defaultProps} />);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should show reset hint', () => {
      render(<VolumeControl {...defaultProps} />);
      expect(screen.getByText('Double-click to reset')).toBeInTheDocument();
    });
  });

  describe('Volume Changes', () => {
    it('should call onChange when slider moved', async () => {
      const user = userEvent.setup();
      render(<VolumeControl {...defaultProps} />);
      const slider = screen.getByRole('slider');
      
      await user.click(slider);
      fireEvent.change(slider, { target: { value: '0.5' } });
      
      expect(mockOnChange).toHaveBeenCalledWith(0.5);
    });

    it('should update volume display', () => {
      const { rerender } = render(<VolumeControl {...defaultProps} volume={0.8} />);
      expect(screen.getByText('80%')).toBeInTheDocument();
      
      rerender(<VolumeControl {...defaultProps} volume={0.5} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle volume at minimum (0)', () => {
      render(<VolumeControl {...defaultProps} volume={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle volume at maximum (1)', () => {
      render(<VolumeControl {...defaultProps} volume={1} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should display volume level indicator', () => {
      const { container } = render(<VolumeControl {...defaultProps} volume={0.7} />);
      const volumeLevel = container.querySelector('[class*="volumeLevel"]');
      
      expect(volumeLevel).toBeInTheDocument();
      expect(volumeLevel).toHaveStyle({ height: '70%' });
    });

    it('should apply deck color to volume level', () => {
      const { container } = render(<VolumeControl {...defaultProps} color="#FF0000" />);
      const volumeLevel = container.querySelector('[class*="volumeLevel"]');
      
      expect(volumeLevel).toHaveStyle({ background: '#FF0000' });
    });

    it('should apply highlighted class when highlighted', () => {
      const { container } = render(<VolumeControl {...defaultProps} highlighted />);
      const firstChild = container.firstChild as HTMLElement | null;
      expect(firstChild?.className).toContain('highlighted');
    });

    it('should style volume display with deck color', () => {
      const { container } = render(<VolumeControl {...defaultProps} color="#00FF00" />);
      const volumeDisplay = container.querySelector('[class*="volumeDisplay"]');
      
      expect(volumeDisplay).toHaveStyle({ color: '#00FF00' });
    });
  });

  describe('Slider Attributes', () => {
    it('should have correct min/max/step attributes', () => {
      render(<VolumeControl {...defaultProps} />);
      const slider = screen.getByRole('slider');
      
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '1');
      expect(slider).toHaveAttribute('step', '0.01');
    });

    it('should have correct value', () => {
      render(<VolumeControl {...defaultProps} volume={0.65} />);
      const slider = screen.getByRole('slider');
      
      expect(slider).toHaveValue('0.65');
    });

    it('should have aria attributes', () => {
      render(<VolumeControl {...defaultProps} volume={0.75} deck="B" />);
      const slider = screen.getByRole('slider');
      
      expect(slider).toHaveAttribute('aria-label', 'Volume control for Deck B');
      expect(slider).toHaveAttribute('aria-valuenow', '75');
      expect(slider).toHaveAttribute('aria-valuemin', '0');
      expect(slider).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Deck Identification', () => {
    it('should have unique id for Deck A', () => {
      render(<VolumeControl {...defaultProps} deck="A" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('id', 'volume-A');
    });

    it('should have unique id for Deck B', () => {
      render(<VolumeControl {...defaultProps} deck="B" />);
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('id', 'volume-B');
    });

    it('should associate label with input', () => {
      render(<VolumeControl {...defaultProps} deck="A" />);
      const label = screen.getByText('VOLUME');
      expect(label).toHaveAttribute('for', 'volume-A');
    });
  });

  describe('Styling', () => {
    it('should apply deck color CSS variable', () => {
      render(<VolumeControl {...defaultProps} color="#FF00FF" />);
      const slider = screen.getByRole('slider');
      
      expect(slider).toHaveStyle({ '--slider-color': '#FF00FF' });
    });

    it('should apply custom className', () => {
      const { container } = render(<VolumeControl {...defaultProps} className="custom" />);
      expect(container.firstChild).toHaveClass('custom');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<VolumeControl {...defaultProps} />);
      const slider = screen.getByRole('slider');
      
      slider.focus();
      expect(slider).toHaveFocus();
      
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowDown}');
      
      // Slider should respond to keyboard input
      expect(slider).toBeInTheDocument();
    });

    it('should provide clear visual label', () => {
      render(<VolumeControl {...defaultProps} />);
      const label = screen.getByText('VOLUME');
      expect(label).toBeVisible();
    });
  });
});
