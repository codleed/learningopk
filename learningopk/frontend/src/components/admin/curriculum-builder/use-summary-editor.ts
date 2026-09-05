"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import {
  deleteAdminCurriculumChapter,
  getAdminChapterGraph,
  getAdminChapterLinks,
  getAdminChapterSummary,
  updateAdminChapterSummary,
  updateAdminCurriculumChapter,
  uploadAdminChapterSummaryMedia,
  type AdminChapterGraphResponse,
  type AdminChapterLinksResponse,
} from "@/lib/admin-api";

import { useToast } from "../../ui/toast";
import { type CodeMirrorMarkdownEditorHandle } from "../codemirror-markdown-editor";
import type { ChapterOption } from "./types";
import { buildSizedImageMarkdown, insertAtSelection, toSlug } from "./utils";

type SummaryEditorLinks = AdminChapterLinksResponse["links"];
type SummaryGraphNodes = AdminChapterGraphResponse["graph"]["nodes"];
type SummaryGraphEdges = AdminChapterGraphResponse["graph"]["edges"];

type UseSummaryEditorParams = {
  chapterOptions: ChapterOption[];
  setIsSubmitting: (isSubmitting: boolean) => void;
  refreshTree: () => Promise<void>;
};

export function useSummaryEditor({
  chapterOptions,
  setIsSubmitting,
  refreshTree,
}: UseSummaryEditorParams) {
  const { pushToast } = useToast();
  const [summaryEditorChapterId, setSummaryEditorChapterId] = useState("");
  const [summaryEditorContent, setSummaryEditorContent] = useState("");
  const [summaryEditorImageAlt, setSummaryEditorImageAlt] = useState("Figure");
  const [summaryEditorImageWidth, setSummaryEditorImageWidth] = useState("640");
  const [summaryEditorImageHeight, setSummaryEditorImageHeight] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummarySaving, setIsSummarySaving] = useState(false);
  const [isSummaryMediaUploading, setIsSummaryMediaUploading] = useState(false);
  const [isSummaryLinksLoading, setIsSummaryLinksLoading] = useState(false);
  const [summaryEditorOutgoingLinks, setSummaryEditorOutgoingLinks] = useState<
    SummaryEditorLinks["outgoing"]
  >([]);
  const [summaryEditorBacklinks, setSummaryEditorBacklinks] = useState<
    SummaryEditorLinks["backlinks"]
  >([]);
  const [isSummaryGraphLoading, setIsSummaryGraphLoading] = useState(false);
  const [summaryGraphNodes, setSummaryGraphNodes] = useState<SummaryGraphNodes>([]);
  const [summaryGraphEdges, setSummaryGraphEdges] = useState<SummaryGraphEdges>([]);
  const [summaryGraphSearch, setSummaryGraphSearch] = useState("");
  const [wikiLinkSuggestionQuery, setWikiLinkSuggestionQuery] = useState("");
  const [wikiLinkSuggestions, setWikiLinkSuggestions] = useState<string[]>([]);
  const [manageChapterNumber, setManageChapterNumber] = useState("1");
  const [manageChapterTitle, setManageChapterTitle] = useState("");

  const summaryEditorCodeMirrorRef = useRef<CodeMirrorMarkdownEditorHandle | null>(null);
  const summaryEditorLiveContentRef = useRef("");
  const summaryEditorSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryEditorPersistedContentRef = useRef("");
  const summaryEditorMarkdownInputRef = useRef<HTMLInputElement | null>(null);
  const summaryEditorUploadInputRef = useRef<HTMLInputElement | null>(null);

  const setSummaryEditorContentImmediate = useCallback((nextContent: string) => {
    if (summaryEditorSyncTimeoutRef.current) {
      clearTimeout(summaryEditorSyncTimeoutRef.current);
      summaryEditorSyncTimeoutRef.current = null;
    }
    summaryEditorLiveContentRef.current = nextContent;
    setSummaryEditorContent(nextContent);
  }, []);

  const handleSummaryEditorContentChange = useCallback((nextContent: string) => {
    summaryEditorLiveContentRef.current = nextContent;
    if (summaryEditorSyncTimeoutRef.current) {
      clearTimeout(summaryEditorSyncTimeoutRef.current);
    }
    summaryEditorSyncTimeoutRef.current = setTimeout(() => {
      setSummaryEditorContent(summaryEditorLiveContentRef.current);
      summaryEditorSyncTimeoutRef.current = null;
    }, 120);
  }, []);

  useEffect(() => {
    return () => {
      if (summaryEditorSyncTimeoutRef.current) {
        clearTimeout(summaryEditorSyncTimeoutRef.current);
      }
    };
  }, []);

  const loadSummaryLinks = useCallback(
    async (chapterId: number) => {
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
          tone: "error",
        });
      } finally {
        setIsSummaryLinksLoading(false);
      }
    },
    [pushToast]
  );

  const loadSummaryGraph = useCallback(async () => {
    setIsSummaryGraphLoading(true);
    try {
      const payload = await getAdminChapterGraph({
        query: "",
      });
      setSummaryGraphNodes(payload.graph.nodes);
      setSummaryGraphEdges(payload.graph.edges);
    } catch {
      setSummaryGraphNodes([]);
      setSummaryGraphEdges([]);
      pushToast({
        title: "Could not load summary graph",
        tone: "error",
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
            tone: "error",
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
  }, [summaryEditorChapterId, pushToast, setSummaryEditorContentImmediate]);

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
  }, [chapterOptions, summaryEditorChapterId, setSummaryEditorContentImmediate]);

  useEffect(() => {
    if (!summaryEditorChapterId) {
      setWikiLinkSuggestionQuery("");
      setWikiLinkSuggestions([]);
    }
  }, [summaryEditorChapterId]);

  useEffect(() => {
    const selectedChapter = chapterOptions.find(
      (option) => option.id === Number(summaryEditorChapterId)
    );
    setManageChapterTitle(selectedChapter?.title ?? "");
    setManageChapterNumber(selectedChapter ? String(selectedChapter.chapterNumber) : "1");
  }, [chapterOptions, summaryEditorChapterId]);

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

  const refreshSummaryLinks = async () => {
    const chapterId = Number(summaryEditorChapterId);
    if (!chapterId) {
      return;
    }
    await loadSummaryLinks(chapterId);
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
        slug: toSlug(title),
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

  const saveSummaryEditor = async () => {
    const chapterId = Number(summaryEditorChapterId);
    const summary = summaryEditorLiveContentRef.current.trim();
    if (!chapterId || !summary) {
      pushToast({
        title: "Select a chapter and write summary first",
        tone: "error",
      });
      return;
    }

    setIsSummarySaving(true);
    try {
      await updateAdminChapterSummary({
        chapterId,
        summary,
      });
      summaryEditorPersistedContentRef.current = summary;
      await refreshSummaryLinks();
      await loadSummaryGraph();
      pushToast({
        title: "Chapter summary updated",
        tone: "success",
      });
    } catch {
      pushToast({
        title: "Could not save chapter summary",
        tone: "error",
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
          tone: "error",
        });
        return;
      }

      const hasUnsavedChanges =
        summaryEditorLiveContentRef.current !== summaryEditorPersistedContentRef.current;
      if (
        hasUnsavedChanges &&
        !window.confirm("Importing a Markdown file will replace unsaved summary edits. Continue?")
      ) {
        return;
      }

      setSummaryEditorContentImmediate(importedMarkdown);
      summaryEditorCodeMirrorRef.current?.focus();
      pushToast({
        title: "Markdown imported into editor",
        tone: "success",
      });
    } catch {
      pushToast({
        title: "Could not read Markdown file",
        tone: "error",
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
        tone: "error",
      });
      return;
    }

    const file = summaryEditorUploadInputRef.current?.files?.[0];
    if (!file) {
      pushToast({
        title: "Choose an image file first",
        tone: "error",
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
        file,
      });
      const imageMarkdown = buildSizedImageMarkdown({
        imageUrl: payload.asset.objectUrl,
        altText: summaryEditorImageAlt,
        width: summaryEditorImageWidth,
        height: summaryEditorImageHeight,
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
          end: selectionEnd,
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
        tone: "success",
      });
    } catch {
      pushToast({
        title: "Could not upload figure",
        tone: "error",
      });
    } finally {
      setIsSummaryMediaUploading(false);
    }
  };

  const handleWikiLinkQueryChange = ({
    query,
    suggestions,
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

  return {
    summaryEditorChapterId,
    setSummaryEditorChapterId,
    summaryEditorContent,
    summaryEditorImageAlt,
    setSummaryEditorImageAlt,
    summaryEditorImageWidth,
    setSummaryEditorImageWidth,
    summaryEditorImageHeight,
    setSummaryEditorImageHeight,
    isSummaryLoading,
    isSummarySaving,
    isSummaryMediaUploading,
    isSummaryLinksLoading,
    summaryEditorOutgoingLinks,
    summaryEditorBacklinks,
    isSummaryGraphLoading,
    filteredGraphNodes,
    filteredGraphEdges,
    summaryGraphSearch,
    setSummaryGraphSearch,
    wikiLinkSuggestionQuery,
    wikiLinkSuggestions,
    manageChapterNumber,
    setManageChapterNumber,
    manageChapterTitle,
    setManageChapterTitle,
    resolvedOutgoingLinks,
    unresolvedOutgoingLinks,
    summaryEditorCodeMirrorRef,
    summaryEditorMarkdownInputRef,
    summaryEditorUploadInputRef,
    handleSummaryEditorContentChange,
    loadSummaryGraph,
    refreshSummaryLinks,
    updateChapterMeta,
    deleteChapter,
    saveSummaryEditor,
    importSummaryMarkdown,
    uploadSummaryFigure,
    handleWikiLinkQueryChange,
    applyWikiLinkSuggestion,
  };
}

export type SummaryEditorController = ReturnType<typeof useSummaryEditor>;
