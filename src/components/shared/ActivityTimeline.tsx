import { Label } from "@/components/ui/label";
import {
  useActivityLog,
  type ActivityLogRow,
} from "@/hooks/useActivityLog";
import type { ActivityEntityType, Json } from "@/integrations/supabase/domain";

function formatValue(v: Json | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function describe(row: ActivityLogRow): string {
  if (row.field) {
    const before = formatValue(row.before);
    const after = formatValue(row.after);
    return `changed ${row.field}: ${before} → ${after}`;
  }
  if (row.event_type) return row.event_type.replace(/_/g, " ");
  return "updated";
}

export function ActivityTimeline({
  entity_type,
  entity_id,
  limit = 20,
  emptyHint,
}: {
  entity_type: ActivityEntityType;
  entity_id: string;
  limit?: number;
  emptyHint?: React.ReactNode;
}) {
  const { data, isLoading, error } = useActivityLog(entity_type, entity_id, limit);
  const items = data ?? [];

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">History</Label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {emptyHint ??
            "No history yet. Field changes start appearing here once the activity-log trigger is set up on the backend."}
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <span className="text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </span>
              <span className="flex-1">
                <span className="font-medium">
                  {row.actor?.full_name ?? row.actor?.email ?? "system"}
                </span>{" "}
                {describe(row)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
