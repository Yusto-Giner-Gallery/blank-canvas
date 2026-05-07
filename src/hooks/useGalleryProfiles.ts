import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

// All profiles in the current gallery — used for member pickers and
// comment author lookups. RLS scopes the rows.
export function useGalleryProfiles() {
  const { profile } = useProfile();
  return useQuery<Profile[]>({
    queryKey: ["gallery_profiles", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
