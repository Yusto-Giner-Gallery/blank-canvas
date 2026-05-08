import { useEffect, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocations } from "@/hooks/useLocations";
import { useUpdateArtwork } from "@/hooks/useUpdateArtwork";

export function MoveLocationDialog({
  artwork_id,
  current_location_id,
  onClose,
}: {
  artwork_id: string;
  current_location_id: string | null;
  onClose: () => void;
}) {
  const locations = useLocations().data ?? [];
  const update = useUpdateArtwork();
  const [locationId, setLocationId] = useState(current_location_id ?? "");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSave() {
    try {
      await update.mutateAsync({
        id: artwork_id,
        patch: { location_id: locationId || null },
      });
      toast.success("Location updated");
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
        aria-label="Move artwork to location"
        className="w-full max-w-sm space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Move to location</h2>
          <p className="text-sm text-muted-foreground">
            Locations are the gallery&rsquo;s physical sets.
          </p>
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

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
