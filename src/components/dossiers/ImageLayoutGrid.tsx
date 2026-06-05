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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageOff } from "lucide-react";
import type { ArtworkListItem } from "@/integrations/supabase/domain";
import { imageUrl } from "@/hooks/useArtworks";
import { useLightbox } from "@/components/shared/Lightbox";

function Tile({ artwork }: { artwork: ArtworkListItem }) {
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
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      type="button"
      onClick={(e) => {
        if (!url) return;
        e.preventDefault();
        e.stopPropagation();
        lightbox.open({ src: url, alt: artwork.title });
      }}
      className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md border border-border bg-muted"
      title={`Click to zoom — drag to swap — ${artwork.title}`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-2 py-1 text-xs">
        {artwork.title}
      </div>
    </button>
  );
}

export function ImageLayoutGrid({
  artworks,
  onReorder,
}: {
  artworks: ArtworkListItem[];
  onReorder: (newLayout: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    // True swap (3.4): dragging image A onto B exchanges their two slots,
    // rather than shifting the whole sequence (arrayMove). Matches the
    // "drag it onto the other and they switch places" mental model.
    const ids = artworks.map((a) => a.id);
    const i = ids.indexOf(String(active.id));
    const j = ids.indexOf(String(over.id));
    if (i === -1 || j === -1) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorder(ids);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={artworks.map((a) => a.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {artworks.map((a) => (
            <Tile key={a.id} artwork={a} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
