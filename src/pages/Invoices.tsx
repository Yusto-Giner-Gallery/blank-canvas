import { useState } from "react";
import { Link } from "react-router-dom";
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

function formatPrice(eur: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

export default function Invoices() {
  const { data, isLoading, error } = useInvoices();
  const invoices = data ?? [];
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"} · EUR.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New invoice</span>
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
            <CardTitle>No invoices yet</CardTitle>
            <CardDescription>
              Click "New invoice" to start a draft. Add line items, then
              generate a Stripe payment link or download the PDF.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
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
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-3 py-2 font-mono text-xs">
                    <Link to={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.id.slice(0, 8).toUpperCase()}
                    </Link>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? <NewInvoiceModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
