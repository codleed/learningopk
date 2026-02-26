export const toDateKey = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const createUtcDay = (year: number, month: number, day: number): Date => {
  return new Date(Date.UTC(year, month, day));
};

export const shiftUtcDays = (date: Date, days: number): Date => {
  return createUtcDay(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
};

export const scoreToPercent = (score: number, totalMarks: number): number => {
  if (totalMarks <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((score / totalMarks) * 100)));
};

export const calculateStreakDays = (activityDates: readonly Date[], referenceDate: Date = new Date()): number => {
  const activityDateKeys = new Set(activityDates.map((date) => toDateKey(date)));
  const referenceUtcDay = createUtcDay(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );

  let streakDays = 0;
  let cursor = referenceUtcDay;
  while (activityDateKeys.has(toDateKey(cursor))) {
    streakDays += 1;
    cursor = shiftUtcDays(cursor, -1);
  }

  return streakDays;
};

export const calculateLongestStreakDays = (activityDates: readonly Date[]): number => {
  if (activityDates.length === 0) {
    return 0;
  }

  const activityDateKeys = new Set(activityDates.map((date) => toDateKey(date)));
  const sortedKeys = [...activityDateKeys].sort();

  let longest = 0;
  let current = 0;
  let previousDay: Date | null = null;

  for (const key of sortedKeys) {
    const day = new Date(`${key}T00:00:00.000Z`);
    if (!previousDay) {
      current = 1;
      longest = 1;
      previousDay = day;
      continue;
    }

    const nextExpected = shiftUtcDays(previousDay, 1).getTime();
    if (day.getTime() === nextExpected) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > longest) {
      longest = current;
    }
    previousDay = day;
  }

  return longest;
};

type BuildDailyActivitySeriesOptions = {
  activityDailyCounts: ReadonlyMap<string, number>;
  endDate?: Date;
  days: number;
};

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;
export type ActivityCalendarEntry = {
  date: string;
  count: number;
  level: ActivityLevel;
};

export const buildDailyActivitySeries = ({
  activityDailyCounts,
  endDate = new Date(),
  days
}: BuildDailyActivitySeriesOptions): Array<{ date: string; active: boolean; activityCount: number }> => {
  if (days <= 0) {
    return [];
  }

  const endUtcDay = createUtcDay(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

  return Array.from({ length: days }, (_value, index) => {
    const day = shiftUtcDays(endUtcDay, index - (days - 1));
    const key = toDateKey(day);
    const count = activityDailyCounts.get(key) ?? 0;

    return {
      date: key,
      active: count > 0,
      activityCount: count
    };
  });
};

const toActivityLevel = (count: number, maxCount: number): ActivityLevel => {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  const ratio = count / maxCount;
  return Math.min(4, Math.max(1, Math.ceil(ratio * 4))) as ActivityLevel;
};

export const buildActivityCalendarSeries = ({
  activityDailyCounts,
  endDate = new Date(),
  days
}: BuildDailyActivitySeriesOptions): ActivityCalendarEntry[] => {
  const dailySeries = buildDailyActivitySeries({
    activityDailyCounts,
    endDate,
    days
  });
  const maxCount = dailySeries.reduce((max, entry) => Math.max(max, entry.activityCount), 0);

  return dailySeries.map((entry) => ({
    date: entry.date,
    count: entry.activityCount,
    level: toActivityLevel(entry.activityCount, maxCount)
  }));
};
