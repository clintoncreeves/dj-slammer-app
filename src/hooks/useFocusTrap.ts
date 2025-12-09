/**
 * useFocusTrap Hook
 * 
 * Traps keyboard focus within a modal or overlay for accessibility.
 * Prevents keyboard users from accessing content behind modals.
 */

import { useEffect, useRef } from 'react';

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  active: boolean;
  /** Callback when Escape key is pressed */
  onEscape?: () => void;
}

export function useFocusTrap({ active, onEscape }: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    // Save the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return [];

      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(containerRef.current.querySelectorAll(selector));
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key to cycle focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: Move backwards
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: Move forwards
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: Restore focus when trap deactivates
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, onEscape]);

  return containerRef;
}
