import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export function useTeam() {
  const { profile, isAdmin } = useProfile();
  return useQuery<Profile[]>({
    queryKey: ["team", profile?.gallery_id ?? null],
    enabled: !!profile && isAdmin,
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

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true; user_id: string },
    Error,
    { email: string; full_name?: string }
  >({
    mutationFn: async ({ email, full_name }) => {
      const { data, error } = await supabase.functions.invoke<{
        ok: true;
        user_id: string;
      }>("invite-staff", { body: { email, full_name } });
      if (error) throw error;
      if (!data?.ok) throw new Error("Invite failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
