import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppShell } from "@/components/foundation/app-shell";
import { SectionCard } from "@/components/foundation/section-card";
import { ForumReplyForm } from "@/components/forum/forum-reply-form";
import { ForumReplyList } from "@/components/forum/forum-reply-list";
import { ForumThreadHeader } from "@/components/forum/forum-thread-header";
import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";
import { getForumThreadById } from "@/lib/forum-api";
import { getServerSession } from "@/lib/session";

const threadParamsSchema = z.object({
  threadId: z.string().uuid()
});

type ForumThreadDetailPageProps = {
  params: Promise<{
    threadId: string;
  }>;
};

export default async function ForumThreadDetailPage({ params }: ForumThreadDetailPageProps) {
  const parsedParams = threadParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    notFound();
  }

  const [session, threadPayload] = await Promise.all([
    getServerSession(),
    getForumThreadById(parsedParams.data.threadId)
  ]);

  if (!threadPayload) {
    notFound();
  }

  const { thread } = threadPayload;
  const canMarkAccepted = Boolean(session && session.user.id === thread.userId);
  const isAuthenticated = Boolean(session);

  return (
    <AppShell session={session} currentPath="/forum">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          <Link href="/forum" className="font-medium text-foreground underline underline-offset-4">
            Back to forum
          </Link>
        </p>

        <ForumThreadHeader thread={thread} />

        <SectionCard>
          <MarkdownMathRenderer content={thread.body} />
        </SectionCard>

        {isAuthenticated ? (
          <ForumReplyForm threadId={thread.id} />
        ) : (
          <SectionCard>
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
                Sign in
              </Link>{" "}
              to post a reply.
            </p>
          </SectionCard>
        )}

        <ForumReplyList
          threadId={thread.id}
          replies={thread.replies}
          canMarkAccepted={canMarkAccepted}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </AppShell>
  );
}

