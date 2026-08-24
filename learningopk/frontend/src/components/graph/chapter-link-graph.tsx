"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type PositionedNode = {
  id: number;
  title: string;
  isPublished: boolean;
  x: number;
  y: number;
};

type ResolvedEdge = {
  sourceChapterId: number;
  targetChapterId: number;
  isResolved: boolean;
};

const NODE_RADIUS = 6;
const LABEL_OFFSET_X = 12;
const LABEL_FONT_SIZE = 11;
const PADDING = 48;

/**
 * Compute a circular layout for nodes, centered within the given dimensions.
 * Single node is placed at center; two nodes are placed side-by-side.
 */
function computeCircularLayout(
  nodes: ChapterGraphNode[],
  width: number,
  height: number
): PositionedNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const count = nodes.length;

  if (count === 0) return [];

  if (count === 1) {
    return [{ ...nodes[0]!, x: cx, y: cy }];
  }

  const radiusX = (width - PADDING * 2) / 2;
  const radiusY = (height - PADDING * 2) / 2;
  const radius = Math.min(radiusX, radiusY);

  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      ...node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

export function ChapterLinkGraph({
  nodes,
  edges,
  activeChapterId,
  onOpenChapter,
  testId,
}: ChapterLinkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 720, height: 360 });
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const width = Math.max(360, Math.floor(container.clientWidth));
      setSize({
        width,
        height: Math.max(280, Math.floor(width * 0.52)),
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

  const positionedNodes = useMemo(
    () => computeCircularLayout(nodes, size.width, size.height),
    [nodes, size.width, size.height]
  );

  const nodePositionMap = useMemo(() => {
    const map = new Map<number, PositionedNode>();
    for (const node of positionedNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [positionedNodes]);

  const resolvedEdges = useMemo(
    () => edges.filter((edge): edge is ResolvedEdge => edge.targetChapterId !== null),
    [edges]
  );

  const handleNodeClick = useCallback(
    (nodeId: number) => {
      onOpenChapter(nodeId);
    },
    [onOpenChapter]
  );

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className="w-full overflow-hidden rounded-lg border border-border/60 bg-background p-1"
    >
      <svg
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        className="block select-none"
        style={{ background: "var(--bg-elevated)" }}
      >
        {/* Edges */}
        {resolvedEdges.map((edge) => {
          const source = nodePositionMap.get(edge.sourceChapterId);
          const target = nodePositionMap.get(edge.targetChapterId);
          if (!source || !target) return null;

          return (
            <line
              key={`${edge.sourceChapterId}-${edge.targetChapterId}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={edge.isResolved ? "var(--accent-success)" : "var(--border-strong)"}
              strokeWidth={edge.isResolved ? 2.2 : 1.5}
              strokeOpacity={edge.isResolved ? 0.8 : 0.5}
            />
          );
        })}

        {/* Nodes */}
        {positionedNodes.map((node) => {
          const isActive = activeChapterId === node.id;
          const isHovered = hoveredNodeId === node.id;

          let fillColor: string;
          if (isActive) {
            fillColor = "var(--accent-info)";
          } else if (!node.isPublished) {
            fillColor = "var(--accent-warning)";
          } else {
            fillColor = "var(--text-primary)";
          }

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => handleNodeClick(node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNodeClick(node.id);
                }
              }}
            >
              {/* Hit area (larger invisible circle for easier clicking) */}
              <circle cx={node.x} cy={node.y} r={NODE_RADIUS * 3} fill="transparent" />

              {/* Active ring */}
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke="var(--accent-info)"
                  strokeWidth={1.5}
                  strokeOpacity={0.4}
                />
              )}

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isHovered ? NODE_RADIUS + 1.5 : NODE_RADIUS}
                fill={fillColor}
                style={{
                  transition: "r 150ms ease-out, opacity 150ms ease-out",
                }}
                opacity={isHovered ? 1 : 0.9}
              />

              {/* Label */}
              <text
                x={node.x + LABEL_OFFSET_X}
                y={node.y + LABEL_FONT_SIZE * 0.35}
                fill="var(--text-primary)"
                fontSize={LABEL_FONT_SIZE}
                fontFamily="var(--font-body)"
                opacity={isHovered || isActive ? 1 : 0.75}
                style={{
                  transition: "opacity 150ms ease-out",
                  pointerEvents: "none",
                }}
              >
                {node.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
