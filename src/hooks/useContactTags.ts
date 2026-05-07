import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["contacts"] });
  qc.invalidateQueries({ queryKey: ["contact"] });
  qc.invalidateQueries({ queryKey: ["tags"] });
}

export function useAttachContactTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, { contact_id: string; tag_id: string }>({
    mutationFn: async ({ contact_id, tag_id }) => {
      const { error } = await supabase
        .from("contact_tags")
        .insert({ contact_id, tag_id });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDetachContactTag() {
  const qc = useQueryClient();
  return useMutation<void, Error, { contact_id: string; tag_id: string }>({
    mutationFn: async ({ contact_id, tag_id }) => {
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("contact_id", contact_id)
        .eq("tag_id", tag_id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateAndAttachContactTag() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<{ tag_id: string }, Error, { contact_id: string; name: string }>({
    mutationFn: async ({ contact_id, name }) => {
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
        .from("contact_tags")
        .insert({ contact_id, tag_id });
      if (linkErr) throw linkErr;
      return { tag_id };
    },
    onSuccess: () => invalidate(qc),
  });
}
