"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

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

export function ChapterLinkGraph({ nodes, edges, activeChapterId, onOpenChapter, testId }: ChapterLinkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 720, height: 360 });

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

  const graphData = useMemo(
    () => ({
      nodes: nodes.map<RenderableGraphNode>((node) => ({
        id: node.id,
        label: node.title,
        color: activeChapterId === node.id ? "#0ea5e9" : node.isPublished ? "#334155" : "#f59e0b"
      })),
      links: edges
        .filter((edge): edge is ChapterGraphEdge & { targetChapterId: number } => edge.targetChapterId !== null)
        .map<RenderableGraphLink>((edge) => ({
          source: edge.sourceChapterId,
          target: edge.targetChapterId
        }))
    }),
    [activeChapterId, edges, nodes]
  );

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className="w-full overflow-hidden rounded-lg border border-border/60 bg-background p-1"
    >
      <ForceGraph2D
        width={size.width}
        height={size.height}
        graphData={graphData}
        backgroundColor="#ffffff"
        nodeRelSize={4}
        linkWidth={1.2}
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
          context.fillStyle = "#111827";
          context.fillText(label, (node.x ?? 0) + 7, (node.y ?? 0) + 3);
        }}
      />
    </div>
  );
}
