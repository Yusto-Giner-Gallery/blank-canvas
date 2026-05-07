import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ArtworkStatus } from "@/integrations/supabase/types";

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
