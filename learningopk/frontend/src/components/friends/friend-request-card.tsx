"use client";

import { User, Check, X } from "@phosphor-icons/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { FriendRequest } from "@/lib/friends-api";

type FriendRequestCardProps = {
  request: FriendRequest;
  type: "incoming" | "outgoing";
  onAccept?: (requestId: string) => void;
  onDecline?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  isLoading?: boolean;
  loadingRequestId?: string | null;
};

export function FriendRequestCard({
  request,
  type,
  onAccept,
  onDecline,
  onCancel,
  isLoading = false,
  loadingRequestId = null,
}: FriendRequestCardProps) {
  const isThisLoading = isLoading && loadingRequestId === request.id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="relative">
          {request.senderImage ? (
            <Image
              src={request.senderImage}
              alt={request.senderName}
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
          <h3 className="font-semibold text-foreground truncate">{request.senderName}</h3>
          {request.senderInstituteName && (
            <p className="text-sm text-muted-foreground truncate">{request.senderInstituteName}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {type === "incoming" ? "Sent you a friend request" : "Request sent"} · {formatTime(request.createdAt)}
          </p>
        </div>

        <div className="shrink-0 flex gap-2">
          {type === "incoming" ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={() => onAccept?.(request.id)}
                disabled={isThisLoading}
              >
                <Check className="h-4 w-4" weight="bold" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onDecline?.(request.id)}
                disabled={isThisLoading}
              >
                <X className="h-4 w-4" weight="bold" />
                Decline
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onCancel?.(request.id)}
              disabled={isThisLoading}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
