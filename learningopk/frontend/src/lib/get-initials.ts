/**
 * Get initials from a display name.
 * Used across dashboard, left-rail, and profile components.
 *
 * @example getInitials("John Doe") → "JD"
 * @example getInitials("Alice") → "A"
 */
export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
