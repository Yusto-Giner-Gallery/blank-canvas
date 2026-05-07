import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

// Subscribes to changes on artworks, artwork_tags, artwork_images and
// invalidates the artworks query so multiple open tabs stay in sync within
// ~1s. Per spec: "edit propagates via Realtime to a second open tab within
// 1s." Activated globally from AppShell.
export function useRealtimeArtworks() {
  const qc = useQueryClient();
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel(`gallery:${profile.gallery_id}:artworks`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artworks" },
        () => qc.invalidateQueries({ queryKey: ["artworks"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artwork_tags" },
        () => qc.invalidateQueries({ queryKey: ["artworks"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artwork_images" },
        () => qc.invalidateQueries({ queryKey: ["artworks"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [profile, qc]);
}
