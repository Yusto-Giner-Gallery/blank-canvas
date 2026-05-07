import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";
import type { ParsedRow } from "@/lib/csv";

export type ImportOutcome = {
  index: number;
  artwork_id: string | null;
  error: string | null;
};

export function useImportArtworks() {
  const qc = useQueryClient();
  const { profile } = useProfile();

  return useMutation<ImportOutcome[], Error, ParsedRow[]>({
    mutationFn: async (rows) => {
      if (!profile) throw new Error("No profile");
      const gallery_id = profile.gallery_id;

      const { data: artists, error: aErr } = await supabase
        .from("artists")
        .select("id, name");
      if (aErr) throw aErr;
      const artistByName = new Map<string, string>();
      (artists ?? []).forEach((a) =>
        artistByName.set(a.name.trim().toLowerCase(), a.id),
      );

      const { data: locations, error: lErr } = await supabase
        .from("locations")
        .select("id, name");
      if (lErr) throw lErr;
      const locationByName = new Map<string, string>();
      (locations ?? []).forEach((l) =>
        locationByName.set(l.name.trim().toLowerCase(), l.id),
      );

      // Compute next internal_id base for rows that omit it.
      const { data: existingIds } = await supabase
        .from("artworks")
        .select("internal_id");
      const max = (existingIds ?? [])
        .map((r) => /^YG-(\d+)$/.exec(r.internal_id)?.[1])
        .filter((s): s is string => !!s)
        .map((n) => parseInt(n, 10))
        .reduce((a, b) => Math.max(a, b), 0);

      const results: ImportOutcome[] = [];
      let cursor = max;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.errors.length > 0) {
          results.push({
            index: i,
            artwork_id: null,
            error: row.errors.join("; "),
          });
          continue;
        }

        try {
          const key = row.artist_name.trim().toLowerCase();
          let artist_id = artistByName.get(key);
          if (!artist_id) {
            const id = crypto.randomUUID();
            const { error } = await supabase.from("artists").insert({
              id,
              gallery_id,
              name: row.artist_name,
              nationality: row.artist_nationality,
              bio: null,
            });
            if (error) throw error;
            artist_id = id;
            artistByName.set(key, id);
          }

          let location_id: string | null = null;
          if (row.location_name) {
            const lkey = row.location_name.trim().toLowerCase();
            location_id = locationByName.get(lkey) ?? null;
            if (!location_id) {
              const id = crypto.randomUUID();
              const { error } = await supabase.from("locations").insert({
                id,
                gallery_id,
                name: row.location_name,
              });
              if (error) throw error;
              location_id = id;
              locationByName.set(lkey, id);
            }
          }

          let internal_id = row.internal_id;
          if (!internal_id) {
            cursor += 1;
            internal_id = `YG-${String(cursor).padStart(4, "0")}`;
          }

          const artwork_id = crypto.randomUUID();
          const { error: insErr } = await supabase.from("artworks").insert({
            id: artwork_id,
            gallery_id,
            internal_id,
            title: row.title,
            artist_id,
            year: row.year,
            medium: row.medium,
            width_cm: row.width_cm,
            height_cm: row.height_cm,
            depth_cm: row.depth_cm,
            price_eur: row.price_eur,
            location_id,
            status: row.status,
            notes: row.notes,
          });
          if (insErr) throw insErr;
          results.push({ index: i, artwork_id, error: null });
        } catch (e) {
          results.push({
            index: i,
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
      qc.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
