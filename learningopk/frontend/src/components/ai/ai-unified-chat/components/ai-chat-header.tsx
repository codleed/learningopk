// learningopk/frontend/src/components/ai/ai-unified-chat/components/ai-chat-header.tsx

'use client';

import { History, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AIContextChip } from './ai-context-chip';
import type { AIContext } from '../types';

type AIChatHeaderProps = {
  context: AIContext | null;
  sessionId: string | null;
  isExpanded?: boolean;
  isHistoryOpen: boolean;
  variant: 'sidebar' | 'drawer' | 'overlay';
  onToggleHistory: () => void;
  onNewSession: () => void;
  onToggleExpanded?: () => void;
  onClose?: () => void;
  className?: string;
};

export function AIChatHeader({
  context,
  sessionId,
  isExpanded = false,
  isHistoryOpen,
  variant,
  onToggleHistory,
  onNewSession,
  onToggleExpanded,
  onClose,
  className,
}: AIChatHeaderProps) {
  return (
    <header className={cn('border-b border-border px-4 py-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">
            AI Tutor
          </p>
          {context ? (
            <AIContextChip context={context} className="mt-1.5" />
          ) : (
            <p className="mt-1 text-base font-semibold text-foreground">
              General Chat
            </p>
          )}
        </div>
        
        {variant !== 'sidebar' && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close AI Chat"
            className="shrink-0"
          >
            ✕
          </Button>
        )}
      </div>
      
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNewSession}
        >
          New Chat
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleHistory}
          aria-pressed={isHistoryOpen}
        >
          <History className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
          History
        </Button>
        
        {variant === 'sidebar' && onToggleExpanded && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            aria-pressed={isExpanded}
            aria-label={isExpanded ? 'Restore sidebar size' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isExpanded ? 'Restore' : 'Expand'}
          </Button>
        )}
        
        {sessionId && (
          <p className="self-center text-xs text-muted-foreground">
            Session active
          </p>
        )}
      </div>
    </header>
  );
}
