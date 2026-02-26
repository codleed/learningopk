"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const createThreadSchema = z.object({
  title: z.string().trim().min(5).max(160),
  body: z.string().trim().min(10),
  subjectId: z.number().int().positive().optional(),
  chapterId: z.number().int().positive().optional()
});

const createThreadResponseSchema = z.object({
  thread: z.object({
    id: z.string().uuid()
  })
});

type ForumSubjectOption = {
  id: number;
  name: string;
  slug: string;
  grade: "9" | "10";
  boardId: number;
};

type ForumChapterOption = {
  id: number;
  title: string;
  slug: string;
  chapterNumber: number;
  subjectId: number;
};

type ForumThreadFormProps = {
  subjects: ForumSubjectOption[];
  chapters: ForumChapterOption[];
};

export const ForumThreadForm = ({ subjects, chapters }: ForumThreadFormProps) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const filteredChapterOptions = useMemo(() => {
    if (!subjectId) {
      return [];
    }

    const selectedSubjectId = Number(subjectId);
    return chapters.filter((chapter) => chapter.subjectId === selectedSubjectId);
  }, [chapters, subjectId]);

  const onSubjectChange = (nextSubjectId: string) => {
    setSubjectId(nextSubjectId);
    if (!nextSubjectId) {
      setChapterId("");
      return;
    }

    const numericSubjectId = Number(nextSubjectId);
    const selectedChapter = chapterId ? Number(chapterId) : null;
    if (selectedChapter) {
      const chapterStillValid = chapters.some(
        (chapter) => chapter.id === selectedChapter && chapter.subjectId === numericSubjectId
      );
      if (!chapterStillValid) {
        setChapterId("");
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const maybeSubjectId = subjectId ? Number(subjectId) : undefined;
    const maybeChapterId = chapterId ? Number(chapterId) : undefined;

    const parsed = createThreadSchema.safeParse({
      title,
      body,
      subjectId: maybeSubjectId,
      chapterId: maybeChapterId
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid thread input.");
      return;
    }

    setIsPending(true);
    const response = await fetch(`${backendUrl}/api/forum/threads`, {
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
      setError("You must sign in before creating a thread.");
      return;
    }

    if (!response.ok) {
      const parsedError = z
        .object({
          error: z.string()
        })
        .safeParse(responseBody);
      setError(parsedError.success ? parsedError.data.error : "Thread creation failed.");
      return;
    }

    const parsedResponse = createThreadResponseSchema.safeParse(responseBody);
    if (!parsedResponse.success) {
      setError("Thread was created but the response payload was invalid.");
      return;
    }

    setTitle("");
    setBody("");
    setSubjectId("");
    setChapterId("");
    router.push(`/forum/${parsedResponse.data.thread.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-4 rounded-xl border border-border p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Ask a question</h2>
        <Button
          type="button"
          onClick={() => setPreviewEnabled((current) => !current)}
          variant="ghost"
          size="sm"
        >
          {previewEnabled ? "Edit" : "Preview"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-foreground">
          <span>Subject (optional)</span>
          <Select
            value={subjectId}
            onChange={(event) => onSubjectChange(event.target.value)}
          >
            <option value="">No subject tag</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={String(subject.id)}>
                {subject.name} (Grade {subject.grade})
              </option>
            ))}
          </Select>
        </label>

        <label className="space-y-1 text-sm text-foreground">
          <span>Chapter (optional)</span>
          <Select
            value={chapterId}
            onChange={(event) => setChapterId(event.target.value)}
            disabled={!subjectId}
          >
            <option value="">No chapter tag</option>
            {filteredChapterOptions.map((chapter) => (
              <option key={chapter.id} value={String(chapter.id)}>
                Chapter {chapter.chapterNumber}: {chapter.title}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <label className="space-y-1 text-sm text-foreground">
        <span>Title</span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={160}
          required
          placeholder="What are you stuck on?"
        />
      </label>

      <label className="space-y-1 text-sm text-foreground">
        <span>Body (markdown supported)</span>
        {previewEnabled ? (
          <div className="min-h-32 rounded-md border border-border bg-muted/45 p-3">
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
            required
            rows={8}
            placeholder="Add details, context, and what you tried."
          />
        )}
      </label>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Posting..." : "Post thread"}
      </Button>
    </form>
  );
};
