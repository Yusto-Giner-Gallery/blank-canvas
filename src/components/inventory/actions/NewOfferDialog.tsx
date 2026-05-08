import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

// Creates a deal at stage='offer_sent' for the artwork. Skips the lead /
// interested stages because "New Offer" means an offer has already gone
// out — the rail entry is a shortcut for that intent.
export function NewOfferDialog({
  artwork_id,
  artwork_title,
  internal_id,
  default_value,
  onClose,
}: {
  artwork_id: string;
  artwork_title: string;
  internal_id: string;
  default_value: number | null;
  onClose: () => void;
}) {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const contactsQuery = useContacts();

  const [contactId, setContactId] = useState("");
  const [search, setSearch] = useState("");
  const [value, setValue] = useState(
    default_value != null ? String(default_value) : "",
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

  async function onSubmit() {
    if (!profile) return;
    if (!contactId) {
      toast.error("Pick a contact");
      return;
    }
    setPending(true);
    try {
      const valueNum = value.trim() === "" ? null : Number(value);
      const { data, error } = await supabase
        .from("deals")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          contact_id: contactId,
          artwork_id,
          title: `${artwork_title} (${internal_id})`,
          stage: "offer_sent",
          value_eur: valueNum,
        })
        .select("*")
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Offer recorded", {
        action: {
          label: "Open pipeline",
          onClick: () => navigate(`/pipeline?deal=${data.id}`),
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
        aria-label={`New offer for ${artwork_title}`}
        className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">New offer</h2>
          <p className="text-sm text-muted-foreground">
            Adds a deal to the sales pipeline at stage <em>offer sent</em>.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Contact</Label>
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
          <Label className="text-xs text-muted-foreground">Offer value (EUR)</Label>
          <Input
            type="number"
            step="50"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="—"
            className="h-9"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={!contactId || pending}>
            {pending ? "Saving…" : "Record offer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
