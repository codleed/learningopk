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
  SUMMARY_READ: 15,
  EXERCISE_COMPLETE: 5,
  EXERCISE_MEDIUM: 10,
  EXERCISE_HARD: 15,
  EXERCISE_BONUS_ALL: 50,
  FLASHCARD_REVIEW: 5,
  FLASHCARD_KNOWN: 15,
  FLASHCARD_BONUS_ALL: 30,
  QUIZ_COMPLETE: 50,
  QUIZ_HIGH_SCORE: 50,
  QUIZ_PERFECT: 100,
  DAILY_LOGIN_BONUS: 10,
  STREAK_BONUS_3_DAYS: 25,
  STREAK_BONUS_7_DAYS: 75,
  STREAK_BONUS_30_DAYS: 200,
} as const;

/**
 * Level definitions — mirrors the backend LEVEL_THRESHOLDS exactly.
 * Each level has a tier for UI color coding:
 *   bronze (0-2), silver (3-4), gold (5-6), platinum (7-8), diamond (9-10)
 */
export type LevelTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface LevelDefinition {
  level: number;
  name: string;
  minXp: number;
  tier: LevelTier;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 0, name: "Newcomer", minXp: 0, tier: "bronze" },
  { level: 1, name: "Learner", minXp: 50, tier: "bronze" },
  { level: 2, name: "Explorer", minXp: 150, tier: "bronze" },
  { level: 3, name: "Achiever", minXp: 350, tier: "silver" },
  { level: 4, name: "Scholar", minXp: 600, tier: "silver" },
  { level: 5, name: "Expert", minXp: 1000, tier: "gold" },
  { level: 6, name: "Master", minXp: 1500, tier: "gold" },
  { level: 7, name: "Champion", minXp: 2200, tier: "platinum" },
  { level: 8, name: "Legend", minXp: 3000, tier: "platinum" },
  { level: 9, name: "Genius", minXp: 4000, tier: "diamond" },
  { level: 10, name: "Board Topper", minXp: 5500, tier: "diamond" },
];

/** Utility: look up a level definition by level number. */
export function getLevelDefinition(level: number): LevelDefinition {
  return LEVEL_DEFINITIONS[level] ?? LEVEL_DEFINITIONS[0] ?? { level: 0, name: "Newcomer", minXp: 0, tier: "bronze" as const };
}

/** Utility: compute level from raw XP total. */
export function computeLevelFromXp(xp: number): LevelDefinition {
  let found: LevelDefinition = LEVEL_DEFINITIONS[0] ?? { level: 0, name: "Newcomer", minXp: 0, tier: "bronze" as const };
  for (const def of LEVEL_DEFINITIONS) {
    if (xp >= def.minXp) found = def;
  }
  return found;
}

/** Tier-based color CSS variables / Tailwind classes. */
export const TIER_COLORS: Record<LevelTier, {
  badge: string;
  badgeBg: string;
  text: string;
  progress: string;
  glow: string;
}> = {
  bronze: {
    badge: "text-orange-700 dark:text-orange-300",
    badgeBg: "bg-orange-100 dark:bg-orange-900/30 border-orange-300/50 dark:border-orange-600/40",
    text: "text-orange-600 dark:text-orange-400",
    progress: "from-orange-400 to-amber-500",
    glow: "shadow-orange-400/20",
  },
  silver: {
    badge: "text-slate-700 dark:text-slate-200",
    badgeBg: "bg-slate-100 dark:bg-slate-800/40 border-slate-300/50 dark:border-slate-600/40",
    text: "text-slate-600 dark:text-slate-300",
    progress: "from-slate-400 to-blue-400",
    glow: "shadow-slate-400/20",
  },
  gold: {
    badge: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-50 dark:bg-amber-900/30 border-amber-300/50 dark:border-amber-600/40",
    text: "text-amber-600 dark:text-amber-400",
    progress: "from-amber-400 to-yellow-500",
    glow: "shadow-amber-400/25",
  },
  platinum: {
    badge: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300/50 dark:border-indigo-600/40",
    text: "text-indigo-600 dark:text-indigo-400",
    progress: "from-indigo-400 to-purple-500",
    glow: "shadow-indigo-400/25",
  },
  diamond: {
    badge: "text-cyan-700 dark:text-cyan-200",
    badgeBg: "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300/50 dark:border-cyan-600/40",
    text: "text-cyan-600 dark:text-cyan-300",
    progress: "from-cyan-400 to-blue-500",
    glow: "shadow-cyan-400/30",
  },
};
