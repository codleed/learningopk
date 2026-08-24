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
    topStudents: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        class: z.string().nullable(),
        xp: z.number(),
        level: z.number(),
      })
    ),
    weakAreas: z.array(
      z.object({
        chapterId: z.number(),
        chapterTitle: z.string(),
        avgScore: z.number(),
        studentCount: z.number(),
      })
    ),
  }),
});

const joinResponseSchema = z.object({
  schoolId: z.number(),
  name: z.string(),
});

async function fetchSchoolJson<T>(
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
  if (!response.ok) throw new Error(`School API error: ${response.status}`);
  const json = await response.json();
  return schema.parse(json.data ?? json);
}

export async function getMySchool(cookieHeader?: string) {
  return fetchSchoolJson(
    "/api/schools/me",
    schoolSchema.nullable(),
    cookieHeader ? { cookieHeader } : undefined
  );
}

export async function joinSchool(inviteCode: string) {
  return fetchSchoolJson("/api/schools/join", joinResponseSchema, {
    method: "POST",
    body: JSON.stringify({ inviteCode }),
  });
}

export async function getSchoolDashboard(cookieHeader?: string) {
  return fetchSchoolJson(
    "/api/schools/dashboard",
    dashboardSchema,
    cookieHeader ? { cookieHeader } : undefined
  );
}

export async function getSchoolStudents(cookieHeader?: string) {
  const schema = z.object({
    students: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        class: z.string().nullable(),
        xp: z.number(),
        level: z.number(),
        createdAt: z.string(),
      })
    ),
  });
  return fetchSchoolJson(
    "/api/schools/students",
    schema,
    cookieHeader ? { cookieHeader } : undefined
  );
}

export async function checkSchoolAdmin(): Promise<boolean> {
  try {
    const schema = z.object({ isAdmin: z.boolean() });
    const result = await fetchSchoolJson("/api/schools/check-admin", schema);
    return result?.isAdmin ?? false;
  } catch {
    return false;
  }
}

const schoolListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  board: z.string(),
  inviteCode: z.string(),
  studentCount: z.number(),
  adminUserId: z.string().nullable(),
  createdAt: z.string(),
});

const schoolListSchema = z.object({
  schools: z.array(schoolListItemSchema),
});

export type SchoolListItem = z.infer<typeof schoolListItemSchema>;

export async function getSchools(cookieHeader?: string) {
  return fetchSchoolJson(
    "/api/schools",
    schoolListSchema,
    cookieHeader ? { cookieHeader } : undefined
  );
}

const createSchoolResponseSchema = z.object({
  school: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    board: z.string(),
    inviteCode: z.string(),
  }),
  principal: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    password: z.string(),
  }),
});

export async function createSchool(data: {
  name: string;
  board: string;
  principalName: string;
  principalEmail: string;
  principalPassword: string;
}) {
  return fetchSchoolJson("/api/schools", createSchoolResponseSchema, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteSchool(schoolId: number) {
  const response = await fetch(`${backendUrl}/api/schools/${schoolId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`Failed to delete school: ${response.status}`);
  return response.json();
}
