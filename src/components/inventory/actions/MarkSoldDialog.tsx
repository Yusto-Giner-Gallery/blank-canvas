import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useContacts } from "@/hooks/useContacts";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateArtwork } from "@/hooks/useUpdateArtwork";
import { useQueryClient } from "@tanstack/react-query";

// Atomic-ish: insert invoice + 1 line, then flip the artwork to sold.
// If any step fails the user is shown the error and nothing partial
// remains visible (the caller can re-run safely).
export function MarkSoldDialog({
  artwork_id,
  artwork_title,
  internal_id,
  default_price,
  onClose,
}: {
  artwork_id: string;
  artwork_title: string;
  internal_id: string;
  default_price: number | null;
  onClose: () => void;
}) {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const contactsQuery = useContacts();
  const updateArtwork = useUpdateArtwork();

  const [contactId, setContactId] = useState("");
  const [search, setSearch] = useState("");
  const [price, setPrice] = useState(
    default_price != null ? String(default_price) : "",
  );
  const [pending, setPending] = useState(false);

  const contacts = contactsQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts.slice(0, 12);
    return contacts
      .filter((c) =>
        [c.full_name, c.email].some((s) => s?.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [contacts, search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onConfirm() {
    if (!profile) return;
    if (!contactId) {
      toast.error("Pick a buyer");
      return;
    }
    setPending(true);
    try {
      const invoice_id = crypto.randomUUID();
      const amount = price.trim() === "" ? 0 : Number(price);
      const { error: invErr } = await supabase.from("invoices").insert({
        id: invoice_id,
        gallery_id: profile.gallery_id,
        contact_id: contactId,
        status: "draft",
        currency: "EUR",
        notes: `Auto-generated from sale of ${artwork_title} (${internal_id}).`,
      });
      if (invErr) throw invErr;
      const { error: lineErr } = await supabase.from("invoice_lines").insert({
        id: crypto.randomUUID(),
        invoice_id,
        artwork_id,
        description: `${artwork_title} (${internal_id})`,
        amount_eur: amount,
        discount_eur: 0,
        sort_order: 0,
      });
      if (lineErr) throw lineErr;
      await updateArtwork.mutateAsync({
        id: artwork_id,
        patch: { status: "sold" },
      });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Marked as sold — draft invoice created", {
        action: {
          label: "View invoice",
          onClick: () => navigate(`/invoices/${invoice_id}`),
        },
      });
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
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
        aria-label={`Mark ${artwork_title} as sold`}
        className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Mark as sold</h2>
          <p className="text-sm text-muted-foreground">
            Creates a draft invoice and sets status to <em>sold</em>.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Buyer</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="h-9"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No contacts match.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setContactId(c.id)}
                  className={
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent " +
                    (contactId === c.id ? "bg-accent" : "")
                  }
                >
                  <span className="truncate">{c.full_name}</span>
                  <span className="ml-2 shrink-0 truncate text-xs text-muted-foreground">
                    {c.email}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sale price (EUR)</Label>
          <Input
            type="number"
            step="50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="h-9"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={!contactId || pending}
          >
            {pending ? "Saving…" : "Confirm sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
