import { useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  CheckCircle2,
  FileText,
  FolderPlus,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useArtworks, imageUrl } from "@/hooks/useArtworks";
import { useUpdateArtwork, useDeleteArtwork } from "@/hooks/useUpdateArtwork";
import {
  useArtworkImages,
  useAddArtworkImages,
  useRemoveArtworkImage,
  useSetPrimaryImage,
} from "@/hooks/useArtworkImages";
import { useArtists } from "@/hooks/useArtists";
import { useLocations } from "@/hooks/useLocations";
import { useProfile } from "@/hooks/useProfile";
import { useTags } from "@/hooks/useTags";
import {
  useAttachTag,
  useCreateAndAttachTag,
  useDetachTag,
} from "@/hooks/useArtworkTags";
import { resolveArtist } from "@/lib/artists";
import { StatusPill } from "@/components/inventory/StatusPill";
import { AttentionBadge } from "@/components/inventory/AttentionBadge";
import { formatSize } from "@/components/inventory/sizeFormat";
import { ActivityTimeline } from "@/components/shared/ActivityTimeline";
import { DossierFromSelectionPicker } from "@/components/inventory/DossierFromSelectionPicker";
import { CollectionPicker } from "@/components/inventory/CollectionPicker";
import type {
  ArtworkStatus,
  Artwork,
} from "@/integrations/supabase/domain";

const STATUS_OPTIONS: Array<{ value: ArtworkStatus; label: string }> = [
  { value: "available", label: "Available" },
  { value: "on_hold", label: "On hold" },
  { value: "sold", label: "Sold" },
  { value: "archived", label: "Archived" },
];

type EditState = {
  title: string;
  artist_id: string;
  artist_name_new: string;
  year: string;
  medium: string;
  width_cm: string;
  height_cm: string;
  depth_cm: string;
  price_eur: string;
  status: ArtworkStatus;
  location_id: string;
  notes: string;
};

function buildEditState(a: NonNullable<ReturnType<typeof useArtworks>["data"]>[number]): EditState {
  return {
    title: a.title,
    artist_id: a.artist?.id ?? "",
    artist_name_new: "",
    year: a.year != null ? String(a.year) : "",
    medium: a.medium ?? "",
    width_cm: a.width_cm != null ? String(a.width_cm) : "",
    height_cm: a.height_cm != null ? String(a.height_cm) : "",
    depth_cm: a.depth_cm != null ? String(a.depth_cm) : "",
    price_eur: a.price_eur != null ? String(a.price_eur) : "",
    status: a.status,
    location_id: a.location_id ?? "",
    notes: a.notes ?? "",
  };
}

export default function ArtworkDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { data, isLoading } = useArtworks();
  const tagsQuery = useTags();
  const artistsQuery = useArtists();
  const locationsQuery = useLocations();
  const attach = useAttachTag();
  const detach = useDetachTag();
  const createAndAttach = useCreateAndAttachTag();
  const update = useUpdateArtwork();
  const deleteArtwork = useDeleteArtwork();

  const imagesQuery = useArtworkImages(id);
  const addImages = useAddArtworkImages();
  const setPrimary = useSetPrimaryImage();
  const removeImage = useRemoveArtworkImage();

  const [newTag, setNewTag] = useState("");
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [pickingDossier, setPickingDossier] = useState(false);
  const [pickingCollection, setPickingCollection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const artwork = useMemo(
    () => (data ?? []).find((a) => a.id === id) ?? null,
    [data, id],
  );

  // Sync edit form when artwork loads or changes (and editing is off).
  useEffect(() => {
    if (artwork && !editing) setEdit(buildEditState(artwork));
  }, [artwork, editing]);

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
  if (!artwork || !edit) {
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

  const images = imagesQuery.data ?? [];
  const primary =
    images.find((i) => i.is_primary) ??
    images[0] ??
    null;
  const heroUrl = imageUrl(primary?.storage_path ?? artwork.primary_image?.storage_path);
  const size = formatSize(artwork.width_cm, artwork.height_cm, artwork.depth_cm);
  const archived = artwork.status === "archived";

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

  async function onToggleArchived() {
    if (!artwork) return;
    const next: ArtworkStatus = archived ? "available" : "archived";
    try {
      await update.mutateAsync({ id: artwork.id, patch: { status: next } });
      toast.success(archived ? "Marked available" : "Marked archived");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onSaveEdit() {
    if (!artwork || !edit || !profile) return;
    try {
      let artist_id: string = artwork.artist?.id ?? "";
      const trimmedNew = edit.artist_name_new.trim();
      if (trimmedNew) {
        artist_id = await resolveArtist(profile.gallery_id, {
          artist_id: null,
          artist_name_new: trimmedNew,
        });
      } else if (edit.artist_id) {
        artist_id = edit.artist_id;
      }
      if (!artist_id) {
        toast.error("Artist is required");
        return;
      }

      const numOrNull = (s: string) =>
        s.trim() === "" ? null : Number(s);
      const intOrNull = (s: string) =>
        s.trim() === "" ? null : parseInt(s, 10);

      await update.mutateAsync({
        id: artwork.id,
        patch: {
          title: edit.title.trim(),
          artist_id,
          year: intOrNull(edit.year),
          medium: edit.medium.trim() || null,
          width_cm: numOrNull(edit.width_cm),
          height_cm: numOrNull(edit.height_cm),
          depth_cm: numOrNull(edit.depth_cm),
          price_eur: numOrNull(edit.price_eur),
          status: edit.status,
          location_id: edit.location_id || null,
          notes: edit.notes.trim() || null,
        },
      });
      toast.success("Artwork updated");
      setEditing(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  function onCancelEdit() {
    setEdit(buildEditState(artwork as NonNullable<typeof artwork>));
    setEditing(false);
  }

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !artwork) return;
    try {
      await addImages.mutateAsync({
        artwork_id: artwork.id,
        files,
        existing_count: images.length,
      });
      toast.success(`${files.length} image${files.length === 1 ? "" : "s"} added`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={addImages.isPending}
          >
            <ImagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {addImages.isPending ? "Uploading…" : "Add image"}
            </span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFilesPicked}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickingDossier(true)}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Add to dossier</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickingCollection(true)}
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add to collection</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleArchived}
            disabled={update.isPending}
          >
            {archived ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Mark available</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span className="hidden sm:inline">Mark archived</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={deleteArtwork.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {deleteArtwork.isPending ? "Deleting…" : "Delete"}
            </span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-square w-full overflow-hidden rounded-md border border-border bg-muted">
            {heroUrl ? (
              <img src={heroUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageOff className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img) => {
                const url = imageUrl(img.storage_path);
                return (
                  <div
                    key={img.id}
                    className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-muted"
                  >
                    {url ? (
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    {img.is_primary ? (
                      <span
                        className="absolute left-1 top-1 inline-flex h-5 items-center gap-0.5 rounded-sm bg-foreground px-1 text-[10px] font-semibold text-background"
                        title="Primary image"
                      >
                        <Star className="h-3 w-3" /> Primary
                      </span>
                    ) : null}
                    <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-0 transition group-hover:opacity-100">
                      {!img.is_primary ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPrimary.mutate(
                              { artwork_id: artwork.id, image_id: img.id },
                              {
                                onError: (e) => toast.error(errorMessage(e)),
                              },
                            )
                          }
                          className="rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] hover:bg-background"
                          title="Make primary"
                        >
                          Make primary
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Remove this image from the artwork?",
                            )
                          )
                            return;
                          removeImage.mutate(
                            {
                              artwork_id: artwork.id,
                              image_id: img.id,
                              storage_path: img.storage_path,
                              was_primary: img.is_primary,
                            },
                            { onError: (e) => toast.error(errorMessage(e)) },
                          );
                        }}
                        className="rounded-sm bg-background/90 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-background"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {!editing ? (
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
        ) : (
          <EditForm
            edit={edit}
            setEdit={setEdit}
            artists={artistsQuery.data ?? []}
            locations={locationsQuery.data ?? []}
            internal_id={artwork.internal_id}
            saving={update.isPending}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
          />
        )}
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

      {pickingDossier ? (
        <DossierFromSelectionPicker
          artwork_ids={[artwork.id]}
          onClose={() => setPickingDossier(false)}
        />
      ) : null}

      {pickingCollection ? (
        <CollectionPicker
          artwork_ids={[artwork.id]}
          onClose={() => setPickingCollection(false)}
        />
      ) : null}
    </div>
  );
}

function EditForm({
  edit,
  setEdit,
  artists,
  locations,
  internal_id,
  saving,
  onSave,
  onCancel,
}: {
  edit: EditState;
  setEdit: (next: EditState) => void;
  artists: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  internal_id: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = <K extends keyof EditState>(k: K, v: EditState[K]) =>
    setEdit({ ...edit, [k]: v });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <p className="text-xs text-muted-foreground">{internal_id}</p>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Title</Label>
        <Input
          value={edit.title}
          onChange={(e) => set("title", e.target.value)}
          className="h-9"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Artist</Label>
          <select
            value={edit.artist_id}
            onChange={(e) => {
              set("artist_id", e.target.value);
              if (e.target.value) set("artist_name_new", "");
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">— Select —</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">…or new artist</Label>
          <Input
            value={edit.artist_name_new}
            onChange={(e) => set("artist_name_new", e.target.value)}
            placeholder="Create new"
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input
            type="number"
            value={edit.year}
            onChange={(e) => set("year", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs text-muted-foreground">Medium</Label>
          <Input
            value={edit.medium}
            onChange={(e) => set("medium", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Width (cm)</Label>
          <Input
            type="number"
            step="0.1"
            value={edit.width_cm}
            onChange={(e) => set("width_cm", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Height (cm)</Label>
          <Input
            type="number"
            step="0.1"
            value={edit.height_cm}
            onChange={(e) => set("height_cm", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Depth (cm)</Label>
          <Input
            type="number"
            step="0.1"
            value={edit.depth_cm}
            onChange={(e) => set("depth_cm", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Price (EUR)</Label>
          <Input
            type="number"
            step="50"
            value={edit.price_eur}
            onChange={(e) => set("price_eur", e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <select
            value={edit.status}
            onChange={(e) => set("status", e.target.value as ArtworkStatus)}
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
            value={edit.location_id}
            onChange={(e) => set("location_id", e.target.value)}
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
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <textarea
          value={edit.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
