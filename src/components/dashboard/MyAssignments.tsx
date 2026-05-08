import { Link } from "react-router-dom";
import { useMyAssignedCards, type AssignedCard } from "@/hooks/useMyAssignedCards";
import { useT, useLocale } from "@/lib/i18n/LocaleContext";
import { cn } from "@/lib/utils";

// Dashboard widget — Shirika cards where the current user is a member.
// Pattern from Linear's "Assigned to me", Asana's "My tasks", GitHub's
// notification dropdown: title + breadcrumb + due-date pill, with the
// pill colored by urgency (overdue red, today attention orange, this
// week neutral, future / undated muted).

export function MyAssignments() {
  const t = useT();
  const { locale } = useLocale();
  const { data, isLoading, error } = useMyAssignedCards();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("assignments.loading")}</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">{(error as Error).message}</p>
    );
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("assignments.empty")}</p>;
  }

  return (
    <ul className="divide-y divide-border border border-border">
      {data.map((card) => {
        const status = dueStatus(card.due_date);
        return (
          <li key={card.id}>
            {/* Click jumps straight into the board with the card-detail
                modal auto-opened (?card=<id> handled in BoardDetail). */}
            <Link
              to={`/kanban/${card.board.id}?card=${card.id}`}
              className="flex items-baseline gap-3 px-3 py-2.5 text-sm hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{card.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {card.board.name} · {card.list.name}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs tabular-nums uppercase tracking-wider",
                  status === "overdue" && "text-destructive font-medium",
                  status === "today" && "text-[hsl(var(--attention))] font-medium",
                  status === "upcoming" && "text-foreground",
                  status === "none" && "text-muted-foreground",
                )}
              >
                {formatDuePill(card, t, locale)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type DueStatus = "overdue" | "today" | "upcoming" | "none";

function dueStatus(due: string | null): DueStatus {
  if (!due) return "none";
  const today = new Date().setHours(0, 0, 0, 0);
  const dueMs = new Date(due).setHours(0, 0, 0, 0);
  if (dueMs < today) return "overdue";
  if (dueMs < today + 24 * 60 * 60 * 1000) return "today";
  return "upcoming";
}

function formatDuePill(
  card: AssignedCard,
  t: (k: string, vars?: Record<string, string | number>) => string,
  locale: string,
): string {
  if (!card.due_date) return t("assignments.due.noDate");
  const today = new Date().setHours(0, 0, 0, 0);
  const dueMs = new Date(card.due_date).setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueMs - today) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) {
    if (diffDays === -1) return t("assignments.due.daysAgo", { n: 1 });
    if (diffDays > -7) return t("assignments.due.daysAgo", { n: -diffDays });
    // Older than a week: show a real date.
    return new Date(card.due_date).toLocaleDateString(
      locale === "es" ? "es-ES" : "en-GB",
      { day: "2-digit", month: "short" },
    );
  }
  if (diffDays === 0) return t("assignments.due.today");
  if (diffDays === 1) return t("assignments.due.tomorrow");
  if (diffDays < 14) return t("assignments.due.daysFromNow", { n: diffDays });
  return new Date(card.due_date).toLocaleDateString(
    locale === "es" ? "es-ES" : "en-GB",
    { day: "2-digit", month: "short" },
  );
}
