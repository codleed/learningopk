"use client";

import { useState, type FormEvent } from "react";

import { SectionCard } from "@/components/foundation/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  createAdminNotification,
  getAdminNotifications,
  type AdminNotificationsResponse
} from "@/lib/admin-api";

import { AdminNotificationsTable } from "./admin-notifications-table";

type AdminNotificationsPanelProps = {
  initialPayload: AdminNotificationsResponse;
};

const notificationsPageSize = 10;

export function AdminNotificationsPanel({ initialPayload }: AdminNotificationsPanelProps) {
  const [entries, setEntries] = useState(initialPayload.entries);
  const [total, setTotal] = useState(initialPayload.total);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<"all" | "students" | "admins">("all");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { pushToast } = useToast();

  const refreshList = async () => {
    setIsRefreshing(true);
    try {
      const payload = await getAdminNotifications({
        page: 1,
        pageSize: notificationsPageSize
      });
      setEntries(payload.entries);
      setTotal(payload.total);
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to refresh notifications.";
      pushToast({
        tone: "error",
        title: "Notifications unavailable",
        description
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminNotification({
        title,
        message,
        audience
      });
      setTitle("");
      setMessage("");
      setAudience("all");
      pushToast({
        tone: "success",
        title: "Notification sent",
        description: "Broadcast was sent successfully."
      });
      await refreshList();
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to send notification.";
      pushToast({
        tone: "error",
        title: "Send failed",
        description
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Compose broadcast" description="Send immediate updates to admins, students, or everyone.">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="notification-title" className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Title
              </label>
              <Input
                id="notification-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Planned maintenance"
                maxLength={160}
                required
                minLength={5}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="notification-audience"
                className="text-xs font-semibold uppercase tracking-wide text-foreground"
              >
                Audience
              </label>
              <Select
                id="notification-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value as "all" | "students" | "admins")}
                disabled={isSubmitting}
              >
                <option value="all">All users</option>
                <option value="students">Students</option>
                <option value="admins">Admins</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="notification-message" className="text-xs font-semibold uppercase tracking-wide text-foreground">
              Message
            </label>
            <Textarea
              id="notification-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="The platform will be temporarily unavailable..."
              required
              minLength={10}
              maxLength={2000}
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send notification"}
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title="Notification history"
        description={`Showing latest broadcasts (${entries.length} of ${total}).`}
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => void refreshList()} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      >
        <AdminNotificationsTable rows={entries} />
      </SectionCard>
    </div>
  );
}
