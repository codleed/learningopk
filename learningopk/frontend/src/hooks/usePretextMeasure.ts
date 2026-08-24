"use client";

import { useMemo, useState, useEffect } from "react";

export type BlockType =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "code"
  | "math"
  | "blockquote"
  | "ul"
  | "ol"
  | "li"
  | "hr"
  | "img"
  | "table"
  | "unknown";

export interface MarkdownBlock {
  id: string;
  type: BlockType;
  raw: string;
  text: string;
  language?: string;
}

interface PretextMeasureResult {
  blocks: MarkdownBlock[];
  heights: number[];
  totalHeight: number;
}

const FONT_SIZE = 16;
const LINE_HEIGHT = 24;
const CODE_LINE_HEIGHT = 20;
const CODE_FONT_SIZE = 14;
const HEADER_MULTIPLIERS: Record<string, number> = {
  h1: 2.2,
  h2: 1.8,
  h3: 1.5,
  h4: 1.3,
  h5: 1.2,
  h6: 1.1,
};

const HEADER_FONT_SIZES: Record<string, number> = {
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
};

function extractTextFromMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/\$[^$]*\$/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/^\s*\d+\.\s/gm, "")
    .replace(/>\s/g, "")
    .replace(/\|/g, " ")
    .replace(/---/g, "")
    .trim();
}

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.split("\n");
  let currentBlock: MarkdownBlock | null = null;
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```") && !inCodeBlock) {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      inCodeBlock = true;
      codeLanguage = line.slice(3).trim() || "text";
      codeContent = [];
      continue;
    }

    if (line.startsWith("```") && inCodeBlock) {
      inCodeBlock = false;
      blocks.push({
        id: `block-${blocks.length}`,
        type: "code",
        raw: codeContent.join("\n"),
        text: codeContent.join("\n"),
        language: codeLanguage,
      });
      codeLanguage = "";
      codeContent = [];
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    if (line.startsWith("$$") && line.endsWith("$$")) {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      blocks.push({
        id: `block-${blocks.length}`,
        type: "math",
        raw: line,
        text: line.slice(2, -2),
      });
      currentBlock = null;
      continue;
    }

    if (line.match(/^#{1,6}\s/)) {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      const level = line.match(/^(#{1,6})/)?.[1].length || 1;
      blocks.push({
        id: `block-${blocks.length}`,
        type: `h${level}` as BlockType,
        raw: line,
        text: line.replace(/^#+\s/, ""),
      });
      currentBlock = null;
      continue;
    }

    if (line.startsWith("> ")) {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      blocks.push({
        id: `block-${blocks.length}`,
        type: "blockquote",
        raw: line,
        text: line.replace(/^>\s/, ""),
      });
      currentBlock = null;
      continue;
    }

    if (line.match(/^[-*+]\s/) || line.match(/^\d+\.\s/)) {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      blocks.push({
        id: `block-${blocks.length}`,
        type: "li",
        raw: line,
        text: line.replace(/^[-*+]\s|^\d+\.\s/, ""),
      });
      currentBlock = null;
      continue;
    }

    if (line.trim() === "---" || line.trim() === "***") {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      blocks.push({
        id: `block-${blocks.length}`,
        type: "hr",
        raw: line,
        text: "",
      });
      currentBlock = null;
      continue;
    }

    if (line.match(/^\|/) && line.match(/\|$/)) {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      blocks.push({
        id: `block-${blocks.length}`,
        type: "table",
        raw: line,
        text: line.replace(/\|/g, " ").trim(),
      });
      currentBlock = null;
      continue;
    }

    if (line.trim() === "") {
      if (currentBlock && currentBlock.type === "p") {
        blocks.push(currentBlock);
      }
      currentBlock = null;
      continue;
    }

    if (!currentBlock) {
      currentBlock = {
        id: `block-${blocks.length}`,
        type: "p",
        raw: line,
        text: line,
      };
    } else {
      currentBlock.raw += "\n" + line;
      currentBlock.text += "\n" + line;
    }
  }

  if (currentBlock && currentBlock.type === "p") {
    blocks.push(currentBlock);
  }

  return blocks;
}

function estimateTextHeight(
  text: string,
  fontSize: number,
  width: number,
  lineHeight: number
): number {
  const avgCharWidth = fontSize * 0.6;
  const charsPerLine = Math.max(Math.floor(width / avgCharWidth), 1);
  const estimatedLines = Math.ceil(text.length / charsPerLine);
  return Math.max(estimatedLines, 1) * lineHeight;
}

function computeBlockHeight(block: MarkdownBlock, width: number, baseLineHeight: number): number {
  switch (block.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const fontSize = HEADER_FONT_SIZES[block.type];
      const multiplier = HEADER_MULTIPLIERS[block.type];
      const text = extractTextFromMarkdown(block.text);
      const textHeight = estimateTextHeight(text, fontSize, width, baseLineHeight);
      return Math.max(textHeight * multiplier, fontSize * multiplier);
    }

    case "code": {
      const codeText = block.text || block.raw;
      const lines = codeText.split("\n");
      const avgCharsPerLine = Math.max(...lines.map((l) => l.length), 1);
      const charsPerWidth = width / (CODE_FONT_SIZE * 0.6);
      const estimatedLines = Math.ceil((avgCharsPerLine * lines.length) / charsPerWidth);
      return Math.max(estimatedLines * CODE_LINE_HEIGHT + 24, CODE_LINE_HEIGHT * 2);
    }

    case "math":
    case "blockquote":
    case "ul":
    case "ol":
    case "li": {
      const text = extractTextFromMarkdown(block.text);
      if (!text.trim()) {
        return baseLineHeight;
      }
      return estimateTextHeight(text, FONT_SIZE, width, baseLineHeight) + 16;
    }

    case "table": {
      const text = extractTextFromMarkdown(block.text);
      return estimateTextHeight(text, FONT_SIZE, width, baseLineHeight) * 2;
    }

    case "hr": {
      return 32;
    }

    case "img": {
      return 300;
    }

    case "p":
    default: {
      const text = extractTextFromMarkdown(block.text || block.raw);
      if (!text.trim()) {
        return baseLineHeight;
      }
      return estimateTextHeight(text, FONT_SIZE, width, baseLineHeight) + 8;
    }
  }
}

export function usePretextMeasure(
  content: string,
  containerWidth: number = 800,
  lineHeight: number = LINE_HEIGHT
): PretextMeasureResult {
  const [actualWidth, setActualWidth] = useState(containerWidth);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const element = document.querySelector("[data-md-virtual-container]");
      if (element) {
        const width = (element as HTMLElement).offsetWidth;
        if (width > 0) {
          setActualWidth(width);
        }
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  const heights = useMemo(() => {
    return blocks.map((block) => computeBlockHeight(block, actualWidth, lineHeight));
  }, [blocks, actualWidth, lineHeight]);

  const totalHeight = useMemo(() => {
    return heights.reduce((sum, h) => sum + h, 0);
  }, [heights]);

  return {
    blocks,
    heights,
    totalHeight,
  };
}
