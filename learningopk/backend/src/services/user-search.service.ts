import { and, asc, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import {
  blockedUsers,
  friendRequests,
  friendships,
  privacySettings,
  users
} from "../lib/db/schema.js";

export interface SearchUsersInput {
  query?: string;
  board?: string;
  institutionId?: number;
  page?: number;
  limit?: number;
  excludeUserId?: string;
}

export interface UserSearchResult {
  id: string;
  name: string;
  image: string | null;
  board: string | null;
  studentClass: string | null;
  friendStatus: "none" | "pending_incoming" | "pending_outgoing" | "friends";
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

type FriendStatus = "none" | "pending_incoming" | "pending_outgoing" | "friends";

export class UserSearchService {
  async searchUsers(
    currentUserId: string,
    input: SearchUsersInput
  ): Promise<PaginatedResult<UserSearchResult>> {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    const privacyClause = sql`
      NOT EXISTS (
        SELECT 1 FROM privacy_settings ps
        WHERE ps.user_id = users.id
        AND ps.who_can_find_me = 'nobody'
      )
    `;

    const blockedByMeClause = sql`
      NOT EXISTS (
        SELECT 1 FROM blocked_users bu
        WHERE bu.blocker_id = ${currentUserId}
        AND bu.blocked_id = users.id
      )
    `;

    const blockedMeClause = sql`
      NOT EXISTS (
        SELECT 1 FROM blocked_users bu
        WHERE bu.blocked_id = ${currentUserId}
        AND bu.blocker_id = users.id
      )
    `;

    const searchClauses: SQL[] = [privacyClause, blockedByMeClause, blockedMeClause];

    if (input.query && input.query.length >= 2) {
      searchClauses.push(
        sql`to_tsvector('english', coalesce(users.name, '')) @@ plainto_tsquery('english', ${input.query})`
      );
    }

    if (input.board) {
      searchClauses.push(eq(users.board, input.board));
    }

    if (input.institutionId) {
      searchClauses.push(eq(users.instituteId, input.institutionId));
    }

    searchClauses.push(ne(users.id, currentUserId));

    const whereClause = and(...searchClauses);

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        board: users.board,
        studentClass: users.class
      })
      .from(users)
      .where(whereClause)
      .orderBy(asc(users.name))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const friendStatuses = await this.getFriendStatuses(currentUserId, userRows.map((u) => u.id));

    const results: UserSearchResult[] = userRows.map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      board: user.board,
      studentClass: user.studentClass,
      friendStatus: friendStatuses.get(user.id) ?? "none"
    }));

    return {
      items: results,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async getUserProfile(
    currentUserId: string,
    targetUserId: string
  ): Promise<{
    id: string;
    name: string;
    image: string | null;
    board: string | null;
    studentClass: string | null;
    friendStatus: FriendStatus;
    friendCount: number;
    isProfileVisible: boolean;
  } | null> {
    const blockedByMe = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, currentUserId), eq(blockedUsers.blockedId, targetUserId)))
      .limit(1);

    if (blockedByMe.length > 0) {
      return null;
    }

    const blockedMe = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockedId, currentUserId), eq(blockedUsers.blockerId, targetUserId)))
      .limit(1);

    if (blockedMe.length > 0) {
      return null;
    }

    const privacyRows = await db
      .select({
        whoCanFindMe: privacySettings.whoCanFindMe
      })
      .from(privacySettings)
      .where(eq(privacySettings.userId, targetUserId))
      .limit(1);

    const privacy = privacyRows[0];
    if (privacy && privacy.whoCanFindMe === "nobody") {
      const friendRows = await db
        .select({ id: friendships.id })
        .from(friendships)
        .where(
          or(
            and(eq(friendships.userId, currentUserId), eq(friendships.friendId, targetUserId)),
            and(eq(friendships.friendId, currentUserId), eq(friendships.userId, targetUserId))
          )
        )
        .limit(1);

      if (friendRows.length === 0) {
        return null;
      }
    }

    const userRows = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        board: users.board,
        studentClass: users.class
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (userRows.length === 0) {
      return null;
    }

    const user = userRows[0];

    const friendCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(friendships)
      .where(
        or(eq(friendships.userId, targetUserId), eq(friendships.friendId, targetUserId))
      );

    const friendStatus = await this.getFriendStatuses(currentUserId, [targetUserId]);

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      board: user.board,
      studentClass: user.studentClass,
      friendStatus: friendStatus.get(targetUserId) ?? "none",
      friendCount: (friendCountRows[0]?.count ?? 0) / 2,
      isProfileVisible: true
    };
  }

  private async getFriendStatuses(
    currentUserId: string,
    userIds: string[]
  ): Promise<Map<string, FriendStatus>> {
    const result = new Map<string, FriendStatus>();

    if (userIds.length === 0) {
      return result;
    }

    const friendshipsRows = await db
      .select({
        userId: friendships.userId,
        friendId: friendships.friendId
      })
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, currentUserId),
            inArray(friendships.friendId, userIds)
          ),
          and(
            eq(friendships.friendId, currentUserId),
            inArray(friendships.userId, userIds)
          )
        )
      );

    for (const row of friendshipsRows) {
      const otherUserId = row.userId === currentUserId ? row.friendId : row.userId;
      result.set(otherUserId, "friends");
    }

    const pendingOutgoing = await db
      .select({ receiverId: friendRequests.receiverId })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, currentUserId),
          eq(friendRequests.status, "pending"),
          inArray(friendRequests.receiverId, userIds)
        )
      );

    for (const row of pendingOutgoing) {
      if (!result.has(row.receiverId)) {
        result.set(row.receiverId, "pending_outgoing");
      }
    }

    const pendingIncoming = await db
      .select({ senderId: friendRequests.senderId })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.receiverId, currentUserId),
          eq(friendRequests.status, "pending"),
          inArray(friendRequests.senderId, userIds)
        )
      );

    for (const row of pendingIncoming) {
      if (!result.has(row.senderId)) {
        result.set(row.senderId, "pending_incoming");
      }
    }

    return result;
  }
}

export const userSearchService = new UserSearchService();
