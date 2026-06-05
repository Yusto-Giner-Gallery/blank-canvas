import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useArtist, useUpdateArtist } from "@/hooks/useArtists";
import { useArtworks } from "@/hooks/useArtworks";
import { ArtworkCard } from "@/components/inventory/ArtworkCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: artist, isLoading } = useArtist(id);
  const update = useUpdateArtist();
  const allArtworks = useArtworks().data ?? [];

  const works = useMemo(
    () => allArtworks.filter((a) => a.artist?.id === id),
    [allArtworks, id],
  );
  const available = works.filter((a) => a.status === "available");
  const sold = works.filter((a) => a.status === "sold");
  const needsAttention = works.filter((a) => a.needs_attention);

  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (!artist) return;
    setName(artist.name);
    setNationality(artist.nationality ?? "");
    setBio(artist.bio ?? "");
  }, [artist]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!artist) {
    return (
      <div className="space-y-3">
        <Link to="/artists" className="text-sm text-muted-foreground hover:text-foreground">
          ← Artists
        </Link>
        <p className="text-sm text-destructive">Artist not found.</p>
      </div>
    );
  }

  async function onSave() {
    try {
      await update.mutateAsync({
        id: artist!.id,
        patch: {
          name: name.trim() || artist!.name,
          nationality: nationality.trim() || null,
          bio: bio.trim() || null,
        },
      });
      toast.success("Profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/artists"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Artists
      </Link>

      {/* Profile */}
      <div className="grid gap-4 rounded-md border border-border bg-card p-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Nationality</Label>
          <Input
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="—"
            className="h-9"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs text-muted-foreground">Bio / CV</Label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Biography, CV highlights, exhibition history…"
            rows={5}
            className="w-full rounded-md border border-input bg-background p-2 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <Button size="sm" onClick={onSave} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Works" value={works.length} />
        <Stat label="Available" value={available.length} />
        <Stat label="Sold" value={sold.length} />
      </div>

      {/* Needs addressing — derived from the attention view */}
      {needsAttention.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em]">
            Needs addressing
          </h2>
          <div className="divide-y divide-border rounded-md border border-border bg-card">
            {needsAttention.map((a) => (
              <Link
                key={a.id}
                to={`/inventory/${a.id}`}
                className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/40"
              >
                <span className="truncate">{a.title}</span>
                <span className="text-xs text-[hsl(var(--attention))]">Attention</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Available works */}
      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-[0.18em]">
          Available works
        </h2>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">No available works.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {available.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
