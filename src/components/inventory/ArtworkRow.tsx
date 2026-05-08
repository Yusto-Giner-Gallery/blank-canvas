import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { ArtworkListItem } from "@/integrations/supabase/domain";
import { imageUrl } from "@/hooks/useArtworks";
import { useLongPress } from "@/hooks/useLongPress";
import { Checkbox } from "@/components/ui/checkbox";
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
      {onToggleSelect ? (
        <Checkbox
          checked={!!selected}
          onCheckedChange={() => onToggleSelect(artwork.id)}
          ariaLabel={`Select ${artwork.title}`}
        />
      ) : null}
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-contain" />
        ) : (
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{artwork.title}</span>
          {artwork.needs_attention ? <AttentionBadge /> : null}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {artwork.artist?.name ?? "Unknown artist"}
          {size ? ` · ${size}` : ""}
          {artwork.internal_id ? ` · ${artwork.internal_id}` : ""}
        </div>
      </div>
      <div className="hidden w-32 truncate text-xs text-muted-foreground sm:block">
        {artwork.location?.name ?? "—"}
      </div>
      <StatusPill status={artwork.status} />
    </Link>
  );
}
