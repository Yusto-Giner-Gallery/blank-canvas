import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useInvoices } from "@/hooks/useInvoices";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

// Appends one line referencing this artwork to the chosen draft invoice.
// Only draft invoices are listed — committing to a sent or paid one is
// out of scope (the caller would Cancel + re-issue).
export function AddToInvoiceDialog({
  artwork_id,
  artwork_title,
  internal_id,
  default_amount,
  onClose,
}: {
  artwork_id: string;
  artwork_title: string;
  internal_id: string;
  default_amount: number | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invoicesQuery = useInvoices();

  const drafts = useMemo(
    () =>
      (invoicesQuery.data ?? []).filter((inv) => inv.status === "draft"),
    [invoicesQuery.data],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onPick(invoice_id: string) {
    try {
      const { data: existing, error: existErr } = await supabase
        .from("invoice_lines")
        .select("sort_order")
        .eq("invoice_id", invoice_id);
      if (existErr) throw existErr;
      const nextSort =
        (existing ?? []).reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
      const { error } = await supabase.from("invoice_lines").insert({
        id: crypto.randomUUID(),
        invoice_id,
        artwork_id,
        description: `${artwork_title} (${internal_id})`,
        amount_eur: default_amount ?? 0,
        discount_eur: 0,
        sort_order: nextSort,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["invoice", invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Line added", {
        action: {
          label: "Open invoice",
          onClick: () => navigate(`/invoices/${invoice_id}`),
        },
      });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Add to transaction"
        className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Add to transaction
          </h2>
          <p className="text-sm text-muted-foreground">
            Append <span className="font-medium">{artwork_title}</span> to a
            draft invoice.
          </p>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No draft invoices.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                onClose();
                navigate("/invoices");
              }}
            >
              Create one
            </button>{" "}
            and come back.
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Drafts</Label>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {drafts.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => onPick(inv.id)}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">
                    {inv.contact?.full_name ?? "—"}
                    <span className="text-muted-foreground">
                      {" "}
                      · {inv.id.slice(0, 8)}
                    </span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {new Intl.NumberFormat("en-IE", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(inv.total_eur)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
