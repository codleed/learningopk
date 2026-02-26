import type { SubjectProgressResponse } from "@/lib/progress-api";

import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

type SubjectProgressTableProps = {
  chapters: SubjectProgressResponse["chapters"];
};

const statusLabel: Record<SubjectProgressResponse["chapters"][number]["status"], string> = {
  green: "Passed > 70%",
  yellow: "Attempted < 70%",
  grey: "Not started"
};

const statusTone: Record<SubjectProgressResponse["chapters"][number]["status"], "success" | "warning" | "neutral"> = {
  green: "success",
  yellow: "warning",
  grey: "neutral"
};

export function SubjectProgressTable({ chapters }: SubjectProgressTableProps) {
  if (chapters.length === 0) {
    return <EmptyState title="No published chapters" description="No chapter progress is available for this subject yet." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Chapter</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Visited</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Exercises Viewed</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Quiz Attempted</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Best Score</th>
            <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {chapters.map((chapter) => (
            <tr key={chapter.chapterId}>
              <td className="px-3 py-2 text-foreground">
                <p className="font-medium">
                  Chapter {chapter.chapterNumber}: {chapter.chapterTitle}
                </p>
              </td>
              <td className="px-3 py-2 text-foreground/90">{chapter.visited ? "Yes" : "No"}</td>
              <td className="px-3 py-2 text-foreground/90">{chapter.exercisesViewed}</td>
              <td className="px-3 py-2 text-foreground/90">{chapter.quizAttempted ? "Yes" : "No"}</td>
              <td className="px-3 py-2 text-foreground/90">{chapter.bestScorePercent}%</td>
              <td className="px-3 py-2">
                <StatusPill tone={statusTone[chapter.status]} label={statusLabel[chapter.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

