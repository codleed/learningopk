"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Pencil, Send, Bold, Italic, Code } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ContentRenderer } from "@/components/common/content-renderer";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const createReplySchema = z.object({
  body: z.string().trim().min(2),
  parentReplyId: z.string().uuid().optional(),
});

type ForumReplyFormProps = {
  threadId: string;
  parentReplyId?: string;
  compact?: boolean;
};

export const ForumReplyForm = ({
  threadId,
  parentReplyId,
  compact = false,
}: ForumReplyFormProps) => {
  const router = useRouter();
  const { pushToast } = useToast();
  const [body, setBody] = useState("");
  const [activeTab, setActiveTab] = useState("write");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insertMarkdown = (prefix: string, suffix: string) => {
    setBody((current) => `${current}${prefix}text${suffix}`);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsed = createReplySchema.safeParse({
      body,
      ...(parentReplyId ? { parentReplyId } : {}),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid reply input.");
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch(`${backendUrl}/api/forum/threads/${threadId}/replies`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;

      if (response.status === 401) {
        setError("You must sign in before replying.");
        return;
      }

      if (!response.ok) {
        const parsedError = z
          .object({
            error: z.string(),
          })
          .safeParse(responseBody);
        setError(parsedError.success ? parsedError.data.error : "Reply failed.");
        return;
      }

      setBody("");
      setActiveTab("write");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      pushToast({
        title: "Failed to post reply",
        description: "The server could not be reached. Please try again.",
        tone: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "mt-3 rounded-lg border border-dashed border-border-default bg-bg-subtle/30 p-3"
          : "rounded-xl border border-border-default bg-bg-surface p-4"
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-text-primary">
          {parentReplyId ? "Reply to this answer" : "Post a reply"}
        </h3>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-2 flex items-center justify-between">
          <TabList variant="pills">
            <TabTrigger
              value="write"
              variant="pills"
              layoutId={`reply-tab-${parentReplyId ?? "root"}`}
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              Write
            </TabTrigger>
            <TabTrigger
              value="preview"
              variant="pills"
              layoutId={`reply-tab-${parentReplyId ?? "root"}`}
            >
              <Eye className="h-3 w-3" aria-hidden="true" />
              Preview
            </TabTrigger>
          </TabList>

          {/* Markdown toolbar (only visible in write mode) */}
          {activeTab === "write" ? (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => insertMarkdown("**", "**")}
                className="rounded p-1 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
                aria-label="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("*", "*")}
                className="rounded p-1 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
                aria-label="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("`", "`")}
                className="rounded p-1 text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-primary"
                aria-label="Inline code"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        <TabContent value="write">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={compact ? 3 : 5}
            required
            placeholder={
              parentReplyId ? "Add a nested reply..." : "Share your answer or thoughts..."
            }
            autoResize
            maxRows={compact ? 8 : 15}
          />
        </TabContent>

        <TabContent value="preview">
          <div className="min-h-[80px] rounded-lg border border-border-default bg-bg-base p-4">
            {body.trim().length > 0 ? (
              <ContentRenderer content={body} variant="compact" />
            ) : (
              <p className="text-sm text-text-muted">Nothing to preview yet.</p>
            )}
          </div>
        </TabContent>
      </Tabs>

      {/* Error display */}
      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-3 py-2">
              <p className="text-xs text-accent-danger">{error}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-3 flex items-center justify-end">
        <Button type="submit" size="sm" variant="primary" loading={isPending} iconLeft={<Send />}>
          {isPending ? "Posting..." : "Submit Reply"}
        </Button>
      </div>
    </form>
  );
};
