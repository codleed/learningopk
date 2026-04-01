"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, MessageSquare, Eye, Clock, Pin } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SubjectBadge } from "@/components/common/subject-badge";
import type { ForumFeedResponse } from "@/lib/forum-api";

type Thread = ForumFeedResponse["threads"][number];

const formatRelativeTime = (value: string): string => {
  const now = Date.now();
  const date = new Date(value).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
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

const toExcerpt = (markdown: string): string => {
  const clean = markdown
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[`*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= 120) {
    return clean;
  }

  return `${clean.slice(0, 117)}...`;
};

type ForumThreadCardProps = {
  thread: Thread;
  index: number;
};

export function ForumThreadCard({ thread, index }: ForumThreadCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4), ease: "easeOut" }}
    >
      <Link
        href={`/forum/${thread.id}`}
        prefetch={false}
        className="group relative flex gap-4 rounded-xl border border-border-default bg-bg-surface p-4 transition-all duration-200 hover:border-accent-primary/30 hover:bg-bg-elevated hover:shadow-[var(--shadow-sm)]"
        aria-label={`Thread: ${thread.title}`}
      >
        {/* ── Vote Column ── */}
        <div className="hidden shrink-0 flex-col items-center gap-0.5 sm:flex" aria-label={`Score: ${thread.views}`}>
          <ChevronUp className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <span className="text-xs font-bold tabular-nums text-text-primary">
            {thread.replyCount}
          </span>
          <ChevronDown className="h-4 w-4 text-text-muted" aria-hidden="true" />
        </div>

        {/* ── Content Column ── */}
        <div className="min-w-0 flex-1">
          {/* Badges row */}
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {thread.isPinned ? (
              <Badge variant="info" size="sm">
                <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                Pinned
              </Badge>
            ) : null}
            <Badge variant={thread.isSolved ? "success" : "warning"} size="sm">
              {thread.isSolved ? "Solved" : "Open"}
            </Badge>
            {thread.subjectName ? <SubjectBadge name={thread.subjectName} size="sm" /> : null}
          </div>

          {/* Title */}
          <h3 className="font-display text-base font-bold leading-snug tracking-tight text-text-primary transition-colors group-hover:text-accent-primary sm:text-lg">
            {thread.title}
          </h3>

          {/* Excerpt */}
          <p className="mt-1 text-sm leading-relaxed text-text-secondary line-clamp-2">
            {toExcerpt(thread.body)}
          </p>

          {/* Meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={thread.userName} size="xs" />
              <span className="font-medium text-text-secondary">{thread.userName}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatRelativeTime(thread.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {thread.replyCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" aria-hidden="true" />
              {thread.views}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
