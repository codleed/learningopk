'use client';

import { cn } from '@/lib/utils';

type Suggestion = {
  title: string;
  prompt: string;
};

type AIChatEmptyStateProps = {
  suggestions?: Suggestion[];
  onSuggestionClick?: (prompt: string) => void;
  className?: string;
};

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    title: 'Explain this chapter',
    prompt: 'Explain this chapter:',
  },
  {
    title: 'Quiz me on key concepts',
    prompt: 'Quiz me on key concepts:',
  },
  {
    title: 'Help me with exercises',
    prompt: 'Help me with exercises:',
  },
  {
    title: 'Summarize key points',
    prompt: 'Summarize key points:',
  },
];

export function AIChatEmptyState({ 
  suggestions = DEFAULT_SUGGESTIONS, 
  onSuggestionClick = () => {},
  className 
}: AIChatEmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'px-5 py-8',
      'flex-1',
      className
    )}>
      <h2 className="text-center font-medium text-lg text-foreground mb-8">
        How can I help you today?
      </h2>
      
      <div className="grid w-full max-w-full grid-cols-1 gap-2">
        {suggestions.map((suggestion, index) => {
          return (
            <button
              key={suggestion.title}
              type="button"
              onClick={() => onSuggestionClick(suggestion.prompt)}
              className={cn(
                'group flex items-center justify-between',
                'w-full px-4 py-3',
                'rounded-lg',
                'border border-border/60 bg-muted/30',
                'text-left',
                'transition-all duration-200',
                'hover:border-primary/40 hover:bg-primary/[0.03]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                'active:scale-[0.98]'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm text-foreground">
                {suggestion.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
