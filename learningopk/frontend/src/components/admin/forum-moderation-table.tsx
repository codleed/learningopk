"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ThreadPinToggle } from "./thread-pin-toggle";

export type ForumModerationRow = {
  id: string;
  title: string;
  userName: string;
  createdAt: string;
  replyCount: number;
  views: number;
  isPinned: boolean;
  isSolved: boolean;
};

type ForumModerationTableProps = {
  rows: ForumModerationRow[];
  onMutationComplete: () => void;
};

export function ForumModerationTable({ rows, onMutationComplete }: ForumModerationTableProps) {
  const [items, setItems] = useState(rows);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Thread</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Author</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Created</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Replies</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Views</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">State</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((thread) => (
            <tr key={thread.id}>
              <td className="px-3 py-2 font-medium text-foreground">{thread.title}</td>
              <td className="px-3 py-2 text-foreground/90">{thread.userName}</td>
              <td className="px-3 py-2 text-foreground/90">{new Date(thread.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-foreground/90">{thread.replyCount}</td>
              <td className="px-3 py-2 text-foreground/90">{thread.views}</td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    thread.isPinned ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"
                  ].join(" ")}
                >
                  {thread.isPinned ? "Pinned" : "Not pinned"}
                </span>
                {" "}
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    thread.isSolved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  ].join(" ")}
                >
                  {thread.isSolved ? "Solved" : "Unsolved"}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <ThreadPinToggle
                    threadId={thread.id}
                    threadTitle={thread.title}
                    isPinned={thread.isPinned}
                    onComplete={(result) => {
                      setItems((previous) =>
                        previous.map((item) =>
                          item.id === thread.id ? { ...item, isPinned: result.nextPinned } : item
                        )
                      );
                      onMutationComplete();
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/api/admin/moderation/threads/${thread.id}/delete`, {
                          method: "POST",
                          credentials: "include"
                        });
                        if (!res.ok) throw new Error("Delete failed");
                        setItems(prev => prev.filter(item => item.id !== thread.id));
                        onMutationComplete();
                      } catch {
                        // silently fail
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
