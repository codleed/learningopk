"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ChapterLinkGraph } from "@/components/graph/chapter-link-graph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingSkeleton } from "@/components/ui/states";
import { getSubjectGraph, type SubjectResponse } from "@/lib/learn-api";

import { ChapterCard } from "./chapter-card";

type SubjectViewSwitcherProps = {
  boardSlug: string;
  classSlug: string;
  subjectSlug: string;
  chapters: SubjectResponse["chapters"];
  showGraph: boolean;
};

type GraphLoadState = "idle" | "loading" | "ready" | "error";

export function SubjectViewSwitcher({
  boardSlug,
  classSlug,
  subjectSlug,
  chapters,
  showGraph,
}: SubjectViewSwitcherProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<"list" | "graph">("list");
  const [graphState, setGraphState] = useState<GraphLoadState>("idle");
  const [graphNodes, setGraphNodes] = useState<
    Array<{
      id: number;
      chapterNumber: number;
      title: string;
      slug: string;
      isPublished: boolean;
      visited?: boolean;
      completed?: boolean;
    }>
  >([]);
  const [graphEdges, setGraphEdges] = useState<
    Array<{
      sourceChapterId: number;
      targetChapterId: number | null;
      isResolved: boolean;
    }>
  >([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim().toLowerCase());
    }, 150);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!showGraph || activeView !== "graph" || graphState !== "loading") {
      return;
    }

    let cancelled = false;
    void getSubjectGraph({
      board: boardSlug,
      grade: classSlug,
      subject: subjectSlug,
    })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        if (!payload) {
          setGraphState("error");
          setGraphNodes([]);
          setGraphEdges([]);
          return;
        }
        setGraphNodes(payload.graph.nodes);
        setGraphEdges(payload.graph.edges);
        setGraphState("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setGraphState("error");
          setGraphNodes([]);
          setGraphEdges([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, boardSlug, classSlug, graphState, showGraph, subjectSlug]);

  const chapterById = useMemo(
    () => new Map(graphNodes.map((chapter) => [chapter.id, chapter])),
    [graphNodes]
  );

  const filteredGraphNodes = useMemo(() => {
    if (searchTerm.length === 0) {
      return graphNodes;
    }
    return graphNodes.filter((node) => node.title.toLowerCase().includes(searchTerm));
  }, [graphNodes, searchTerm]);

  const filteredGraphEdges = useMemo(() => {
    if (searchTerm.length === 0) {
      return graphEdges;
    }
    const allowedNodeIds = new Set(filteredGraphNodes.map((node) => node.id));
    return graphEdges.filter((edge) => {
      if (edge.targetChapterId === null) {
        return allowedNodeIds.has(edge.sourceChapterId);
      }
      return allowedNodeIds.has(edge.sourceChapterId) || allowedNodeIds.has(edge.targetChapterId);
    });
  }, [filteredGraphNodes, graphEdges, searchTerm]);

  const handleViewChange = useCallback(
    (nextView: "list" | "graph") => {
      setActiveView(nextView);

      if (nextView === "graph" && graphState === "idle") {
        setGraphState("loading");
      }
    },
    [graphState]
  );

  const openChapter = useCallback(
    (chapterId: number) => {
      const chapter = chapterById.get(chapterId);
      if (!chapter) {
        return;
      }
      router.push(`/${boardSlug}/${classSlug}/${subjectSlug}/${chapter.slug}`);
    },
    [boardSlug, chapterById, classSlug, router, subjectSlug]
  );

  if (!showGraph) {
    if (chapters.length === 0) {
      return (
        <EmptyState
          title="No chapters published yet"
          description="This subject is configured but has no published chapters available."
        />
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            href={`/${boardSlug}/${classSlug}/${subjectSlug}/${chapter.slug}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeView === "list" ? "primary" : "secondary"}
          data-testid="subject-view-tab-list"
          onClick={() => handleViewChange("list")}
        >
          Chapter list
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeView === "graph" ? "primary" : "secondary"}
          data-testid="subject-view-tab-graph"
          onClick={() => handleViewChange("graph")}
        >
          Graph
        </Button>
      </div>

      {activeView === "list" ? (
        chapters.length === 0 ? (
          <EmptyState
            title="No chapters published yet"
            description="This subject is configured but has no published chapters available."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {chapters.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                href={`/${boardSlug}/${classSlug}/${subjectSlug}/${chapter.slug}`}
              />
            ))}
          </div>
        )
      ) : (
        <div
          className="space-y-3 rounded-lg border border-border/60 bg-background/40 p-3"
          data-testid="subject-chapter-graph-panel"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Chapter Graph</p>
            <p className="text-xs text-muted-foreground">
              Pan, zoom, or click any node to open that chapter.
            </p>
          </div>
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search chapters by title"
            data-testid="subject-graph-search"
          />

          {graphState === "loading" ? (
            <LoadingSkeleton title="Loading chapter graph" rows={2} variant="list" />
          ) : null}
          {graphState === "error" ? (
            <p className="text-sm text-rose-700">
              Could not load chapter graph right now. Try again in a moment.
            </p>
          ) : null}
          {graphState === "ready" && filteredGraphNodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No chapter nodes match your current search.
            </p>
          ) : null}

          {graphState === "ready" && filteredGraphNodes.length > 0 ? (
            <ChapterLinkGraph
              nodes={filteredGraphNodes}
              edges={filteredGraphEdges}
              activeChapterId={null}
              onOpenChapter={openChapter}
              testId="subject-graph-canvas"
            />
          ) : null}

          {graphState === "ready" && filteredGraphNodes.length > 0 ? (
            <div
              className="rounded-md border border-border/50 bg-background/70 p-2"
              data-testid="subject-graph-node-list"
            >
              <div className="flex flex-wrap gap-2">
                {filteredGraphNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => openChapter(node.id)}
                    data-testid={`subject-graph-node-link-${node.slug}`}
                    className="rounded-md border border-border/70 px-2 py-1 text-xs text-foreground transition hover:border-[var(--primary)]/60"
                  >
                    {node.title}
                    {node.completed ? " - Completed" : node.visited ? " - Visited" : ""}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
