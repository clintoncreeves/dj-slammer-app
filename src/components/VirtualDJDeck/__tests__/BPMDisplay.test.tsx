/**
 * BPMDisplay Component Tests
 *
 * Tests for BPMDisplay component covering:
 * - Displays correct values
 * - Shows original vs current BPM
 * - Percentage calculations
 * - Styling and visual feedback
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BPMDisplay } from '../BPMDisplay';

describe('BPMDisplay', () => {
  const defaultProps = {
    originalBPM: 120,
    currentBPM: 120,
    color: '#00F0FF',
  };

  describe('Rendering', () => {
    it('should render current BPM value', () => {
      render(<BPMDisplay {...defaultProps} />);
      expect(screen.getByText('120.0')).toBeInTheDocument();
    });

    it('should render BPM unit label', () => {
      render(<BPMDisplay {...defaultProps} />);
      expect(screen.getByText('BPM')).toBeInTheDocument();
    });

    it('should render original BPM in details', () => {
      render(<BPMDisplay {...defaultProps} />);
      expect(screen.getByText(/Original:/)).toBeInTheDocument();
      expect(screen.getByText('120 BPM')).toBeInTheDocument();
    });

    it('should display current BPM with one decimal', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={123.456} />);
      expect(screen.getByText('123.5')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<BPMDisplay {...defaultProps} className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('BPM Differences', () => {
    it('should show positive difference when BPM increased', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={126} />);
      expect(screen.getByText(/\+6.0/)).toBeInTheDocument();
    });

    it('should show negative difference when BPM decreased', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={114} />);
      expect(screen.getByText(/-6.0/)).toBeInTheDocument();
    });

    it('should not show difference when BPM unchanged', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={120} />);
      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
      expect(screen.queryByText(/-/)).not.toBeInTheDocument();
    });

    it('should not show difference for small changes (<0.5 BPM)', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={120.3} />);
      // Small difference should not trigger display
      const details = screen.queryByText(/\+0.3/);
      expect(details).not.toBeInTheDocument();
    });

    it('should show difference for changes ≥0.5 BPM', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={120.6} />);
      expect(screen.getByText(/\+0.6/)).toBeInTheDocument();
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate percentage correctly for increase', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={132} />);
      // 132/120 = 1.1, (1.1 - 1) * 100 = 10%
      expect(screen.getByText(/\+10.0%/)).toBeInTheDocument();
    });

    it('should calculate percentage correctly for decrease', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={108} />);
      // 108/120 = 0.9, (0.9 - 1) * 100 = -10%
      expect(screen.getByText(/-10.0%/)).toBeInTheDocument();
    });

    it('should show percentage with one decimal place', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={125} />);
      // 125/120 = 1.041666..., should show +4.2%
      expect(screen.getByText(/\+4.2%/)).toBeInTheDocument();
    });

    it('should show + sign for positive percentages', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={126} />);
      const percentageText = screen.getByText(/\+5.0%/);
      expect(percentageText).toBeInTheDocument();
    });

    it('should not show + sign for negative percentages', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={114} />);
      const percentageText = screen.getByText(/-5.0%/);
      expect(percentageText).toBeInTheDocument();
      // Should not have double negative
      expect(percentageText.textContent).not.toContain('+-');
    });
  });

  describe('Styling', () => {
    it('should apply color CSS variable', () => {
      const { container } = render(<BPMDisplay {...defaultProps} color="#FF0000" />);
      const currentBPM = container.querySelector('[class*="currentBPM"]');
      expect(currentBPM).toHaveStyle({ '--bpm-color': '#FF0000' });
    });

    it('should apply positive difference styling', () => {
      const { container } = render(<BPMDisplay {...defaultProps} currentBPM={126} />);
      const difference = container.querySelector('[class*="positive"]');
      expect(difference).toBeInTheDocument();
    });

    it('should apply negative difference styling', () => {
      const { container } = render(<BPMDisplay {...defaultProps} currentBPM={114} />);
      const difference = container.querySelector('[class*="negative"]');
      expect(difference).toBeInTheDocument();
    });

    it('should use different colors for different decks', () => {
      const { container: containerA } = render(
        <BPMDisplay originalBPM={120} currentBPM={120} color="#00F0FF" />
      );
      const bpmA = containerA.querySelector('[class*="currentBPM"]');

      const { container: containerB } = render(
        <BPMDisplay originalBPM={100} currentBPM={100} color="#FF006E" />
      );
      const bpmB = containerB.querySelector('[class*="currentBPM"]');

      expect(bpmA).toHaveStyle({ '--bpm-color': '#00F0FF' });
      expect(bpmB).toHaveStyle({ '--bpm-color': '#FF006E' });
    });
  });

  describe('Real-time Updates', () => {
    it('should update when currentBPM changes', () => {
      const { rerender } = render(<BPMDisplay {...defaultProps} currentBPM={120} />);
      expect(screen.getByText('120.0')).toBeInTheDocument();

      rerender(<BPMDisplay {...defaultProps} currentBPM={125.5} />);
      expect(screen.getByText('125.5')).toBeInTheDocument();
    });

    it('should update percentage when BPM changes', () => {
      const { rerender } = render(<BPMDisplay {...defaultProps} currentBPM={120} />);
      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();

      rerender(<BPMDisplay {...defaultProps} currentBPM={126} />);
      expect(screen.getByText(/\+5.0%/)).toBeInTheDocument();
    });

    it('should handle rapid BPM changes', () => {
      const { rerender } = render(<BPMDisplay {...defaultProps} currentBPM={120} />);

      // Simulate rapid tempo adjustments
      [121, 122, 123, 124, 125].forEach((bpm) => {
        rerender(<BPMDisplay {...defaultProps} currentBPM={bpm} />);
      });

      expect(screen.getByText('125.0')).toBeInTheDocument();
      expect(screen.getByText(/\+4.2%/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very low BPM', () => {
      render(<BPMDisplay originalBPM={60} currentBPM={48} color="#00F0FF" />);
      expect(screen.getByText('48.0')).toBeInTheDocument();
      expect(screen.getByText(/60 BPM/)).toBeInTheDocument();
    });

    it('should handle very high BPM', () => {
      render(<BPMDisplay originalBPM={180} currentBPM={195} color="#00F0FF" />);
      expect(screen.getByText('195.0')).toBeInTheDocument();
      expect(screen.getByText(/180 BPM/)).toBeInTheDocument();
    });

    it('should handle fractional original BPM', () => {
      render(<BPMDisplay originalBPM={123.5} currentBPM={123.5} color="#00F0FF" />);
      expect(screen.getByText('123.5')).toBeInTheDocument();
      expect(screen.getByText(/124 BPM/)).toBeInTheDocument(); // Rounded in display
    });

    it('should handle zero difference edge case', () => {
      render(<BPMDisplay originalBPM={120} currentBPM={120.4} color="#00F0FF" />);
      // 0.4 difference is less than 0.5 threshold
      expect(screen.queryByText(/\+0.4/)).not.toBeInTheDocument();
    });

    it('should handle exact 0.5 difference threshold', () => {
      render(<BPMDisplay originalBPM={120} currentBPM={120.5} color="#00F0FF" />);
      expect(screen.getByText(/\+0.5/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have readable text content', () => {
      render(<BPMDisplay {...defaultProps} currentBPM={126} />);
      
      // Main BPM should be prominent
      expect(screen.getByText('126.0')).toBeVisible();
      expect(screen.getByText('BPM')).toBeVisible();
      
      // Details should be readable
      expect(screen.getByText(/Original:/)).toBeVisible();
      expect(screen.getByText(/\+6.0/)).toBeVisible();
    });

    it('should maintain contrast with color styling', () => {
      const { container } = render(<BPMDisplay {...defaultProps} color="#00F0FF" />);
      const currentBPM = container.querySelector('[class*="currentBPM"]');
      
      // Should have color applied via CSS variable
      expect(currentBPM).toHaveStyle({ '--bpm-color': '#00F0FF' });
    });
  });

  describe('Layout', () => {
    it('should contain all required elements', () => {
      const { container } = render(<BPMDisplay {...defaultProps} currentBPM={126} />);
      
      // Main container
      expect(container.querySelector('[class*="container"]')).toBeInTheDocument();
      
      // Current BPM display
      expect(container.querySelector('[class*="currentBPM"]')).toBeInTheDocument();
      
      // Value
      expect(container.querySelector('[class*="value"]')).toBeInTheDocument();
      
      // Unit
      expect(container.querySelector('[class*="unit"]')).toBeInTheDocument();
      
      // Details section
      expect(container.querySelector('[class*="details"]')).toBeInTheDocument();
      
      // Original BPM
      expect(container.querySelector('[class*="original"]')).toBeInTheDocument();
      
      // Difference (when applicable)
      expect(container.querySelector('[class*="difference"]')).toBeInTheDocument();
    });
  });
});
