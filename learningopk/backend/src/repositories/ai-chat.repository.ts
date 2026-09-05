import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import {
  aiChatSessions,
  aiConversationEvents,
  aiMessages,
  aiUsageLogs,
  boards,
  chapterSubparts,
  chapters,
  exercises,
  subjects,
} from "../lib/db/schema.js";

export type AiChatSessionSummary = {
  id: string;
  title: string;
  lastMessageAt: Date | null;
};

export type AiChatSessionMeta = {
  id: string;
  chapterId: number | null;
};

export type AiChatMessageRow = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
};

export type StoredMessageRow = {
  role: string;
  content: string;
};

export class AiChatRepository {
  /** General (non-chapter-scoped) sessions for a user, newest activity first. */
  async listGeneralSessions(userId: string): Promise<AiChatSessionSummary[]> {
    return db
      .select({
        id: aiChatSessions.id,
        title: aiChatSessions.title,
        lastMessageAt: aiChatSessions.lastMessageAt,
      })
      .from(aiChatSessions)
      .where(and(eq(aiChatSessions.userId, userId), isNull(aiChatSessions.chapterId)))
      .orderBy(desc(aiChatSessions.lastMessageAt), desc(aiChatSessions.createdAt));
  }

  /** Finds a general session owned by the user. */
  async findGeneralSession(
    userId: string,
    sessionId: string
  ): Promise<AiChatSessionSummary | null> {
    const rows = await db
      .select({
        id: aiChatSessions.id,
        title: aiChatSessions.title,
        lastMessageAt: aiChatSessions.lastMessageAt,
      })
      .from(aiChatSessions)
      .where(
        and(
          eq(aiChatSessions.id, sessionId),
          eq(aiChatSessions.userId, userId),
          isNull(aiChatSessions.chapterId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  /** All messages of a session in chronological order. */
  async listMessages(sessionId: string): Promise<AiChatMessageRow[]> {
    return db
      .select({
        id: aiMessages.id,
        role: aiMessages.role,
        content: aiMessages.content,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(asc(aiMessages.createdAt));
  }

  /** Metadata of the most recent confusion_detected event of a session. */
  async getLatestConfusionEventMetadata(sessionId: string): Promise<unknown> {
    const rows = await db
      .select({
        metadata: aiConversationEvents.metadata,
      })
      .from(aiConversationEvents)
      .where(
        and(
          eq(aiConversationEvents.sessionId, sessionId),
          eq(aiConversationEvents.eventType, "confusion_detected")
        )
      )
      .orderBy(desc(aiConversationEvents.createdAt))
      .limit(1);

    return rows[0]?.metadata ?? null;
  }

  // --- Chat turn persistence ---

  async getChapterWithSubjectBoard(chapterId: number) {
    const rows = await db
      .select({
        chapterId: chapters.id,
        chapterTitle: chapters.title,
        chapterSummary: chapters.summary,
        grade: subjects.grade,
        subjectName: subjects.name,
        boardName: boards.name,
      })
      .from(chapters)
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(boards, eq(subjects.boardId, boards.id))
      .where(eq(chapters.id, chapterId))
      .limit(1);

    return rows[0] ?? null;
  }

  async listSubparts(chapterId: number) {
    return db
      .select({
        heading: chapterSubparts.heading,
        content: chapterSubparts.content,
      })
      .from(chapterSubparts)
      .where(eq(chapterSubparts.chapterId, chapterId))
      .orderBy(asc(chapterSubparts.orderIndex), asc(chapterSubparts.id));
  }

  async listExerciseQuestions(chapterId: number, limit: number) {
    return db
      .select({
        question: exercises.question,
      })
      .from(exercises)
      .where(eq(exercises.chapterId, chapterId))
      .limit(limit);
  }

  /** Finds a chat session (any scope) owned by the user, by id. */
  async findSessionMeta(userId: string, sessionId: string): Promise<AiChatSessionMeta | null> {
    const rows = await db
      .select({
        id: aiChatSessions.id,
        chapterId: aiChatSessions.chapterId,
      })
      .from(aiChatSessions)
      .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.userId, userId)))
      .limit(1);

    return rows[0] ?? null;
  }

  async createSession(input: {
    userId: string;
    chapterId: number | null;
    title: string;
  }): Promise<AiChatSessionMeta | null> {
    const rows = await db
      .insert(aiChatSessions)
      .values({
        userId: input.userId,
        chapterId: input.chapterId,
        title: input.title,
      })
      .returning({
        id: aiChatSessions.id,
        chapterId: aiChatSessions.chapterId,
      });

    return rows[0] ?? null;
  }

  async getLatestStoredMessage(sessionId: string): Promise<StoredMessageRow | null> {
    const rows = await db
      .select({
        role: aiMessages.role,
        content: aiMessages.content,
      })
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(1);

    return rows[0] ?? null;
  }

  async insertMessage(sessionId: string, role: "user" | "assistant", content: string) {
    await db.insert(aiMessages).values({ sessionId, role, content });
  }

  async listStoredMessages(sessionId: string): Promise<StoredMessageRow[]> {
    return db
      .select({
        role: aiMessages.role,
        content: aiMessages.content,
      })
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async touchSession(sessionId: string): Promise<void> {
    await db
      .update(aiChatSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(aiChatSessions.id, sessionId));
  }

  async insertConfusionEvent(input: {
    sessionId: string;
    topic: string;
    message: string;
    reasons: string[];
    chapterId: number | null;
  }): Promise<void> {
    await db.insert(aiConversationEvents).values({
      sessionId: input.sessionId,
      eventType: "confusion_detected",
      metadata: {
        topic: input.topic,
        message: input.message,
        reasons: input.reasons,
        chapterId: input.chapterId,
      },
    });
  }

  async insertUsageLog(input: {
    userId: string;
    sessionId: string;
    modelTier: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
  }): Promise<void> {
    await db.insert(aiUsageLogs).values({
      userId: input.userId,
      sessionId: input.sessionId,
      modelTier: input.modelTier,
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
    });
  }
}

export const aiChatRepository = new AiChatRepository();
