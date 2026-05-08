import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DossierArtistIntro } from "@/integrations/supabase/domain";

// Per-artist editor for the Editorial template (PARALLELS layout).
// Edits the `body_blocks.artist_intros[artist_id]` JSON map. No schema change
// — when Lovable adds dedicated columns, this swaps to row-shaped state.

export function EditorialIntrosEditor({
  artists,
  intros,
  onChange,
}: {
  artists: Array<{ id: string; name: string }>;
  intros: Record<string, DossierArtistIntro>;
  onChange: (next: Record<string, DossierArtistIntro>) => void;
}) {
  if (artists.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Add artworks with assigned artists to populate per-artist intro pages.
      </p>
    );
  }

  function patch(id: string, patch: Partial<DossierArtistIntro>) {
    onChange({ ...intros, [id]: { ...(intros[id] ?? {}), ...patch } });
  }

  return (
    <div className="space-y-3">
      {artists.map((a) => {
        const intro = intros[a.id] ?? {};
        return (
          <div
            key={a.id}
            className="space-y-2 border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium uppercase tracking-wide">
                {a.name}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Instagram</Label>
                <Input
                  value={intro.instagram ?? ""}
                  onChange={(e) => patch(a.id, { instagram: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="@handle"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Photo storage path
                </Label>
                <Input
                  value={intro.photo_path ?? ""}
                  onChange={(e) => patch(a.id, { photo_path: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="artists/<id>/portrait.jpg"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bio (EN)</Label>
                <textarea
                  value={intro.bio_en ?? ""}
                  onChange={(e) => patch(a.id, { bio_en: e.target.value })}
                  rows={5}
                  className="w-full resize-y border border-input bg-background p-2 text-xs"
                  placeholder="English bio…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bio (ES)</Label>
                <textarea
                  value={intro.bio_es ?? ""}
                  onChange={(e) => patch(a.id, { bio_es: e.target.value })}
                  rows={5}
                  className="w-full resize-y border border-input bg-background p-2 text-xs"
                  placeholder="Bio en español…"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
