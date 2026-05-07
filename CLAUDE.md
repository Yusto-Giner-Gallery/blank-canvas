# YGManager — Build Plan & AI Guide

> Single source of truth for any AI/engineer continuing this project.
> Read this first. Do not deviate without updating this file.
>
> **Status:** All 15 features in §7 are complete (frontend; backend
> deferred to Lovable per §13). For the port handoff, see `PORTING.md`.

---

## 1. Mission

YGManager (Your Gallery Manager) replaces Artlogic / Gallery Manager for one
art gallery. **Internal management only** in v1 — no public-facing website.

### North stars (in priority order)

1. **Minimal manual upkeep** — every workflow that can be derived, derived. One change, not two. Sets follow locations. Card mentions update artwork. Filenames parse. Filters persist. Status reflects reality without anyone "syncing".
2. **Intuitive** — a gallery owner with no training should find the obvious thing on the first try. Multi-filter combine + persist. Right-click for quick edit. Long-press on mobile for the same action. Drag and drop where humans expect to drag.
3. **Seamless** — one tool, end to end. Inventory → dossier → email → invoice → payment → activity log → archive. No copy-paste between systems.
4. **Mobile + desktop equal-class citizens** — every page works on a phone in the gallery and on a laptop at the desk.

### Lovable-native rule

This codebase **will be ported into Lovable / Lovable Cloud / Lovable AI**.
Build Lovable-native from day one. No exotic frameworks. No custom backends.
No anything that wouldn't survive a Lovable import. See §8 for the port checklist.

## 2. Locked-in decisions (already answered by the user — do not re-ask)

| Topic | Decision |
| --- | --- |
| Frontend | React + Vite + TypeScript + Tailwind + shadcn-ui |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions + RLS + Realtime) |
| Hosting region | Supabase **eu-central-1 (Frankfurt)** |
| Auth | Supabase Auth, **email + password** only |
| Tenancy | **Single gallery, RLS-ready** (every table has `gallery_id`, policies written as if multi-tenant) |
| Roles | `admin`, `staff`. Schema must allow a future `client_portal` role with no schema change — only new RLS policies |
| Payments | Stripe, **EUR only, test mode** in v1 |
| AI client | **Stub the single AI client module** in v1. All AI calls route through `src/lib/ai/client.ts`. Repointable to Lovable AI by env var only |
| Gmail | **`mailto:` with prefilled draft** (no OAuth in v1) |
| Dropbox | **Shared-link paste** (user pastes Dropbox folder URL, we list & import). No OAuth in v1 |
| PDF | **Client-side `@react-pdf/renderer`**. Live preview before export |
| Realtime | **Everywhere** — Kanban, inventory edits, sales pipeline, dossiers. Supabase Realtime channels |
| Activity log | **Full audit trail** — every field change logged with before/after, user, timestamp |
| Filename parsing | Accept **both** `Title_SizeXSizecm_Artist` (e.g. `Culito Matón_40x40cm_PanTierni`) **and** `Artist_Title_Size`. Detect order by matching artist segment against existing artists. Always show extracted fields for confirmation before save |
| Soft deletes | All artworks, contacts, invoices use `deleted_at` (nullable timestamptz). Never hard-delete |
| Secrets | **Never in code.** `.env.local` for dev, Supabase secrets / Vercel env for prod |

## 3. Visual aesthetic — PRO style (modelled on `ControlCLSFYD/blindspot-dispatch` `viz-pro` mode)

> **Aesthetic only.** File structure follows gallery/stock-mgmt best practice (§5).
>
> Reference: the `viz-pro` visualization in `ControlCLSFYD/blindspot-dispatch`.
> White surface, charcoal type, hairline 1px borders, square corners,
> zero shadows. **No CRT effects. No scanlines. No glow. No VT323. No
> cursor-blink. No dark theme.** Editorial, gallery, curated.

- Background: white `hsl(0 0% 100%)` (`--background`)
- Foreground: charcoal `hsl(0 0% 10%)` (`--foreground`) ≈ `#1a1a1a`
- Muted/secondary/borders: grayscale only — `hsl(0 0% 40%)` (muted-foreground), `hsl(0 0% 88%)` (border/input — hairline on white), `hsl(0 0% 96%)` (card/popover/secondary/accent panel — off-white)
- Primary = foreground (charcoal on white buttons). The chrome is monochrome.
- Font: **Inter** (system-fallback `ui-sans-serif, system-ui, sans-serif`), loaded from Google Fonts. Apply globally
- **Border radius: `0` — sharp corners everywhere.** Token: `--radius: 0`. Tailwind's `rounded-sm/md/lg` are overridden to `0` in `tailwind.config.ts`, so any pre-existing `rounded-*` class resolves to a square corner
- **No shadows.** `boxShadow.sm/md/lg/xl/2xl/inner` overridden to `none` in `tailwind.config.ts`. Elevation = hairline borders, not soft drop-shadows
- **Light mode is the only mode.** No dark theme. The `<html>` element has no `class="dark"`. Tailwind's `darkMode: ["class"]` stays for shadcn compat but is never activated
- Tailwind config: shadcn semantic tokens (`background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `card`, `popover`, `border`, `input`, `ring`, `destructive`) all mapped in `src/index.css`. Plus `attention` (orange) and `accent-red` (Yusto Giner brand red) — see Color exceptions below
- Components are plain shadcn-ui primitives. No custom decorative classes
- Spacing is generous: large negative space, table rows breathe, dossier previews feel like a catalogue page

### Color exceptions (the only three)

The UI chrome is monochrome. Only **three** non-grayscale tokens are allowed,
each with a fixed and narrow purpose:

1. `--attention` orange (`hsl(25 100% 50%)`) — the inventory "needs attention this week" flag (per spec). User-data flag, not decoration.
2. **Kanban card color labels** — user-defined per-card tags. Rendered as small filled chips in the user's chosen palette (red, orange, yellow, green, blue, purple). Allowed because the user is choosing them as data; they do not theme the chrome.
3. `--accent-red` (`hsl(4 85% 55%)`, ≈ `#ee4533`) — Yusto Giner Gallery brand accent, sampled from the gallery's wordmark slash. Used at three identity moments: (a) the slash in the `YUSTO / GINER` wordmark in the sidebar, (b) the active-item left rail in the sidebar, (c) the small `┐` corner bracket in the top-right of every page. `--destructive` shares the same hue (one red, two semantic uses — destructive actions are also branded red). Never as a fill for content surfaces. If a fourth use is needed, list it here in the same commit.

### Brand mark — corner bracket

Every authenticated page renders a small red `┐` bracket in the top-right of
the main content area, drawn with `border-t-2 border-r-2 border-accent-red`
on a 12px square. Implemented once in `AppShell.tsx`, automatically applies
everywhere. Aesthetic: editorial corner mark, signs the work as YUSTO/GINER
space without competing with content. **Do not** add the same bracket to
sub-headers or cards — once per page only.

Anything else in color is a bug.

`tailwind.config.ts` and `src/index.css` are the only places these tokens live.
Components must reference tokens (`bg-background`, `text-foreground`),
**never hardcoded colors.**

## 4. Karpathy discipline (strict)

The four canonical principles (from Karpathy's January 2026 observations on
agentic coding pitfalls — `forrestchang/andrej-karpathy-skills`). Apply them
to every change.

1. **Think before coding — surface assumptions.** State them explicitly. If uncertain, ask. If multiple interpretations exist, present them — do not pick silently. If a simpler approach exists, say so. Push back when warranted.
2. **Simplicity first — minimum code.** Write the minimum code that solves the problem. Nothing speculative. No features beyond what was asked. No abstractions for single-use code. No "flexibility" or "configurability" that wasn't requested.
3. **Surgical changes — targeted modifications.** Every changed line should trace directly to a requirement in this file. If you notice unrelated dead code, mention it — do not delete it. Remove imports/variables/functions that *your* changes made unused. Do not remove pre-existing dead code unless asked.
4. **Goal-driven execution — verifiable success.** Every feature in §7 has explicit success criteria against `supabase/seed.sql`. Strong criteria let the agent loop independently. Weak criteria ("make it work") require constant clarification — refuse them.

### Operational rules that follow from the four

- **Feature by feature in the order in §7.** Each verified against its success criteria before the next begins. Do not scaffold the whole app upfront.
- **Match Lovable conventions** so the eventual port is copy-paste, not rewrite (§8).
- **No silent decisions on visual design, hosting, branding, or auth** — those are user-only calls (§9).
- **Update this file when scope changes.** Future agents read this first; if it lies, the project drifts.

## 4b. Approved libraries (use these, not alternatives)

Pinning a small library list keeps the Lovable port clean and prevents
speculative dependency choices.

- **Routing:** `react-router-dom`
- **Server state / fetching:** `@tanstack/react-query`
- **Forms:** `react-hook-form` + `zod` (shadcn's pairing)
- **Drag-and-drop (everywhere — Kanban, dossier image swap, collections, sortable cards):** `@dnd-kit/core` + `@dnd-kit/sortable`. One library, every drag interaction.
- **PDF:** `@react-pdf/renderer` (client-side, see §2)
- **CSV import/export:** `papaparse`
- **QR codes:** `qrcode.react`
- **Dates:** `date-fns`
- **Icons:** `lucide-react` (shadcn default)
- **Toasts:** `sonner` (shadcn variant)
- **Class merge:** `clsx` + `tailwind-merge` via `cn()` helper
- **Supabase:** `@supabase/supabase-js` + `@supabase/ssr` if SSR is ever needed (not in v1)

If a feature needs something not on this list, add it to this section in the
same commit, with one sentence justifying why.

## 4c. Mobile gesture parity

The spec calls for "right-click" quick edits. On touch devices the equivalent
is **long-press (≥ 500ms)** on the artwork row/card. Both gestures open the
same `QuickEditPopover`. Implement once, trigger from both.

Other touch parity rules:
- All drag-and-drop must work with `@dnd-kit`'s touch sensor enabled.
- Tables collapse to stacked cards under `md:` breakpoint; never horizontal-scroll on phones.
- Modals/popovers use shadcn `Sheet` from the bottom on `< md`, `Dialog`/`Popover` on `≥ md`.

## 5. Project structure (gallery/stock-mgmt best practice)

```
ygmanager/
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                  # CSS variables: colors, radius, fonts
│   ├── components/
│   │   ├── ui/                    # shadcn primitives (button, input, dialog, table, ...)
│   │   ├── layout/                # AppShell, Sidebar, TopBar, ScanlineOverlay
│   │   ├── inventory/             # ArtworkCard, ArtworkRow, ArtworkGrid, ArtworkList, QuickEditPopover, BulkUploader, FilenameParser
│   │   ├── dossiers/              # DossierTemplate, DossierEditor, DragDropImageGrid, PreviewPane
│   │   ├── crm/                   # ContactForm, ContactTable, TagFilter, SignupQR
│   │   ├── invoicing/             # InvoiceForm, InvoicePDF, PaymentLinkButton, PipelineBoard
│   │   ├── kanban/                # Board, List, Card, MentionedArtwork
│   │   └── shared/                # MultiSelectBar, FilterBar, ActivityLog, SearchInput
│   ├── pages/
│   │   ├── Index.tsx              # dashboard
│   │   ├── Inventory.tsx
│   │   ├── ArtworkDetail.tsx
│   │   ├── Dossiers.tsx
│   │   ├── DossierEditor.tsx
│   │   ├── Contacts.tsx
│   │   ├── ContactDetail.tsx
│   │   ├── Invoices.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── Pipeline.tsx
│   │   ├── Kanban.tsx
│   │   ├── BoardDetail.tsx
│   │   ├── Login.tsx
│   │   ├── Signup.tsx             # shareable contact-signup form (public route)
│   │   └── NotFound.tsx
│   ├── hooks/                     # useArtworks, useFilters, useRealtime, useAuth, useActivityLog
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client singleton
│   │   ├── ai/
│   │   │   └── client.ts          # SINGLE AI module — stubbed in v1, repointed to Lovable AI later
│   │   ├── pdf/                   # @react-pdf/renderer templates per dossier/invoice type
│   │   ├── filename-parser.ts     # both filename formats
│   │   ├── filters.ts             # combinable+persistable filter state
│   │   ├── stripe.ts              # payment-link generator
│   │   ├── dropbox.ts             # shared-link folder lister
│   │   └── utils.ts               # cn(), date, currency
│   ├── integrations/
│   │   └── supabase/
│   │       ├── types.ts           # generated DB types (supabase gen types)
│   │       └── policies.sql       # canonical RLS policies (mirror of migrations)
│   └── test/
├── supabase/
│   ├── migrations/                # numbered SQL migrations, one per feature
│   ├── seed.sql                   # deterministic seed for verifiable success criteria
│   └── functions/                 # Edge Functions (only if unavoidable)
├── components.json                # shadcn config
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example                   # documents required env vars, no secrets
└── CLAUDE.md                      # this file
```

## 6. Data model (initial sketch — every table carries `gallery_id`, `created_at`, `updated_at`, soft-delete where noted)

- `galleries (id, name, ...)` — exactly one row in v1
- `profiles (id=auth.users.id, gallery_id, role: 'admin'|'staff', full_name)`
- `artists (id, gallery_id, name, nationality, bio, deleted_at)`
- `locations (id, gallery_id, name)` — physical places. A "set" *is* a location
- `artworks (id, gallery_id, internal_id, title, artist_id, year, medium, width_cm, height_cm, depth_cm, price_eur, location_id, status, notes, deleted_at)` — `status` enum: `'available' | 'on_hold' | 'sold' | 'archived'` (locked feature 3; widen here if more states are needed)
- `artwork_images (id, artwork_id, storage_path, sort_order, is_primary)`
- `collections (id, gallery_id, name, kind: 'exhibition'|'fair'|'viewing_room')` — curated, not physical
- `collection_artworks (collection_id, artwork_id, sort_order)`
- `contacts (id, gallery_id, email, full_name, interest, notes, newsletter_opt_in, deleted_at)`
- `tags (id, gallery_id, name)` — generic tag table, joined to either contacts or artworks
- `contact_tags (contact_id, tag_id)`
- `artwork_tags (artwork_id, tag_id)` — added in feature 5 to support the spec's "colourful + Spanish artist" filter example. The same `tags` table powers both contact and artwork tagging
- `dossiers (id, gallery_id, kind, title, contact_id?, body_blocks jsonb, image_layout jsonb)`
- `invoices (id, gallery_id, contact_id, status, currency='EUR', stripe_payment_link, deleted_at)`
- `invoice_lines (id, invoice_id, artwork_id, description, amount_eur, discount_eur)`
- `deals (id, gallery_id, contact_id, artwork_id?, stage, value_eur)`
- `boards (id, gallery_id, name)`, `lists (id, board_id, name, sort_order)`, `cards (id, list_id, title, description, due_date, labels text[], sort_order)`
- `card_members (card_id, profile_id)`, `card_checklist (id, card_id, text, done)`, `card_comments (id, card_id, profile_id, body)`, `card_attachments (id, card_id, storage_path)`
- `card_artwork_mentions (card_id, artwork_id)` — drives the "orange in inventory" rule
- `activity_log (id, gallery_id, entity_type, entity_id, profile_id, field, before, after, event_type, created_at)`
- `contact_activity (id, contact_id, kind, ref_id)` — artworks shown, dossiers sent, replies, purchases

**RLS:** every policy joins through `profiles.gallery_id = row.gallery_id`. `client_portal` role added later via new policies, no schema change.

**Identity rule (sets = locations):** updating `artworks.location_id` is the
*only* operation needed to change a set membership. Any view labelled "Set:
Madrid Almacén" is just a filter on `location_id`. There is **no separate
`sets` table** and no manual sync step. (Per spec: "One change, not two.")

**Mention rule (`@artwork:YG-0042` writes back to artwork):** when a card body
or comment contains `@artwork:<internal_id>`:
1. Insert/update a row in `card_artwork_mentions`.
2. Append a structured note to `artworks.notes` of the form `[card:<board>/<list>] <card title> — <due_date>`. (Append, never overwrite — full audit lives in `activity_log`.)
3. If the card has `labels @> ARRAY['shipping']` or `due_date <= now() + interval '7 days'`, the artwork shows in orange in inventory until the card is closed or the label/due-date changes. Implemented as a database **view** `artworks_with_attention`, not a stored column — recomputes for free.

**Activity log scope:** every UPDATE on `artworks`, `contacts`, `invoices`,
`deals`, `cards` writes a row to `activity_log` with `field`, `before`,
`after`, `event_type`, `profile_id`. Implement via one Postgres trigger
function reused across tables.

**Public access:** the contact signup page (`/signup-contact?gallery=<slug>`)
is the **only** unauthenticated route that writes to the database. RLS allows
anonymous INSERT into `contacts` for that gallery only, with rate-limit
protection. Everything else requires `auth.uid()`.

## 7. Build order (feature by feature — verify each before next)

Each feature has **success criteria**. Do not mark a feature done until all
criteria pass against `supabase/seed.sql`.

1. **Project bootstrap** — Vite + TS + Tailwind + shadcn-ui + Supabase client + `index.css` tokens (black/white grayscale + `--attention` orange) + Inter font + AppShell (Sidebar + TopBar) + Login + protected dashboard route.
   *Success:* dev server runs; login → dashboard works against Supabase; clean monochrome theme renders identically on desktop and a phone-width viewport; lighthouse mobile-friendly ≥ 90.
2. **Auth foundation (frontend-only — backend deferred to Lovable port)** — `useProfile` hook, role-aware `RequireAuth` (waits for both session and profile), admin-only `/team` page that lists gallery members, Sidebar role-gating. Hand-written Supabase types in `src/integrations/supabase/types.ts` for `galleries`, `profiles`, role enum so the frontend compiles against the documented schema (§6) before the schema exists.
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `RequireAuth` loads, blocks unauthenticated users, and waits for profile; Sidebar shows "Team" only when `profile.role === 'admin'`; `/team` renders a list when `profiles` rows exist and a clear empty state otherwise.
   *Deferred to Lovable port:* writing SQL migrations for `galleries`/`profiles`/`activity_log`, RLS policies, the `log_change()` trigger, the `invite-staff` edge function, and end-to-end verification that unauthenticated requests are denied. These belong in the Lovable Cloud setup pass (see §13 Porting handoff).
3. **Inventory list + grid** — artworks table, two views (list with image+title+size+location+status; grid with larger image, same info), status/location/needs-attention badges (orange).
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `/inventory` route renders, view toggle works, empty state shows when no data, list and grid both render `ArtworkListItem[]` shape.
   *Success (post-Lovable):* seed of 20 artworks renders in both views; orange flag visible for ≥1 seeded artwork with mock kanban mention via `artworks_with_attention` view.
4. **Bulk upload + filename parser** — drag-drop multi-file, parse both formats, artist auto-match, confirmation step.
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `parseFilename()` correctly classifies `Title_40x40cm_Artist` as format A and `Artist_Title_40x40cm` as format B; the BulkUpload page renders the drag-drop zone, shows parsed fields per file, lets the user pick/create artist and edit any field, and disables submit until every row has title + internal_id + (artist_id or new artist name).
   *Success (post-Lovable):* upload of 5 mixed-format files writes 5 artwork rows + 5 image rows, primary image visible in inventory list/grid, ambiguous artist surfaced with the orange "did not parse cleanly" hint.
5. **Multi-filter search + persistence** — combinable filters in URL params (named saved-filter chips deferred — not in success criteria).
   *Filter dimensions:* free-text (title/notes/internal_id), status, location, artist, tag, price min/max (EUR), year min/max, artist nationality (substring).
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `useFilters` round-trips state through `URLSearchParams`; refresh preserves filters; `applyFilters()` is a pure function over `ArtworkWithFilters[]`; clear button restores defaults; active-count chip is correct.
   *Success (post-Lovable):* "under €2000 + tag:colourful + nationality:Spanish" returns the expected subset from seed data.
   *Implementation note:* filtering is client-side over the full `useArtworks()` set, which RLS already scopes by `gallery_id`. Move to server-side query construction only if a single gallery exceeds ~500 artworks (premature otherwise).
6. **Right-click / long-press quick edit popover** — location/status/price.
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; right-click on a list row or grid card opens the popover anchored at the cursor; long-press (≥500ms) on touch opens the same popover and suppresses the underlying link click; `useUpdateArtwork` posts a typed PATCH and invalidates the artworks query; click-outside and Escape both close.
   *Success (post-Lovable):* edit propagates via Realtime (`useRealtimeArtworks` channel) to a second open tab within ~1s; `activity_log` trigger writes a row per field changed.
7. **Multi-select + collections (drag-drop)** — multi-select across artists; named collections; reorder.
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; checkbox per row/card toggles a `Set<string>` selection that survives across artists; sticky `SelectionBar` shows count and "Add to collection"; `CollectionPicker` modal lists existing and creates new (with kind: exhibition/fair/viewing_room/other) and binds the selection in one transaction; `/collections` lists collections with artwork counts; `/collections/:id` renders artworks via `@dnd-kit` `SortableContext` (rect strategy, pointer + touch sensors with delay/tolerance); drag end calls `useReorderCollection` which upserts the full ordered list.
   *Success (post-Lovable):* select 3 across 2 artists → "New collection: Madrid Show" creates it; drag reorders persist; on a second tab, the new order shows up via the realtime channel (extension of `useRealtimeArtworks` → add `collection_artworks` table).
8. **Dossiers** — templates (solo/group/special/fair/collector), drag-drop image swap, AI text via stubbed `lib/ai/client.ts`, react-pdf preview & export.
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `/dossiers` lists; `/collections/:id` "Generate dossier" creates a dossier with the collection's ordered artworks and navigates to the editor; the editor has title + kind + intro + (extra when kind=`special`) + drag-swap image grid; "Generate with AI" calls `generateText` from `src/lib/ai/client.ts` (stub returns deterministic placeholder); live PDF preview and download both lazy-load `@react-pdf/renderer` so it stays out of the main bundle; `DossierPDF` adapts visible sections by `kind` (extra for special, prices for fair + collector_offer).
   *Success (post-Lovable):* save persists to `dossiers`; download produces a PDF whose layout matches the fixture for each of the five kinds; switching the AI provider to `lovable` is a one-file change in `src/lib/ai/client.ts`.
9. **CRM** — contact CRUD, public signup page + QR, newsletter toggle, tags + multi-tag filter, per-contact activity feed.
   *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `/contacts` lists contacts with search + multi-tag AND-filter; "Add contact" inline form creates one; row-level newsletter checkbox writes a `newsletter_opt_in` patch immediately; `/contacts/:id` exposes editable fields, tag chips with attach/detach/create-and-attach, an activity feed reading from `contact_activity` (empty state when none); `/signup-contact?gallery=<id>` is public (outside `RequireAuth`) and inserts directly into `contacts`; "Share signup" opens a modal with a QR code (qrcode.react) of the absolute URL plus a copy-link button.
   *Success (post-Lovable):* phone scan of the QR opens the form, submission lands in `contacts` (anonymous-INSERT RLS policy required); tag filter narrows correctly; activity feed shows items written by other features (dossiers sent, artworks shown, replies, purchases).
10. **Email-from-dossier** — filter contacts → personalised draft per contact → `mailto:` opens Gmail compose.
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; "Send to contacts" button on `/dossiers/:id` opens `SendToContactsModal`; modal exposes search + multi-tag AND filter + newsletter-opt-in toggle over the same contacts list; per-row "Open draft" calls `generateText({ kind: 'collector_pitch', artwork: lead, contact_name })` and opens `mailto:` via `buildMailto()`; on click, `useLogContactActivity` writes a `contact_activity` row of kind `dossier_sent` with `ref_id = dossier.id`.
    *Success (post-Lovable):* clicking "Open draft" on 3 contacts opens 3 mailto windows with personalised bodies; the contact's `/contacts/:id` activity feed now lists the dossier-sent rows, including for replies/purchases/artworks-shown when those features wire writes.
    *Implementation note:* `mailto:` length limits (~2 KB practical) may truncate very long bodies; documented trade-off, not optimised.
11. **Invoicing + Stripe** — invoice form (multi-line, discount), branded react-pdf, Stripe test payment link, status tracked back via webhook to `invoices.status`.
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `/invoices` lists invoices with totals + status pill; `NewInvoiceModal` creates a draft after picking a contact and navigates to the editor; `/invoices/:id` shows the contact, status select, issued date, line editor (`InvoiceLinesEditor` — picking an artwork prefills description and amount, free-text lines also supported, per-line discount), live totals (subtotal / discount / total EUR), notes textarea; "Generate Stripe link" calls the `create-payment-link` edge function and copies the returned URL; `replaceInvoiceLines` replaces all lines on save; PDF download is lazy via `InvoicePDF` template (gallery name in header + footer, EUR-only, status, line table with discount column, totals block, payment link CTA when present).
    *Success (post-Lovable):* generate invoice for 2 works; payment-link redirect to Stripe test → simulated success → webhook flips `invoices.status` to `paid`; PDF downloads with the gallery's real name; `Send to contacts` flow can attach the PDF/link.
    *Implementation note:* multi-currency deferred (user picked EUR-only test mode in §2). Invoice number shown is the first 8 chars of the UUID; switch to a sequence on Lovable if a human-friendly format is required.
12. **Sales pipeline** — Kanban-like deal stages (initial → negotiation → closed-won/lost).
    *Stage enum:* `lead | interested | offer_sent | negotiating | won | lost` (locked feature 12).
    *Auto-invoice on won:* moving a deal into `won` creates a draft invoice for the contact; if the deal has an `artwork_id`, one line is prefilled with `value_eur ?? artwork.price_eur`. Toast offers a "View invoice" action; no forced navigation.
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `/pipeline` renders 6 columns; deals fetched with embedded contact + artwork; drag uses `@dnd-kit/core` (Pointer + Touch sensors); drop on a column calls `useUpdateDealStage` which patches `deals.stage` and inserts the draft invoice + line atomically when the destination is `won`.
    *Success (post-Lovable):* drag persists; the team's other open tabs see it within ~1s once `deals` is added to the realtime channel scope (§13).
    *Implementation note:* one deal = one optional artwork (per §6 schema). Multi-artwork deals are out of scope; collectors with multiple holds get multiple deals.
13. **Internal Kanban board (Trello replacement)** — boards/lists/cards with all card fields, drag-drop, realtime, `@artwork:INTERNAL_ID` mentions. Split into 13a (Trello bones) and 13b (rich card detail).

  **13a (Trello bones):** boards CRUD, lists per board (create/delete; ordered by `sort_order`), cards per list (create/delete/reorder/move-between-lists via `@dnd-kit`), card title + description + due_date + 7 labels (red/orange/yellow/green/blue/purple/shipping per CLAUDE.md §3 exception #2), `@artwork:<INTERNAL_ID>` mention parser writes to `card_artwork_mentions`, the inventory orange flag is computed in `useArtworks` from those mentions joined to card labels + due-dates (replacing the `artworks_with_attention` view stub until Lovable ships it). Realtime extended in `useRealtimeKanban`.
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `/kanban` lists boards; `/kanban/:id` renders columns; cards drag between/within columns with optimistic state; `CardDetailModal` opens on click and edits title/description/due/labels; mentions in description show as a chip list linking to `/inventory/:id`; `useArtworks` returns `needs_attention=true` for any artwork mentioned by a card with `shipping` label or due-date within 7 days.
    *Success (post-Lovable):* drag persists; cross-tab updates within ~1s via Realtime; `artworks_with_attention` view replaces the client computation seamlessly (same field name).

  **13b (rich card detail):** members assigned (from `profiles`), checklist items, comments thread, attachments via `card-attachments` storage bucket. `CardDetailModal` grows four sections: Members (chips with attach/remove), Checklist (items with checkbox + delete + inline add), Attachments (list with upload + delete; `getPublicUrl` for now, swap to signed URL on Lovable if the bucket is private), Comments (thread with author + timestamp + post form). All four tables added to `useRealtimeKanban` so cross-tab updates work.
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; modal sections all render and accept input; member picker lists only profiles not yet attached; checklist toggles update one item at a time; attachments upload to `card-attachments` storage with sanitised filenames; comments fetch with the author profile join.
    *Success (post-Lovable):* every sub-feature round-trips; `card-attachments` bucket exists with RLS scoping; signed-URL swap if the bucket is private.
14. **Activity log views** — per-artwork & per-contact timelines.
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; `useActivityLog(entity_type, entity_id, limit=20)` returns `activity_log` rows joined with the actor profile, newest first; `ActivityTimeline` component renders field changes as `"<actor> changed <field>: <before> → <after>"` and event rows as `"<actor> <event_type>"`; mounted on `ArtworkDetail` (entity_type='artwork') and `ContactDetail` (entity_type='contact', alongside the existing F9 `contact_activity` feed); empty state explains the trigger lives on Lovable.
    *Success (post-Lovable):* the `log_change()` Postgres trigger writes a row per audited UPDATE on `artworks`, `contacts`, `invoices`, `deals`, `cards`; the timelines populate; user attribution flows through.
15. **CSV import/export (Artlogic migration)** — bulk import artworks; export filtered set.
    *Column shape:* `internal_id, title, artist_name, artist_nationality, year, medium, width_cm, height_cm, depth_cm, price_eur, location_name, status, notes` (case-insensitive headers; only `title` and `artist_name` required).
    *Success (in-repo):* `npm run typecheck` and `npm run build` pass; "Export" button on `/inventory` downloads the **currently filtered** rows (so a user can scope by tag/artist/etc and export just that); `/inventory/import` parses a dropped CSV via `papaparse` with case-insensitive header normalisation, surfaces row-level errors, blocks submit until every row is clean, then bulk-inserts via `useImportArtworks` (resolves `artist_name` against existing artists, creates new ones on the fly; same for `location_name`; auto-generates missing `internal_id` continuing the `YG-NNNN` sequence).
    *Success (post-Lovable):* import a 100-row Artlogic export → all rows present; export round-trips with no data loss.
    *Out of scope:* CSV for contacts (the spec called out artwork migration specifically; contacts can use the existing `/signup-contact` flow or be added directly via UI).

## 8. Lovable-port checklist (must remain true throughout)

- No Node-only server code outside `supabase/functions/`. PDF is client-side.
- No custom build steps beyond Vite defaults.
- All env vars prefixed `VITE_` for client, plain names for Supabase secrets.
- Single AI module at `src/lib/ai/client.ts` — every AI feature imports from here, nothing else.
- Storage bucket names, RLS policies, and migrations are reproducible from `supabase/` folder alone.
- shadcn components live in `src/components/ui/` exactly as `npx shadcn add` produces them.

## 9. Open questions (must be asked before the relevant feature is built)

- ~~**Gallery name & wordmark text**~~ — **resolved 2026-05-07.** The gallery is **Yusto / Giner**. Wordmark is `YUSTO / GINER` set in Inter, uppercase, letterspacing ~`0.22em`, with the `/` glyph in `--accent-red`. Internal product name remains "YGManager" in code/types/routes; user-facing chrome shows the gallery brand.
- **Logo file** — wordmark above is rendered as live HTML (not an asset). If a vector logo is supplied later, swap into the sidebar header.
- **Internal ID format** — current placeholder `YG-{0000}` zero-padded.
- **Stripe account** — test keys can be Claude-generated dummies for build; live keys before feature 11 ships.
- **CSV column mapping from Artlogic export** — provide a sample export before feature 15.
- **AI provider for v1** — currently stubbed. If Lovable AI is available before launch, the stub gets replaced via env var only.

## 10. Environment variables

```
# .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
# server-side / Supabase secrets (never VITE_ prefixed):
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AI_PROVIDER=stub          # 'stub' | 'anthropic' | 'openai' | 'lovable'
AI_API_KEY=
```

## 13. Porting handoff — work that lives in Lovable Cloud, not in this repo

Decision (locked by the user): **Supabase backend setup happens on Lovable**,
not in this repo. This repo ships the frontend (UI, hooks, types, routing,
client logic) and **documents** the schema; Lovable Cloud is responsible for:

- Creating the Supabase project in `eu-central-1` (Frankfurt).
- Writing and applying SQL migrations matching §6 (galleries, profiles, role enum, artists, locations, artworks, artwork_images, collections, collection_artworks, contacts, tags, contact_tags, dossiers, invoices, invoice_lines, deals, boards, lists, cards, card_members, card_checklist, card_comments, card_attachments, card_artwork_mentions, activity_log, contact_activity).
- Writing RLS policies: every policy joins through `profiles.gallery_id = row.gallery_id`. Future `client_portal` role added via new policies, no schema change.
- The `log_change()` trigger function (generic, attached to all auditable tables; writes to `activity_log`).
- The `artworks_with_attention` view (computed `needs_attention` from card mentions, due dates, and `'shipping'` label).
- The `invite-staff` edge function (admin-only; `supabase.auth.admin.inviteUserByEmail` + insert profile row with `role='staff'` and the caller's `gallery_id`).
- Storage buckets: `artwork-images`, `card-attachments`, `dossier-exports`. RLS-scoped by `gallery_id` prefix. If buckets are private, replace `imageUrl()` (currently `getPublicUrl`) with `createSignedUrl()`.
- The `create-payment-link` edge function (feature 11): authenticated; reads `invoice_lines`, builds a Stripe Payment Link in **EUR test mode**, patches `invoices.stripe_payment_link`, returns `{ url }` to the client.
- Stripe webhook edge function (feature 11): on `checkout.session.completed` for the relevant link, sets `invoices.status = 'paid'`.
- **Anonymous-INSERT RLS policy on `contacts`** for the `/signup-contact` public route (feature 9): allows `INSERT` from `anon` role only when `gallery_id` matches the path's `?gallery=` argument; rate-limit at the edge if abused.
- **Realtime channel scope** must be expanded beyond the F6 `artworks*` baseline to include: `collection_artworks`, `dossiers`, `contacts`, `contact_activity`, `invoices`, `invoice_lines`, `deals`, `cards`, `lists`, `boards`, `card_artwork_mentions`, `card_members`, `card_checklist`, `card_comments`, `card_attachments` — i.e. every table the UI cares about for cross-tab sync.

The frontend is written so that, once the schema exists, it works without
changes — types in `src/integrations/supabase/types.ts` already match §6.
Empty states render gracefully when tables are missing or empty.

When the port happens, replace `src/integrations/supabase/types.ts` with
`supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`
and the hand-written types fall away.

## 11. Branch & commit policy

- Develop on `claude/build-ygmanager-app-RYSzZ`.
- One feature per commit (or one logical step). Reference the feature number from §7 in the message: e.g. `feat(3): inventory list + grid views`.
- Never push to a different branch without explicit user permission.
- Never `--no-verify` on hooks. Fix the underlying issue.

---

## 12. Karpathy reminder — read this every time

Before you write or change a single line of code in this repo, re-read these
four principles. They are the contract. Violating them silently is the
single biggest failure mode of agentic coding.

1. **Think before coding — surface assumptions.** State them. If uncertain, ask. If multiple interpretations exist, present them — never pick silently. If a simpler approach exists, say so. Push back when warranted.
2. **Simplicity first — minimum code.** Minimum code that solves the problem. Nothing speculative. No features beyond what was asked. No abstractions for single-use code. No "flexibility" or "configurability" that wasn't requested.
3. **Surgical changes — targeted modifications.** Every changed line traces directly to a requirement in this file. Notice unrelated dead code → mention, do not delete. Remove only imports/variables/functions that *your* changes made unused.
4. **Goal-driven execution — verifiable success.** Each feature in §7 has explicit success criteria against `supabase/seed.sql`. Strong criteria let the agent loop independently. Refuse weak criteria.

The model's failure mode is to make wrong assumptions on your behalf and run
along with them. Catch yourself. Ask. Don't drift.
