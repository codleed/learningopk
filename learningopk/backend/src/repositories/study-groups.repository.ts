import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { withOptionalDbFallback } from "../lib/db-schema-compat.js";
import {
  boards,
  chapters,
  quizAttempts,
  quizzes,
  subjects,
  userProgress,
  users,
} from "../lib/db/schema.js";
import {
  studyGroupActivities,
  studyGroupMembers,
  studyGroups,
} from "../lib/db/study-groups-schema.js";

export class StudyGroupsRepository {
  async findUsersByIdentifiers(identifiers: string[]) {
    if (identifiers.length === 0) return [];
    const normalized = identifiers.map((value) => value.trim()).filter(Boolean);
    if (normalized.length === 0) return [];

    return db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(or(inArray(users.email, normalized), inArray(users.name, normalized)));
  }

  async createGroup(input: { name: string; createdBy: string; memberIds: string[] }) {
    return db.transaction(async (tx) => {
      const [group] = await tx
        .insert(studyGroups)
        .values({ name: input.name, createdBy: input.createdBy, updatedAt: new Date() })
        .returning({
          id: studyGroups.id,
          name: studyGroups.name,
          createdAt: studyGroups.createdAt,
        });
      if (!group) throw new Error("Failed to create study group.");

      await tx
        .insert(studyGroupMembers)
        .values(input.memberIds.map((userId) => ({ groupId: group.id, userId })));
      return group;
    });
  }

  async findGroupsForUser(userId: string) {
    const groups = await withOptionalDbFallback(
      "study_groups.list",
      () =>
        db
          .select({ id: studyGroups.id, name: studyGroups.name, createdAt: studyGroups.createdAt })
          .from(studyGroups)
          .innerJoin(studyGroupMembers, eq(studyGroupMembers.groupId, studyGroups.id))
          .where(eq(studyGroupMembers.userId, userId))
          .orderBy(desc(studyGroups.createdAt)),
      () => []
    );

    if (groups.length === 0) return [];

    const memberships = await withOptionalDbFallback(
      "study_groups.member_counts",
      () =>
        db
          .select({
            groupId: studyGroupMembers.groupId,
            memberCount: sql<number>`count(${studyGroupMembers.id})::int`,
          })
          .from(studyGroupMembers)
          .where(
            inArray(
              studyGroupMembers.groupId,
              groups.map((group) => group.id)
            )
          )
          .groupBy(studyGroupMembers.groupId),
      () => []
    );
    const notifications = await withOptionalDbFallback(
      "study_groups.notifications",
      () =>
        db
          .select({
            groupId: studyGroupActivities.groupId,
            notificationCount: sql<number>`count(${studyGroupActivities.id})::int`,
          })
          .from(studyGroupActivities)
          .where(
            and(
              inArray(
                studyGroupActivities.groupId,
                groups.map((group) => group.id)
              ),
              eq(studyGroupActivities.recipientUserId, userId)
            )
          )
          .groupBy(studyGroupActivities.groupId),
      () => []
    );

    const memberCounts = new Map(memberships.map((row) => [row.groupId, row.memberCount]));
    const notificationCounts = new Map(
      notifications.map((row) => [row.groupId, row.notificationCount])
    );

    return groups.map((group) => ({
      ...group,
      memberCount: memberCounts.get(group.id) ?? 0,
      notificationCount: notificationCounts.get(group.id) ?? 0,
    }));
  }

  async findGroupMembership(groupId: string, userId: string) {
    const rows = await withOptionalDbFallback(
      "study_groups.membership",
      () =>
        db
          .select({
            id: studyGroups.id,
            name: studyGroups.name,
            createdAt: studyGroups.createdAt,
            createdBy: studyGroups.createdBy,
          })
          .from(studyGroups)
          .innerJoin(studyGroupMembers, eq(studyGroupMembers.groupId, studyGroups.id))
          .where(and(eq(studyGroups.id, groupId), eq(studyGroupMembers.userId, userId)))
          .limit(1),
      () => []
    );
    return rows[0] ?? null;
  }

  async findGroupMembers(groupId: string) {
    return db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        joinedAt: studyGroupMembers.joinedAt,
      })
      .from(studyGroupMembers)
      .innerJoin(users, eq(users.id, studyGroupMembers.userId))
      .where(eq(studyGroupMembers.groupId, groupId))
      .orderBy(studyGroupMembers.joinedAt);
  }

  async findMemberSubjectProgress(userIds: string[]) {
    if (userIds.length === 0) return [];
    return db
      .select({ userId: users.id, chapterId: chapters.id, visitedAt: userProgress.visitedAt })
      .from(users)
      .innerJoin(userProgress, eq(userProgress.userId, users.id))
      .innerJoin(chapters, eq(chapters.id, userProgress.chapterId))
      .where(inArray(users.id, userIds));
  }

  async findMemberQuizAttempts(userIds: string[]) {
    if (userIds.length === 0) return [];
    return db
      .select({
        userId: quizAttempts.userId,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
      })
      .from(quizAttempts)
      .where(inArray(quizAttempts.userId, userIds));
  }

  async findPublishedChapterCount() {
    const rows = await db
      .select({ totalChapters: sql<number>`count(${chapters.id})::int` })
      .from(chapters)
      .where(eq(chapters.isPublished, true))
      .limit(1);
    return rows[0]?.totalChapters ?? 0;
  }

  async findMemberActivityRows(userIds: string[]) {
    if (userIds.length === 0) return [];
    return db
      .select({
        userId: userProgress.userId,
        activityAt: userProgress.visitedAt,
        exercisesViewed: userProgress.exercisesViewed,
        quizAttemptsCount: userProgress.quizAttemptsCount,
      })
      .from(userProgress)
      .where(inArray(userProgress.userId, userIds));
  }

  async findGroupActivityFeed(groupId: string, limit = 20) {
    return db
      .select({
        id: studyGroupActivities.id,
        eventType: studyGroupActivities.activityType,
        createdAt: studyGroupActivities.createdAt,
        actorName: users.name,
        chapterTitle: chapters.title,
        metadata: studyGroupActivities.metadata,
      })
      .from(studyGroupActivities)
      .innerJoin(users, eq(users.id, studyGroupActivities.actorUserId))
      .leftJoin(chapters, eq(chapters.id, studyGroupActivities.chapterId))
      .where(eq(studyGroupActivities.groupId, groupId))
      .orderBy(desc(studyGroupActivities.createdAt))
      .limit(limit);
  }

  async findRecipientNotifications(groupId: string, recipientUserId: string, limit = 10) {
    return db
      .select({
        id: studyGroupActivities.id,
        eventType: studyGroupActivities.activityType,
        createdAt: studyGroupActivities.createdAt,
        actorName: users.name,
        chapterTitle: chapters.title,
        metadata: studyGroupActivities.metadata,
      })
      .from(studyGroupActivities)
      .innerJoin(users, eq(users.id, studyGroupActivities.actorUserId))
      .leftJoin(chapters, eq(chapters.id, studyGroupActivities.chapterId))
      .where(
        and(
          eq(studyGroupActivities.groupId, groupId),
          eq(studyGroupActivities.recipientUserId, recipientUserId)
        )
      )
      .orderBy(desc(studyGroupActivities.createdAt))
      .limit(limit);
  }

  async findMemberGroups(userId: string) {
    return withOptionalDbFallback(
      "study_groups.memberships",
      () =>
        db
          .select({ groupId: studyGroupMembers.groupId })
          .from(studyGroupMembers)
          .where(eq(studyGroupMembers.userId, userId)),
      () => []
    );
  }

  async findOtherGroupMembers(groupId: string, userId: string) {
    return db
      .select({ userId: studyGroupMembers.userId, name: users.name })
      .from(studyGroupMembers)
      .innerJoin(users, eq(users.id, studyGroupMembers.userId))
      .where(and(eq(studyGroupMembers.groupId, groupId), ne(studyGroupMembers.userId, userId)));
  }

  async findQuizAttemptsForGroupMembers(groupId: string, chapterId: number) {
    return db
      .select({
        userId: quizAttempts.userId,
        score: quizAttempts.score,
        totalMarks: quizAttempts.totalMarks,
      })
      .from(quizAttempts)
      .innerJoin(studyGroupMembers, eq(studyGroupMembers.userId, quizAttempts.userId))
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(and(eq(studyGroupMembers.groupId, groupId), eq(quizzes.chapterId, chapterId)));
  }

  async createActivity(input: {
    groupId: string;
    actorUserId: string;
    recipientUserId?: string | null;
    activityType: "chapter_completed" | "quiz_score_beaten";
    chapterId?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    const [row] = await db
      .insert(studyGroupActivities)
      .values({
        groupId: input.groupId,
        actorUserId: input.actorUserId,
        recipientUserId: input.recipientUserId ?? null,
        activityType: input.activityType,
        chapterId: input.chapterId ?? null,
        metadata: input.metadata ?? {},
      })
      .returning({ id: studyGroupActivities.id });
    return row ?? null;
  }

  async hasChapterCompletionActivity(groupId: string, actorUserId: string, chapterId: number) {
    const rows = await db
      .select({ id: studyGroupActivities.id })
      .from(studyGroupActivities)
      .where(
        and(
          eq(studyGroupActivities.groupId, groupId),
          eq(studyGroupActivities.actorUserId, actorUserId),
          eq(studyGroupActivities.activityType, "chapter_completed"),
          eq(studyGroupActivities.chapterId, chapterId)
        )
      )
      .limit(1);
    return rows.length > 0;
  }

  async hasQuizScoreBeatenActivity(
    groupId: string,
    actorUserId: string,
    recipientUserId: string,
    chapterId: number
  ) {
    const rows = await db
      .select({ id: studyGroupActivities.id })
      .from(studyGroupActivities)
      .where(
        and(
          eq(studyGroupActivities.groupId, groupId),
          eq(studyGroupActivities.actorUserId, actorUserId),
          eq(studyGroupActivities.recipientUserId, recipientUserId),
          eq(studyGroupActivities.activityType, "quiz_score_beaten"),
          eq(studyGroupActivities.chapterId, chapterId)
        )
      )
      .limit(1);
    return rows.length > 0;
  }
}

export const studyGroupsRepository = new StudyGroupsRepository();
