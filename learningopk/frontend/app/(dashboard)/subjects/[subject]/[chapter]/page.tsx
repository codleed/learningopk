import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getForumFilters } from "@/lib/forum-api";
import { getChapterDetail } from "@/lib/learn-api";
import { getServerSession } from "@/lib/session";

const routeParamsSchema = z.object({
  subject: z.string().trim().regex(/^[a-z0-9-]+$/),
  chapter: z.string().trim().regex(/^[a-z0-9-]+$/),
});

const legacyTabSchema = z
  .enum(["summary", "exercise", "mcqs", "quiz", "flash-cards"])
  .catch("summary");

type LegacyChapterPageProps = {
  params: Promise<{ subject: string; chapter: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

const mapLegacyTabToLearnTab = (
  tab: z.infer<typeof legacyTabSchema>,
): "summary" | "exercises" | "flashcards" | "quiz" => {
  if (tab === "exercise") {
    return "exercises";
  }
  if (tab === "flash-cards") {
    return "flashcards";
  }
  if (tab === "mcqs") {
    return "quiz";
  }
  return tab;
};

const getSingleQueryValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function LegacyChapterPage({
  params,
  searchParams,
}: LegacyChapterPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const parsedParams = routeParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const rawSearchParams = await searchParams;
  const selectedLegacyTab = legacyTabSchema.parse(
    getSingleQueryValue(rawSearchParams.tab),
  );
  const mappedTab = mapLegacyTabToLearnTab(selectedLegacyTab);

  const filters = await getForumFilters().catch(() => null);
  if (!filters) {
    notFound();
  }

  const boardById = new Map(filters.boards.map((board) => [board.id, board]));
  const candidateSubjects = filters.subjects.filter(
    (subject) => subject.slug === parsedParams.data.subject,
  );

  for (const candidate of candidateSubjects) {
    const board = boardById.get(candidate.boardId);
    if (!board) {
      continue;
    }

    const chapterDetail = await getChapterDetail({
      board: board.slug,
      grade: candidate.grade,
      subject: candidate.slug,
      chapter: parsedParams.data.chapter,
    });

    if (chapterDetail) {
      redirect(
        `/${chapterDetail.board.slug}/${chapterDetail.grade}/${chapterDetail.subject.slug}/${chapterDetail.chapter.slug}?tab=${mappedTab}`,
      );
    }
  }

  notFound();
}
