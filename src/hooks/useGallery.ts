import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Gallery } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export function useGallery() {
  const { profile } = useProfile();
  return useQuery<Gallery | null>({
    queryKey: ["gallery", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from("galleries")
        .select("*")
        .eq("id", profile.gallery_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
