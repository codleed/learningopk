import { calculateStreakDays, createUtcDay, scoreToPercent } from "../lib/progress-metrics.js";
import { studyGroupsRepository } from "../repositories/study-groups.repository.js";

const MAX_GROUP_MEMBERS = 6;

export class StudyGroupsService {
  async createGroup(input: { userId: string; name: string; invites: string[] }) {
    const trimmedName = input.name.trim();
    if (trimmedName.length < 2) throw new Error("Group name must be at least 2 characters.");

    const uniqueInvites = Array.from(
      new Set(input.invites.map((value) => value.trim()).filter(Boolean))
    );
    const resolvedUsers = await studyGroupsRepository.findUsersByIdentifiers(uniqueInvites);

    if (resolvedUsers.length !== uniqueInvites.length) {
      const foundIdentifiers = new Set<string>();
      for (const user of resolvedUsers) {
        foundIdentifiers.add(user.email);
        foundIdentifiers.add(user.name);
      }
      const missing = uniqueInvites.filter((identifier) => !foundIdentifiers.has(identifier));
      throw new Error(`Invited user not found: ${missing[0] ?? "unknown"}`);
    }

    const memberIds = Array.from(new Set([input.userId, ...resolvedUsers.map((user) => user.id)]));
    if (memberIds.length > MAX_GROUP_MEMBERS)
      throw new Error("Study groups support max 6 members.");

    const group = await studyGroupsRepository.createGroup({
      name: trimmedName,
      createdBy: input.userId,
      memberIds,
    });
    return {
      group: {
        id: group.id,
        name: group.name,
        memberCount: memberIds.length,
        createdAt: group.createdAt.toISOString(),
      },
    };
  }

  async listGroups(userId: string) {
    const groups = await studyGroupsRepository.findGroupsForUser(userId);
    return {
      groups: groups.map((group) => ({
        id: group.id,
        name: group.name,
        createdAt: group.createdAt.toISOString(),
        memberCount: group.memberCount,
        notificationCount: group.notificationCount,
      })),
    };
  }

  async getGroupDetail(groupId: string, userId: string) {
    const membership = await studyGroupsRepository.findGroupMembership(groupId, userId);
    if (!membership) return null;

    const members = await studyGroupsRepository.findGroupMembers(groupId);
    const memberIds = members.map((member) => member.userId);
    const progressRows = await studyGroupsRepository.findMemberSubjectProgress(memberIds);
    const quizAttemptRows = await studyGroupsRepository.findMemberQuizAttempts(memberIds);
    const totalPublishedChapters = await studyGroupsRepository.findPublishedChapterCount();
    const activityRows = await studyGroupsRepository.findMemberActivityRows(memberIds);
    const activityFeed = await studyGroupsRepository.findGroupActivityFeed(groupId, 20);
    const notifications = await studyGroupsRepository.findRecipientNotifications(
      groupId,
      userId,
      10
    );

    const progressByUser = new Map<string, typeof progressRows>();
    const activityByUser = new Map<string, typeof activityRows>();
    const quizAttemptsByUser = new Map<string, typeof quizAttemptRows>();

    for (const row of progressRows) {
      const current = progressByUser.get(row.userId) ?? [];
      current.push(row);
      progressByUser.set(row.userId, current);
    }
    for (const row of activityRows) {
      const current = activityByUser.get(row.userId) ?? [];
      current.push(row);
      activityByUser.set(row.userId, current);
    }
    for (const row of quizAttemptRows) {
      const current = quizAttemptsByUser.get(row.userId) ?? [];
      current.push(row);
      quizAttemptsByUser.set(row.userId, current);
    }

    const memberStats = members.map((member) => {
      const memberProgress = progressByUser.get(member.userId) ?? [];
      const visitedChapters = memberProgress.filter((row) => row.visitedAt !== null).length;
      const bestQuizPercent = (quizAttemptsByUser.get(member.userId) ?? []).reduce(
        (best, row) => Math.max(best, scoreToPercent(row.score, row.totalMarks)),
        0
      );
      const streakRows = activityByUser.get(member.userId) ?? [];
      const activityDates = Array.from(
        new Set(
          streakRows
            .filter((row) => row.activityAt)
            .map((row) => row.activityAt!.toISOString().slice(0, 10))
        )
      ).map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`));
      const today = new Date();
      const streakDays = calculateStreakDays(
        activityDates,
        createUtcDay(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      );

      return {
        userId: member.userId,
        name: member.name,
        email: member.email,
        joinedAt: member.joinedAt.toISOString(),
        chapterCompletionPercent:
          totalPublishedChapters > 0
            ? Math.round((visitedChapters / totalPublishedChapters) * 100)
            : 0,
        bestQuizScorePercent: bestQuizPercent,
        streakDays,
      };
    });

    return {
      group: {
        id: membership.id,
        name: membership.name,
        createdAt: membership.createdAt.toISOString(),
        memberCount: members.length,
      },
      members: memberStats,
      activityFeed: activityFeed.map((entry) => ({
        id: entry.id,
        eventType: entry.eventType,
        createdAt: entry.createdAt.toISOString(),
        message: this.formatActivityMessage(
          entry.eventType,
          entry.actorName,
          entry.chapterTitle,
          entry.metadata
        ),
      })),
      notifications: notifications.map((entry) => ({
        id: entry.id,
        eventType: entry.eventType,
        createdAt: entry.createdAt.toISOString(),
        message: this.formatActivityMessage(
          entry.eventType,
          entry.actorName,
          entry.chapterTitle,
          entry.metadata
        ),
      })),
    };
  }

  async recordChapterCompletion(input: { userId: string; chapterId: number }) {
    const memberships = await studyGroupsRepository.findMemberGroups(input.userId);
    for (const membership of memberships) {
      const exists = await studyGroupsRepository.hasChapterCompletionActivity(
        membership.groupId,
        input.userId,
        input.chapterId
      );
      if (exists) continue;
      await studyGroupsRepository.createActivity({
        groupId: membership.groupId,
        actorUserId: input.userId,
        activityType: "chapter_completed",
        chapterId: input.chapterId,
      });
    }
  }

  async recordQuizScore(input: { userId: string; chapterId: number }) {
    const memberships = await studyGroupsRepository.findMemberGroups(input.userId);
    for (const membership of memberships) {
      const otherMembers = await studyGroupsRepository.findOtherGroupMembers(
        membership.groupId,
        input.userId
      );
      const attempts = await studyGroupsRepository.findQuizAttemptsForGroupMembers(
        membership.groupId,
        input.chapterId
      );
      const actorPercent = attempts
        .filter((attempt) => attempt.userId === input.userId)
        .reduce(
          (best, attempt) => Math.max(best, scoreToPercent(attempt.score, attempt.totalMarks)),
          0
        );
      if (actorPercent <= 0) continue;

      for (const member of otherMembers) {
        const bestOtherPercent = attempts
          .filter((attempt) => attempt.userId === member.userId)
          .reduce(
            (best, attempt) => Math.max(best, scoreToPercent(attempt.score, attempt.totalMarks)),
            0
          );
        if (actorPercent <= bestOtherPercent) continue;
        const exists = await studyGroupsRepository.hasQuizScoreBeatenActivity(
          membership.groupId,
          input.userId,
          member.userId,
          input.chapterId
        );
        if (exists) continue;

        await studyGroupsRepository.createActivity({
          groupId: membership.groupId,
          actorUserId: input.userId,
          recipientUserId: member.userId,
          activityType: "quiz_score_beaten",
          chapterId: input.chapterId,
          metadata: { scorePercent: actorPercent, previousBestPercent: bestOtherPercent },
        });
      }
    }
  }

  private formatActivityMessage(
    eventType: "chapter_completed" | "quiz_score_beaten",
    actorName: string,
    chapterTitle: string | null,
    metadata: Record<string, unknown>
  ) {
    if (eventType === "chapter_completed")
      return `${actorName} completed ${chapterTitle ?? "a chapter"}.`;
    const scorePercent = typeof metadata.scorePercent === "number" ? metadata.scorePercent : 0;
    return `${actorName} scored ${scorePercent}% and beat your quiz score${chapterTitle ? ` in ${chapterTitle}` : ""}.`;
  }
}

export const studyGroupsService = new StudyGroupsService();
