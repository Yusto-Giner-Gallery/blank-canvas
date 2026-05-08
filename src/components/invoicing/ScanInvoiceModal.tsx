import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import {
  useCreateInvoice,
  useReplaceInvoiceLines,
  useUpdateInvoice,
} from "@/hooks/useInvoices";
import {
  extractInvoice,
  type ExtractedInvoice,
  type ExtractedInvoiceLine,
} from "@/lib/ai/client";
import { errorMessage } from "@/lib/utils";

// Mirrors ScanContactModal: camera or file upload → resize client-side
// → AI vision extracts structured fields → editable review form → save.
//
// On save, creates a draft invoice for the picked contact, replaces the
// lines with the extracted ones, sets the issued_at date if extracted,
// and packs vendor_name + invoice_number + free-text notes into the
// invoice's notes field for traceability. Then navigates to the invoice
// detail page so the user can finish reviewing.

async function resizeImage(file: File, maxDim = 2000): Promise<string> {
  // Receipts have small print — bump the max-dim to 2000 vs 1600 used
  // for business cards so the OCR has more pixels per character.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported in this browser"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };
      img.onerror = () => reject(new Error("Could not decode image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

const EMPTY_DRAFT: ExtractedInvoice = {
  vendor_name: "",
  invoice_number: "",
  issue_date: "",
  subtotal_eur: null,
  tax_eur: null,
  total_eur: null,
  currency: null,
  lines: [],
  notes: "",
};

export function ScanInvoiceModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const contacts = useContacts().data ?? [];
  const create = useCreateInvoice();
  const replaceLines = useReplaceInvoiceLines();
  const update = useUpdateInvoice();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<ExtractedInvoice | null>(null);
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-pick the first contact whose name matches the extracted vendor
  // (case-insensitive trim). Saves the user a click in the common case.
  useEffect(() => {
    if (!draft?.vendor_name || contactId) return;
    const target = draft.vendor_name.trim().toLowerCase();
    const match = contacts.find(
      (c) => c.full_name.trim().toLowerCase() === target,
    );
    if (match) setContactId(match.id);
  }, [draft?.vendor_name, contacts, contactId]);

  async function onPickImage(file: File) {
    try {
      const dataUrl = await resizeImage(file);
      setImageDataUrl(dataUrl);
      setDraft(null);
      runExtract(dataUrl);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function runExtract(dataUrl: string) {
    setExtracting(true);
    try {
      const result = await extractInvoice(dataUrl);
      setDraft({
        vendor_name: result.vendor_name ?? "",
        invoice_number: result.invoice_number ?? "",
        issue_date: result.issue_date ?? "",
        subtotal_eur: result.subtotal_eur,
        tax_eur: result.tax_eur,
        total_eur: result.total_eur,
        currency: result.currency,
        lines: result.lines,
        notes: result.notes ?? "",
      });
      const filled =
        [
          result.vendor_name,
          result.invoice_number,
          result.issue_date,
          result.total_eur,
        ].filter(Boolean).length + result.lines.length;
      if (filled === 0) {
        toast.message(
          "AI did not find any details. Fill the form by hand or try a clearer photo.",
        );
      } else {
        toast.success(
          `Extracted ${filled} field${filled === 1 ? "" : "s"}. Review before saving.`,
        );
      }
    } catch (err) {
      toast.error(errorMessage(err));
      setDraft(EMPTY_DRAFT);
    } finally {
      setExtracting(false);
    }
  }

  async function onSave() {
    if (!draft) return;
    if (!contactId) {
      toast.error("Pick a contact (vendor or customer) before saving.");
      return;
    }
    setSaving(true);
    try {
      const inv = await create.mutateAsync({ contact_id: contactId });
      // Replace the line items with the extracted ones.
      if (draft.lines.length > 0) {
        await replaceLines.mutateAsync({
          invoice_id: inv.id,
          lines: draft.lines.map((l) => ({
            artwork_id: null,
            description: l.description,
            amount_eur: l.amount_eur,
            discount_eur: 0,
          })),
        });
      }
      // Pack vendor name + invoice number + AI notes into the invoice's
      // notes field for traceability — the existing schema doesn't have
      // dedicated columns for those.
      const composedNotes = [
        draft.vendor_name?.trim() ? `Vendor: ${draft.vendor_name.trim()}` : "",
        draft.invoice_number?.trim() ? `Ref: ${draft.invoice_number.trim()}` : "",
        draft.notes?.trim() || "",
      ]
        .filter(Boolean)
        .join("\n");
      const issuedAtIso = parseDateMaybe(draft.issue_date);
      await update.mutateAsync({
        id: inv.id,
        patch: {
          notes: composedNotes || null,
          issued_at: issuedAtIso,
        },
      });
      toast.success("Invoice draft created from receipt");
      onClose();
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function update_<K extends keyof ExtractedInvoice>(
    key: K,
    value: ExtractedInvoice[K],
  ) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function updateLine(idx: number, patch: Partial<ExtractedInvoiceLine>) {
    setDraft((d) => {
      if (!d) return d;
      const lines = d.lines.slice();
      lines[idx] = { ...lines[idx], ...patch };
      return { ...d, lines };
    });
  }

  function addLine() {
    setDraft((d) => {
      if (!d) return d;
      return {
        ...d,
        lines: [...d.lines, { description: "", amount_eur: 0, quantity: null }],
      };
    });
  }

  function removeLine(idx: number) {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, lines: d.lines.filter((_, i) => i !== idx) };
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-2xl border border-border bg-popover">
        <div className="flex items-start justify-between gap-2 border-b border-border px-5 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-accent-red" />
              Scan invoice or receipt
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Take a photo or upload a file. AI extracts the vendor, date,
              total, and line items for you to review.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          {!imageDataUrl ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex h-32 flex-col items-center justify-center gap-2 border border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Camera className="h-6 w-6" />
                Use camera
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-32 flex-col items-center justify-center gap-2 border border-dashed border-border bg-background text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Upload className="h-6 w-6" />
                Upload image
              </button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (f) onPickImage(f);
                }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (f) onPickImage(f);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative border border-border bg-muted">
                <img
                  src={imageDataUrl}
                  alt="Captured invoice"
                  className="block max-h-72 w-full object-contain"
                />
                {extracting ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reading the invoice…
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageDataUrl(null);
                    setDraft(null);
                  }}
                  disabled={extracting}
                >
                  Use a different image
                </Button>
              </div>
            </div>
          )}

          {draft ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Contact (vendor or customer) *
                </Label>
                <select
                  required
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— Pick a contact —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} · {c.email}
                    </option>
                  ))}
                </select>
                {draft.vendor_name && !contactId ? (
                  <p className="text-xs text-muted-foreground">
                    Extracted vendor: <strong>{draft.vendor_name}</strong>.
                    No matching contact yet — pick one above or add the
                    vendor in /contacts first.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Vendor / supplier"
                  value={draft.vendor_name ?? ""}
                  onChange={(v) => update_("vendor_name", v)}
                />
                <Field
                  label="Invoice number"
                  value={draft.invoice_number ?? ""}
                  onChange={(v) => update_("invoice_number", v)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Issue date"
                  type="date"
                  value={draft.issue_date ?? ""}
                  onChange={(v) => update_("issue_date", v)}
                />
                <Field
                  label="Subtotal (EUR)"
                  type="number"
                  value={draft.subtotal_eur == null ? "" : String(draft.subtotal_eur)}
                  onChange={(v) =>
                    update_("subtotal_eur", v === "" ? null : Number(v))
                  }
                />
                <Field
                  label="Total (EUR)"
                  type="number"
                  value={draft.total_eur == null ? "" : String(draft.total_eur)}
                  onChange={(v) =>
                    update_("total_eur", v === "" ? null : Number(v))
                  }
                />
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Line items
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addLine}
                    className="h-7"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add line
                  </Button>
                </div>
                {draft.lines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No lines extracted. Add one or save without — the lines
                    can be added later in the invoice editor.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {draft.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_120px_36px] gap-2"
                      >
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            updateLine(idx, { description: e.target.value })
                          }
                          placeholder="Description"
                          className="h-9"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={String(line.amount_eur)}
                          onChange={(e) =>
                            updateLine(idx, {
                              amount_eur: Number(e.target.value || 0),
                            })
                          }
                          placeholder="Amount EUR"
                          className="h-9 text-right tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          aria-label="Remove line"
                          className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <textarea
                  value={draft.notes ?? ""}
                  onChange={(e) => update_("notes", e.target.value)}
                  rows={3}
                  className="w-full resize-y border border-input bg-background p-2 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!contactId || saving}
                >
                  {saving ? "Saving…" : "Create invoice"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Best-effort ISO date parser. Accepts "YYYY-MM-DD", "DD/MM/YYYY", or
// "MM/DD/YYYY"; returns the resulting ISO string or null if it can't
// be made sense of. AI tends to return YYYY-MM-DD per our prompt, but
// hand-edits via the date input can introduce other shapes.
function parseDateMaybe(s: string | null | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (isoLike) {
    const d = new Date(trimmed + "T00:00:00.000Z");
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}
