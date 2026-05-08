import { useGlobalActivity, type ActivityLogRow } from "@/hooks/useActivityLog";
import { useT, useLocale } from "@/lib/i18n/LocaleContext";
import type { ActivityEntityType, Json } from "@/integrations/supabase/domain";

// Activity stream — chronological feed of every audited change in the
// gallery. Renders the most recent N rows from the activity_log table
// (RLS-scoped by gallery_id). Empty until Lovable's `log_change()`
// trigger is wired (CLAUDE.md §13). Each row is a single line:
//   <Actor> <verb> <field> <entity> · <relative time>
// Actor falls back to a localized "Someone" if profile is missing.

export function ActivityStream({ limit = 30 }: { limit?: number }) {
  const t = useT();
  const { locale } = useLocale();
  const { data, isLoading, error } = useGlobalActivity(limit);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">{t("activity.loading")}</p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {t("activity.error")} {(error as Error).message}
      </p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
    );
  }
  return (
    <ul className="divide-y divide-border border border-border">
      {data.map((row) => (
        <li key={row.id} className="flex items-baseline gap-3 px-3 py-2 text-sm">
          <span className="flex-1">{describeRow(row, t)}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {relativeTime(row.created_at, locale, t)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function describeRow(row: ActivityLogRow, t: (k: string) => string): string {
  const actor = row.actor?.full_name?.trim() || t("activity.someone");
  const entityKey = `activity.entity.${row.entity_type as ActivityEntityType}`;
  const entity = t(entityKey);
  // Field-level update: "Maria changed status from on_hold to sold on an artwork"
  if (row.field) {
    const before = formatValue(row.before);
    const after = formatValue(row.after);
    if (before && after) {
      return `${actor} ${t("activity.changed")} ${row.field}: ${before} → ${after} · ${entity}`;
    }
    return `${actor} ${t("activity.changed")} ${row.field} · ${entity}`;
  }
  // Event-level row: "Maria created an artwork"
  const verbKey = `activity.verb.${row.event_type ?? "updated"}`;
  return `${actor} ${t(verbKey)} ${entity}`;
}

function formatValue(v: Json): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Object/array values — keep terse so the line doesn't wrap.
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  } catch {
    return "—";
  }
}

function relativeTime(iso: string, locale: string, t: (k: string) => string): string {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - ts) / 1000));
  if (diffSec < 60) return t("activity.relative.justNow");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${t("activity.relative.minute")}`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${t("activity.relative.hour")}`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} ${t("activity.relative.day")}`;
  const diffWk = Math.round(diffDay / 7);
  if (diffWk < 5) return `${diffWk} ${t("activity.relative.week")}`;
  // Older than ~5 weeks: fall back to a locale-formatted date.
  return new Date(iso).toLocaleDateString(locale === "es" ? "es-ES" : "en-GB");
}
