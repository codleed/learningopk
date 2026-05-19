"use client";

import { useState } from "react";
import {
  Users,
  ClipboardList,
  Megaphone,
  BarChart3,
  Copy,
  Check,
  Trash2,
  Plus,
  Send,
} from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { removeStudent, createAssignment, createAnnouncement } from "@/lib/teacher-api";

type Classroom = {
  id: number;
  name: string;
  grade: string;
  inviteCode: string;
  description: string | null;
};

type Student = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  enrolledAt: string;
  completionPercent?: number;
};

type Assignment = {
  id: number;
  title: string;
  type: "chapter" | "quiz" | "mock_exam";
  dueDate: string | null;
  points: number;
  submissionCount?: number;
  studentCount?: number;
};

type Announcement = {
  id: number;
  content: string;
  pinned: boolean;
  createdAt: string;
};

type ClassroomDetailClientProps = {
  classroom: Classroom;
  initialStudents: Student[];
  initialAssignments: Assignment[];
  initialAnnouncements: Announcement[];
};

export function ClassroomDetailClient({
  classroom,
  initialStudents,
  initialAssignments,
  initialAnnouncements,
}: ClassroomDetailClientProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);

  return (
    <Tabs defaultValue="students">
      <TabList>
        <TabTrigger value="students">
          <Users className="mr-2 h-4 w-4" />
          Students ({students.length})
        </TabTrigger>
        <TabTrigger value="assignments">
          <ClipboardList className="mr-2 h-4 w-4" />
          Assignments
        </TabTrigger>
        <TabTrigger value="announcements">
          <Megaphone className="mr-2 h-4 w-4" />
          Announcements
        </TabTrigger>
        <TabTrigger value="reports">
          <BarChart3 className="mr-2 h-4 w-4" />
          Reports
        </TabTrigger>
      </TabList>

      <TabContent value="students">
        <StudentsTab classroom={classroom} students={students} setStudents={setStudents} />
      </TabContent>

      <TabContent value="assignments">
        <AssignmentsTab
          classroomId={classroom.id}
          assignments={assignments}
          setAssignments={setAssignments}
        />
      </TabContent>

      <TabContent value="announcements">
        <AnnouncementsTab
          classroomId={classroom.id}
          announcements={announcements}
          setAnnouncements={setAnnouncements}
        />
      </TabContent>

      <TabContent value="reports">
        <div className="py-8 text-center text-[var(--muted-foreground)]">
          Reports coming soon.
        </div>
      </TabContent>
    </Tabs>
  );
}

function StudentsTab({
  classroom,
  students,
  setStudents,
}: {
  classroom: Classroom;
  students: Student[];
  setStudents: (s: Student[]) => void;
}) {
  const { copied, copy: copyCode } = useClipboard();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleCopy = () => copyCode(classroom.inviteCode);

  const handleRemove = async (studentId: string) => {
    setRemovingId(studentId);
    try {
      await removeStudent(classroom.id, studentId);
      setStudents(students.filter((s) => s.id !== studentId));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Invite Code:</span>
          <code className="rounded bg-[var(--muted)] px-2 py-1 text-sm font-mono">
            {classroom.inviteCode}
          </code>
          <Button size="xs" variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="py-8 text-center text-[var(--muted-foreground)]">
          No students yet. Share the invite code to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">XP</th>
                <th className="pb-2 font-medium">Level</th>
                <th className="pb-2 font-medium">Completion</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3">{student.name}</td>
                  <td className="py-3">{student.xp}</td>
                  <td className="py-3">{student.level}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        (student.completionPercent ?? 0) >= 80
                          ? "success"
                          : (student.completionPercent ?? 0) >= 50
                            ? "warning"
                            : "danger"
                      }
                    >
                      {student.completionPercent ?? 0}%
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-red-500"
                      loading={removingId === student.id}
                      onClick={() => handleRemove(student.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({
  classroomId,
  assignments,
  setAssignments,
}: {
  classroomId: number;
  assignments: Assignment[];
  setAssignments: (a: Assignment[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"chapter" | "quiz" | "mock_exam">("quiz");
  const [targetId, setTargetId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !targetId.trim()) return;
    setIsCreating(true);
    try {
      const assignment = await createAssignment(classroomId, {
        type,
        targetId: parseInt(targetId, 10),
        title: title.trim(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      if (assignment) {
        setAssignments([assignment, ...assignments]);
        setTitle("");
        setTargetId("");
        setDueDate("");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Assignment</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Assignment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as Assignment["type"])}
            >
              <option value="chapter">Chapter</option>
              <option value="quiz">Quiz</option>
              <option value="mock_exam">Mock Exam</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Target ID (chapter/quiz/exam)"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              type="number"
            />
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} loading={isCreating} iconLeft={<Plus className="h-4 w-4" />}>
            Create Assignment
          </Button>
        </CardBody>
      </Card>

      {assignments.length === 0 ? (
        <div className="py-8 text-center text-[var(--muted-foreground)]">
          No assignments yet.
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <Card key={a.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {a.type} • Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}
                </div>
              </div>
              <Badge variant="default">
                {a.submissionCount ?? 0}/{a.studentCount ?? 0} submitted
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab({
  classroomId,
  announcements,
  setAnnouncements,
}: {
  classroomId: number;
  announcements: Announcement[];
  setAnnouncements: (a: Announcement[]) => void;
}) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    try {
      const announcement = await createAnnouncement(classroomId, { content: content.trim() });
      if (announcement) {
        setAnnouncements([announcement, ...announcements]);
        setContent("");
      }
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Post an announcement to your class..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handlePost}
            loading={isPosting}
            iconLeft={<Send className="h-4 w-4" />}
          >
            Post
          </Button>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="py-8 text-center text-[var(--muted-foreground)]">
          No announcements yet.
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="text-sm">{a.content}</div>
              <div className="mt-2 text-xs text-[var(--muted-foreground)]">
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
