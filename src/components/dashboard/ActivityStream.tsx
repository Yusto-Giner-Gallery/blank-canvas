import { Link } from "react-router-dom";
import { useGlobalActivity, type ActivityLogRow } from "@/hooks/useActivityLog";
import { useActivityContext } from "@/hooks/useActivityContext";
import { useT, useLocale } from "@/lib/i18n/LocaleContext";
import type { ActivityEntityType, Json } from "@/integrations/supabase/domain";

// Activity stream — chronological feed of every audited change in the
// gallery. Renders the most recent N rows from the activity_log table
// (RLS-scoped by gallery_id). Empty until Lovable's `log_change()`
// trigger is wired (CLAUDE.md §13).
//
// Each row reads as one human sentence: the actor's name, a verb, the
// changed field in plain language, the before/after values mapped to
// readable labels, and a relative time. Field/value mapping is in
// FIELD_BEHAVIOR + ENUM_VALUES below — schema names like "list_id" or
// "sort_order" never reach the user.

// Fields that are pure mechanical noise — drag-and-drop reorders, soft
// timestamps, etc. They flood the feed without telling anyone anything,
// so we drop them at the renderer (cheaper than filtering server-side).
const SKIP_FIELDS = new Set([
  "sort_order",
  "position",
  "updated_at",
  "deleted_at",
]);

// Per-field rendering shape. "values" → show before → after through
// formatValue (most fields). "hide" → omit values entirely; the line
// reads "<actor> changed <label>" because the values are opaque IDs
// (list_id, artist_id, location_id…) and rendering UUIDs would be
// worse than saying nothing.
type FieldShape = "values" | "hide";
const HIDE_VALUE_FIELDS = new Set([
  "list_id",
  "artist_id",
  "location_id",
  "contact_id",
  "artwork_id",
  "from_location_id",
  "to_contact_id",
  "pair_artwork_id",
]);

// Verb override for specific fields — "moved a kanban card" reads better
// than "changed list" when the field is list_id on a card.
const MOVED_FIELDS_BY_ENTITY: Record<string, Set<string>> = {
  card: new Set(["list_id"]),
  artwork: new Set(["location_id"]),
};

// Enum values that have a translation key under "activity.value.<v>".
// Anything not in this set falls through to the raw string, with UUIDs
// replaced by the localised "another item" placeholder.
const ENUM_VALUES = new Set([
  "available",
  "on_hold",
  "sold",
  "archived",
  "draft",
  "sent",
  "paid",
  "cancelled",
  "lead",
  "interested",
  "offer_sent",
  "negotiating",
  "won",
  "lost",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ActivityStream({ limit = 30 }: { limit?: number }) {
  const t = useT();
  const { locale } = useLocale();
  const { data, isLoading, error } = useGlobalActivity(limit);
  // Filter noisy rows BEFORE the empty check, so a feed of nothing-but-
  // sort_order changes correctly renders as "No activity yet."
  const rows = (data ?? []).filter(
    (r) => !r.field || !SKIP_FIELDS.has(r.field),
  );
  // Resolve names + parent context for the rows we're about to show.
  // Rows render with the unnamed phrasing while context loads, then
  // upgrade to "Shirika card 'Ship feet'" once names land.
  const ctx = useActivityContext(rows);
  const ctxMap = ctx.data;

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
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
    );
  }
  return (
    <ul className="divide-y divide-border border border-border">
      {rows.map((row) => {
        const entry = ctxMap?.get(`${row.entity_type}:${row.entity_id}`);
        const href = entry?.href ?? targetUrl(row);
        const content = (
          <>
            <span className="flex-1">{describeRow(row, t, entry?.label)}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {relativeTime(row.created_at, locale, t)}
            </span>
          </>
        );
        return (
          <li key={row.id}>
            {href ? (
              <Link
                to={href}
                className="flex items-baseline gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent/40"
              >
                {content}
              </Link>
            ) : (
              <div className="flex items-baseline gap-3 px-3 py-2 text-sm">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Resolve where clicking a row should land. activity_log rows store the
// entity_id but no board / parent context, so for entities without a
// per-id detail page (deals, cards, loans/consignments/shipments/
// documents) we land at the closest list view from which the user can
// drill in. Returns null if we genuinely have no destination.
function targetUrl(row: ActivityLogRow): string | null {
  const id = row.entity_id;
  switch (row.entity_type as ActivityEntityType) {
    case "artwork":
      return `/inventory/${id}`;
    case "contact":
      return `/contacts/${id}`;
    case "invoice":
      return `/invoices/${id}`;
    case "deal":
      // No per-deal route — pipeline is the only deal surface.
      return "/pipeline";
    case "card":
      // We don't know the board_id from the activity row; the boards
      // list is the closest landing surface. A future enhancement could
      // join lists+boards on the server side and deep-link with ?card=.
      return "/kanban";
    case "loan":
    case "consignment":
    case "shipment":
    case "document":
      // These surface from the artwork detail action rail. Without the
      // parent artwork_id on the activity row, the inventory list is
      // the right fallback.
      return "/inventory";
    default:
      return null;
  }
}

function describeRow(
  row: ActivityLogRow,
  t: (k: string, vars?: Record<string, string | number>) => string,
  name?: string,
): string {
  const actor = row.actor?.full_name?.trim() || t("activity.someone");
  const entityType = row.entity_type as ActivityEntityType;
  // Named when useActivityContext has resolved the row's label, unnamed
  // (the existing "a Shirika card" / "an artwork" phrase) otherwise.
  const entity = name
    ? t(`activity.named.${entityType}`, { name })
    : t(`activity.entity.${entityType}`);

  // Field-level update.
  if (row.field) {
    const fieldLabel = labelForField(row.field, t);
    const shape: FieldShape = HIDE_VALUE_FIELDS.has(row.field)
      ? "hide"
      : "values";
    // "moved" reads more naturally for spatial moves (card across lists,
    // artwork across locations) than "changed".
    const isMove =
      MOVED_FIELDS_BY_ENTITY[entityType]?.has(row.field) ?? false;
    if (shape === "hide") {
      const verb = isMove ? t("activity.moved") : t("activity.changed");
      return `${actor} ${verb} ${entity}${isMove ? "" : ` (${fieldLabel})`}`;
    }
    const before = formatValue(row.before, t);
    const after = formatValue(row.after, t);
    if (before && after) {
      return `${actor} ${t("activity.changed")} ${fieldLabel}: ${before} → ${after} · ${entity}`;
    }
    return `${actor} ${t("activity.changed")} ${fieldLabel} · ${entity}`;
  }

  // Event-level row (no field — created / archived / etc.).
  const verbKey = `activity.verb.${row.event_type ?? "updated"}`;
  return `${actor} ${t(verbKey)} ${entity}`;
}

function labelForField(
  field: string,
  t: (k: string) => string,
): string {
  const key = `activity.field.${field}`;
  const translated = t(key);
  // resolve() returns the key itself when missing — fall back to a tidy
  // version of the raw column name (snake_case → space).
  if (translated === key) return field.replace(/_/g, " ");
  return translated;
}

function formatValue(
  v: Json,
  t: (k: string, vars?: Record<string, string | number>) => string,
): string {
  if (v == null || v === "") return t("activity.value.empty");
  if (typeof v === "boolean") {
    return t(`activity.value.${v ? "true" : "false"}`);
  }
  if (typeof v === "number") {
    // Prices / sizes / years are all just numbers in activity_log; we
    // don't know the unit context here, so render the raw number with
    // locale-aware separators.
    return Number.isFinite(v) ? v.toLocaleString() : String(v);
  }
  if (typeof v === "string") {
    // Enum value mapped to plain language.
    if (ENUM_VALUES.has(v)) return t(`activity.value.${v}`);
    // Bare UUID — replace with "(another item)" placeholder so the user
    // doesn't see a 36-char hex blob in their notification feed.
    if (UUID_RE.test(v.trim())) return t("activity.value.another");
    // Long string: truncate so it doesn't blow out the row.
    return v.length > 60 ? v.slice(0, 57) + "…" : v;
  }
  // Object/array — terse JSON, capped.
  try {
    const s = JSON.stringify(v);
    return s.length > 60 ? s.slice(0, 57) + "…" : s;
  } catch {
    return t("activity.value.empty");
  }
}

function relativeTime(
  iso: string,
  locale: string,
  t: (k: string) => string,
): string {
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
  return new Date(iso).toLocaleDateString(
    locale === "es" ? "es-ES" : "en-GB",
  );
}
