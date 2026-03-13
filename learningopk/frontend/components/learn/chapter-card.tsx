import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { SubjectResponse } from "@/lib/learn-api";

type Chapter = SubjectResponse["chapters"][number];

type ChapterCardProps = {
  chapter: Chapter;
  href: string;
};

export function ChapterCard({ chapter, href }: ChapterCardProps) {
  return (
    <Link
      href={href}
      className="surface-card group block rounded-2xl border border-border p-5 transition hover:-translate-y-0.5 hover:border-[var(--primary)]/45"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Chapter {chapter.chapterNumber}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{chapter.title}</h3>
        </div>
        <Badge variant={chapter.isPublished ? "success" : "warning"}>
          {chapter.isPublished ? "Published" : "Hidden"}
        </Badge>
      </div>
      <p className="mt-4 text-sm font-medium text-[var(--primary)] group-hover:underline">Open chapter</p>
    </Link>
  );
}

