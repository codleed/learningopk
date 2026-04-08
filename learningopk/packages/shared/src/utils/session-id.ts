export function normalizeSessionId(sessionId: string | null | undefined): string | null {
  const trimmed = sessionId?.trim();
  return trimmed ? trimmed : null;
}

export function withPersistedChapterSession(
  sessions: Record<number, string>,
  chapterId: number,
  sessionId: string | null | undefined
): Record<number, string> {
  const nextSessions = { ...sessions };
  const normalizedSessionId = normalizeSessionId(sessionId);

  if (normalizedSessionId) {
    nextSessions[chapterId] = normalizedSessionId;
  } else {
    delete nextSessions[chapterId];
  }

  return nextSessions;
}
