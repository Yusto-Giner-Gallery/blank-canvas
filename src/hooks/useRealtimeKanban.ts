import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

// Companion to useRealtimeArtworks. Subscribes to kanban-shaped tables
// and invalidates the `boards`/`board` queries plus `artworks` (so the
// orange "needs attention" flag picks up new card mentions). One channel
// per gallery; mounted globally from AppShell.
export function useRealtimeKanban() {
  const qc = useQueryClient();
  const { profile } = useProfile();

  useEffect(() => {
    if (!profile) return;
    const ch = supabase
      .channel(`gallery:${profile.gallery_id}:kanban`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "boards" },
        () => qc.invalidateQueries({ queryKey: ["boards"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists" },
        () => qc.invalidateQueries({ queryKey: ["board"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards" },
        () => qc.invalidateQueries({ queryKey: ["board"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_artwork_mentions" },
        () => {
          qc.invalidateQueries({ queryKey: ["board"] });
          qc.invalidateQueries({ queryKey: ["artworks"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_members" },
        () => qc.invalidateQueries({ queryKey: ["card_members"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_checklist" },
        () => qc.invalidateQueries({ queryKey: ["card_checklist"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_comments" },
        () => qc.invalidateQueries({ queryKey: ["card_comments"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_attachments" },
        () => qc.invalidateQueries({ queryKey: ["card_attachments"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [profile, qc]);
}
