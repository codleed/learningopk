'use client';

import { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownMathRenderer } from '@/components/learn/markdown-math-renderer';
import type { ChatMessage } from '../types';

type AIChatMessagesProps = {
  messages: ChatMessage[];
  isStreaming: boolean;
  className?: string;
};

function StreamingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1 px-1', className)}>
      <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground" />
      <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground [animation-delay:0.16s]" />
      <span className="h-1.5 w-1.5 animate-streaming rounded-full bg-muted-foreground [animation-delay:0.32s]" />
    </div>
  );
}

function MessageBubble({ 
  message, 
  isStreaming, 
  showAvatar 
}: { 
  message: ChatMessage; 
  isStreaming: boolean; 
  showAvatar: boolean;
}) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content;
  
  return (
    <article
      className={cn(
        'animate-message-in',
        isUser
          ? 'ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-[15px] text-primary-foreground'
          : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-[15px] text-foreground'
      )}
      aria-label={`${isUser ? 'You' : 'AI Tutor'}: ${message.content.slice(0, 50)}...`}
    >
      {!isUser && showAvatar && (
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </div>
        </div>
      )}
      
      {isUser ? (
        <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
      ) : isEmpty || isStreaming ? (
        <StreamingIndicator />
      ) : (
        <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
          <MarkdownMathRenderer
            content={message.content}
            forceWrap
            className="text-[15px] leading-relaxed [&_.katex-display]:overflow-x-visible"
          />
        </div>
      )}
    </article>
  );
}

export function AIChatMessages({ messages, isStreaming, className }: AIChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);
  
  if (messages.length === 0) {
    return null;
  }
  
  return (
    <div
      ref={containerRef}
      className={cn('flex-1 overflow-y-auto px-4 py-4', className)}
      role="log"
      aria-label="Conversation"
      aria-live="polite"
    >
      <div className="space-y-3">
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const shouldShowAvatar = message.role === 'assistant' && 
            (index === 0 || prevMessage?.role === 'user');
          const isConsecutiveSameRole = prevMessage?.role === message.role;
          const isMessageStreaming = isStreaming && message.id === messages[messages.length - 1]?.id;
          
          return (
            <div
              key={message.id}
              className={cn(isConsecutiveSameRole ? 'mt-1' : 'mt-4')}
            >
              <MessageBubble
                message={message}
                isStreaming={isMessageStreaming}
                showAvatar={shouldShowAvatar}
              />
            </div>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
}
