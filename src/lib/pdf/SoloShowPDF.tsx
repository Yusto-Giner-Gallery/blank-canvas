import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { KIND_LABEL, baseStyles, formatSize, palette, type CommonProps } from "./shared";

const local = StyleSheet.create({
  hero: {
    width: "100%",
    height: 360,
    objectFit: "cover",
    backgroundColor: palette.hairline,
    marginBottom: 18,
  },
  artist: { fontSize: 13, color: palette.body, marginTop: 2, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  tile: { width: "50%", paddingHorizontal: 6, marginBottom: 16 },
  image: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    backgroundColor: palette.hairline,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  caption: { fontSize: 9, color: palette.muted, marginTop: 4 },
  description: { fontSize: 9, color: palette.body, marginTop: 4, lineHeight: 1.4 },
});

export function SoloShowPDF({ dossier, artworks, galleryName, imageUrlFor }: CommonProps) {
  const lead = artworks[0];
  const rest = artworks.slice(1);
  const heroUrl = lead ? imageUrlFor(lead.primary_image?.storage_path) : null;
  const artistName = lead?.artist?.name ?? "";

  return (
    <Document title={dossier.title}>
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>{KIND_LABEL.solo_show}</Text>
        </View>

        <Text style={baseStyles.title}>{dossier.title}</Text>
        {artistName ? <Text style={local.artist}>{artistName}</Text> : null}

        {heroUrl ? <Image src={heroUrl} style={local.hero} /> : null}

        {dossier.body_blocks.intro ? (
          <Text style={baseStyles.body}>{dossier.body_blocks.intro}</Text>
        ) : null}

        <View style={local.grid}>
          {rest.map((a) => {
            const url = imageUrlFor(a.primary_image?.storage_path);
            const desc = dossier.body_blocks.artwork_descriptions?.[a.id];
            return (
              <View key={a.id} style={local.tile} wrap={false}>
                {url ? <Image src={url} style={local.image} /> : <View style={local.image} />}
                <Text style={local.caption}>
                  {a.title}
                  {a.year ? `, ${a.year}` : ""}
                  {formatSize(a) ? ` · ${formatSize(a)}` : ""}
                </Text>
                {desc ? <Text style={local.description}>{desc}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={baseStyles.footer} fixed>
          <Text>{galleryName}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
