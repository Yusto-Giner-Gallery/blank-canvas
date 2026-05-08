## Problem

`/inventory/:id` (e.g. Daniel Núñez → an artwork) currently shows information + tags + delete only. Every common action is missing.

## What gets added

A single **Actions** bar at the top of the page (next to Back / Delete) plus an **Edit mode** for the info panel. All wiring reuses hooks that already exist — no new backend.

### 1. Action bar (always visible)

| Button | Behaviour |
|---|---|
| **Edit** | Flips info panel into editable form (see §2). |
| **Add to dossier** | Opens existing `DossierFromSelectionPicker` with `artwork_ids=[id]`. |
| **Add to collection** | Opens existing `CollectionPicker` with `artwork_ids=[id]`. (This is how artworks get bundled into a "general PDF export" — collections drive dossier PDFs.) |
| **Add image** | Hidden `<input type="file" multiple accept="image/*">`; uploads each to `artwork-images` bucket at `${gallery_id}/${artwork_id}/${safeName}`, inserts an `artwork_images` row. First upload becomes `is_primary` only if the artwork has no images yet. |
| **Mark archived / Mark available** | Toggles `status` between `archived` and `available` via `useUpdateArtwork`. (This is "make it inactive" — soft-delete stays as the existing destructive Delete.) |

Buttons collapse responsibly on mobile (icons only under `md:`).

### 2. Inline edit mode

Toggling **Edit** turns the read-only `<dl>` into a form with: title, artist (select existing or add new), year, medium, width/height/depth (cm), price (EUR), status, location, notes. Save → `useUpdateArtwork` patch (extended to accept the extra fields — already a thin wrapper, just widen `ArtworkPatch`). Artist change uses the same lookup-or-create logic as `useUploadArtworks.resolveArtist`, extracted into `src/lib/artists.ts` so both call sites share it.

Cancel reverts. Save shows toast and exits edit mode. Activity log already auto-records field changes via the `log_change()` trigger.

### 3. Image gallery

Below the main image, render thumbnails for every row in `artwork_images` (currently the page only fetches `primary_image`). Each thumb has a "Make primary" + "Remove" hover action. New hook `useArtworkImages(artwork_id)` — small select query + 3 mutations (`add`, `setPrimary`, `remove`). Removing deletes the storage object and the row.

## Files touched

- `src/pages/ArtworkDetail.tsx` — action bar, edit mode, image gallery section.
- `src/hooks/useUpdateArtwork.ts` — widen `ArtworkPatch` to include `title, artist_id, year, medium, width_cm, height_cm, depth_cm`.
- `src/hooks/useArtworkImages.ts` — **new**, list/add/setPrimary/remove.
- `src/lib/artists.ts` — **new**, extract shared `resolveArtist(gallery_id, { artist_id, artist_name_new })`. Update `useUploadArtworks` to import from here (one-line change, behaviour identical).

## Files reused as-is

`DossierFromSelectionPicker`, `CollectionPicker`, `useDeleteArtwork`, `useArtists`, `useLocations`, `useTags`, `useArtworkTags`, `ActivityTimeline`, storage bucket `artwork-images`.

## Out of scope

- Per-artwork standalone PDF tearsheet (not in current product; collections + dossiers are the existing PDF path). Tell me if you want a separate one-pager export and I'll add it.
- Drag-reordering image thumbnails (just primary toggle for now).
