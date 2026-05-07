import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ContactActivityKind } from "@/integrations/supabase/domain";

export function useLogContactActivity() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      contact_id: string;
      kind: ContactActivityKind;
      ref_id?: string | null;
      note?: string | null;
    }
  >({
    mutationFn: async ({ contact_id, kind, ref_id = null, note = null }) => {
      const { error } = await supabase.from("contact_activity").insert({
        id: crypto.randomUUID(),
        contact_id,
        kind,
        ref_id,
        note,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contact_activity", vars.contact_id] });
    },
  });
}
