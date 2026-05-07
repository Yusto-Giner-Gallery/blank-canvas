import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useArtworks } from "@/hooks/useArtworks";
import { useContacts } from "@/hooks/useContacts";
import { useCreateDeal } from "@/hooks/useDeals";

export function NewDealModal({ onClose }: { onClose: () => void }) {
  const contacts = useContacts().data ?? [];
  const artworks = useArtworks().data ?? [];
  const create = useCreateDeal();
  const [contactId, setContactId] = useState("");
  const [artworkId, setArtworkId] = useState("");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId || !title.trim()) return;
    try {
      await create.mutateAsync({
        contact_id: contactId,
        artwork_id: artworkId || null,
        title: title.trim(),
        value_eur: value.trim() === "" ? null : Number(value),
      });
      toast.success("Deal added");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">New deal</h2>
          <p className="text-sm text-muted-foreground">
            Starts in the "Lead" column.
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pan Tierni — Culito Matón"
            className="h-9"
            autoFocus
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Contact</Label>
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
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Artwork (optional)
          </Label>
          <select
            value={artworkId}
            onChange={(e) => setArtworkId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— None —</option>
            {artworks.map((a) => (
              <option key={a.id} value={a.id}>
                {a.internal_id} · {a.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Value (EUR, optional)</Label>
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
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!title.trim() || !contactId || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
