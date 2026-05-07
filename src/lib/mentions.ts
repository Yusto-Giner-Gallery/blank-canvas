// Parses `@artwork:<INTERNAL_ID>` references from card text. Per CLAUDE.md
// §6 mention rule, the internal_id format is `YG-NNNN` (locked feature 4).
// We accept any `@artwork:` prefix followed by a token of word/dash chars
// so the parser doesn't assume the YG- prefix never changes.

const RE = /@artwork:([A-Za-z0-9-]+)/g;

export function parseMentions(text: string): string[] {
  if (!text) return [];
  const ids = new Set<string>();
  for (const m of text.matchAll(RE)) ids.add(m[1]);
  return Array.from(ids);
}
