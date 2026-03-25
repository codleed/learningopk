"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "@phosphor-icons/react";
import { NotificationPanel } from "@/components/friends/notification-panel";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/lib/friends-api";
import { cn } from "@/lib/utils";

type NotificationBellProps = {
  className?: string;
};

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      console.error("Failed to fetch notifications");
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      console.error("Failed to mark notification as read");
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    setIsLoading(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch {
      console.error("Failed to mark all notifications as read");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    switch (notification.type) {
      case "friend_request_received":
      case "friend_request_accepted":
        window.location.href = "/friends";
        break;
      case "new_message":
        if (notification.data?.conversationId) {
          window.location.href = `/messages/${notification.data.conversationId}`;
        } else {
          window.location.href = "/messages";
        }
        break;
      default:
        break;
    }

    setIsOpen(false);
  }, [handleMarkAsRead]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-xs font-bold text-[var(--primary-foreground)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationPanel
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationClick={handleNotificationClick}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
