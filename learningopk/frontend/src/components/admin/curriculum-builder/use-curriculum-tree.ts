"use client";

import { useCallback, useMemo, useState } from "react";

import { getAdminCurriculumTree, type AdminCurriculumBoard } from "@/lib/admin-api";

import { useToast } from "../../ui/toast";
import type { ChapterOption, ClassOption, SubjectOption } from "./types";

type UseCurriculumTreeResult = {
  boards: AdminCurriculumBoard[];
  isRefreshing: boolean;
  refreshTree: () => Promise<void>;
  classOptions: ClassOption[];
  subjectOptions: SubjectOption[];
  chapterOptions: ChapterOption[];
};

export function useCurriculumTree(initialBoards: AdminCurriculumBoard[]): UseCurriculumTreeResult {
  const { pushToast } = useToast();
  const [boards, setBoards] = useState(initialBoards);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTree = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const nextBoards = await getAdminCurriculumTree();
      setBoards(nextBoards);
    } catch {
      pushToast({
        title: "Failed to refresh curriculum",
        tone: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [pushToast]);

  const classOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.map((boardClass) => ({
          id: boardClass.id,
          boardId: board.id,
          boardName: board.name,
          name: boardClass.name,
          label: `${board.name} / ${boardClass.name}`,
        }))
      ),
    [boards]
  );

  const subjectOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.flatMap((boardClass) =>
          boardClass.subjects.map((subject) => ({
            id: subject.id,
            label: `${board.name} / ${boardClass.name} / ${subject.name}`,
          }))
        )
      ),
    [boards]
  );

  const chapterOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.flatMap((boardClass) =>
          boardClass.subjects.flatMap((subject) =>
            subject.chapters.map((chapter) => ({
              id: chapter.id,
              subjectName: subject.name,
              chapterNumber: chapter.chapterNumber,
              title: chapter.title,
              label: `${board.name} / ${boardClass.name} / ${subject.name} / Chapter ${chapter.chapterNumber}: ${chapter.title}`,
            }))
          )
        )
      ),
    [boards]
  );

  return {
    boards,
    isRefreshing,
    refreshTree,
    classOptions,
    subjectOptions,
    chapterOptions,
  };
}
