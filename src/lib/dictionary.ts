import type { DictionaryEntry } from "./db";

/**
 * Applies dictionary corrections to a transcription: each entry replaces
 * whole-word occurrences of `term` with `replacement`, case-insensitively.
 *
 * Matching notes:
 *  - Word boundaries use Unicode-aware lookarounds so accented terms (café,
 *    Gómara…) match correctly — plain `\b` is ASCII-only and breaks on accents.
 *  - If the matched text started with a capital (e.g. sentence start), the
 *    replacement is capitalized to match, so corrections don't lowercase the
 *    start of a sentence.
 *  - Multi-word terms ("a be testing" → "A/B testing") work too.
 */
export function applyDictionary(
  text: string,
  entries: DictionaryEntry[],
): string {
  let out = text;
  for (const entry of entries) {
    const term = entry.term?.trim();
    const replacement = (entry.replacement ?? "").trim();
    if (!term) continue;

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let re: RegExp;
    try {
      re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu");
    } catch {
      // Engine without lookbehind support — skip this entry rather than crash.
      continue;
    }

    out = out.replace(re, (matched) => {
      if (!replacement) return matched;
      const first = matched.charAt(0);
      const startedUpper =
        first === first.toUpperCase() && first !== first.toLowerCase();
      return startedUpper
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement;
    });
  }
  return out;
}
