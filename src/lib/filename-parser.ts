// Filename parser. Treat the filename as a soup of structured tokens
// (size, year, price, status, medium, known artist) and let "whatever
// is left after pulling those out" be the title. Works regardless of
// separator — space, underscore, dash, em/en-dash all OK.

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

// Known mediums. Multi-word phrases come first in the sorted list so
// "oil on canvas" matches before bare "oil". Word-bounded (so "oil"
// can't match inside "boil" or "oily").
const MEDIUMS = [
  "oil on canvas",
  "oil on linen",
  "oil on panel",
  "oil on board",
  "oil on paper",
  "oil on wood",
  "acrylic on canvas",
  "acrylic on linen",
  "acrylic on panel",
  "acrylic on board",
  "acrylic on paper",
  "watercolor on paper",
  "watercolour on paper",
  "ink on paper",
  "pencil on paper",
  "charcoal on paper",
  "pastel on paper",
  "gouache on paper",
  "mixed media on canvas",
  "mixed media on paper",
  "mixed media",
  "digital photograph",
  "silver gelatin print",
  "silver gelatin",
  "screen print",
  "screenprint",
  "silkscreen",
  "c-print",
  "c print",
  "oil",
  "acrylic",
  "watercolor",
  "watercolour",
  "gouache",
  "tempera",
  "ink",
  "pencil",
  "charcoal",
  "pastel",
  "pastels",
  "crayon",
  "lithograph",
  "etching",
  "engraving",
  "woodcut",
  "linocut",
  "bronze",
  "marble",
  "ceramic",
  "clay",
  "wood",
  "steel",
  "sculpture",
  "collage",
  "assemblage",
  "installation",
  "photograph",
  "photography",
  "video",
];
const MEDIUMS_SORTED = [...MEDIUMS].sort((a, b) => b.length - a.length);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

// Dimensions can be "40", "40.5", or European "40,5". Treat both
// separators as decimal points.
function parseDecimal(raw: string): number | null {
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function titleCase(s: string): string {
  return s.replace(/\b(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase());
}

// Collapse leftover separator junk into single spaces, trim.
function tidy(s: string): string {
  return s
    .replace(/[_\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Detects an artwork size (NxN or NxNxN) followed by "cm" anywhere in
// a normalised string. Used to decide whether a trailing pixel-dim
// suffix is junk we should strip.
const HAS_CM_SIZE =
  /\d+(?:[.,]\d+)?\s*[x×*]\s*\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*cm/i;

export function parseFilename(
  filename: string,
  knownArtistNames: string[],
): ParseResult {
  let working = stripExt(filename);

  // Slugified filenames (WordPress, web exports) use hyphens or
  // underscores as word separators, breaking our space-bounded regexes
  // for size ("94-x-93-cm") and medium ("oil-on-linen"). Normalise
  // them to spaces first so the rest of the pipeline works as if the
  // user had typed the filename out.
  working = working.replace(/[-_]+/g, " ");

  // CMS image exports often append the image's own pixel dimensions
  // ("-510x382") at the end of the filename, which would otherwise be
  // picked up as the artwork size. Strip that trailing suffix only
  // when a real cm-marked artwork size exists earlier — without that
  // signal, the trailing NxN might legitimately be the artwork size.
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

  // 5. Medium — match longest known medium phrase first.
  let medium: string | null = null;
  for (const m of MEDIUMS_SORTED) {
    const re = new RegExp(
      `(?<![A-Za-z])${escapeRegex(m)}(?![A-Za-z])`,
      "i",
    );
    const match = working.match(re);
    if (match) {
      medium = titleCase(match[0]);
      working = working.replace(re, " ");
      break;
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
