import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useRealtimeArtworks } from "@/hooks/useRealtimeArtworks";
import { useRealtimeKanban } from "@/hooks/useRealtimeKanban";
import { FeedbackWidget } from "@/components/shared/FeedbackWidget";
import { recordRouteChange } from "@/lib/feedback-buffer";

export function AppShell() {
  // Subscribes to artworks/artwork_tags/artwork_images channel and
  // invalidates the cache on changes (multi-tab/multi-user sync).
  useRealtimeArtworks();
  useRealtimeKanban();

  const location = useLocation();
  useEffect(() => {
    recordRouteChange(location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
