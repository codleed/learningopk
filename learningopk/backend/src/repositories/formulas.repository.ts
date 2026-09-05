import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../lib/db/index.js";
import { withOptionalDbFallback } from "../lib/db-schema-compat.js";
import {
  chapters,
  formulaAccessEvents,
  formulas,
  subjects,
  userStarredFormulas,
} from "../lib/db/schema.js";

export type FormulaFilters = {
  q?: string;
  subjectId?: number;
  chapterId?: number;
  tag?: string;
};

export class FormulasRepository {
  async listFilters() {
    const [subjectRows, chapterRows, tagRows] = await Promise.all([
      db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .orderBy(asc(subjects.name)),
      db
        .select({ id: chapters.id, title: chapters.title, subjectId: chapters.subjectId })
        .from(chapters)
        .orderBy(asc(chapters.chapterNumber), asc(chapters.title)),
      withOptionalDbFallback(
        "formulas.tags",
        async () => {
          const result = await db.execute(sql<{ tag: string }>`
            select distinct jsonb_array_elements_text(tags) as tag
            from formulas
            where jsonb_array_length(tags) > 0
            order by tag asc
          `);
          return result.rows;
        },
        () => [] as Array<{ tag: string }>
      ),
    ]);

    return {
      subjects: subjectRows,
      chapters: chapterRows,
      tags: tagRows.map((row) => row.tag),
    };
  }

  async listFormulas(filters: FormulaFilters, userId: string) {
    return withOptionalDbFallback(
      "formulas.list",
      async () => {
        const predicates = [
          filters.subjectId ? eq(formulas.subjectId, filters.subjectId) : undefined,
          filters.chapterId ? eq(formulas.chapterId, filters.chapterId) : undefined,
          filters.tag
            ? sql`${formulas.tags} @> ${JSON.stringify([filters.tag])}::jsonb`
            : undefined,
          filters.q?.trim()
            ? sql`to_tsvector('english', coalesce(${formulas.name}, '') || ' ' || coalesce(${formulas.description}, '')) @@ plainto_tsquery('english', ${filters.q.trim()})`
            : undefined,
        ].filter((value): value is Exclude<typeof value, undefined> => Boolean(value));

        const rows = await db
          .select({
            id: formulas.id,
            subjectId: formulas.subjectId,
            chapterId: formulas.chapterId,
            name: formulas.name,
            formulaLatex: formulas.formulaLatex,
            description: formulas.description,
            variables: formulas.variables,
            tags: formulas.tags,
            subjectName: subjects.name,
            chapterTitle: chapters.title,
            isStarred: sql<boolean>`exists(select 1 from ${userStarredFormulas} where ${userStarredFormulas.userId} = ${userId} and ${userStarredFormulas.formulaId} = ${formulas.id})`,
          })
          .from(formulas)
          .innerJoin(subjects, eq(formulas.subjectId, subjects.id))
          .innerJoin(chapters, eq(formulas.chapterId, chapters.id))
          .where(predicates.length > 0 ? and(...predicates) : undefined)
          .orderBy(asc(subjects.name), asc(chapters.chapterNumber), asc(formulas.name));

        return rows;
      },
      () => []
    );
  }

  async toggleStar(userId: string, formulaId: number) {
    const existing = await db
      .select({ id: userStarredFormulas.id })
      .from(userStarredFormulas)
      .where(
        and(eq(userStarredFormulas.userId, userId), eq(userStarredFormulas.formulaId, formulaId))
      )
      .limit(1);

    if (existing[0]) {
      await db
        .delete(userStarredFormulas)
        .where(
          and(eq(userStarredFormulas.userId, userId), eq(userStarredFormulas.formulaId, formulaId))
        );
      return { starred: false };
    }

    await db.insert(userStarredFormulas).values({ userId, formulaId });
    return { starred: true };
  }

  async recordAccess(userId: string, formulaId: number) {
    await db.insert(formulaAccessEvents).values({ userId, formulaId });
  }

  async findFormulaById(formulaId: number) {
    const rows = await db
      .select({ id: formulas.id })
      .from(formulas)
      .where(eq(formulas.id, formulaId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findTopStarredByAccess(userId: string, limit = 5) {
    return withOptionalDbFallback(
      "formulas.starred",
      async () => {
        const starredRows = await db
          .select({ formulaId: userStarredFormulas.formulaId })
          .from(userStarredFormulas)
          .where(eq(userStarredFormulas.userId, userId));

        const formulaIds = starredRows.map((row) => row.formulaId);
        if (formulaIds.length === 0) {
          return [];
        }

        return db
          .select({
            formulaId: formulas.id,
            name: formulas.name,
            formulaLatex: formulas.formulaLatex,
            subjectName: subjects.name,
            chapterTitle: chapters.title,
            accessCount: count(formulaAccessEvents.id),
          })
          .from(formulas)
          .innerJoin(subjects, eq(formulas.subjectId, subjects.id))
          .innerJoin(chapters, eq(formulas.chapterId, chapters.id))
          .leftJoin(
            formulaAccessEvents,
            and(
              eq(formulaAccessEvents.formulaId, formulas.id),
              eq(formulaAccessEvents.userId, userId)
            )
          )
          .where(inArray(formulas.id, formulaIds))
          .groupBy(formulas.id, subjects.name, chapters.title)
          .orderBy(desc(count(formulaAccessEvents.id)), asc(formulas.name))
          .limit(limit);
      },
      () => []
    );
  }
}

export const formulasRepository = new FormulasRepository();
