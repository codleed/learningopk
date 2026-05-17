import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const schoolSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  board: z.string(),
  inviteCode: z.string(),
  studentCount: z.number(),
});

const dashboardSchema = z.object({
  school: schoolSchema,
  analytics: z.object({
    studentCount: z.number(),
    avgQuizScore: z.number(),
    topStudents: z.array(z.object({
      id: z.string(),
      name: z.string(),
      class: z.string().nullable(),
      xp: z.number(),
      level: z.number(),
    })),
    weakAreas: z.array(z.object({
      chapterId: z.number(),
      avgScore: z.number(),
      studentCount: z.number(),
    })),
  }),
});

const joinResponseSchema = z.object({
  schoolId: z.number(),
  name: z.string(),
});

async function fetchSchoolJson<T>(path: string, schema: z.ZodType<T>, options?: RequestInit): Promise<T | null> {
  const response = await fetch(`${backendUrl}${path}`, {
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) throw new Error(`School API error: ${response.status}`);
  const json = await response.json();
  return schema.parse(json.data ?? json);
}

export async function getMySchool() {
  return fetchSchoolJson("/api/schools/me", schoolSchema.nullable());
}

export async function joinSchool(inviteCode: string) {
  return fetchSchoolJson("/api/schools/join", joinResponseSchema, {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
}

export async function getSchoolDashboard() {
  return fetchSchoolJson("/api/schools/dashboard", dashboardSchema);
}

export async function getSchoolStudents() {
  const schema = z.object({ students: z.array(z.object({
    id: z.string(), name: z.string(), email: z.string(), class: z.string().nullable(),
    xp: z.number(), level: z.number(), createdAt: z.string(),
  })) });
  return fetchSchoolJson("/api/schools/students", schema);
}
