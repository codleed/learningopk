"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, BookOpen, Copy, Check } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClassroom } from "@/lib/teacher-api";

type Classroom = {
  id: number;
  teacherId: string;
  name: string;
  boardId: number;
  grade: string;
  inviteCode: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
};

type TeacherDashboardClientProps = {
  initialClassrooms: Classroom[];
};

export function TeacherDashboardClient({ initialClassrooms }: TeacherDashboardClientProps) {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("9");
  const [description, setDescription] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const newClassroom = await createClassroom({
        name: name.trim(),
        boardId: 1,
        grade,
        description: description.trim() || undefined,
      });
      if (newClassroom) {
        setClassrooms((prev) => [newClassroom, ...prev]);
        setName("");
        setGrade("9");
        setDescription("");
        setDialogOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Your Classrooms</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" iconLeft={<Plus className="h-4 w-4" />}>
              Create Classroom
            </Button>
          </DialogTrigger>
          <DialogHeader>
            <DialogTitle>Create New Classroom</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 9th Grade Physics"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Grade</label>
              <select
                className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="9">9th Grade</option>
                <option value="10">10th Grade</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description..."
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={isCreating}>
              Create
            </Button>
          </DialogFooter>
        </Dialog>
      </div>

      {classrooms.length === 0 ? (
        <EmptyState
          title="No classrooms yet"
          description="Create your first classroom to start inviting students."
          action={
            <Button onClick={() => setDialogOpen(true)} iconLeft={<Plus className="h-4 w-4" />}>
              Create Classroom
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <ClassroomCard
              key={classroom.id}
              classroom={classroom}
              onClick={() => router.push(`/teacher/${classroom.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassroomCard({
  classroom,
  onClick,
}: {
  classroom: Classroom;
  onClick: () => void;
}) {
  const { copied, copy: copyCode } = useClipboard();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyCode(classroom.inviteCode);
  };

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardHeader>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{classroom.name}</CardTitle>
            <CardDescription>
              Grade {classroom.grade} • {classroom.description ?? "No description"}
            </CardDescription>
          </div>
          <Badge variant="primary">{classroom.grade}</Badge>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{classroom.studentCount ?? 0} students</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>Board {classroom.boardId}</span>
          </div>
        </div>
      </CardBody>
      <CardFooter>
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate text-xs font-mono uppercase text-text-muted">
            Code: {classroom.inviteCode}
          </span>
          <button
            onClick={handleCopy}
            className="rounded p-1 hover:bg-[var(--muted)]"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
