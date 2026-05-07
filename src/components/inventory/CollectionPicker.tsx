import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddToCollection,
  useCollections,
  useCreateCollection,
} from "@/hooks/useCollections";
import type { CollectionKind } from "@/integrations/supabase/domain";

const KIND_OPTIONS: Array<{ value: CollectionKind; label: string }> = [
  { value: "exhibition", label: "Exhibition" },
  { value: "fair", label: "Art fair booth" },
  { value: "viewing_room", label: "Viewing room" },
  { value: "other", label: "Other" },
];

export function CollectionPicker({
  artwork_ids,
  onClose,
}: {
  artwork_ids: string[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const collections = useCollections().data ?? [];
  const create = useCreateCollection();
  const add = useAddToCollection();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CollectionKind>("exhibition");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const c = await create.mutateAsync({
        name: name.trim(),
        kind,
        artwork_ids,
      });
      toast.success(`Collection "${c.name}" created`);
      onClose();
      navigate(`/collections/${c.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onAddTo(collection_id: string) {
    try {
      await add.mutateAsync({ collection_id, artwork_ids });
      toast.success(`Added ${artwork_ids.length} to collection`);
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
      <div
        ref={ref}
        role="dialog"
        aria-label="Add to collection"
        className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Add to collection</h2>
          <p className="text-sm text-muted-foreground">
            {artwork_ids.length} artwork{artwork_ids.length === 1 ? "" : "s"} selected.
          </p>
        </div>

        {collections.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Existing</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {collections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onAddTo(c.id)}
                  disabled={add.isPending}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.artwork_count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={onCreate} className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">
            Or create a new collection
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection name (e.g. Madrid Show)"
            className="h-9"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CollectionKind)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || create.isPending}
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
