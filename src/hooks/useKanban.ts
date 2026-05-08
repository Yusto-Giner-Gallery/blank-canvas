import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { parseMentions } from "@/lib/mentions";
import type {
  Board,
  Card,
  CardLabel,
  List,
} from "@/integrations/supabase/domain";
import { useProfile } from "./useProfile";

export type BoardWithCount = Board & { card_count: number };

export function useBoards() {
  const { profile } = useProfile();
  return useQuery<BoardWithCount[]>({
    queryKey: ["boards", profile?.gallery_id ?? null],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("*, lists(cards(count))")
        .order("updated_at", { ascending: false })
        .returns<
          Array<
            Board & {
              lists: Array<{ cards: Array<{ count: number }> }>;
            }
          >
        >();
      if (error) throw error;
      return (data ?? []).map((b) => ({
        ...b,
        card_count: (b.lists ?? []).reduce(
          (sum, l) => sum + (l.cards?.[0]?.count ?? 0),
          0,
        ),
      }));
    },
  });
}

export type CardMemberProfile = {
  id: string;
  full_name: string;
  email: string;
};

// Card augmented with the per-card aggregates the board view needs to
// render Trello-style tiles: member avatars, checklist progress, comment
// + attachment counts, description indicator. Fetched in one go via the
// useBoard query rather than per-card to keep the board snappy.
export type CardWithMeta = Card & {
  member_profiles: CardMemberProfile[];
  checklist_done: number;
  checklist_total: number;
  comment_count: number;
  attachment_count: number;
  has_description: boolean;
};

export type BoardDetail = Board & {
  lists: Array<List & { cards: CardWithMeta[] }>;
};

type RawCardRow = Card & {
  members?: Array<{ profile: CardMemberProfile | null }> | null;
  checklist?: Array<{ done: boolean }> | null;
  comment_count?: Array<{ count: number }> | null;
  attachment_count?: Array<{ count: number }> | null;
};

type BoardRow = Board & {
  lists: Array<List & { cards: RawCardRow[] }>;
};

export function useBoard(id: string | undefined) {
  const { profile } = useProfile();
  return useQuery<BoardDetail | null>({
    queryKey: ["board", id ?? null],
    enabled: !!profile && !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("boards")
        .select(
          `
          *,
          lists (
            *,
            cards (
              *,
              members:card_members ( profile:profiles ( id, full_name, email ) ),
              checklist:card_checklist ( done ),
              comment_count:card_comments ( count ),
              attachment_count:card_attachments ( count )
            )
          )
          `,
        )
        .eq("id", id)
        .maybeSingle<BoardRow>();
      if (error) throw error;
      if (!data) return null;
      const lists = (data.lists ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((l) => ({
          ...l,
          cards: (l.cards ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((c): CardWithMeta => {
              const checklist = c.checklist ?? [];
              return {
                ...c,
                member_profiles: (c.members ?? [])
                  .map((m) => m.profile)
                  .filter((p): p is CardMemberProfile => !!p),
                checklist_total: checklist.length,
                checklist_done: checklist.filter((x) => x.done).length,
                comment_count: c.comment_count?.[0]?.count ?? 0,
                attachment_count: c.attachment_count?.[0]?.count ?? 0,
                has_description: !!c.description?.trim(),
              };
            }),
        }));
      return { ...data, lists };
    },
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<Board, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      if (!profile) throw new Error("No profile");
      const { data, error } = await supabase
        .from("boards")
        .insert({
          id: crypto.randomUUID(),
          gallery_id: profile.gallery_id,
          name,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation<List, Error, { board_id: string; name: string }>({
    mutationFn: async ({ board_id, name }) => {
      const { data: existing, error: existingErr } = await supabase
        .from("lists")
        .select("sort_order")
        .eq("board_id", board_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (existingErr) throw existingErr;
      const sort_order = (existing?.[0]?.sort_order ?? -1) + 1;
      const { data, error } = await supabase
        .from("lists")
        .insert({ id: crypto.randomUUID(), board_id, name, sort_order })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.board_id] });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation<void, Error, { board_id: string; id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("lists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.board_id] });
    },
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation<
    Card,
    Error,
    { board_id: string; list_id: string; title: string }
  >({
    mutationFn: async ({ list_id, title }) => {
      const { data: existing, error: existingErr } = await supabase
        .from("cards")
        .select("sort_order")
        .eq("list_id", list_id)
        .order("sort_order", { ascending: false })
        .limit(1);
      if (existingErr) throw existingErr;
      const sort_order = (existing?.[0]?.sort_order ?? -1) + 1;
      const { data, error } = await supabase
        .from("cards")
        .insert({
          id: crypto.randomUUID(),
          list_id,
          title,
          sort_order,
          labels: [],
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.board_id] });
    },
  });
}

// Move a card between lists and/or reorder within a list. The full ordered
// list of `card_ids` for the target list is upserted, plus the source list
// when `from_list_id` differs. Idempotent.
export function useMoveCard() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    {
      board_id: string;
      from_list_id: string;
      to_list_id: string;
      to_order: string[];
      from_order?: string[];
    }
  >({
    mutationFn: async ({ from_list_id, to_list_id, to_order, from_order }) => {
      const updates: Array<{ id: string; list_id: string; sort_order: number }> = [];
      to_order.forEach((id, i) =>
        updates.push({ id, list_id: to_list_id, sort_order: i }),
      );
      if (from_list_id !== to_list_id && from_order) {
        from_order.forEach((id, i) =>
          updates.push({ id, list_id: from_list_id, sort_order: i }),
        );
      }
      // upsert; falls back to multi-update if onConflict unsupported.
      for (const u of updates) {
        const { error } = await supabase
          .from("cards")
          .update({ list_id: u.list_id, sort_order: u.sort_order })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.board_id] });
    },
  });
}

export function useUpdateCard() {
  const qc = useQueryClient();
  const { profile } = useProfile();
  return useMutation<
    void,
    Error,
    {
      board_id: string;
      id: string;
      patch: Partial<
        Pick<Card, "title" | "description" | "due_date" | "labels">
      >;
    }
  >({
    mutationFn: async ({ id, patch }) => {
      if (!profile) throw new Error("No profile");
      const { error } = await supabase.from("cards").update(patch).eq("id", id);
      if (error) throw error;

      // Mention writeback: parse card title + description for
      // `@artwork:<internal_id>` and upsert into card_artwork_mentions.
      // Per CLAUDE.md §6 the artwork-notes append happens via a Postgres
      // trigger on Lovable; client-side just maintains the join rows so
      // the artworks_with_attention view has data to compute from.
      const blob = `${patch.title ?? ""}\n${patch.description ?? ""}`;
      const internalIds = parseMentions(blob);
      if (internalIds.length === 0) return;
      const { data: artworks, error: aErr } = await supabase
        .from("artworks")
        .select("id, internal_id")
        .in("internal_id", internalIds);
      if (aErr) throw aErr;
      const rows = (artworks ?? []).map((a) => ({
        card_id: id,
        artwork_id: a.id,
      }));
      if (rows.length === 0) return;
      const { error: mErr } = await supabase
        .from("card_artwork_mentions")
        .upsert(rows, { onConflict: "card_id,artwork_id" });
      if (mErr) throw mErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.board_id] });
      qc.invalidateQueries({ queryKey: ["card", vars.id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation<void, Error, { board_id: string; id: string }>({
    mutationFn: async ({ id }) => {
      const { error } = await supabase.from("cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.board_id] });
    },
  });
}

export function toggleLabel(labels: CardLabel[], label: CardLabel): CardLabel[] {
  return labels.includes(label)
    ? labels.filter((l) => l !== label)
    : [...labels, label];
}
