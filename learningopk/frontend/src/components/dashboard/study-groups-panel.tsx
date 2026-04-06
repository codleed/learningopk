"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createStudyGroup, type StudyGroupsListResponse } from "@/lib/study-groups-api";

export function StudyGroupsPanel({ groups }: { groups: StudyGroupsListResponse["groups"] }) {
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [invites, setInvites] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card variant="gradient" className="overflow-hidden">
        <CardHeader className="border-b border-border-default/70 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.18),transparent_45%)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl"><Users className="h-5 w-5 text-accent-primary" />Study Groups</CardTitle>
              <CardDescription>Create a focused crew of up to 6 students. Invite by existing username or email only.</CardDescription>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary backdrop-blur">Async only</div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input label="Group name" placeholder="e.g. Physics Sprint Crew" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Invite classmates" placeholder="username or email, separated by commas" value={invites} onChange={(event) => setInvites(event.target.value)} />
          <div className="rounded-2xl border border-border-default bg-bg-subtle/70 p-4 text-sm text-text-secondary">Members are added immediately if they already exist. Unknown usernames/emails are rejected.</div>
        </CardBody>
        <CardFooter className="justify-between">
          <p className="text-xs text-text-secondary">Max 6 members per group.</p>
          <Button loading={isSubmitting} onClick={handleSubmit} iconRight={<Sparkles />}>Create group</Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4">
        {groups.length === 0 ? (
          <Card><CardHeader><CardTitle>No groups yet</CardTitle><CardDescription>Start with one high-signal study group instead of a noisy chat room.</CardDescription></CardHeader></Card>
        ) : groups.map((group) => (
          <Card key={group.id} className="border-border-default/80 bg-bg-surface/90 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription>{group.memberCount} members • created {new Date(group.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</CardDescription>
                </div>
                {group.notificationCount > 0 ? <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200"><Bell className="h-3.5 w-3.5" />{group.notificationCount}</div> : null}
              </div>
            </CardHeader>
            <CardFooter className="justify-end"><Link href={`/dashboard/groups/${group.id}`}><Button variant="secondary" size="sm">Open group</Button></Link></CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
