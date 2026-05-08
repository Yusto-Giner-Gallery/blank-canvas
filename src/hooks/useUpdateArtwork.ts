import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ArtworkStatus } from "@/integrations/supabase/domain";

export type ArtworkPatch = {
  status?: ArtworkStatus;
  location_id?: string | null;
  price_eur?: number | null;
  title?: string;
  notes?: string | null;
};

export function useUpdateArtwork() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; patch: ArtworkPatch }>({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("artworks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

// Soft delete: stamp deleted_at so the row drops out of useArtworks /
// artist / dossier queries (which all filter `is("deleted_at", null)`)
// without losing audit history. Matches the soft-delete pattern used
// for invoices and contacts.
export function useDeleteArtwork() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("artworks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artworks"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
    },
  });
}
