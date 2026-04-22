"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import {
  createAdminCurriculumBoard,
  createAdminCurriculumChapter,
  createAdminCurriculumClass,
  createAdminCurriculumExercise,
  createAdminCurriculumSubject,
  deleteAdminCurriculumBoard,
  deleteAdminCurriculumChapter,
  deleteAdminCurriculumClass,
  deleteAdminCurriculumExercise,
  deleteAdminCurriculumSubject,
  getAdminChapterGraph,
  getAdminChapterLinks,
  getAdminChapterSummary,
  getAdminCurriculumExercises,
  getAdminCurriculumTree,
  updateAdminCurriculumBoard,
  updateAdminChapterSummary,
  updateAdminCurriculumChapter,
  updateAdminCurriculumClass,
  updateAdminCurriculumExercise,
  uploadAdminChapterSummaryMedia,
  type AdminChapterGraphResponse,
  type AdminChapterLinksResponse,
  type AdminCurriculumBoard,
  type AdminCurriculumExerciseRead
} from "@/lib/admin-api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/toast";
import { ChapterLinkGraph } from "./chapter-link-graph";
import { CodeMirrorMarkdownEditor, type CodeMirrorMarkdownEditorHandle } from "./codemirror-markdown-editor";

type AdminCurriculumBuilderProps = {
  initialBoards: AdminCurriculumBoard[];
};

type CurriculumFormTab = "board" | "class" | "subject" | "chapter" | "exercise";
type EntityModeTab = "add" | "manage";
type ChapterModeTab = "add" | "edit";
type ExerciseType = "short" | "mcq" | "long" | "numerical" | "fill_in_blanks";

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toPositiveInteger = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
};

const buildSizedImageMarkdown = ({
  imageUrl,
  altText,
  width,
  height
}: {
  imageUrl: string;
  altText: string;
  width: string;
  height: string;
}): string => {
  const widthValue = toPositiveInteger(width);
  const heightValue = toPositiveInteger(height);
  const titleParts: string[] = [];
  if (widthValue) {
    titleParts.push(`width=${widthValue}`);
  }
  if (heightValue) {
    titleParts.push(`height=${heightValue}`);
  }
  const title = titleParts.length > 0 ? ` "${titleParts.join(" ")}"` : "";
  return `![${altText.trim() || "Chapter figure"}](${imageUrl}${title})`;
};

const insertAtSelection = ({
  source,
  insertion,
  start,
  end
}: {
  source: string;
  insertion: string;
  start: number;
  end: number;
}): { value: string; cursor: number } => {
  const safeStart = Math.max(0, Math.min(start, source.length));
  const safeEnd = Math.max(safeStart, Math.min(end, source.length));
  const nextValue = `${source.slice(0, safeStart)}${insertion}${source.slice(safeEnd)}`;
  return {
    value: nextValue,
    cursor: safeStart + insertion.length
  };
};

export function AdminCurriculumBuilder({ initialBoards }: AdminCurriculumBuilderProps) {
  const { pushToast } = useToast();
  const [boards, setBoards] = useState(initialBoards);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [boardName, setBoardName] = useState("");
  const [manageBoardId, setManageBoardId] = useState("");
  const [manageBoardName, setManageBoardName] = useState("");
  const [classBoardId, setClassBoardId] = useState("");
  const [className, setClassName] = useState("");
  const [manageClassId, setManageClassId] = useState("");
  const [manageClassName, setManageClassName] = useState("");
  const [subjectBoardClassId, setSubjectBoardClassId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [manageSubjectId, setManageSubjectId] = useState("");
  const [manageSubjectName, setManageSubjectName] = useState("");
  const [chapterSubjectId, setChapterSubjectId] = useState("");
  const [chapterNumber, setChapterNumber] = useState("1");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterSummary, setChapterSummary] = useState("");
  const [manageChapterNumber, setManageChapterNumber] = useState("1");
  const [manageChapterTitle, setManageChapterTitle] = useState("");
  const [summaryEditorChapterId, setSummaryEditorChapterId] = useState("");
  const [summaryEditorContent, setSummaryEditorContent] = useState("");
  const [summaryEditorImageAlt, setSummaryEditorImageAlt] = useState("Figure");
  const [summaryEditorImageWidth, setSummaryEditorImageWidth] = useState("640");
  const [summaryEditorImageHeight, setSummaryEditorImageHeight] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummarySaving, setIsSummarySaving] = useState(false);
  const [isSummaryMediaUploading, setIsSummaryMediaUploading] = useState(false);
  const [isSummaryLinksLoading, setIsSummaryLinksLoading] = useState(false);
  const [summaryEditorOutgoingLinks, setSummaryEditorOutgoingLinks] = useState<AdminChapterLinksResponse["links"]["outgoing"]>([]);
  const [summaryEditorBacklinks, setSummaryEditorBacklinks] = useState<AdminChapterLinksResponse["links"]["backlinks"]>([]);
  const [isSummaryGraphLoading, setIsSummaryGraphLoading] = useState(false);
  const [summaryGraphNodes, setSummaryGraphNodes] = useState<AdminChapterGraphResponse["graph"]["nodes"]>([]);
  const [summaryGraphEdges, setSummaryGraphEdges] = useState<AdminChapterGraphResponse["graph"]["edges"]>([]);
  const [summaryGraphSearch, setSummaryGraphSearch] = useState("");
  const [wikiLinkSuggestionQuery, setWikiLinkSuggestionQuery] = useState("");
  const [wikiLinkSuggestions, setWikiLinkSuggestions] = useState<string[]>([]);
  const [exerciseChapterId, setExerciseChapterId] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseType>("short");
  const [exerciseDifficulty, setExerciseDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [exerciseNumber, setExerciseNumber] = useState("");
  const [exerciseQuestion, setExerciseQuestion] = useState("");
  const [exerciseSolution, setExerciseSolution] = useState("");
  const [chapterExercises, setChapterExercises] = useState<AdminCurriculumExerciseRead[]>([]);
  const [isExerciseListLoading, setIsExerciseListLoading] = useState(false);
  const [manageExerciseId, setManageExerciseId] = useState("");
  const [manageExerciseType, setManageExerciseType] = useState<ExerciseType>("short");
  const [manageExerciseDifficulty, setManageExerciseDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [manageExerciseNumber, setManageExerciseNumber] = useState("");
  const [manageExerciseQuestion, setManageExerciseQuestion] = useState("");
  const [manageExerciseSolution, setManageExerciseSolution] = useState("");
  const [activeBoardModeTab, setActiveBoardModeTab] = useState<EntityModeTab>("add");
  const [activeClassModeTab, setActiveClassModeTab] = useState<EntityModeTab>("add");
  const [activeSubjectModeTab, setActiveSubjectModeTab] = useState<EntityModeTab>("add");
  const [activeExerciseModeTab, setActiveExerciseModeTab] = useState<EntityModeTab>("add");
  const [activeFormTab, setActiveFormTab] = useState<CurriculumFormTab>("board");
  const [activeChapterModeTab, setActiveChapterModeTab] = useState<ChapterModeTab>("add");
  const [isChapterSummaryPreviewVisible, setIsChapterSummaryPreviewVisible] = useState(false);
  const [isSummaryEditorPreviewVisible, setIsSummaryEditorPreviewVisible] = useState(false);
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<number>>(new Set());
  const chapterMarkdownInputRef = useRef<HTMLInputElement | null>(null);
  const summaryEditorCodeMirrorRef = useRef<CodeMirrorMarkdownEditorHandle | null>(null);
  const summaryEditorLiveContentRef = useRef("");
  const summaryEditorSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryEditorPersistedContentRef = useRef("");
  const summaryEditorMarkdownInputRef = useRef<HTMLInputElement | null>(null);
  const summaryEditorUploadInputRef = useRef<HTMLInputElement | null>(null);

  const setSummaryEditorContentImmediate = (nextContent: string) => {
    if (summaryEditorSyncTimeoutRef.current) {
      clearTimeout(summaryEditorSyncTimeoutRef.current);
      summaryEditorSyncTimeoutRef.current = null;
    }
    summaryEditorLiveContentRef.current = nextContent;
    setSummaryEditorContent(nextContent);
  };

  const handleSummaryEditorContentChange = (nextContent: string) => {
    summaryEditorLiveContentRef.current = nextContent;
    if (summaryEditorSyncTimeoutRef.current) {
      clearTimeout(summaryEditorSyncTimeoutRef.current);
    }
    summaryEditorSyncTimeoutRef.current = setTimeout(() => {
      setSummaryEditorContent(summaryEditorLiveContentRef.current);
      summaryEditorSyncTimeoutRef.current = null;
    }, 120);
  };

  useEffect(() => {
    setExpandedBoardIds((current) => {
      const validBoardIds = new Set(boards.map((board) => board.id));
      const next = new Set<number>();
      for (const boardId of current) {
        if (validBoardIds.has(boardId)) {
          next.add(boardId);
        }
      }
      return next;
    });
  }, [boards]);

  useEffect(() => {
    return () => {
      if (summaryEditorSyncTimeoutRef.current) {
        clearTimeout(summaryEditorSyncTimeoutRef.current);
      }
    };
  }, []);

  const classOptions = useMemo(
    () =>
      boards.flatMap((board) =>
        board.classes.map((boardClass) => ({
          id: boardClass.id,
          boardId: board.id,
          boardName: board.name,
          name: boardClass.name,
          label: `${board.name} / ${boardClass.name}`
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
            label: `${board.name} / ${boardClass.name} / ${subject.name}`
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
              label: `${board.name} / ${boardClass.name} / ${subject.name} / Chapter ${chapter.chapterNumber}: ${chapter.title}`
            }))
          )
        )
      ),
    [boards]
  );

  const wikiLinkTargets = useMemo(
    () =>
      Array.from(
        chapterOptions.reduce((targets, chapter) => {
          targets.add(chapter.title);
          return targets;
        }, new Set<string>())
      ).sort((left, right) => left.localeCompare(right)),
    [chapterOptions]
  );

  const resolvedOutgoingLinks = useMemo(
    () => summaryEditorOutgoingLinks.filter((link) => link.isResolved),
    [summaryEditorOutgoingLinks]
  );

  const unresolvedOutgoingLinks = useMemo(
    () => summaryEditorOutgoingLinks.filter((link) => !link.isResolved),
    [summaryEditorOutgoingLinks]
  );

  const filteredGraphNodes = useMemo(() => {
    const search = summaryGraphSearch.trim().toLowerCase();
    if (!search) {
      return summaryGraphNodes;
    }
    return summaryGraphNodes.filter((node) => node.title.toLowerCase().includes(search));
  }, [summaryGraphNodes, summaryGraphSearch]);

  const filteredGraphEdges = useMemo(() => {
    if (summaryGraphSearch.trim().length === 0) {
      return summaryGraphEdges;
    }
    const allowedNodeIds = new Set(filteredGraphNodes.map((node) => node.id));
    return summaryGraphEdges.filter((edge) => {
      const target = edge.targetChapterId;
      if (!target) {
        return false;
      }
      return allowedNodeIds.has(edge.sourceChapterId) || allowedNodeIds.has(target);
    });
  }, [filteredGraphNodes, summaryGraphEdges, summaryGraphSearch]);

  const selectedExerciseChapter = useMemo(
    () => chapterOptions.find((option) => option.id === Number(exerciseChapterId)),
    [chapterOptions, exerciseChapterId]
  );

  const isPhysicsExerciseChapter = selectedExerciseChapter?.subjectName.toLowerCase().includes("physics") ?? false;

  const exerciseTypeOptions = useMemo(() => {
    const baseOptions: Array<{ value: ExerciseType; label: string }> = [
      { value: "short", label: "Comprehension Questions Short Questions" },
      { value: "mcq", label: "MCQs" },
      { value: "long", label: "Comprehension Questions Long Questions" }
    ];
    if (isPhysicsExerciseChapter) {
      baseOptions.push({ value: "numerical", label: "Numerical Problems" });
    }
    return baseOptions;
  }, [isPhysicsExerciseChapter]);

  useEffect(() => {
    if (exerciseType === "numerical" && !isPhysicsExerciseChapter) {
      setExerciseType("short");
    }
  }, [exerciseType, isPhysicsExerciseChapter]);

  useEffect(() => {
    if (manageExerciseType === "numerical" && !isPhysicsExerciseChapter) {
      setManageExerciseType("short");
    }
  }, [manageExerciseType, isPhysicsExerciseChapter]);

  useEffect(() => {
    const selectedBoard = boards.find((board) => board.id === Number(manageBoardId));
    setManageBoardName(selectedBoard?.name ?? "");
  }, [boards, manageBoardId]);

  useEffect(() => {
    const selectedClass = classOptions.find((option) => option.id === Number(manageClassId));
    setManageClassName(selectedClass?.name ?? "");
  }, [classOptions, manageClassId]);

  useEffect(() => {
    const selectedChapter = chapterOptions.find((option) => option.id === Number(summaryEditorChapterId));
    setManageChapterTitle(selectedChapter?.title ?? "");
    setManageChapterNumber(selectedChapter ? String(selectedChapter.chapterNumber) : "1");
  }, [chapterOptions, summaryEditorChapterId]);

  const loadSummaryLinks = useCallback(async (chapterId: number) => {
    setIsSummaryLinksLoading(true);
    try {
      const payload = await getAdminChapterLinks(chapterId);
      setSummaryEditorOutgoingLinks(payload.links.outgoing);
      setSummaryEditorBacklinks(payload.links.backlinks);
    } catch {
      setSummaryEditorOutgoingLinks([]);
      setSummaryEditorBacklinks([]);
      pushToast({
        title: "Could not load chapter links",
        tone: "error"
      });
    } finally {
      setIsSummaryLinksLoading(false);
    }
  }, [pushToast]);

  const loadSummaryGraph = useCallback(async () => {
    setIsSummaryGraphLoading(true);
    try {
      const payload = await getAdminChapterGraph({
        query: ""
      });
      setSummaryGraphNodes(payload.graph.nodes);
      setSummaryGraphEdges(payload.graph.edges);
    } catch {
      setSummaryGraphNodes([]);
      setSummaryGraphEdges([]);
      pushToast({
        title: "Could not load summary graph",
        tone: "error"
      });
    } finally {
      setIsSummaryGraphLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    if (!summaryEditorChapterId) {
      setSummaryEditorContentImmediate("");
      summaryEditorPersistedContentRef.current = "";
      setSummaryEditorOutgoingLinks([]);
      setSummaryEditorBacklinks([]);
      return;
    }

    let isCancelled = false;
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      setSummaryEditorContentImmediate("");
      summaryEditorPersistedContentRef.current = "";
      setSummaryEditorOutgoingLinks([]);
      setSummaryEditorBacklinks([]);
      return;
    }

    setIsSummaryLoading(true);
    Promise.all([getAdminChapterSummary(chapterId), getAdminChapterLinks(chapterId)])
      .then(([summaryPayload, linksPayload]) => {
        if (!isCancelled) {
          const summaryValue = summaryPayload.chapter.summary ?? "";
          setSummaryEditorContentImmediate(summaryValue);
          summaryEditorPersistedContentRef.current = summaryValue;
          setSummaryEditorOutgoingLinks(linksPayload.links.outgoing);
          setSummaryEditorBacklinks(linksPayload.links.backlinks);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSummaryEditorContentImmediate("");
          summaryEditorPersistedContentRef.current = "";
          setSummaryEditorOutgoingLinks([]);
          setSummaryEditorBacklinks([]);
          pushToast({
            title: "Could not load chapter summary",
            tone: "error"
          });
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsSummaryLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [summaryEditorChapterId, pushToast]);

  useEffect(() => {
    if (!summaryEditorChapterId) {
      return;
    }

    const selectedId = Number(summaryEditorChapterId);
    if (!chapterOptions.some((option) => option.id === selectedId)) {
      setSummaryEditorChapterId("");
      setSummaryEditorContentImmediate("");
      summaryEditorPersistedContentRef.current = "";
      setSummaryEditorOutgoingLinks([]);
      setSummaryEditorBacklinks([]);
    }
  }, [chapterOptions, summaryEditorChapterId]);

  useEffect(() => {
    if (!summaryEditorChapterId) {
      setWikiLinkSuggestionQuery("");
      setWikiLinkSuggestions([]);
    }
  }, [summaryEditorChapterId]);

  useEffect(() => {
    if (activeFormTab !== "chapter" || activeChapterModeTab !== "edit") {
      return;
    }
    void loadSummaryGraph();
  }, [activeFormTab, activeChapterModeTab, chapterOptions.length, loadSummaryGraph]);

  const refreshSummaryLinks = async () => {
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      return;
    }
    await loadSummaryLinks(chapterId);
  };

  const refreshExercises = useCallback(
    async (chapterId: number) => {
      if (!chapterId) {
        setChapterExercises([]);
        setManageExerciseId("");
        return;
      }
      setIsExerciseListLoading(true);
      try {
        const payload = await getAdminCurriculumExercises({
          chapterId
        });
        setChapterExercises(payload.exercises);
      } catch {
        setChapterExercises([]);
        pushToast({
          title: "Could not load exercises",
          tone: "error"
        });
      } finally {
        setIsExerciseListLoading(false);
      }
    },
    [pushToast]
  );

  const refreshTree = async () => {
    setIsRefreshing(true);
    try {
      const nextBoards = await getAdminCurriculumTree();
      setBoards(nextBoards);
    } catch {
      pushToast({
        title: "Failed to refresh curriculum",
        tone: "error"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const chapterId = Number(exerciseChapterId);
    if (!chapterId) {
      setChapterExercises([]);
      setManageExerciseId("");
      return;
    }
    void refreshExercises(chapterId);
  }, [exerciseChapterId, refreshExercises]);

  useEffect(() => {
    const selectedExercise = chapterExercises.find((exercise) => exercise.id === Number(manageExerciseId));
    if (!selectedExercise) {
      setManageExerciseNumber("");
      setManageExerciseQuestion("");
      setManageExerciseSolution("");
      setManageExerciseDifficulty("medium");
      setManageExerciseType("short");
      return;
    }

    setManageExerciseNumber(selectedExercise.exerciseNumber);
    setManageExerciseQuestion(selectedExercise.question);
    setManageExerciseSolution(selectedExercise.solution);
    setManageExerciseDifficulty(selectedExercise.difficulty);
    setManageExerciseType(selectedExercise.type);
  }, [chapterExercises, manageExerciseId]);

  const submitBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = boardName.trim();
    if (!normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumBoard({
        name: normalizedName,
        slug: toSlug(normalizedName)
      });
      setBoardName("");
      await refreshTree();
      pushToast({ title: "Board created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateBoard = async () => {
    const boardId = Number(manageBoardId);
    const normalizedName = manageBoardName.trim();
    if (!boardId || !normalizedName) {
      pushToast({ title: "Select a board and provide a name", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumBoard({
        boardId,
        name: normalizedName,
        slug: toSlug(normalizedName)
      });
      await refreshTree();
      pushToast({ title: "Board updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteBoard = async () => {
    const boardId = Number(manageBoardId);
    if (!boardId) {
      pushToast({ title: "Select a board first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this board and all related classes, subjects, chapters, and exercises?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumBoard(boardId);
      setManageBoardId("");
      setManageBoardName("");
      await refreshTree();
      pushToast({ title: "Board deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete board", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardId = Number(classBoardId);
    const normalizedName = className.trim();
    if (!boardId || !normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumClass({
        boardId,
        name: normalizedName,
        slug: toSlug(normalizedName)
      });
      setClassName("");
      await refreshTree();
      pushToast({ title: "Class created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateClass = async () => {
    const classId = Number(manageClassId);
    const normalizedName = manageClassName.trim();
    if (!classId || !normalizedName) {
      pushToast({ title: "Select a class and provide a name", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumClass({
        classId,
        name: normalizedName,
        slug: toSlug(normalizedName)
      });
      await refreshTree();
      pushToast({ title: "Class updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteClass = async () => {
    const classId = Number(manageClassId);
    if (!classId) {
      pushToast({ title: "Select a class first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this class and all related subjects, chapters, and exercises?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumClass(classId);
      setManageClassId("");
      setManageClassName("");
      await refreshTree();
      pushToast({ title: "Class deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete class", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const boardClassId = Number(subjectBoardClassId);
    const normalizedName = subjectName.trim();
    if (!boardClassId || !normalizedName) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumSubject({
        boardClassId,
        name: normalizedName,
        slug: toSlug(normalizedName),
        ...(subjectDescription.trim().length > 0 ? { description: subjectDescription.trim() } : {})
      });
      setSubjectName("");
      setSubjectDescription("");
      await refreshTree();
      pushToast({ title: "Subject created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create subject", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSubject = async () => {
    const subjectId = Number(manageSubjectId);
    if (!subjectId) {
      pushToast({ title: "Select a subject first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this subject and all related chapters?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumSubject(subjectId);
      setManageSubjectId("");
      setManageSubjectName("");
      await refreshTree();
      pushToast({ title: "Subject deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete subject", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitChapter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subjectId = Number(chapterSubjectId);
    const chapterNumberValue = Number(chapterNumber);
    const title = chapterTitle.trim();
    const summary = chapterSummary.trim();
    if (!subjectId || !chapterNumberValue || !title || !summary) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminCurriculumChapter({
        subjectId,
        chapterNumber: chapterNumberValue,
        title,
        slug: toSlug(title)
      });
      setChapterNumber("1");
      setChapterTitle("");
      setChapterSummary("");
      if (chapterMarkdownInputRef.current) {
        chapterMarkdownInputRef.current.value = "";
      }
      await refreshTree();
      pushToast({ title: "Chapter created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create chapter", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitExercise = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chapterId = Number(exerciseChapterId);
    const normalizedExerciseNumber = exerciseNumber.trim();
    const question = exerciseQuestion.trim();
    const solution = exerciseSolution.trim();

    if (!chapterId || !normalizedExerciseNumber || !question || !solution) {
      return;
    }

    if (exerciseType === "numerical" && !isPhysicsExerciseChapter) {
      pushToast({ title: "Numerical problems are only for Physics chapters", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminCurriculumExercise({
        chapterId,
        exerciseNumber: normalizedExerciseNumber,
        question,
        solution,
        difficulty: exerciseDifficulty,
        type: exerciseType
      });
      setExerciseNumber("");
      setExerciseQuestion("");
      setExerciseSolution("");
      setExerciseDifficulty("medium");
      await refreshExercises(chapterId);
      pushToast({ title: "Exercise created", tone: "success" });
    } catch {
      pushToast({ title: "Could not create exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateChapterMeta = async () => {
    const chapterId = Number(summaryEditorChapterId);
    const chapterNumberValue = Number(manageChapterNumber);
    const title = manageChapterTitle.trim();
    if (!chapterId || !chapterNumberValue || !title) {
      pushToast({ title: "Select chapter and provide title/number", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumChapter({
        chapterId,
        chapterNumber: chapterNumberValue,
        title,
        slug: toSlug(title)
      });
      await refreshTree();
      await loadSummaryGraph();
      pushToast({ title: "Chapter updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update chapter", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteChapter = async () => {
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      pushToast({ title: "Select a chapter first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this chapter and all related exercises?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumChapter(chapterId);
      setSummaryEditorChapterId("");
      setSummaryEditorContentImmediate("");
      setSummaryEditorOutgoingLinks([]);
      setSummaryEditorBacklinks([]);
      await refreshTree();
      await loadSummaryGraph();
      pushToast({ title: "Chapter deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete chapter", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateExercise = async () => {
    const exerciseId = Number(manageExerciseId);
    const normalizedExerciseNumber = manageExerciseNumber.trim();
    const question = manageExerciseQuestion.trim();
    const solution = manageExerciseSolution.trim();

    if (!exerciseId || !normalizedExerciseNumber || !question || !solution) {
      pushToast({ title: "Select exercise and complete all fields", tone: "error" });
      return;
    }

    if (manageExerciseType === "numerical" && !isPhysicsExerciseChapter) {
      pushToast({ title: "Numerical problems are only for Physics chapters", tone: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminCurriculumExercise({
        exerciseId,
        exerciseNumber: normalizedExerciseNumber,
        question,
        solution,
        difficulty: manageExerciseDifficulty,
        type: manageExerciseType
      });
      await refreshExercises(Number(exerciseChapterId));
      pushToast({ title: "Exercise updated", tone: "success" });
    } catch {
      pushToast({ title: "Could not update exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExercise = async () => {
    const exerciseId = Number(manageExerciseId);
    if (!exerciseId) {
      pushToast({ title: "Select an exercise first", tone: "error" });
      return;
    }
    if (!window.confirm("Delete this exercise?")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminCurriculumExercise(exerciseId);
      setManageExerciseId("");
      await refreshExercises(Number(exerciseChapterId));
      pushToast({ title: "Exercise deleted", tone: "success" });
    } catch {
      pushToast({ title: "Could not delete exercise", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const importChapterMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedMarkdown = await file.text();
      if (importedMarkdown.trim().length === 0) {
        pushToast({
          title: "Markdown file is empty",
          tone: "error"
        });
        return;
      }

      if (
        chapterSummary.trim().length > 0 &&
        !window.confirm("Importing a Markdown file will replace the current chapter summary draft. Continue?")
      ) {
        return;
      }

      setChapterSummary(importedMarkdown);
      pushToast({
        title: "Markdown imported into chapter form",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not read Markdown file",
        tone: "error"
      });
    } finally {
      input.value = "";
    }
  };

  const saveSummaryEditor = async () => {
    const chapterId = Number(summaryEditorChapterId);
    const summary = summaryEditorLiveContentRef.current.trim();
    if (!chapterId || !summary) {
      pushToast({
        title: "Select a chapter and write summary first",
        tone: "error"
      });
      return;
    }

    setIsSummarySaving(true);
    try {
      await updateAdminChapterSummary({
        chapterId,
        summary
      });
      summaryEditorPersistedContentRef.current = summary;
      await refreshSummaryLinks();
      await loadSummaryGraph();
      pushToast({
        title: "Chapter summary updated",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not save chapter summary",
        tone: "error"
      });
    } finally {
      setIsSummarySaving(false);
    }
  };

  const importSummaryMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedMarkdown = await file.text();
      if (importedMarkdown.trim().length === 0) {
        pushToast({
          title: "Markdown file is empty",
          tone: "error"
        });
        return;
      }

      const hasUnsavedChanges = summaryEditorLiveContentRef.current !== summaryEditorPersistedContentRef.current;
      if (hasUnsavedChanges && !window.confirm("Importing a Markdown file will replace unsaved summary edits. Continue?")) {
        return;
      }

      setSummaryEditorContentImmediate(importedMarkdown);
      summaryEditorCodeMirrorRef.current?.focus();
      pushToast({
        title: "Markdown imported into editor",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not read Markdown file",
        tone: "error"
      });
    } finally {
      input.value = "";
    }
  };

  const uploadSummaryFigure = async () => {
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      pushToast({
        title: "Select a chapter first",
        tone: "error"
      });
      return;
    }

    const file = summaryEditorUploadInputRef.current?.files?.[0];
    if (!file) {
      pushToast({
        title: "Choose an image file first",
        tone: "error"
      });
      return;
    }

    const selection = summaryEditorCodeMirrorRef.current?.getSelectionRange();
    const selectionStart = selection?.start ?? summaryEditorLiveContentRef.current.length;
    const selectionEnd = selection?.end ?? summaryEditorLiveContentRef.current.length;

    setIsSummaryMediaUploading(true);
    try {
      const payload = await uploadAdminChapterSummaryMedia({
        chapterId,
        file
      });
      const imageMarkdown = buildSizedImageMarkdown({
        imageUrl: payload.asset.objectUrl,
        altText: summaryEditorImageAlt,
        width: summaryEditorImageWidth,
        height: summaryEditorImageHeight
      });
      const insertion = `${imageMarkdown}\n`;

      const editor = summaryEditorCodeMirrorRef.current;
      if (editor) {
        editor.insertTextAtSelection(insertion);
        editor.focus();
      } else {
        const nextValue = insertAtSelection({
          source: summaryEditorLiveContentRef.current,
          insertion,
          start: selectionStart,
          end: selectionEnd
        }).value;
        setSummaryEditorContentImmediate(nextValue);
      }

      if (summaryEditorSyncTimeoutRef.current) {
        clearTimeout(summaryEditorSyncTimeoutRef.current);
      }
      summaryEditorSyncTimeoutRef.current = setTimeout(() => {
        setSummaryEditorContent(summaryEditorLiveContentRef.current);
        summaryEditorSyncTimeoutRef.current = null;
      }, 120);

      if (summaryEditorUploadInputRef.current) {
        summaryEditorUploadInputRef.current.value = "";
      }

      pushToast({
        title: "Figure uploaded and inserted",
        tone: "success"
      });
    } catch {
      pushToast({
        title: "Could not upload figure",
        tone: "error"
      });
    } finally {
      setIsSummaryMediaUploading(false);
    }
  };

  const handleWikiLinkQueryChange = ({
    query,
    suggestions
  }: {
    query: string;
    suggestions: string[];
  }) => {
    setWikiLinkSuggestionQuery(query);
    setWikiLinkSuggestions(suggestions);
  };

  const applyWikiLinkSuggestion = (targetTitle: string) => {
    const applied = summaryEditorCodeMirrorRef.current?.applyWikiLinkSuggestion(targetTitle);
    if (!applied) {
      return;
    }
    setWikiLinkSuggestionQuery("");
    setWikiLinkSuggestions([]);
  };

  const toggleBoard = (boardId: number) => {
    setExpandedBoardIds((current) => {
      const next = new Set(current);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border-default/70 p-3">
        <div className="flex flex-wrap gap-2" data-testid="curriculum-form-tabs">
          <button
            type="button"
            data-testid="curriculum-tab-board"
            onClick={() => setActiveFormTab("board")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "board"
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
            }`}
          >
            Add Board
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-class"
            onClick={() => setActiveFormTab("class")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "class"
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
            }`}
          >
            Add Class
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-subject"
            onClick={() => setActiveFormTab("subject")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "subject"
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
            }`}
          >
            Add Subject
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-chapter"
            onClick={() => setActiveFormTab("chapter")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "chapter"
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
            }`}
          >
            Chapter
          </button>
          <button
            type="button"
            data-testid="curriculum-tab-exercise"
            onClick={() => setActiveFormTab("exercise")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeFormTab === "exercise"
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
            }`}
          >
            Add Exercise
          </button>
        </div>

        {activeFormTab === "board" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" data-testid="curriculum-board-mode-tabs">
              <button
                type="button"
                data-testid="curriculum-board-mode-add"
                onClick={() => setActiveBoardModeTab("add")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeBoardModeTab === "add"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Add
              </button>
              <button
                type="button"
                data-testid="curriculum-board-mode-manage"
                onClick={() => setActiveBoardModeTab("manage")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeBoardModeTab === "manage"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Edit / Delete
              </button>
            </div>

            {activeBoardModeTab === "add" ? (
              <form className="space-y-2" data-testid="curriculum-board-form" onSubmit={submitBoard}>
                <p className="text-sm font-semibold text-text-primary">Add Board</p>
                <Input
                  data-testid="curriculum-board-name-input"
                  value={boardName}
                  onChange={(event) => setBoardName(event.target.value)}
                  placeholder="Board name (e.g. Punjab Board)"
                />
                <Button data-testid="curriculum-board-submit" type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
                  Add board
                </Button>
              </form>
            ) : (
              <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3" data-testid="curriculum-board-manage">
                <p className="text-sm font-semibold text-text-primary">Update / Delete Board</p>
                <Select
                  data-testid="curriculum-board-manage-select"
                  value={manageBoardId}
                  onChange={(event) => setManageBoardId(event.target.value)}
                >
                  <option value="">Select board</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </Select>
                <Input
                  data-testid="curriculum-board-manage-name-input"
                  value={manageBoardName}
                  onChange={(event) => setManageBoardName(event.target.value)}
                  placeholder="Board name"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="curriculum-board-manage-update"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={updateBoard}
                  >
                    Update board
                  </Button>
                  <Button
                    data-testid="curriculum-board-manage-delete"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={deleteBoard}
                  >
                    Delete board
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {activeFormTab === "class" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" data-testid="curriculum-class-mode-tabs">
              <button
                type="button"
                data-testid="curriculum-class-mode-add"
                onClick={() => setActiveClassModeTab("add")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeClassModeTab === "add"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Add
              </button>
              <button
                type="button"
                data-testid="curriculum-class-mode-manage"
                onClick={() => setActiveClassModeTab("manage")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeClassModeTab === "manage"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Edit / Delete
              </button>
            </div>

            {activeClassModeTab === "add" ? (
              <form className="space-y-2" data-testid="curriculum-class-form" onSubmit={submitClass}>
                <p className="text-sm font-semibold text-text-primary">Add Class</p>
                <Select
                  data-testid="curriculum-class-board-select"
                  value={classBoardId}
                  onChange={(event) => setClassBoardId(event.target.value)}
                >
                  <option value="">Select board</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </Select>
                <Input
                  data-testid="curriculum-class-name-input"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  placeholder="Class name (e.g. 9th)"
                />
                <Button
                  data-testid="curriculum-class-submit"
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  Add class
                </Button>
              </form>
            ) : (
              <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3" data-testid="curriculum-class-manage">
                <p className="text-sm font-semibold text-text-primary">Update / Delete Class</p>
                <Select
                  data-testid="curriculum-class-manage-select"
                  value={manageClassId}
                  onChange={(event) => setManageClassId(event.target.value)}
                >
                  <option value="">Select class</option>
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  data-testid="curriculum-class-manage-name-input"
                  value={manageClassName}
                  onChange={(event) => setManageClassName(event.target.value)}
                  placeholder="Class name"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="curriculum-class-manage-update"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={updateClass}
                  >
                    Update class
                  </Button>
                  <Button
                    data-testid="curriculum-class-manage-delete"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={deleteClass}
                  >
                    Delete class
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {activeFormTab === "subject" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" data-testid="curriculum-subject-mode-tabs">
              <button
                type="button"
                data-testid="curriculum-subject-mode-add"
                onClick={() => setActiveSubjectModeTab("add")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeSubjectModeTab === "add"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Add
              </button>
              <button
                type="button"
                data-testid="curriculum-subject-mode-manage"
                onClick={() => setActiveSubjectModeTab("manage")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeSubjectModeTab === "manage"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Manage
              </button>
            </div>

            {activeSubjectModeTab === "add" ? (
              <form className="space-y-2" data-testid="curriculum-subject-form" onSubmit={submitSubject}>
                <p className="text-sm font-semibold text-text-primary">Add Subject</p>
                <Select
                  data-testid="curriculum-subject-class-select"
                  value={subjectBoardClassId}
                  onChange={(event) => setSubjectBoardClassId(event.target.value)}
                >
                  <option value="">Select class</option>
                  {classOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  data-testid="curriculum-subject-name-input"
                  value={subjectName}
                  onChange={(event) => setSubjectName(event.target.value)}
                  placeholder="Subject name (e.g. Physics)"
                />
                <Input
                  data-testid="curriculum-subject-description-input"
                  value={subjectDescription}
                  onChange={(event) => setSubjectDescription(event.target.value)}
                  placeholder="Description (optional)"
                />
                <Button data-testid="curriculum-subject-submit" type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
                  Add subject
                </Button>
              </form>
            ) : (
              <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3" data-testid="curriculum-subject-manage">
                <p className="text-sm font-semibold text-text-primary">Delete Subject</p>
                <Select
                  data-testid="curriculum-subject-manage-select"
                  value={manageSubjectId}
                  onChange={(event) => setManageSubjectId(event.target.value)}
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="curriculum-subject-manage-delete"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isSubmitting}
                    onClick={deleteSubject}
                  >
                    Delete subject
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {activeFormTab === "chapter" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" data-testid="curriculum-chapter-mode-tabs">
              <button
                type="button"
                data-testid="curriculum-chapter-mode-add"
                onClick={() => setActiveChapterModeTab("add")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeChapterModeTab === "add"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Add New
              </button>
              <button
                type="button"
                data-testid="curriculum-chapter-mode-edit"
                onClick={() => setActiveChapterModeTab("edit")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeChapterModeTab === "edit"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Edit Chapter
              </button>
            </div>

            {activeChapterModeTab === "add" ? (
              <form className="space-y-2" data-testid="curriculum-chapter-form" onSubmit={submitChapter}>
                <p className="text-sm font-semibold text-text-primary">Add Chapter</p>
                <Select
                  data-testid="curriculum-chapter-subject-select"
                  value={chapterSubjectId}
                  onChange={(event) => setChapterSubjectId(event.target.value)}
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  data-testid="curriculum-chapter-number-input"
                  type="number"
                  min={1}
                  value={chapterNumber}
                  onChange={(event) => setChapterNumber(event.target.value)}
                  placeholder="Chapter number"
                />
                <Input
                  data-testid="curriculum-chapter-title-input"
                  value={chapterTitle}
                  onChange={(event) => setChapterTitle(event.target.value)}
                  placeholder="Chapter title"
                />
                <Textarea
                  data-testid="curriculum-chapter-summary-input"
                  value={chapterSummary}
                  onChange={(event) => setChapterSummary(event.target.value)}
                  className="min-h-48 resize-y"
                  placeholder="Write chapter summary in Markdown. Example: ![Diagram](https://...) and $$E=mc^2$$"
                />
                <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/60 p-3">
                  <p className="text-sm font-semibold text-text-primary">Summary import</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-testid="curriculum-chapter-markdown-option"
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => chapterMarkdownInputRef.current?.click()}
                      disabled={isSubmitting}
                    >
                      Upload .md file
                    </Button>
                  </div>
                  <Input
                    ref={chapterMarkdownInputRef}
                    data-testid="curriculum-chapter-markdown-input"
                    type="file"
                    accept=".md,text/markdown,text/plain"
                    onChange={importChapterMarkdown}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-text-secondary">
                    Uploading a Markdown file loads it into the chapter summary field for review before you add the chapter.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-text-secondary">Supports Markdown, images, and math notation.</p>
                  <Button
                    data-testid="curriculum-chapter-summary-preview-toggle"
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsChapterSummaryPreviewVisible((current) => !current)}
                  >
                    {isChapterSummaryPreviewVisible ? "Hide preview" : "Show preview"}
                  </Button>
                </div>
                {isChapterSummaryPreviewVisible ? (
                  <div
                    className="rounded-lg border border-border-default/60 bg-bg-base/50 p-3"
                    data-testid="curriculum-chapter-summary-preview"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Summary preview</p>
                    {chapterSummary.trim().length > 0 ? (
                      <MarkdownRenderer content={chapterSummary} className="prose-sm" />
                    ) : (
                      <p className="text-sm text-text-secondary">Preview appears here as rendered Markdown.</p>
                    )}
                  </div>
                ) : null}
                <Button
                  data-testid="curriculum-chapter-submit"
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  Add chapter
                </Button>
              </form>
            ) : (
              <div className="space-y-3 rounded-lg border border-border-default/60 bg-bg-base/50 p-3">
                <p className="text-sm font-semibold text-text-primary">Edit Existing Chapter Summary</p>
                <Select
                  data-testid="curriculum-summary-editor-chapter-select"
                  value={summaryEditorChapterId}
                  onChange={(event) => setSummaryEditorChapterId(event.target.value)}
                >
                  <option value="">Select chapter</option>
                  {chapterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/60 p-3" data-testid="curriculum-chapter-manage">
                  <p className="text-sm font-semibold text-text-primary">Update / Delete Chapter</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input
                      data-testid="curriculum-chapter-manage-number-input"
                      type="number"
                      min={1}
                      value={manageChapterNumber}
                      onChange={(event) => setManageChapterNumber(event.target.value)}
                      placeholder="Chapter number"
                      disabled={!summaryEditorChapterId}
                    />
                    <Input
                      data-testid="curriculum-chapter-manage-title-input"
                      value={manageChapterTitle}
                      onChange={(event) => setManageChapterTitle(event.target.value)}
                      placeholder="Chapter title"
                      disabled={!summaryEditorChapterId}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-testid="curriculum-chapter-manage-update"
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!summaryEditorChapterId || isSubmitting}
                      onClick={updateChapterMeta}
                    >
                      Update chapter
                    </Button>
                    <Button
                      data-testid="curriculum-chapter-manage-delete"
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!summaryEditorChapterId || isSubmitting}
                      onClick={deleteChapter}
                    >
                      Delete chapter
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/60 p-3">
                  <p className="text-sm font-semibold text-text-primary">Summary input options</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-testid="curriculum-summary-editor-paste-option"
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => summaryEditorCodeMirrorRef.current?.focus()}
                      disabled={!summaryEditorChapterId || isSummaryLoading}
                    >
                      Paste markdown
                    </Button>
                    <Button
                      data-testid="curriculum-summary-editor-markdown-option"
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => summaryEditorMarkdownInputRef.current?.click()}
                      disabled={!summaryEditorChapterId || isSummaryLoading || isSummarySaving}
                    >
                      Upload .md file
                    </Button>
                  </div>
                  <Input
                    ref={summaryEditorMarkdownInputRef}
                    data-testid="curriculum-summary-editor-markdown-input"
                    type="file"
                    accept=".md,text/markdown,text/plain"
                    onChange={importSummaryMarkdown}
                    disabled={!summaryEditorChapterId || isSummaryLoading || isSummarySaving}
                  />
                  <p className="text-xs text-text-secondary">
                    Uploading a Markdown file loads it into the editor for review. Use Save summary to persist it.
                  </p>
                </div>

                <CodeMirrorMarkdownEditor
                  ref={summaryEditorCodeMirrorRef}
                  value={summaryEditorContent}
                  onChange={handleSummaryEditorContentChange}
                  placeholderText="Summary markdown for the selected chapter."
                  disabled={!summaryEditorChapterId || isSummaryLoading || isSummaryMediaUploading}
                  testId="curriculum-summary-editor-cm6"
                  wikiLinkTargets={wikiLinkTargets}
                  onWikiLinkQueryChange={handleWikiLinkQueryChange}
                />

                {wikiLinkSuggestions.length > 0 && summaryEditorChapterId ? (
                  <div
                    data-testid="curriculum-summary-editor-link-suggestions"
                    className="space-y-1 rounded-lg border border-border-default/60 bg-bg-base p-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">
                      Wiki link suggestions for [[{wikiLinkSuggestionQuery || "..."}]]
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {wikiLinkSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-md border border-border-default/70 bg-bg-base px-2 py-1 text-xs text-text-primary transition hover:border-[var(--primary)]/60"
                          onClick={() => applyWikiLinkSuggestion(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    data-testid="curriculum-summary-editor-alt-input"
                    value={summaryEditorImageAlt}
                    onChange={(event) => setSummaryEditorImageAlt(event.target.value)}
                    placeholder="Image alt text"
                    disabled={!summaryEditorChapterId}
                  />
                  <Input
                    ref={summaryEditorUploadInputRef}
                    data-testid="curriculum-summary-editor-upload-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={!summaryEditorChapterId || isSummaryMediaUploading}
                  />
                  <Input
                    data-testid="curriculum-summary-editor-width-input"
                    type="number"
                    min={1}
                    value={summaryEditorImageWidth}
                    onChange={(event) => setSummaryEditorImageWidth(event.target.value)}
                    placeholder="Width (px)"
                    disabled={!summaryEditorChapterId}
                  />
                  <Input
                    data-testid="curriculum-summary-editor-height-input"
                    type="number"
                    min={1}
                    value={summaryEditorImageHeight}
                    onChange={(event) => setSummaryEditorImageHeight(event.target.value)}
                    placeholder="Height (px, optional)"
                    disabled={!summaryEditorChapterId}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="curriculum-summary-editor-upload-button"
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={uploadSummaryFigure}
                    disabled={!summaryEditorChapterId || isSummaryMediaUploading}
                  >
                    {isSummaryMediaUploading ? "Uploading..." : "Upload figure"}
                  </Button>
                  <Button
                    data-testid="curriculum-summary-editor-save-button"
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={saveSummaryEditor}
                    disabled={!summaryEditorChapterId || isSummarySaving || isSummaryLoading}
                  >
                    {isSummarySaving ? "Saving..." : "Save summary"}
                  </Button>
                  <Button
                    data-testid="curriculum-summary-editor-preview-toggle"
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsSummaryEditorPreviewVisible((current) => !current)}
                  >
                    {isSummaryEditorPreviewVisible ? "Hide preview" : "Show preview"}
                  </Button>
                </div>

                <p className="text-xs text-text-secondary">
                  Uploaded image markdown is inserted at cursor position. Width/height are emitted as image title metadata
                  (`&quot;width=640 height=320&quot;`).
                </p>

                <div
                  className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base p-3"
                  data-testid="curriculum-summary-editor-links-panel"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Links</p>
                    <Button type="button" size="sm" variant="secondary" onClick={refreshSummaryLinks} disabled={isSummaryLinksLoading}>
                      {isSummaryLinksLoading ? "Refreshing..." : "Refresh links"}
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-text-primary">Outgoing</p>
                    {summaryEditorOutgoingLinks.length === 0 ? (
                      <p className="text-text-secondary">No wiki links found in this summary.</p>
                    ) : (
                      <ul className="space-y-1 text-text-primary/90">
                        {resolvedOutgoingLinks.map((link) => (
                          <li key={`${link.sourceChapterId}-${link.normalizedTarget}`}>- {link.targetChapterTitle ?? link.targetTitle}</li>
                        ))}
                        {unresolvedOutgoingLinks.map((link) => (
                          <li key={`${link.sourceChapterId}-${link.normalizedTarget}`} className="text-amber-700">
                            - {link.targetTitle} (unresolved)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-text-primary">Backlinks</p>
                    {summaryEditorBacklinks.length === 0 ? (
                      <p className="text-text-secondary">No other summaries currently link to this chapter.</p>
                    ) : (
                      <ul className="space-y-1 text-text-primary/90">
                        {summaryEditorBacklinks.map((link) => (
                          <li key={`${link.sourceChapterId}-${link.normalizedTarget}`}>- {link.sourceChapterTitle}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border-default/60 bg-bg-base p-3" data-testid="curriculum-summary-graph-panel">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Summary Graph</p>
                    <Button type="button" size="sm" variant="secondary" onClick={loadSummaryGraph} disabled={isSummaryGraphLoading}>
                      {isSummaryGraphLoading ? "Refreshing..." : "Refresh graph"}
                    </Button>
                  </div>
                  <Input
                    data-testid="curriculum-summary-graph-search"
                    value={summaryGraphSearch}
                    onChange={(event) => setSummaryGraphSearch(event.target.value)}
                    placeholder="Filter graph by chapter title"
                  />
                  {filteredGraphNodes.length > 0 ? (
                    <ChapterLinkGraph
                      nodes={filteredGraphNodes}
                      edges={filteredGraphEdges}
                      activeChapterId={summaryEditorChapterId ? Number(summaryEditorChapterId) : null}
                      onOpenChapter={(chapterId) => {
                        setSummaryEditorChapterId(String(chapterId));
                      }}
                    />
                  ) : (
                    <p className="text-sm text-text-secondary">No graph nodes match the current filter.</p>
                  )}
                  <div className="max-h-32 overflow-auto rounded-md border border-border-default/50 bg-bg-base/60 p-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Open chapter</p>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredGraphNodes.slice(0, 20).map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          data-testid={`curriculum-summary-graph-node-button-${node.id}`}
                          className="rounded-md border border-border-default/70 px-2 py-1 text-xs text-text-primary transition hover:border-[var(--primary)]/60"
                          onClick={() => setSummaryEditorChapterId(String(node.id))}
                        >
                          {node.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {isSummaryEditorPreviewVisible ? (
                  <div
                    className="rounded-lg border border-border-default/60 bg-bg-base p-3"
                    data-testid="curriculum-summary-editor-preview"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary">Editor preview</p>
                    {summaryEditorContent.trim().length > 0 ? (
                      <MarkdownRenderer content={summaryEditorContent} className="prose-sm" />
                    ) : (
                      <p className="text-sm text-text-secondary">Select a chapter to load and preview summary markdown.</p>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {activeFormTab === "exercise" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" data-testid="curriculum-exercise-mode-tabs">
              <button
                type="button"
                data-testid="curriculum-exercise-mode-add"
                onClick={() => setActiveExerciseModeTab("add")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeExerciseModeTab === "add"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Add
              </button>
              <button
                type="button"
                data-testid="curriculum-exercise-mode-manage"
                onClick={() => setActiveExerciseModeTab("manage")}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  activeExerciseModeTab === "manage"
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
                }`}
              >
                Edit / Delete
              </button>
            </div>

            {activeExerciseModeTab === "add" ? (
              <form className="space-y-2" data-testid="curriculum-exercise-form" onSubmit={submitExercise}>
                <p className="text-sm font-semibold text-text-primary">Add Exercise</p>
                <Select
                  data-testid="curriculum-exercise-chapter-select"
                  value={exerciseChapterId}
                  onChange={(event) => setExerciseChapterId(event.target.value)}
                >
                  <option value="">Select chapter</option>
                  {chapterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  data-testid="curriculum-exercise-type-select"
                  value={exerciseType}
                  onChange={(event) => setExerciseType(event.target.value as ExerciseType)}
                >
                  {exerciseTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  data-testid="curriculum-exercise-difficulty-select"
                  value={exerciseDifficulty}
                  onChange={(event) => setExerciseDifficulty(event.target.value as "easy" | "medium" | "hard")}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
                <Input
                  data-testid="curriculum-exercise-number-input"
                  value={exerciseNumber}
                  onChange={(event) => setExerciseNumber(event.target.value)}
                  placeholder="Exercise number (e.g. Q1)"
                />
                <Textarea
                  data-testid="curriculum-exercise-question-input"
                  value={exerciseQuestion}
                  onChange={(event) => setExerciseQuestion(event.target.value)}
                  className="min-h-28 resize-y"
                  placeholder="Exercise question"
                />
                <Textarea
                  data-testid="curriculum-exercise-solution-input"
                  value={exerciseSolution}
                  onChange={(event) => setExerciseSolution(event.target.value)}
                  className="min-h-32 resize-y"
                  placeholder="Step-by-step solution (Markdown and math supported)"
                />
                <p className="text-xs text-text-secondary">Numerical problems are available for Physics chapters.</p>
                <Button
                  data-testid="curriculum-exercise-submit"
                  type="submit"
                  size="sm"
                  variant="secondary"
                  disabled={isSubmitting}
                >
                  Add exercise
                </Button>
              </form>
            ) : (
              <div className="space-y-2 rounded-lg border border-border-default/60 bg-bg-base/50 p-3" data-testid="curriculum-exercise-manage">
                <p className="text-sm font-semibold text-text-primary">Read / Update / Delete Exercises</p>
                <p className="text-xs text-text-secondary">
                  {isExerciseListLoading
                    ? "Loading exercises..."
                    : `Loaded ${chapterExercises.length} exercise${chapterExercises.length === 1 ? "" : "s"} for selected chapter.`}
                </p>
                <Select
                  data-testid="curriculum-exercise-manage-select"
                  value={manageExerciseId}
                  onChange={(event) => setManageExerciseId(event.target.value)}
                  disabled={!exerciseChapterId || isExerciseListLoading}
                >
                  <option value="">Select exercise</option>
                  {chapterExercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.exerciseNumber}
                    </option>
                  ))}
                </Select>
                <Select
                  data-testid="curriculum-exercise-manage-type-select"
                  value={manageExerciseType}
                  onChange={(event) => setManageExerciseType(event.target.value as ExerciseType)}
                  disabled={!manageExerciseId}
                >
                  {exerciseTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Select
                  data-testid="curriculum-exercise-manage-difficulty-select"
                  value={manageExerciseDifficulty}
                  onChange={(event) => setManageExerciseDifficulty(event.target.value as "easy" | "medium" | "hard")}
                  disabled={!manageExerciseId}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
                <Input
                  data-testid="curriculum-exercise-manage-number-input"
                  value={manageExerciseNumber}
                  onChange={(event) => setManageExerciseNumber(event.target.value)}
                  placeholder="Exercise number"
                  disabled={!manageExerciseId}
                />
                <Textarea
                  data-testid="curriculum-exercise-manage-question-input"
                  value={manageExerciseQuestion}
                  onChange={(event) => setManageExerciseQuestion(event.target.value)}
                  className="min-h-24 resize-y"
                  placeholder="Exercise question"
                  disabled={!manageExerciseId}
                />
                <Textarea
                  data-testid="curriculum-exercise-manage-solution-input"
                  value={manageExerciseSolution}
                  onChange={(event) => setManageExerciseSolution(event.target.value)}
                  className="min-h-24 resize-y"
                  placeholder="Exercise solution"
                  disabled={!manageExerciseId}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    data-testid="curriculum-exercise-manage-update"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!manageExerciseId || isSubmitting}
                    onClick={updateExercise}
                  >
                    Update exercise
                  </Button>
                  <Button
                    data-testid="curriculum-exercise-manage-delete"
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!manageExerciseId || isSubmitting}
                    onClick={deleteExercise}
                  >
                    Delete exercise
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border-default/70 p-3" data-testid="curriculum-tree">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Curriculum Tree</p>
          <Button type="button" size="sm" variant="secondary" onClick={refreshTree} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <div className="space-y-2 text-sm">
          {boards.length === 0 ? <p className="text-text-secondary">No boards yet.</p> : null}
          {boards.map((board) => (
            <div key={board.id} className="rounded-md border border-border-default/60 p-2">
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                aria-label={`Toggle ${board.name}`}
                onClick={() => toggleBoard(board.id)}
              >
                <span className="text-text-secondary">{expandedBoardIds.has(board.id) ? "-" : "+"}</span>
                <span className="font-semibold text-text-primary">{board.name}</span>
              </button>

              {expandedBoardIds.has(board.id) ? (
                <div className="mt-2 space-y-2 pl-6">
                  {board.classes.length === 0 ? <p className="text-text-secondary">No classes</p> : null}
                  {board.classes.map((boardClass) => (
                    <div key={boardClass.id} className="space-y-1">
                      <p className="font-medium text-text-primary/90">- {boardClass.name}</p>
                      {boardClass.subjects.length === 0 ? (
                        <p className="pl-4 text-text-secondary">No subjects</p>
                      ) : (
                        <ul className="space-y-1 pl-4 text-text-primary/80">
                          {boardClass.subjects.map((subject) => (
                            <li key={subject.id}>
                              - {subject.name} ({subject.chapters.length} chapter{subject.chapters.length === 1 ? "" : "s"})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
