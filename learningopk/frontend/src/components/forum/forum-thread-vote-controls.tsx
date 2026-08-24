"use client";

import { Share2, Bookmark } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ForumThreadVoteControlsProps = {
  threadId: string;
};

export function ForumThreadVoteControls({ threadId }: ForumThreadVoteControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/forum/${threadId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may not be available */
    }
  };

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-border-default pt-4">
      <Button type="button" variant="ghost" size="xs" onClick={handleShare} iconLeft={<Share2 />}>
        {copied ? "Link Copied!" : "Share"}
      </Button>
      <Button type="button" variant="ghost" size="xs" iconLeft={<Bookmark />}>
        Save
      </Button>
    </div>
  );
}
