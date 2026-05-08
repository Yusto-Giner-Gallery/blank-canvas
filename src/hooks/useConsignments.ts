import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";
import type {
  Consignment,
  ConsignmentStatus,
  Contact,
} from "@/integrations/supabase/domain";

export type ConsignmentWithPartner = Consignment & {
  partner: Pick<Contact, "id" | "full_name" | "email"> | null;
};

export function useActiveConsignment(artwork_id: string | undefined) {
  return useQuery<ConsignmentWithPartner | null>({
    queryKey: ["consignment-active", artwork_id ?? null],
    enabled: !!artwork_id,
    queryFn: async () => {
      if (!artwork_id) return null;
      const { data, error } = await supabase
        .from("consignments")
        .select(
          "*, partner:contacts!consignments_partner_contact_id_fkey ( id, full_name, email )",
        )
        .eq("artwork_id", artwork_id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle<ConsignmentWithPartner>();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateConsignment() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Consignment,
    Error,
    {
      artwork_id: string;
      partner_contact_id: string;
      start_date: string;
      end_date: string | null;
      split_pct: number;
      notes: string | null;
    }
  >({
    mutationFn: async (input) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("consignments")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          artwork_id: input.artwork_id,
          partner_contact_id: input.partner_contact_id,
          start_date: input.start_date,
          end_date: input.end_date,
          split_pct: input.split_pct,
          notes: input.notes,
          status: "active",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["consignment-active", vars.artwork_id],
      });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

export function useEndConsignment() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      consignment_id: string;
      artwork_id: string;
      next_status: ConsignmentStatus;
    }
  >({
    mutationFn: async ({ consignment_id, next_status }) => {
      const { error } = await supabase
        .from("consignments")
        .update({ status: next_status })
        .eq("id", consignment_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: ["consignment-active", vars.artwork_id],
      });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}
