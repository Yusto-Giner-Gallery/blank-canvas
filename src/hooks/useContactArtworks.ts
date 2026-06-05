import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ArtworkListItem } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

// Works linked to a contact — what this collector "has" (4.2). Backed by the
// `contact_artworks (contact_id, artwork_id, gallery_id)` join documented for
// the Lovable port (ADDITIONS.md §6.4). The table isn't in the generated
// types yet, so we reach it through the same untyped-relation cast used for
// `artworks_with_attention`. When the table is absent the query returns [].
type LinkRow = {
  artwork: ArtworkListItem | null;
};

// The join table isn't in the generated types, so reach it through a loose
// builder (same escape hatch useArtworks uses for the attention view).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rel(name: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase.from as unknown as (r: string) => any)(name);
}

export function useContactArtworks(contactId: string | undefined) {
  const { profile } = useProfile();
  return useQuery<ArtworkListItem[]>({
    queryKey: ["contact-artworks", contactId ?? null],
    enabled: !!profile && !!contactId,
    queryFn: async () => {
      const { data, error } = await rel("contact_artworks")
        .select(
          `artwork:artworks ( id, title, internal_id, status, price_eur, year,
            is_nfs, artist:artists ( id, name ),
            primary_image:artwork_images ( storage_path, is_primary, sort_order ) )`,
        )
        .eq("contact_id", contactId!);
      // Missing table / RLS not yet applied → behave as empty, not broken.
      if (error) return [];
      const rows = (data ?? []) as LinkRow[];
      return rows
        .map((r) => r.artwork)
        .filter((a): a is ArtworkListItem => !!a);
    },
  });
}

export function useLinkContactArtwork() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<void, Error, { contact_id: string; artwork_id: string }>({
    mutationFn: async ({ contact_id, artwork_id }) => {
      if (!profile) throw new Error("No profile");
      const { error } = await rel("contact_artworks").insert({
        contact_id,
        artwork_id,
        gallery_id: profile.gallery_id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, { contact_id }) =>
      qc.invalidateQueries({ queryKey: ["contact-artworks", contact_id] }),
  });
}

export function useUnlinkContactArtwork() {
  const qc = useQueryClient();
  return useMutation<void, Error, { contact_id: string; artwork_id: string }>({
    mutationFn: async ({ contact_id, artwork_id }) => {
      const { error } = await rel("contact_artworks")
        .delete()
        .eq("contact_id", contact_id)
        .eq("artwork_id", artwork_id);
      if (error) throw error;
    },
    onSuccess: (_d, { contact_id }) =>
      qc.invalidateQueries({ queryKey: ["contact-artworks", contact_id] }),
  });
}
