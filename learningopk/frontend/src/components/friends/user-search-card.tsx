"use client";

import { User, Users } from "@phosphor-icons/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserSearchResult } from "@/lib/friends-api";

type UserSearchCardProps = {
  user: UserSearchResult;
  onAddFriend?: (userId: string) => void;
  onCancelRequest?: (userId: string) => void;
  onBlock?: (userId: string) => void;
  isLoading?: boolean;
  loadingUserId?: string | null;
};

export function UserSearchCard({
  user,
  onAddFriend,
  onCancelRequest,
  onBlock,
  isLoading = false,
  loadingUserId = null,
}: UserSearchCardProps) {
  const isThisLoading = isLoading && loadingUserId === user.id;

  const getActionButton = () => {
    switch (user.friendStatus) {
      case "none":
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => onAddFriend?.(user.id)}
            disabled={isThisLoading}
          >
            Add Friend
          </Button>
        );
      case "pending_sent":
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onCancelRequest?.(user.id)}
            disabled={isThisLoading}
          >
            Cancel
          </Button>
        );
      case "pending_received":
        return (
          <Button
            size="sm"
            variant="secondary"
            disabled
          >
            Respond
          </Button>
        );
      case "friends":
        return (
          <Button
            size="sm"
            variant="ghost"
            disabled
          >
            Friends
          </Button>
        );
      case "blocked":
        return (
          <Button
            size="sm"
            variant="ghost"
            disabled
          >
            Blocked
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="relative">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/20 text-[var(--primary)]">
              <User className="h-6 w-6" weight="fill" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{user.name}</h3>
          {user.instituteName && (
            <p className="text-sm text-muted-foreground truncate">{user.instituteName}</p>
          )}
          {user.mutualFriendsCount > 0 && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" weight="fill" />
              <span>{user.mutualFriendsCount} mutual friends</span>
            </div>
          )}
        </div>

        <div className="shrink-0">
          {getActionButton()}
        </div>
      </div>
    </div>
  );
}
