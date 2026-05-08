import { useState } from "react";
import { errorMessage } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateDossier,
  useDossiers,
  useUpdateDossier,
} from "@/hooks/useDossiers";
import type { DossierKind } from "@/integrations/supabase/domain";

const KIND_OPTIONS: Array<{ value: DossierKind; label: string }> = [
  { value: "editorial", label: "Editorial (PARALLELS layout)" },
  { value: "solo_show", label: "Solo show" },
  { value: "group_show", label: "Group show" },
  { value: "special", label: "Special (extra text)" },
  { value: "art_fair", label: "Art fair" },
  { value: "collector_offer", label: "Collector offer" },
];

export function DossierFromSelectionPicker({
  artwork_ids,
  onClose,
}: {
  artwork_ids: string[];
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const create = useCreateDossier();
  const update = useUpdateDossier();
  const dossiers = useDossiers().data ?? [];
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<DossierKind>("editorial");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const d = await create.mutateAsync({
        title: title.trim(),
        kind,
        artwork_ids,
      });
      toast.success(`Dossier "${d.title}" created`);
      onClose();
      navigate(`/dossiers/${d.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onAddTo(dossier_id: string) {
    const target = dossiers.find((d) => d.id === dossier_id);
    if (!target) return;
    // Append, skipping any artwork already present (preserve order).
    const existing = new Set(target.image_layout);
    const next = [
      ...target.image_layout,
      ...artwork_ids.filter((id) => !existing.has(id)),
    ];
    try {
      await update.mutateAsync({
        id: dossier_id,
        patch: { image_layout: next },
      });
      toast.success(`Added to "${target.title}"`);
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
      <div className="w-full max-w-md space-y-4 rounded-md border border-border bg-popover p-5 shadow-lg">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Add to dossier</h2>
          <p className="text-sm text-muted-foreground">
            {artwork_ids.length} artwork
            {artwork_ids.length === 1 ? "" : "s"} selected.
          </p>
        </div>

        {dossiers.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Add to existing dossier
            </Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {dossiers.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onAddTo(d.id)}
                  disabled={update.isPending}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{d.title}</span>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {d.kind} · {d.image_layout.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={onCreate} className="space-y-2 border-t border-border pt-3">
          <Label className="text-xs text-muted-foreground">
            Or generate a new dossier
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dossier title"
            className="h-9"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as DossierKind)}
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
              disabled={!title.trim() || create.isPending}
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
