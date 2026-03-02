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
    (subject) => {
      const board = boardById.get(subject.boardId);
      if (!board) {
        return false;
      }

      if (subject.slug !== parsedParams.data.subject || !subject.classSlug) {
        return false;
      }

      if (session.user.board && board.slug !== session.user.board) {
        return false;
      }

      if (session.user.class && subject.classSlug !== session.user.class) {
        return false;
      }

      return true;
    },
  );

  for (const candidate of candidateSubjects) {
    const board = boardById.get(candidate.boardId);
    if (!board || !candidate.classSlug) {
      continue;
    }

    const subjectOverview = await getSubjectOverview({
      board: board.slug,
      grade: candidate.classSlug,
      subject: candidate.slug,
    });

    if (subjectOverview) {
      redirect(
        `/${subjectOverview.board.slug}/${subjectOverview.class.slug}/${subjectOverview.subject.slug}`,
      );
    }
  }

  notFound();
}
