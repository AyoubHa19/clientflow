/**
 * Up to two letters for an avatar: "Sara Bennani" → "SB", "Sara" → "S".
 * Anything in brackets is skipped ("Sara (sample)" → "S"), and so are
 * words without a letter or digit.
 */
export function initials(name: string) {
  const words = name
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0])
    .filter((letter): letter is string => Boolean(letter));
  const picked = words.length > 1 ? [words[0], words.at(-1)] : words;
  return picked.join("").toUpperCase() || "?";
}
