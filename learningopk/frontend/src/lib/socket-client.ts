import { io, Socket } from "socket.io-client";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(backendUrl, {
      path: "/ws",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Type definitions for socket events
export interface PresenceStatusChangeEvent {
  userId: string;
  isOnline: boolean;
  lastActiveAt: string | null;
}

export interface ChatNewMessageEvent {
  id: string;
  tempId?: string;
  senderId: string;
  participantId: string;
  content: string;
  attachment: { id: string; type: "image" | "file"; url: string; fileName: string; fileSize: number } | null;
  isRead: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface ChatMessageSentEvent {
  tempId: string;
  message: {
    id: string;
    senderId: string;
    content: string;
    attachment: { id: string; type: "image" | "file"; url: string; fileName: string; fileSize: number } | null;
    isRead: boolean;
    createdAt: string;
    deletedAt: string | null;
  };
}

export interface ChatMessageReadEvent {
  chatId: string;
  participantId: string;
  lastReadMessageId: string;
  readAt: string;
}

export interface ChatUserTypingEvent {
  participantId: string;
  isTyping: boolean;
}

export interface ChatMessageDeletedEvent {
  messageId: string;
  deletedAt: string;
}

export interface FriendRequestReceivedEvent {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string | null;
  createdAt: string;
}

export interface FriendRequestAcceptedEvent {
  friendId: string;
  friendName: string;
  friendImage?: string | null;
}

export interface FriendRequestDeclinedEvent {
  declinedBy: string;
}

export interface FriendRemovedEvent {
  friendId: string;
}

export interface SocketErrorEvent {
  code: string;
  message: string;
}

// Client-to-server event payload types
export interface SendMessagePayload {
  participantId: string;
  content: string;
  tempId?: string;
  attachmentId?: string;
}

export interface MarkReadPayload {
  participantId: string;
  lastReadMessageId: string;
}

export interface TypingPayload {
  participantId: string;
}

export interface DeleteMessagePayload {
  participantId: string;
  messageId: string;
}

export interface PresenceSubscribePayload {
  userIds: string[];
}