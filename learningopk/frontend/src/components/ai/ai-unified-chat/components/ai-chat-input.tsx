'use client';

import { useRef, useCallback, type FormEvent, type ChangeEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Loader2, CornerDownLeft } from 'lucide-react';
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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
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
    <div className={cn('px-4 py-3 border-t border-border/50 bg-card/50', className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'relative flex items-end gap-2',
            'rounded-2xl',
            'bg-background',
            'border border-border/60',
            'shadow-sm',
            'transition-all duration-200',
            'focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-md',
            isSending && 'opacity-80'
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
              'bg-transparent',
              'px-4 py-3.5 pr-12',
              'text-[15px] text-foreground placeholder:text-muted-foreground/60',
              'outline-none',
              'disabled:cursor-not-allowed',
              'min-h-[52px] max-h-[160px]'
            )}
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!value.trim() || isSending}
            className={cn(
              'absolute right-2 bottom-2',
              'flex h-9 w-9 items-center justify-center',
              'rounded-xl',
              'bg-primary text-primary-foreground',
              'shadow-sm',
              'transition-all duration-200',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
              'hover:bg-primary-hover hover:shadow-md hover:scale-105',
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
      <div className="mt-2 flex items-center justify-center gap-4">
        <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
          <CornerDownLeft className="h-3 w-3" />
          Enter to send
        </p>
        <span className="text-muted-foreground/30">|</span>
        <p className="text-[11px] text-muted-foreground/60">
          {isSending ? 'AI is thinking...' : 'Shift + Enter for new line'}
        </p>
      </div>
    </div>
  );
}
