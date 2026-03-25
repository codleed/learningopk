"use client";

import { useCallback, useState } from "react";
import { Bell, Check, Checks, UserPlus, ChatCircle, UserMinus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/friends-api";

type NotificationPanelProps = {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
  isLoading?: boolean;
};

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onNotificationClick,
  isLoading = false,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "friend_request_received":
        return <UserPlus className="h-5 w-5 text-[var(--primary)]" weight="fill" />;
      case "friend_request_accepted":
        return <UserMinus className="h-5 w-5 text-success" weight="fill" />;
      case "new_message":
        return <ChatCircle className="h-5 w-5 text-info" weight="fill" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

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
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-[var(--elevation-medium)]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" weight="fill" />
          <h2 className="font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-bold text-[var(--primary-foreground)]">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            disabled={isLoading}
          >
            <Checks className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  className={cn(
                    "w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50",
                    !notification.isRead && "bg-[var(--primary)]/5"
                  )}
                  onClick={() => {
                    onMarkAsRead(notification.id);
                    onNotificationClick?.(notification);
                  }}
                >
                  <div className={cn(
                    "mt-0.5 shrink-0 flex h-10 w-10 items-center justify-center rounded-full",
                    !notification.isRead ? "bg-[var(--primary)]/10" : "bg-muted"
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      !notification.isRead ? "font-semibold text-foreground" : "text-foreground/90"
                    )}>
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--primary)] shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
