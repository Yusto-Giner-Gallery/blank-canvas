import { supabase } from "@/lib/supabase";

// Lookup-first artist resolution shared between bulk upload and the
// artwork-detail edit form. Case-insensitive name match within the
// gallery; creates a row if no match.
export async function resolveArtist(
  gallery_id: string,
  opts: { artist_id?: string | null; new_name?: string | null },
): Promise<string> {
  if (opts.artist_id) return opts.artist_id;
  const trimmed = (opts.new_name ?? "").trim();
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
