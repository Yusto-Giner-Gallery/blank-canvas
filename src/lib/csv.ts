import Papa from "papaparse";
import type { ArtworkStatus } from "@/integrations/supabase/domain";
import type { ArtworkWithFilters } from "@/hooks/useArtworks";

// CSV column shape for both export and import.
//
// Export uses these as headers in this order. Import accepts these column
// names case-insensitively; everything but `title` and `artist_name` is
// optional. `artist_name` is matched against existing artists; unknown
// names are flagged for review (the import preview shows the missing
// match), then created on submit.
export const CSV_HEADERS = [
  "internal_id",
  "title",
  "artist_name",
  "artist_nationality",
  "year",
  "medium",
  "width_cm",
  "height_cm",
  "depth_cm",
  "price_eur",
  "location_name",
  "status",
  "notes",
] as const;

export type CsvRow = {
  internal_id?: string;
  title?: string;
  artist_name?: string;
  artist_nationality?: string;
  year?: string;
  medium?: string;
  width_cm?: string;
  height_cm?: string;
  depth_cm?: string;
  price_eur?: string;
  location_name?: string;
  status?: string;
  notes?: string;
};

export type ParsedRow = {
  raw: CsvRow;
  internal_id: string | null;
  title: string;
  artist_name: string;
  artist_nationality: string | null;
  year: number | null;
  medium: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  price_eur: number | null;
  location_name: string | null;
  status: ArtworkStatus;
  notes: string | null;
  errors: string[];
};

const VALID_STATUSES: readonly ArtworkStatus[] = [
  "available",
  "on_hold",
  "sold",
  "archived",
];

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function status(v: string | undefined): ArtworkStatus {
  const x = (v ?? "").trim().toLowerCase();
  return VALID_STATUSES.includes(x as ArtworkStatus)
    ? (x as ArtworkStatus)
    : "available";
}

export function parseArtworkCSV(text: string): ParsedRow[] {
  const out = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"),
  });
  const rows = out.data ?? [];
  return rows.map((raw) => {
    const errors: string[] = [];
    const title = (raw.title ?? "").trim();
    const artist_name = (raw.artist_name ?? "").trim();
    if (!title) errors.push("title is required");
    if (!artist_name) errors.push("artist_name is required");
    return {
      raw,
      internal_id: (raw.internal_id ?? "").trim() || null,
      title,
      artist_name,
      artist_nationality: (raw.artist_nationality ?? "").trim() || null,
      year: num(raw.year),
      medium: (raw.medium ?? "").trim() || null,
      width_cm: num(raw.width_cm),
      height_cm: num(raw.height_cm),
      depth_cm: num(raw.depth_cm),
      price_eur: num(raw.price_eur),
      location_name: (raw.location_name ?? "").trim() || null,
      status: status(raw.status),
      notes: (raw.notes ?? "").trim() || null,
      errors,
    };
  });
}

export function exportArtworksCSV(artworks: ArtworkWithFilters[]): string {
  const rows = artworks.map((a) => ({
    internal_id: a.internal_id,
    title: a.title,
    artist_name: a.artist?.name ?? "",
    artist_nationality: a.artist_nationality ?? "",
    year: a.year ?? "",
    medium: a.medium ?? "",
    width_cm: a.width_cm ?? "",
    height_cm: a.height_cm ?? "",
    depth_cm: a.depth_cm ?? "",
    price_eur: a.price_eur ?? "",
    location_name: a.location?.name ?? "",
    status: a.status,
    notes: a.notes ?? "",
  }));
  return Papa.unparse({ fields: [...CSV_HEADERS], data: rows });
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
