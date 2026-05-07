import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import { useCreateInvoice } from "@/hooks/useInvoices";

export function NewInvoiceModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const contacts = useContacts().data ?? [];
  const create = useCreateInvoice();
  const [contactId, setContactId] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!contactId) return;
    try {
      const inv = await create.mutateAsync({ contact_id: contactId });
      toast.success("Invoice created");
      onClose();
      navigate(`/invoices/${inv.id}`);
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
        onSubmit={onCreate}
        className="w-full max-w-md space-y-3 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">New invoice</h2>
          <p className="text-sm text-muted-foreground">
            Pick a contact. Lines are added in the next step.
          </p>
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
          {contacts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No contacts yet. Add one in /contacts first.
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!contactId || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
