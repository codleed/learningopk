import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getSubjectsList, getSubjectOverview } from "@/lib/learn-api";
import { getServerSession } from "@/lib/session";

type SubjectRedirectPageProps = {
  params: Promise<{ subject: string }>;
};

const routeParamsSchema = z.object({
  subject: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
});

export default async function SubjectRedirectPage({ params }: SubjectRedirectPageProps) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const parsedParams = routeParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const subjectsList = await getSubjectsList().catch(() => null);
  if (!subjectsList) {
    notFound();
  }

  const candidateSubjects = subjectsList.subjects.filter((subject) => {
    if (subject.slug !== parsedParams.data.subject || !subject.classSlug) {
      return false;
    }

    if (session.user.board && subject.boardSlug !== session.user.board) {
      return false;
    }

    if (session.user.class && subject.classSlug !== session.user.class) {
      return false;
    }

    return true;
  });

  for (const candidate of candidateSubjects) {
    if (!candidate.classSlug) {
      continue;
    }

    const subjectOverview = await getSubjectOverview({
      board: candidate.boardSlug,
      grade: candidate.classSlug,
      subject: candidate.slug,
    });

    if (subjectOverview) {
      redirect(
        `/${subjectOverview.board.slug}/${subjectOverview.class.slug}/${subjectOverview.subject.slug}`
      );
    }
  }

  notFound();
}
