import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/integrations/supabase/types";
import { useProfile } from "./useProfile";

type FeedbackReport = Database["public"]["Tables"]["feedback_reports"]["Row"];
type ProfileLite = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "email"
>;

export type FeedbackListItem = FeedbackReport & {
  reporter: ProfileLite | null;
};

export function useFeedback() {
  const { profile, isAdmin } = useProfile();

  return useQuery<FeedbackListItem[]>({
    queryKey: ["feedback", profile?.gallery_id ?? null],
    enabled: !!profile && isAdmin,
    queryFn: async () => {
      // No FK on feedback_reports.profile_id (per the applied migration),
      // so we can't embed via PostgREST. Two queries + client-side join.
      const [reports, profiles] = await Promise.all([
        supabase
          .from("feedback_reports")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (reports.error) throw reports.error;
      if (profiles.error) throw profiles.error;
      const map = new Map<string, ProfileLite>(
        (profiles.data ?? []).map((p) => [p.id, p]),
      );
      return (reports.data ?? []).map((r) => ({
        ...r,
        reporter: map.get(r.profile_id) ?? null,
      }));
    },
  });
}
