import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Location } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export function useLocations() {
  const { profile } = useProfile();

  return useQuery<Location[]>({
    queryKey: ["locations", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
