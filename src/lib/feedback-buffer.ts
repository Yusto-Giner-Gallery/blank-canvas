// Captures recent console output and user actions in a small in-memory
// ring buffer so bug reports can include reproduction context.
// Initialised once at app startup; lives until full reload.

type LogLevel = "log" | "warn" | "error" | "info";
type LogEntry = { level: LogLevel; ts: string; args: unknown[] };
type ActionEntry = { ts: string; type: string; detail?: string };

const MAX = 50;
const logs: LogEntry[] = [];
const actions: ActionEntry[] = [];

function safeSerialise(v: unknown): unknown {
  try {
    if (v instanceof Error)
      return { name: v.name, message: v.message, stack: v.stack };
    if (v === null || v === undefined) return v;
    if (typeof v === "object") {
      // Truncate to avoid huge payloads.
      const json = JSON.stringify(v);
      return json.length > 1000 ? json.slice(0, 1000) + "…" : JSON.parse(json);
    }
    return v;
  } catch {
    return String(v);
  }
}

function pushLog(level: LogLevel, args: unknown[]) {
  logs.push({
    level,
    ts: new Date().toISOString(),
    args: args.map(safeSerialise),
  });
  if (logs.length > MAX) logs.shift();
}

function pushAction(type: string, detail?: string) {
  actions.push({ ts: new Date().toISOString(), type, detail });
  if (actions.length > MAX) actions.shift();
}

export function initFeedbackBuffer(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __ygm_feedback__?: boolean };
  if (w.__ygm_feedback__) return;
  w.__ygm_feedback__ = true;

  for (const level of ["log", "warn", "error", "info"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      pushLog(level, args);
      original(...args);
    };
  }

  // Click capture — find the closest interactive ancestor and record a
  // short label. We never capture input values.
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(
        "button,a,[role='button'],[role='link'],[role='menuitem']",
      ) as HTMLElement | null;
      const el = interactive ?? target;
      const tag = el.tagName.toLowerCase();
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("data-testid") ||
        el.textContent?.trim().slice(0, 40) ||
        "";
      const href = el.getAttribute("href") || "";
      pushAction(
        `click:${tag}`,
        [label, href].filter(Boolean).join(" · ") || undefined,
      );
    },
    true,
  );

  window.addEventListener("error", (e) => {
    pushLog("error", [`${e.message} @ ${e.filename}:${e.lineno}`]);
  });

  window.addEventListener("unhandledrejection", (e) => {
    pushLog("error", [`unhandled rejection: ${String(e.reason)}`]);
  });
}

export function recordRouteChange(path: string): void {
  pushAction("navigate", path);
}

export function snapshotFeedback(): {
  logs: LogEntry[];
  actions: ActionEntry[];
} {
  return { logs: [...logs], actions: [...actions] };
}
