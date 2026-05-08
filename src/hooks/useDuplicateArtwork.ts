import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

// Clones an artwork row + its image rows. Image rows reuse the same
// storage paths — no re-upload — so the duplicate shares files with the
// original. The new internal_id is suffixed `-COPY` (or `-COPY-N` if a
// previous copy already exists). Returns the new artwork id.
export function useDuplicateArtwork() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<string, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      if (!profile) throw new Error("No profile");

      const { data: src, error: srcErr } = await supabase
        .from("artworks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (srcErr) throw srcErr;
      if (!src) throw new Error("Artwork not found");

      const baseId = `${src.internal_id}-COPY`;
      const { data: clashes, error: clashErr } = await supabase
        .from("artworks")
        .select("internal_id")
        .eq("gallery_id", src.gallery_id)
        .like("internal_id", `${baseId}%`);
      if (clashErr) throw clashErr;
      const taken = new Set((clashes ?? []).map((c) => c.internal_id));
      let nextId = baseId;
      let n = 2;
      while (taken.has(nextId)) {
        nextId = `${baseId}-${n}`;
        n += 1;
      }

      const newId = crypto.randomUUID();
      const { id: _omit, created_at: _c, updated_at: _u, ...rest } = src;
      const { error: insErr } = await supabase.from("artworks").insert({
        ...rest,
        id: newId,
        internal_id: nextId,
        status: "available",
        deleted_at: null,
      });
      if (insErr) throw insErr;

      const { data: imgs, error: imgErr } = await supabase
        .from("artwork_images")
        .select("storage_path, sort_order, is_primary")
        .eq("artwork_id", id);
      if (imgErr) throw imgErr;
      if (imgs && imgs.length > 0) {
        const rows = imgs.map((i) => ({
          id: crypto.randomUUID(),
          artwork_id: newId,
          storage_path: i.storage_path,
          sort_order: i.sort_order,
          is_primary: i.is_primary,
        }));
        const { error: imgInsErr } = await supabase
          .from("artwork_images")
          .insert(rows);
        if (imgInsErr) throw imgInsErr;
      }

      return newId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}
