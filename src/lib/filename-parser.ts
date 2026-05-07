// Tolerant filename parser. The original strict 3-segment underscore rule
// failed too many real-world filenames; this version pulls structured
// tokens out of the name regardless of order and uses what's left to
// identify title + artist.
//
// Supported separators:  _   -   –   —   (with or without surrounding spaces)
// Supported size syntax: 40x40, 40 x 40, 40×40, 40.5x40, 40x40cm, 40x40x10cm
// Also extracts: year (19xx / 20xx), price (€1200, 1200€, EUR1200), status
// keyword (SOLD / RESERVED / ON HOLD / AVAILABLE / ARCHIVED).

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
  status: ArtworkStatus | null;
  format: "A" | "B" | "tolerant" | "unknown";
  artist_match: "exact" | "none";
};

const SIZE_RE =
  /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)(?:\s*[x×*]\s*(\d+(?:\.\d+)?))?\s*(?:cm)?/i;
// \b is unreliable when adjacent to "_" (an underscore is a word char in JS).
// Use explicit character lookarounds instead so "_2023_" / "_SOLD_" match.
const YEAR_RE = /(?<![0-9])(19\d{2}|20\d{2})(?![0-9])/;
const PRICE_RE =
  /(?:€\s*(\d+(?:[.,]\d{1,3})*)|(\d+(?:[.,]\d{1,3})*)\s*€|EUR\s*(\d+(?:[.,]\d{1,3})*)|(\d+(?:[.,]\d{1,3})*)\s*EUR)/i;
const STATUS_RE =
  /(?<![A-Za-z])(SOLD|RESERVED|ON[\s_-]?HOLD|AVAILABLE|ARCHIVED)(?![A-Za-z])/i;
const SEPARATOR_RE = /\s*[_–—]\s*|\s+-\s+/;

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
  // Handle European thousands sep: "1.200" → 1200; "1,200.50" → 1200.50
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseFilename(
  filename: string,
  knownArtistNames: string[],
): ParseResult {
  let working = stripExt(filename);

  // 1. Size
  let width_cm: number | null = null;
  let height_cm: number | null = null;
  let depth_cm: number | null = null;
  const sizeMatch = working.match(SIZE_RE);
  if (sizeMatch) {
    width_cm = Number(sizeMatch[1]);
    height_cm = Number(sizeMatch[2]);
    depth_cm = sizeMatch[3] ? Number(sizeMatch[3]) : null;
    working = working.replace(SIZE_RE, " ");
  }

  // 2. Year
  let year: number | null = null;
  const yearMatch = working.match(YEAR_RE);
  if (yearMatch) {
    year = Number(yearMatch[1]);
    working = working.replace(YEAR_RE, " ");
  }

  // 3. Price
  let price_eur: number | null = null;
  const priceMatch = working.match(PRICE_RE);
  if (priceMatch) {
    const raw = priceMatch[1] ?? priceMatch[2] ?? priceMatch[3] ?? priceMatch[4];
    if (raw) price_eur = parsePrice(raw);
    working = working.replace(PRICE_RE, " ");
  }

  // 4. Status keyword
  let status: ArtworkStatus | null = null;
  const statusMatch = working.match(STATUS_RE);
  if (statusMatch) {
    status = statusFromMatch(statusMatch[1]);
    working = working.replace(STATUS_RE, " ");
  }

  // 5. Split remainder on separators. Trim leading/trailing dashes (left
  // behind when a token in the middle was extracted, e.g. "A - 40x40 - B"
  // becomes "A -  - B" after size stripping).
  const segments = working
    .split(SEPARATOR_RE)
    .map((s) => s.replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim())
    .filter(Boolean);

  const knownLower = new Map(
    knownArtistNames.map((n) => [n.trim().toLowerCase(), n]),
  );

  let title: string | null = null;
  let artist_name: string | null = null;
  let artist_match: ParseResult["artist_match"] = "none";
  let format: ParseResult["format"] = "unknown";

  if (segments.length === 0) {
    // Nothing extractable — last resort: use bare filename as title.
    title = stripExt(filename);
  } else if (segments.length === 1) {
    title = segments[0];
    format = "tolerant";
  } else {
    const matchIdx = segments.findIndex((s) =>
      knownLower.has(s.toLowerCase()),
    );
    if (matchIdx !== -1) {
      artist_name = knownLower.get(segments[matchIdx].toLowerCase())!;
      artist_match = "exact";
      const rest = segments.filter((_, i) => i !== matchIdx);
      title = rest.join(" ").trim() || null;
      // Format A = title first, artist last; Format B = artist first.
      format =
        matchIdx === segments.length - 1
          ? "A"
          : matchIdx === 0
            ? "B"
            : "tolerant";
    } else {
      // No known artist match — fall back to Format A convention:
      // title = first segment, artist = last segment, middle joins title.
      artist_name = segments[segments.length - 1];
      title = segments.slice(0, -1).join(" ").trim() || null;
      format = "tolerant";
    }
  }

  return {
    raw_filename: filename,
    title,
    artist_name,
    width_cm,
    height_cm,
    depth_cm,
    year,
    price_eur,
    status,
    format,
    artist_match,
  };
}
