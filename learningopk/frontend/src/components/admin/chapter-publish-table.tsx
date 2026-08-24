"use client";

import { useState } from "react";

import { ChapterPublishToggle } from "./chapter-publish-toggle";

export type ChapterPublishRow = {
  id: number;
  chapterNumber: number;
  title: string;
  subjectName: string;
  className: string;
  boardName: string;
  isPublished: boolean;
};

type ChapterPublishTableProps = {
  rows: ChapterPublishRow[];
  onMutationComplete: () => void;
};

export function ChapterPublishTable({ rows, onMutationComplete }: ChapterPublishTableProps) {
  const [items, setItems] = useState(rows);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Chapter</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Subject</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Board / Class</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((chapter) => (
            <tr key={chapter.id}>
              <td className="px-3 py-2 text-foreground">
                Chapter {chapter.chapterNumber}: {chapter.title}
              </td>
              <td className="px-3 py-2 text-foreground/90">{chapter.subjectName}</td>
              <td className="px-3 py-2 text-foreground/90">
                {chapter.boardName} / {chapter.className}
              </td>
              <td className="px-3 py-2">
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    chapter.isPublished
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800",
                  ].join(" ")}
                >
                  {chapter.isPublished ? "Published" : "Hidden"}
                </span>
              </td>
              <td className="px-3 py-2">
                <ChapterPublishToggle
                  chapterId={chapter.id}
                  chapterLabel={`Chapter ${chapter.chapterNumber}: ${chapter.title}`}
                  isPublished={chapter.isPublished}
                  onComplete={(result) => {
                    setItems((previous) =>
                      previous.map((item) =>
                        item.id === chapter.id
                          ? { ...item, isPublished: result.nextPublished }
                          : item
                      )
                    );
                    onMutationComplete();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
