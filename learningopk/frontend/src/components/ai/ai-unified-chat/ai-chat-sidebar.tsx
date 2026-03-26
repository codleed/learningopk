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

type AIChatSidebarProps = {
  context?: AIContext | null;
  className?: string;
};

const SUGGESTIONS = [
  { icon: Lightbulb, title: 'Explain', description: 'Get clarity', prompt: 'Explain this concept:' },
  { icon: HelpCircle, title: 'Help', description: 'Get guidance', prompt: 'Help me with:' },
  { icon: Brain, title: 'Quiz', description: 'Test yourself', prompt: 'Quiz me on:' },
  { icon: BookOpen, title: 'Summarize', description: 'Get key points', prompt: 'Summarize:' },
];

export function AIChatSidebar({ context, className }: AIChatSidebarProps) {
  const {
    messages,
    sessionId,
    isStreaming,
    isSending,
    isExpanded,
    error,
    isHistoryOpen,
    isVisible,
    sendMessage,
    startNewSession,
    toggleHistory,
    toggleExpanded,
    clearError,
  } = useAIChatContext();
  
  const [inputValue, setInputValue] = useState('');
  
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
    <aside
      className={cn(
        'flex flex-col',
        'rounded-2xl border border-border bg-card',
        'shadow-[var(--elevation-card,_0_4px_24px_rgba(0,0,0,0.08))]',
        'xl:sticky xl:top-4 xl:self-start',
        isExpanded
          ? 'h-[calc(100vh-2.5rem)] min-h-[calc(100vh-2.5rem)] w-[480px]'
          : 'h-[32rem] min-h-[32rem] w-[400px]',
        'transition-all duration-300',
        className
      )}
      aria-label="AI Chat Sidebar"
    >
      <AIChatHeader
        context={context ?? null}
        sessionId={sessionId}
        isExpanded={isExpanded}
        isHistoryOpen={isHistoryOpen}
        variant="sidebar"
        onToggleHistory={toggleHistory}
        onNewSession={startNewSession}
        onToggleExpanded={toggleExpanded}
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
    </aside>
  );
}
