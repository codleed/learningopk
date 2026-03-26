'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAIChatContext } from './ai-chat-context';
import { AIChatHeader } from './components/ai-chat-header';
import { AIChatMessages } from './components/ai-chat-messages';
import { AIChatInput } from './components/ai-chat-input';
import { AIChatEmptyState } from './components/ai-chat-empty-state';

type AIChatSidebarProps = {
  onHide: () => void;
  className?: string;
};

export function AIChatSidebar({ onHide, className }: AIChatSidebarProps) {
  const {
    messages,
    isStreaming,
    isSending,
    isExpanded,
    error,
    isVisible,
    sendMessage,
    clearError,
    toggleExpanded,
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
        'fixed right-0 top-0 bottom-0',
        'bg-card',
        'border-l border-border/50',
        'overflow-hidden',
        'h-screen max-h-screen',
        'transition-all duration-300 ease-out',
        'z-30',
        isExpanded ? 'w-[calc(100vw-16rem)]' : 'w-[380px]',
        className
      )}
      aria-label="AI Chat Sidebar"
    >
      <AIChatHeader 
        variant="sidebar" 
        isExpanded={isExpanded}
        onHide={onHide}
        onExpand={toggleExpanded}
      />
      
      {messages.length === 0 ? (
        <AIChatEmptyState
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
        <div className="mx-4 mb-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="text-xs text-destructive/80 hover:text-destructive underline mt-1.5 transition-colors"
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
