import type React from "react";
import {
  Document,
  Image,
  Line,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatPrice, formatSize, palette, type CommonProps } from "./shared";
import type {
  ArtworkListItem,
  DossierArtistIntro,
  DossierCustomPage,
} from "@/integrations/supabase/domain";
import { buildPageSequence } from "@/lib/dossier/editorial-order";

// Editorial template — faithful, parameterised copy of the PARALLELS dossier.
// Layout is fixed (cover band + slash + per-artist intro + per-artwork pages);
// every text/image slot is driven by `dossier` + `artworks`. Identical visual,
// different content per show.

const PAGE = { width: 792, height: 595 };
const BAND_W = 320;
const MARGIN = 40;

const FIXED_DISCLAIMER = "TAXES and transport excluded / IVA y Transporte no incluido";

const local = StyleSheet.create({
  page: { backgroundColor: palette.bg, color: palette.ink, fontFamily: "Helvetica" },

  // Cover
  coverBand: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: BAND_W,
  },
  // Full-page SVG overlay just for the broken slash (Lines fully supported).
  coverSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: PAGE.width,
    height: PAGE.height,
  },
  // Cover title — solid white at large size. Known compromise: PARALLELS
  // uses outlined-stroke type, but @react-pdf/renderer's SVG <Text> does
  // not call ctx.stroke() (see render/lib/index.js renderRun$1), so true
  // hollow text needs opentype.js glyph paths rendered as <Path>. Out of
  // scope for now.
  coverTitle: {
    position: "absolute",
    top: 56,
    left: MARGIN,
    width: BAND_W - MARGIN,
    color: "#ffffff",
    fontSize: 42,
    letterSpacing: 3,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  coverArtists: {
    position: "absolute",
    bottom: 60,
    right: MARGIN,
    alignItems: "flex-end",
  },
  coverArtistName: {
    fontSize: 14,
    textDecoration: "underline",
    marginTop: 2,
    fontWeight: 700,
  },

  // Wordmark used on every interior page
  wordmark: {
    position: "absolute",
    top: 28,
    left: MARGIN,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: palette.ink,
  },
  wordmarkAccent: { color: palette.accent },

  // Artist intro page
  introPhoto: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    backgroundColor: "#1a1a1a",
  },
  introScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  introWordmark: {
    position: "absolute",
    top: 28,
    left: MARGIN,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#ffffff",
  },
  introHeader: {
    position: "absolute",
    top: 28,
    right: MARGIN,
    alignItems: "flex-end",
  },
  introArtistName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  introHandle: { color: "#ffffff", fontSize: 9, marginTop: 2 },
  introBioRow: {
    position: "absolute",
    left: MARGIN,
    right: MARGIN,
    bottom: 56,
    flexDirection: "row",
    gap: 24,
  },
  introBioCol: { flex: 1 },
  introLangLabel: {
    color: "#ffffff",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 6,
  },
  introBioBody: { color: "#ffffff", fontSize: 8.5, lineHeight: 1.5 },

  // Artwork page
  artworkPage: { padding: 0 },
  artworkImageBox: {
    position: "absolute",
    top: 70,
    right: MARGIN,
    width: PAGE.width / 2 - MARGIN,
    bottom: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  artworkImage: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
  },
  artworkMeta: {
    position: "absolute",
    left: MARGIN,
    bottom: 50,
    width: PAGE.width / 2 - MARGIN * 2,
  },
  metaArtist: { fontSize: 10, color: palette.ink },
  metaTitle: { fontSize: 10, color: palette.ink, fontWeight: 700, marginTop: 2 },
  metaLine: { fontSize: 9, color: palette.body, marginTop: 2 },
  metaPrice: { fontSize: 10, color: palette.ink, fontWeight: 700, marginTop: 14 },
  metaDisclaimer: { fontSize: 8, color: palette.body },

  // Full-bleed image page — image fills, optional small footer caption
  fullImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  fullImageCaption: {
    position: "absolute",
    bottom: 24,
    left: MARGIN,
    fontSize: 8,
    color: "#ffffff",
    textShadow: "0 0 2px rgba(0,0,0,0.5)",
  },

  // Detail zoom — same as full-bleed but contain (no crop) and on dark bg
  detailBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0a0a",
  },
  detailImage: {
    position: "absolute",
    top: 30,
    left: 30,
    right: 30,
    bottom: 30,
    objectFit: "contain",
  },

  // Pair page — two artworks side by side
  pairLeft: {
    position: "absolute",
    top: 70,
    left: MARGIN,
    width: PAGE.width / 2 - MARGIN - 8,
    bottom: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  pairRight: {
    position: "absolute",
    top: 70,
    right: MARGIN,
    width: PAGE.width / 2 - MARGIN - 8,
    bottom: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  pairMetaLeft: {
    position: "absolute",
    left: MARGIN,
    bottom: 50,
    width: PAGE.width / 2 - MARGIN - 8,
  },
  pairMetaRight: {
    position: "absolute",
    right: MARGIN,
    bottom: 50,
    width: PAGE.width / 2 - MARGIN - 8,
    alignItems: "flex-start",
  },
});

function Wordmark({ galleryName, white = false }: { galleryName: string; white?: boolean }) {
  // Renders "<NAME> / <suffix>" with the slash in accent — mirrors the
  // YUSTO / GINER chrome. If the gallery name has no slash, render plain.
  const parts = galleryName.split("/").map((s) => s.trim()).filter(Boolean);
  const baseStyle = white ? local.introWordmark : local.wordmark;
  if (parts.length < 2) return <Text style={baseStyle}>{galleryName}</Text>;
  return (
    <Text style={baseStyle}>
      {parts[0]} <Text style={local.wordmarkAccent}>/</Text> {parts.slice(1).join(" / ")}
    </Text>
  );
}

function CoverPage({
  showTitle,
  artistNames,
  galleryName,
  accent,
}: {
  showTitle: string;
  artistNames: string[];
  galleryName: string;
  accent: string;
}) {
  // Slash geometry — both segments share slope = (320-200)/(300-240) = 2.0
  // and gap is centred at the band's right edge so the broken slash reads
  // as one diagonal mark crossing into the white area.
  const SLASH_W = 18;
  const slashWhite = { x1: 240, y1: 200, x2: 300, y2: 320 };
  const slashAccent = { x1: 320, y1: 360, x2: 380, y2: 480 };
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <View style={[local.coverBand, { backgroundColor: accent }]} />
      <Text style={local.coverTitle}>{(showTitle || "").toUpperCase()}</Text>
      <Svg style={local.coverSvg} viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}>
        {/* Broken slash — colinear segments straddling the band edge. */}
        <Line
          {...slashWhite}
          stroke="#ffffff"
          strokeWidth={SLASH_W}
          strokeLinecap="butt"
        />
        <Line
          {...slashAccent}
          stroke={accent}
          strokeWidth={SLASH_W}
          strokeLinecap="butt"
        />
      </Svg>
      {artistNames.length > 0 ? (
        <View style={local.coverArtists}>
          {artistNames.map((name) => (
            <Text key={name} style={[local.coverArtistName, { color: accent }]}>
              {name}
            </Text>
          ))}
        </View>
      ) : null}
      {/* Hidden gallery anchor for accessibility / metadata */}
      <Text style={{ position: "absolute", opacity: 0 }}>{galleryName}</Text>
    </Page>
  );
}

function ArtistIntroPage({
  artistName,
  intro,
  photoUrl,
  galleryName,
}: {
  artistName: string;
  intro: DossierArtistIntro | undefined;
  photoUrl: string | null;
  galleryName: string;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      {photoUrl ? (
        <Image src={photoUrl} style={local.introPhoto} />
      ) : (
        <View style={local.introPhoto} />
      )}
      <View style={local.introScrim} />
      <Wordmark galleryName={galleryName} white />
      <View style={local.introHeader}>
        <Text style={local.introArtistName}>{artistName.toUpperCase()}</Text>
        {intro?.instagram ? (
          <Text style={local.introHandle}>
            {intro.instagram.startsWith("@") ? intro.instagram : `@${intro.instagram}`}
          </Text>
        ) : null}
      </View>
      {(intro?.bio_en || intro?.bio_es) ? (
        <View style={local.introBioRow}>
          <View style={local.introBioCol}>
            <Text style={local.introLangLabel}>EN</Text>
            <Text style={local.introBioBody}>{intro?.bio_en ?? ""}</Text>
          </View>
          <View style={local.introBioCol}>
            <Text style={local.introLangLabel}>ES</Text>
            <Text style={local.introBioBody}>{intro?.bio_es ?? ""}</Text>
          </View>
        </View>
      ) : null}
    </Page>
  );
}

// Compact meta block (artist / title+year / medium / dimensions / price)
// reused across artwork-page variants.
function ArtworkMeta({
  artwork,
  style,
}: {
  artwork: ArtworkListItem;
  style?: React.ComponentProps<typeof View>["style"];
}) {
  const size = formatSize(artwork);
  const dims = size ? size.replace(/×/g, "x") : "";
  const price = formatPrice(artwork.price_eur);
  return (
    <View style={style ?? local.artworkMeta}>
      {artwork.artist?.name ? (
        <Text style={local.metaArtist}>{artwork.artist.name}</Text>
      ) : null}
      <Text style={local.metaTitle}>
        {artwork.title}
        {artwork.year ? `, ${artwork.year}` : ""}
      </Text>
      {artwork.medium ? <Text style={local.metaLine}>{artwork.medium}</Text> : null}
      {dims ? <Text style={local.metaLine}>{dims}</Text> : null}
      {price ? (
        <Text style={local.metaPrice}>
          {price} <Text style={local.metaDisclaimer}>| {FIXED_DISCLAIMER}</Text>
        </Text>
      ) : null}
    </View>
  );
}

function FullImagePage({
  artwork,
  imageUrl,
}: {
  artwork: ArtworkListItem;
  imageUrl: string | null;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      {imageUrl ? <Image src={imageUrl} style={local.fullImage} /> : null}
      <Text style={local.fullImageCaption}>
        {artwork.artist?.name ? `${artwork.artist.name} — ` : ""}
        {artwork.title}
        {artwork.year ? `, ${artwork.year}` : ""}
      </Text>
    </Page>
  );
}

function DetailZoomPage({
  imageUrl,
}: {
  imageUrl: string | null;
}) {
  // Cropped/zoom variant: dark canvas, image contained without crop, no
  // meta block. Mirrors PARALLELS' page-8/page-21 detail spreads.
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <View style={local.detailBg} />
      {imageUrl ? <Image src={imageUrl} style={local.detailImage} /> : null}
    </Page>
  );
}

function PairPage({
  left,
  right,
  leftUrl,
  rightUrl,
  galleryName,
}: {
  left: ArtworkListItem;
  right: ArtworkListItem;
  leftUrl: string | null;
  rightUrl: string | null;
  galleryName: string;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <Wordmark galleryName={galleryName} />
      <View style={local.pairLeft}>
        {leftUrl ? <Image src={leftUrl} style={local.artworkImage} /> : null}
      </View>
      <View style={local.pairRight}>
        {rightUrl ? <Image src={rightUrl} style={local.artworkImage} /> : null}
      </View>
      <ArtworkMeta artwork={left} style={local.pairMetaLeft} />
      <ArtworkMeta artwork={right} style={local.pairMetaRight} />
    </Page>
  );
}

function CustomImagePage({
  page,
  imageUrl,
  galleryName,
}: {
  page: DossierCustomPage;
  imageUrl: string | null;
  galleryName: string;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      {imageUrl ? <Image src={imageUrl} style={local.fullImage} /> : (
        <View style={[local.fullImage, { backgroundColor: "#1a1a1a" }]} />
      )}
      <Wordmark galleryName={galleryName} />
      {page.caption ? (
        <Text style={local.fullImageCaption}>{page.caption}</Text>
      ) : null}
    </Page>
  );
}

function ArtworkPage({
  artwork,
  imageUrl,
  galleryName,
}: {
  artwork: ArtworkListItem;
  imageUrl: string | null;
  galleryName: string;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <Wordmark galleryName={galleryName} />
      <View style={local.artworkImageBox}>
        {imageUrl ? <Image src={imageUrl} style={local.artworkImage} /> : null}
      </View>
      <ArtworkMeta artwork={artwork} />
    </Page>
  );
}

export function EditorialPDF({ dossier, artworks, galleryName, imageUrlFor }: CommonProps) {
  const showTitle = dossier.body_blocks.show_title?.trim() || dossier.title;
  const intros = dossier.body_blocks.artist_intros ?? {};
  // Per-dossier accent override (CLAUDE.md §3 4th color exception). Defaults
  // to palette.accent (PARALLELS coral) so existing dossiers keep working.
  const accent = dossier.body_blocks.accent_color?.trim() || palette.accent;

  // Single source of truth for page ordering — same helper drives the HTML
  // editor preview, so layout changes can never diverge between the two.
  const sequence = buildPageSequence(
    artworks,
    dossier.body_blocks.page_layouts,
    dossier.body_blocks.custom_pages,
  );
  const artistNamesForCover = sequence
    .filter((p): p is Extract<typeof sequence[number], { type: "artist_intro" }> => p.type === "artist_intro")
    .map((p) => p.artist.name);

  const pages: React.ReactNode[] = sequence.map((spec, i) => {
    if (spec.type === "cover") {
      return (
        <CoverPage
          key={`cover-${i}`}
          showTitle={showTitle}
          artistNames={artistNamesForCover}
          galleryName={galleryName}
          accent={accent}
        />
      );
    }
    if (spec.type === "artist_intro") {
      const intro = intros[spec.artist.id];
      return (
        <ArtistIntroPage
          key={`intro-${spec.artist.id}`}
          artistName={spec.artist.name}
          intro={intro}
          photoUrl={imageUrlFor(intro?.photo_path)}
          galleryName={galleryName}
        />
      );
    }
    if (spec.type === "custom") {
      return (
        <CustomImagePage
          key={`custom-${spec.page.id}`}
          page={spec.page}
          imageUrl={imageUrlFor(spec.page.image_path)}
          galleryName={galleryName}
        />
      );
    }
    // Artwork page — pick variant.
    const aw = spec.artwork;
    const imgUrl = imageUrlFor(aw.primary_image?.storage_path);
    if (spec.variant === "full_image") {
      return <FullImagePage key={`aw-${aw.id}`} artwork={aw} imageUrl={imgUrl} />;
    }
    if (spec.variant === "detail_zoom") {
      const layout = dossier.body_blocks.page_layouts?.[aw.id];
      const detailUrl = layout?.detail_image_path
        ? imageUrlFor(layout.detail_image_path)
        : imgUrl;
      return <DetailZoomPage key={`aw-${aw.id}`} imageUrl={detailUrl} />;
    }
    if (spec.variant === "pair_with" && spec.paired_with) {
      const right = spec.paired_with;
      return (
        <PairPage
          key={`aw-${aw.id}-${right.id}`}
          left={aw}
          right={right}
          leftUrl={imgUrl}
          rightUrl={imageUrlFor(right.primary_image?.storage_path)}
          galleryName={galleryName}
        />
      );
    }
    return (
      <ArtworkPage
        key={`aw-${aw.id}`}
        artwork={aw}
        imageUrl={imgUrl}
        galleryName={galleryName}
      />
    );
  });

  return <Document title={dossier.title}>{pages}</Document>;
}
