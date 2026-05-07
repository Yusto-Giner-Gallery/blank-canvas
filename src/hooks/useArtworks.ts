import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Artwork, ArtworkListItem } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

// `artworks_with_attention` exposes every artworks column plus a server-
// computed `needs_attention` boolean (CLAUDE.md §6 mention rule). The
// view is `security_invoker = true`, so the existing artworks RLS still
// applies.
type Row = Artwork & {
  needs_attention: boolean;
  artist: { id: string; name: string; nationality: string | null } | null;
  location: { id: string; name: string } | null;
  primary_image: Array<{
    storage_path: string;
    is_primary: boolean;
    sort_order: number;
  }> | null;
  artwork_tags: Array<{ tag_id: string }> | null;
};

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
      // Cast: `artworks_with_attention` is a view not in the generated
      // Database['public']['Tables'] type. Same RLS scope as `artworks`.
      const { data, error } = await (
        supabase.from as unknown as (
          rel: string,
        ) => ReturnType<typeof supabase.from>
      )("artworks_with_attention")
        .select(
          `
          *,
          artist:artists ( id, name, nationality ),
          location:locations ( id, name ),
          primary_image:artwork_images ( storage_path, is_primary, sort_order ),
          artwork_tags ( tag_id )
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
          primary_image: primary
            ? { storage_path: primary.storage_path }
            : null,
          tag_ids: (row.artwork_tags ?? []).map((t) => t.tag_id),
          needs_attention: row.needs_attention ?? false,
        };
      });
    },
  });
}

export function imageUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  const { data } = supabase.storage
    .from("artwork-images")
    .getPublicUrl(storagePath);
  return data.publicUrl;
}
