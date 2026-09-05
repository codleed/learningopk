"use client";

import { useState } from "react";

import { TabButton } from "./tab-button";
import type { ChapterModeTab, ChapterOption, SectionCommonProps, SubjectOption } from "./types";
import { ChapterAddForm } from "./chapter-add-form";
import { ChapterEditSection } from "./chapter-edit-section";

type ChapterSectionProps = SectionCommonProps & {
  subjectOptions: SubjectOption[];
  chapterOptions: ChapterOption[];
};

export function ChapterSection({
  subjectOptions,
  chapterOptions,
  isSubmitting,
  setIsSubmitting,
  refreshTree,
}: ChapterSectionProps) {
  const [activeChapterModeTab, setActiveChapterModeTab] = useState<ChapterModeTab>("add");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" data-testid="curriculum-chapter-mode-tabs">
        <TabButton
          testId="curriculum-chapter-mode-add"
          isActive={activeChapterModeTab === "add"}
          onClick={() => setActiveChapterModeTab("add")}
        >
          Add New
        </TabButton>
        <TabButton
          testId="curriculum-chapter-mode-edit"
          isActive={activeChapterModeTab === "edit"}
          onClick={() => setActiveChapterModeTab("edit")}
        >
          Edit Chapter
        </TabButton>
      </div>

      {activeChapterModeTab === "add" ? (
        <ChapterAddForm
          subjectOptions={subjectOptions}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          refreshTree={refreshTree}
        />
      ) : (
        <ChapterEditSection
          chapterOptions={chapterOptions}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          refreshTree={refreshTree}
        />
      )}
    </div>
  );
}
