import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Trash2, Palette } from "lucide-react";
import { toast } from "sonner";
import { useArtists, useDeleteArtist } from "@/hooks/useArtists";
import { useArtworks } from "@/hooks/useArtworks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Artists() {
  const { data, isLoading, error } = useArtists();
  const artworks = useArtworks().data ?? [];
  const del = useDeleteArtist();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  // Works-per-artist count, derived from the inventory we already hold.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of artworks) {
      if (a.artist?.id) m.set(a.artist.id, (m.get(a.artist.id) ?? 0) + 1);
    }
    return m;
  }, [artworks]);

  const artists = (data ?? []).filter((a) =>
    query ? a.name.toLowerCase().includes(query) : true,
  );

  async function onDelete(id: string, name: string) {
    const n = counts.get(id) ?? 0;
    const msg =
      n > 0
        ? `Remove "${name}"? ${n} artwork${n === 1 ? "" : "s"} will keep their record but lose this artist link.`
        : `Remove "${name}"?`;
    if (!window.confirm(msg)) return;
    try {
      await del.mutateAsync({ id });
      toast.success(`${name} removed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Artists</h1>
        <p className="text-sm text-muted-foreground">
          The gallery's artists. Open one for their profile and works, or
          remove one added by mistake.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search artists…"
          className="h-9 max-w-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          Could not load artists. {(error as Error).message}
        </p>
      ) : artists.length === 0 ? (
        <Card>
          <CardHeader>
            {query ? (
              <>
                <CardTitle>No matches</CardTitle>
                <CardDescription>No artists match "{q}".</CardDescription>
              </>
            ) : (
              <>
                <CardTitle>No artists yet</CardTitle>
                <CardDescription>
                  Artists are created when you upload or import artworks.
                </CardDescription>
              </>
            )}
          </CardHeader>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border bg-card">
          {artists.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-3">
              <Link
                to={`/artists/${a.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 hover:text-foreground"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-muted">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {a.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[a.nationality, `${counts.get(a.id) ?? 0} works`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(a.id, a.name)}
                disabled={del.isPending}
                aria-label={`Remove ${a.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
