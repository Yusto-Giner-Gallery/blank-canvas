import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Card, CardLabel } from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

// Cards the current user is assigned to (`card_members.profile_id = me`),
// joined with their containing list + board so the UI can show
// "Board · List" context and link straight back to the card. Used by the
// dashboard's "Assigned to you" widget and by the Shirika nav badge.
//
// Ordering is done client-side: overdue first (by due_date asc), then due
// today, then upcoming (by due_date asc), then cards without a due date
// (by created_at desc). Postgres can't easily express this without a view
// and the resultset is small (per-user assignment count, typically < 30).

export type AssignedCard = Card & {
  board: { id: string; name: string };
  list: { id: string; name: string };
};

type RawRow = {
  card: (Card & {
    list: { id: string; name: string; board: { id: string; name: string } } | null;
  }) | null;
};

export function useMyAssignedCards(limit = 30) {
  const { profile } = useProfile();
  return useQuery<AssignedCard[]>({
    queryKey: ["my_assigned_cards", profile?.id ?? null, limit],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("card_members")
        .select(
          `card:cards (
            *,
            list:lists ( id, name, board:boards ( id, name ) )
          )`,
        )
        .eq("profile_id", profile.id)
        .returns<RawRow[]>();
      if (error) throw error;
      const flattened: AssignedCard[] = [];
      for (const row of data ?? []) {
        if (!row.card || !row.card.list || !row.card.list.board) continue;
        const { list, ...card } = row.card;
        flattened.push({
          ...(card as Card),
          board: { id: list.board.id, name: list.board.name },
          list: { id: list.id, name: list.name },
          // Ensure the type compiler sees the labels field as the right type.
          labels: (card as { labels: CardLabel[] }).labels ?? [],
        });
      }
      // Sort: overdue → today → upcoming (by date asc) → no date (newest first).
      const todayMs = new Date().setHours(0, 0, 0, 0);
      const dayMs = 24 * 60 * 60 * 1000;
      const bucket = (c: AssignedCard): number => {
        if (!c.due_date) return 3;
        const due = new Date(c.due_date).setHours(0, 0, 0, 0);
        if (due < todayMs) return 0; // overdue
        if (due < todayMs + dayMs) return 1; // today
        return 2; // upcoming
      };
      flattened.sort((a, b) => {
        const ba = bucket(a);
        const bb = bucket(b);
        if (ba !== bb) return ba - bb;
        if (ba === 3) {
          // No date: newest first.
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        // Has date: earliest first.
        return (
          new Date(a.due_date as string).getTime() -
          new Date(b.due_date as string).getTime()
        );
      });
      return flattened.slice(0, limit);
    },
  });
}
