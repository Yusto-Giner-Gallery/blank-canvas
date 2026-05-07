import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bug, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/hooks/useProfile";
import { useFeedback, type FeedbackListItem } from "@/hooks/useFeedback";
import { cn } from "@/lib/utils";

type Filter = "all" | "bug" | "feature";

export default function Feedback() {
  const { loading, isAdmin } = useProfile();
  const feedbackQuery = useFeedback();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const all = feedbackQuery.data ?? [];
  const bugs = all.filter((r) => r.kind === "bug");
  const features = all.filter((r) => r.kind === "feature");
  const visible =
    filter === "all" ? all : filter === "bug" ? bugs : features;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Bug reports and feature requests from the team.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`All (${all.length})`}
        />
        <FilterChip
          active={filter === "bug"}
          onClick={() => setFilter("bug")}
          icon={<Bug className="h-3.5 w-3.5" />}
          label={`Bugs (${bugs.length})`}
        />
        <FilterChip
          active={filter === "feature"}
          onClick={() => setFilter("feature")}
          icon={<Plus className="h-3.5 w-3.5" />}
          label={`Features (${features.length})`}
        />
      </div>

      {feedbackQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : feedbackQuery.error ? (
        <p className="text-sm text-destructive">
          Could not load feedback. {(feedbackQuery.error as Error).message}
        </p>
      ) : visible.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nothing yet</CardTitle>
            <CardDescription>
              {filter === "all"
                ? "No reports have been submitted. The team can send bugs and feature requests from the corner of any page."
                : filter === "bug"
                  ? "No bug reports yet."
                  : "No feature requests yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((r) => (
            <ReportItem
              key={r.id}
              report={r}
              expanded={!!expanded[r.id]}
              onToggle={() =>
                setExpanded((s) => ({ ...s, [r.id]: !s[r.id] }))
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ReportItem({
  report,
  expanded,
  onToggle,
}: {
  report: FeedbackListItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const when = useMemo(
    () => relativeTime(report.created_at),
    [report.created_at],
  );
  const reporterName =
    report.reporter?.full_name?.trim() ||
    report.reporter?.email ||
    "Unknown";
  const isBug = report.kind === "bug";

  return (
    <li className="border border-border bg-card">
      <header className="flex items-start gap-3 p-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
            isBug
              ? "border-accent-red text-accent-red"
              : "border-border text-muted-foreground",
          )}
        >
          {isBug ? <Bug className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {isBug ? "Bug" : "Feature"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="text-foreground">{reporterName}</span>
            <span>·</span>
            <span>{when}</span>
            <span>·</span>
            <code className="font-mono text-[11px]">{report.page_path ?? "—"}</code>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">
            {report.description}
          </p>
        </div>
        {isBug ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-label={expanded ? "Collapse" : "Expand details"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        ) : null}
      </header>

      {isBug && expanded ? (
        <div className="space-y-4 border-t border-border bg-muted/40 p-4 text-xs">
          <DiagnosticsBlock label="User agent" value={report.user_agent ?? "—"} />
          <DiagnosticsBlock
            label="Recent actions"
            value={formatJson(report.action_history)}
          />
          <DiagnosticsBlock
            label="Console logs"
            value={formatJson(report.console_logs)}
          />
        </div>
      ) : null}
    </li>
  );
}

function DiagnosticsBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words border border-border bg-background p-2 font-mono text-[11px] leading-snug">
        {value}
      </pre>
    </div>
  );
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return RTF.format(days, "day");
  return new Date(iso).toLocaleDateString();
}
