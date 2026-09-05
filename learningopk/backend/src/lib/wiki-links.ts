export const normalizeWikiLinkTarget = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

export type ParsedWikiLink = {
  targetTitle: string;
  normalizedTarget: string;
};

const WIKI_LINK_PATTERN = /\[\[([^\]\n|]+)(?:\|[^\]\n]+)?\]\]/g;

export const extractWikiLinks = (content: string): ParsedWikiLink[] => {
  const links: ParsedWikiLink[] = [];
  let match = WIKI_LINK_PATTERN.exec(content);
  while (match) {
    const targetTitle = (match[1] ?? "").trim();
    if (targetTitle.length > 0) {
      links.push({
        targetTitle,
        normalizedTarget: normalizeWikiLinkTarget(targetTitle),
      });
    }
    match = WIKI_LINK_PATTERN.exec(content);
  }
  WIKI_LINK_PATTERN.lastIndex = 0;
  return links;
};
