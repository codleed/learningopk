'use client';

import { useState } from 'react';
import { Lightbulb, HelpCircle, Brain, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAIChatContext } from './ai-chat-context';
import { AIChatHeader } from './components/ai-chat-header';
import { AIChatMessages } from './components/ai-chat-messages';
import { AIChatInput } from './components/ai-chat-input';
import { AIChatEmptyState } from './components/ai-chat-empty-state';
import type { AIContext } from './types';

type AIChatDrawerProps = {
  context?: AIContext | null;
  onClose: () => void;
  className?: string;
};

const SUGGESTIONS = [
  { icon: Lightbulb, title: 'Explain', description: 'Get clarity', prompt: 'Explain this concept:' },
  { icon: HelpCircle, title: 'Help', description: 'Get guidance', prompt: 'Help me with:' },
  { icon: Brain, title: 'Quiz', description: 'Test yourself', prompt: 'Quiz me on:' },
  { icon: BookOpen, title: 'Summarize', description: 'Get key points', prompt: 'Summarize:' },
];

export function AIChatDrawer({ context, onClose, className }: AIChatDrawerProps) {
  const {
    messages,
    sessionId,
    isStreaming,
    isSending,
    error,
    isHistoryOpen,
    isVisible,
    sendMessage,
    startNewSession,
    toggleHistory,
    clearError,
  } = useAIChatContext();
  
  const [inputValue, setInputValue] = useState('');
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  if (!isVisible) return null;
  
  const handleSubmit = async () => {
    if (!inputValue.trim() || isSending) return;
    await sendMessage(inputValue);
    setInputValue('');
  };
  
  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
  };
  
  const placeholder = messages.length > 0 
    ? 'Ask a follow-up question...' 
    : 'Ask your first question...';
  
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 xl:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'h-[85dvh] rounded-t-2xl',
          'border-t border-border bg-card',
          'shadow-[0_-8px_32px_rgba(0,0,0,0.15)]',
          'animate-in slide-in-from-bottom duration-300',
          'xl:hidden',
          className
        )}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-label="AI Chat Drawer"
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        
        <div className="flex h-[calc(85dvh-2rem)] flex-col">
          <AIChatHeader
            context={context ?? null}
            sessionId={sessionId}
            isHistoryOpen={isHistoryOpen}
            variant="drawer"
            onToggleHistory={toggleHistory}
            onNewSession={startNewSession}
            onClose={onClose}
          />
          
          {messages.length === 0 ? (
            <AIChatEmptyState
              suggestions={SUGGESTIONS}
              onSuggestionClick={handleSuggestionClick}
              className="flex-1"
            />
          ) : (
            <AIChatMessages
              messages={messages}
              isStreaming={isStreaming}
              className="flex-1"
            />
          )}
          
          {error && (
            <div className="mx-4 mb-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-sm text-destructive">{error}</p>
              <button
                type="button"
                onClick={clearError}
                className="text-xs text-destructive underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
          
          <AIChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            isSending={isSending}
            placeholder={placeholder}
            className="flex-shrink-0"
          />
        </div>
      </div>
    </>
  );
}
