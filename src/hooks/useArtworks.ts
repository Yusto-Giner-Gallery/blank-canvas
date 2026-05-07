import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Artwork, ArtworkListItem } from "@/integrations/supabase/types";
import { useProfile } from "./useProfile";

type Row = Artwork & {
  artist: { id: string; name: string; nationality: string | null } | null;
  location: { id: string; name: string } | null;
  primary_image: Array<{
    storage_path: string;
    is_primary: boolean;
    sort_order: number;
  }> | null;
  artwork_tags: Array<{ tag_id: string }> | null;
  card_artwork_mentions: Array<{
    card: { labels: string[] | null; due_date: string | null } | null;
  }> | null;
};

// Per CLAUDE.md §6 mention rule: an artwork needs attention if any
// mentioning card is labeled 'shipping' or has a due_date within 7
// days. Computed client-side until Lovable's `artworks_with_attention`
// view ships; same shape, so swapping the query target later is a
// one-line change.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function computeAttention(row: Row): boolean {
  const mentions = row.card_artwork_mentions ?? [];
  for (const m of mentions) {
    const c = m.card;
    if (!c) continue;
    if (c.labels?.includes("shipping")) return true;
    if (c.due_date) {
      const t = new Date(c.due_date).getTime();
      if (Number.isFinite(t) && t - Date.now() < WEEK_MS) return true;
    }
  }
  return false;
}

export type ArtworkWithFilters = ArtworkListItem & {
  artist_nationality: string | null;
  tag_ids: string[];
};

export function useArtworks() {
  const { profile } = useProfile();

  return useQuery<ArtworkWithFilters[]>({
    queryKey: ["artworks", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select(
          `
          *,
          artist:artists ( id, name, nationality ),
          location:locations ( id, name ),
          primary_image:artwork_images ( storage_path, is_primary, sort_order ),
          artwork_tags ( tag_id ),
          card_artwork_mentions (
            card:cards ( labels, due_date )
          )
          `,
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .returns<Row[]>();
      if (error) throw error;

      return (data ?? []).map<ArtworkWithFilters>((row) => {
        const images = row.primary_image ?? [];
        const primary =
          images.find((i) => i.is_primary) ??
          images.slice().sort((a, b) => a.sort_order - b.sort_order)[0] ??
          null;
        return {
          ...row,
          artist: row.artist
            ? { id: row.artist.id, name: row.artist.name }
            : null,
          artist_nationality: row.artist?.nationality ?? null,
          primary_image: primary ? { storage_path: primary.storage_path } : null,
          tag_ids: (row.artwork_tags ?? []).map((t) => t.tag_id),
          needs_attention: computeAttention(row),
        };
      });
    },
  });
}

export function imageUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from("artwork-images").getPublicUrl(storagePath);
  return data.publicUrl;
}
