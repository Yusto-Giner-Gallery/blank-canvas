import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  KIND_LABEL,
  baseStyles,
  formatPrice,
  formatSize,
  palette,
  type CommonProps,
} from "./shared";

const local = StyleSheet.create({
  boothHeader: {
    backgroundColor: palette.ink,
    color: "#ffffff",
    padding: 14,
    marginBottom: 16,
  },
  boothTitle: { fontSize: 22, fontWeight: 700, color: "#ffffff" },
  boothMeta: { fontSize: 9, color: "#d4d4d4", marginTop: 4, letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6 },
  tile: { width: "50%", paddingHorizontal: 6, marginBottom: 18 },
  image: {
    width: "100%",
    height: 220,
    objectFit: "cover",
    backgroundColor: palette.hairline,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  title: { fontSize: 11, fontWeight: 700, flex: 1, marginRight: 6 },
  price: { fontSize: 11, fontWeight: 700 },
  meta: { fontSize: 9, color: palette.muted, marginTop: 1 },
  description: { fontSize: 9, color: palette.body, marginTop: 4, lineHeight: 1.4 },
});

export function ArtFairPDF({ dossier, artworks, galleryName, imageUrlFor }: CommonProps) {
  return (
    <Document title={dossier.title}>
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>{KIND_LABEL.art_fair}</Text>
        </View>

        <View style={local.boothHeader}>
          <Text style={local.boothTitle}>{dossier.title}</Text>
          <Text style={local.boothMeta}>
            {galleryName.toUpperCase()} · BOOTH OFFER
          </Text>
        </View>

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
                <View style={local.titleRow}>
                  <Text style={local.title}>{a.title}</Text>
                  <Text style={local.price}>{formatPrice(a.price_eur) || "POR"}</Text>
                </View>
                <Text style={local.meta}>
                  {a.artist?.name ?? "—"}
                  {a.year ? `, ${a.year}` : ""}
                </Text>
                <Text style={local.meta}>
                  {[a.medium, formatSize(a)].filter(Boolean).join(" · ")}
                </Text>
                {desc ? <Text style={local.description}>{desc}</Text> : null}
              </View>
            );
          })}
        </View>

        <View style={baseStyles.footer} fixed>
          <Text>{galleryName} · Prices in EUR · POR = price on request</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
