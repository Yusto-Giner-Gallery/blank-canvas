// Filename parser. Treat the filename as a soup of structured tokens
// (size, year, price, status, medium, known artist) and let "whatever
// is left after pulling those out" be the title. Works regardless of
// separator — space, underscore, dash, em/en-dash, comma, semicolon
// all OK.

import type { ArtworkStatus } from "@/integrations/supabase/domain";

export type ParseResult = {
  raw_filename: string;
  title: string | null;
  artist_name: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  year: number | null;
  price_eur: number | null;
  medium: string | null;
  status: ArtworkStatus | null;
  artist_match: "exact" | "none";
};

// Size: tolerant of cm suffix on every dimension (30cm x 20cm x 15cm),
// European decimal commas (40,5x60), surrounding spaces, and all of
// x/×/* as the multiplier.
const SIZE_RE =
  /(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?)?/i;
const YEAR_RE = /(?<![0-9])(19\d{2}|20\d{2})(?![0-9])/;
const PRICE_RE =
  /(?:€\s*(\d+(?:[.,]\d{1,3})*)|(\d+(?:[.,]\d{1,3})*)\s*€|EUR\s*(\d+(?:[.,]\d{1,3})*)|(\d+(?:[.,]\d{1,3})*)\s*EUR)/i;
const STATUS_RE =
  /(?<![A-Za-z])(SOLD|RESERVED|ON[\s_-]?HOLD|AVAILABLE|ARCHIVED)(?![A-Za-z])/i;
const HAS_CM_SIZE =
  /\d+(?:[.,]\d+)?\s*[x×*]\s*\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*cm/i;

// === Medium: compositional, not enumerated. ==========================
// A medium is either:
//   (A) "<prefix> on <substrate>"  — every combination valid
//   (B) a standalone term (bronze, lithograph, photograph…)
// Composing the regex from these lists handles any combination
// (mixed media on linen, oil on muslin, acrylic on plywood…) without
// needing to hardcode every pair.
const MEDIUM_PREFIXES = [
  "mixed media",
  "oil pastel",
  "spray paint",
  "oil",
  "acrylic",
  "watercolor",
  "watercolour",
  "tempera",
  "gouache",
  "ink",
  "pencil",
  "graphite",
  "charcoal",
  "pastel",
  "crayon",
  "encaustic",
  "marker",
];
const SUBSTRATES = [
  "watercolor paper",
  "watercolour paper",
  "cotton canvas",
  "linen canvas",
  "canvas",
  "linen",
  "paper",
  "panel",
  "board",
  "cardboard",
  "plywood",
  "wood",
  "mdf",
  "silk",
  "vellum",
  "muslin",
  "burlap",
  "masonite",
  "fabric",
  "cotton",
  "plexiglass",
  "plastic",
  "mylar",
  "metal",
  "aluminium",
  "aluminum",
];
const STANDALONE_MEDIA = [
  // composite pieces
  "mixed media",
  // print methods
  "lithograph",
  "etching",
  "engraving",
  "woodcut",
  "linocut",
  "screenprint",
  "silkscreen",
  "screen print",
  "silver gelatin print",
  "silver gelatin",
  "c-print",
  "c print",
  "digital photograph",
  "digital print",
  // sculpture / 3D
  "bronze",
  "marble",
  "ceramic",
  "clay",
  "sculpture",
  "collage",
  "assemblage",
  "installation",
  // photo / video
  "photograph",
  "photography",
  "video",
  // base media when standalone
  "oil pastel",
  "spray paint",
  "oil",
  "acrylic",
  "watercolor",
  "watercolour",
  "tempera",
  "gouache",
  "ink",
  "pencil",
  "graphite",
  "charcoal",
  "pastel",
  "crayon",
  "encaustic",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function alternation(items: readonly string[]): string {
  // Longest first so multi-word phrases match before the single-word
  // fragments they contain ("oil pastel" before "oil").
  return [...items]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");
}

const COMPOUND_MEDIUM_RE = new RegExp(
  `(?<![A-Za-z])(${alternation(MEDIUM_PREFIXES)})\\s+(?:on|over)\\s+(${alternation(SUBSTRATES)})(?![A-Za-z])`,
  "i",
);
const STANDALONE_MEDIUM_RE = new RegExp(
  `(?<![A-Za-z])(${alternation(STANDALONE_MEDIA)})(?![A-Za-z])`,
  "i",
);

function statusFromMatch(raw: string): ArtworkStatus | null {
  const v = raw.toUpperCase().replace(/[\s_-]+/g, "");
  if (v === "SOLD") return "sold";
  if (v === "RESERVED" || v === "ONHOLD") return "on_hold";
  if (v === "AVAILABLE") return "available";
  if (v === "ARCHIVED") return "archived";
  return null;
}

function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "");
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDecimal(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function titleCase(s: string): string {
  return s.replace(/\b(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase());
}

// Collapse leftover separator junk (slug chars, commas, semicolons,
// orphan "by", and stray extension words like "jpg") into clean text.
function tidy(s: string): string {
  return s
    .replace(/[_\-–—,;]+/g, " ")
    .replace(/\b(?:by|para)\b/gi, " ") // strip orphan "by"/"para" left after artist extraction
    .replace(/\b(?:jpg|jpeg|png|gif|webp|tiff?|bmp|heic|heif|raw)\b/gi, " ") // stray extension fragments
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFilename(
  filename: string,
  knownArtistNames: string[],
): ParseResult {
  let working = stripExt(filename);

  // Slugified filenames (WordPress, web exports, hand-typed lists)
  // separate words with hyphens, underscores, commas, or semicolons.
  // Normalise everything to spaces so the structured-token regexes
  // below see "94 x 93 cm", "oil on linen", "mixed media on paper"
  // regardless of the original separator.
  working = working.replace(/[-_,;]+/g, " ");

  // CMS image exports often append the file's pixel dimensions
  // ("-510x382") at the end, which would otherwise be picked up as the
  // artwork size. Strip that trailing suffix only when a real cm-marked
  // size exists earlier — without that signal the trailing NxN might
  // legitimately be the artwork's dimensions.
  if (HAS_CM_SIZE.test(working)) {
    working = working.replace(/\s+\d+\s*[x×*]\s*\d+\s*$/i, "").trim();
  }

  // 1. Size
  let width_cm: number | null = null;
  let height_cm: number | null = null;
  let depth_cm: number | null = null;
  const sm = working.match(SIZE_RE);
  if (sm) {
    width_cm = parseDecimal(sm[1]);
    height_cm = parseDecimal(sm[2]);
    depth_cm = sm[3] ? parseDecimal(sm[3]) : null;
    working = working.replace(SIZE_RE, " ");
  }

  // 2. Year
  let year: number | null = null;
  const ym = working.match(YEAR_RE);
  if (ym) {
    year = Number(ym[1]);
    working = working.replace(YEAR_RE, " ");
  }

  // 3. Price
  let price_eur: number | null = null;
  const pm = working.match(PRICE_RE);
  if (pm) {
    const raw = pm[1] ?? pm[2] ?? pm[3] ?? pm[4];
    if (raw) price_eur = parsePrice(raw);
    working = working.replace(PRICE_RE, " ");
  }

  // 4. Status keyword
  let status: ArtworkStatus | null = null;
  const stm = working.match(STATUS_RE);
  if (stm) {
    status = statusFromMatch(stm[1]);
    working = working.replace(STATUS_RE, " ");
  }

  // 5. Medium — try compound (<prefix> on <substrate>) first, then
  // standalone. Compound match consumes both prefix and substrate.
  let medium: string | null = null;
  const cm = working.match(COMPOUND_MEDIUM_RE);
  if (cm) {
    medium = titleCase(cm[0]);
    working = working.replace(COMPOUND_MEDIUM_RE, " ");
  } else {
    const sm2 = working.match(STANDALONE_MEDIUM_RE);
    if (sm2) {
      medium = titleCase(sm2[0]);
      working = working.replace(STANDALONE_MEDIUM_RE, " ");
    }
  }

  // 6. Known artist — substring match against the working text. Try
  // longest names first to avoid partial collisions. Only set the
  // artist if there's an exact match; never guess from leftover text.
  let artist_name: string | null = null;
  let artist_match: ParseResult["artist_match"] = "none";
  const knownSorted = [...knownArtistNames]
    .filter((n) => n.trim().length > 0)
    .sort((a, b) => b.length - a.length);
  for (const name of knownSorted) {
    const re = new RegExp(
      `(?<![A-Za-z])${escapeRegex(name)}(?![A-Za-z])`,
      "i",
    );
    if (re.test(working)) {
      artist_name = name;
      artist_match = "exact";
      working = working.replace(re, " ");
      break;
    }
  }

  // 7. Whatever is left becomes the title.
  const title = tidy(working) || null;

  return {
    raw_filename: filename,
    title,
    artist_name,
    width_cm,
    height_cm,
    depth_cm,
    year,
    price_eur,
    medium,
    status,
    artist_match,
  };
}
