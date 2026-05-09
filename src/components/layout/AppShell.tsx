import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, AutohideSidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useRealtimeArtworks } from "@/hooks/useRealtimeArtworks";
import { useRealtimeKanban } from "@/hooks/useRealtimeKanban";
import { recordRouteChange } from "@/lib/feedback-buffer";
import { useLayoutMode } from "@/lib/layout/LayoutContext";
import { useSidebarMode } from "@/lib/layout/SidebarModeContext";
import { useEffect } from "react";

export function AppShell() {
  useRealtimeArtworks();
  useRealtimeKanban();

  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const { mode } = useLayoutMode();
  const splitView = mode === "split";
  const { mode: sidebarMode } = useSidebarMode();
  const autohide = sidebarMode === "autohide";
  const [autohideVisible, setAutohideVisible] = useState(false);

  useEffect(() => {
    recordRouteChange(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setNavOpen(false);
    setAutohideVisible(false);
    // Drop focus from whatever just got clicked (typically a sidebar
    // nav link) so :focus-within on the AutohideSidebar releases. Without
    // this, the sidebar stays slid-out on hover but the link keeps focus,
    // and the focus-within rule would re-pin the sidebar open until the
    // user clicks somewhere else to blur. Mouseleave alone wouldn't be
    // enough.
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
  }, [location.pathname]);

  return (
    <div className="flex h-full bg-background">
      {!autohide ? <Sidebar /> : null}
      {autohide ? (
        <>
          {/* Wordmark stays fixed at top-left at all times — visible
              whether the auto-hide drawer is in or out. Same dimensions
              as the pinned sidebar's internal wordmark so the layout
              math doesn't change between modes.
              border-b is kept (it lines up with the topbar's own
              border-b and reads as one continuous header rule across
              the page). border-r is intentionally OFF — a vertical
              seam there would box the wordmark off from the topbar
              when the drawer is hidden, and from the slid-in sidebar
              (which has its own border-r) when the drawer is in. */}
          <div className="fixed left-0 top-0 z-40 hidden h-14 w-56 items-center gap-2 border-b border-border bg-background px-4 font-recta text-sm font-medium uppercase tracking-[0.22em] md:flex">
            <span>Yusto</span>
            <span aria-hidden className="text-accent-red text-base font-normal leading-none">
              /
            </span>
            <span>Giner</span>
          </div>
          {/* Hover zone — thin invisible strip on the very left edge
              that triggers slide-in. Sits below the wordmark so the
              wordmark area itself doesn't pop the sidebar (would
              feel jumpy if it did). z below the sidebar so when the
              sidebar is visible, clicking through it is impossible. */}
          <div
            className="fixed bottom-0 left-0 top-14 z-20 hidden w-2 md:block"
            onMouseEnter={() => setAutohideVisible(true)}
            aria-hidden
          />
          <AutohideSidebar
            visible={autohideVisible}
            onVisibilityChange={setAutohideVisible}
          />
        </>
      ) : null}
      <MobileSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <main
          className={
            "flex-1 overflow-y-auto px-4 py-6 md:px-8 " +
            (splitView ? "pb-20 md:pb-6" : "")
          }
        >
          <Outlet />
        </main>
      </div>
      {splitView ? <MobileBottomNav onMore={() => setNavOpen(true)} /> : null}
    </div>
  );
}
