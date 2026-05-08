import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useRealtimeArtworks } from "@/hooks/useRealtimeArtworks";
import { useRealtimeKanban } from "@/hooks/useRealtimeKanban";
import { recordRouteChange } from "@/lib/feedback-buffer";
import { useEffect } from "react";

export function AppShell() {
  useRealtimeArtworks();
  useRealtimeKanban();

  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

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
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
