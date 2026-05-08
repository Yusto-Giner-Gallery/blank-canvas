import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";
import type { Contact, Loan } from "@/integrations/supabase/domain";

export type LoanWithContact = Loan & {
  contact: Pick<Contact, "id" | "full_name" | "email"> | null;
};

// Active loans for an artwork. Per §6 a partial-unique index restricts
// this to one row, so the caller treats `data?.[0]` as "is on loan".
export function useActiveLoan(artwork_id: string | undefined) {
  return useQuery<LoanWithContact | null>({
    queryKey: ["loan-active", artwork_id ?? null],
    enabled: !!artwork_id,
    queryFn: async () => {
      if (!artwork_id) return null;
      const { data, error } = await supabase
        .from("loans")
        .select("*, contact:contacts ( id, full_name, email )")
        .eq("artwork_id", artwork_id)
        .in("status", ["active", "overdue"])
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle<LoanWithContact>();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Loan,
    Error,
    {
      artwork_id: string;
      contact_id: string;
      start_date: string;
      end_date: string;
      notes: string | null;
    }
  >({
    mutationFn: async (input) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("loans")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          artwork_id: input.artwork_id,
          contact_id: input.contact_id,
          start_date: input.start_date,
          end_date: input.end_date,
          notes: input.notes,
          status: "active",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loan-active", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

export function useEndLoan() {
  const qc = useQueryClient();
  return useMutation<void, Error, { loan_id: string; artwork_id: string }>({
    mutationFn: async ({ loan_id }) => {
      const { error } = await supabase
        .from("loans")
        .update({ status: "returned" })
        .eq("id", loan_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["loan-active", vars.artwork_id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}
