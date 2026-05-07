import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  KIND_LABEL,
  baseStyles,
  formatPrice,
  formatSize,
  palette,
  type CommonProps,
} from "./shared";

// One artwork per page — long-form per-work pitch + price. Reads like a
// personalised lookbook.
const local = StyleSheet.create({
  introPage: { paddingTop: 80 },
  introTitle: { fontSize: 28, fontWeight: 700, marginBottom: 14 },
  introBody: { fontSize: 11, lineHeight: 1.6, color: palette.body },
  workImage: {
    width: "100%",
    height: 400,
    objectFit: "contain",
    backgroundColor: "#fafafa",
    marginBottom: 14,
  },
  workTitle: { fontSize: 18, fontWeight: 700 },
  workArtist: { fontSize: 12, color: palette.body, marginTop: 2 },
  workMeta: { fontSize: 10, color: palette.muted, marginTop: 6 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 8,
  },
  priceLabel: { fontSize: 9, color: palette.muted, letterSpacing: 1 },
  price: { fontSize: 16, fontWeight: 700 },
  description: {
    fontSize: 10,
    color: palette.body,
    lineHeight: 1.5,
    marginTop: 14,
  },
});

export function CollectorOfferPDF({
  dossier,
  artworks,
  galleryName,
  imageUrlFor,
}: CommonProps) {
  return (
    <Document title={dossier.title}>
      <Page size="A4" style={[baseStyles.page, local.introPage]}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>{KIND_LABEL.collector_offer}</Text>
        </View>

        <Text style={local.introTitle}>{dossier.title}</Text>
        {dossier.body_blocks.intro ? (
          <Text style={local.introBody}>{dossier.body_blocks.intro}</Text>
        ) : (
          <Text style={local.introBody}>
            A personal selection from {galleryName}.
          </Text>
        )}

        <View style={baseStyles.footer} fixed>
          <Text>{galleryName}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>

      {artworks.map((a) => {
        const url = imageUrlFor(a.primary_image?.storage_path);
        const desc = dossier.body_blocks.artwork_descriptions?.[a.id];
        return (
          <Page key={a.id} size="A4" style={baseStyles.page}>
            <View style={baseStyles.header} fixed>
              <Text style={baseStyles.wordmark}>{galleryName}</Text>
              <Text style={baseStyles.kindLabel}>{KIND_LABEL.collector_offer}</Text>
            </View>

            {url ? <Image src={url} style={local.workImage} /> : <View style={local.workImage} />}
            <Text style={local.workTitle}>{a.title}</Text>
            <Text style={local.workArtist}>{a.artist?.name ?? "—"}</Text>
            <Text style={local.workMeta}>
              {[a.medium, formatSize(a), a.year ? String(a.year) : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>

            {desc ? <Text style={local.description}>{desc}</Text> : null}

            <View style={local.priceRow}>
              <Text style={local.priceLabel}>PRICE</Text>
              <Text style={local.price}>
                {formatPrice(a.price_eur) || "On request"}
              </Text>
            </View>

            <View style={baseStyles.footer} fixed>
              <Text>{galleryName}</Text>
              <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
