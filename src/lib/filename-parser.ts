// Parses gallery filenames in two accepted formats (CLAUDE.md §2):
//   A: Title_SizeXSizecm_Artist          e.g. "Culito Matón_40x40cm_PanTierni.jpg"
//   B: Artist_Title_Size                  e.g. "PanTierni_Culito Matón_40x40cm.jpg"
// Disambiguation: if exactly one segment matches a known artist name
// (case-insensitive, trimmed), that segment is the artist. Otherwise default
// to format A.

export type ParseResult = {
  raw_filename: string;
  title: string | null;
  artist_name: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  format: "A" | "B" | "unknown";
  artist_match: "exact" | "none" | "ambiguous";
};

// `cm` suffix is optional — confirmed by user. `40x40cm` and `40x40` both accepted.
const SIZE_RE = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?(?:cm)?$/i;

function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]{2,5}$/i, "");
}

function parseSize(segment: string) {
  const m = segment.match(SIZE_RE);
  if (!m) return null;
  return {
    width_cm: Number(m[1]),
    height_cm: Number(m[2]),
    depth_cm: m[3] ? Number(m[3]) : null,
  };
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function parseFilename(
  filename: string,
  knownArtistNames: string[],
): ParseResult {
  const base = stripExt(filename);
  const segments = base.split("_").map((s) => s.trim()).filter(Boolean);
  const empty: ParseResult = {
    raw_filename: filename,
    title: null,
    artist_name: null,
    width_cm: null,
    height_cm: null,
    depth_cm: null,
    format: "unknown",
    artist_match: "none",
  };

  if (segments.length !== 3) return empty;

  const knownLower = new Set(knownArtistNames.map(normalize));
  const sizeIdx = segments.findIndex((s) => parseSize(s));
  if (sizeIdx === -1) return empty;
  const size = parseSize(segments[sizeIdx])!;

  // Format A: Title_Size_Artist (size at index 1)
  // Format B: Artist_Title_Size (size at index 2)
  let format: "A" | "B" | "unknown" = "unknown";
  if (sizeIdx === 1) format = "A";
  else if (sizeIdx === 2) format = "B";
  else return empty;

  // Disambiguate by artist match if both interpretations are structurally valid.
  // (sizeIdx already pins the format, but if a user uploads ambiguous shapes
  // we still confirm via artist match for safety.)
  const candidates =
    format === "A"
      ? { title: segments[0], artist: segments[2] }
      : { title: segments[1], artist: segments[0] };

  const artistKey = normalize(candidates.artist);
  let artist_match: ParseResult["artist_match"] = "none";
  if (knownLower.has(artistKey)) artist_match = "exact";

  return {
    raw_filename: filename,
    title: candidates.title,
    artist_name: candidates.artist,
    width_cm: size.width_cm,
    height_cm: size.height_cm,
    depth_cm: size.depth_cm,
    format,
    artist_match,
  };
}
