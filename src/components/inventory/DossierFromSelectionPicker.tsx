import { useState } from "react";
import { errorMessage } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDossier } from "@/hooks/useDossiers";
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
          <h2 className="text-lg font-semibold tracking-tight">Generate dossier</h2>
          <p className="text-sm text-muted-foreground">
            {artwork_ids.length} artwork{artwork_ids.length === 1 ? "" : "s"} selected.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dossier title"
            className="h-9"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Template</Label>
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
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!title.trim() || create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
