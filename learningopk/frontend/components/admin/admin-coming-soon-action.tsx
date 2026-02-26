"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type AdminComingSoonActionProps = {
  label: string;
};

export function AdminComingSoonAction({ label }: AdminComingSoonActionProps) {
  const { pushToast } = useToast();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() =>
        pushToast({
          title: "Coming Soon",
          description: "This admin action will ship in a future sprint.",
          tone: "info"
        })
      }
    >
      {label}
    </Button>
  );
}
