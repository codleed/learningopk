'use client';

import { Sparkles, Lightbulb, HelpCircle, Brain, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type Suggestion = {
  icon: typeof Lightbulb;
  title: string;
  description: string;
  prompt: string;
};

type AIChatEmptyStateProps = {
  suggestions: Suggestion[];
  onSuggestionClick: (prompt: string) => void;
  className?: string;
};

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    icon: Lightbulb,
    title: 'Explain a concept',
    description: 'Get a clear breakdown',
    prompt: 'Explain this concept in simple terms:',
  },
  {
    icon: HelpCircle,
    title: 'Help with exercises',
    description: 'Step-by-step guidance',
    prompt: 'Help me work through this exercise:',
  },
  {
    icon: Brain,
    title: 'Quiz yourself',
    description: 'Test your understanding',
    prompt: 'Quiz me on this topic:',
  },
  {
    icon: BookOpen,
    title: 'Summarize key points',
    description: 'Get the main ideas',
    prompt: 'Summarize the key points:',
  },
];

export function AIChatEmptyState({ 
  suggestions = DEFAULT_SUGGESTIONS, 
  onSuggestionClick = () => {},
  className 
}: AIChatEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-12', className)}>
      {/* Icon */}
      <Sparkles 
        className="mb-4 h-12 w-12 text-primary opacity-90" 
        aria-hidden="true" 
      />
      
      {/* Title */}
      <h2 className="mb-3 text-center font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">
        How can I help you?
      </h2>
      
      {/* Subtitle */}
      <p className="mb-8 max-w-[360px] text-center text-[15px] text-muted-foreground">
        Ask about concepts, get help with exercises, or test your knowledge.
      </p>
      
      {/* Suggestion cards */}
      <div className="grid w-full max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <button
              key={suggestion.title}
              type="button"
              onClick={() => onSuggestionClick(suggestion.prompt)}
              className={cn(
                'flex items-start gap-3',
                'w-full px-4 py-3',
                'rounded-2xl',
                'border border-border bg-card',
                'text-left',
                'transition-all duration-200',
                'hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                'active:translate-y-0 active:shadow-sm'
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {suggestion.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {suggestion.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
