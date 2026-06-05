import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocations } from "@/hooks/useLocations";
import { useUpdateArtwork } from "@/hooks/useUpdateArtwork";
import type {
  ArtworkStatus,
  Artwork,
} from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: ArtworkStatus; label: string }> = [
  { value: "available", label: "Available" },
  { value: "on_hold", label: "On hold" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

const POPOVER_W = 280;

export type QuickEdit = {
  artwork: Pick<
    Artwork,
    "id" | "title" | "status" | "location_id" | "price_eur"
  >;
  x: number;
  y: number;
};

export function QuickEditPopover({
  edit,
  onClose,
}: {
  edit: QuickEdit;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const update = useUpdateArtwork();
  const locations = useLocations().data ?? [];

  const [status, setStatus] = useState<ArtworkStatus>(edit.artwork.status);
  const [locationId, setLocationId] = useState<string>(
    edit.artwork.location_id ?? "",
  );
  const [price, setPrice] = useState<string>(
    edit.artwork.price_eur != null ? String(edit.artwork.price_eur) : "",
  );

  // Click-outside + Escape to close.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Clamp into viewport.
  const left = Math.min(edit.x, window.innerWidth - POPOVER_W - 12);
  const top = Math.min(edit.y, window.innerHeight - 280);

  async function save(patch: {
    status: ArtworkStatus;
    location_id: string | null;
    price_eur: number | null;
  }, message: string) {
    try {
      await update.mutateAsync({ id: edit.artwork.id, patch });
      toast.success(message);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const currentPatch = () => ({
    location_id: locationId || null,
    price_eur: price.trim() === "" ? null : Number(price),
  });

  function onSave() {
    return save({ status, ...currentPatch() }, `${edit.artwork.title} updated`);
  }

  function onMarkSold() {
    setStatus("sold");
    return save(
      { status: "sold", ...currentPatch() },
      `${edit.artwork.title} marked sold`,
    );
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Quick edit ${edit.artwork.title}`}
      style={{ left, top, width: POPOVER_W }}
      className={cn(
        "fixed z-50 rounded-md border border-border bg-popover p-3 shadow-lg",
      )}
    >
      <div className="mb-2 truncate text-xs text-muted-foreground">
        {edit.artwork.title}
      </div>

      {edit.artwork.status !== "sold" ? (
        <Button
          size="sm"
          variant="outline"
          className="mb-3 w-full"
          onClick={onMarkSold}
          disabled={update.isPending}
        >
          Mark as sold
        </Button>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ArtworkStatus)}
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
          <Label className="text-xs text-muted-foreground">Location</Label>
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— None —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price (EUR)</Label>
          <Input
            type="number"
            step="50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="—"
            className="h-9"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
