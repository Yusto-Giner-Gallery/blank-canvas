import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  ArtworkListItem,
  Dossier,
  DossierBodyBlocks,
  DossierKind,
} from "@/integrations/supabase/types";
import { useProfile } from "./useProfile";

export function useDossiers() {
  const { profile } = useProfile();
  return useQuery<Dossier[]>({
    queryKey: ["dossiers", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dossiers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDossier(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery<Dossier | null>({
    queryKey: ["dossier", id ?? null],
    enabled: !!profile && !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("dossiers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Resolves the artworks referenced by `image_layout` from the cached
// artworks list, preserving order.
export function useDossierArtworks(
  layout: string[] | undefined,
  artworks: ArtworkListItem[] | undefined,
): ArtworkListItem[] {
  if (!layout || !artworks) return [];
  const byId = new Map(artworks.map((a) => [a.id, a]));
  return layout
    .map((id) => byId.get(id))
    .filter((a): a is ArtworkListItem => !!a);
}

export function useCreateDossier() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Dossier,
    Error,
    {
      kind: DossierKind;
      title: string;
      contact_id?: string | null;
      artwork_ids: string[];
      body_blocks?: DossierBodyBlocks;
    }
  >({
    mutationFn: async ({
      kind,
      title,
      contact_id = null,
      artwork_ids,
      body_blocks = {},
    }) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("dossiers")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          kind,
          title,
          contact_id,
          body_blocks,
          image_layout: artwork_ids,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dossiers"] }),
  });
}

export function useUpdateDossier() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      id: string;
      patch: Partial<
        Pick<
          Dossier,
          "title" | "kind" | "body_blocks" | "image_layout" | "contact_id"
        >
      >;
    }
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("dossiers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["dossier", vars.id] });
      qc.invalidateQueries({ queryKey: ["dossiers"] });
    },
  });
}
