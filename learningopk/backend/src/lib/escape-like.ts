/**
 * Escapes special LIKE/ILIKE wildcard characters in user-provided search terms.
 *
 * In PostgreSQL LIKE/ILIKE patterns:
 * - `%` matches any sequence of characters
 * - `_` matches any single character
 * - `\` is the escape character
 *
 * This function escapes these characters so they are treated as literals,
 * preventing users from inadvertently expanding their search to unintended results.
 *
 * @param input - The raw user search string
 * @returns The escaped string safe for use in ILIKE patterns
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, (match) => {
    switch (match) {
      case "\\":
        return "\\\\";
      case "%":
        return "\\%";
      case "_":
        return "\\_";
      default:
        return match;
    }
  });
}
