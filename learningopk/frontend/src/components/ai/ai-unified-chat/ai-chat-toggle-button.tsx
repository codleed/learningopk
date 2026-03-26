'use client';

import { useEffect, useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatContext } from './ai-chat-context';

export function AIChatToggleButton() {
  const { isVisible, toggleVisibility, isFirstVisit, dismissFirstVisit } = useAIChatContext();
  const [showBounce, setShowBounce] = useState(isFirstVisit);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isFirstVisit) {
      timerRef.current = setTimeout(() => {
        setShowBounce(false);
      }, 3000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isFirstVisit]);
  
  const handleClick = () => {
    if (isFirstVisit) {
      dismissFirstVisit();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setShowBounce(false);
    }
    toggleVisibility();
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isVisible ? 'Close AI Chat' : 'Open AI Chat'}
      aria-expanded={isVisible}
      aria-haspopup="dialog"
      className={cn(
        'fixed z-40 flex items-center justify-center',
        'rounded-full border-2 border-white/20',
        'bg-gradient-to-br from-primary to-primary-hover',
        'text-primary-foreground',
        'shadow-[0_4px_16px_rgba(122,201,67,0.3),0_8px_24px_rgba(0,0,0,0.12)]',
        'transition-all duration-250 ease-out',
        'hover:scale-108 hover:shadow-[0_6px_24px_rgba(122,201,67,0.4),0_12px_32px_rgba(0,0,0,0.16)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'active:scale-95',
        'bottom-7 right-6 h-16 w-16',
        isVisible && 'opacity-0 pointer-events-none scale-80',
        showBounce && 'animate-toggle-bounce'
      )}
    >
      <Sparkles className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}