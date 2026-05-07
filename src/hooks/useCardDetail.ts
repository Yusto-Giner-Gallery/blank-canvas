import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  CardAttachment,
  CardChecklistItem,
  CardComment,
  CardMember,
  Profile,
} from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

// --- Members ---

export function useCardMembers(card_id: string | undefined) {
  return useQuery<Array<CardMember & { profile: Profile | null }>>({
    queryKey: ["card_members", card_id ?? null],
    enabled: !!card_id,
    queryFn: async () => {
      if (!card_id) return [];
      const { data, error } = await supabase
        .from("card_members")
        .select("card_id, profile_id, profile:profiles(*)")
        .eq("card_id", card_id)
        .returns<Array<CardMember & { profile: Profile | null }>>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddCardMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, { card_id: string; profile_id: string }>({
    mutationFn: async ({ card_id, profile_id }) => {
      const { error } = await supabase
        .from("card_members")
        .insert({ card_id, profile_id });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_members", vars.card_id] });
    },
  });
}

export function useRemoveCardMember() {
  const qc = useQueryClient();
  return useMutation<void, Error, { card_id: string; profile_id: string }>({
    mutationFn: async ({ card_id, profile_id }) => {
      const { error } = await supabase
        .from("card_members")
        .delete()
        .eq("card_id", card_id)
        .eq("profile_id", profile_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_members", vars.card_id] });
    },
  });
}

// --- Checklist ---

export function useCardChecklist(card_id: string | undefined) {
  return useQuery<CardChecklistItem[]>({
    queryKey: ["card_checklist", card_id ?? null],
    enabled: !!card_id,
    queryFn: async () => {
      if (!card_id) return [];
      const { data, error } = await supabase
        .from("card_checklist")
        .select("*")
        .eq("card_id", card_id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { card_id: string; text: string }>({
    mutationFn: async ({ card_id, text }) => {
      const { data: existing, error: existingErr } = await supabase
        .from("card_checklist")
        .select("sort_order")
        .eq("card_id", card_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (existingErr) throw existingErr;
      const sort_order = (existing?.[0]?.sort_order ?? -1) + 1;
      const { error } = await supabase
        .from("card_checklist")
        .insert({ id: crypto.randomUUID(), card_id, text, done: false, sort_order });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_checklist", vars.card_id] });
    },
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { card_id: string; id: string; done: boolean }>({
    mutationFn: async ({ id, done }) => {
      const { error } = await supabase
        .from("card_checklist")
        .update({ done })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_checklist", vars.card_id] });
    },
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation<void, Error, { card_id: string; id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("card_checklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_checklist", vars.card_id] });
    },
  });
}

// --- Comments ---

export type CardCommentRow = CardComment & {
  author: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export function useCardComments(card_id: string | undefined) {
  return useQuery<CardCommentRow[]>({
    queryKey: ["card_comments", card_id ?? null],
    enabled: !!card_id,
    queryFn: async () => {
      if (!card_id) return [];
      const { data, error } = await supabase
        .from("card_comments")
        .select("*, author:profiles(id, full_name, email)")
        .eq("card_id", card_id)
        .order("created_at", { ascending: true })
        .returns<CardCommentRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddCardComment() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<void, Error, { card_id: string; body: string }>({
    mutationFn: async ({ card_id, body }) => {
      if (!profile) throw new Error("No profile");
      const { error } = await supabase.from("card_comments").insert({
        id: crypto.randomUUID(),
        card_id,
        profile_id: profile.id,
        body,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_comments", vars.card_id] });
    },
  });
}

// --- Attachments ---

export function useCardAttachments(card_id: string | undefined) {
  return useQuery<CardAttachment[]>({
    queryKey: ["card_attachments", card_id ?? null],
    enabled: !!card_id,
    queryFn: async () => {
      if (!card_id) return [];
      const { data, error } = await supabase
        .from("card_attachments")
        .select("*")
        .eq("card_id", card_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function attachmentUrl(storage_path: string) {
  const { data } = supabase.storage.from("card-attachments").getPublicUrl(storage_path);
  return data.publicUrl;
}

export function useUploadCardAttachment() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<void, Error, { card_id: string; file: File }>({
    mutationFn: async ({ card_id, file }) => {
      if (!profile) throw new Error("No profile");
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storage_path = `${profile.gallery_id}/${card_id}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("card-attachments")
        .upload(storage_path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("card_attachments").insert({
        id: crypto.randomUUID(),
        card_id,
        storage_path,
        name: file.name,
        size_bytes: file.size,
        uploaded_by: profile.id,
      });
      if (insErr) throw insErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_attachments", vars.card_id] });
    },
  });
}

export function useDeleteCardAttachment() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { card_id: string; id: string; storage_path: string }
  >({
    mutationFn: async ({ id, storage_path }) => {
      const { error: stErr } = await supabase.storage
        .from("card-attachments")
        .remove([storage_path]);
      if (stErr) throw stErr;
      const { error: delErr } = await supabase
        .from("card_attachments")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["card_attachments", vars.card_id] });
    },
  });
}
