import { supabase } from "@/lib/supabase";

// Shared by useUploadArtworks (bulk upload) and ArtworkDetail (edit mode).
// Lookup-first prevents duplicate artist rows when the same new artist
// name is supplied across batches before a DB unique constraint exists.
export async function resolveArtist(
  gallery_id: string,
  input: { artist_id: string | null; artist_name_new: string | null },
): Promise<string> {
  if (input.artist_id) return input.artist_id;
  if (!input.artist_name_new) throw new Error("No artist selected");
  const trimmed = input.artist_name_new.trim();
  if (!trimmed) throw new Error("No artist selected");

  const { data: existing } = await supabase
    .from("artists")
    .select("id")
    .eq("gallery_id", gallery_id)
    .ilike("name", trimmed)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("artists")
    .insert({
      id: crypto.randomUUID(),
      gallery_id,
      name: trimmed,
      nationality: null,
      bio: null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}
