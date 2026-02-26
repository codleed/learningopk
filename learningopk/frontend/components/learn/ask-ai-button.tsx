import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

type AskAiButtonProps = {
  onClick: () => void;
  label?: string;
};

export function AskAiButton({ onClick, label = "Ask AI About This" }: AskAiButtonProps) {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={onClick}>
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}

