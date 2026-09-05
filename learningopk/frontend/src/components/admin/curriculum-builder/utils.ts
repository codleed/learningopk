export const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const toPositiveInteger = (value: string): number | null => {
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

export const buildSizedImageMarkdown = ({
  imageUrl,
  altText,
  width,
  height,
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

export const insertAtSelection = ({
  source,
  insertion,
  start,
  end,
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
    cursor: safeStart + insertion.length,
  };
};
