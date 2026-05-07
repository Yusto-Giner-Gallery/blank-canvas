import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["artworks"] });
  qc.invalidateQueries({ queryKey: ["tags"] });
}

export function useAttachTag() {
  const qc = useQueryClient();
  return useMutation<
    { artwork_id: string; tag_id: string },
    Error,
    { artwork_id: string; tag_id: string }
  >({
    mutationFn: async ({ artwork_id, tag_id }) => {
      const { error } = await supabase
        .from("artwork_tags")
        .insert({ artwork_id, tag_id });
      if (error) throw error;
      return { artwork_id, tag_id };
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDetachTag() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { artwork_id: string; tag_id: string }
  >({
    mutationFn: async ({ artwork_id, tag_id }) => {
      const { error } = await supabase
        .from("artwork_tags")
        .delete()
        .eq("artwork_id", artwork_id)
        .eq("tag_id", tag_id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateAndAttachTag() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    { tag_id: string },
    Error,
    { artwork_id: string; name: string }
  >({
    mutationFn: async ({ artwork_id, name }) => {
      if (!profile) throw new Error("No profile");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Tag name is empty");
      const { data: existing, error: findErr } = await supabase
        .from("tags")
        .select("id, name")
        .ilike("name", trimmed)
        .maybeSingle();
      if (findErr) throw findErr;
      let tag_id = existing?.id;
      if (!tag_id) {
        const { data: created, error: createErr } = await supabase
          .from("tags")
          .insert({
            id: crypto.randomUUID(),
            gallery_id: profile.gallery_id,
            name: trimmed,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        tag_id = created.id;
      }
      const { error: linkErr } = await supabase
        .from("artwork_tags")
        .insert({ artwork_id, tag_id });
      if (linkErr) throw linkErr;
      return { tag_id };
    },
    onSuccess: () => invalidate(qc),
  });
}
