import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useRealtimeArtworks } from "@/hooks/useRealtimeArtworks";
import { useRealtimeKanban } from "@/hooks/useRealtimeKanban";

export function AppShell() {
  // Subscribes to artworks/artwork_tags/artwork_images channel and
  // invalidates the cache on changes (multi-tab/multi-user sync).
  useRealtimeArtworks();
  useRealtimeKanban();

  return (
    <div className="flex h-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <span
            aria-hidden
            className="pointer-events-none absolute right-4 top-4 h-3 w-3 border-r-2 border-t-2 border-accent-red md:right-8 md:top-6"
          />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
