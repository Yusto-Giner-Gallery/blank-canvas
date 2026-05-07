import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Artwork,
  Contact,
  Deal,
  DealStage,
  Invoice,
} from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export type DealListItem = Deal & {
  contact: Pick<Contact, "id" | "full_name" | "email"> | null;
  artwork: Pick<Artwork, "id" | "title" | "internal_id" | "price_eur"> | null;
};

type Row = Deal & {
  contact: Pick<Contact, "id" | "full_name" | "email"> | null;
  artwork: Pick<Artwork, "id" | "title" | "internal_id" | "price_eur"> | null;
};

export function useDeals() {
  const { profile } = useProfile();
  return useQuery<DealListItem[]>({
    queryKey: ["deals", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(
          `
          *,
          contact:contacts ( id, full_name, email ),
          artwork:artworks ( id, title, internal_id, price_eur )
          `,
        )
        .order("updated_at", { ascending: false })
        .returns<Row[]>();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    Deal,
    Error,
    {
      contact_id: string;
      artwork_id?: string | null;
      title: string;
      value_eur?: number | null;
    }
  >({
    mutationFn: async ({ contact_id, artwork_id = null, title, value_eur = null }) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("deals")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          contact_id,
          artwork_id,
          title,
          stage: "lead",
          value_eur,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}

// Auto-generated draft invoice when a deal moves to `won`. Returns the
// new invoice id (or null if the deal moves to a non-won stage). The
// caller decides whether to navigate or just toast — keeps the side
// effect explicit.
export function useUpdateDealStage() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    { invoice_id: string | null },
    Error,
    { deal: DealListItem; next_stage: DealStage }
  >({
    mutationFn: async ({ deal, next_stage }) => {
      const { error: stageErr } = await supabase
        .from("deals")
        .update({ stage: next_stage })
        .eq("id", deal.id);
      if (stageErr) throw stageErr;

      let invoice_id: string | null = null;
      if (next_stage === "won" && profile) {
        const inv: Invoice["id"] = crypto.randomUUID();
        const { error: invErr } = await supabase.from("invoices").insert({
          id: inv,
          gallery_id: profile.gallery_id,
          contact_id: deal.contact_id,
          status: "draft",
          currency: "EUR",
          notes: `Auto-generated from deal "${deal.title}".`,
        });
        if (invErr) throw invErr;
        if (deal.artwork_id) {
          const amount =
            deal.value_eur ?? deal.artwork?.price_eur ?? 0;
          const desc = deal.artwork?.title
            ? `${deal.artwork.title}${
                deal.artwork.internal_id ? ` (${deal.artwork.internal_id})` : ""
              }`
            : deal.title;
          const { error: lineErr } = await supabase.from("invoice_lines").insert({
            id: crypto.randomUUID(),
            invoice_id: inv,
            artwork_id: deal.artwork_id,
            description: desc,
            amount_eur: amount,
            discount_eur: 0,
            sort_order: 0,
          });
          if (lineErr) throw lineErr;
        }
        invoice_id = inv;
      }
      return { invoice_id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { id: string; patch: Partial<Pick<Deal, "title" | "value_eur" | "notes" | "artwork_id">> }
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("deals").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });
}
