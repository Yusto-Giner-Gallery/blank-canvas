import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { KIND_LABEL, baseStyles, formatSize, palette, type CommonProps } from "./shared";

const local = StyleSheet.create({
  artists: { fontSize: 11, color: palette.body, marginTop: 2, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  tile: { width: "33.333%", paddingHorizontal: 4, marginBottom: 14 },
  image: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    backgroundColor: palette.hairline,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  caption: { fontSize: 8, color: palette.muted, marginTop: 4, lineHeight: 1.3 },
  artist: { fontSize: 9, fontWeight: 700, marginTop: 4 },
  description: { fontSize: 8, color: palette.body, marginTop: 3, lineHeight: 1.4 },
});

export function GroupShowPDF({ dossier, artworks, galleryName, imageUrlFor }: CommonProps) {
  const artistNames = Array.from(
    new Set(artworks.map((a) => a.artist?.name).filter((n): n is string => !!n)),
  );
  return (
    <Document title={dossier.title}>
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>{KIND_LABEL.group_show}</Text>
        </View>

        <Text style={baseStyles.title}>{dossier.title}</Text>
        {artistNames.length > 0 ? (
          <Text style={local.artists}>{artistNames.join(" · ")}</Text>
        ) : null}

        {dossier.body_blocks.intro ? (
          <Text style={[baseStyles.body, { marginBottom: 14 }]}>
            {dossier.body_blocks.intro}
          </Text>
        ) : null}

        <View style={local.grid}>
          {artworks.map((a) => {
            const url = imageUrlFor(a.primary_image?.storage_path);
            const desc = dossier.body_blocks.artwork_descriptions?.[a.id];
            return (
              <View key={a.id} style={local.tile} wrap={false}>
                {url ? <Image src={url} style={local.image} /> : <View style={local.image} />}
                <Text style={local.artist}>{a.artist?.name ?? "—"}</Text>
                <Text style={local.caption}>
                  {a.title}
                  {a.year ? `, ${a.year}` : ""}
                </Text>
                <Text style={local.caption}>{formatSize(a)}</Text>
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
