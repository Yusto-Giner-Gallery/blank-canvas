import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Artist } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export function useArtists() {
  const { profile } = useProfile();

  return useQuery<Artist[]>({
    queryKey: ["artists", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
