"use client";

import Link from "next/link";

import type { AdminCommunityThread } from "@/lib/admin-api";

type CommunityThreadHealthTableProps = {
  rows: AdminCommunityThread[];
};

export function CommunityThreadHealthTable({ rows }: CommunityThreadHealthTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No community threads match the current filters.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Thread</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Author</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Replies</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Views</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Created</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Open</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.threadId} data-testid="community-thread-row">
              <td className="px-3 py-2 text-foreground">
                <Link
                  href={`/forum/${row.threadId}`}
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {row.title}
                </Link>
              </td>
              <td className="px-3 py-2 text-foreground/90">{row.authorName}</td>
              <td className="px-3 py-2 text-foreground/90">
                {row.isPinned ? "Pinned" : "Unpinned"} / {row.isSolved ? "Solved" : "Unsolved"}
              </td>
              <td className="px-3 py-2 text-foreground/90">{row.replyCount}</td>
              <td className="px-3 py-2 text-foreground/90">{row.views}</td>
              <td className="px-3 py-2 text-foreground/90">{new Date(row.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-foreground/90">Open flags: {row.openFlagCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
