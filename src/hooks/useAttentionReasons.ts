import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// The concrete reasons behind an artwork's `needs_attention` flag, so the
// orange badge can open a "what needs doing" task list (ADDITIONS.md 1.5).
// Mirrors the three drivers of `artworks_with_attention` (CLAUDE.md §6):
// kanban card mentions (shipping label / due soon), overdue loans, and
// in-transit shipments. On the stubbed backend these tables may be empty —
// the popover then shows a graceful fallback.
export type AttentionReason = {
  id: string;
  label: string;
  detail?: string;
};

type MentionRow = {
  card: {
    id: string;
    title: string;
    due_date: string | null;
    labels: string[] | null;
  } | null;
};

export function useAttentionReasons(artworkId: string, enabled: boolean) {
  return useQuery<AttentionReason[]>({
    queryKey: ["attention-reasons", artworkId],
    enabled,
    queryFn: async () => {
      const reasons: AttentionReason[] = [];
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      const { data: mentions } = await supabase
        .from("card_artwork_mentions")
        .select("card:cards ( id, title, due_date, labels )")
        .eq("artwork_id", artworkId)
        .returns<MentionRow[]>();

      for (const m of mentions ?? []) {
        const c = m.card;
        if (!c) continue;
        const shipping = (c.labels ?? []).includes("shipping");
        const dueSoon =
          !!c.due_date && new Date(c.due_date) <= weekFromNow;
        if (!shipping && !dueSoon) continue;
        reasons.push({
          id: `card-${c.id}`,
          label: shipping ? `Shipping — ${c.title}` : `Due soon — ${c.title}`,
          detail: c.due_date
            ? `Due ${new Date(c.due_date).toLocaleDateString()}`
            : undefined,
        });
      }

      const { data: loans } = await supabase
        .from("loans")
        .select("id, end_date, status")
        .eq("artwork_id", artworkId)
        .eq("status", "overdue")
        .returns<Array<{ id: string; end_date: string }>>();
      for (const l of loans ?? []) {
        reasons.push({
          id: `loan-${l.id}`,
          label: "Loan overdue",
          detail: l.end_date
            ? `Was due ${new Date(l.end_date).toLocaleDateString()}`
            : undefined,
        });
      }

      const { data: ships } = await supabase
        .from("shipments")
        .select("id, carrier, tracking_no, status")
        .eq("artwork_id", artworkId)
        .eq("status", "in_transit")
        .returns<
          Array<{ id: string; carrier: string | null; tracking_no: string | null }>
        >();
      for (const s of ships ?? []) {
        reasons.push({
          id: `ship-${s.id}`,
          label: "In transit",
          detail:
            [s.carrier, s.tracking_no].filter(Boolean).join(" · ") || undefined,
        });
      }

      return reasons;
    },
  });
}
