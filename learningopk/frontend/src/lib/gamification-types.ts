// frontend/src/lib/gamification-types.ts
export type BadgeId = 
  | "first_steps"
  | "scholar"
  | "problem_solver"
  | "memory_master"
  | "quiz_champion"
  | "streak_starter"
  | "streak_warrior"
  | "subject_master";

export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  first_steps: { id: "first_steps", name: "First Steps", description: "Complete your first quest", icon: "🚀", criteria: "Complete first chapter" },
  scholar: { id: "scholar", name: "Scholar", description: "Read all summaries in a subject", icon: "📚", criteria: "Read all chapter summaries" },
  problem_solver: { id: "problem_solver", name: "Problem Solver", description: "Complete 50 exercises", icon: "🧩", criteria: "Solve 50 exercises" },
  memory_master: { id: "memory_master", name: "Memory Master", description: "Know 100 flashcards", icon: "🧠", criteria: "Mark 100 flashcards as known" },
  quiz_champion: { id: "quiz_champion", name: "Quiz Champion", description: "Score 100% on 5 quizzes", icon: "🏆", criteria: "Perfect score on 5 quizzes" },
  streak_starter: { id: "streak_starter", name: "Streak Starter", description: "Maintain 7-day streak", icon: "🔥", criteria: "7 day study streak" },
  streak_warrior: { id: "streak_warrior", name: "Streak Warrior", description: "Maintain 30-day streak", icon: "💪", criteria: "30 day study streak" },
  subject_master: { id: "subject_master", name: "Subject Master", description: "Complete all chapters", icon: "⭐", criteria: "Complete all chapters in subject" },
};

export type CardStatus = "new" | "learning" | "known" | "review";

export interface XpReward {
  id: string;
  amount: number;
  reason: string;
  timestamp: number;
}

export interface ChapterProgress {
  summaryRead: boolean;
  exercisesCompleted: number[];
  flashcardsReviewed: Record<string, CardStatus>;
  quizAttempts: QuizAttempt[];
  xpEarned: number;
}

export interface QuizAttempt {
  score: number;
  percentage: number;
  completedAt: string;
}

export interface GamificationState {
  xp: number;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  unlockedBadges: BadgeId[];
  chapterProgress: Record<string, ChapterProgress>;
}

export const XP_REWARDS = {
  SUMMARY_READ: 10,
  EXERCISE_COMPLETE: 15,
  EXERCISE_MEDIUM: 20,
  EXERCISE_HARD: 25,
  EXERCISE_BONUS_ALL: 50,
  FLASHCARD_REVIEW: 5,
  FLASHCARD_KNOWN: 10,
  FLASHCARD_BONUS_ALL: 30,
  QUIZ_COMPLETE: 40,
  QUIZ_HIGH_SCORE: 50,
  QUIZ_PERFECT: 100,
} as const;
