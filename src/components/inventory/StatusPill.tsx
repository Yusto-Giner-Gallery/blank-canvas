import type { ArtworkStatus } from "@/integrations/supabase/domain";
import { cn } from "@/lib/utils";

const labels: Record<ArtworkStatus, string> = {
  available: "Available",
  on_hold: "On hold",
  sold: "Sold",
  archived: "Archived",
};

// Color exception #5 (CLAUDE.md §3): the status word reads in its own hue,
// with a matching hairline border and a faint dot. available=green,
// on_hold=yellow, sold=red, archived=orange.
const styles: Record<ArtworkStatus, string> = {
  available: "text-status-available border-status-available/40",
  on_hold: "text-status-on-hold border-status-on-hold/40",
  sold: "text-status-sold border-status-sold/40",
  archived: "text-status-archived border-status-archived/40",
};

const dot: Record<ArtworkStatus, string> = {
  available: "bg-status-available",
  on_hold: "bg-status-on-hold",
  sold: "bg-status-sold",
  archived: "bg-status-archived",
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
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs",
        styles[status],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dot[status])} />
      {labels[status]}
    </span>
  );
}
