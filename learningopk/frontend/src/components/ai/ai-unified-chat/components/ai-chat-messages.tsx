'use client';

import { useRef, useEffect, useCallback, useState, type ReactNode, type Ref } from 'react';
import { Sparkles, User, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { StreamingText } from '@/components/common/streaming-text';
import { AddToNotesDialog } from '@/components/notes/add-to-notes-dialog';
import type { ChatMessage } from '../types';

type AIChatMessagesProps = {
  messages: ChatMessage[];
  isStreaming: boolean;
  /** Optional node rendered above all messages (e.g. crisis banner). */
  topBanner?: ReactNode;
  className?: string;
  containerRef?: Ref<HTMLDivElement>;
};

function StreamingIndicator({ className }: { className?: string }) {
  return (
    <div 
      className={cn('flex items-center gap-1.5 px-1', className)} 
      aria-label="AI is typing" 
      role="status"
    >
      <span className="h-2 w-2 animate-streaming rounded-full bg-accent-primary/60" />
      <span className="h-2 w-2 animate-streaming rounded-full bg-accent-primary/60 [animation-delay:0.16s]" />
      <span className="h-2 w-2 animate-streaming rounded-full bg-accent-primary/60 [animation-delay:0.32s]" />
    </div>
  );
}

function MessageBubble({ 
  message, 
  isStreaming, 
  showAvatar,
  isFirstInGroup,
  isLastInGroup,
  onAddToNotes,
}: { 
  message: ChatMessage; 
  isStreaming: boolean; 
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onAddToNotes?: (content: string) => void;
}) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content;
  
  return (
    <div
      className={cn(
        'group/msg flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isFirstInGroup ? 'mt-4' : 'mt-1'
      )}
    >
      {showAvatar && (
        <div 
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            isUser 
              ? 'bg-accent-primary text-primary-foreground' 
              : 'bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20'
          )}
        >
          {isUser ? (
            <User className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      )}
      
      {!showAvatar && <div className="w-8 shrink-0" />}
      
      <div className="max-w-[85%]">
        <article
          className={cn(
            'animate-message-in',
            'px-4 py-2.5',
            'text-[15px] leading-relaxed',
            isUser
              ? [
                  'bg-accent-primary text-primary-foreground',
                  isFirstInGroup && 'rounded-2xl rounded-br-md',
                  !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-br-md',
                  !isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-br-sm rounded-tr-sm',
                ]
              : [
                  'bg-bg-subtle/50 text-text-primary border border-border-default/50',
                  isFirstInGroup && 'rounded-2xl rounded-bl-md',
                  !isFirstInGroup && isLastInGroup && 'rounded-2xl rounded-bl-md',
                  !isFirstInGroup && !isLastInGroup && 'rounded-2xl rounded-bl-sm rounded-tl-sm',
                ]
          )}
          aria-label={message.content 
            ? `${isUser ? 'You' : 'AI Tutor'}: ${message.content.slice(0, 50)}…`
            : `${isUser ? 'You' : 'AI Tutor'}`}
        >
          {isUser ? (
            <div className="break-words [overflow-wrap:anywhere]">{message.content}</div>
          ) : isStreaming && isEmpty ? (
            <StreamingIndicator />
          ) : isStreaming ? (
            <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
              <StreamingText
                content={message.content}
                isStreaming
                className="text-[15px] leading-relaxed"
              />
            </div>
          ) : (
            <div className="[overflow-wrap:anywhere] [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
              <MarkdownRenderer
                content={message.content}
                className="text-[15px] leading-relaxed"
              />
            </div>
          )}
        </article>

        {/* Add to Notes action for assistant messages */}
        {!isUser && !isStreaming && message.content && onAddToNotes ? (
          <div className="mt-1 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100">
            <button
              type="button"
              onClick={() => onAddToNotes(message.content)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
              aria-label="Save this response to notes"
            >
              <NotebookPen className="h-3 w-3" />
              Add to Notes
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AIChatMessages({ messages, isStreaming, topBanner, className, containerRef }: AIChatMessagesProps) {
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [noteContent, setNoteContent] = useState('');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const handleAddToNotes = useCallback((content: string) => {
    setNoteContent(content);
    setNotesDialogOpen(true);
  }, []);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    internalContainerRef.current = node;

    if (!containerRef) return;

    if (typeof containerRef === 'function') {
      containerRef(node);
      return;
    }

    containerRef.current = node;
  }, [containerRef]);
  
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isStreaming]);
  
  if (messages.length === 0) {
    return null;
  }
  
  return (
    <>
      <div
        ref={setContainerRef}
        className={cn(
          'flex-1 overflow-y-auto',
          'px-4 py-4',
          'scrollbar-thin scrollbar-thumb-border-default scrollbar-track-transparent',
          className
        )}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
      >
        {topBanner}
        <div className="space-y-0">
          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];
            
            const isFirstInGroup = index === 0 || prevMessage?.role !== message.role;
            const isLastInGroup = index === messages.length - 1 || nextMessage?.role !== message.role;
            const shouldShowAvatar = isFirstInGroup;
            const isMessageStreaming = isStreaming && message.id === messages[messages.length - 1]?.id;
            
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isMessageStreaming}
                showAvatar={shouldShowAvatar}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                onAddToNotes={handleAddToNotes}
              />
            );
          })}
        </div>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <AddToNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        initialContent={noteContent}
        suggestedTitle="AI Tutor Note"
      />
    </>
  );
}
