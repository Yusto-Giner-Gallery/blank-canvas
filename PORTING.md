# Lovable port — what to do after `Import from GitHub`

This repo is **frontend-complete and backend-deferred**. Every UI, hook,
type and route is in place; the Supabase schema, RLS policies, triggers,
edge functions, storage buckets, and Realtime publications are deliberately
left for Lovable Cloud (per the user's call during F2). This file lists
exactly what Lovable needs to set up, in order. Pair it with `CLAUDE.md`
which is the in-repo source of truth.

## 0. Connect Lovable Cloud

- New Lovable project from this repo, branch `claude/build-ygmanager-app-RYSzZ`.
- Provision Supabase in `eu-central-1` (Frankfurt). Copy `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` into Lovable env.
- Set `VITE_AI_PROVIDER=lovable` and replace the body of `generateText`
  in `src/lib/ai/client.ts` with the Lovable AI call. **No other file
  changes** for the AI swap.

## 1. Schema migrations (mirrors `CLAUDE.md §6`)

Create these tables, in this order, with the columns shown in
`src/integrations/supabase/types.ts`. Every table carries `gallery_id`
where applicable, plus `created_at`, `updated_at` defaults, and
`deleted_at` on the soft-deletable ones.

1. `galleries`
2. `profiles` (FK to `auth.users.id`, role enum `admin|staff`)
3. `artists`, `locations`, `tags`
4. `artworks`, `artwork_images`, `artwork_tags`
5. `collections`, `collection_artworks`
6. `dossiers`
7. `contacts`, `contact_tags`, `contact_activity`
8. `invoices`, `invoice_lines`
9. `deals`
10. `boards`, `lists`, `cards`, `card_artwork_mentions`,
    `card_members`, `card_checklist`, `card_comments`, `card_attachments`
11. `activity_log`

After migrations: `supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts`. The hand-written types fall away and the typed client keeps working.

## 2. Row Level Security (RLS) policies

Every table: `SELECT/INSERT/UPDATE/DELETE WHERE EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.gallery_id = <table>.gallery_id)`.

Two exceptions:

- **`/signup-contact` public route:** allow `INSERT` into `contacts`
  from the `anon` role when `gallery_id` matches the `?gallery=<id>`
  argument. Add a rate limit at the edge to deter abuse.
- **Future `client_portal` role:** add policies later for read-only
  access to specific dossiers + invoices. **No schema change** — just
  new policies — per the spec foundation rule.

## 3. Triggers and views

- **`log_change()` trigger function** — generic, attached to UPDATE on
  `artworks`, `contacts`, `invoices`, `deals`, `cards`. Writes one
  `activity_log` row per changed field with `before`/`after` (JSON),
  the acting `auth.uid()`, and the entity reference. The
  `ActivityTimeline` component renders these.
- **`artworks_with_attention` view** — `artworks` joined to
  `card_artwork_mentions → cards`, computing
  `needs_attention = bool_or(c.labels @> ARRAY['shipping'] OR c.due_date <= now() + interval '7 days')`.
  When the view exists, swap the `useArtworks` query target from
  `artworks` to `artworks_with_attention` (one-line change). The
  in-repo `computeAttention` fallback can be deleted.
- **Internal-ID sequence** (optional): a Postgres sequence
  `artwork_internal_id_seq` and a trigger that fills `internal_id` if
  absent. Replaces the client-side `nextInternalId` in
  `BulkUpload.tsx` (which has a tiny race window).

## 4. Edge functions

- **`invite-staff`** (admin-only): verify caller's profile.role,
  `supabase.auth.admin.inviteUserByEmail(email)`, then insert a
  `profiles` row with the caller's `gallery_id` and `role='staff'`.
- **`create-payment-link`** (authenticated): read `invoice_lines`,
  build a Stripe Payment Link in **EUR test mode**, patch
  `invoices.stripe_payment_link`, return `{ url }`. Frontend at
  `src/hooks/useInvoices.ts → useCreateStripePaymentLink` already
  expects this shape.
- **Stripe webhook**: on `checkout.session.completed`, set the
  matching `invoices.status = 'paid'`.

## 5. Storage buckets

- `artwork-images` — uploaded from `BulkUpload.tsx`. Path
  `{gallery_id}/{artwork_id}/{filename}`.
- `card-attachments` — uploaded from `CardDetailModal`. Path
  `{gallery_id}/{card_id}/{uuid}-{filename}`.
- `dossier-exports` — currently unused (PDF generated client-side); reserve for future server-rendered exports.

If buckets are private (recommended): replace the `getPublicUrl` calls
in `src/hooks/useArtworks.ts → imageUrl` and `src/hooks/useCardDetail.ts → attachmentUrl` with `createSignedUrl`. Two one-line changes.

## 6. Realtime publication

Enable `supabase_realtime` for these tables (used by
`useRealtimeArtworks` and `useRealtimeKanban`):

```
artworks, artwork_tags, artwork_images,
collection_artworks,
dossiers,
contacts, contact_activity,
invoices, invoice_lines,
deals,
boards, lists, cards,
card_artwork_mentions, card_members,
card_checklist, card_comments, card_attachments
```

## 7. First-run setup

- Insert one row in `galleries` (the gallery's name).
- Sign up the admin via Supabase Auth, then insert a `profiles` row
  with `role='admin'` and the gallery's id.
- Test the loop:
  1. Sign in → dashboard.
  2. Upload one image via `/inventory/upload`.
  3. Click the resulting card → `/inventory/:id` → add a tag.
  4. Right-click the card on `/inventory` → quick-edit popover.
  5. Multi-select two artworks → "Add to collection" → "Generate dossier".
  6. Edit the dossier → "Send to contacts" → mailto opens.
  7. Move a deal to `won` on `/pipeline` → invoice draft toast.
  8. `@artwork:YG-0001` in a card → orange in inventory.
  9. CSV export from `/inventory` → re-import on a clean DB.

## 8. Things you can ignore

- The hand-written `src/integrations/supabase/types.ts` (replaced by
  generated types).
- The `nextInternalId` client logic in `BulkUpload.tsx` (replaced by
  the sequence trigger).
- The `computeAttention` block in `useArtworks.ts` (replaced by the
  view).

## 9. Things to confirm with the gallery

- Real Stripe keys (test → live cutover).
- Logo file + brand wordmark.
- Confirm the `internal_id` format (`YG-NNNN`) before bulk upload.
- Sample Artlogic CSV export to verify the column shape in
  `src/lib/csv.ts → CSV_HEADERS`.
