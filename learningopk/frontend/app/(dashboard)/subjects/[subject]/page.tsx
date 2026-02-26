import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getForumFilters } from "@/lib/forum-api";
import { getSubjectOverview } from "@/lib/learn-api";
import { getServerSession } from "@/lib/session";

type SubjectRedirectPageProps = {
  params: Promise<{ subject: string }>;
};

const routeParamsSchema = z.object({
  subject: z.string().trim().regex(/^[a-z0-9-]+$/),
});

export default async function SubjectRedirectPage({
  params,
}: SubjectRedirectPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const parsedParams = routeParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

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

    const subjectOverview = await getSubjectOverview({
      board: board.slug,
      grade: candidate.grade,
      subject: candidate.slug,
    });

    if (subjectOverview) {
      redirect(
        `/${subjectOverview.board.slug}/${subjectOverview.grade}/${subjectOverview.subject.slug}`,
      );
    }
  }

  notFound();
}
