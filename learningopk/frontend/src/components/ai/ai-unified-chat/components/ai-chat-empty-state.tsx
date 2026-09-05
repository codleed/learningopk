"use client";

import { useMemo } from "react";
import {
  Calculator,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  ClipboardList,
  Dumbbell,
  BookOpen,
  Brain,
  FileQuestion,
  FlaskConical,
  Landmark,
  Languages,
  NotebookPen,
  ScrollText,
  Sigma,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIChatContext } from "../ai-chat-context";
import type { AIContext } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Suggestion = {
  title?: string;
  label?: string;
  prompt: string;
  icon?: LucideIcon;
};

type StarterCategory = {
  label: string;
  icon: LucideIcon;
  starters: Suggestion[];
};

type AIChatEmptyStateProps = {
  /** Flat suggestions override — kept for backward compatibility */
  suggestions?: Suggestion[];
  /** When provided, shows context-aware starters for the current chapter */
  context?: AIContext | null;
  onSuggestionClick?: (prompt: string) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Pakistani Curriculum Starters (general / full-page mode)
// ---------------------------------------------------------------------------

const GENERAL_STARTER_CATEGORIES: StarterCategory[] = [
  {
    label: "Exam Prep",
    icon: GraduationCap,
    starters: [
      {
        label: "Math past-paper help",
        prompt:
          "Show me how to solve a Matric or O Level mathematics question step by step, like in a board exam.",
        icon: Calculator,
      },
      {
        label: "Physics important questions",
        prompt:
          "Give me the most important Physics questions students should revise for FBISE, Punjab, Sindh, KPK, or Balochistan board exams.",
        icon: FileQuestion,
      },
      {
        label: "Quick revision notes",
        prompt:
          "Make short revision notes for a Pakistani board or Cambridge exam so I can revise one chapter quickly.",
        icon: ScrollText,
      },
    ],
  },
  {
    label: "Concept Help",
    icon: Lightbulb,
    starters: [
      {
        label: "Physics in simple words",
        prompt:
          "Explain a difficult Physics concept in simple words with daily-life examples a Class 9-12 student in Pakistan can understand.",
        icon: Brain,
      },
      {
        label: "Chemistry step by step",
        prompt:
          "Break down a Chemistry topic step by step, especially reactions and formulas that usually confuse board students.",
        icon: FlaskConical,
      },
      {
        label: "English / Urdu meaning",
        prompt:
          "Help me understand an English, Urdu, Islamiat, or Pakistan Studies topic in easy language with key points.",
        icon: Languages,
      },
    ],
  },
  {
    label: "Study Tips",
    icon: ClipboardList,
    starters: [
      {
        label: "Revision plan",
        prompt:
          "Create a realistic revision timetable for a Pakistani board or Cambridge student preparing for exams in the next few weeks.",
        icon: NotebookPen,
      },
      {
        label: "Remember formulas",
        prompt:
          "Give me smart study tips to remember Mathematics and Physics formulas without just cramming.",
        icon: Sigma,
      },
      {
        label: "Paper-time strategy",
        prompt:
          "How should I manage time in a board paper so I can finish long answers, MCQs, and numericals calmly?",
        icon: Target,
      },
    ],
  },
  {
    label: "Practice",
    icon: Dumbbell,
    starters: [
      {
        label: "Math practice set",
        prompt:
          "Give me 5 practice questions for Mathematics, from easy to hard, like a Pakistani board or Cambridge paper.",
        icon: Calculator,
      },
      {
        label: "Quiz me",
        prompt:
          "Quiz me on Biology, Pakistan Studies, Islamiat, or Computer Science and check my answers one by one.",
        icon: CheckCircle2,
      },
      {
        label: "Flashcards",
        prompt:
          "Make short flashcards for a chapter from Biology, Chemistry, English, or Urdu for quick practice.",
        icon: BookOpen,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Context-aware starters (sidebar / drawer — chapter is known)
// ---------------------------------------------------------------------------

function buildContextStarters(ctx: AIContext): StarterCategory[] {
  const { chapterTitle, subjectName, boardName, className: gradeName } = ctx;
  const short = chapterTitle.length > 40 ? `${chapterTitle.slice(0, 37)}...` : chapterTitle;
  const contextLine = `${boardName} ${gradeName} ${subjectName}`;

  return [
    {
      label: "Exam Prep",
      icon: GraduationCap,
      starters: [
        {
          label: "Important questions",
          prompt: `Act like a ${boardName} examiner and list the most important questions from "${chapterTitle}" for ${gradeName} ${subjectName}, with short answering tips.`,
          icon: FileQuestion,
        },
        {
          label: "Quick revision",
          prompt: `Make quick revision notes for "${chapterTitle}" for ${contextLine}, focusing on what is most likely to help in exam prep.`,
          icon: ScrollText,
        },
        {
          label: "Past-paper style",
          prompt: `Give me 3 past-paper style questions from "${chapterTitle}" for ${contextLine}, and tell me what a strong answer should include.`,
          icon: GraduationCap,
        },
      ],
    },
    {
      label: "Concept Help",
      icon: Lightbulb,
      starters: [
        {
          label: `Explain ${short}`,
          prompt: `Explain "${chapterTitle}" in simple words for a ${gradeName} student studying ${subjectName} under ${boardName}.`,
          icon: Brain,
        },
        {
          label: "Key concepts",
          prompt: `What are the key concepts, formulas, or definitions I must understand in "${chapterTitle}" for ${contextLine}?`,
          icon: Lightbulb,
        },
        {
          label: "Examples that make sense",
          prompt: `Teach me "${chapterTitle}" with easy examples and common student mistakes for ${contextLine}.`,
          icon: Landmark,
        },
      ],
    },
    {
      label: "Study Tips",
      icon: ClipboardList,
      starters: [
        {
          label: "Study plan for this chapter",
          prompt: `Make a short study plan to finish "${chapterTitle}" well for ${contextLine}, including revision and self-testing.`,
          icon: NotebookPen,
        },
        {
          label: "Remember better",
          prompt: `Give me memory tricks, revision tips, and a smart way to remember the important points from "${chapterTitle}" in ${subjectName}.`,
          icon: Sigma,
        },
        {
          label: "Avoid common mistakes",
          prompt: `What common mistakes do students make in "${chapterTitle}" for ${boardName}, and how can I avoid them in exams?`,
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Practice",
      icon: Dumbbell,
      starters: [
        {
          label: "Chapter quiz",
          prompt: `Quiz me on "${chapterTitle}" for ${contextLine}. Ask one question at a time and wait for my answer.`,
          icon: CheckCircle2,
        },
        {
          label: "Practice questions",
          prompt: `Create 5 practice questions from "${chapterTitle}" for ${contextLine}, from easy to hard.`,
          icon: Calculator,
        },
        {
          label: "Exercise help",
          prompt: `Help me solve questions from "${chapterTitle}" step by step without skipping the reasoning.`,
          icon: Dumbbell,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Legacy flat-list fallback (used when `suggestions` prop is passed directly)
// ---------------------------------------------------------------------------

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  {
    label: "Math past-paper help",
    prompt:
      "Show me how to solve a Matric or O Level mathematics question step by step, like in a board exam.",
    icon: Calculator,
  },
  {
    label: "Physics in simple words",
    prompt:
      "Explain a difficult Physics concept in simple words with daily-life examples a Class 9-12 student in Pakistan can understand.",
    icon: Brain,
  },
  {
    label: "Revision plan",
    prompt:
      "Create a realistic revision timetable for a Pakistani board or Cambridge student preparing for exams in the next few weeks.",
    icon: NotebookPen,
  },
  {
    label: "Math practice set",
    prompt:
      "Give me 5 practice questions for Mathematics, from easy to hard, like a Pakistani board or Cambridge paper.",
    icon: Calculator,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StarterButton({
  suggestion,
  index,
  onSuggestionClick,
}: {
  suggestion: Suggestion;
  index: number;
  onSuggestionClick: (prompt: string) => void;
}) {
  const Icon = suggestion.icon ?? BookOpen;
  const label = suggestion.label ?? suggestion.title ?? suggestion.prompt;

  return (
    <button
      type="button"
      onClick={() => onSuggestionClick(suggestion.prompt)}
      className={cn(
        "group flex items-start gap-3",
        "w-full px-4 py-3",
        "rounded-lg",
        "border border-border-default/60 bg-bg-subtle/30",
        "text-left",
        "transition-all duration-200",
        "hover:border-accent-primary/40 hover:bg-accent-primary/[0.03]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "active:scale-[0.98]"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 space-y-1">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        <span className="block text-xs leading-5 text-text-secondary">{suggestion.prompt}</span>
      </span>
    </button>
  );
}

function getStarterKey(suggestion: Suggestion): string {
  return suggestion.label ?? suggestion.title ?? suggestion.prompt;
}

function CategorySection({
  category,
  startIndex,
  onSuggestionClick,
}: {
  category: StarterCategory;
  startIndex: number;
  onSuggestionClick: (prompt: string) => void;
}) {
  const Icon = category.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {category.label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {category.starters.map((starter, i) => (
          <StarterButton
            key={getStarterKey(starter)}
            suggestion={starter}
            index={startIndex + i}
            onSuggestionClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AIChatEmptyState({
  suggestions,
  context,
  onSuggestionClick = () => {},
  className,
}: AIChatEmptyStateProps) {
  const { context: providerContext } = useAIChatContext();
  const resolvedContext = context ?? providerContext;

  // Decide which starters to show:
  // 1. If explicit `suggestions` prop is passed → use flat list (backward compat)
  // 2. If `context` is available → context-aware starters
  // 3. Otherwise → general Pakistani curriculum starters (categorized)
  const categories = useMemo<StarterCategory[] | null>(() => {
    if (suggestions) return null; // flat-list mode
    if (resolvedContext) return buildContextStarters(resolvedContext);
    return GENERAL_STARTER_CATEGORIES;
  }, [suggestions, resolvedContext]);

  const flatSuggestions = suggestions ?? DEFAULT_SUGGESTIONS;

  // ---------- Categorized layout ----------
  if (categories) {
    let runningIndex = 0;

    return (
      <div
        className={cn(
          "flex flex-col items-center",
          "px-5 py-8",
          "flex-1 min-h-0 overflow-y-auto",
          className
        )}
      >
        <div className="mb-6 flex items-center gap-2 shrink-0">
          <BookOpen className="h-5 w-5 text-accent-primary" aria-hidden="true" />
          <h2 className="text-center font-medium text-lg text-text-primary">
            {resolvedContext
              ? `Ask about "${resolvedContext.chapterTitle}"`
              : "How can I help you study?"}
          </h2>
        </div>

        <div className="w-full max-w-full space-y-5">
          {categories.map((cat) => {
            const sectionStart = runningIndex;
            runningIndex += cat.starters.length;
            return (
              <CategorySection
                key={cat.label}
                category={cat}
                startIndex={sectionStart}
                onSuggestionClick={onSuggestionClick}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ---------- Flat-list layout (backward compat when suggestions prop is passed) ----------
  return (
    <div
      className={cn(
        "flex flex-col items-center",
        "px-5 py-8",
        "flex-1 min-h-0 overflow-y-auto",
        className
      )}
    >
      <h2 className="text-center font-medium text-lg text-text-primary mb-8">
        How can I help you study?
      </h2>

      <div className="grid w-full max-w-full grid-cols-1 gap-2">
        {flatSuggestions.map((suggestion, index) => (
          <StarterButton
            key={getStarterKey(suggestion)}
            suggestion={suggestion}
            index={index}
            onSuggestionClick={onSuggestionClick}
          />
        ))}
      </div>
    </div>
  );
}
