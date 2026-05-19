import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

async function fetchTeacherJson<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit & { cookieHeader?: string }
): Promise<T | null> {
  const { cookieHeader, ...fetchOptions } = options ?? {};
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  if (fetchOptions.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${backendUrl}${path}`, {
    cache: "no-store",
    ...(!cookieHeader ? { credentials: "include" } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...fetchOptions,
  });
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Teacher API error: ${response.status}`);
  const json = await response.json();
  return schema.parse(json.data ?? json);
}

// --- Schemas ---

const classroomSchema = z.object({
  id: z.number(),
  teacherId: z.string(),
  name: z.string(),
  boardId: z.number(),
  grade: z.string(),
  inviteCode: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  studentCount: z.number().optional(),
});

const assignmentSchema = z.object({
  id: z.number(),
  classroomId: z.number(),
  type: z.enum(["chapter", "quiz", "mock_exam"]),
  targetId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string().nullable(),
  points: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  submissionCount: z.number().optional(),
  studentCount: z.number().optional(),
  status: z.enum(["not_started", "in_progress", "submitted"]).optional(),
  score: z.number().nullable().optional(),
});

const announcementSchema = z.object({
  id: z.number(),
  classroomId: z.number(),
  teacherId: z.string(),
  content: z.string(),
  pinned: z.boolean(),
  createdAt: z.string(),
});

const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  xp: z.number(),
  level: z.number(),
  enrolledAt: z.string(),
  completionPercent: z.number().optional(),
});

// --- Teacher endpoints ---

export async function getClassroomById(classroomId: number, cookieHeader?: string) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}`, classroomSchema, cookieHeader ? { cookieHeader } : undefined);
}

export async function getClassrooms(cookieHeader?: string) {
  return fetchTeacherJson("/api/teacher/classrooms", z.array(classroomSchema), cookieHeader ? { cookieHeader } : undefined);
}

export async function createClassroom(data: {
  name: string;
  boardId: number;
  grade: string;
  description?: string;
}) {
  return fetchTeacherJson("/api/teacher/classrooms", classroomSchema, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClassroom(classroomId: number, data: Partial<{
  name: string;
  boardId: number;
  grade: string;
  description: string | null;
}>) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}`, classroomSchema, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteClassroom(classroomId: number) {
  const response = await fetch(`${backendUrl}/api/teacher/classrooms/${classroomId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Failed to delete classroom: ${response.status}`);
  return response.json();
}

export async function getStudents(classroomId: number, cookieHeader?: string) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}/students`, z.array(studentSchema), cookieHeader ? { cookieHeader } : undefined);
}

export async function removeStudent(classroomId: number, studentId: string) {
  const response = await fetch(`${backendUrl}/api/teacher/classrooms/${classroomId}/students/${studentId}/remove`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Failed to remove student: ${response.status}`);
  return response.json();
}

export async function getAssignments(classroomId: number, cookieHeader?: string) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}/assignments`, z.array(assignmentSchema), cookieHeader ? { cookieHeader } : undefined);
}

export async function createAssignment(classroomId: number, data: {
  type: "chapter" | "quiz" | "mock_exam";
  targetId: number;
  title: string;
  description?: string;
  dueDate?: string;
  points?: number;
}) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}/assignments`, assignmentSchema, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAnnouncements(classroomId: number, cookieHeader?: string) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}/announcements`, z.array(announcementSchema), cookieHeader ? { cookieHeader } : undefined);
}

export async function createAnnouncement(classroomId: number, data: { content: string; pinned?: boolean }) {
  return fetchTeacherJson(`/api/teacher/classrooms/${classroomId}/announcements`, announcementSchema, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Student endpoints ---

export async function joinClassroom(inviteCode: string) {
  return fetchTeacherJson("/api/classrooms/join", z.object({ classroomId: z.number(), name: z.string(), teacherId: z.string() }), {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
}

export async function getMyClassroom(cookieHeader?: string) {
  return fetchTeacherJson("/api/classrooms/me", classroomSchema.nullable(), cookieHeader ? { cookieHeader } : undefined);
}

export async function getMyAssignments(classroomId: number, cookieHeader?: string) {
  return fetchTeacherJson(`/api/classrooms/${classroomId}/assignments`, z.array(assignmentSchema), cookieHeader ? { cookieHeader } : undefined);
}

export async function getMyAnnouncements(classroomId: number, cookieHeader?: string) {
  return fetchTeacherJson(`/api/classrooms/${classroomId}/announcements`, z.array(announcementSchema), cookieHeader ? { cookieHeader } : undefined);
}
