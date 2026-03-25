"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, DotsThreeVertical, User } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { useChatWebSocket } from "@/hooks/use-websocket";
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markMessageAsRead,
  type Message,
} from "@/lib/friends-api";

type PageParams = {
  params: Promise<{ conversationId: string }>;
};

export default function ChatPage({ params }: PageParams) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => setConversationId(p.conversationId));
  }, [params]);

  const userId = "current-user-id";

  const { isConnected, lastMessage, sendTyping, sendMarkRead } = useChatWebSocket(
    conversationId,
    userId
  );

  const fetchMessages = useCallback(async (before?: string) => {
    if (!conversationId) return;

    if (before) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getMessages(conversationId, 50, before);
      if (before) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setHasMore(data.hasMore);
    } catch {
      setError("Failed to load messages. Please try again.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      markMessageAsRead(conversationId).catch(console.error);
    }
  }, [conversationId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (lastMessage?.type === "new_message" && lastMessage.conversationId === conversationId) {
      const newMessage = lastMessage as unknown as Message;
      if (!messages.find((m) => m.id === newMessage.id)) {
        setMessages((prev) => [...prev, newMessage]);
        sendMarkRead();
      }
    }
  }, [lastMessage, conversationId, messages, sendMarkRead]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || !hasMore || isLoadingMore) return;

    if (messagesContainerRef.current.scrollTop === 0) {
      const oldestMessage = messages[0];
      if (oldestMessage) {
        fetchMessages(oldestMessage.createdAt);
      }
    }
  }, [hasMore, isLoadingMore, messages, fetchMessages]);

  const handleSend = useCallback(async (body: string, media?: { type: "image" | "file"; url: string; fileName?: string }) => {
    if (!conversationId || (!body && !media)) return;

    try {
      const message = await sendMessage(conversationId, body, media);
      setMessages((prev) => [...prev, message]);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      console.error("Failed to send message");
    }
  }, [conversationId]);

  const handleDeleteClick = useCallback((message: Message) => {
    setMessageToDelete(message);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!messageToDelete) return;

    startTransition(async () => {
      try {
        await deleteMessage(messageToDelete.id);
        setMessages((prev) => prev.filter((m) => m.id !== messageToDelete.id));
      } catch {
        console.error("Failed to delete message");
      } finally {
        setShowDeleteDialog(false);
        setMessageToDelete(null);
      }
    });
  }, [messageToDelete]);

  const handleTyping = useCallback((isTyping: boolean) => {
    sendTyping(isTyping);
  }, [sendTyping]);

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Link href="/messages">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="relative">
          {participantImage ? (
            <Image
              src={participantImage}
              alt={participantName}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
              <User className="h-5 w-5" weight="fill" />
            </div>
          )}
          {participantIsOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
          )}
        </div>

        <div className="flex-1">
          <h2 className="font-semibold text-foreground">{participantName}</h2>
          <p className="text-xs text-muted-foreground">
            {isConnected ? "Online" : "Connecting..."}
          </p>
        </div>

        <Button variant="ghost" size="sm">
          <DotsThreeVertical className="h-5 w-5" />
        </Button>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 space-y-4"
      >
        {isLoading ? (
          <LoadingSkeleton rows={5} />
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Send a message to start the conversation
              </p>
            </div>
          </div>
        ) : (
          <>
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}

            {messages.map((message, index) => {
              const isOwn = message.senderId === userId;
              const prevMessage = messages[index - 1];
              const showAvatar = !isOwn && prevMessage?.senderId !== message.senderId;

              return (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onDelete={isOwn ? () => handleDeleteClick(message) : undefined}
                />
              );
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <MessageInput
          onSend={handleSend}
          onTyping={handleTyping}
          disabled={!isConnected}
        />
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete message?"
        description="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteDialog(false);
          setMessageToDelete(null);
        }}
        isPending={isPending}
      />
    </div>
  );
}
