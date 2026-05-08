import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import { useCreateConsignment } from "@/hooks/useConsignments";

const today = () => new Date().toISOString().slice(0, 10);

export function ConsignOutDialog({
  artwork_id,
  artwork_title,
  onClose,
}: {
  artwork_id: string;
  artwork_title: string;
  onClose: () => void;
}) {
  const contactsQuery = useContacts();
  const create = useCreateConsignment();

  const [partnerId, setPartnerId] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [splitPct, setSplitPct] = useState("50");
  const [notes, setNotes] = useState("");

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
    if (!partnerId) {
      toast.error("Pick a partner");
      return;
    }
    const pct = Number(splitPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Split must be 0–100");
      return;
    }
    try {
      await create.mutateAsync({
        artwork_id,
        partner_contact_id: partnerId,
        start_date: startDate,
        end_date: endDate || null,
        split_pct: pct,
        notes: notes.trim() || null,
      });
      toast.success("Consignment recorded");
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
        aria-label={`Consign ${artwork_title}`}
        className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Consign out</h2>
          <p className="text-sm text-muted-foreground">
            Place <span className="font-medium">{artwork_title}</span> on
            consignment with a partner gallery or dealer.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Partner</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="h-9"
          />
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No contacts match.
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPartnerId(c.id)}
                  className={
                    "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent " +
                    (partnerId === c.id ? "bg-accent" : "")
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

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Start</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">End</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Gallery split %
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={splitPct}
              onChange={(e) => setSplitPct(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Terms, contact at partner…"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!partnerId || create.isPending}
          >
            {create.isPending ? "Saving…" : "Consign"}
          </Button>
        </div>
      </div>
    </div>
  );
}
