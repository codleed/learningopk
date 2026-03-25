"use client";

import { User, ChatCircle, UserMinus } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Friend } from "@/lib/friends-api";

type FriendCardProps = {
  friend: Friend;
  onMessage?: (friendId: string) => void;
  onRemove?: (friendId: string) => void;
  isLoading?: boolean;
  loadingFriendId?: string | null;
};

export function FriendCard({
  friend,
  onMessage,
  onRemove,
  isLoading = false,
  loadingFriendId = null,
}: FriendCardProps) {
  const isThisLoading = isLoading && loadingFriendId === friend.id;

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return null;
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Last seen just now";
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays < 7) return `Last seen ${diffDays}d ago`;
    return `Last seen ${date.toLocaleDateString()}`;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="relative">
          {friend.image ? (
            <Image
              src={friend.image}
              alt={friend.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
              <User className="h-6 w-6" weight="fill" />
            </div>
          )}
          {friend.isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{friend.name}</h3>
          {friend.instituteName && (
            <p className="text-sm text-muted-foreground truncate">{friend.instituteName}</p>
          )}
          {friend.isOnline ? (
            <p className="text-xs text-success">Online</p>
          ) : friend.lastSeen ? (
            <p className="text-xs text-muted-foreground">{formatLastSeen(friend.lastSeen)}</p>
          ) : null}
        </div>

        <div className="shrink-0 flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => onMessage?.(friend.id)}
            disabled={isThisLoading}
          >
            <ChatCircle className="h-4 w-4" weight="fill" />
            Message
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove?.(friend.id)}
            disabled={isThisLoading}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
