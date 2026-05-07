import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ArtworkStatus } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export type DraftArtwork = {
  client_key: string;
  file: File;
  title: string;
  internal_id: string;
  artist_id: string | null;
  artist_name_new: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  price_eur: number | null;
  location_id: string | null;
  status: ArtworkStatus;
  year: number | null;
};

export type UploadOutcome = {
  client_key: string;
  artwork_id: string | null;
  error: string | null;
};

async function resolveArtist(
  gallery_id: string,
  draft: DraftArtwork,
): Promise<string> {
  if (draft.artist_id) return draft.artist_id;
  if (!draft.artist_name_new) throw new Error("No artist selected");
  const { data, error } = await supabase
    .from("artists")
    .insert({
      id: crypto.randomUUID(),
      gallery_id,
      name: draft.artist_name_new,
      nationality: null,
      bio: null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function uploadOne(
  gallery_id: string,
  draft: DraftArtwork,
): Promise<string> {
  const artist_id = await resolveArtist(gallery_id, draft);
  const artwork_id = crypto.randomUUID();

  const { error: artErr } = await supabase.from("artworks").insert({
    id: artwork_id,
    gallery_id,
    internal_id: draft.internal_id,
    title: draft.title,
    artist_id,
    year: draft.year,
    medium: null,
    width_cm: draft.width_cm,
    height_cm: draft.height_cm,
    depth_cm: draft.depth_cm,
    price_eur: draft.price_eur,
    location_id: draft.location_id,
    status: draft.status,
    notes: null,
  });
  if (artErr) throw artErr;

  const safeName = draft.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${gallery_id}/${artwork_id}/${safeName}`;
  const { error: stErr } = await supabase.storage
    .from("artwork-images")
    .upload(path, draft.file, { upsert: false });
  if (stErr) throw stErr;

  const { error: imgErr } = await supabase.from("artwork_images").insert({
    id: crypto.randomUUID(),
    artwork_id,
    storage_path: path,
    sort_order: 0,
    is_primary: true,
  });
  if (imgErr) throw imgErr;

  return artwork_id;
}

export function useUploadArtworks() {
  const { profile } = useProfile();
  const qc = useQueryClient();

  return useMutation<UploadOutcome[], Error, DraftArtwork[]>({
    mutationFn: async (drafts) => {
      if (!profile) throw new Error("No profile loaded");
      const results: UploadOutcome[] = [];
      for (const d of drafts) {
        try {
          const artwork_id = await uploadOne(profile.gallery_id, d);
          results.push({ client_key: d.client_key, artwork_id, error: null });
        } catch (e) {
          results.push({
            client_key: d.client_key,
            artwork_id: null,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artworks"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
    },
  });
}
