import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ImageOff,
  ImagePlus,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useArtworks, imageUrl } from "@/hooks/useArtworks";
import { useUpdateArtwork, useDeleteArtwork } from "@/hooks/useUpdateArtwork";
import { useTags } from "@/hooks/useTags";
import {
  useAttachTag,
  useCreateAndAttachTag,
  useDetachTag,
} from "@/hooks/useArtworkTags";
import { useArtists } from "@/hooks/useArtists";
import { useLocations } from "@/hooks/useLocations";
import { useProfile } from "@/hooks/useProfile";
import {
  useArtworkImages,
  useAddArtworkImages,
  useDeleteArtworkImage,
  useSetPrimaryImage,
} from "@/hooks/useArtworkImages";
import { resolveArtist } from "@/lib/artists";
import { StatusPill } from "@/components/inventory/StatusPill";
import { AttentionBadge } from "@/components/inventory/AttentionBadge";
import { formatSize } from "@/components/inventory/sizeFormat";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { DossierFromSelectionPicker } from "@/components/inventory/DossierFromSelectionPicker";
import { CollectionPicker } from "@/components/inventory/CollectionPicker";
import type { ArtworkStatus } from "@/integrations/supabase/domain";

const STATUS_OPTIONS: ArtworkStatus[] = [
  "available",
  "on_hold",
  "sold",
  "archived",
];

function toNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function ArtworkDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data, isLoading } = useArtworks();
  const tagsQuery = useTags();
  const artistsQuery = useArtists();
  const locationsQuery = useLocations();
  const imagesQuery = useArtworkImages(id || undefined);

  const attach = useAttachTag();
  const detach = useDetachTag();
  const createAndAttach = useCreateAndAttachTag();
  const update = useUpdateArtwork();
  const deleteArtwork = useDeleteArtwork();
  const addImages = useAddArtworkImages();
  const setPrimary = useSetPrimaryImage();
  const removeImage = useDeleteArtworkImage();

  const [newTag, setNewTag] = useState("");
  const [editing, setEditing] = useState(false);
  const [showDossier, setShowDossier] = useState(false);
  const [showCollection, setShowCollection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const artwork = useMemo(
    () => (data ?? []).find((a) => a.id === id) ?? null,
    [data, id],
  );

  // Edit form state
  const [form, setForm] = useState({
    title: "",
    artist_id: "",
    artist_name_new: "",
    year: "",
    medium: "",
    width_cm: "",
    height_cm: "",
    depth_cm: "",
    price_eur: "",
    status: "available" as ArtworkStatus,
    location_id: "",
    notes: "",
  });

  useEffect(() => {
    if (!artwork) return;
    setForm({
      title: artwork.title,
      artist_id: artwork.artist?.id ?? "",
      artist_name_new: "",
      year: artwork.year?.toString() ?? "",
      medium: artwork.medium ?? "",
      width_cm: artwork.width_cm?.toString() ?? "",
      height_cm: artwork.height_cm?.toString() ?? "",
      depth_cm: artwork.depth_cm?.toString() ?? "",
      price_eur: artwork.price_eur?.toString() ?? "",
      status: artwork.status,
      location_id: artwork.location?.id ?? "",
      notes: artwork.notes ?? "",
    });
  }, [artwork]);

  const allTags = tagsQuery.data ?? [];
  const attached = useMemo(
    () =>
      artwork ? allTags.filter((t) => artwork.tag_ids.includes(t.id)) : [],
    [artwork, allTags],
  );
  const available = useMemo(
    () =>
      artwork ? allTags.filter((t) => !artwork.tag_ids.includes(t.id)) : [],
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
  const images = imagesQuery.data ?? [];

  async function onCreateTag(e: React.FormEvent) {
    e.preventDefault();
    if (!artwork) return;
    const name = newTag.trim();
    if (!name) return;
    try {
      await createAndAttach.mutateAsync({ artwork_id: artwork.id, name });
      setNewTag("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onDelete() {
    if (!artwork) return;
    if (
      !window.confirm(
        `Delete "${artwork.title}"? It will be removed from inventory; you can recover it via the database soft-delete column. Continue?`,
      )
    )
      return;
    try {
      await deleteArtwork.mutateAsync({ id: artwork.id });
      toast.success(`Deleted "${artwork.title}".`);
      navigate("/inventory", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onToggleArchive() {
    if (!artwork) return;
    const next: ArtworkStatus =
      artwork.status === "archived" ? "available" : "archived";
    try {
      await update.mutateAsync({ id: artwork.id, patch: { status: next } });
      toast.success(next === "archived" ? "Archived" : "Marked available");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !artwork) return;
    try {
      await addImages.mutateAsync({ artwork_id: artwork.id, files });
      toast.success(`Added ${files.length} image${files.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!artwork || !profile) return;
    try {
      let artist_id = form.artist_id;
      if (!artist_id && form.artist_name_new.trim()) {
        artist_id = await resolveArtist(profile.gallery_id, {
          new_name: form.artist_name_new,
        });
      }
      await update.mutateAsync({
        id: artwork.id,
        patch: {
          title: form.title.trim(),
          ...(artist_id ? { artist_id } : {}),
          year: toNum(form.year),
          medium: form.medium.trim() || null,
          width_cm: toNum(form.width_cm),
          height_cm: toNum(form.height_cm),
          depth_cm: toNum(form.depth_cm),
          price_eur: toNum(form.price_eur),
          status: form.status,
          location_id: form.location_id || null,
          notes: form.notes.trim() || null,
        },
      });
      toast.success("Saved");
      setEditing(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            <Pencil className="h-4 w-4" />
            {editing ? "Cancel edit" : "Edit"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={addImages.isPending}
          >
            <ImagePlus className="h-4 w-4" />
            {addImages.isPending ? "Uploading…" : "Add image"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDossier(true)}
          >
            Add to dossier
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCollection(true)}
          >
            Add to collection
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleArchive}>
            {artwork.status === "archived" ? "Mark available" : "Archive"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleteArtwork.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {deleteArtwork.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
            {url ? (
              <img src={url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img) => {
                const thumb = imageUrl(img.storage_path);
                return (
                  <div
                    key={img.id}
                    className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-muted"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : null}
                    {img.is_primary ? (
                      <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-sm bg-background/90 px-1 py-0.5 text-[10px] font-medium">
                        <Star className="h-3 w-3" /> Primary
                      </span>
                    ) : null}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 p-1 opacity-0 transition group-hover:opacity-100">
                      {!img.is_primary ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPrimary.mutate({
                              artwork_id: artwork.id,
                              image_id: img.id,
                            })
                          }
                          className="text-[10px] hover:underline"
                        >
                          Make primary
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm("Remove this image?")) return;
                          removeImage.mutate({
                            artwork_id: artwork.id,
                            image_id: img.id,
                            storage_path: img.storage_path,
                          });
                        }}
                        className="text-destructive text-[10px] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {!editing ? (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {artwork.title}
                  </h1>
                  {artwork.needs_attention ? <AttentionBadge /> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {artwork.artist?.name ?? "Unknown artist"} ·{" "}
                  {artwork.internal_id}
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
            </>
          ) : (
            <form onSubmit={onSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Artist</Label>
                <select
                  value={form.artist_id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      artist_id: e.target.value,
                      artist_name_new: e.target.value ? "" : f.artist_name_new,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">— Add new artist —</option>
                  {(artistsQuery.data ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {!form.artist_id ? (
                  <Input
                    value={form.artist_name_new}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        artist_name_new: e.target.value,
                      }))
                    }
                    placeholder="New artist name"
                    className="mt-1 h-9"
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Input
                    value={form.year}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, year: e.target.value }))
                    }
                    className="h-9"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Medium</Label>
                  <Input
                    value={form.medium}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, medium: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">W (cm)</Label>
                  <Input
                    value={form.width_cm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, width_cm: e.target.value }))
                    }
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">H (cm)</Label>
                  <Input
                    value={form.height_cm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, height_cm: e.target.value }))
                    }
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">D (cm)</Label>
                  <Input
                    value={form.depth_cm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, depth_cm: e.target.value }))
                    }
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Price (EUR)
                  </Label>
                  <Input
                    value={form.price_eur}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price_eur: e.target.value }))
                    }
                    className="h-9"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as ArtworkStatus,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Location</Label>
                <select
                  value={form.location_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location_id: e.target.value }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">—</option>
                  {(locationsQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    update.isPending ||
                    !form.title.trim() ||
                    (!form.artist_id && !form.artist_name_new.trim())
                  }
                >
                  {update.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          )}
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

      {showDossier ? (
        <DossierFromSelectionPicker
          artwork_ids={[artwork.id]}
          onClose={() => setShowDossier(false)}
        />
      ) : null}
      {showCollection ? (
        <CollectionPicker
          artwork_ids={[artwork.id]}
          onClose={() => setShowCollection(false)}
        />
      ) : null}
    </div>
  );
}
