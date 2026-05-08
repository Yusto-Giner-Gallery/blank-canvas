import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

export type ArtworkImage = {
  id: string;
  artwork_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
};

export function useArtworkImages(artwork_id: string | undefined) {
  return useQuery<ArtworkImage[]>({
    queryKey: ["artwork-images", artwork_id ?? null],
    enabled: !!artwork_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artwork_images")
        .select("id, artwork_id, storage_path, is_primary, sort_order")
        .eq("artwork_id", artwork_id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, artwork_id: string) {
  qc.invalidateQueries({ queryKey: ["artwork-images", artwork_id] });
  qc.invalidateQueries({ queryKey: ["artworks"] });
}

export function useAddArtworkImages() {
  const { profile } = useProfile();
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { artwork_id: string; files: File[]; existing_count: number }
  >({
    mutationFn: async ({ artwork_id, files, existing_count }) => {
      if (!profile) throw new Error("No profile loaded");
      let nextOrder = existing_count;
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${profile.gallery_id}/${artwork_id}/${crypto.randomUUID()}-${safeName}`;
        const { error: stErr } = await supabase.storage
          .from("artwork-images")
          .upload(path, file, { upsert: false });
        if (stErr) throw stErr;
        const { error: imgErr } = await supabase.from("artwork_images").insert({
          id: crypto.randomUUID(),
          artwork_id,
          storage_path: path,
          // First-ever image becomes primary; subsequent additions don't
          // displace an existing primary.
          is_primary: nextOrder === 0,
          sort_order: nextOrder,
        });
        if (imgErr) throw imgErr;
        nextOrder += 1;
      }
    },
    onSuccess: (_d, vars) => invalidate(qc, vars.artwork_id),
  });
}

export function useSetPrimaryImage() {
  const qc = useQueryClient();
  return useMutation<void, Error, { artwork_id: string; image_id: string }>({
    mutationFn: async ({ artwork_id, image_id }) => {
      // Two-step: clear existing primary, then set the chosen one. RLS
      // policy scopes both updates by artwork ownership.
      const { error: clrErr } = await supabase
        .from("artwork_images")
        .update({ is_primary: false })
        .eq("artwork_id", artwork_id);
      if (clrErr) throw clrErr;
      const { error: setErr } = await supabase
        .from("artwork_images")
        .update({ is_primary: true })
        .eq("id", image_id);
      if (setErr) throw setErr;
    },
    onSuccess: (_d, vars) => invalidate(qc, vars.artwork_id),
  });
}

export function useRemoveArtworkImage() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { artwork_id: string; image_id: string; storage_path: string; was_primary: boolean }
  >({
    mutationFn: async ({ artwork_id, image_id, storage_path, was_primary }) => {
      const { error: delRowErr } = await supabase
        .from("artwork_images")
        .delete()
        .eq("id", image_id);
      if (delRowErr) throw delRowErr;
      // Best-effort storage cleanup: if it fails (e.g. orphaned object)
      // we still consider the image removed from the artwork.
      await supabase.storage.from("artwork-images").remove([storage_path]);

      // Promote the next image to primary so the artwork always has one
      // when at least one image remains.
      if (was_primary) {
        const { data: remaining } = await supabase
          .from("artwork_images")
          .select("id")
          .eq("artwork_id", artwork_id)
          .order("sort_order", { ascending: true })
          .limit(1);
        const next = remaining?.[0];
        if (next) {
          await supabase
            .from("artwork_images")
            .update({ is_primary: true })
            .eq("id", next.id);
        }
      }
    },
    onSuccess: (_d, vars) => invalidate(qc, vars.artwork_id),
  });
}
