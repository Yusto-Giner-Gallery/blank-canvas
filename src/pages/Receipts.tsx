import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useInvoices, type InvoiceListItem } from "@/hooks/useInvoices";
import { InvoiceStatusPill } from "@/components/invoicing/StatusPill";
import { ScanInvoiceModal } from "@/components/invoicing/ScanInvoiceModal";
import { useLayoutMode } from "@/lib/layout/LayoutContext";
import { SplitViewLayout } from "@/components/layout/SplitViewLayout";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/LocaleContext";
import { isReceipt } from "@/lib/invoices/kind";
import InvoiceDetail from "./InvoiceDetail";

// Receipts — incoming bills / expenses scanned from vendors. Best-practice
// accounting separation from outgoing sales invoices: different counterparty,
// different reporting category, different VAT treatment. The Scan button
// lives here (not on /invoices) because that's where receipt capture
// belongs in the user's workflow. Same `invoices` table backs both
// surfaces today; isReceipt() is the discriminator (CLAUDE.md §13:
// Lovable will add a real `kind` column eventually, then isReceipt()
// becomes a one-line lookup of that column).

function formatPrice(eur: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

function vendorLabel(inv: InvoiceListItem): string {
  // The scanner writes "Vendor: <name>\nRef: …" into notes. Pull the
  // vendor name out for display so the receipts list reads as a vendor
  // ledger, not "contact <our-stand-in> · email".
  const m = (inv.notes ?? "").match(/^\s*Vendor:\s*(.+)$/im);
  return m?.[1]?.trim() || inv.contact?.full_name || "—";
}

function renderReceiptsCompactList({
  invoices,
  peek,
  selectInSplit,
}: {
  invoices: InvoiceListItem[];
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
              <span className="truncate font-medium">{vendorLabel(inv)}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatPrice(inv.total_eur)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate font-mono">
                {inv.id.slice(0, 8).toUpperCase()}
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

function renderReceiptsTable({
  invoices,
  splitMode,
  peek,
  selectInSplit,
}: {
  invoices: InvoiceListItem[];
  splitMode: boolean;
  peek: string | null;
  selectInSplit: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Vendor</th>
            <th className="px-3 py-2 text-left font-medium">No.</th>
            <th className="hidden px-3 py-2 text-left font-medium md:table-cell">
              Date
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
                <td className="px-3 py-2">
                  {splitMode ? (
                    <button
                      type="button"
                      onClick={() => selectInSplit(inv.id)}
                      className="text-left font-medium hover:underline"
                    >
                      {vendorLabel(inv)}
                    </button>
                  ) : (
                    <Link to={`/invoices/${inv.id}`} className="font-medium hover:underline">
                      {vendorLabel(inv)}
                    </Link>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {inv.id.slice(0, 8).toUpperCase()}
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

export default function Receipts() {
  const t = useT();
  const { data, isLoading, error } = useInvoices();
  const receipts = (data ?? []).filter(isReceipt);
  const [scanning, setScanning] = useState(false);
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("receipts.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("receipts.summary", {
              n: receipts.length,
              plural: receipts.length === 1 ? "" : "s",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setScanning(true)}>
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">{t("receipts.scan")}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {(error as Error).message}
        </p>
      ) : receipts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("receipts.empty.title")}</CardTitle>
            <CardDescription>{t("receipts.empty.description")}</CardDescription>
          </CardHeader>
        </Card>
      ) : splitMode ? (
        <SplitViewLayout
          selectedId={peek}
          onClearSelection={clearSplitSelection}
          list={renderReceiptsCompactList({ invoices: receipts, peek, selectInSplit })}
          detail={peek ? <InvoiceDetail id={peek} /> : null}
          emptyState={t("receipts.selectHint")}
        />
      ) : (
        renderReceiptsTable({ invoices: receipts, splitMode, peek, selectInSplit })
      )}

      {scanning ? <ScanInvoiceModal onClose={() => setScanning(false)} /> : null}
    </div>
  );
}
