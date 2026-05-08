import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useRealtimeArtworks } from "@/hooks/useRealtimeArtworks";
import { useRealtimeKanban } from "@/hooks/useRealtimeKanban";
import { recordRouteChange } from "@/lib/feedback-buffer";
import { useLayoutMode } from "@/lib/layout/LayoutContext";
import { useEffect } from "react";

export function AppShell() {
  useRealtimeArtworks();
  useRealtimeKanban();

  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const { mode } = useLayoutMode();
  const splitView = mode === "split";

  useEffect(() => {
    recordRouteChange(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-full bg-background">
      <Sidebar />
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
