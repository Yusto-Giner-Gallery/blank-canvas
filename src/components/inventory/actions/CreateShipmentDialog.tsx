import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useContacts } from "@/hooks/useContacts";
import { useLocations } from "@/hooks/useLocations";
import { useCreateShipment } from "@/hooks/useShipments";

type DestKind = "contact" | "address";

export function CreateShipmentDialog({
  artwork_id,
  artwork_title,
  current_location_id,
  onClose,
}: {
  artwork_id: string;
  artwork_title: string;
  current_location_id: string | null;
  onClose: () => void;
}) {
  const contactsQuery = useContacts();
  const locationsQuery = useLocations();
  const create = useCreateShipment();

  const [fromLocId, setFromLocId] = useState(current_location_id ?? "");
  const [destKind, setDestKind] = useState<DestKind>("contact");
  const [contactId, setContactId] = useState("");
  const [search, setSearch] = useState("");
  const [addrName, setAddrName] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrPostcode, setAddrPostcode] = useState("");
  const [addrCountry, setAddrCountry] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [notes, setNotes] = useState("");

  const contacts = contactsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts.slice(0, 10);
    return contacts
      .filter((c) =>
        [c.full_name, c.email].some((s) => s?.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [contacts, search]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit() {
    const usingContact = destKind === "contact";
    if (usingContact && !contactId) {
      toast.error("Pick a recipient contact");
      return;
    }
    if (!usingContact && !addrLine1.trim()) {
      toast.error("Address line 1 is required");
      return;
    }
    try {
      await create.mutateAsync({
        artwork_id,
        from_location_id: fromLocId || null,
        to_contact_id: usingContact ? contactId : null,
        to_address: usingContact
          ? null
          : {
              name: addrName.trim() || undefined,
              line1: addrLine1.trim() || undefined,
              line2: addrLine2.trim() || undefined,
              city: addrCity.trim() || undefined,
              postcode: addrPostcode.trim() || undefined,
              country: addrCountry.trim() || undefined,
            },
        carrier: carrier.trim() || null,
        tracking_no: trackingNo.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Shipment created — status: prep");
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
        aria-label={`Create shipment for ${artwork_title}`}
        className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Create shipment
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{artwork_title}</span> — starts in{" "}
            <em>prep</em>; mark as in transit / delivered later.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From location</Label>
          <select
            value={fromLocId}
            onChange={(e) => setFromLocId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Unspecified —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Destination</Label>
          <div className="flex gap-1 border border-border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDestKind("contact")}
              className={
                "flex-1 px-2 py-1 " +
                (destKind === "contact"
                  ? "bg-foreground text-background"
                  : "hover:bg-secondary")
              }
            >
              Contact
            </button>
            <button
              type="button"
              onClick={() => setDestKind("address")}
              className={
                "flex-1 px-2 py-1 " +
                (destKind === "address"
                  ? "bg-foreground text-background"
                  : "hover:bg-secondary")
              }
            >
              Address
            </button>
          </div>

          {destKind === "contact" ? (
            <div className="space-y-1">
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
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={addrName}
                onChange={(e) => setAddrName(e.target.value)}
                placeholder="Name"
                className="col-span-2 h-9"
              />
              <Input
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.target.value)}
                placeholder="Address line 1"
                className="col-span-2 h-9"
              />
              <Input
                value={addrLine2}
                onChange={(e) => setAddrLine2(e.target.value)}
                placeholder="Address line 2"
                className="col-span-2 h-9"
              />
              <Input
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                placeholder="City"
                className="h-9"
              />
              <Input
                value={addrPostcode}
                onChange={(e) => setAddrPostcode(e.target.value)}
                placeholder="Postcode"
                className="h-9"
              />
              <Input
                value={addrCountry}
                onChange={(e) => setAddrCountry(e.target.value)}
                placeholder="Country"
                className="col-span-2 h-9"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Carrier</Label>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="DHL / Crozier / …"
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tracking #</Label>
            <Input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
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
            placeholder="Crating, handling, insurance…"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Create shipment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
