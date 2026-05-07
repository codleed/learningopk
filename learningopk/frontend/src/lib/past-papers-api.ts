import { z } from "zod";

const pastPaperSchema = z.object({
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
  paperContent: z.string().nullable().optional(),
  solutionContent: z.string().nullable().optional(),
  published: z.boolean().optional(),
  description: z.string().nullable().optional(),
  exerciseCount: z.number().int().optional()
});

const exerciseBaseSchema = z.object({
  id: z.number().int().positive(),
  exerciseNumber: z.string(),
  question: z.string(),
  type: z.enum(["mcq", "short", "long", "numerical", "fill_in_blanks"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  options: z.array(z.object({ key: z.string(), text: z.string() })).nullable().optional(),
  correctOption: z.string().nullable().optional(),
  blanksAnswer: z.array(z.string()).nullable().optional(),
  statements: z.array(z.object({
    text: z.string(),
    blanksAnswer: z.array(z.string())
  })).nullable().optional(),
  problemMarkdown: z.string().nullable().optional(),
  orderIndex: z.number().int(),
  marks: z.number().int().nullable().optional()
});

const attemptSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  mockExamId: z.number().int(),
  startedAt: z.string(),
  timeLimitSeconds: z.number().int(),
  status: z.enum(["in_progress", "submitted", "timed_out"]),
  totalMarks: z.number().int().nullable(),
  score: z.number().int().nullable(),
  percentage: z.number().nullable(),
  submittedAt: z.string().nullable().optional()
});

const paginatedResponseSchema = z.object({
  data: z.array(pastPaperSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  })
});

export type PastPaper = z.infer<typeof pastPaperSchema>;
export type AttemptExercise = z.infer<typeof exerciseBaseSchema>;
export type PastPaperAttempt = z.infer<typeof attemptSchema>;
export type PaginatedPastPapers = z.infer<typeof paginatedResponseSchema>;

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export class PastPaperApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null,
    message: string
  ) {
    super(message);
    this.name = "PastPaperApiError";
  }
}

const apiFetch = async <T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> ?? {})
    }
  });

  const json = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new PastPaperApiError(
      response.status,
      (json.code as string) ?? null,
      (json.error as string) ?? `Request failed: ${response.status}`
    );
  }

  return schema.parse(json) as T;
};

export async function getPastPapers(params?: {
  page?: number;
  limit?: number;
  subjectId?: number;
  year?: number;
  search?: string;
}): Promise<PaginatedPastPapers> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.subjectId) searchParams.set("subjectId", String(params.subjectId));
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.search) searchParams.set("search", params.search);

  const qs = searchParams.toString();
  return apiFetch(
    `${backendUrl}/api/past-papers${qs ? `?${qs}` : ""}`,
    paginatedResponseSchema
  );
}

export async function startAttempt(paperId: number): Promise<{
  attempt: PastPaperAttempt;
  exercises: AttemptExercise[];
  savedAnswers: Record<number, unknown>;
}> {
  const resultSchema = z.object({
    data: z.object({
      attempt: attemptSchema,
      exercises: z.array(exerciseBaseSchema),
      savedAnswers: z.record(z.string(), z.unknown())
    })
  });

  return apiFetch(`${backendUrl}/api/past-papers/${paperId}/attempt/start`, resultSchema)
    .then(r => r.data);
}

export async function saveAnswer(params: {
  paperId: number;
  attemptId: string;
  exerciseId: number;
  answer: unknown;
}): Promise<void> {
  await apiFetch(
    `${backendUrl}/api/past-papers/${params.paperId}/attempt/save`,
    z.object({ data: z.object({ saved: z.boolean() }) }),
    {
      method: "POST",
      body: JSON.stringify({
        attemptId: params.attemptId,
        exerciseId: params.exerciseId,
        answer: params.answer
      })
    }
  );
}

export async function submitAttempt(params: {
  paperId: number;
  attemptId: string;
}): Promise<{
  attemptId: string;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  gradedQuestions: Array<{
    exerciseId: number;
    score: number;
    maxMarks: number;
    isCorrect: boolean;
    needsAiGrading: boolean;
    aiFeedback?: string;
    userAnswer?: unknown;
  }>;
  xpAwarded: number;
}> {
  const resultSchema = z.object({
    data: z.object({
      attemptId: z.string().uuid(),
      totalScore: z.number(),
      totalMarks: z.number(),
      percentage: z.number(),
      gradedQuestions: z.array(z.object({
        exerciseId: z.number(),
        score: z.number(),
        maxMarks: z.number(),
        isCorrect: z.boolean(),
        needsAiGrading: z.boolean(),
        aiFeedback: z.string().optional(),
        userAnswer: z.unknown().optional()
      })),
      xpAwarded: z.number()
    })
  });

  return apiFetch(
    `${backendUrl}/api/past-papers/${params.paperId}/attempt/submit`,
    resultSchema,
    {
      method: "POST",
      body: JSON.stringify({ attemptId: params.attemptId })
    }
  ).then(r => r.data);
}

export async function getAttemptDetail(paperId: number, attemptId: string): Promise<{
  attempt: PastPaperAttempt;
  answers: Array<{ id: string; attemptId: string; exerciseId: number; answer: unknown; score: number | null; aiFeedback: string | null }>;
  exercises: AttemptExercise[];
}> {
  const resultSchema = z.object({
    data: z.object({
      attempt: attemptSchema,
      answers: z.array(z.object({
        id: z.string(),
        attemptId: z.string(),
        exerciseId: z.number(),
        answer: z.unknown(),
        score: z.number().nullable(),
        aiFeedback: z.string().nullable()
      })),
      exercises: z.array(exerciseBaseSchema)
    })
  });

  return apiFetch(
    `${backendUrl}/api/past-papers/${paperId}/attempts/${attemptId}`,
    resultSchema
  ).then(r => r.data);
}
