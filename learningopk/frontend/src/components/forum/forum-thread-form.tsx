"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Pencil, X, Send, BookOpen, Layers } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ContentRenderer } from "@/components/common/content-renderer";
import { Sheet, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";

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
  grade: string | null;
  className: string | null;
  classSlug: string | null;
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
  isOpen: boolean;
  closeHref: string;
};

export const ForumThreadForm = ({ subjects, chapters, isOpen, closeHref }: ForumThreadFormProps) => {
  const router = useRouter();
  const { pushToast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [activeTab, setActiveTab] = useState("write");
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

  const handleClose = () => {
    router.push(closeHref);
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
    try {
      const response = await fetch(`${backendUrl}/api/forum/threads`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(parsed.data)
      });
      const responseBody = (await response.json().catch(() => null)) as unknown;

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
    } catch {
      setError("Network error. Check your connection and try again.");
      pushToast({
        title: "Failed to create thread",
        description: "The server could not be reached. Please try again.",
        tone: "error"
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} side="right" className="!w-[480px] !max-w-[92vw]">
      <SheetHeader>
        <SheetTitle>New Post</SheetTitle>
        <SheetDescription>Ask a question or share something with the community.</SheetDescription>
      </SheetHeader>

      <SheetBody>
        <form id="create-thread-form" onSubmit={onSubmit} className="space-y-5">
          {/* Title input */}
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            required
            label="Title"
            placeholder="What are you stuck on?"
            prefix={<Pencil />}
          />

          {/* Subject & Chapter selectors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <BookOpen className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                Subject
              </span>
              <Select
                value={subjectId}
                onChange={(event) => onSubjectChange(event.target.value)}
                className="!h-10 !text-sm"
              >
                <option value="">No subject tag</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={String(subject.id)}>
                    {subject.name}
                    {subject.className ? ` (${subject.className})` : ""}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                <Layers className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                Chapter
              </span>
              <Select
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                disabled={!subjectId}
                className="!h-10 !text-sm"
              >
                <option value="">No chapter tag</option>
                {filteredChapterOptions.map((chapter) => (
                  <option key={chapter.id} value={String(chapter.id)}>
                    Ch. {chapter.chapterNumber}: {chapter.title}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {/* Body editor with tabs */}
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-text-primary">Body</span>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabList variant="pills" className="mb-3">
                <TabTrigger value="write" variant="pills" layoutId="compose-tab">
                  <Pencil className="h-3 w-3" aria-hidden="true" />
                  Write
                </TabTrigger>
                <TabTrigger value="preview" variant="pills" layoutId="compose-tab">
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  Preview
                </TabTrigger>
              </TabList>

              <TabContent value="write">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                  rows={10}
                  placeholder="Add details, context, and what you've tried. Markdown & LaTeX supported."
                  autoResize
                  maxRows={20}
                />
                <p className="mt-1.5 text-[11px] text-text-muted">
                  Supports **bold**, *italic*, `code`, and $\LaTeX$ math.
                </p>
              </TabContent>

              <TabContent value="preview">
                <div className="min-h-[200px] rounded-lg border border-border-default bg-bg-base p-4">
                  {body.trim().length > 0 ? (
                    <ContentRenderer content={body} variant="default" />
                  ) : (
                    <p className="text-sm text-text-muted">Nothing to preview yet. Start writing above.</p>
                  )}
                </div>
              </TabContent>
            </Tabs>
          </div>

          {/* Error display */}
          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-accent-danger/20 bg-accent-danger-light px-4 py-3">
                  <p className="text-sm text-accent-danger">{error}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="create-thread-form"
          variant="primary"
          size="sm"
          loading={isPending}
          iconLeft={<Send />}
        >
          {isPending ? "Posting..." : "Submit"}
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
