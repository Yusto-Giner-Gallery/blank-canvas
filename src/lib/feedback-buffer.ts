// Captures recent console output and user actions in time-windowed
// in-memory buffers so bug reports can include the last ~30 seconds of
// reproduction context. Initialised once at app startup; lives until
// full reload.

type LogLevel = "log" | "warn" | "error" | "info";
type LogEntry = {
  level: LogLevel;
  ts: string;
  url: string;
  args: unknown[];
};
type ActionEntry = {
  ts: string;
  url: string;
  type: string;
  detail?: string;
};

// Keep ~30s of context. Hard caps prevent runaway growth on busy pages.
const WINDOW_MS = 30_000;
const MAX_LOGS = 200;
const MAX_ACTIONS = 200;

const logs: LogEntry[] = [];
const actions: ActionEntry[] = [];

function nowIso() {
  return new Date().toISOString();
}

function currentUrl() {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

function trimWindow<T extends { ts: string }>(arr: T[], cap: number) {
  const cutoff = Date.now() - WINDOW_MS;
  while (arr.length && new Date(arr[0].ts).getTime() < cutoff) arr.shift();
  while (arr.length > cap) arr.shift();
}

function safeSerialise(v: unknown): unknown {
  try {
    if (v instanceof Error)
      return { name: v.name, message: v.message, stack: v.stack };
    if (v === null || v === undefined) return v;
    if (typeof v === "object") {
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
    ts: nowIso(),
    url: currentUrl(),
    args: args.map(safeSerialise),
  });
  trimWindow(logs, MAX_LOGS);
}

function describeElement(el: Element): string {
  const html = el as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role");
  const aria = el.getAttribute("aria-label");
  const testid = el.getAttribute("data-testid");
  const text = (html.innerText || el.textContent || "").trim().slice(0, 60);
  const id = el.id ? `#${el.id}` : "";
  const cls = html.className && typeof html.className === "string"
    ? `.${html.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`
    : "";
  const label = aria || testid || text || cls || id || "";
  return [`${tag}${role ? `[role=${role}]` : ""}`, label]
    .filter(Boolean)
    .join(" · ");
}

let lastAction: { type: string; detail?: string; ts: number } | null = null;

function pushAction(type: string, detail?: string) {
  // Suppress identical events fired within 250ms (e.g. scroll/resize bursts).
  const now = Date.now();
  if (
    lastAction &&
    lastAction.type === type &&
    lastAction.detail === detail &&
    now - lastAction.ts < 250
  ) {
    return;
  }
  lastAction = { type, detail, ts: now };
  actions.push({ ts: nowIso(), url: currentUrl(), type, detail });
  trimWindow(actions, MAX_ACTIONS);
}

export function initFeedbackBuffer(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __ygm_feedback__?: boolean };
  if (w.__ygm_feedback__) return;
  w.__ygm_feedback__ = true;

  // Console patching.
  for (const level of ["log", "warn", "error", "info"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      pushLog(level, args);
      original(...args);
    };
  }

  // Initial context.
  pushAction("session-start", `${navigator.userAgent.slice(0, 80)}`);
  pushAction("navigate", currentUrl());

  // Click capture (interactive ancestor preferred).
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as Element | null;
      if (!target) return;
      const interactive = (target.closest(
        "button,a,[role='button'],[role='link'],[role='menuitem'],[role='tab'],input[type='checkbox'],input[type='radio']",
      ) as Element | null) ?? target;
      pushAction(`click:${interactive.tagName.toLowerCase()}`, describeElement(interactive));
    },
    true,
  );

  // Form interactions — record focus + change of input fields, but never
  // record the value typed.
  document.addEventListener(
    "focusin",
    (e) => {
      const el = e.target as Element | null;
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") {
        pushAction("focus", describeElement(el));
      }
    },
    true,
  );
  document.addEventListener(
    "change",
    (e) => {
      const el = e.target as HTMLInputElement | null;
      if (!el) return;
      const tag = el.tagName.toLowerCase();
      if (tag === "input" && (el.type === "checkbox" || el.type === "radio")) {
        pushAction(
          `${el.type}:${el.checked ? "on" : "off"}`,
          describeElement(el),
        );
      } else if (tag === "select" || tag === "input" || tag === "textarea") {
        // Don't log the value — just that it changed.
        pushAction("change", describeElement(el));
      }
    },
    true,
  );

  // Form submit.
  document.addEventListener(
    "submit",
    (e) => {
      const el = e.target as Element | null;
      if (!el) return;
      pushAction("submit", describeElement(el));
    },
    true,
  );

  // Keyboard shortcuts of interest (Enter, Escape, modifier combos).
  document.addEventListener(
    "keydown",
    (e) => {
      const interesting =
        e.key === "Escape" ||
        e.key === "Enter" ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey;
      if (!interesting) return;
      const target = e.target as Element | null;
      const mods = [
        e.metaKey ? "Meta" : "",
        e.ctrlKey ? "Ctrl" : "",
        e.altKey ? "Alt" : "",
        e.shiftKey ? "Shift" : "",
      ]
        .filter(Boolean)
        .join("+");
      const combo = mods ? `${mods}+${e.key}` : e.key;
      pushAction("key", `${combo}${target ? ` · ${describeElement(target)}` : ""}`);
    },
    true,
  );

  // Scroll milestones (throttled by suppress logic above).
  window.addEventListener(
    "scroll",
    () => {
      const y = Math.round(window.scrollY);
      const bucket = Math.round(y / 200) * 200;
      pushAction("scroll", `y=${bucket}`);
    },
    { capture: true, passive: true },
  );

  // Page visibility (tab switch / refocus).
  document.addEventListener("visibilitychange", () => {
    pushAction("visibility", document.visibilityState);
  });

  // Network failures (best effort — captures fetch errors only).
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] instanceof URL
          ? args[0].toString()
          : (args[0] as Request).url;
    try {
      const res = await origFetch(...args);
      if (!res.ok) {
        pushAction("fetch", `${res.status} ${truncateUrl(url)}`);
      }
      return res;
    } catch (err) {
      pushAction("fetch-error", `${truncateUrl(url)} · ${String(err).slice(0, 80)}`);
      throw err;
    }
  };

  // Runtime errors.
  window.addEventListener("error", (e) => {
    pushLog("error", [`${e.message} @ ${e.filename}:${e.lineno}`]);
    pushAction("runtime-error", e.message?.slice(0, 120));
  });
  window.addEventListener("unhandledrejection", (e) => {
    pushLog("error", [`unhandled rejection: ${String(e.reason)}`]);
    pushAction("unhandled-rejection", String(e.reason).slice(0, 120));
  });
}

function truncateUrl(u: string): string {
  try {
    const parsed = new URL(u, window.location.origin);
    return parsed.pathname + (parsed.search ? "?…" : "");
  } catch {
    return u.slice(0, 80);
  }
}

export function recordRouteChange(path: string): void {
  pushAction("navigate", path);
}

export function snapshotFeedback(): {
  logs: LogEntry[];
  actions: ActionEntry[];
  context: {
    captured_at: string;
    window_seconds: number;
    page_url: string;
    referrer: string;
    viewport: string;
    timezone: string;
    locale: string;
  };
} {
  trimWindow(logs, MAX_LOGS);
  trimWindow(actions, MAX_ACTIONS);
  return {
    logs: [...logs],
    actions: [...actions],
    context: {
      captured_at: nowIso(),
      window_seconds: WINDOW_MS / 1000,
      page_url: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`
          : "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: navigator?.language ?? "",
    },
  };
}
