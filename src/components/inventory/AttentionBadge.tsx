import { AlertTriangle } from "lucide-react";

export function AttentionBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium text-[hsl(var(--attention))] ring-1 ring-[hsl(var(--attention))]/40"
      title="Needs attention this week"
    >
      <AlertTriangle className="h-3 w-3" />
      Attention
    </span>
  );
}
