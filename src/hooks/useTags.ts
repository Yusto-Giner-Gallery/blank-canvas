import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tag } from "@/integrations/supabase/types";
import { useProfile } from "./useProfile";

export function useTags() {
  const { profile } = useProfile();

  return useQuery<Tag[]>({
    queryKey: ["tags", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
