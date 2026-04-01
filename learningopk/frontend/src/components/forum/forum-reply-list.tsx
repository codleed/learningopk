"use client";

import { motion } from "framer-motion";
import { CheckCircle, Clock, MessageSquare } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ContentRenderer } from "@/components/common/content-renderer";
import { EmptyState } from "@/components/ui/states";
import type { ForumThreadDetailResponse } from "@/lib/forum-api";

import { ForumReplyActions } from "./forum-reply-actions";
import { ForumReplyForm } from "./forum-reply-form";

type ThreadReplies = ForumThreadDetailResponse["thread"]["replies"];

const formatRelativeTime = (value: string): string => {
  const now = Date.now();
  const date = new Date(value).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }
  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "just now";
};

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
        icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  return (
    <section className="space-y-3" aria-label="Replies">
      {replies.map((reply, index) => (
        <motion.article
          key={reply.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5), ease: "easeOut" }}
          className={[
            "rounded-xl border bg-bg-surface overflow-hidden transition-colors",
            reply.isAcceptedAnswer
              ? "border-accent-success/40 ring-1 ring-accent-success/20"
              : "border-border-default"
          ].join(" ")}
        >
          {/* Accepted answer banner */}
          {reply.isAcceptedAnswer ? (
            <div className="flex items-center gap-2 border-b border-accent-success/20 bg-accent-success-light px-5 py-2">
              <CheckCircle className="h-3.5 w-3.5 text-accent-success" aria-hidden="true" />
              <span className="text-xs font-bold text-accent-success">Accepted Answer</span>
            </div>
          ) : null}

          <div className="p-5">
            {/* Author row */}
            <div className="flex items-center gap-3">
              <Avatar name={reply.userName} size="sm" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{reply.userName}</span>
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {formatRelativeTime(reply.createdAt)}
                </span>
              </div>
            </div>

            {/* Reply body */}
            <div className="mt-3 rounded-lg bg-bg-base/50 p-4">
              <ContentRenderer content={reply.body} variant="compact" />
            </div>

            {/* Vote actions */}
            <ForumReplyActions
              replyId={reply.id}
              upvotes={reply.upvotes}
              viewerVoteType={reply.viewerVoteType}
              isAcceptedAnswer={reply.isAcceptedAnswer}
              canMarkAccepted={canMarkAccepted}
              isAuthenticated={isAuthenticated}
            />

            {/* Nested replies */}
            {reply.replies.length > 0 ? (
              <div className="mt-4 space-y-2 border-l-2 border-border-default pl-4">
                {reply.replies.map((nestedReply, nestedIndex) => (
                  <motion.div
                    key={nestedReply.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: nestedIndex * 0.03, ease: "easeOut" }}
                    className={[
                      "rounded-lg border p-4 transition-colors",
                      nestedReply.isAcceptedAnswer
                        ? "border-accent-success/30 bg-accent-success-light/50"
                        : "border-border-default bg-bg-subtle/40"
                    ].join(" ")}
                  >
                    {/* Nested accepted banner */}
                    {nestedReply.isAcceptedAnswer ? (
                      <div className="mb-2 flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-accent-success" aria-hidden="true" />
                        <span className="text-[10px] font-bold text-accent-success">Accepted Answer</span>
                      </div>
                    ) : null}

                    {/* Author */}
                    <div className="flex items-center gap-2">
                      <Avatar name={nestedReply.userName} size="xs" />
                      <span className="text-xs font-semibold text-text-primary">{nestedReply.userName}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted">
                        <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                        {formatRelativeTime(nestedReply.createdAt)}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="mt-2">
                      <ContentRenderer content={nestedReply.body} variant="compact" />
                    </div>

                    {/* Vote actions */}
                    <ForumReplyActions
                      replyId={nestedReply.id}
                      upvotes={nestedReply.upvotes}
                      viewerVoteType={nestedReply.viewerVoteType}
                      isAcceptedAnswer={nestedReply.isAcceptedAnswer}
                      canMarkAccepted={canMarkAccepted}
                      isAuthenticated={isAuthenticated}
                    />
                  </motion.div>
                ))}
              </div>
            ) : null}

            {/* Nested reply form */}
            {isAuthenticated ? (
              <ForumReplyForm threadId={threadId} parentReplyId={reply.id} compact />
            ) : null}
          </div>
        </motion.article>
      ))}
    </section>
  );
}
