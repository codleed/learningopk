import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const userSearchResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  instituteName: z.string().nullable(),
  mutualFriendsCount: z.number().int().nonnegative().default(0),
  friendStatus: z.enum(["none", "pending_received", "pending_sent", "friends", "blocked"]).default("none"),
});

export const searchUsersRequestSchema = z.object({
  query: z.string().min(1).max(100),
  instituteId: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(50).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export const searchUsersResponseSchema = z.object({
  users: z.array(userSearchResultSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type UserSearchResult = z.infer<typeof userSearchResultSchema>;
export type SearchUsersResponse = z.infer<typeof searchUsersResponseSchema>;
export type SearchUsersRequest = z.infer<typeof searchUsersRequestSchema>;

export const friendStatusSchema = z.enum(["none", "pending_received", "pending_sent", "friends", "blocked"]);

export const friendSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  instituteName: z.string().nullable(),
  isOnline: z.boolean().default(false),
  lastSeen: z.string().datetime().nullable(),
  mutualFriendsCount: z.number().int().nonnegative().default(0),
});

export const friendRequestSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  senderName: z.string(),
  senderEmail: z.string().email(),
  senderImage: z.string().nullable(),
  senderInstituteName: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const friendsListResponseSchema = z.object({
  friends: z.array(friendSchema),
  total: z.number().int().nonnegative(),
});

export const friendRequestsResponseSchema = z.object({
  incoming: z.array(friendRequestSchema),
  outgoing: z.array(friendRequestSchema),
  totalIncoming: z.number().int().nonnegative(),
  totalOutgoing: z.number().int().nonnegative(),
});

export type Friend = z.infer<typeof friendSchema>;
export type FriendRequest = z.infer<typeof friendRequestSchema>;
export type FriendsListResponse = z.infer<typeof friendsListResponseSchema>;
export type FriendRequestsResponse = z.infer<typeof friendRequestsResponseSchema>;

export const conversationSchema = z.object({
  id: z.string().uuid(),
  participantId: z.string().uuid(),
  participantName: z.string(),
  participantImage: z.string().nullable(),
  participantIsOnline: z.boolean().default(false),
  lastMessage: z.string().nullable(),
  lastMessageAt: z.string().datetime().nullable(),
  unreadCount: z.number().int().nonnegative().default(0),
});

export const conversationsResponseSchema = z.object({
  conversations: z.array(conversationSchema),
  total: z.number().int().nonnegative(),
});

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationsResponse = z.infer<typeof conversationsResponseSchema>;

export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string().nullable(),
  mediaType: z.enum(["none", "image", "file"]).default("none"),
  mediaUrl: z.string().nullable(),
  mediaFileName: z.string().nullable(),
  status: z.enum(["sent", "delivered", "read"]).default("sent"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const messagesResponseSchema = z.object({
  messages: z.array(messageSchema),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

export type Message = z.infer<typeof messageSchema>;
export type MessagesResponse = z.infer<typeof messagesResponseSchema>;

export const privacySettingsSchema = z.object({
  whoCanFindMe: z.enum(["everyone", "friends_of_friends", "nobody"]).default("everyone"),
  whoCanSendFriendRequests: z.enum(["everyone", "friends_of_friends"]).default("everyone"),
  showOnlineStatus: z.boolean().default(true),
  showLastSeen: z.boolean().default(true),
});

export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

export const blockedUserSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  blockedAt: z.string().datetime(),
});

export const blockedUsersResponseSchema = z.object({
  blockedUsers: z.array(blockedUserSchema),
  total: z.number().int().nonnegative(),
});

export type BlockedUser = z.infer<typeof blockedUserSchema>;
export type BlockedUsersResponse = z.infer<typeof blockedUsersResponseSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["friend_request_received", "friend_request_accepted", "new_message"]),
  title: z.string(),
  body: z.string(),
  isRead: z.boolean().default(false),
  createdAt: z.string().datetime(),
  data: z.record(z.string(), z.string()).optional(),
});

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  total: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative().default(0),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const searchUsers = async (params: SearchUsersRequest): Promise<SearchUsersResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.set("query", params.query);
  if (params.instituteId) {
    searchParams.set("instituteId", String(params.instituteId));
  }
  searchParams.set("limit", String(params.limit));
  searchParams.set("offset", String(params.offset));

  return fetchJson(
    `${backendUrl}/api/friends/search?${searchParams.toString()}`,
    { method: "GET" }
  );
};

export const addFriend = async (userId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/request`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
};

export const cancelFriendRequest = async (userId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/request/${userId}`, {
    method: "DELETE",
  });
};

export const acceptFriendRequest = async (requestId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/request/${requestId}/accept`, {
    method: "POST",
  });
};

export const declineFriendRequest = async (requestId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/request/${requestId}/decline`, {
    method: "POST",
  });
};

export const removeFriend = async (userId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/${userId}`, {
    method: "DELETE",
  });
};

export const blockUser = async (userId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/block`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
};

export const unblockUser = async (userId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/friends/block/${userId}`, {
    method: "DELETE",
  });
};

export const getFriends = async (): Promise<FriendsListResponse> => {
  return fetchJson(`${backendUrl}/api/friends`, {
    method: "GET",
  });
};

export const getFriendRequests = async (): Promise<FriendRequestsResponse> => {
  return fetchJson(`${backendUrl}/api/friends/requests`, {
    method: "GET",
  });
};

export const getConversations = async (): Promise<ConversationsResponse> => {
  return fetchJson(`${backendUrl}/api/messages/conversations`, {
    method: "GET",
  });
};

export const getMessages = async (
  conversationId: string,
  limit: number = 50,
  before?: string
): Promise<MessagesResponse> => {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (before) {
    params.set("before", before);
  }

  return fetchJson(
    `${backendUrl}/api/messages/conversations/${conversationId}?${params.toString()}`,
    { method: "GET" }
  );
};

export const sendMessage = async (
  conversationId: string,
  body?: string,
  media?: { type: "image" | "file"; url: string; fileName?: string }
): Promise<Message> => {
  return fetchJson(`${backendUrl}/api/messages/conversations/${conversationId}`, {
    method: "POST",
    body: JSON.stringify({ body, media }),
  });
};

export const deleteMessage = async (messageId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/messages/${messageId}`, {
    method: "DELETE",
  });
};

export const markMessageAsRead = async (conversationId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/messages/conversations/${conversationId}/read`, {
    method: "POST",
  });
};

export const deleteConversation = async (conversationId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/messages/conversations/${conversationId}`, {
    method: "DELETE",
  });
};

export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  return fetchJson(`${backendUrl}/api/friends/privacy`, {
    method: "GET",
  });
};

export const updatePrivacySettings = async (settings: Partial<PrivacySettings>): Promise<PrivacySettings> => {
  return fetchJson(`${backendUrl}/api/friends/privacy`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
};

export const getBlockedUsers = async (): Promise<BlockedUsersResponse> => {
  return fetchJson(`${backendUrl}/api/friends/blocked`, {
    method: "GET",
  });
};

export const getNotifications = async (): Promise<NotificationsResponse> => {
  return fetchJson(`${backendUrl}/api/notifications`, {
    method: "GET",
  });
};

export const markNotificationAsRead = async (notificationId: string): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/notifications/${notificationId}/read`, {
    method: "POST",
  });
};

export const markAllNotificationsAsRead = async (): Promise<{ success: boolean }> => {
  return fetchJson(`${backendUrl}/api/notifications/read-all`, {
    method: "POST",
  });
};

export const getInstitutes = async (): Promise<{ institutes: Array<{ id: number; name: string }> }> => {
  return fetchJson(`${backendUrl}/api/institutes`, {
    method: "GET",
  });
};
