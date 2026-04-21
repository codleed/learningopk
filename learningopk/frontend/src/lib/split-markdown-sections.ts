/**
 * A single section of a chapter summary, split on `##` (h2) headings.
 */
export interface MarkdownSection {
  /** Display title for the section. */
  title: string;
  /**
   * Full markdown content for the section, including the `##` heading line
   * so it continues to render as a heading inside the section.
   */
  content: string;
}

/**
 * Split a markdown string into sections based on `##` (h2) headings.
 *
 * Rules:
 * - Any content before the first `##` heading becomes the first section.
 *   Its title is derived from a leading `# ` (h1) heading if present,
 *   otherwise falls back to "Introduction".
 * - Each subsequent `##` heading starts a new section. The heading line
 *   itself is kept in the section's content so it renders correctly.
 * - If the input contains no `##` headings at all, a single section is
 *   returned with the entire input as its content. The title is taken
 *   from a leading `# ` heading if available, otherwise "Summary".
 * - Trims surrounding whitespace from each section's content.
 */
export function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const source = markdown ?? "";

  const headingRegex = /^##(?:[ \t]+(.*?))?[ \t]*$/gm;
  const matches: Array<{ index: number; title: string; length: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(source)) !== null) {
    matches.push({
      index: match.index,
      title: match[1]?.trim() ?? "",
      length: match[0].length,
    });
  }

  if (matches.length === 0) {
    return [
      {
        title: extractH1Title(source) ?? "Summary",
        content: source.trim(),
      },
    ];
  }

  const sections: MarkdownSection[] = [];

  const firstIndex = matches[0]!.index;
  if (firstIndex > 0) {
    const prelude = source.slice(0, firstIndex).trim();
    if (prelude.length > 0) {
      sections.push({
        title: extractH1Title(prelude) ?? "Introduction",
        content: prelude,
      });
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const end = next ? next.index : source.length;
    const content = source.slice(current.index, end).trim();
    sections.push({
      title: current.title.length > 0 ? current.title : `Section ${sections.length + 1}`,
      content,
    });
  }

  return sections;
}

function extractH1Title(markdown: string): string | null {
  const h1 = markdown.match(/^#\s+(.+?)\s*$/m);
  return h1?.[1]?.trim() ?? null;
}
