"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  ClipboardList,
  Layers,
  Brain,
  Save,
  Loader2,
  NotebookPen,
  TextCursorInput,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { AdminBreadcrumb } from "@/components/admin/breadcrumb";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StickyBreadcrumbWrapper } from "@/components/common/sticky-breadcrumb-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GithubMarkdownEditor } from "@/components/admin/github-markdown-editor";
import { useToast } from "@/components/ui/toast";
import {
  createAdminChapterSubpart,
  deleteAdminChapterSubpart,
  getAdminChapterSubparts,
  reorderAdminChapterSubparts,
  updateAdminChapterSubpart,
  uploadAdminChapterSummaryMedia,
} from "@/lib/admin-api";
import type { AdminChapterSubpart } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

import { ChapterQuizManager } from "@/components/admin/chapter-quiz-manager";
import { ChapterFlashcardManager } from "@/components/admin/chapter-flashcard-manager";
import { ChapterExerciseManager } from "@/components/admin/chapter-exercise-manager";
import { ChapterRevisionNotesManager } from "@/components/admin/chapter-revision-notes-manager";
import { ChapterFillInBlanksManager } from "@/components/admin/chapter-fill-in-blanks-manager";

type TabId = "summary" | "revision" | "quiz" | "flashcards" | "exercises" | "fill-in-blanks";

type Tab = {
  id: TabId;
  label: string;
  icon: typeof BookOpen;
};

const tabs: Tab[] = [
  { id: "summary", label: "Summary", icon: BookOpen },
  { id: "revision", label: "Revision Notes", icon: NotebookPen },
  { id: "quiz", label: "Quiz", icon: ClipboardList },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "exercises", label: "Exercises", icon: Brain },
  { id: "fill-in-blanks", label: "Fill in Blanks", icon: TextCursorInput },
];

type ChapterManageClientProps = {
  chapterId: number;
};

export function ChapterManageClient({ chapterId }: ChapterManageClientProps) {
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [subparts, setSubparts] = useState<AdminChapterSubpart[]>([]);
  const [persistedSubparts, setPersistedSubparts] = useState<AdminChapterSubpart[]>([]);
  const [selectedSubpartId, setSelectedSubpartId] = useState<number | null>(null);
  const [isLoadingSubparts, setIsLoadingSubparts] = useState(true);
  const [isSavingSubpart, setIsSavingSubpart] = useState(false);
  const [isCreatingSubpart, setIsCreatingSubpart] = useState(false);
  const [isDeletingSubpart, setIsDeletingSubpart] = useState(false);
  const [isReorderingSubparts, setIsReorderingSubparts] = useState(false);

  const sortSubparts = useCallback((items: AdminChapterSubpart[]) => {
    return [...items].sort((left, right) => {
      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex;
      }
      return left.id - right.id;
    });
  }, []);

  const fetchSubparts = useCallback(async () => {
    setIsLoadingSubparts(true);
    try {
      const payload = await getAdminChapterSubparts(chapterId);
      const ordered = sortSubparts(payload.subparts);
      setSubparts(ordered);
      setPersistedSubparts(ordered);
      setSelectedSubpartId((current) => {
        if (ordered.length === 0) {
          return null;
        }
        if (current && ordered.some((subpart) => subpart.id === current)) {
          return current;
        }
        return ordered[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Failed to fetch chapter subparts:", error);
      setSubparts([]);
      setPersistedSubparts([]);
      setSelectedSubpartId(null);
      pushToast({
        title: "Failed to load subparts",
        description: "Please try again.",
        tone: "error",
      });
    } finally {
      setIsLoadingSubparts(false);
    }
  }, [chapterId, pushToast, sortSubparts]);

  useEffect(() => {
    void fetchSubparts();
  }, [fetchSubparts]);

  const selectedSubpart = useMemo(
    () => subparts.find((subpart) => subpart.id === selectedSubpartId) ?? null,
    [selectedSubpartId, subparts]
  );

  const persistedSelectedSubpart = useMemo(
    () => persistedSubparts.find((subpart) => subpart.id === selectedSubpartId) ?? null,
    [persistedSubparts, selectedSubpartId]
  );

  const hasUnsavedChanges =
    selectedSubpart !== null &&
    persistedSelectedSubpart !== null &&
    (selectedSubpart.heading !== persistedSelectedSubpart.heading ||
      selectedSubpart.content !== persistedSelectedSubpart.content);

  const handleSelectedSubpartChange = useCallback(
    (field: "heading" | "content", value: string) => {
      if (!selectedSubpartId) {
        return;
      }
      setSubparts((current) =>
        current.map((subpart) =>
          subpart.id === selectedSubpartId
            ? {
                ...subpart,
                [field]: value,
              }
            : subpart
        )
      );
    },
    [selectedSubpartId]
  );

  const handleAddSubpart = useCallback(async () => {
    setIsCreatingSubpart(true);
    try {
      const response = await createAdminChapterSubpart({
        chapterId,
        heading: `Section ${subparts.length + 1}`,
        content: "Write section content here...",
      });
      const nextSubparts = sortSubparts([...subparts, response.subpart]);
      setSubparts(nextSubparts);
      setPersistedSubparts(nextSubparts);
      setSelectedSubpartId(response.subpart.id);
      pushToast({
        title: "Subpart added",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to create chapter subpart:", error);
      pushToast({
        title: "Failed to add subpart",
        tone: "error",
      });
    } finally {
      setIsCreatingSubpart(false);
    }
  }, [chapterId, pushToast, sortSubparts, subparts]);

  const handleSaveSubpart = useCallback(async () => {
    if (!selectedSubpart) {
      return;
    }

    const heading = selectedSubpart.heading.trim();
    const content = selectedSubpart.content.trim();
    if (!heading || !content) {
      pushToast({
        title: "Heading and content are required",
        tone: "error",
      });
      return;
    }

    setIsSavingSubpart(true);
    try {
      const response = await updateAdminChapterSubpart({
        chapterId,
        subpartId: selectedSubpart.id,
        heading,
        content,
      });

      setSubparts((current) =>
        sortSubparts(current.map((subpart) => (subpart.id === response.subpart.id ? response.subpart : subpart)))
      );
      setPersistedSubparts((current) =>
        sortSubparts(current.map((subpart) => (subpart.id === response.subpart.id ? response.subpart : subpart)))
      );

      pushToast({
        title: "Subpart saved",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to save chapter subpart:", error);
      pushToast({
        title: "Failed to save subpart",
        tone: "error",
      });
    } finally {
      setIsSavingSubpart(false);
    }
  }, [chapterId, pushToast, selectedSubpart, sortSubparts]);

  const handleDeleteSubpart = useCallback(async () => {
    if (!selectedSubpart) {
      return;
    }

    if (!window.confirm(`Delete "${selectedSubpart.heading}"?`)) {
      return;
    }

    setIsDeletingSubpart(true);
    try {
      await deleteAdminChapterSubpart({
        chapterId,
        subpartId: selectedSubpart.id,
      });

      const remaining = subparts.filter((subpart) => subpart.id !== selectedSubpart.id);
      const remainingPersisted = persistedSubparts.filter((subpart) => subpart.id !== selectedSubpart.id);
      setSubparts(remaining);
      setPersistedSubparts(remainingPersisted);
      setSelectedSubpartId(remaining[0]?.id ?? null);

      pushToast({
        title: "Subpart deleted",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to delete chapter subpart:", error);
      pushToast({
        title: "Failed to delete subpart",
        tone: "error",
      });
    } finally {
      setIsDeletingSubpart(false);
    }
  }, [chapterId, persistedSubparts, pushToast, selectedSubpart, subparts]);

  const handleMoveSelectedSubpart = useCallback(
    async (direction: "up" | "down") => {
      if (!selectedSubpartId) {
        return;
      }

      // Guard against unsaved edits
      if (hasUnsavedChanges) {
        pushToast({
          title: "Cannot reorder with unsaved changes",
          description: "Please save or discard your changes before reordering subparts.",
          tone: "error",
        });
        return;
      }

      const currentIndex = subparts.findIndex((subpart) => subpart.id === selectedSubpartId);
      if (currentIndex === -1) {
        return;
      }

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= subparts.length) {
        return;
      }

      const previous = subparts;
      const reordered = [...subparts];
      [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
      setSubparts(reordered);

      setIsReorderingSubparts(true);
      try {
        const response = await reorderAdminChapterSubparts({
          chapterId,
          subpartIds: reordered.map((subpart) => subpart.id),
        });
        const ordered = sortSubparts(response.subparts);
        setSubparts(ordered);
        setPersistedSubparts(ordered);
      } catch (error) {
        console.error("Failed to reorder chapter subparts:", error);
        setSubparts(previous);
        pushToast({
          title: "Failed to reorder subparts",
          tone: "error",
        });
      } finally {
        setIsReorderingSubparts(false);
      }
    },
    [chapterId, hasUnsavedChanges, pushToast, selectedSubpartId, sortSubparts, subparts]
  );

  const handleImageUpload = useCallback(async (file: File) => {
    try {
      const response = await uploadAdminChapterSummaryMedia({ chapterId, file });
      return {
        url: response.asset.objectUrl,
        markdown: response.markdown,
      };
    } catch (error) {
      pushToast({
        title: "Image upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        tone: "error",
      });
      throw error;
    }
  }, [chapterId, pushToast]);

  const breadcrumbSegments = [
    { label: "Admin", href: "/admin" },
    { label: "Content", href: "/admin/content" },
    { label: "Chapters", href: "/admin/content/chapters" },
    { label: `Chapter ${chapterId}` },
  ];

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <div className="border-b border-border-default bg-bg-surface">
        <div className="container mx-auto px-4 py-4">
          <StickyBreadcrumbWrapper className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <AdminBreadcrumb segments={breadcrumbSegments} className="mb-4" />
          </StickyBreadcrumbWrapper>
          <AdminPageHeader
            title={`Chapter ${chapterId}`}
            subtitle="Manage chapter content, quizzes, flashcards, and exercises"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-default bg-bg-surface sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-0.5 overflow-x-auto" role="tablist" aria-label="Chapter content tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "text-[var(--text-primary)]"
                      : "text-text-secondary hover:text-[var(--text-primary)] hover:bg-bg-subtle/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Summary Tab */}
        {activeTab === "summary" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-[var(--primary)] to-[var(--primary-hover)] rounded-full" />
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Chapter Subparts</h2>
                  <p className="text-sm text-text-secondary">Create, reorder, and edit chapter sections in Markdown</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <Badge variant="neutral">{subparts.length} sections</Badge>
                {hasUnsavedChanges ? <Badge variant="warning">Unsaved changes</Badge> : null}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleMoveSelectedSubpart("up")}
                  disabled={!selectedSubpart || isReorderingSubparts || isLoadingSubparts}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleMoveSelectedSubpart("down")}
                  disabled={!selectedSubpart || isReorderingSubparts || isLoadingSubparts}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleDeleteSubpart()}
                  disabled={!selectedSubpart || isDeletingSubpart || isLoadingSubparts}
                  className="gap-2"
                >
                  {isDeletingSubpart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleAddSubpart()}
                  disabled={isCreatingSubpart || isLoadingSubparts}
                  className="gap-2"
                >
                  {isCreatingSubpart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Subpart
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleSaveSubpart()}
                  disabled={!selectedSubpart || isSavingSubpart || !hasUnsavedChanges}
                  className="gap-2"
                >
                  {isSavingSubpart ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Subpart
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoadingSubparts ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
                </CardContent>
              </Card>
            ) : subparts.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4">
                  <p className="text-sm text-text-secondary">No subparts yet. Add your first section to begin writing chapter content.</p>
                  <Button variant="primary" size="sm" onClick={() => void handleAddSubpart()} disabled={isCreatingSubpart}>
                    {isCreatingSubpart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} 
                    Add First Subpart
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
                <Card>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {subparts.map((subpart) => {
                        const isActive = subpart.id === selectedSubpartId;
                        return (
                          <button
                            key={subpart.id}
                            type="button"
                            onClick={() => setSelectedSubpartId(subpart.id)}
                            className={cn(
                              "w-full rounded-md border px-3 py-2 text-left transition",
                              isActive
                                ? "border-[var(--primary)] bg-[var(--primary)]/10"
                                : "border-border-default hover:border-[var(--primary)]/40"
                            )}
                          >
                            <p className="text-xs text-text-secondary">Section {subpart.orderIndex}</p>
                            <p className="text-sm font-medium truncate">{subpart.heading}</p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {selectedSubpart ? (
                  <div className="space-y-3">
                    <Input
                      value={selectedSubpart.heading}
                      onChange={(event) => handleSelectedSubpartChange("heading", event.target.value)}
                      placeholder="Subpart heading"
                    />
                    <GithubMarkdownEditor
                      value={selectedSubpart.content}
                      onChange={(value) => handleSelectedSubpartChange("content", value)}
                      onImageUpload={handleImageUpload}
                      placeholder="Write subpart content in markdown..."
                      minHeight={500}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === "quiz" && (
          <div className="animate-in fade-in duration-300">
            <ChapterQuizManager chapterId={chapterId} />
          </div>
        )}

        {activeTab === "revision" && (
          <div className="animate-in fade-in duration-300">
            <ChapterRevisionNotesManager chapterId={chapterId} />
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === "flashcards" && (
          <div className="animate-in fade-in duration-300">
            <ChapterFlashcardManager chapterId={chapterId} />
          </div>
        )}

        {/* Exercises Tab */}
        {activeTab === "exercises" && (
          <div className="animate-in fade-in duration-300">
            <ChapterExerciseManager chapterId={chapterId} />
          </div>
        )}

        {/* Fill in the Blanks Tab */}
        {activeTab === "fill-in-blanks" && (
          <div className="animate-in fade-in duration-300">
            <ChapterFillInBlanksManager chapterId={chapterId} />
          </div>
        )}
      </div>
    </div>
  );
}