"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, ChevronUp, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createStudyGroup, type StudyGroupsListResponse } from "@/lib/study-groups-api";

export function StudyGroupsPanel({ groups }: { groups: StudyGroupsListResponse["groups"] }) {
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [invites, setInvites] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const parsedInvites = useMemo(() => invites.split(",").map((item) => item.trim()).filter(Boolean), [invites]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createStudyGroup({ name, invites: parsedInvites });
      pushToast({ title: "Study group created", description: "Shared progress and async notifications are now live.", tone: "success" });
      window.location.reload();
    } catch (error) {
      pushToast({ title: "Unable to create study group", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card variant="default">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-accent-primary" />
              Study Groups
            </CardTitle>
            <CardDescription>Create focused study crews of up to 6 students.</CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCreateForm((v) => !v)}
            iconRight={showCreateForm ? <ChevronUp /> : <ChevronDown />}
          >
            {showCreateForm ? "Close" : "Create Group"}
          </Button>
        </div>
      </CardHeader>

      {showCreateForm && (
        <CardBody className="space-y-4 border-b border-border-default/60">
          <Input label="Group name" placeholder="e.g. Physics Sprint Crew" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Invite classmates" placeholder="username or email, separated by commas" value={invites} onChange={(event) => setInvites(event.target.value)} />
          <div className="rounded-xl border border-border-default bg-bg-subtle/70 p-4 text-sm text-text-secondary">
            Members are added immediately if they already exist. Unknown usernames/emails are rejected.
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary">Max 6 members per group.</p>
            <Button loading={isSubmitting} onClick={handleSubmit} iconRight={<Sparkles />}>Create group</Button>
          </div>
        </CardBody>
      )}

      <CardBody className={showCreateForm ? "pt-4" : "pt-0"}>
        {groups.length === 0 ? (
          <div className="py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-text-muted" aria-hidden />
            <p className="mt-2 text-sm font-medium text-text-secondary">No groups yet</p>
            <p className="mt-1 text-xs text-text-muted">Start with one high-signal study group instead of a noisy chat room.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{group.name}</p>
                  <p className="text-xs text-text-muted">{group.memberCount} members · {new Date(group.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {group.notificationCount > 0 ? (
                    <div className="inline-flex items-center gap-1 rounded-full border border-accent-warning/30 bg-accent-warning-light px-2 py-1 text-xs font-semibold text-accent-warning">
                      <Bell className="h-3 w-3" />{group.notificationCount}
                    </div>
                  ) : null}
                  <Link href={`/dashboard/groups/${group.id}`}>
                    <Button variant="secondary" size="sm">Open</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
