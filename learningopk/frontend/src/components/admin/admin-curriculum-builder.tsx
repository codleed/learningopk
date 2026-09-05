"use client";

import { useState } from "react";

import type { AdminCurriculumBoard } from "@/lib/admin-api";

import { BoardSection } from "./curriculum-builder/board-section";
import { ChapterSection } from "./curriculum-builder/chapter-section";
import { ClassSection } from "./curriculum-builder/class-section";
import { CurriculumTree } from "./curriculum-builder/curriculum-tree";
import { ExerciseSection } from "./curriculum-builder/exercise-section";
import { SubjectSection } from "./curriculum-builder/subject-section";
import { TabButton } from "./curriculum-builder/tab-button";
import { useCurriculumTree } from "./curriculum-builder/use-curriculum-tree";
import type { CurriculumFormTab, SectionCommonProps } from "./curriculum-builder/types";

type AdminCurriculumBuilderProps = {
  initialBoards: AdminCurriculumBoard[];
};

export function AdminCurriculumBuilder({ initialBoards }: AdminCurriculumBuilderProps) {
  const { boards, isRefreshing, refreshTree, classOptions, subjectOptions, chapterOptions } =
    useCurriculumTree(initialBoards);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<CurriculumFormTab>("board");

  const sectionProps: SectionCommonProps = {
    isSubmitting,
    setIsSubmitting,
    refreshTree,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border-default/70 p-3">
        <div className="flex flex-wrap gap-2" data-testid="curriculum-form-tabs">
          <TabButton
            testId="curriculum-tab-board"
            isActive={activeFormTab === "board"}
            onClick={() => setActiveFormTab("board")}
          >
            Add Board
          </TabButton>
          <TabButton
            testId="curriculum-tab-class"
            isActive={activeFormTab === "class"}
            onClick={() => setActiveFormTab("class")}
          >
            Add Class
          </TabButton>
          <TabButton
            testId="curriculum-tab-subject"
            isActive={activeFormTab === "subject"}
            onClick={() => setActiveFormTab("subject")}
          >
            Add Subject
          </TabButton>
          <TabButton
            testId="curriculum-tab-chapter"
            isActive={activeFormTab === "chapter"}
            onClick={() => setActiveFormTab("chapter")}
          >
            Chapter
          </TabButton>
          <TabButton
            testId="curriculum-tab-exercise"
            isActive={activeFormTab === "exercise"}
            onClick={() => setActiveFormTab("exercise")}
          >
            Add Exercise
          </TabButton>
        </div>

        {activeFormTab === "board" ? <BoardSection {...sectionProps} boards={boards} /> : null}

        {activeFormTab === "class" ? (
          <ClassSection {...sectionProps} boards={boards} classOptions={classOptions} />
        ) : null}

        {activeFormTab === "subject" ? (
          <SubjectSection
            {...sectionProps}
            classOptions={classOptions}
            subjectOptions={subjectOptions}
          />
        ) : null}

        {activeFormTab === "chapter" ? (
          <ChapterSection
            {...sectionProps}
            subjectOptions={subjectOptions}
            chapterOptions={chapterOptions}
          />
        ) : null}

        {activeFormTab === "exercise" ? (
          <ExerciseSection {...sectionProps} chapterOptions={chapterOptions} />
        ) : null}
      </div>

      <CurriculumTree boards={boards} isRefreshing={isRefreshing} refreshTree={refreshTree} />
    </div>
  );
}
