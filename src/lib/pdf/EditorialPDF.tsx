import type React from "react";
import {
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatPrice, formatSize, palette, type CommonProps } from "./shared";
import { RichText } from "./rich-text-pdf";
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
// Coral band width matches the original PARALLELS dossier verbatim
// (extracted from the source PDF: panel runs 0 → 341.2 pt).
const BAND_W = 341.2;
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
    fontSize: 16,
    textDecoration: "underline",
    marginTop: 2,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  // Wordmark used on every interior page
  wordmark: {
    position: "absolute",
    top: 28,
    left: MARGIN,
    fontFamily: "Recta",
    fontWeight: 500,
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
    fontFamily: "Recta",
    fontWeight: 500,
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
  // Mirror of artworkMeta for the image_left variant (3.1).
  artworkMetaRight: {
    position: "absolute",
    right: MARGIN,
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
  // Clipped frame for the zoomable detail image (3.2).
  detailClip: {
    position: "absolute",
    top: 30,
    left: 30,
    right: 30,
    bottom: 30,
    overflow: "hidden",
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
  showTitleHtml,
  artistNames,
  galleryName,
  accent,
  textOffsets,
  watermark,
}: {
  showTitle: string;
  showTitleHtml: string;
  artistNames: string[];
  galleryName: string;
  accent: string;
  textOffsets: Record<string, { x: number; y: number }>;
  watermark: string;
}) {
  // Slash geometry transcribed verbatim from the PARALLELS source PDF
  // (extracted via pdftocairo). The full diagonal is one accent-coloured
  // parallelogram running across the band edge; the portion that overlaps
  // the coral panel is "punched out" by a matching white quadrilateral on
  // top, producing the signature two-piece broken-slash look.
  // Outlined title placement — opentype's path is drawn from baseline.
  // Top of the cap aligns to y=56+offset where the original solid <Text>
  // sat; the path's baseline = 56 + cap_height.
  const titleOff = textOffsets["cover.title"] ?? { x: 0, y: 0 };
  const artistsOff = textOffsets["cover.artists"] ?? { x: 0, y: 0 };
  // Title is always rendered as rich/plain Text now — drop the outlined
  // opentype path render so the editor preview and the export match. The
  // user's font-family / size / color picks from the toolbar make it onto
  // the page (the rich path) instead of being ignored by a hard-coded
  // 42pt Inter Bold SVG.
  const richTitle = (showTitleHtml ?? "").trim();
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <View style={[local.coverBand, { backgroundColor: accent }]} />
      {richTitle ? (
        <View
          style={{
            position: "absolute",
            top: 56 + titleOff.y,
            left: MARGIN + titleOff.x,
            width: BAND_W - MARGIN,
          }}
        >
          <RichText
            html={richTitle}
            baseStyle={{
              color: "#ffffff",
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontFamily: "Helvetica",
            }}
          />
        </View>
      ) : (
        <Text
          style={[
            local.coverTitle,
            { top: 56 + titleOff.y, left: MARGIN + titleOff.x },
          ]}
        >
          {(showTitle || "").toUpperCase()}
        </Text>
      )}
      <Svg style={local.coverSvg} viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}>
        {/* Full coral slash parallelogram on the white area. */}
        <Path
          fill={accent}
          d="M 375.9 226.06 L 286.4 399.43 L 306.56 399.43 L 396 226.06 Z"
        />
        {/* White cut-out: the portion of the slash inside the coral panel. */}
        <Path
          fill="#ffffff"
          d="M 341.2 293.22 L 286.4 399.43 L 306.56 399.43 L 341.2 332.29 Z"
        />
      </Svg>
      {artistNames.length > 0 ? (
        <View
          style={[
            local.coverArtists,
            // Right-anchored: positive x in editor (rightward) shrinks the
            // right gutter; positive y (downward) raises the bottom anchor.
            { right: MARGIN - artistsOff.x, bottom: 60 - artistsOff.y },
          ]}
        >
          {artistNames.map((name) => (
            <Text key={name} style={[local.coverArtistName, { color: accent }]}>
              {name}
            </Text>
          ))}
        </View>
      ) : null}
      {/* Hidden gallery anchor for accessibility / metadata */}
      <Text style={{ position: "absolute", opacity: 0 }}>{galleryName}</Text>
      <PdfWatermark text={watermark} />
    </Page>
  );
}

// Diagonal watermark overlay. @react-pdf supports `transform: rotate(...)`
// on Text. Rendered as the last child of every Page so it sits above other
// content; effectively a faint stamp at ~10% black.
function PdfWatermark({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "rgba(0,0,0,0.10)",
          fontSize: 110,
          fontWeight: 700,
          letterSpacing: 12,
          textTransform: "uppercase",
          transform: "rotate(-30deg)",
          // @react-pdf needs an explicit fontFamily for the page-level
          // default to win even though we set it in `local.page`.
          fontFamily: "Helvetica",
        }}
      >
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

function ArtistIntroPage({
  artistId,
  artistName,
  intro,
  photoUrl,
  galleryName,
  textOffsets,
  watermark,
}: {
  artistId: string;
  artistName: string;
  intro: DossierArtistIntro | undefined;
  photoUrl: string | null;
  galleryName: string;
  textOffsets: Record<string, { x: number; y: number }>;
  watermark: string;
}) {
  // Per-block draggable offsets in PDF pt — applied as inline overrides on
  // the matching styles so the export mirrors the editor preview exactly.
  // Keys must match the ones the HTML editor's DraggableTextBlock writes.
  const nameOff = textOffsets[`intro.${artistId}.name`] ?? { x: 0, y: 0 };
  const bioEnOff = textOffsets[`intro.${artistId}.bio_en`] ?? { x: 0, y: 0 };
  const bioEsOff = textOffsets[`intro.${artistId}.bio_es`] ?? { x: 0, y: 0 };

  // Bios were a single flex row with two `flex: 1` cols. To honour
  // independent per-bio offsets we render each column as its own
  // absolute View with explicit left/right/bottom. Column geometry
  // matches the row's flex layout (gap: 24 → ~12 pt of empty space on
  // each side of the centre line).
  const colWidth = (PAGE.width - 2 * MARGIN - 24) / 2;
  const enLeft = MARGIN;
  const esLeft = MARGIN + colWidth + 24;

  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      {photoUrl ? (
        <Image src={photoUrl} style={local.introPhoto} />
      ) : (
        <View style={local.introPhoto} />
      )}
      <View style={local.introScrim} />
      <Wordmark galleryName={galleryName} white />
      <View
        style={[
          local.introHeader,
          // Overrides flow: positive y → moves down (top grows); positive x
          // → moves right; the header is anchored to right:MARGIN, so a
          // rightward x shrinks the right gutter.
          { top: 28 + nameOff.y, right: MARGIN - nameOff.x },
        ]}
      >
        <Text style={local.introArtistName}>{artistName.toUpperCase()}</Text>
        {intro?.instagram ? (
          <Text style={local.introHandle}>
            {intro.instagram.startsWith("@") ? intro.instagram : `@${intro.instagram}`}
          </Text>
        ) : null}
      </View>
      {intro?.bio_en || intro?.bio_en_html ? (
        <View
          style={{
            position: "absolute",
            left: enLeft + bioEnOff.x,
            // bottom-anchored: positive y in editor (down) → smaller bottom.
            bottom: 56 - bioEnOff.y,
            width: colWidth,
          }}
        >
          {(intro?.bio_en_label ?? "EN").trim() ? (
            <Text style={local.introLangLabel}>
              {intro?.bio_en_label ?? "EN"}
            </Text>
          ) : null}
          <RichText
            html={intro?.bio_en_html}
            fallback={intro?.bio_en}
            baseStyle={local.introBioBody}
          />
        </View>
      ) : null}
      {intro?.bio_es || intro?.bio_es_html ? (
        <View
          style={{
            position: "absolute",
            left: esLeft + bioEsOff.x,
            bottom: 56 - bioEsOff.y,
            width: colWidth,
          }}
        >
          {(intro?.bio_es_label ?? "ES").trim() ? (
            <Text style={local.introLangLabel}>
              {intro?.bio_es_label ?? "ES"}
            </Text>
          ) : null}
          <RichText
            html={intro?.bio_es_html}
            fallback={intro?.bio_es}
            baseStyle={local.introBioBody}
          />
        </View>
      ) : null}
      <PdfWatermark text={watermark} />
    </Page>
  );
}

// Compact meta block (artist / title+year / medium / dimensions / price)
// reused across artwork-page variants. The optional `offsetStyle` override
// is computed by the caller from the editor's saved drag offset and is
// pushed onto the style array so it wins over the anchor in `style`.
type MetaStyle = NonNullable<React.ComponentProps<typeof View>["style"]>;
function ArtworkMeta({
  artwork,
  style,
  offsetStyle,
  disclaimer,
}: {
  artwork: ArtworkListItem;
  style?: MetaStyle;
  offsetStyle?: { left?: number; right?: number; bottom?: number };
  disclaimer: string;
}) {
  const size = formatSize(artwork);
  const dims = size ? size.replace(/×/g, "x") : "";
  const price = formatPrice(artwork.price_eur);
  const base: MetaStyle = style ?? local.artworkMeta;
  // Flat spread keeps the value an object (not an array) so the union
  // resolves to Style for @react-pdf's typing.
  const merged: MetaStyle = offsetStyle
    ? Object.assign({}, base, offsetStyle)
    : base;
  const showDisclaimer = disclaimer.trim().length > 0;
  return (
    <View style={merged}>
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
          {price}
          {showDisclaimer ? (
            <Text style={local.metaDisclaimer}> | {disclaimer}</Text>
          ) : null}
        </Text>
      ) : null}
    </View>
  );
}

// Build a style override that translates a left- or right-anchored block by
// (off.x, off.y) in PDF pt. Mirrors the editor preview's translate(x,y).
// Returns undefined when the offset is zero so the caller can skip pushing
// it onto the style array (@react-pdf rejects null entries).
function leftOffsetStyle(off: { x: number; y: number }, baseLeft: number) {
  if (off.x === 0 && off.y === 0) return undefined;
  return { left: baseLeft + off.x, bottom: 50 - off.y };
}
function rightOffsetStyle(off: { x: number; y: number }, baseRight: number) {
  if (off.x === 0 && off.y === 0) return undefined;
  return { right: baseRight - off.x, bottom: 50 - off.y };
}

function FullImagePage({
  artwork,
  imageUrl,
  watermark,
}: {
  artwork: ArtworkListItem;
  imageUrl: string | null;
  watermark: string;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      {imageUrl ? <Image src={imageUrl} style={local.fullImage} /> : null}
      <Text style={local.fullImageCaption}>
        {artwork.artist?.name ? `${artwork.artist.name} — ` : ""}
        {artwork.title}
        {artwork.year ? `, ${artwork.year}` : ""}
      </Text>
      <PdfWatermark text={watermark} />
    </Page>
  );
}

function DetailZoomPage({
  imageUrl,
  watermark,
  scale = 1,
  focusX = 0.5,
  focusY = 0.5,
}: {
  imageUrl: string | null;
  watermark: string;
  // 3.2: zoom amount (1..3) + focal point (0..1) chosen in the editor. The
  // image is scaled inside a clipped frame so a specific detail can be
  // framed, instead of always showing the whole work contained.
  scale?: number;
  focusX?: number;
  focusY?: number;
}) {
  const s = Math.max(1, scale);
  const left = `${(0.5 - focusX * s) * 100}%`;
  const top = `${(0.5 - focusY * s) * 100}%`;
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <View style={local.detailBg} />
      <View style={local.detailClip}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            style={{
              position: "absolute",
              width: `${s * 100}%`,
              height: `${s * 100}%`,
              left,
              top,
              objectFit: "cover",
            }}
          />
        ) : null}
      </View>
      <PdfWatermark text={watermark} />
    </Page>
  );
}

function PairPage({
  left,
  right,
  leftUrl,
  rightUrl,
  galleryName,
  textOffsets,
  watermark,
  disclaimer,
}: {
  left: ArtworkListItem;
  right: ArtworkListItem;
  leftUrl: string | null;
  rightUrl: string | null;
  galleryName: string;
  textOffsets: Record<string, { x: number; y: number }>;
  watermark: string;
  disclaimer: string;
}) {
  const leftOff = textOffsets[`artwork.${left.id}.meta`] ?? { x: 0, y: 0 };
  const rightOff = textOffsets[`artwork.${right.id}.meta`] ?? { x: 0, y: 0 };
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <Wordmark galleryName={galleryName} />
      <View style={local.pairLeft}>
        {leftUrl ? <Image src={leftUrl} style={local.artworkImage} /> : null}
      </View>
      <View style={local.pairRight}>
        {rightUrl ? <Image src={rightUrl} style={local.artworkImage} /> : null}
      </View>
      <ArtworkMeta
        artwork={left}
        style={local.pairMetaLeft}
        offsetStyle={leftOffsetStyle(leftOff, MARGIN)}
        disclaimer={disclaimer}
      />
      <ArtworkMeta
        artwork={right}
        style={local.pairMetaRight}
        offsetStyle={rightOffsetStyle(rightOff, MARGIN)}
        disclaimer={disclaimer}
      />
      <PdfWatermark text={watermark} />
    </Page>
  );
}

function CustomImagePage({
  page,
  imageUrl,
  galleryName,
  watermark,
}: {
  page: DossierCustomPage;
  imageUrl: string | null;
  galleryName: string;
  watermark: string;
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
      <PdfWatermark text={watermark} />
    </Page>
  );
}

function ArtworkPage({
  artwork,
  imageUrl,
  galleryName,
  textOffsets,
  watermark,
  disclaimer,
  mirrored = false,
}: {
  artwork: ArtworkListItem;
  imageUrl: string | null;
  galleryName: string;
  textOffsets: Record<string, { x: number; y: number }>;
  watermark: string;
  disclaimer: string;
  // image_left (3.1): swap the image box to the left and the meta to the
  // right, mirroring the default image_right layout.
  mirrored?: boolean;
}) {
  const off = textOffsets[`artwork.${artwork.id}.meta`] ?? { x: 0, y: 0 };
  const imageBoxStyle = mirrored
    ? Object.assign({}, local.artworkImageBox, { right: undefined, left: MARGIN })
    : local.artworkImageBox;
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <Wordmark galleryName={galleryName} />
      <View style={imageBoxStyle}>
        {imageUrl ? <Image src={imageUrl} style={local.artworkImage} /> : null}
      </View>
      <ArtworkMeta
        artwork={artwork}
        style={mirrored ? local.artworkMetaRight : undefined}
        offsetStyle={
          mirrored ? rightOffsetStyle(off, MARGIN) : leftOffsetStyle(off, MARGIN)
        }
        disclaimer={disclaimer}
      />
      <PdfWatermark text={watermark} />
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

  const textOffsets = dossier.body_blocks.text_offsets ?? {};
  const watermark = dossier.body_blocks.watermark?.trim() || "";
  // Per-dossier disclaimer (editable in the meta block of the HTML preview).
  // `undefined` falls back to the historical default; empty string hides
  // the disclaimer entirely.
  const disclaimer = dossier.body_blocks.disclaimer ?? FIXED_DISCLAIMER;
  const showTitleHtml = dossier.body_blocks.show_title_html ?? "";

  const pages: React.ReactNode[] = sequence.map((spec, i) => {
    if (spec.type === "cover") {
      return (
        <CoverPage
          key={`cover-${i}`}
          showTitle={showTitle}
          showTitleHtml={showTitleHtml}
          artistNames={artistNamesForCover}
          galleryName={galleryName}
          accent={accent}
          textOffsets={textOffsets}
          watermark={watermark}
        />
      );
    }
    if (spec.type === "artist_intro") {
      const intro = intros[spec.artist.id];
      return (
        <ArtistIntroPage
          key={`intro-${spec.artist.id}`}
          artistId={spec.artist.id}
          artistName={spec.artist.name}
          intro={intro}
          photoUrl={imageUrlFor(intro?.photo_path)}
          galleryName={galleryName}
          textOffsets={textOffsets}
          watermark={watermark}
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
          watermark={watermark}
        />
      );
    }
    // Artwork page — pick variant.
    const aw = spec.artwork;
    const imgUrl = imageUrlFor(aw.primary_image?.storage_path);
    if (spec.variant === "full_image") {
      return <FullImagePage key={`aw-${aw.id}`} artwork={aw} imageUrl={imgUrl} watermark={watermark} />;
    }
    if (spec.variant === "detail_zoom") {
      const layout = dossier.body_blocks.page_layouts?.[aw.id];
      const detailUrl = layout?.detail_image_path
        ? imageUrlFor(layout.detail_image_path)
        : imgUrl;
      return (
        <DetailZoomPage
          key={`aw-${aw.id}`}
          imageUrl={detailUrl}
          watermark={watermark}
          scale={layout?.detail_scale ?? 1}
          focusX={layout?.detail_x ?? 0.5}
          focusY={layout?.detail_y ?? 0.5}
        />
      );
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
          textOffsets={textOffsets}
          watermark={watermark}
          disclaimer={disclaimer}
        />
      );
    }
    return (
      <ArtworkPage
        key={`aw-${aw.id}`}
        artwork={aw}
        imageUrl={imgUrl}
        galleryName={galleryName}
        textOffsets={textOffsets}
        watermark={watermark}
        disclaimer={disclaimer}
        mirrored={spec.variant === "image_left"}
      />
    );
  });

  return <Document title={dossier.title}>{pages}</Document>;
}
