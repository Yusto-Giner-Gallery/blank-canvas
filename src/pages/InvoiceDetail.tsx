import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Copy, CreditCard, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useCancelInvoice,
  useCreateStripePaymentLink,
  useInvoice,
  useReplaceInvoiceLines,
  useUpdateInvoice,
} from "@/hooks/useInvoices";
import { useGallery } from "@/hooks/useGallery";
import { InvoiceStatusPill } from "@/components/invoicing/StatusPill";
import {
  InvoiceLinesEditor,
  type DraftLine,
} from "@/components/invoicing/InvoiceLinesEditor";
import type { InvoiceStatus } from "@/integrations/supabase/domain";

const PdfDownloadButton = lazy(
  () => import("@/components/invoicing/InvoicePdfDownloadButton"),
);

const STATUS_OPTIONS: Array<{ value: InvoiceStatus; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

function formatPrice(eur: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}

export default function InvoiceDetail({ id: idProp }: { id?: string } = {}) {
  const params = useParams<{ id: string }>();
  const id = idProp ?? params.id ?? "";
  const { data, isLoading } = useInvoice(id);
  const galleryName = useGallery().data?.name ?? "Gallery";
  const navigate = useNavigate();
  const update = useUpdateInvoice();
  const replaceLines = useReplaceInvoiceLines();
  const stripeLink = useCreateStripePaymentLink();
  const cancel = useCancelInvoice();

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLines(
      data.lines.map((l) => ({
        artwork_id: l.artwork_id,
        description: l.description,
        amount_eur: l.amount_eur,
        discount_eur: l.discount_eur,
      })),
    );
    setNotes(data.notes ?? "");
    setStatus(data.status);
    setDirty(false);
  }, [data]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.amount_eur, 0);
    const discount = lines.reduce((s, l) => s + l.discount_eur, 0);
    return { subtotal, discount, total: subtotal - discount };
  }, [lines]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice not found</CardTitle>
          <CardDescription>
            <Link to="/invoices" className="underline">
              Back to invoices
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    );

  async function onSave() {
    try {
      await Promise.all([
        update.mutateAsync({
          id,
          patch: {
            status,
            notes: notes || null,
            issued_at:
              status === "sent" && !data?.issued_at
                ? new Date().toISOString()
                : data?.issued_at ?? null,
          },
        }),
        replaceLines.mutateAsync({ invoice_id: id, lines }),
      ]);
      setDirty(false);
      toast.success("Saved");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onCancel() {
    if (!window.confirm("Cancel and archive this invoice? It will disappear from the list."))
      return;
    try {
      await cancel.mutateAsync({ id });
      toast.success("Invoice cancelled");
      navigate("/invoices");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onCreatePaymentLink() {
    try {
      const { url } = await stripeLink.mutateAsync({ invoice_id: id });
      toast.success("Stripe link ready");
      navigator.clipboard.writeText(url).catch(() => undefined);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function copyLink() {
    if (!data?.stripe_payment_link) return;
    navigator.clipboard.writeText(data.stripe_payment_link);
    toast.success("Link copied");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {data.deleted_at ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={cancel.isPending}
            >
              <Ban className="h-4 w-4" />
              {cancel.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          )}
          {dirty ? (
            <Button size="sm" variant="outline" disabled title="Save changes before downloading">
              <Download className="h-4 w-4" /> PDF (save first)
            </Button>
          ) : (
            <Suspense
              fallback={
                <Button size="sm" variant="outline" disabled>
                  <Download className="h-4 w-4" /> PDF
                </Button>
              }
            >
              <PdfDownloadButton
                invoice={data}
                contact={data.contact}
                lines={data.lines}
                galleryName={galleryName}
              />
            </Suspense>
          )}
          <Button size="sm" onClick={onSave} disabled={!dirty || update.isPending || replaceLines.isPending}>
            {update.isPending || replaceLines.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invoice <span className="font-mono text-base text-muted-foreground">{id.slice(0, 8).toUpperCase()}</span>
        </h1>
        <InvoiceStatusPill status={status} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bill to</Label>
          <div className="rounded-md border border-border bg-card p-3 text-sm">
            <div className="font-medium">{data.contact?.full_name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {data.contact?.email ?? ""}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as InvoiceStatus);
              setDirty(true);
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Issued</Label>
          <div className="flex h-9 items-center rounded-md border border-input px-3 text-sm text-muted-foreground">
            {data.issued_at
              ? new Date(data.issued_at).toLocaleDateString("en-GB")
              : "Not yet"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Lines</Label>
        <InvoiceLinesEditor
          lines={lines}
          onChange={(next) => {
            setLines(next);
            setDirty(true);
          }}
        />
        <div className="flex justify-end pt-2">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 ? (
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatPrice(totals.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-8 border-t border-border pt-1 text-base font-semibold">
              <span>Total (EUR)</span>
              <span>{formatPrice(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          rows={3}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Internal notes (not shown on PDF)…"
        />
      </div>

      <div className="space-y-2 rounded-md border border-border bg-card p-3">
        <Label className="text-xs text-muted-foreground">Stripe payment link (test mode)</Label>
        {data.stripe_payment_link ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-sm bg-muted px-2 py-1 text-xs">
              {data.stripe_payment_link}
            </code>
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            None yet. Generate one to share with the buyer; the
            invoice's <code>status</code> will flip to <code>paid</code> when
            the Stripe webhook (set up on Lovable) confirms payment.
          </p>
        )}
        <Button
          size="sm"
          onClick={onCreatePaymentLink}
          disabled={lines.length === 0 || stripeLink.isPending}
        >
          <CreditCard className="h-4 w-4" />
          {stripeLink.isPending
            ? "Creating…"
            : data.stripe_payment_link
              ? "Regenerate link"
              : "Generate Stripe link"}
        </Button>
      </div>
    </div>
  );
}
