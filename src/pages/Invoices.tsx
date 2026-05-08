import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceStatusPill } from "@/components/invoicing/StatusPill";
import { NewInvoiceModal } from "@/components/invoicing/NewInvoiceModal";
import { useLayoutMode } from "@/lib/layout/LayoutContext";
import { SplitViewLayout } from "@/components/layout/SplitViewLayout";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LocaleContext";
import InvoiceDetail from "./InvoiceDetail";

function formatPrice(eur: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

// Stacked-row compact list — used as the master pane of split view.
// Two-line layout: ID + total on top, contact + date + status on the
// subtitle row. No table chrome; fits the narrow pane without truncation.
function renderInvoicesCompactList({
  invoices,
  peek,
  selectInSplit,
}: {
  invoices: Array<{
    id: string;
    updated_at: string;
    total_eur: number;
    status: import("@/integrations/supabase/domain").InvoiceStatus;
    contact: { full_name: string; email: string } | null;
  }>;
  peek: string | null;
  selectInSplit: (id: string) => void;
}) {
  return (
    <div>
      {invoices.map((inv) => {
        const peeked = peek === inv.id;
        return (
          <button
            key={inv.id}
            type="button"
            onClick={() => selectInSplit(inv.id)}
            className={cn(
              "flex w-full flex-col items-stretch gap-1 border-b border-border px-3 py-2.5 text-left hover:bg-accent/40",
              peeked && "bg-accent/80 ring-1 ring-foreground/20",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-mono text-xs font-medium">
                {inv.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatPrice(inv.total_eur)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {inv.contact?.full_name ?? "—"}
                <span className="hidden sm:inline">
                  {" "}· {new Date(inv.updated_at).toLocaleDateString("en-GB")}
                </span>
              </span>
              <span className="shrink-0">
                <InvoiceStatusPill status={inv.status} />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Table extracted so it can be used standalone (classic) and as the `list`
// slot of SplitViewLayout (split mode), without an IIFE that hid control
// flow inside the JSX.
function renderInvoicesTable({
  invoices,
  splitMode,
  peek,
  selectInSplit,
}: {
  invoices: Array<{
    id: string;
    updated_at: string;
    total_eur: number;
    status: import("@/integrations/supabase/domain").InvoiceStatus;
    contact: { full_name: string; email: string } | null;
  }>;
  splitMode: boolean;
  peek: string | null;
  selectInSplit: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">No.</th>
            <th className="px-3 py-2 text-left font-medium">Contact</th>
            <th className="hidden px-3 py-2 text-left font-medium md:table-cell">
              Updated
            </th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const peeked = peek === inv.id;
            return (
              <tr
                key={inv.id}
                className={cn(
                  "border-t border-border hover:bg-accent/40",
                  peeked && "bg-accent/80",
                )}
              >
                <td className="px-3 py-2 font-mono text-xs">
                  {splitMode ? (
                    <button
                      type="button"
                      onClick={() => selectInSplit(inv.id)}
                      className="hover:underline"
                    >
                      {inv.id.slice(0, 8).toUpperCase()}
                    </button>
                  ) : (
                    <Link to={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.id.slice(0, 8).toUpperCase()}
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2">
                  {inv.contact ? (
                    <span className="block">
                      <span className="block">{inv.contact.full_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {inv.contact.email}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                  {new Date(inv.updated_at).toLocaleDateString("en-GB")}
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatPrice(inv.total_eur)}
                </td>
                <td className="px-3 py-2">
                  <InvoiceStatusPill status={inv.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Invoices() {
  const t = useT();
  const { data, isLoading, error } = useInvoices();
  const invoices = data ?? [];
  const [creating, setCreating] = useState(false);
  const { mode: layoutMode } = useLayoutMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const splitMode = layoutMode === "split";
  const peek = splitMode ? searchParams.get("peek") : null;
  function selectInSplit(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("peek", id);
    setSearchParams(next, { replace: false });
  }
  function clearSplitSelection() {
    const next = new URLSearchParams(searchParams);
    next.delete("peek");
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("invoices.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("invoices.summary", {
              n: invoices.length,
              plural: invoices.length === 1 ? "" : "s",
            })}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("invoices.newInvoice")}</span>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load invoices. {(error as Error).message}
        </p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("invoices.empty.title")}</CardTitle>
            <CardDescription>{t("invoices.empty.description")}</CardDescription>
          </CardHeader>
        </Card>
      ) : splitMode ? (
        <SplitViewLayout
          selectedId={peek}
          onClearSelection={clearSplitSelection}
          list={renderInvoicesCompactList({ invoices, peek, selectInSplit })}
          detail={peek ? <InvoiceDetail id={peek} /> : null}
          emptyState="Select an invoice from the list to see its details."
        />
      ) : (
        renderInvoicesTable({ invoices, splitMode, peek, selectInSplit })
      )}

      {creating ? <NewInvoiceModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
