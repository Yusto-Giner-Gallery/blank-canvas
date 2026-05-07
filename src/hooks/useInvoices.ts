import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Contact,
  Invoice,
  InvoiceLine,
} from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export type InvoiceListItem = Invoice & {
  contact: Pick<Contact, "id" | "full_name" | "email"> | null;
  total_eur: number;
};

type Row = Invoice & {
  contact: Pick<Contact, "id" | "full_name" | "email"> | null;
  invoice_lines: Array<{ amount_eur: number; discount_eur: number }>;
};

function totalFor(lines: Array<{ amount_eur: number; discount_eur: number }>) {
  return lines.reduce((sum, l) => sum + (l.amount_eur - l.discount_eur), 0);
}

export function useInvoices() {
  const { profile } = useProfile();
  return useQuery<InvoiceListItem[]>({
    queryKey: ["invoices", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          contact:contacts ( id, full_name, email ),
          invoice_lines ( amount_eur, discount_eur )
          `,
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .returns<Row[]>();
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        total_eur: totalFor(r.invoice_lines ?? []),
      }));
    },
  });
}

export type InvoiceWithLines = Invoice & {
  contact: Contact | null;
  lines: InvoiceLine[];
};

type DetailRow = Invoice & {
  contact: Contact | null;
  invoice_lines: InvoiceLine[];
};

export function useInvoice(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery<InvoiceWithLines | null>({
    queryKey: ["invoice", id ?? null],
    enabled: !!profile && !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          contact:contacts ( * ),
          invoice_lines ( * )
          `,
        )
        .eq("id", id)
        .maybeSingle<DetailRow>();
      if (error) throw error;
      if (!data) return null;
      const lines = (data.invoice_lines ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order);
      return {
        ...data,
        contact: data.contact,
        lines,
      };
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<Invoice, Error, { contact_id: string }>({
    mutationFn: async ({ contact_id }) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("invoices")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          contact_id,
          status: "draft",
          currency: "EUR",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      id: string;
      patch: Partial<
        Pick<Invoice, "status" | "notes" | "stripe_payment_link" | "issued_at" | "contact_id">
      >;
    }
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from("invoices").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

// Replace all lines for an invoice with the supplied list. Simpler than
// per-line diffing; fine for the small line counts a gallery deals with.
export function useReplaceInvoiceLines() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      invoice_id: string;
      lines: Array<{
        artwork_id: string | null;
        description: string;
        amount_eur: number;
        discount_eur: number;
      }>;
    }
  >({
    mutationFn: async ({ invoice_id, lines }) => {
      const { error: delErr } = await supabase
        .from("invoice_lines")
        .delete()
        .eq("invoice_id", invoice_id);
      if (delErr) throw delErr;
      if (lines.length === 0) return;
      const rows = lines.map((l, i) => ({
        id: crypto.randomUUID(),
        invoice_id,
        artwork_id: l.artwork_id,
        description: l.description,
        amount_eur: l.amount_eur,
        discount_eur: l.discount_eur,
        sort_order: i,
      }));
      const { error: insErr } = await supabase.from("invoice_lines").insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice", vars.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "cancelled",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useCreateStripePaymentLink() {
  const qc = useQueryClient();
  return useMutation<{ url: string }, Error, { invoice_id: string }>({
    mutationFn: async ({ invoice_id }) => {
      // Edge function lives on Lovable Cloud (CLAUDE.md §13). It validates
      // the caller, builds a Stripe payment link from invoice_lines, and
      // patches invoices.stripe_payment_link with the returned URL.
      const { data, error } = await supabase.functions.invoke<{ url: string }>(
        "create-payment-link",
        { body: { invoice_id } },
      );
      if (error) throw error;
      if (!data?.url) throw new Error("Edge function did not return a URL");
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice", vars.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
