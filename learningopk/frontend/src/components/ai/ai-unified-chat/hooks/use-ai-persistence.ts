import { useState, useCallback } from 'react';
import { normalizeSessionId, withPersistedChapterSession } from '@learningopk/shared/utils';

const STORAGE_KEYS = {
  visibility: 'learningopk:ai-chat:visibility',
  expanded: 'learningopk:ai-chat:expanded',
  chapterSessions: 'learningopk:ai-chat:chapter-sessions',
  firstVisit: 'learningopk:ai-chat:first-visit',
} as const;

export function useAIPersistence() {
  // Visibility state - default to true for discoverability
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEYS.visibility);
    return stored !== null ? stored === 'true' : true;
  });

  // Expanded state for desktop sidebar
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEYS.expanded);
    return stored === 'true';
  });

  // First visit tracking for onboarding
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEYS.firstVisit) !== 'false';
  });

  // Persist visibility
  const setVisibility = useCallback((value: boolean) => {
    setIsVisible(value);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.visibility, String(value));
      } catch {
        // Storage unavailable - state change is still valid
      }
    }
  }, []);

  // Persist expanded
  const setExpanded = useCallback((value: boolean) => {
    setIsExpanded(value);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.expanded, String(value));
      } catch {
        // Storage unavailable - state change is still valid
      }
    }
  }, []);

  // Mark first visit as done
  const dismissFirstVisit = useCallback(() => {
    setIsFirstVisit(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.firstVisit, 'false');
      } catch {
        // Storage unavailable - state change is still valid
      }
    }
  }, []);

  // Chapter-to-session mapping
  const getChapterSessionId = useCallback((chapterId: number): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.chapterSessions);
      if (!stored) return null;
      const map = JSON.parse(stored) as Record<number, string>;
      return normalizeSessionId(map[chapterId]);
    } catch {
      return null;
    }
  }, []);

  const setChapterSessionId = useCallback((chapterId: number, sessionId: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.chapterSessions);
      const map = stored ? JSON.parse(stored) as Record<number, string> : {};
      const nextMap = withPersistedChapterSession(map, chapterId, sessionId);
      if (Object.keys(nextMap).length === 0) {
        localStorage.removeItem(STORAGE_KEYS.chapterSessions);
        return;
      }
      localStorage.setItem(STORAGE_KEYS.chapterSessions, JSON.stringify(nextMap));
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    isVisible,
    isExpanded,
    isFirstVisit,
    setVisibility,
    setExpanded,
    dismissFirstVisit,
    getChapterSessionId,
    setChapterSessionId,
  };
}
