"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const createReplySchema = z.object({
  body: z.string().trim().min(2),
  parentReplyId: z.string().uuid().optional()
});

type ForumReplyFormProps = {
  threadId: string;
  parentReplyId?: string;
  compact?: boolean;
};

export const ForumReplyForm = ({ threadId, parentReplyId, compact = false }: ForumReplyFormProps) => {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = createReplySchema.safeParse({
      body,
      ...(parentReplyId ? { parentReplyId } : {})
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid reply input.");
      return;
    }

    setIsPending(true);
    const response = await fetch(`${backendUrl}/api/forum/threads/${threadId}/replies`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(parsed.data)
    });
    const responseBody = (await response.json().catch(() => null)) as unknown;
    setIsPending(false);

    if (response.status === 401) {
      setError("You must sign in before replying.");
      return;
    }

    if (!response.ok) {
      const parsedError = z
        .object({
          error: z.string()
        })
        .safeParse(responseBody);
      setError(parsedError.success ? parsedError.data.error : "Reply failed.");
      return;
    }

    setBody("");
    setPreviewEnabled(false);
    router.refresh();
  };

  return (
    <form
      onSubmit={onSubmit}
      className={[
        "surface-card space-y-3 rounded-xl border border-border p-4",
        compact ? "mt-3" : "mt-6"
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{parentReplyId ? "Reply to answer" : "Post a reply"}</h3>
        <Button
          type="button"
          onClick={() => setPreviewEnabled((current) => !current)}
          variant="ghost"
          size="sm"
        >
          {previewEnabled ? "Edit" : "Preview"}
        </Button>
      </div>

      {previewEnabled ? (
        <div className="min-h-24 rounded-md border border-border bg-muted/45 p-3">
          {body.trim().length > 0 ? (
            <div className="prose prose-zinc max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={compact ? 3 : 5}
          required
          placeholder={parentReplyId ? "Add a nested reply..." : "Share your answer..."}
        />
      )}

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Posting..." : "Post reply"}
      </Button>
    </form>
  );
};
