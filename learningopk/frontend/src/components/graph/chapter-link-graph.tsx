"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

import { getResolvedTheme, type AppTheme } from "@/lib/theme";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type ChapterGraphNode = {
  id: number;
  title: string;
  isPublished: boolean;
};

type ChapterGraphEdge = {
  sourceChapterId: number;
  targetChapterId: number | null;
  isResolved: boolean;
};

type ChapterLinkGraphProps = {
  nodes: ChapterGraphNode[];
  edges: ChapterGraphEdge[];
  activeChapterId: number | null;
  onOpenChapter: (chapterId: number) => void;
  testId?: string;
};

type RenderableGraphNode = {
  id: number;
  label: string;
  color: string;
};

type RenderableGraphLink = {
  source: number;
  target: number;
};

type GraphThemeStyle = {
  background: string;
  labelColor: string;
  linkColor: string;
  linkWidth: number;
  publishedNode: string;
  unpublishedNode: string;
  activeNode: string;
};

const GRAPH_THEME_STYLE: Record<AppTheme, GraphThemeStyle> = {
  light: {
    background: "rgb(243, 244, 246)",
    labelColor: "rgb(31, 41, 55)",
    linkColor: "rgb(77, 124, 15)",
    linkWidth: 2.2,
    publishedNode: "rgb(30, 41, 59)",
    unpublishedNode: "rgb(120, 53, 15)",
    activeNode: "rgb(8, 145, 178)"
  },
  dark: {
    background: "rgb(17, 24, 39)",
    labelColor: "rgb(226, 232, 240)",
    linkColor: "rgb(132, 204, 22)",
    linkWidth: 2.2,
    publishedNode: "rgb(226, 232, 240)",
    unpublishedNode: "rgb(253, 230, 138)",
    activeNode: "rgb(125, 211, 252)"
  }
};

export function ChapterLinkGraph({ nodes, edges, activeChapterId, onOpenChapter, testId }: ChapterLinkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 720, height: 360 });
  const [theme, setTheme] = useState<AppTheme>(() => getResolvedTheme());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const width = Math.max(360, Math.floor(container.clientWidth));
      setSize({
        width,
        height: Math.max(280, Math.floor(width * 0.52))
      });
    };
    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const syncTheme = () => {
      setTheme(root.classList.contains("dark") ? "dark" : "light");
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"]
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const graphThemeStyle = GRAPH_THEME_STYLE[theme];

  const graphData = useMemo(
    () => ({
      nodes: nodes.map<RenderableGraphNode>((node) => ({
        id: node.id,
        label: node.title,
        color:
          activeChapterId === node.id
            ? graphThemeStyle.activeNode
            : node.isPublished
              ? graphThemeStyle.publishedNode
              : graphThemeStyle.unpublishedNode
      })),
      links: edges
        .filter((edge): edge is ChapterGraphEdge & { targetChapterId: number } => edge.targetChapterId !== null)
        .map<RenderableGraphLink>((edge) => ({
          source: edge.sourceChapterId,
          target: edge.targetChapterId
        }))
    }),
    [activeChapterId, edges, graphThemeStyle, nodes]
  );

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      data-graph-theme={theme}
      data-graph-background={graphThemeStyle.background}
      data-graph-link-color={graphThemeStyle.linkColor}
      data-graph-link-width={String(graphThemeStyle.linkWidth)}
      className="w-full overflow-hidden rounded-lg border border-border/60 bg-background p-1"
      style={{ backgroundColor: graphThemeStyle.background }}
    >
      <ForceGraph2D
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor={graphThemeStyle.background}
        nodeRelSize={4}
        linkColor={() => graphThemeStyle.linkColor}
        linkWidth={graphThemeStyle.linkWidth}
        cooldownTicks={80}
        onNodeClick={(node) => {
          const id = Number((node as { id: number }).id);
          if (Number.isFinite(id)) {
            onOpenChapter(id);
          }
        }}
        nodeCanvasObject={(node, context, globalScale) => {
          const renderableNode = node as RenderableGraphNode;
          const label = renderableNode.label;
          const fontSize = 12 / globalScale;
          context.fillStyle = renderableNode.color;
          context.beginPath();
          context.arc(node.x ?? 0, node.y ?? 0, 4.5, 0, 2 * Math.PI, false);
          context.fill();

          context.font = `${fontSize}px sans-serif`;
          context.fillStyle = graphThemeStyle.labelColor;
          context.fillText(label, (node.x ?? 0) + 7, (node.y ?? 0) + 3);
        }}
      />
    </div>
  );
}
