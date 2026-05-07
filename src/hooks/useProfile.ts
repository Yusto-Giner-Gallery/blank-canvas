import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

export function useProfile() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery<Profile | null>({
    queryKey: ["profile", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  return {
    profile: query.data ?? null,
    loading: authLoading || (!!user && query.isLoading),
    error: query.error as Error | null,
    isAdmin: query.data?.role === "admin",
  };
}
