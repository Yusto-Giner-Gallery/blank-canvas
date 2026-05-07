import type { Filters } from "@/hooks/useFilters";
import type { ArtworkWithFilters } from "@/hooks/useArtworks";

export function applyFilters(
  artworks: ArtworkWithFilters[],
  filters: Filters,
): ArtworkWithFilters[] {
  const q = filters.q.trim().toLowerCase();
  const nat = filters.nationality.trim().toLowerCase();

  return artworks.filter((a) => {
    if (q) {
      const inTitle = a.title.toLowerCase().includes(q);
      const inNotes = (a.notes ?? "").toLowerCase().includes(q);
      const inInternal = a.internal_id.toLowerCase().includes(q);
      if (!inTitle && !inNotes && !inInternal) return false;
    }
    if (filters.status && a.status !== filters.status) return false;
    if (filters.location_id && a.location?.id !== filters.location_id) return false;
    if (filters.artist_id && a.artist?.id !== filters.artist_id) return false;
    if (filters.tag_id && !a.tag_ids.includes(filters.tag_id)) return false;
    if (
      filters.price_min != null &&
      (a.price_eur == null || a.price_eur < filters.price_min)
    )
      return false;
    if (
      filters.price_max != null &&
      (a.price_eur == null || a.price_eur > filters.price_max)
    )
      return false;
    if (
      filters.year_min != null &&
      (a.year == null || a.year < filters.year_min)
    )
      return false;
    if (
      filters.year_max != null &&
      (a.year == null || a.year > filters.year_max)
    )
      return false;
    if (nat) {
      const artistNat = (a.artist_nationality ?? "").toLowerCase();
      if (!artistNat.includes(nat)) return false;
    }
    return true;
  });
}
