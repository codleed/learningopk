'use client';

import { useRef, useCallback, type FormEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type AIChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSending: boolean;
  placeholder?: string;
  className?: string;
};

export function AIChatInput({
  value,
  onChange,
  onSubmit,
  isSending,
  placeholder = 'Ask a question...',
  className,
}: AIChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);
  
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      adjustTextareaHeight();
    },
    [onChange, adjustTextareaHeight]
  );
  
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, value]
  );
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  
  return (
    <div className={cn('px-4 py-3', className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'flex items-end gap-2',
            'rounded-2xl border border-border bg-card',
            'px-1 py-1',
            'shadow-[0_4px_24px_rgba(0,0,0,0.08)]',
            'transition-all duration-150',
            'focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isSending}
            className={cn(
              'flex-1 resize-none',
              'rounded-xl bg-transparent',
              'px-3 py-2.5',
              'text-[15px] text-foreground',
              'outline-none placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            style={{ minHeight: '44px', maxHeight: '200px' }}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!value.trim() || isSending}
            className={cn(
              'm-1 flex h-9 w-9 shrink-0 items-center justify-center',
              'rounded-full bg-primary text-primary-foreground',
              'shadow-sm',
              'transition-all duration-150',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'hover:bg-primary-hover hover:shadow-md',
              'active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
            )}
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {isSending ? 'Streaming response...' : 'Responses are Socratic and concise.'}
      </p>
    </div>
  );
}
