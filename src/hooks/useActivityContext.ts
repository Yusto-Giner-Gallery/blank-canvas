import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ActivityLogRow } from "./useActivityLog";
import { useProfile } from "./useProfile";

// Resolves the human label and deep-link route for each row in an activity
// feed. The activity_log table only stores entity_id, so to render
// "Clio moved Shirika card 'Ship feet to kinky customer'" we have to fetch
// the card's title — and to deep-link straight into that card on the
// right board, we also need its containing list's board_id.
//
// One batched useQuery, keyed by the deduped entity_ids, runs all the
// lookups in parallel. Loans / consignments / shipments / documents have
// no detail pages of their own, so we resolve their parent artwork_id
// (and the artwork's title) and route to the artwork detail page.

export type ActivityContextEntry = {
  /** Human label (artwork title, contact name, card title, "CE8F3D28"). */
  label: string;
  /** In-app route to navigate when the row is clicked. */
  href: string;
};

export type ActivityContextMap = Map<string, ActivityContextEntry>;

export function useActivityContext(rows: ActivityLogRow[]) {
  const { profile } = useProfile();

  // Group entity_ids by entity_type, deduping. Stable JSON key for React
  // Query so identical row sets don't refetch.
  const groups: Record<string, string[]> = {};
  for (const r of rows) {
    if (!groups[r.entity_type]) groups[r.entity_type] = [];
    if (!groups[r.entity_type].includes(r.entity_id)) {
      groups[r.entity_type].push(r.entity_id);
    }
  }
  for (const k of Object.keys(groups)) groups[k].sort();
  const groupsKey = JSON.stringify(groups);

  return useQuery<ActivityContextMap>({
    queryKey: ["activity_context", profile?.id ?? null, groupsKey],
    enabled: !!profile && rows.length > 0,
    queryFn: async () => {
      const map: ActivityContextMap = new Map();

      // Per-table fetchers. Each one short-circuits on empty input and
      // unwraps Supabase errors. We lose the chunking the IIFE helper
      // used to do, but the activity feed cap is 30 rows so unique IDs
      // per type stay well below Supabase's URL-length safety margin.
      const artworkIds = groups.artwork ?? [];
      const contactIds = groups.contact ?? [];
      const invoiceIds = groups.invoice ?? [];
      const dealIds = groups.deal ?? [];
      const cardIds = groups.card ?? [];
      const loanIds = groups.loan ?? [];
      const consignmentIds = groups.consignment ?? [];
      const shipmentIds = groups.shipment ?? [];
      const documentIds = groups.document ?? [];

      const [
        artworks,
        contacts,
        invoices,
        deals,
        cards,
        loans,
        consignments,
        shipments,
        documents,
      ] = await Promise.all([
        artworkIds.length === 0
          ? Promise.resolve({ data: [] as Array<{ id: string; title: string }> })
          : supabase
              .from("artworks")
              .select("id, title")
              .in("id", artworkIds)
              .returns<Array<{ id: string; title: string }>>()
              .then((r) => ({ data: r.data ?? [] })),
        contactIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{ id: string; full_name: string }>,
            })
          : supabase
              .from("contacts")
              .select("id, full_name")
              .in("id", contactIds)
              .returns<Array<{ id: string; full_name: string }>>()
              .then((r) => ({ data: r.data ?? [] })),
        invoiceIds.length === 0
          ? Promise.resolve({ data: [] as Array<{ id: string }> })
          : supabase
              .from("invoices")
              .select("id")
              .in("id", invoiceIds)
              .returns<Array<{ id: string }>>()
              .then((r) => ({ data: r.data ?? [] })),
        dealIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{
                id: string;
                contact: { full_name: string } | null;
              }>,
            })
          : supabase
              .from("deals")
              .select("id, contact:contacts ( full_name )")
              .in("id", dealIds)
              .returns<
                Array<{
                  id: string;
                  contact: { full_name: string } | null;
                }>
              >()
              .then((r) => ({ data: r.data ?? [] })),
        cardIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{
                id: string;
                title: string;
                list: { board_id: string } | null;
              }>,
            })
          : supabase
              .from("cards")
              .select("id, title, list:lists ( board_id )")
              .in("id", cardIds)
              .returns<
                Array<{
                  id: string;
                  title: string;
                  list: { board_id: string } | null;
                }>
              >()
              .then((r) => ({ data: r.data ?? [] })),
        loanIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{
                id: string;
                artwork_id: string;
                artwork: { title: string } | null;
              }>,
            })
          : supabase
              .from("loans")
              .select("id, artwork_id, artwork:artworks ( title )")
              .in("id", loanIds)
              .returns<
                Array<{
                  id: string;
                  artwork_id: string;
                  artwork: { title: string } | null;
                }>
              >()
              .then((r) => ({ data: r.data ?? [] })),
        consignmentIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{
                id: string;
                artwork_id: string;
                artwork: { title: string } | null;
              }>,
            })
          : supabase
              .from("consignments")
              .select("id, artwork_id, artwork:artworks ( title )")
              .in("id", consignmentIds)
              .returns<
                Array<{
                  id: string;
                  artwork_id: string;
                  artwork: { title: string } | null;
                }>
              >()
              .then((r) => ({ data: r.data ?? [] })),
        shipmentIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{
                id: string;
                artwork_id: string;
                artwork: { title: string } | null;
              }>,
            })
          : supabase
              .from("shipments")
              .select("id, artwork_id, artwork:artworks ( title )")
              .in("id", shipmentIds)
              .returns<
                Array<{
                  id: string;
                  artwork_id: string;
                  artwork: { title: string } | null;
                }>
              >()
              .then((r) => ({ data: r.data ?? [] })),
        documentIds.length === 0
          ? Promise.resolve({
              data: [] as Array<{
                id: string;
                artwork_id: string;
                filename: string;
                artwork: { title: string } | null;
              }>,
            })
          : supabase
              .from("artwork_documents")
              .select("id, artwork_id, filename, artwork:artworks ( title )")
              .in("id", documentIds)
              .returns<
                Array<{
                  id: string;
                  artwork_id: string;
                  filename: string;
                  artwork: { title: string } | null;
                }>
              >()
              .then((r) => ({ data: r.data ?? [] })),
      ]);

      for (const a of artworks.data) {
        map.set(`artwork:${a.id}`, {
          label: a.title,
          href: `/inventory/${a.id}`,
        });
      }
      for (const c of contacts.data) {
        map.set(`contact:${c.id}`, {
          label: c.full_name,
          href: `/contacts/${c.id}`,
        });
      }
      for (const inv of invoices.data) {
        map.set(`invoice:${inv.id}`, {
          label: inv.id.slice(0, 8).toUpperCase(),
          href: `/invoices/${inv.id}`,
        });
      }
      for (const d of deals.data) {
        map.set(`deal:${d.id}`, {
          // Deals have no name field — use the contact name if joined,
          // else the 8-char id slice.
          label: d.contact?.full_name?.trim() || d.id.slice(0, 8).toUpperCase(),
          href: `/pipeline`,
        });
      }
      for (const c of cards.data) {
        const boardId = c.list?.board_id;
        map.set(`card:${c.id}`, {
          label: c.title,
          href: boardId ? `/kanban/${boardId}?card=${c.id}` : `/kanban`,
        });
      }
      for (const l of loans.data) {
        map.set(`loan:${l.id}`, {
          label: l.artwork?.title ?? "",
          href: `/inventory/${l.artwork_id}`,
        });
      }
      for (const cn of consignments.data) {
        map.set(`consignment:${cn.id}`, {
          label: cn.artwork?.title ?? "",
          href: `/inventory/${cn.artwork_id}`,
        });
      }
      for (const s of shipments.data) {
        map.set(`shipment:${s.id}`, {
          label: s.artwork?.title ?? "",
          href: `/inventory/${s.artwork_id}`,
        });
      }
      for (const d of documents.data) {
        map.set(`document:${d.id}`, {
          // Document filename is the most useful label; fall back to the
          // parent artwork's title.
          label: d.filename || d.artwork?.title || "",
          href: `/inventory/${d.artwork_id}`,
        });
      }
      return map;
    },
  });
}
