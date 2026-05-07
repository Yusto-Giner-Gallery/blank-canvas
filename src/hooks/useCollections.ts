import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  ArtworkListItem,
  Collection,
  CollectionKind,
} from "@/integrations/supabase/types";
import { useProfile } from "./useProfile";
import { imageUrl } from "./useArtworks";

export type CollectionWithCount = Collection & { artwork_count: number };

export function useCollections() {
  const { profile } = useProfile();
  return useQuery<CollectionWithCount[]>({
    queryKey: ["collections", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_artworks(count)")
        .order("updated_at", { ascending: false })
        .returns<Array<Collection & { collection_artworks: Array<{ count: number }> }>>();
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        artwork_count: c.collection_artworks?.[0]?.count ?? 0,
      }));
    },
  });
}

type CollectionRowExpanded = Collection & {
  collection_artworks: Array<{
    artwork_id: string;
    sort_order: number;
    artwork: {
      id: string;
      title: string;
      internal_id: string;
      status: string;
      width_cm: number | null;
      height_cm: number | null;
      depth_cm: number | null;
      year: number | null;
      medium: string | null;
      price_eur: number | null;
      location_id: string | null;
      gallery_id: string;
      artist_id: string;
      notes: string | null;
      deleted_at: string | null;
      created_at: string;
      updated_at: string;
      artist: { id: string; name: string } | null;
      location: { id: string; name: string } | null;
      artwork_images: Array<{
        storage_path: string;
        is_primary: boolean;
        sort_order: number;
      }> | null;
    };
  }>;
};

export type CollectionDetail = Collection & {
  artworks: ArtworkListItem[];
};

export function useCollection(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery<CollectionDetail | null>({
    queryKey: ["collection", id ?? null],
    enabled: !!profile && !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("collections")
        .select(
          `
          *,
          collection_artworks (
            artwork_id,
            sort_order,
            artwork:artworks (
              *,
              artist:artists ( id, name ),
              location:locations ( id, name ),
              artwork_images ( storage_path, is_primary, sort_order )
            )
          )
          `,
        )
        .eq("id", id)
        .single<CollectionRowExpanded>();
      if (error) throw error;
      if (!data) return null;
      const items = (data.collection_artworks ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map<ArtworkListItem>((row) => {
          const a = row.artwork;
          const images = a.artwork_images ?? [];
          const primary =
            images.find((i) => i.is_primary) ??
            images.slice().sort((x, y) => x.sort_order - y.sort_order)[0] ??
            null;
          return {
            ...a,
            status: a.status as ArtworkListItem["status"],
            artist: a.artist,
            location: a.location,
            primary_image: primary
              ? { storage_path: primary.storage_path }
              : null,
          };
        });
      return {
        id: data.id,
        gallery_id: data.gallery_id,
        name: data.name,
        kind: data.kind,
        created_at: data.created_at,
        updated_at: data.updated_at,
        artworks: items,
      };
    },
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Collection,
    Error,
    { name: string; kind?: CollectionKind; artwork_ids?: string[] }
  >({
    mutationFn: async ({ name, kind = "other", artwork_ids = [] }) => {
      if (!profile) throw new Error("No profile");
      const id = crypto.randomUUID();
      const { data, error } = await supabase
        .from("collections")
        .insert({ id, gallery_id: profile.gallery_id, name, kind })
        .select("*")
        .single();
      if (error) throw error;
      if (artwork_ids.length > 0) {
        const rows = artwork_ids.map((artwork_id, i) => ({
          collection_id: id,
          artwork_id,
          sort_order: i,
        }));
        const { error: linkErr } = await supabase
          .from("collection_artworks")
          .insert(rows);
        if (linkErr) throw linkErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
    },
  });
}

export function useAddToCollection() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { collection_id: string; artwork_ids: string[] }
  >({
    mutationFn: async ({ collection_id, artwork_ids }) => {
      const { data: existing, error: existingErr } = await supabase
        .from("collection_artworks")
        .select("sort_order")
        .eq("collection_id", collection_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (existingErr) throw existingErr;
      const start = (existing?.[0]?.sort_order ?? -1) + 1;
      const rows = artwork_ids.map((artwork_id, i) => ({
        collection_id,
        artwork_id,
        sort_order: start + i,
      }));
      const { error } = await supabase
        .from("collection_artworks")
        .upsert(rows, { onConflict: "collection_id,artwork_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
    },
  });
}

export function useRemoveFromCollection() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { collection_id: string; artwork_id: string }
  >({
    mutationFn: async ({ collection_id, artwork_id }) => {
      const { error } = await supabase
        .from("collection_artworks")
        .delete()
        .eq("collection_id", collection_id)
        .eq("artwork_id", artwork_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["collections"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
    },
  });
}

export function useReorderCollection() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { collection_id: string; artwork_ids_in_order: string[] }
  >({
    mutationFn: async ({ collection_id, artwork_ids_in_order }) => {
      const rows = artwork_ids_in_order.map((artwork_id, sort_order) => ({
        collection_id,
        artwork_id,
        sort_order,
      }));
      const { error } = await supabase
        .from("collection_artworks")
        .upsert(rows, { onConflict: "collection_id,artwork_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["collection", vars.collection_id] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

// Re-export for convenience
export { imageUrl };
