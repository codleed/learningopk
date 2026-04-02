"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, ClipboardList, Layers, Brain, Save, Loader2 } from "lucide-react";

import { AdminBreadcrumb } from "@/components/admin/breadcrumb";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubMarkdownEditor } from "@/components/admin/github-markdown-editor";
import { useToast } from "@/components/ui/toast";
import { getAdminChapterSummary, updateAdminChapterSummary, uploadAdminChapterSummaryMedia } from "@/lib/admin-api";
import type { AdminChapterSummaryResponse } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

import { ChapterQuizManager } from "@/components/admin/chapter-quiz-manager";
import { ChapterFlashcardManager } from "@/components/admin/chapter-flashcard-manager";
import { ChapterExerciseManager } from "@/components/admin/chapter-exercise-manager";

type TabId = "summary" | "quiz" | "flashcards" | "exercises";

type Tab = {
  id: TabId;
  label: string;
  icon: typeof BookOpen;
};

const tabs: Tab[] = [
  { id: "summary", label: "Summary", icon: BookOpen },
  { id: "quiz", label: "Quiz", icon: ClipboardList },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "exercises", label: "Exercises", icon: Brain },
];

type ChapterManageClientProps = {
  chapterId: number;
};

export function ChapterManageClient({ chapterId }: ChapterManageClientProps) {
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [summary, setSummary] = useState("");
  const [originalSummary, setOriginalSummary] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // Fetch chapter summary
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const data: AdminChapterSummaryResponse = await getAdminChapterSummary(chapterId);
        setSummary(data.chapter.summary || "");
        setOriginalSummary(data.chapter.summary || "");
      } catch (error) {
        console.error("Failed to fetch chapter summary:", error);
        setSummary("");
        setOriginalSummary("");
        pushToast({
          title: "Failed to load summary",
          description: "Please try again.",
          tone: "error",
        });
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [chapterId, pushToast]);

  const handleSaveSummary = useCallback(async () => {
    setIsSavingSummary(true);
    try {
      await updateAdminChapterSummary({ chapterId, summary });
      setOriginalSummary(summary);
      pushToast({
        title: "Summary saved",
        tone: "success",
      });
    } catch (error) {
      console.error("Failed to save chapter summary:", error);
      pushToast({
        title: "Failed to save summary",
        tone: "error",
      });
    } finally {
      setIsSavingSummary(false);
    }
  }, [chapterId, summary, pushToast]);

  const handleImageUpload = useCallback(async (file: File) => {
    const response = await uploadAdminChapterSummaryMedia({ chapterId, file });
    return {
      url: response.asset.objectUrl,
      markdown: response.markdown,
    };
  }, [chapterId]);

  const hasUnsavedChanges = summary !== originalSummary;

  const breadcrumbSegments = [
    { label: "Admin", href: "/admin" },
    { label: "Content", href: "/admin/content" },
    { label: "Chapters", href: "/admin/content/chapters" },
    { label: `Chapter ${chapterId}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <AdminBreadcrumb segments={breadcrumbSegments} className="mb-4" />
          <AdminPageHeader
            title={`Chapter ${chapterId}`}
            subtitle="Manage chapter content, quizzes, flashcards, and exercises"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
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
                      ? "text-[var(--foreground)]"
                      : "text-muted-foreground hover:text-[var(--foreground)] hover:bg-muted/50"
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
                  <h2 className="text-xl font-semibold tracking-tight">Chapter Summary</h2>
                  <p className="text-sm text-muted-foreground">Write or edit the chapter content in Markdown</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="warning" className="animate-pulse">Unsaved changes</Badge>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSummary}
                  disabled={isSavingSummary || !hasUnsavedChanges}
                  className="gap-2"
                >
                  {isSavingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Summary
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoadingSummary ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <GithubMarkdownEditor
                value={summary}
                onChange={setSummary}
                onImageUpload={handleImageUpload}
                placeholder="Write chapter content in markdown..."
                minHeight={500}
              />
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === "quiz" && (
          <div className="animate-in fade-in duration-300">
            <ChapterQuizManager chapterId={chapterId} />
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
      </div>
    </div>
  );
}
