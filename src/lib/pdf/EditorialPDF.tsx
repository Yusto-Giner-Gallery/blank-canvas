import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatPrice, formatSize, palette, type CommonProps } from "./shared";
import type { ArtworkListItem, DossierArtistIntro } from "@/integrations/supabase/domain";

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
    backgroundColor: palette.accent,
  },
  coverTitle: {
    position: "absolute",
    top: 56,
    left: MARGIN,
    width: BAND_W - MARGIN * 2,
    color: "#ffffff",
    fontSize: 36,
    letterSpacing: 4,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  // Bicolor broken slash. Two rotated rectangles straddle the band's right
  // edge: white on the coloured side, accent on the white side, with a gap
  // between them (the gap reads as the broken-slash detail in the original).
  slashWhite: {
    position: "absolute",
    top: 220,
    left: BAND_W - 70,
    width: 14,
    height: 110,
    backgroundColor: "#ffffff",
    transform: "rotate(-18deg)",
  },
  slashAccent: {
    position: "absolute",
    top: 320,
    left: BAND_W + 30,
    width: 14,
    height: 110,
    backgroundColor: palette.accent,
    transform: "rotate(-18deg)",
  },
  coverArtists: {
    position: "absolute",
    bottom: 60,
    right: MARGIN,
    alignItems: "flex-end",
  },
  coverArtistName: {
    color: palette.accent,
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
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    backgroundColor: "#1a1a1a",
  },
  introScrim: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.18)",
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
}: {
  showTitle: string;
  artistNames: string[];
  galleryName: string;
}) {
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <View style={local.coverBand} />
      <Text style={local.coverTitle}>{showTitle}</Text>
      <View style={local.slashWhite} />
      <View style={local.slashAccent} />
      {artistNames.length > 0 ? (
        <View style={local.coverArtists}>
          {artistNames.map((name) => (
            <Text key={name} style={local.coverArtistName}>
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

function ArtworkPage({
  artwork,
  imageUrl,
  galleryName,
}: {
  artwork: ArtworkListItem;
  imageUrl: string | null;
  galleryName: string;
}) {
  const size = formatSize(artwork);
  const dims = size ? size.replace(/×/g, "x") : "";
  const price = formatPrice(artwork.price_eur);
  return (
    <Page size={[PAGE.width, PAGE.height]} style={local.page}>
      <Wordmark galleryName={galleryName} />
      <View style={local.artworkImageBox}>
        {imageUrl ? <Image src={imageUrl} style={local.artworkImage} /> : null}
      </View>
      <View style={local.artworkMeta}>
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
    </Page>
  );
}

export function EditorialPDF({ dossier, artworks, galleryName, imageUrlFor }: CommonProps) {
  const showTitle = dossier.body_blocks.show_title?.trim() || dossier.title;
  const intros = dossier.body_blocks.artist_intros ?? {};

  // Unique artists in display order (preserves dossier image_layout sequence).
  const seen = new Set<string>();
  const artists: Array<{ id: string; name: string }> = [];
  for (const a of artworks) {
    if (a.artist && !seen.has(a.artist.id)) {
      seen.add(a.artist.id);
      artists.push({ id: a.artist.id, name: a.artist.name });
    }
  }

  return (
    <Document title={dossier.title}>
      <CoverPage
        showTitle={showTitle}
        artistNames={artists.map((a) => a.name)}
        galleryName={galleryName}
      />
      {artists.map((artist) => {
        const intro = intros[artist.id];
        const photoUrl = imageUrlFor(intro?.photo_path);
        const artistArtworks = artworks.filter((a) => a.artist?.id === artist.id);
        return (
          <View key={artist.id}>
            <ArtistIntroPage
              artistName={artist.name}
              intro={intro}
              photoUrl={photoUrl}
              galleryName={galleryName}
            />
            {artistArtworks.map((aw) => (
              <ArtworkPage
                key={aw.id}
                artwork={aw}
                imageUrl={imageUrlFor(aw.primary_image?.storage_path)}
                galleryName={galleryName}
              />
            ))}
          </View>
        );
      })}
      {/* Artworks with no artist still render so nothing silently disappears. */}
      {artworks
        .filter((a) => !a.artist)
        .map((aw) => (
          <ArtworkPage
            key={aw.id}
            artwork={aw}
            imageUrl={imageUrlFor(aw.primary_image?.storage_path)}
            galleryName={galleryName}
          />
        ))}
    </Document>
  );
}
