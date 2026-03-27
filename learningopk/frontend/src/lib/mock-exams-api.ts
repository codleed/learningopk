import { z } from "zod";

const mockExamSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  year: z.number().int(),
  durationMinutes: z.number().int(),
  totalMarks: z.number().int(),
  boardId: z.number().int(),
  boardName: z.string(),
  boardSlug: z.string(),
  grade: z.enum(["9", "10"]),
  subjectId: z.number().int(),
  subjectName: z.string(),
  subjectSlug: z.string(),
  quizId: z.number().int()
});

const mockExamDetailSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  year: z.number().int(),
  durationMinutes: z.number().int(),
  totalMarks: z.number().int(),
  boardId: z.number().int(),
  boardName: z.string(),
  boardSlug: z.string(),
  grade: z.enum(["9", "10"]),
  subjectId: z.number().int(),
  subjectName: z.string(),
  subjectSlug: z.string(),
  quizId: z.number().int(),
  quizTitle: z.string(),
  quizType: z.enum(["chapter_quiz", "mock_exam"]),
  quizDurationMinutes: z.number().int()
});

const quizAttemptSchema = z.object({
  id: z.string().uuid(),
  score: z.number().int(),
  totalMarks: z.number().int(),
  completedAt: z.string().datetime()
});

const quizQuestionSchema = z.object({
  id: z.number().int().positive(),
  quizId: z.number().int().positive(),
  chapterId: z.number().int().positive().nullable(),
  question: z.string(),
  optionA: z.string(),
  optionB: z.string(),
  optionC: z.string(),
  optionD: z.string(),
  correctOption: z.enum(["a", "b", "c", "d"]),
  explanation: z.string().nullable(),
  marks: z.number().int().positive(),
  chapterTitle: z.string().nullable(),
  chapterNumber: z.number().int().positive().nullable()
});

const filterOptionsSchema = z.object({
  boards: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string()
  })),
  grades: z.array(z.enum(["9", "10"])),
  subjects: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string()
  })),
  years: z.array(z.number().int())
});

export type MockExam = z.infer<typeof mockExamSchema>;
export type MockExamDetail = z.infer<typeof mockExamDetailSchema>;
export type QuizAttempt = z.infer<typeof quizAttemptSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type FilterOptions = z.infer<typeof filterOptionsSchema>;

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const fetchJson = async <T>(
  url: string,
  schema: z.ZodType<T>,
  options?: {
    cookieHeader?: string;
    includeCredentials?: boolean;
  }
): Promise<T> => {
  const headers: Record<string, string> = {};
  if (options?.cookieHeader) {
    headers.cookie = options.cookieHeader;
  }

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(options?.includeCredentials && !options.cookieHeader ? { credentials: "include" as const } : {})
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return schema.parse(json);
};

export type MockExamFilters = {
  boardId?: number;
  grade?: "9" | "10";
  subjectId?: number;
  year?: number;
};

export const getMockExamFilters = async (): Promise<FilterOptions> => {
  const url = `${backendUrl}/api/mock-exams/filters/options`;
  const response = await fetchJson(url, z.object({ filters: filterOptionsSchema }));
  return response.filters;
};

export const getMockExams = async (filters?: MockExamFilters): Promise<MockExam[]> => {
  const params = new URLSearchParams();
  if (filters?.boardId) params.set("boardId", String(filters.boardId));
  if (filters?.grade) params.set("grade", filters.grade);
  if (filters?.subjectId) params.set("subjectId", String(filters.subjectId));
  if (filters?.year) params.set("year", String(filters.year));

  const url = `${backendUrl}/api/mock-exams${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetchJson(url, z.object({ mockExams: z.array(mockExamSchema) }));
  return response.mockExams;
};

export const getMockExam = async (id: number): Promise<MockExamDetail> => {
  const url = `${backendUrl}/api/mock-exams/${id}`;
  const response = await fetchJson(url, z.object({ mockExam: mockExamDetailSchema }));
  return response.mockExam;
};

export const getMockExamAttempts = async (id: number): Promise<QuizAttempt[]> => {
  const url = `${backendUrl}/api/mock-exams/${id}/attempts`;
  const response = await fetchJson(url, z.object({ attempts: z.array(quizAttemptSchema) }), {
    includeCredentials: true
  });
  return response.attempts;
};

export const getQuizQuestions = async (mockExamId: number): Promise<QuizQuestion[]> => {
  const url = `${backendUrl}/api/mock-exams/${mockExamId}/questions`;
  const response = await fetchJson(url, z.object({ questions: z.array(quizQuestionSchema) }));
  return response.questions;
};
