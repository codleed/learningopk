import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import {
  blockedUsers,
  conversations,
  friendRequests,
  friendships,
  messages,
  notifications,
  users
} from "../lib/db/schema.js";

export interface BlockedUserResult {
  id: string;
  name: string;
  image: string | null;
  blockedAt: Date;
}

export class BlockService {
  async blockUser(blockerId: string, blockedId: string): Promise<{ success: boolean; blockedUserId: string }> {
    if (blockerId === blockedId) {
      throw new Error("Cannot block yourself");
    }

    const userRows = await db.select({ id: users.id }).from(users).where(eq(users.id, blockedId)).limit(1);
    if (userRows.length === 0) {
      throw new Error("User not found");
    }

    const existingBlock = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)))
      .limit(1);

    if (existingBlock.length > 0) {
      throw new Error("User is already blocked");
    }

    await db.transaction(async (tx) => {
      const friendshipRows = await tx
        .select({ id: friendships.id })
        .from(friendships)
        .where(
          or(
            and(eq(friendships.userId, blockerId), eq(friendships.friendId, blockedId)),
            and(eq(friendships.friendId, blockerId), eq(friendships.userId, blockedId))
          )
        );

      if (friendshipRows.length > 0) {
        const conversationRows = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(
            or(
              and(eq(conversations.participantOneId, blockerId), eq(conversations.participantTwoId, blockedId)),
              and(eq(conversations.participantTwoId, blockerId), eq(conversations.participantOneId, blockedId))
            )
          )
          .limit(1);

        if (conversationRows.length > 0) {
          await tx.delete(messages).where(eq(messages.conversationId, conversationRows[0].id));
          await tx.delete(conversations).where(eq(conversations.id, conversationRows[0].id));
        }

        await tx.delete(friendships).where(
          or(
            and(eq(friendships.userId, blockerId), eq(friendships.friendId, blockedId)),
            and(eq(friendships.friendId, blockerId), eq(friendships.userId, blockedId))
          )
        );
      }

      await tx
        .delete(friendRequests)
        .where(
          or(
            and(eq(friendRequests.senderId, blockerId), eq(friendRequests.receiverId, blockedId)),
            and(eq(friendRequests.senderId, blockedId), eq(friendRequests.receiverId, blockerId))
          )
        );

      await tx.insert(blockedUsers).values({
        blockerId,
        blockedId
      });

      await tx.insert(notifications).values({
        userId: blockedId,
        type: "friend_removed",
        referenceId: blockedId
      });
    });

    return { success: true, blockedUserId: blockedId };
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<{ success: boolean }> {
    const blockRows = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)))
      .limit(1);

    if (blockRows.length === 0) {
      throw new Error("User is not blocked");
    }

    await db.delete(blockedUsers).where(eq(blockedUsers.id, blockRows[0].id));

    return { success: true };
  }

  async getBlockedUsers(userId: string): Promise<{ blockedUsers: BlockedUserResult[] }> {
    const blockedRows = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        blockedAt: blockedUsers.createdAt
      })
      .from(blockedUsers)
      .innerJoin(users, eq(blockedUsers.blockedId, users.id))
      .where(eq(blockedUsers.blockerId, userId))
      .orderBy(desc(blockedUsers.createdAt));

    return {
      blockedUsers: blockedRows.map((row) => ({
        id: row.id,
        name: row.name,
        image: row.image,
        blockedAt: row.blockedAt
      }))
    };
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const rows = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId)))
      .limit(1);

    return rows.length > 0;
  }

  async checkBlockStatus(userId1: string, userId2: string): Promise<{
    blockedByMe: boolean;
    blockedMe: boolean;
  }> {
    const [blockedByMeRows, blockedMeRows] = await Promise.all([
      db
        .select({ id: blockedUsers.id })
        .from(blockedUsers)
        .where(and(eq(blockedUsers.blockerId, userId1), eq(blockedUsers.blockedId, userId2)))
        .limit(1),
      db
        .select({ id: blockedUsers.id })
        .from(blockedUsers)
        .where(and(eq(blockedUsers.blockerId, userId2), eq(blockedUsers.blockedId, userId1)))
        .limit(1)
    ]);

    return {
      blockedByMe: blockedByMeRows.length > 0,
      blockedMe: blockedMeRows.length > 0
    };
  }
}

export const blockService = new BlockService();
