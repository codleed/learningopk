export const PKT_TIMEZONE = "Asia/Karachi";
export const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const STREAK_WAGER_MIN_XP = 25;
export const STREAK_WAGER_MAX_XP = 100;
export const STREAK_WAGER_CHAPTER_TARGET = 3;
export const STREAK_WAGER_QUIZ_TARGET = 1;
export const STREAK_AT_RISK_HOUR_PKT = 20;

const pad = (value: number): string => String(value).padStart(2, "0");

export const getPktDateKey = (date: Date): string => {
  const shifted = new Date(date.getTime() + PKT_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
};

export const getPktHour = (date: Date): number => {
  const shifted = new Date(date.getTime() + PKT_OFFSET_MS);
  return shifted.getUTCHours();
};

export const getPktDayBounds = (dateKey: string): { startUtc: Date; endUtc: Date } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid PKT date key: ${dateKey}`);
  }

  const [, year, month, day] = match;
  const startUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0) - PKT_OFFSET_MS);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
};

export const getCurrentPktContext = (now: Date = new Date()) => {
  const todayKey = getPktDateKey(now);
  const { startUtc, endUtc } = getPktDayBounds(todayKey);

  return {
    now,
    todayKey,
    pktHour: getPktHour(now),
    dayStartUtc: startUtc,
    nextDayStartUtc: endUtc
  };
};

export type DailyGoalProgress = {
  dateKey: string;
  chaptersCompleted: number;
  chaptersTarget: number;
  quizzesCompleted: number;
  quizzesTarget: number;
  completed: boolean;
  percent: number;
};

export const buildDailyGoalProgress = (input: {
  dateKey: string;
  chaptersCompleted: number;
  quizzesCompleted: number;
}): DailyGoalProgress => {
  const totalTarget = STREAK_WAGER_CHAPTER_TARGET + STREAK_WAGER_QUIZ_TARGET;
  const totalDone =
    Math.min(input.chaptersCompleted, STREAK_WAGER_CHAPTER_TARGET) +
    Math.min(input.quizzesCompleted, STREAK_WAGER_QUIZ_TARGET);

  return {
    dateKey: input.dateKey,
    chaptersCompleted: input.chaptersCompleted,
    chaptersTarget: STREAK_WAGER_CHAPTER_TARGET,
    quizzesCompleted: input.quizzesCompleted,
    quizzesTarget: STREAK_WAGER_QUIZ_TARGET,
    completed: input.chaptersCompleted >= STREAK_WAGER_CHAPTER_TARGET && input.quizzesCompleted >= STREAK_WAGER_QUIZ_TARGET,
    percent: Math.round((totalDone / totalTarget) * 100)
  };
};

export const calculateStreakWagerBonus = (amount: number): number => Math.round(amount * 0.5);

export const shouldShowStreakAtRiskWarning = (input: {
  streakDays: number;
  hasWagerForToday: boolean;
  pktHour: number;
}): boolean => input.streakDays >= 5 && !input.hasWagerForToday && input.pktHour >= STREAK_AT_RISK_HOUR_PKT;
