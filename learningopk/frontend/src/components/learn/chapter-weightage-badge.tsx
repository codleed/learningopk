import { Badge } from "@/components/ui";
import type { ChapterDetailResponse } from "@/lib/learn-api";

type ChapterWeightageBadgeProps = {
  examWeightage: ChapterDetailResponse["chapter"]["examWeightage"];
};

export function ChapterWeightageBadge({ examWeightage }: ChapterWeightageBadgeProps) {
  if (!examWeightage || examWeightage.analysisWindowYears === 0 || examWeightage.weightagePercentage === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="warning">Board Exam Weightage</Badge>
      </div>
      <p className="text-sm font-medium text-text-primary">
        This chapter appeared in {examWeightage.weightagePercentage}% of past {examWeightage.analysisWindowYears} board exams (avg {Math.round(examWeightage.avgMarks)} marks)
      </p>
    </div>
  );
}
