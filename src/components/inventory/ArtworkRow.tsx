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

export function ArtworkRow({
  artwork,
  onQuickEdit,
  selected,
  onToggleSelect,
  onSelect,
  peeked,
  compact = false,
}: {
  artwork: ArtworkListItem;
  onQuickEdit?: (artwork: ArtworkListItem, x: number, y: number) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  /** When provided, clicking the row calls this instead of navigating —
   *  used by split-view to peek a record in the right pane. */
  onSelect?: (id: string) => void;
  /** Visual highlight when this row is the currently-peeked one. */
  peeked?: boolean;
  /** Narrow-pane layout for split view: drops the fixed-width location
   *  column + the multi-select checkbox, frees the title block to fill
   *  the row, and pushes the status pill onto the subtitle line so the
   *  artwork title is never truncated to "T...". Pattern from Linear /
   *  Apple Mail / Front: in narrow lists, render stacked two-line rows
   *  rather than squeezed-down tables. */
  compact?: boolean;
}) {
  const url = imageUrl(artwork.primary_image?.storage_path);
  const size = formatSize(artwork.width_cm, artwork.height_cm, artwork.depth_cm);

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
        // Compose: longPress.onClick swallows the click after a long-press.
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
        "flex items-center gap-4 border-b border-border px-3 py-3 hover:bg-accent/40",
        selected && "bg-accent/60",
        peeked && "bg-accent/80 ring-1 ring-foreground/20",
      )}
    >
      {onToggleSelect && !compact ? (
        <Checkbox
          checked={!!selected}
          onCheckedChange={() => onToggleSelect(artwork.id)}
          ariaLabel={`Select ${artwork.title}`}
        />
      ) : null}
      <div
        className={cn(
          "flex flex-shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted",
          compact ? "h-11 w-11" : "h-14 w-14",
        )}
      >
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
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{artwork.title}</span>
          {artwork.needs_attention ? <AttentionBadge /> : null}
        </div>
        <div className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span className="truncate">
            {artwork.artist?.name ?? "Unknown artist"}
            {size ? ` · ${size}` : ""}
            {!compact && artwork.internal_id ? ` · ${artwork.internal_id}` : ""}
          </span>
          {/* In compact mode the status sits on the subtitle line as a
              terse label, freeing the right edge of the row for the
              location-or-status decision below. */}
          {compact ? (
            <span className="ml-auto shrink-0 uppercase tracking-wider opacity-70">
              {artwork.status.replace(/_/g, " ")}
            </span>
          ) : null}
        </div>
      </div>
      {/* Wide layout extras — hidden in compact split-view because the
          right pane already shows location + status in the detail page. */}
      {!compact ? (
        <>
          <div className="hidden w-32 truncate text-xs text-muted-foreground sm:block">
            {artwork.location?.name ?? "—"}
          </div>
          <StatusPill status={artwork.status} />
        </>
      ) : null}
    </Link>
  );
}
