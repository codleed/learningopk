import { z } from "zod";

const chapterListItemSchema = z.object({
  id: z.number().int().positive(),
  chapterNumber: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  isPublished: z.boolean()
});

const subjectResponseSchema = z.object({
  board: z.object({
    slug: z.string(),
    name: z.string()
  }),
  grade: z.string(),
  class: z.object({
    slug: z.string(),
    name: z.string()
  }),
  subject: z.object({
    id: z.number().int().positive(),
    slug: z.string(),
    name: z.string(),
    description: z.string()
  }),
  chapters: z.array(chapterListItemSchema)
});

const subjectGraphResponseSchema = z.object({
  graph: z.object({
    nodes: z.array(
      z.object({
        id: z.number().int().positive(),
        chapterNumber: z.number().int().positive(),
        title: z.string(),
        slug: z.string(),
        isPublished: z.boolean(),
        visited: z.boolean().optional(),
        completed: z.boolean().optional()
      })
    ),
    edges: z.array(
      z.object({
        sourceChapterId: z.number().int().positive(),
        targetChapterId: z.number().int().positive().nullable(),
        isResolved: z.boolean()
      })
    )
  })
});

const chapterDetailResponseSchema = z.object({
  board: z.object({
    slug: z.string(),
    name: z.string()
  }),
  grade: z.string(),
  class: z.object({
    slug: z.string(),
    name: z.string()
  }),
  subject: z.object({
    id: z.number().int().positive(),
    slug: z.string(),
    name: z.string()
  }),
  chapter: z.object({
    id: z.number().int().positive(),
    chapterNumber: z.number().int().positive(),
    title: z.string(),
    slug: z.string(),
    summary: z.string()
  }),
  exercises: z.array(
    z.object({
      id: z.number().int().positive(),
      exerciseNumber: z.string(),
      question: z.string(),
      solution: z.string(),
      difficulty: z.enum(["easy", "medium", "hard"]),
      type: z.enum(["mcq", "short", "long", "numerical"])
    })
  ),
  flashcards: z.array(
    z.object({
      id: z.number().int().positive(),
      front: z.string(),
      back: z.string(),
      orderIndex: z.number().int().min(0)
    })
  ),
  quiz: z
    .object({
      id: z.number().int().positive(),
      title: z.string(),
      durationMinutes: z.number().int().positive(),
      totalMarks: z.number().int().min(0),
      type: z.enum(["chapter_quiz", "mock_exam"]),
      questions: z.array(
        z.object({
          id: z.number().int().positive(),
          question: z.string(),
          optionA: z.string(),
          optionB: z.string(),
          optionC: z.string(),
          optionD: z.string(),
          marks: z.number().int().positive()
        })
      )
    })
    .nullable()
});

export type SubjectResponse = z.infer<typeof subjectResponseSchema>;
export type SubjectGraphResponse = z.infer<typeof subjectGraphResponseSchema>;
export type ChapterDetailResponse = z.infer<typeof chapterDetailResponseSchema>;

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const fetchLearnJson = async <T>(
  url: string,
  schema: z.ZodType<T>,
  options?: {
    cookieHeader?: string;
    includeCredentials?: boolean;
  }
): Promise<T | null> => {
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

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Learn API request failed: ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return schema.parse(json);
};

export const getSubjectOverview = async (params: { board: string; grade: string; subject: string }) => {
  const url = `${backendUrl}/api/learn/${params.board}/${params.grade}/${params.subject}`;
  return fetchLearnJson(url, subjectResponseSchema);
};

export const getChapterDetail = async (params: { board: string; grade: string; subject: string; chapter: string }) => {
  const url = `${backendUrl}/api/learn/${params.board}/${params.grade}/${params.subject}/${params.chapter}`;
  return fetchLearnJson(url, chapterDetailResponseSchema);
};

export const getSubjectGraph = async (params: { board: string; grade: string; subject: string }) => {
  const url = `${backendUrl}/api/learn/${params.board}/${params.grade}/${params.subject}/graph`;
  return fetchLearnJson(url, subjectGraphResponseSchema, { includeCredentials: true });
};
