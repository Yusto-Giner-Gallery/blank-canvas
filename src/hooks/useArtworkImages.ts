import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";
import type { ArtworkImage } from "@/integrations/supabase/domain";

export function useArtworkImages(artwork_id: string | undefined) {
  return useQuery<ArtworkImage[]>({
    queryKey: ["artwork-images", artwork_id ?? null],
    enabled: !!artwork_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artwork_images")
        .select("*")
        .eq("artwork_id", artwork_id!)
        .order("is_primary", { ascending: false })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddArtworkImages() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    void,
    Error,
    { artwork_id: string; files: File[] }
  >({
    mutationFn: async ({ artwork_id, files }) => {
      if (!profile) throw new Error("No profile");
      // Find current max sort_order so new uploads append.
      const { data: existing } = await supabase
        .from("artwork_images")
        .select("sort_order, is_primary")
        .eq("artwork_id", artwork_id);
      const hasPrimary = (existing ?? []).some((r) => r.is_primary);
      let nextSort =
        (existing ?? []).reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;

      for (const file of files) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${profile.gallery_id}/${artwork_id}/${Date.now()}_${safe}`;
        const { error: stErr } = await supabase.storage
          .from("artwork-images")
          .upload(path, file, { upsert: false });
        if (stErr) throw stErr;
        const { error: insErr } = await supabase.from("artwork_images").insert({
          id: crypto.randomUUID(),
          artwork_id,
          storage_path: path,
          sort_order: nextSort,
          // First image ever uploaded becomes primary if there isn't one.
          is_primary: !hasPrimary && nextSort === 0,
        });
        if (insErr) throw insErr;
        nextSort += 1;
      }
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["artwork-images", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

export function useSetPrimaryImage() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { artwork_id: string; image_id: string }
  >({
    mutationFn: async ({ artwork_id, image_id }) => {
      const { error: clearErr } = await supabase
        .from("artwork_images")
        .update({ is_primary: false })
        .eq("artwork_id", artwork_id);
      if (clearErr) throw clearErr;
      const { error } = await supabase
        .from("artwork_images")
        .update({ is_primary: true })
        .eq("id", image_id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["artwork-images", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

export function useDeleteArtworkImage() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { artwork_id: string; image_id: string; storage_path: string }
  >({
    mutationFn: async ({ image_id, storage_path }) => {
      // Best-effort storage cleanup; row is the source of truth.
      await supabase.storage.from("artwork-images").remove([storage_path]);
      const { error } = await supabase
        .from("artwork_images")
        .delete()
        .eq("id", image_id);
      if (error) throw error;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: ["artwork-images", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}
