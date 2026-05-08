import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { ArtworkListItem } from "@/integrations/supabase/domain";
import { imageUrl } from "@/hooks/useArtworks";
import { useLongPress } from "@/hooks/useLongPress";
import { Checkbox } from "@/components/ui/checkbox";
import { useLightbox } from "@/components/shared/Lightbox";
import { StatusPill } from "./StatusPill";
import { AttentionBadge } from "./AttentionBadge";
import { formatSize } from "./sizeFormat";
import { cn } from "@/lib/utils";

export function ArtworkCard({
  artwork,
  onQuickEdit,
  selected,
  onToggleSelect,
  onSelect,
  peeked,
}: {
  artwork: ArtworkListItem;
  onQuickEdit?: (artwork: ArtworkListItem, x: number, y: number) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  /** When provided, clicking the card calls this instead of navigating —
   *  used by split-view to peek a record in the right pane. */
  onSelect?: (id: string) => void;
  /** Visual highlight when this card is the currently-peeked one. */
  peeked?: boolean;
}) {
  const url = imageUrl(artwork.primary_image?.storage_path);
  const size = formatSize(artwork.width_cm, artwork.height_cm, artwork.depth_cm);
  const lightbox = useLightbox();

  const longPress = useLongPress<HTMLAnchorElement>((e) => {
    if (!onQuickEdit) return;
    const t = e.touches[0] ?? e.changedTouches[0];
    onQuickEdit(artwork, t?.clientX ?? 0, t?.clientY ?? 0);
  });
  const { onClick: longPressOnClick, ...longPressTouch } = longPress;

  return (
    <Link
      to={`/inventory/${artwork.id}`}
      {...longPressTouch}
      onClick={(e) => {
        longPressOnClick(e);
        if (e.defaultPrevented) return;
        if (onSelect) {
          e.preventDefault();
          onSelect(artwork.id);
        }
      }}
      onContextMenu={(e) => {
        if (!onQuickEdit) return;
        e.preventDefault();
        onQuickEdit(artwork, e.clientX, e.clientY);
      }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/40",
        selected && "border-foreground/80 ring-1 ring-foreground/40",
        peeked && "border-foreground bg-accent/40",
      )}
    >
      <div className="relative aspect-square w-full bg-muted">
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
        {artwork.needs_attention ? (
          <div className="absolute left-2 top-2">
            <AttentionBadge />
          </div>
        ) : null}
        {onToggleSelect ? (
          <div className="absolute right-2 top-2">
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onToggleSelect(artwork.id)}
              ariaLabel={`Select ${artwork.title}`}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="truncate text-sm font-medium">{artwork.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {artwork.artist?.name ?? "Unknown artist"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {size ?? "—"}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {artwork.location?.name ?? "—"}
          </span>
          <StatusPill status={artwork.status} />
        </div>
      </div>
    </Link>
  );
}
