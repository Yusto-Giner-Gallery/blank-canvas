import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { KIND_LABEL, baseStyles, formatSize, palette, type CommonProps } from "./shared";

const local = StyleSheet.create({
  extraBox: {
    backgroundColor: "#fafafa",
    borderLeftWidth: 3,
    borderLeftColor: palette.ink,
    padding: 12,
    marginVertical: 14,
  },
  extraText: { fontSize: 10, lineHeight: 1.5, color: palette.body },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  tile: { width: "50%", paddingHorizontal: 6, marginBottom: 16 },
  image: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    backgroundColor: palette.hairline,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  tileTitle: { fontSize: 10, fontWeight: 700, marginTop: 6 },
  tileMeta: { fontSize: 9, color: palette.muted, marginTop: 1 },
  description: { fontSize: 9, color: palette.body, marginTop: 4, lineHeight: 1.4 },
});

export function SpecialPDF({ dossier, artworks, galleryName, imageUrlFor }: CommonProps) {
  return (
    <Document title={dossier.title}>
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>{KIND_LABEL.special}</Text>
        </View>

        <Text style={baseStyles.title}>{dossier.title}</Text>

        {dossier.body_blocks.intro ? (
          <Text style={[baseStyles.body, { marginBottom: 8 }]}>
            {dossier.body_blocks.intro}
          </Text>
        ) : null}

        {dossier.body_blocks.extra ? (
          <View style={local.extraBox}>
            <Text style={local.extraText}>{dossier.body_blocks.extra}</Text>
          </View>
        ) : null}

        <View style={local.grid}>
          {artworks.map((a) => {
            const url = imageUrlFor(a.primary_image?.storage_path);
            const desc = dossier.body_blocks.artwork_descriptions?.[a.id];
            return (
              <View key={a.id} style={local.tile} wrap={false}>
                {url ? <Image src={url} style={local.image} /> : <View style={local.image} />}
                <Text style={local.tileTitle}>{a.title}</Text>
                <Text style={local.tileMeta}>
                  {a.artist?.name ?? "—"}
                  {a.year ? `, ${a.year}` : ""}
                </Text>
                <Text style={local.tileMeta}>{formatSize(a)}</Text>
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
