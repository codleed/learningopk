'use client';

import { useState, useEffect, useCallback } from 'react';

type MobileKeyboardState = {
  /** Whether the virtual keyboard is currently visible */
  keyboardVisible: boolean;
  /** Estimated keyboard height in pixels (0 when hidden) */
  keyboardHeight: number;
  /** Current visual viewport height in pixels */
  viewportHeight: number;
};

/**
 * Detects mobile virtual keyboard presence using the Visual Viewport API.
 *
 * When the keyboard opens on mobile browsers the visual viewport shrinks while
 * the layout viewport stays the same. We compare `window.visualViewport.height`
 * to `window.innerHeight` to derive keyboard visibility and height.
 *
 * Falls back gracefully on browsers / environments without `visualViewport`.
 */
export function useMobileKeyboard(): MobileKeyboardState {
  const [state, setState] = useState<MobileKeyboardState>({
    keyboardVisible: false,
    keyboardHeight: 0,
    viewportHeight: 0,
  });

  const handleViewportChange = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setState((prev) => {
        if (prev.viewportHeight === window.innerHeight && !prev.keyboardVisible && prev.keyboardHeight === 0) {
          return prev;
        }

        return {
          keyboardVisible: false,
          keyboardHeight: 0,
          viewportHeight: window.innerHeight,
        };
      });
      return;
    }

    // The difference between the layout viewport height (innerHeight) and the
    // visual viewport height tells us how much space the keyboard occupies.
    // We use a small threshold (150px) to avoid false positives from browser
    // chrome changes (URL bar hiding, etc.).
    const heightDiff = window.innerHeight - vv.height;
    const KEYBOARD_THRESHOLD = 150;

    const visible = heightDiff > KEYBOARD_THRESHOLD;
    const nextKeyboardHeight = visible ? heightDiff : 0;
    const nextViewportHeight = Math.round(vv.height);

    setState((prev) => {
      if (
        prev.keyboardVisible === visible
        && prev.keyboardHeight === nextKeyboardHeight
        && prev.viewportHeight === nextViewportHeight
      ) {
        return prev; // no change — avoid re-render
      }

      return {
        keyboardVisible: visible,
        keyboardHeight: nextKeyboardHeight,
        viewportHeight: nextViewportHeight,
      };
    });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }

    window.addEventListener('resize', handleViewportChange);
    handleViewportChange();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }

      window.removeEventListener('resize', handleViewportChange);
    };
  }, [handleViewportChange]);

  return state;
}
