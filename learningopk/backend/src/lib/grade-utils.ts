/**
 * Normalizes a free-form class string into the canonical grade value
 * accepted by the platform ("9" or "10").
 */
export const inferLegacyGrade = (input: string): "9" | "10" | null => {
  const normalized = input.trim().toLowerCase();
  if (normalized === "9" || normalized === "9th" || normalized.includes("class 9")) {
    return "9";
  }
  if (normalized === "10" || normalized === "10th" || normalized.includes("class 10")) {
    return "10";
  }
  return null;
};
