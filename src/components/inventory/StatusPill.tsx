import type { ArtworkStatus } from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

const labels: Record<ArtworkStatus, string> = {
  available: "Available",
  on_hold: "On hold",
  sold: "Sold",
  archived: "Archived",
};

export function StatusPill({
  status,
  className,
}: {
  status: ArtworkStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
