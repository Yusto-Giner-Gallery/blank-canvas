import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Sidebar mode toggle. "pinned" = original always-visible sidebar in the
// flex column. "autohide" = sidebar slides in from the left edge on
// hover and slides out when the cursor moves away. Mobile (<md) is
// unaffected — the existing hamburger sheet stays the right pattern
// for touch.
//
// Persists to localStorage. No external dep, no schema change. Default
// stays "pinned" so existing users see no change unless they opt in
// from /settings.

export type SidebarMode = "pinned" | "autohide";

const STORAGE_KEY = "ygm.sidebarMode";

type SidebarModeContextValue = {
  mode: SidebarMode;
  setMode: (next: SidebarMode) => void;
};

const SidebarModeContext = createContext<SidebarModeContextValue | null>(null);

function readInitialMode(): SidebarMode {
  if (typeof window === "undefined") return "pinned";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "pinned" || stored === "autohide") return stored;
  return "pinned";
}

export function SidebarModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<SidebarMode>(() => readInitialMode());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.dataset.sidebarMode = mode;
  }, [mode]);

  const setMode = useCallback((next: SidebarMode) => setModeState(next), []);
  const value = useMemo<SidebarModeContextValue>(
    () => ({ mode, setMode }),
    [mode, setMode],
  );
  return <SidebarModeContext.Provider value={value}>{children}</SidebarModeContext.Provider>;
}

export function useSidebarMode(): SidebarModeContextValue {
  const ctx = useContext(SidebarModeContext);
  if (!ctx) return { mode: "pinned", setMode: () => {} };
  return ctx;
}
