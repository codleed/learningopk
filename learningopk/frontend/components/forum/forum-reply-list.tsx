import { EmptyState } from "@/components/ui/states";
import type { ForumThreadDetailResponse } from "@/lib/forum-api";

import { MarkdownMathRenderer } from "@/components/learn/markdown-math-renderer";

import { ForumReplyActions } from "./forum-reply-actions";
import { ForumReplyForm } from "./forum-reply-form";

type ThreadReplies = ForumThreadDetailResponse["thread"]["replies"];

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

type ForumReplyListProps = {
  threadId: string;
  replies: ThreadReplies;
  canMarkAccepted: boolean;
  isAuthenticated: boolean;
};

export function ForumReplyList({ threadId, replies, canMarkAccepted, isAuthenticated }: ForumReplyListProps) {
  if (replies.length === 0) {
    return (
      <EmptyState
        title="No replies yet"
        description="Be the first to answer this question."
      />
    );
  }

  return (
    <section className="space-y-4">
      {replies.map((reply) => (
        <article key={reply.id} className="surface-card rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{reply.userName}</span>
            <span>{formatDateTime(reply.createdAt)}</span>
          </div>
          <div className="mt-3">
            <MarkdownMathRenderer content={reply.body} />
          </div>
          <ForumReplyActions
            replyId={reply.id}
            upvotes={reply.upvotes}
            viewerVoteType={reply.viewerVoteType}
            isAcceptedAnswer={reply.isAcceptedAnswer}
            canMarkAccepted={canMarkAccepted}
            isAuthenticated={isAuthenticated}
          />

          {reply.replies.length > 0 ? (
            <div className="mt-4 space-y-3 border-l border-border pl-4">
              {reply.replies.map((nestedReply) => (
                <div key={nestedReply.id} className="rounded-lg border border-border bg-muted/45 p-4">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{nestedReply.userName}</span>
                    <span>{formatDateTime(nestedReply.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <MarkdownMathRenderer content={nestedReply.body} />
                  </div>
                  <ForumReplyActions
                    replyId={nestedReply.id}
                    upvotes={nestedReply.upvotes}
                    viewerVoteType={nestedReply.viewerVoteType}
                    isAcceptedAnswer={nestedReply.isAcceptedAnswer}
                    canMarkAccepted={canMarkAccepted}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {isAuthenticated ? <ForumReplyForm threadId={threadId} parentReplyId={reply.id} compact /> : null}
        </article>
      ))}
    </section>
  );
}

