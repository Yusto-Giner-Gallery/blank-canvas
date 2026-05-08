import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { baseStyles, formatPrice, formatSize, palette } from "./shared";
import type { ArtworkListItem } from "@/integrations/supabase/domain";

const local = StyleSheet.create({
  hero: {
    width: "100%",
    height: 320,
    objectFit: "contain",
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 24,
  },
  heroEmpty: {
    width: "100%",
    height: 320,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.hairline,
    marginBottom: 24,
  },
  artist: { fontSize: 12, color: palette.body, marginTop: 4, marginBottom: 18 },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 12,
    marginTop: 8,
  },
  cell: {
    width: "33.3333%",
    paddingRight: 8,
    marginBottom: 12,
  },
  cellLabel: {
    fontSize: 7,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  cellValue: { fontSize: 10, color: palette.ink },
  notesLabel: {
    fontSize: 7,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
  },
  notes: { fontSize: 10, lineHeight: 1.5, color: palette.body },
});

export type ArtworkSheetPDFProps = {
  artwork: ArtworkListItem & {
    notes?: string | null;
    artist_nationality?: string | null;
  };
  galleryName: string;
  imageUrlFor: (storage_path: string | null | undefined) => string | null;
};

export function ArtworkSheetPDF({
  artwork,
  galleryName,
  imageUrlFor,
}: ArtworkSheetPDFProps) {
  const heroUrl = imageUrlFor(artwork.primary_image?.storage_path);
  const size = formatSize(artwork);
  const price = formatPrice(artwork.price_eur);

  return (
    <Document title={`${artwork.title} — ${artwork.internal_id}`}>
      <Page size="A4" style={baseStyles.page}>
        <View style={baseStyles.header} fixed>
          <Text style={baseStyles.wordmark}>{galleryName}</Text>
          <Text style={baseStyles.kindLabel}>Artwork sheet</Text>
        </View>

        <Text style={baseStyles.title}>{artwork.title}</Text>
        {artwork.artist?.name ? (
          <Text style={local.artist}>{artwork.artist.name}</Text>
        ) : null}

        {heroUrl ? (
          <Image src={heroUrl} style={local.hero} />
        ) : (
          <View style={local.heroEmpty} />
        )}

        <View style={local.meta}>
          <View style={local.cell}>
            <Text style={local.cellLabel}>Inventory #</Text>
            <Text style={local.cellValue}>{artwork.internal_id}</Text>
          </View>
          {artwork.year != null ? (
            <View style={local.cell}>
              <Text style={local.cellLabel}>Year</Text>
              <Text style={local.cellValue}>{artwork.year}</Text>
            </View>
          ) : null}
          {artwork.medium ? (
            <View style={local.cell}>
              <Text style={local.cellLabel}>Medium</Text>
              <Text style={local.cellValue}>{artwork.medium}</Text>
            </View>
          ) : null}
          {size ? (
            <View style={local.cell}>
              <Text style={local.cellLabel}>Dimensions</Text>
              <Text style={local.cellValue}>{size}</Text>
            </View>
          ) : null}
          {artwork.location?.name ? (
            <View style={local.cell}>
              <Text style={local.cellLabel}>Location</Text>
              <Text style={local.cellValue}>{artwork.location.name}</Text>
            </View>
          ) : null}
          {price && !artwork.is_nfs ? (
            <View style={local.cell}>
              <Text style={local.cellLabel}>Price</Text>
              <Text style={local.cellValue}>{price}</Text>
            </View>
          ) : null}
          <View style={local.cell}>
            <Text style={local.cellLabel}>Status</Text>
            <Text style={local.cellValue}>
              {artwork.is_nfs
                ? `${artwork.status.replace("_", " ")} · NFS`
                : artwork.status.replace("_", " ")}
            </Text>
          </View>
          {artwork.artist_nationality ? (
            <View style={local.cell}>
              <Text style={local.cellLabel}>Nationality</Text>
              <Text style={local.cellValue}>{artwork.artist_nationality}</Text>
            </View>
          ) : null}
        </View>

        {artwork.notes ? (
          <View>
            <Text style={local.notesLabel}>Notes</Text>
            <Text style={local.notes}>{artwork.notes}</Text>
          </View>
        ) : null}

        <View style={baseStyles.footer} fixed>
          <Text>{galleryName}</Text>
          <Text>{artwork.internal_id}</Text>
        </View>
      </Page>
    </Document>
  );
}
