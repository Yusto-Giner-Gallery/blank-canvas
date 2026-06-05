import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Artist } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export function useArtists() {
  const { profile } = useProfile();

  return useQuery<Artist[]>({
    queryKey: ["artists", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useArtist(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery<Artist | null>({
    queryKey: ["artist", id ?? null],
    enabled: !!profile && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

// Soft delete (1.8): stamp deleted_at so the artist drops out of every
// query that filters `is("deleted_at", null)` without losing history.
// Same pattern as artworks/contacts/invoices.
export function useDeleteArtist() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("artists")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artists"] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

// Patch artist profile fields (5.1 — bio / nationality). Kept here so all
// artist mutations live together.
export function useUpdateArtist() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; patch: Partial<Pick<Artist, "name" | "nationality" | "bio">> }
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("artists").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["artists"] });
      qc.invalidateQueries({ queryKey: ["artist", id] });
    },
  });
}
