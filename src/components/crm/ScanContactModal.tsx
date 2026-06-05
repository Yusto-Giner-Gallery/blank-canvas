import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateContact } from "@/hooks/useContacts";
import { extractBusinessCard, type ExtractedCard } from "@/lib/ai/client";
import { errorMessage } from "@/lib/utils";

// Resize the camera/picker File client-side to keep the AI gateway
// payload lean (phone photos are 5–10 MB; we send ~200–400 KB).
async function resizeImage(file: File, maxDim = 1600): Promise<string> {
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

type Draft = ExtractedCard;
const EMPTY_DRAFT: Draft = {
  full_name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  website: "",
  address: "",
  notes: "",
};

export function ScanContactModal({ onClose }: { onClose: () => void }) {
  const create = useCreateContact();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // 4.1: paste a screenshot straight from the clipboard (Cmd/Ctrl+V) —
    // the gallery's contacts often arrive as a phone screenshot, not a card.
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        onPickImage(file);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("paste", onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  async function onPickImage(file: File) {
    try {
      const dataUrl = await resizeImage(file);
      setImageDataUrl(dataUrl);
      setDraft(null);
      // Auto-extract immediately after picking — saves a click.
      runExtract(dataUrl);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function runExtract(dataUrl: string) {
    setExtracting(true);
    try {
      const result = await extractBusinessCard(dataUrl);
      // Merge result onto an empty draft so every field is a string the
      // form inputs can bind to without `null` warnings.
      setDraft({
        full_name: result.full_name ?? "",
        email: result.email ?? "",
        phone: result.phone ?? "",
        company: result.company ?? "",
        role: result.role ?? "",
        website: result.website ?? "",
        address: result.address ?? "",
        notes: result.notes ?? "",
      });
      const filled = Object.values(result).filter((v) => v && String(v).trim()).length;
      if (filled === 0) {
        toast.message(
          "AI did not find any details. Fill the form by hand or try a clearer photo.",
        );
      } else {
        toast.success(`Extracted ${filled} field${filled === 1 ? "" : "s"}. Review before saving.`);
      }
    } catch (err) {
      toast.error(errorMessage(err));
      // Still show an empty form so the user can hand-fill.
      setDraft(EMPTY_DRAFT);
    } finally {
      setExtracting(false);
    }
  }

  async function onSave() {
    if (!draft) return;
    const fullName = (draft.full_name ?? "").trim();
    const email = (draft.email ?? "").trim().toLowerCase();
    if (!fullName) {
      toast.error("Full name is required.");
      return;
    }
    if (!email) {
      toast.error("Email is required.");
      return;
    }
    try {
      // Pack address into notes alongside any other notes — the contacts
      // schema doesn't have an address column. Keeps everything saved.
      const composedNotes = [draft.notes?.trim(), draft.address?.trim()]
        .filter(Boolean)
        .join("\n\n") || null;
      await create.mutateAsync({
        full_name: fullName,
        email,
        phone: draft.phone?.trim() || null,
        company: draft.company?.trim() || null,
        role: draft.role?.trim() || null,
        website: draft.website?.trim() || null,
        notes: composedNotes,
      });
      toast.success(`Added ${fullName}`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-xl border border-border bg-popover">
        <div className="flex items-start justify-between gap-2 border-b border-border px-5 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-accent-red" />
              Scan contact
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Photograph a business card, upload an image, or paste a screenshot
              (⌘/Ctrl+V). AI extracts the details for you to review.
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
              {/* Mobile-friendly: capture="environment" opens the back camera. */}
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
                  alt="Captured contact"
                  className="block max-h-56 w-full object-contain"
                />
                {extracting ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reading the image…
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
              <Field label="Full name *" value={draft.full_name ?? ""} onChange={(v) => update("full_name", v)} required />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email *" type="email" value={draft.email ?? ""} onChange={(v) => update("email", v)} required />
                <Field label="Phone" type="tel" value={draft.phone ?? ""} onChange={(v) => update("phone", v)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Company" value={draft.company ?? ""} onChange={(v) => update("company", v)} />
                <Field label="Role" value={draft.role ?? ""} onChange={(v) => update("role", v)} />
              </div>
              <Field label="Website" type="url" value={draft.website ?? ""} onChange={(v) => update("website", v)} />
              <Field label="Address" value={draft.address ?? ""} onChange={(v) => update("address", v)} />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <textarea
                  value={draft.notes ?? ""}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                  className="w-full resize-y border border-input bg-background p-2 text-sm"
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={create.isPending}>
                  {create.isPending ? "Saving…" : "Save contact"}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="h-9"
      />
    </div>
  );
}
