"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, ClipboardList, BookOpen, Copy, Check, ArrowRight } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Card, CardHeader, CardBody, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { joinClassroom } from "@/lib/teacher-api";

type Classroom = {
  id: number;
  name: string;
  teacherId: string;
  grade: string;
  inviteCode: string;
} | null;

type Assignment = {
  id: number;
  title: string;
  targetId: number;
  type: "chapter" | "quiz" | "mock_exam";
  dueDate: string | null;
  points: number;
  status?: "not_started" | "in_progress" | "submitted";
  score?: number | null;
};

type Announcement = {
  id: number;
  content: string;
  pinned: boolean;
  createdAt: string;
};

type StudentClassroomClientProps = {
  classroom: Classroom;
  initialAssignments: Assignment[];
  initialAnnouncements: Announcement[];
};

export function StudentClassroomClient({
  classroom,
  initialAssignments,
  initialAnnouncements,
}: StudentClassroomClientProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setIsJoining(true);
    setError("");
    try {
      await joinClassroom(inviteCode.trim().toUpperCase());
      setJoined(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join classroom");
    } finally {
      setIsJoining(false);
    }
  };

  if (!classroom) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <EmptyState
          title="Not in a classroom"
          description="Enter your teacher's invite code to join a classroom."
        />
        <div className="space-y-2">
          <label htmlFor="classroom-invite-code" className="sr-only">
            Classroom invite code
          </label>
          <Input
            id="classroom-invite-code"
            placeholder="Enter 6-character invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            maxLength={6}
            className="text-center font-mono uppercase"
          />
          {error && <p className="text-sm text-accent-danger" role="alert">{error}</p>}
          <Button
            className="w-full"
            onClick={handleJoin}
            loading={isJoining}
            iconLeft={<BookOpen className="h-4 w-4" />}
          >
            Join Classroom
          </Button>
        </div>
        {joined && (
          <p className="text-center text-sm text-accent-success" role="status">
            Successfully joined! Refreshing...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClassroomInfoCard classroom={classroom} />
      <AnnouncementsList announcements={initialAnnouncements} />
      <AssignmentsList assignments={initialAssignments} />
    </div>
  );
}

function ClassroomInfoCard({ classroom }: { classroom: NonNullable<Classroom> }) {
  const { copied, copy } = useClipboard();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{classroom.name}</CardTitle>
            <CardDescription>Grade {classroom.grade}</CardDescription>
          </div>
          <Badge variant="primary">Active</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-secondary">Invite code:</span>
          <code className="rounded bg-bg-subtle px-2 py-1 font-mono text-sm">
            {classroom.inviteCode}
          </code>
          <button
            type="button"
            onClick={() => copy(classroom.inviteCode)}
            className="rounded p-1 text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
            aria-label={copied ? "Invite code copied" : "Copy invite code"}
          >
            {copied ? <Check className="h-3 w-3 text-accent-success" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Megaphone className="h-4 w-4" />
        Announcements
      </h3>
      {announcements.length === 0 ? (
        <p className="text-sm text-text-secondary">No announcements yet.</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className="p-3">
              <p className="text-sm">{a.content}</p>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                {new Date(a.createdAt).toLocaleString()}
                {a.pinned && <Badge variant="primary" className="ml-2">Pinned</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentsList({ assignments }: { assignments: Assignment[] }) {
  const getStatusBadge = (status?: Assignment["status"]) => {
    switch (status) {
      case "submitted":
        return <Badge variant="success">Submitted</Badge>;
      case "in_progress":
        return <Badge variant="warning">In Progress</Badge>;
      default:
        return <Badge variant="default">Not Started</Badge>;
    }
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getAssignmentHref = (assignment: Assignment) => {
    switch (assignment.type) {
      case "chapter":
        return "/subjects";
      case "quiz":
        return "/practice";
      case "mock_exam":
        return "/past-papers";
    }
  };

  const getActionLabel = (status?: Assignment["status"]) => {
    if (status === "submitted") return "Review";
    if (status === "in_progress") return "Continue";
    return "Start";
  };

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <ClipboardList className="h-4 w-4" />
        Assignments
      </h3>
      {assignments.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No assignments yet.</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium text-text-primary">{a.title}</div>
                <div className="text-xs text-text-secondary">
                  {a.type} • {a.points} pts
                  {a.dueDate && (
                    <span className={isOverdue(a.dueDate) ? "ml-2 text-accent-danger" : "ml-2"}>
                      Due: {new Date(a.dueDate).toLocaleDateString()}
                      {isOverdue(a.dueDate) && " (Overdue)"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                {getStatusBadge(a.status)}
                <Link
                  href={getAssignmentHref(a)}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
                >
                  {getActionLabel(a.status)}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
