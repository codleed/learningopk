"use client";

import { User, Trash } from "@phosphor-icons/react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/friends-api";

type ConversationListItemProps = {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
};

export function ConversationListItem({
  conversation,
  isActive = false,
  onClick,
  onDelete,
}: ConversationListItemProps) {
  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-colors",
        isActive ? "bg-[var(--primary)]/10" : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="relative shrink-0">
        {conversation.participantImage ? (
          <Image
            src={conversation.participantImage}
            alt={conversation.participantName}
            width={48}
            height={48}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
            <User className="h-6 w-6" weight="fill" />
          </div>
        )}
        {conversation.participantIsOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            "font-semibold truncate",
            conversation.unreadCount > 0 ? "text-foreground" : "text-foreground/90"
          )}>
            {conversation.participantName}
          </h3>
          {conversation.lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-sm truncate",
            conversation.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
          )}>
            {conversation.lastMessage || "No messages yet"}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-bold text-[var(--primary-foreground)]">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>

      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
        onClick={(e) => {
          e.stopPropagation();
          onDelete?.();
        }}
        aria-label="Delete conversation"
      >
        <Trash className="h-4 w-4" />
      </button>
    </div>
  );
}
