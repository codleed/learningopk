import { AskAiButton } from "@/components/learn/ask-ai-button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type ExerciseSolutionPanelProps = {
  solution: string;
  onAskAi: () => void;
};

export function ExerciseSolutionPanel({ solution, onAskAi }: ExerciseSolutionPanelProps) {
  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      <div className="mb-3 flex justify-end">
        <AskAiButton onClick={onAskAi} />
      </div>
      <p className="mb-2 text-sm font-semibold text-muted-foreground">Step-by-step solution</p>
      <MarkdownRenderer content={solution} />
    </div>
  );
}

