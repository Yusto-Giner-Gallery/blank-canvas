import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";
import type { ArtworkDocument } from "@/integrations/supabase/domain";

const BUCKET = "artwork-documents";
const MAX_BYTES = 25 * 1024 * 1024;

export function useArtworkDocuments(artwork_id: string | undefined) {
  return useQuery<ArtworkDocument[]>({
    queryKey: ["artwork-documents", artwork_id ?? null],
    enabled: !!artwork_id,
    queryFn: async () => {
      if (!artwork_id) return [];
      const { data, error } = await supabase
        .from("artwork_documents")
        .select("*")
        .eq("artwork_id", artwork_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUploadArtworkDocument() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    ArtworkDocument,
    Error,
    { artwork_id: string; file: File }
  >({
    mutationFn: async ({ artwork_id, file }) => {
      if (!profile) throw new Error("No profile");
      if (file.size > MAX_BYTES) {
        throw new Error("File exceeds 25 MB cap");
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${profile.gallery_id}/${artwork_id}/${Date.now()}_${safe}`;
      const { error: stErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (stErr) throw stErr;
      const { data, error } = await supabase
        .from("artwork_documents")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          artwork_id,
          storage_path: path,
          filename: file.name,
          mime_type: file.type || null,
          byte_size: file.size,
          uploaded_by: profile.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["artwork-documents", vars.artwork_id],
      });
    },
  });
}

export function useDeleteArtworkDocument() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { document_id: string; artwork_id: string; storage_path: string }
  >({
    mutationFn: async ({ document_id, storage_path }) => {
      await supabase.storage.from(BUCKET).remove([storage_path]);
      const { error } = await supabase
        .from("artwork_documents")
        .delete()
        .eq("id", document_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["artwork-documents", vars.artwork_id],
      });
    },
  });
}

export function documentUrl(storage_path: string | null | undefined) {
  if (!storage_path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storage_path);
  return data.publicUrl;
}
