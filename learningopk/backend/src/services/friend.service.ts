import { and, asc, desc, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import {
  blockedUsers,
  conversations,
  friendRequests,
  friendships,
  messages,
  notifications,
  privacySettings,
  users
} from "../lib/db/schema.js";
import { userSearchService } from "./user-search.service.js";
import { privacyService } from "./privacy.service.js";

export interface FriendRequestResult {
  id: string;
  fromUser: {
    id: string;
    name: string;
    image: string | null;
  };
  createdAt: Date;
}

export interface OutgoingFriendRequestResult {
  id: string;
  toUser: {
    id: string;
    name: string;
    image: string | null;
  };
  createdAt: Date;
}

export interface FriendResult {
  id: string;
  name: string;
  image: string | null;
  isOnline: boolean;
  lastActiveAt: Date | null;
}

export class FriendService {
  async sendFriendRequest(
    senderId: string,
    receiverId: string
  ): Promise<{ requestId: string; status: string; targetUserId: string; createdAt: Date }> {
    if (senderId === receiverId) {
      throw new Error("Cannot send friend request to yourself");
    }

    const receiverRows = await db.select({ id: users.id }).from(users).where(eq(users.id, receiverId)).limit(1);
    if (receiverRows.length === 0) {
      throw new Error("Target user not found");
    }

    const blockedByMe = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockerId, senderId), eq(blockedUsers.blockedId, receiverId)))
      .limit(1);

    if (blockedByMe.length > 0) {
      throw new Error("Cannot send friend request to this user");
    }

    const blockedMe = await db
      .select({ id: blockedUsers.id })
      .from(blockedUsers)
      .where(and(eq(blockedUsers.blockedId, senderId), eq(blockedUsers.blockerId, receiverId)))
      .limit(1);

    if (blockedMe.length > 0) {
      throw new Error("Cannot send friend request to this user");
    }

    const privacySettings = await privacyService.getPrivacySettings(receiverId);
    if (privacySettings.friendRequests.whoCanSendRequests === "nobody") {
      throw new Error("This user is not accepting friend requests from anyone");
    }

    if (privacySettings.friendRequests.whoCanSendRequests === "friends_of_friends") {
      const areFriendsOfFriends = await this.checkFriendsOfFriends(senderId, receiverId);
      if (!areFriendsOfFriends) {
        throw new Error("This user only accepts friend requests from friends of friends");
      }
    }

    const existingFriendship = await db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, senderId), eq(friendships.friendId, receiverId)),
          and(eq(friendships.friendId, senderId), eq(friendships.userId, receiverId))
        )
      )
      .limit(1);

    if (existingFriendship.length > 0) {
      throw new Error("Users are already friends");
    }

    const existingRequest = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, senderId),
          eq(friendRequests.receiverId, receiverId),
          eq(friendRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      throw new Error("Friend request already exists");
    }

    const reverseRequest = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, receiverId),
          eq(friendRequests.receiverId, senderId),
          eq(friendRequests.status, "pending")
        )
      )
      .limit(1);

    if (reverseRequest.length > 0) {
      throw new Error("This user has already sent you a friend request");
    }

    const insertedRows = await db
      .insert(friendRequests)
      .values({
        senderId,
        receiverId,
        status: "pending"
      })
      .returning({
        id: friendRequests.id,
        createdAt: friendRequests.createdAt
      });

    const inserted = insertedRows[0];
    if (!inserted) {
      throw new Error("Unable to create friend request");
    }

    await db.insert(notifications).values({
      userId: receiverId,
      type: "friend_request",
      referenceId: inserted.id
    });

    return {
      requestId: inserted.id,
      status: "pending",
      targetUserId: receiverId,
      createdAt: inserted.createdAt
    };
  }

  async getFriendRequests(userId: string, type?: "incoming" | "outgoing" | "all"): Promise<{
    incoming: FriendRequestResult[];
    outgoing: OutgoingFriendRequestResult[];
  }> {
    const incomingRequests: FriendRequestResult[] = [];
    const outgoingRequests: OutgoingFriendRequestResult[] = [];

    if (!type || type === "incoming" || type === "all") {
      const incomingRows = await db
        .select({
          id: friendRequests.id,
          senderId: friendRequests.senderId,
          createdAt: friendRequests.createdAt,
          senderName: users.name,
          senderImage: users.image
        })
        .from(friendRequests)
        .innerJoin(users, eq(friendRequests.senderId, users.id))
        .where(and(eq(friendRequests.receiverId, userId), eq(friendRequests.status, "pending")))
        .orderBy(desc(friendRequests.createdAt));

      for (const row of incomingRows) {
        incomingRequests.push({
          id: row.id,
          fromUser: {
            id: row.senderId,
            name: row.senderName,
            image: row.senderImage
          },
          createdAt: row.createdAt
        });
      }
    }

    if (!type || type === "outgoing" || type === "all") {
      const outgoingRows = await db
        .select({
          id: friendRequests.id,
          receiverId: friendRequests.receiverId,
          createdAt: friendRequests.createdAt,
          receiverName: users.name,
          receiverImage: users.image
        })
        .from(friendRequests)
        .innerJoin(users, eq(friendRequests.receiverId, users.id))
        .where(and(eq(friendRequests.senderId, userId), eq(friendRequests.status, "pending")))
        .orderBy(desc(friendRequests.createdAt));

      for (const row of outgoingRows) {
        outgoingRequests.push({
          id: row.id,
          toUser: {
            id: row.receiverId,
            name: row.receiverName,
            image: row.receiverImage
          },
          createdAt: row.createdAt
        });
      }
    }

    return { incoming: incomingRequests, outgoing: outgoingRequests };
  }

  async acceptFriendRequest(
    userId: string,
    requestId: string
  ): Promise<{ friendshipId: string; friend: { id: string; name: string; image: string | null } }> {
    const requestRows = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId
      })
      .from(friendRequests)
      .where(and(eq(friendRequests.id, requestId), eq(friendRequests.receiverId, userId), eq(friendRequests.status, "pending")))
      .limit(1);

    if (requestRows.length === 0) {
      throw new Error("Request not found or not incoming");
    }

    const request = requestRows[0];

    await db.transaction(async (tx) => {
      await tx
        .update(friendRequests)
        .set({ status: "accepted" })
        .where(eq(friendRequests.id, requestId));

      const [friendship] = await tx
        .insert(friendships)
        .values({
          userId: request.senderId,
          friendId: request.receiverId
        })
        .returning({ id: friendships.id });

      await tx.insert(notifications).values({
        userId: request.senderId,
        type: "friend_accepted",
        referenceId: friendship.id
      });
    });

    const friendRows = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image
      })
      .from(users)
      .where(eq(users.id, request.senderId))
      .limit(1);

    const friend = friendRows[0];
    if (!friend) {
      throw new Error("Friend user not found");
    }

    const friendshipRows = await db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, request.senderId)),
          and(eq(friendships.friendId, userId), eq(friendships.userId, request.senderId))
        )
      )
      .limit(1);

    return {
      friendshipId: friendshipRows[0]?.id ?? "",
      friend: {
        id: friend.id,
        name: friend.name,
        image: friend.image
      }
    };
  }

  async declineFriendRequest(userId: string, requestId: string): Promise<{ success: boolean }> {
    const requestRows = await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId
      })
      .from(friendRequests)
      .where(and(eq(friendRequests.id, requestId), eq(friendRequests.receiverId, userId), eq(friendRequests.status, "pending")))
      .limit(1);

    if (requestRows.length === 0) {
      throw new Error("Request not found or not incoming");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(friendRequests)
        .set({ status: "declined" })
        .where(eq(friendRequests.id, requestId));

      await tx.insert(notifications).values({
        userId: requestRows[0].senderId,
        type: "friend_declined",
        referenceId: requestId
      });
    });

    return { success: true };
  }

  async cancelFriendRequest(userId: string, requestId: string): Promise<{ success: boolean }> {
    const requestRows = await db
      .select({ id: friendRequests.id })
      .from(friendRequests)
      .where(and(eq(friendRequests.id, requestId), eq(friendRequests.senderId, userId), eq(friendRequests.status, "pending")))
      .limit(1);

    if (requestRows.length === 0) {
      throw new Error("Request not found or not outgoing");
    }

    await db.delete(friendRequests).where(eq(friendRequests.id, requestId));

    return { success: true };
  }

  async removeFriend(userId: string, friendId: string): Promise<{ success: boolean }> {
    const friendshipRows = await db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.friendId, userId), eq(friendships.userId, friendId))
        )
      )
      .limit(1);

    if (friendshipRows.length === 0) {
      throw new Error("Not friends with this user");
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(friendships)
        .where(eq(friendships.id, friendshipRows[0].id));

      const conversationRows = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          or(
            and(eq(conversations.participantOneId, userId), eq(conversations.participantTwoId, friendId)),
            and(eq(conversations.participantTwoId, userId), eq(conversations.participantOneId, friendId))
          )
        )
        .limit(1);

      if (conversationRows.length > 0) {
        await tx.delete(messages).where(eq(messages.conversationId, conversationRows[0].id));
        await tx.delete(conversations).where(eq(conversations.id, conversationRows[0].id));
      }

      await tx.insert(notifications).values({
        userId: friendId,
        type: "friend_removed",
        referenceId: friendshipRows[0].id
      });
    });

    return { success: true };
  }

  async getFriends(
    userId: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ): Promise<{
    friends: FriendResult[];
    pagination: { page: number; limit: number; totalCount: number; totalPages: number };
  }> {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 50);
    const offset = (page - 1) * limit;

    const friendIdsSubquery = sql`
      SELECT friend_id FROM friendships WHERE user_id = ${userId}
      UNION
      SELECT user_id FROM friendships WHERE friend_id = ${userId}
    `;

    let whereClause = sql`users.id IN (${friendIdsSubquery})`;

    if (options.search) {
      whereClause = sql`
        users.id IN (${friendIdsSubquery})
        AND users.name ILIKE ${"%" + options.search + "%"}
      `;
    }

    const friendRows = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen
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

    return {
      friends: friendRows.map((row) => ({
        id: row.id,
        name: row.name,
        image: row.image,
        isOnline: row.isOnline,
        lastActiveAt: row.lastSeen
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const rows = await db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId1), eq(friendships.friendId, userId2)),
          and(eq(friendships.friendId, userId1), eq(friendships.userId, userId2))
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  private async checkFriendsOfFriends(userId1: string, userId2: string): Promise<boolean> {
    const user1Friends = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(eq(friendships.userId, userId1));

    const user1FriendIds = user1Friends.map(f => f.friendId);

    if (user1FriendIds.length === 0) {
      return false;
    }

    const user2Friends = await db
      .select({ friendId: friendships.friendId })
      .from(friendships)
      .where(eq(friendships.userId, userId2));

    const user2FriendIds = new Set(user2Friends.map(f => f.friendId));

    for (const friendId of user1FriendIds) {
      if (user2FriendIds.has(friendId)) {
        return true;
      }
    }

    return false;
  }
}

export const friendService = new FriendService();
