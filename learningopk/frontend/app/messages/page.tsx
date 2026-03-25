"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChatCircle } from "@phosphor-icons/react";
import { LoadingSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConversationListItem } from "@/components/chat/conversation-list-item";
import {
  getConversations,
  deleteConversation,
  type Conversation,
} from "@/lib/friends-api";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getConversations();
      setConversations(data.conversations);
    } catch {
      setError("Failed to load conversations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleConversationClick = useCallback((conversation: Conversation) => {
    window.location.href = `/messages/${conversation.id}`;
  }, []);

  const handleDeleteClick = useCallback((conversation: Conversation) => {
    setConversationToDelete(conversation);
    setShowDeleteDialog(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!conversationToDelete) return;

    startTransition(async () => {
      try {
        await deleteConversation(conversationToDelete.id);
        setConversations((prev) =>
          prev.filter((c) => c.id !== conversationToDelete.id)
        );
      } catch {
        console.error("Failed to delete conversation");
      } finally {
        setShowDeleteDialog(false);
        setConversationToDelete(null);
      }
    });
  }, [conversationToDelete]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="text-muted-foreground mt-1">
          Your conversations with friends
        </p>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} variant="list" />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <ChatCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No messages yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Start a conversation with a friend
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                onClick={() => handleConversationClick(conversation)}
                onDelete={() => handleDeleteClick(conversation)}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete conversation?"
        description={`Are you sure you want to delete your conversation with ${conversationToDelete?.participantName}? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteDialog(false);
          setConversationToDelete(null);
        }}
        isPending={isPending}
      />
    </div>
  );
}
