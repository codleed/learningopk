import { z } from "zod";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const formulaItemSchema = z.object({
  id: z.number().int().positive(),
  subjectId: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  name: z.string(),
  formulaLatex: z.string(),
  description: z.string(),
  variables: z.array(
    z.object({
      symbol: z.string(),
      meaning: z.string()
    })
  ),
  tags: z.array(z.string()),
  subjectName: z.string(),
  chapterTitle: z.string(),
  isStarred: z.boolean()
});

const formulasResponseSchema = z.object({
  items: z.array(formulaItemSchema),
  filters: z.object({
    subjects: z.array(z.object({ id: z.number().int().positive(), name: z.string() })),
    chapters: z.array(
      z.object({
        id: z.number().int().positive(),
        title: z.string(),
        subjectId: z.number().int().positive()
      })
    ),
    tags: z.array(z.string())
  })
});

export type FormulasResponse = z.infer<typeof formulasResponseSchema>;

type FormulaQuery = {
  q?: string;
  subjectId?: number;
  chapterId?: number;
  tag?: string;
};

export const getFormulas = async (cookieHeader: string, query: FormulaQuery): Promise<FormulasResponse> => {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.subjectId) params.set("subjectId", String(query.subjectId));
  if (query.chapterId) params.set("chapterId", String(query.chapterId));
  if (query.tag) params.set("tag", query.tag);

  const response = await fetch(`${backendUrl}/api/formulas${params.size > 0 ? `?${params.toString()}` : ""}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      cookie: cookieHeader
    }
  });

  if (!response.ok) {
    throw new Error(`Formulas request failed: ${response.status}`);
  }

  return formulasResponseSchema.parse((await response.json()) as unknown);
};

export const toggleFormulaStar = async (formulaId: number): Promise<{ starred: boolean }> => {
  const response = await fetch(`${backendUrl}/api/formulas/${formulaId}/star`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`Toggle formula star failed: ${response.status}`);
  }

  return (await response.json()) as { starred: boolean };
};

export const recordFormulaAccess = async (formulaId: number): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/formulas/${formulaId}/access`, {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Record formula access failed: ${response.status}`);
  }
};
