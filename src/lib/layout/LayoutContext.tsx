import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Layout mode toggle. "classic" = the original sidebar + full-page navigation
// pattern, "split" = master-detail (list + detail panes on inventory /
// contacts / invoices) + slide-over drawers + mobile bottom-tab nav.
//
// Persists to localStorage. No external dep, no schema change. Default
// stays "classic" so existing users see no change unless they opt in
// from /settings.

export type LayoutMode = "classic" | "split";

const STORAGE_KEY = "ygm.layout";

type LayoutContextValue = {
  mode: LayoutMode;
  setMode: (next: LayoutMode) => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

function readInitialMode(): LayoutMode {
  if (typeof window === "undefined") return "classic";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "classic" || stored === "split") return stored;
  return "classic";
}

export function LayoutModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>(() => readInitialMode());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
    // Mirror onto a data attribute so CSS / utility selectors can react if
    // ever needed (e.g. hiding a piece of chrome only in split mode).
    document.documentElement.dataset.layoutMode = mode;
  }, [mode]);

  const setMode = useCallback((next: LayoutMode) => setModeState(next), []);
  const value = useMemo<LayoutContextValue>(() => ({ mode, setMode }), [mode, setMode]);
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayoutMode(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) return { mode: "classic", setMode: () => {} };
  return ctx;
}
