import type {
  ArtworkListItem,
  DossierCustomPage,
  EditorialPageLayout,
  PageLayoutVariant,
} from "@/integrations/supabase/domain";

export type ArtistGroup = {
  id: string;
  name: string;
  artworks: ArtworkListItem[];
};

export type ArtworkPageSpec = {
  type: "artwork";
  artwork: ArtworkListItem;
  variant: PageLayoutVariant;
  // If pair_with, the right-hand artwork. The left one is `artwork` above.
  paired_with?: ArtworkListItem;
};

export type CustomPageSpec = {
  type: "custom";
  page: DossierCustomPage;
};

export type ArtistIntroSpec = {
  type: "artist_intro";
  artist: ArtistGroup;
};

export type CoverSpec = { type: "cover" };

export type DossierPageSpec =
  | CoverSpec
  | ArtistIntroSpec
  | ArtworkPageSpec
  | CustomPageSpec;

export function getVariant(
  artworkId: string,
  layouts: Record<string, EditorialPageLayout> | undefined,
): EditorialPageLayout {
  return layouts?.[artworkId] ?? { variant: "image_right" };
}

// Group artworks by canonical artist name (lowercased + trimmed). First-seen
// artist row is canonical for that name. Mirrors the dedup in EditorialPDF.
export function groupArtists(artworks: ArtworkListItem[]): {
  artists: ArtistGroup[];
  orphaned: ArtworkListItem[];
} {
  const byName = new Map<string, ArtistGroup>();
  const orphaned: ArtworkListItem[] = [];
  for (const aw of artworks) {
    if (!aw.artist) {
      orphaned.push(aw);
      continue;
    }
    const key = aw.artist.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) existing.artworks.push(aw);
    else
      byName.set(key, {
        id: aw.artist.id,
        name: aw.artist.name,
        artworks: [aw],
      });
  }
  return { artists: Array.from(byName.values()), orphaned };
}

// Build the full page sequence for an editorial dossier.
// Ordering rules:
// 1. Cover (always first)
// 2. For each artist: intro page, then each artwork page in artwork order
// 3. Orphan artworks (no artist) at the end
// 4. Custom pages appended in ascending `position` after everything else
//
// Pair-with: when artwork A's variant is "pair_with" and pair_artwork_id = B,
// they share one page (A on left, B on right). B is suppressed from its
// natural position (no own page).
export function buildPageSequence(
  artworks: ArtworkListItem[],
  layouts: Record<string, EditorialPageLayout> | undefined,
  customPages: DossierCustomPage[] | undefined,
): DossierPageSpec[] {
  const { artists, orphaned } = groupArtists(artworks);

  // Index artworks by id so pair_with can look them up across artists.
  const byId = new Map<string, ArtworkListItem>();
  for (const aw of artworks) byId.set(aw.id, aw);

  // Pair followers — artworks that are "absorbed" into another's pair page.
  const pairFollowers = new Set<string>();
  for (const aw of artworks) {
    const layout = getVariant(aw.id, layouts);
    if (layout.variant === "pair_with" && layout.pair_artwork_id) {
      pairFollowers.add(layout.pair_artwork_id);
    }
  }

  const pages: DossierPageSpec[] = [{ type: "cover" }];

  for (const artist of artists) {
    pages.push({ type: "artist_intro", artist });
    for (const aw of artist.artworks) {
      if (pairFollowers.has(aw.id)) continue;
      const layout = getVariant(aw.id, layouts);
      const paired =
        layout.variant === "pair_with" && layout.pair_artwork_id
          ? byId.get(layout.pair_artwork_id)
          : undefined;
      pages.push({
        type: "artwork",
        artwork: aw,
        variant: layout.variant,
        paired_with: paired,
      });
    }
  }

  for (const aw of orphaned) {
    if (pairFollowers.has(aw.id)) continue;
    const layout = getVariant(aw.id, layouts);
    const paired =
      layout.variant === "pair_with" && layout.pair_artwork_id
        ? byId.get(layout.pair_artwork_id)
        : undefined;
    pages.push({
      type: "artwork",
      artwork: aw,
      variant: layout.variant,
      paired_with: paired,
    });
  }

  if (customPages?.length) {
    const sorted = [...customPages].sort((a, b) => a.position - b.position);
    for (const cp of sorted) pages.push({ type: "custom", page: cp });
  }

  return pages;
}
