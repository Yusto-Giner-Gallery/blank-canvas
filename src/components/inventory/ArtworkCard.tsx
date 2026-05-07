import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { ArtworkListItem } from "@/integrations/supabase/types";
import { imageUrl } from "@/hooks/useArtworks";
import { useLongPress } from "@/hooks/useLongPress";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusPill } from "./StatusPill";
import { AttentionBadge } from "./AttentionBadge";
import { formatSize } from "./sizeFormat";
import { cn } from "@/lib/utils";

export function ArtworkCard({
  artwork,
  onQuickEdit,
  selected,
  onToggleSelect,
}: {
  artwork: ArtworkListItem;
  onQuickEdit?: (artwork: ArtworkListItem, x: number, y: number) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const url = imageUrl(artwork.primary_image?.storage_path);
  const size = formatSize(artwork.width_cm, artwork.height_cm, artwork.depth_cm);

  const longPress = useLongPress<HTMLAnchorElement>((e) => {
    if (!onQuickEdit) return;
    const t = e.touches[0] ?? e.changedTouches[0];
    onQuickEdit(artwork, t?.clientX ?? 0, t?.clientY ?? 0);
  });

  return (
    <Link
      to={`/inventory/${artwork.id}`}
      onContextMenu={(e) => {
        if (!onQuickEdit) return;
        e.preventDefault();
        onQuickEdit(artwork, e.clientX, e.clientY);
      }}
      {...longPress}
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-foreground/40",
        selected && "border-foreground/80 ring-1 ring-foreground/40",
      )}
    >
      <div className="relative aspect-square w-full bg-muted">
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
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
