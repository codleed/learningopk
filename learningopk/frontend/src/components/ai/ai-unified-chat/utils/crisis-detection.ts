/**
 * Client-side crisis keyword detection for student safety.
 *
 * This does NOT filter or block any message — it only determines whether
 * the crisis-resources banner should be shown alongside the normal AI response.
 */

const CRISIS_KEYWORDS: string[] = [
  // English
  'kill myself',
  'suicide',
  'want to die',
  'self-harm',
  'hurt myself',
  'no one cares',

  // Urdu / Roman Urdu
  'marna chahta',
  'khudkushi',
  'mar jana',
];

/**
 * Returns `true` when the message contains at least one crisis-related keyword.
 * Matching is case-insensitive and works across English, Urdu, and Roman Urdu phrases.
 */
export function detectCrisisKeywords(message: string): boolean {
  const normalised = message.toLowerCase();
  return CRISIS_KEYWORDS.some((keyword) => normalised.includes(keyword));
}
