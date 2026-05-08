import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, FileText, GripVertical, ImageOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  imageUrl,
  useCollection,
  useDeleteCollection,
  useRemoveFromCollection,
  useReorderCollection,
} from "@/hooks/useCollections";
import { useCreateDossier } from "@/hooks/useDossiers";
import { useProfile } from "@/hooks/useProfile";
import { useLayoutMode } from "@/lib/layout/LayoutContext";
import { Drawer } from "@/components/shared/Drawer";
import { useLightbox } from "@/components/shared/Lightbox";
import ArtworkDetail from "./ArtworkDetail";
import type {
  ArtworkListItem,
  DossierKind,
} from "@/integrations/supabase/domain";

function SortableTile({
  artwork,
  collection_id,
  onRemove,
  onPeek,
}: {
  artwork: ArtworkListItem;
  collection_id: string;
  onRemove: (id: string) => void;
  /** When provided (split-view mode), intercepts the artwork link to open
   *  the detail in a Drawer instead of navigating away from the
   *  collection. */
  onPeek?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: artwork.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const url = imageUrl(artwork.primary_image?.storage_path);
  const lightbox = useLightbox();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col overflow-hidden rounded-md border border-border bg-card"
    >
      {/* Single full-tile <Link> covers both the image and the text block,
          so clicking anywhere on the card opens the artwork. The drag
          handle + trash button live as ABSOLUTE siblings outside the Link
          so their own click handlers don't bubble through to it. */}
      <Link
        to={`/inventory/${artwork.id}`}
        onClick={(e) => {
          if (onPeek) {
            e.preventDefault();
            onPeek(artwork.id);
          }
        }}
        className="flex flex-1 flex-col hover:bg-accent/40"
      >
        <div className="relative aspect-square bg-muted">
          {url ? (
            <img
              src={url}
              alt=""
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                lightbox.open({ src: url, alt: artwork.title });
              }}
              className="h-full w-full cursor-zoom-in object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5 p-3">
          <div className="truncate text-sm font-medium">{artwork.title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {artwork.artist?.name ?? "Unknown artist"} · {artwork.internal_id}
          </div>
        </div>
      </Link>
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Drag to reorder"
        className="absolute left-2 top-2 z-10 cursor-grab rounded-sm border border-border bg-background/80 p-1 text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          // Stop propagation so the surrounding <Link> doesn't fire its
          // peek/navigate handler when the user wants to remove the item.
          e.preventDefault();
          e.stopPropagation();
          onRemove(artwork.id);
        }}
        aria-label="Remove from collection"
        className="absolute right-2 top-2 z-10 rounded-sm border border-border bg-background/80 p-1 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <span className="sr-only">collection {collection_id}</span>
    </div>
  );
}

// Map collection.kind → a sensible default dossier kind.
const COLLECTION_KIND_TO_DOSSIER_KIND: Record<string, DossierKind> = {
  // Exhibitions default to the editorial (PARALLELS) layout — house style
  // for solo / duo / group shows. Switch the dossier kind in the editor if
  // you want the older `group_show` grid.
  exhibition: "editorial",
  fair: "art_fair",
  viewing_room: "collector_offer",
  other: "special",
};

export default function CollectionDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useCollection(id);
  const reorder = useReorderCollection();
  const remove = useRemoveFromCollection();
  const createDossier = useCreateDossier();
  const deleteCollection = useDeleteCollection();
  const { isAdmin } = useProfile();
  const { mode: layoutMode } = useLayoutMode();
  const splitMode = layoutMode === "split";
  // Local peek state — independent of URL because Collections live at
  // /collections/:id and we don't want to overload that path's :id.
  const [peekArtworkId, setPeekArtworkId] = useState<string | null>(null);

  const initialOrder = useMemo(
    () => (data?.artworks ?? []).map((a) => a.id),
    [data],
  );
  const [order, setOrder] = useState<string[]>(initialOrder);
  useEffect(() => setOrder(initialOrder), [initialOrder]);

  const byId = useMemo(() => {
    const map = new Map<string, ArtworkListItem>();
    (data?.artworks ?? []).forEach((a) => map.set(a.id, a));
    return map;
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      const next = arrayMove(prev, oldIndex, newIndex);
      reorder.mutate(
        { collection_id: id, artwork_ids_in_order: next },
        {
          onError: (err) => {
            toast.error(err.message);
          },
        },
      );
      return next;
    });
  }

  async function onRemove(artwork_id: string) {
    try {
      await remove.mutateAsync({ collection_id: id, artwork_id });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function onGenerateDossier() {
    if (!data) return;
    try {
      const dossier = await createDossier.mutateAsync({
        kind: COLLECTION_KIND_TO_DOSSIER_KIND[data.kind] ?? "special",
        title: data.name,
        artwork_ids: order,
      });
      toast.success(`Dossier "${dossier.title}" created`);
      navigate(`/dossiers/${dossier.id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error)
    return (
      <p className="text-sm text-destructive">
        Could not load collection. {(error as Error).message}
      </p>
    );
  if (!data)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Collection not found</CardTitle>
          <CardDescription>
            <Link to="/collections" className="underline">
              Back to collections
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/collections">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={onGenerateDossier}
          disabled={order.length === 0 || createDossier.isPending}
        >
          <FileText className="h-4 w-4" />
          {createDossier.isPending ? "Generating…" : "Generate dossier"}
        </Button>
        {isAdmin && data ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (
                !window.confirm(
                  `Delete collection "${data.name}"? Artworks themselves are kept.`,
                )
              )
                return;
              try {
                await deleteCollection.mutateAsync({ id: data.id });
                toast.success("Collection deleted.");
                navigate("/collections", { replace: true });
              } catch (err) {
                toast.error(errorMessage(err));
              }
            }}
            disabled={deleteCollection.isPending}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {deleteCollection.isPending ? "Deleting…" : "Delete"}
          </Button>
        ) : null}
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.kind} · {order.length} artwork{order.length === 1 ? "" : "s"} ·
          drag to reorder
        </p>
      </div>

      {order.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No artworks yet</CardTitle>
            <CardDescription>
              Use multi-select on the inventory page to add artworks.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {order.map((aid) => {
                const a = byId.get(aid);
                if (!a) return null;
                return (
                  <SortableTile
                    key={aid}
                    artwork={a}
                    collection_id={id}
                    onRemove={onRemove}
                    onPeek={splitMode ? setPeekArtworkId : undefined}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {peekArtworkId ? (
        <Drawer
          open
          onClose={() => setPeekArtworkId(null)}
          title="Artwork"
          widthClass="md:w-[36rem]"
        >
          <ArtworkDetail id={peekArtworkId} />
        </Drawer>
      ) : null}
    </div>
  );
}
