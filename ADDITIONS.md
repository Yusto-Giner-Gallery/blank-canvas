# YGManager — Additions & Corrections (Phase Plan)

> Single source of truth for the round of corrections, fixes, and new
> features requested by the gallery (Clio + Giulia) on 2026-06-05.
> Read this **alongside** `CLAUDE.md`. Where this file changes a locked
> decision, the matching `CLAUDE.md` section is updated in the same commit.
>
> **Discipline:** same Karpathy contract as `CLAUDE.md` §12. Frontend-first;
> backend (migrations, RLS, triggers, realtime) is deferred to the Lovable
> port per `CLAUDE.md` §13. Each phase notes the schema it will need so the
> Lovable handoff at the end of this file is complete.

---

## 0. Two rulings that change locked decisions

Confirmed by the user, 2026-06-05:

1. **"Collections" → "Sets".** The curated-groups feature (exhibition / fair /
   viewing-room) is renamed **Sets** everywhere user-facing. The old
   `CLAUDE.md` convention **"sets = locations"** is **retired**. Physical
   places keep the name **Locations**. `CLAUDE.md` §6 identity rule is updated.
2. **Status color = 5th color exception.** Artwork status is shown in color in
   addition to the word: `available` green, `on_hold` yellow, `sold` red,
   `archived` orange. Added to `CLAUDE.md` §3 as color exception **#5**. This
   is the only new chrome color permitted by this round.

> These two are recorded in `CLAUDE.md` (§3 and §6) in the same commit as
> Phase 0 so the source of truth never lies.

---

## 1. Status legend for every item below

- ✅ **DONE** — already built; no work, listed so we don't rebuild it
- 🟡 **PARTIAL** — exists but incomplete / not as requested
- ⬜ **NEW** — not built
- 🐞 **BUG** — built but wrong

---

## 2. Already built (verified by codebase audit — do NOT rebuild)

| Requested | Where it lives |
| --- | --- |
| ✅ Signup sheet (Email/Name/Interest) + post-signup notes | `PublicSignup.tsx`, `ContactDetail.tsx` |
| ✅ Shareable/printable QR + link to signup | `components/crm/SignupShare.tsx` (`qrcode.react`) |
| ✅ Newsletter toggle when adding a contact | `PublicSignup.tsx`, `Contacts.tsx`, `ContactDetail.tsx` |
| ✅ Contact tags + multi-tag AND filter (group identity) | `ContactDetail.tsx`, `Contacts.tsx`, `useContactTags.ts` |
| ✅ Email-from-dossier (filter collectors → per-contact mailto draft) | `SendToContactsModal.tsx`, `lib/email.ts` |
| ✅ Right-click / long-press quick-edit bubble (location/status/price) | `QuickEditPopover.tsx`, `useLongPress.ts` |
| ✅ Multi-select artworks across different artists | `Inventory.tsx`, `SelectionBar.tsx`, `CollectionPicker.tsx` |
| ✅ Pre-designed dossier templates (solo/group/special/fair/collector/editorial) | `DossierEditor.tsx`, `lib/pdf/*` |
| ✅ Mark-as-sold (creates invoice + sets status) — **detail page only** | `actions/MarkSoldDialog.tsx`, `ArtworkActionRail.tsx` |
| ✅ Kanban card attachments | `kanban/CardDetailModal.tsx` |

> Mark-as-sold is "done" but only reachable from the detail-page action rail.
> The user wants it as a quick action too — see **1.11** below.

---

## Phase 0 — Record the decisions

Update `CLAUDE.md` only. No app code.

- §3: add color exception **#5** (status colors) with the four hue tokens.
- §6: retire "sets = locations"; rename the curated-groups concept to **Sets**;
  keep **Locations** for physical places. Note the `collection_*` → `set_*`
  table/enum rename intent for the Lovable port.
- Add `--status-available/-hold/-sold/-archived` token names to the §3 palette
  note (defined for real in Phase 1.2).

**Success:** `CLAUDE.md` reflects both rulings; no contradiction remains.

---

## Phase 1 — Corrections & quick wins

| # | Item | Status | Work | Success criteria (in-repo) |
| --- | --- | --- | --- | --- |
| 1.1 | Pipeline → `won` doesn't mark artwork sold | 🐞 | `useDeals.ts` `useUpdateDealStage` creates the draft invoice but never patches `artworks.status`. On `won` with a linked `artwork_id`, also set `status='sold'`, reusing `MarkSoldDialog`'s patch path. | typecheck+build pass; dropping a deal with an artwork into `won` flips that artwork to `sold` in inventory in the same action. |
| 1.2 | Colored status pills | ⬜ | `StatusPill.tsx` is monochrome. Add 4 tokens (green/yellow/red/orange) in `index.css` + `tailwind.config.ts`; map status→token. Documented as exception #5. | typecheck+build pass; each status renders its color + word; tokens referenced via classes, no hardcoded hex. |
| 1.3 | Date + price on grid cards | ⬜ | `ArtworkCard.tsx` shows title/artist/size/location only. Add `year` and `price_eur`; hide price when `is_nfs`. | typecheck+build pass; grid card shows year + EUR price; NFS hides price. |
| 1.4 | Artist **search** (not dropdown) | 🟡 | Artist is a filter-bar `<select>`; free-text search covers title/notes/id. Move artist into the search match; remove the artist dropdown from `FilterBar.tsx`. | typecheck+build pass; typing an artist name narrows inventory; artist dropdown gone from filter bar. |
| 1.5 | "Needs attention" → clickable task list | ⬜ | `AttentionBadge.tsx` is a static span. Make it open a popover listing *why* the artwork is flagged (card mentions / due dates / shipping). | typecheck+build pass; clicking the orange flag opens a list of the reasons. |
| 1.6 | Dashboard alerts clickable | ⬜ | `Index.tsx` stat cards (Flagged Works, Open Invoices) are static. Wrap in links to the matching filtered view. | typecheck+build pass; clicking Flagged Works lands on inventory filtered to `needs_attention`. |
| 1.7 | Search box in Sets & Dossiers lists | ⬜ | Neither `Collections.tsx`/`Dossiers.tsx` has search. Add a title search input to each. | typecheck+build pass; typing filters each list by title. |
| 1.8 | Delete (remove) an artist | ⬜ | No delete hook/UI. Add soft-delete (`deleted_at`) with a confirm dialog, for mistaken entries. | typecheck+build pass; an artist can be removed with confirm; removed artists drop from lists/filters. |
| 1.9 | 1-click select / 2-click open | 🟡 | Today single click navigates, checkbox selects. Change to: single click toggles select, double-click opens the detail. Long-press/right-click quick-edit unchanged. | typecheck+build pass; single click selects, double-click opens; touch long-press still opens quick-edit. |
| 1.10 | Grid format + square-fitted thumbnail | 🟡 | Image already `aspect-square object-contain`. Confirm every card aligns info-at-bottom, image-original-aspect-top with white-space fill, thumbnail square-fitted. Polish only. | typecheck+build pass; all grid cards share one layout; thumbnails square, image not distorted. |
| 1.11 | Mark-as-sold as a quick action | 🟡 | Exists only on the detail action rail. Add a "Mark sold" entry to `QuickEditPopover.tsx` / right-click menu so it's reachable from list+grid. | typecheck+build pass; right-click → Mark sold works from a row/card. |
| 1.12 | Click-to-zoom on artwork images | ⬜ | A `Lightbox` exists for dossiers but artwork/artist images don't open it. Wire artwork images (detail + artist page) to the existing `Lightbox`. | typecheck+build pass; clicking an artwork image opens the zoom lightbox. |

**Backend deferred (Lovable):** 1.1 atomic deal→invoice→artwork update; 1.8
`deleted_at` already exists on `artists`.

---

## Phase 2 — The "Sets" rename

Mechanical but wide; one dedicated phase so nothing half-renames.

**Surface (from audit):**
- Routes `/collections` → `/sets`, `/collections/:id` → `/sets/:id` (`App.tsx`).
- Pages `Collections.tsx`/`CollectionDetail.tsx` (rename + titles).
- Components `CollectionPicker.tsx`, `SelectionBar.tsx` copy.
- Hook `useCollections.ts` (exported names).
- i18n keys `nav.collections` → `nav.sets` (EN + ES) in `translations.ts`.
- Types/enum `collection_kind`, table `collection_artworks` (rename documented
  for Lovable — see handoff).
- Dossier integration (`DossierEditor.tsx`, `CollectionDetail.tsx`).

**Success:** typecheck+build pass; nav, routes, modals, and dossier flow all
say "Set(s)"; no "collection" string remains in user-facing UI; physical places
still read "Location".

**Backend deferred (Lovable):** rename `collection_artworks` → `set_artworks`,
enum `collection_kind` → `set_kind`, realtime channel name.

---

## Phase 3 — Dossier polish (client-facing output)

| # | Item | Status | Work | Success criteria (in-repo) |
| --- | --- | --- | --- | --- |
| 3.1 | Image on the **left** | 🟡 | Only `image_right` exists. Add an `image_left` layout variant (mirror) in `PageLayoutSwitcher.tsx` + the PDF templates. | typecheck+build pass; a page can be set to image-left; PDF renders meta on the right. |
| 3.2 | Real zoom / choose the detail | 🟡 | `detail_zoom` variant exists but no UI sets `detail_image_path`/crop. Add an editor control to pick the crop region + zoom amount. | typecheck+build pass; user can select a detail/zoom; it persists to `body_blocks` and renders in the PDF. |
| 3.3 | Large preview + enlarge + price list | 🟡 | `PdfPanel` preview exists; no enlarge button; prices embedded only. Add a full-screen preview toggle, an enlarge button, and a dedicated price-list view. | typecheck+build pass; preview can go full-screen; price list renders/exports. |
| 3.4 | True drag-to-**swap** images | 🟡 | `ImageLayoutGrid.tsx` reorders via `arrayMove`. Confirm/adjust to swap-on-drop (image A ↔ image B) without remove+re-upload. | typecheck+build pass; dropping image A on B exchanges their slots. |

**Backend deferred (Lovable):** none new — all stored in `dossiers.body_blocks`/
`image_layout` jsonb.

---

## Phase 4 — CRM depth

Ruling: **extend the existing scanner + add an explicit owner link.**

| # | Item | Status | Work | Success criteria (in-repo) |
| --- | --- | --- | --- | --- |
| 4.1 | Generalize the image importer | 🟡 | `ScanContactModal.tsx` handles business cards only. Broaden to any contact screenshot, reusing the AI vision path (`lib/ai/client.ts`). | typecheck+build pass; a pasted/uploaded screenshot extracts name/email/etc into the contact form. |
| 4.2 | Works owned by a contact | ⬜ | No ownership link in schema. Add an explicit owner link; show "works this contact has" on `ContactDetail.tsx`. Optional address↔location match as a convenience. | typecheck+build pass; a contact page lists linked works; linking a work to a contact persists. |
| 4.3 | Filter contacts by artist | ⬜ | `Contacts.tsx` has text + tag filters only. Add artist as a filter dimension. | typecheck+build pass; selecting an artist narrows the contact list. |
| 4.4 | "Collector might be interested" alert | ⬜ | No artist↔contact-tag cross-link. When adding an artwork by artist X, surface contacts tagged with X's name. | typecheck+build pass; saving an artwork by a tagged artist shows a non-blocking "N collectors tagged for this artist" hint with a link. |

**Backend deferred (Lovable):** 4.2 needs an ownership link —
`contact_artworks (contact_id, artwork_id)` **or** `artworks.owner_contact_id`,
plus optional address-on-file columns on `contacts`. RLS by `gallery_id`.

---

## Phase 5 — Big new features

| # | Item | Status | Work | Success criteria (in-repo) |
| --- | --- | --- | --- | --- |
| 5.1 | Artist homepages `/artists/:id` | ⬜ | No artist detail route. Build a page: bio, available works (filter on artist), CV, upcoming events (shipping/residency/sold/shows) read from existing tables. Includes click-to-zoom (1.12). | typecheck+build pass; `/artists/:id` renders bio + works grid + events; empty states graceful. |
| 5.2 | Dashboard notifications (@person) | ⬜ | Dashboard shows a read-only activity stream + assignments. Add: @-mention a teammate ("@giulia send this invoice"), it lands on their dashboard, with a checkbox to mark done (which notifies back). | typecheck+build pass; a note tagging a profile appears in that profile's dashboard list; checking it marks done. |
| 5.3 | Rich Kanban cards + doc-link titles | ⬜ | Card description is a plain textarea; titles are plain. Add rich text (bullets/images/links) and a card-title hyperlink to an external doc (the "Visitas" Excel example). | typecheck+build pass; description supports bullets/links/images; a card can carry an external doc link opened from the card. |
| 5.4 | Programming calendar | ⬜ | None exists. Calendar by space/location + year; tags shared across sections so updates propagate. | typecheck+build pass; a calendar renders events by location and year; creating an event persists. |
| 5.5 | WhatsApp / email invitations | ⬜ | Only internal staff invite exists. Auto-generate invitation drafts: a WhatsApp share link + a `mailto:` draft, prefilled from event/contact data. | typecheck+build pass; "Generate invitation" opens a prefilled WhatsApp link and/or mailto draft. |

**Backend deferred (Lovable):**
- 5.1: `artists.bio` (text), `artists.cv` (text or `artwork_documents`-style
  attachment); events sourced from existing `loans`/`shipments`/`collections`.
- 5.2: `notifications (id, gallery_id, recipient_profile_id, sender_profile_id,
  body, entity_type, entity_id, done bool default false, created_at)`; RLS:
  recipient (or sender) reads; realtime channel added.
- 5.3: store card description as markdown/jsonb; add `cards.link_url` for the
  title hyperlink. Attachments bucket already exists.
- 5.4: `programming_events (id, gallery_id, title, location_id, start_date,
  end_date, kind, tags text[])`; RLS by `gallery_id`; realtime channel.
- 5.5: none (client-only mailto/WhatsApp); optionally log to `contact_activity`.

---

## 6. Lovable deployment handoff (what to tell Lovable at the end)

Once the frontend phases land, paste the following into Lovable Cloud to make
the backend match. This **extends** `CLAUDE.md` §13 — it does not replace it.

> **Prompt for Lovable Cloud:**
>
> Apply these schema + policy changes to the YGManager Supabase project
> (region eu-central-1), keeping every RLS policy joined through
> `profiles.gallery_id = row.gallery_id`, and the generic `log_change()`
> audit trigger attached to every new auditable table:
>
> 1. **Sets rename (Phase 2).** Rename table `collection_artworks` →
>    `set_artworks`, enum `collection_kind` → `set_kind`, and the `collections`
>    table → `sets`. Update foreign keys, RLS policies, and the realtime
>    publication to the new names. (No data semantics change — only names.)
>
> 2. **Status colors (Phase 1.2).** No schema change — UI only.
>
> 3. **Pipeline → sold (Phase 1.1).** Ensure moving a deal to `won` updates the
>    linked `artworks.status` to `'sold'` atomically with the draft invoice
>    insert (do it in the same transaction / RPC the frontend calls).
>
> 4. **Contact ⇄ artwork ownership (Phase 4.2).** Add
>    `contact_artworks (contact_id uuid, artwork_id uuid, gallery_id uuid,
>    created_at)` with a unique `(contact_id, artwork_id)` and RLS by
>    `gallery_id`. Optionally add address-on-file columns to `contacts`
>    (`address jsonb`) to support address↔location matching.
>
> 5. **Artist-tag interest alert (Phase 4.4).** No new table required — the
>    alert is computed client-side from `artwork.artist` name vs `contact_tags`.
>    If you want it server-side, expose a view
>    `contacts_interested_by_artist (artist_id, contact_id)`.
>
> 6. **Artist profile fields (Phase 5.1).** Add `artists.bio text` and
>    `artists.cv text` (or reuse an `artwork_documents`-style bucket for CV
>    PDFs). No new events table — artist "upcoming events" read from existing
>    `loans`, `shipments`, and `sets`/exhibitions.
>
> 7. **Notifications (Phase 5.2).** Create
>    `notifications (id uuid pk, gallery_id uuid, recipient_profile_id uuid,
>    sender_profile_id uuid, body text, entity_type text, entity_id uuid,
>    done boolean default false, created_at timestamptz default now())`.
>    RLS: a profile reads rows where it is recipient or sender; insert allowed
>    for any authenticated profile in the gallery. Add `notifications` to the
>    realtime publication.
>
> 8. **Rich Kanban cards (Phase 5.3).** Add `cards.link_url text` (nullable)
>    for the title hyperlink. Card description stays text/markdown — no schema
>    change. `card-attachments` bucket already exists.
>
> 9. **Programming calendar (Phase 5.4).** Create
>    `programming_events (id uuid pk, gallery_id uuid, title text,
>    location_id uuid, start_date date, end_date date, kind text,
>    tags text[], created_at timestamptz default now(), updated_at)`.
>    RLS by `gallery_id`; add to the realtime publication; attach `log_change()`.
>
> 10. **Realtime scope.** Extend the publication to include: `set_artworks`,
>     `contact_artworks`, `notifications`, `programming_events` (in addition to
>     the §13 list).
>
> After applying, regenerate types:
> `supabase gen types typescript --project-id <ref> >
> src/integrations/supabase/types.ts`.

---

## 7. Build order summary

```
Phase 0  Record rulings in CLAUDE.md (§3 color #5, §6 sets≠locations)
Phase 1  Corrections & quick wins (1.1–1.12)  ← start here
Phase 2  Sets rename
Phase 3  Dossier polish (3.1–3.4)
Phase 4  CRM depth (4.1–4.4)
Phase 5  Big features (5.1–5.5)
→ Lovable handoff (§6 above)
```

One commit per item (or per logical step), referencing the phase number, e.g.
`feat(1.1): pipeline won marks artwork sold`. Verify each item's success
criteria (`npm run typecheck` + `npm run build`) before the next.
