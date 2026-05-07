import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  ActivityEntityType,
  ActivityLog,
  Profile,
} from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export type ActivityLogRow = ActivityLog & {
  actor: Pick<Profile, "id" | "full_name" | "email"> | null;
};

// Reads the last `limit` activity_log rows for an entity, joined with the
// acting profile. Trigger that writes these lives on Lovable
// (`log_change()` per CLAUDE.md §13). Until then the table is empty and
// the UI shows the empty state.
export function useActivityLog(
  entity_type: ActivityEntityType,
  entity_id: string | undefined,
  limit = 20,
) {
  const { profile } = useProfile();
  return useQuery<ActivityLogRow[]>({
    queryKey: ["activity_log", entity_type, entity_id ?? null, limit],
    enabled: !!profile && !!entity_id,
    queryFn: async () => {
      if (!entity_id) return [];
      const { data, error } = await supabase
        .from("activity_log")
        .select("*, actor:profiles(id, full_name, email)")
        .eq("entity_type", entity_type)
        .eq("entity_id", entity_id)
        .order("created_at", { ascending: false })
        .limit(limit)
        .returns<ActivityLogRow[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}
