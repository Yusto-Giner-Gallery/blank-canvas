import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageOff, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useArtworks, imageUrl } from "@/hooks/useArtworks";
import { useTags } from "@/hooks/useTags";
import {
  useAttachTag,
  useCreateAndAttachTag,
  useDetachTag,
} from "@/hooks/useArtworkTags";
import { StatusPill } from "@/components/inventory/StatusPill";
import { AttentionBadge } from "@/components/inventory/AttentionBadge";
import { formatSize } from "@/components/inventory/sizeFormat";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";

export default function ArtworkDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useArtworks();
  const tagsQuery = useTags();
  const attach = useAttachTag();
  const detach = useDetachTag();
  const createAndAttach = useCreateAndAttachTag();
  const [newTag, setNewTag] = useState("");

  const artwork = useMemo(
    () => (data ?? []).find((a) => a.id === id) ?? null,
    [data, id],
  );

  const allTags = tagsQuery.data ?? [];
  const attached = useMemo(
    () =>
      artwork
        ? allTags.filter((t) => artwork.tag_ids.includes(t.id))
        : [],
    [artwork, allTags],
  );
  const available = useMemo(
    () =>
      artwork
        ? allTags.filter((t) => !artwork.tag_ids.includes(t.id))
        : [],
    [artwork, allTags],
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!artwork) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artwork not found</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/inventory">Back to inventory</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const url = imageUrl(artwork.primary_image?.storage_path);
  const size = formatSize(artwork.width_cm, artwork.height_cm, artwork.depth_cm);

  async function onCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!artwork) return;
    const name = newTag.trim();
    if (!name) return;
    try {
      await createAndAttach.mutateAsync({ artwork_id: artwork.id, name });
      setNewTag("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {artwork.title}
              </h1>
              {artwork.needs_attention ? <AttentionBadge /> : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {artwork.artist?.name ?? "Unknown artist"} · {artwork.internal_id}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd>
                <StatusPill status={artwork.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Location</dt>
              <dd>{artwork.location?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Size</dt>
              <dd>{size ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Year</dt>
              <dd>{artwork.year ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Medium</dt>
              <dd>{artwork.medium ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Price</dt>
              <dd>
                {artwork.price_eur != null
                  ? new Intl.NumberFormat("en-IE", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    }).format(artwork.price_eur)
                  : "—"}
              </dd>
            </div>
          </dl>

          {artwork.notes ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <p className="whitespace-pre-wrap text-sm">{artwork.notes}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {attached.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          ) : (
            attached.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1 rounded-sm border border-border bg-accent px-2 py-1 text-xs"
              >
                {t.name}
                <button
                  type="button"
                  onClick={() =>
                    detach.mutate({ artwork_id: artwork.id, tag_id: t.id })
                  }
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${t.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {available.length > 0 ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Add an existing tag
            </Label>
            <div className="flex flex-wrap gap-2">
              {available.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    attach.mutate({ artwork_id: artwork.id, tag_id: t.id })
                  }
                  className="inline-flex items-center gap-1 rounded-sm border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={onCreateTag} className="flex gap-2 pt-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag (e.g. colourful)"
            className="h-9 max-w-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newTag.trim() || createAndAttach.isPending}
          >
            {createAndAttach.isPending ? "Adding…" : "Create + add"}
          </Button>
        </form>
      </div>

      <ActivityTimeline entity_type="artwork" entity_id={artwork.id} />
    </div>
  );
}
