import { StyleSheet } from "@react-pdf/renderer";
import type {
  ArtworkListItem,
  Dossier,
} from "@/integrations/supabase/domain";

export type CommonProps = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  imageUrlFor: (storage_path: string | null | undefined) => string | null;
};

export const palette = {
  bg: "#ffffff",
  ink: "#0a0a0a",
  body: "#262626",
  muted: "#737373",
  hairline: "#e5e5e5",
};

export const baseStyles = StyleSheet.create({
  page: {
    backgroundColor: palette.bg,
    color: palette.ink,
    fontFamily: "Helvetica",
    padding: 40,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: palette.ink,
    paddingBottom: 8,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  wordmark: { fontSize: 9, letterSpacing: 1, textTransform: "uppercase" },
  kindLabel: {
    fontSize: 8,
    color: palette.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 24, marginTop: 18, marginBottom: 4, fontWeight: 700 },
  body: { fontSize: 10, lineHeight: 1.5, color: palette.body },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: 6,
    fontSize: 8,
    color: palette.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export const KIND_LABEL = {
  solo_show: "Solo show",
  group_show: "Group show",
  special: "Special",
  art_fair: "Art fair",
  collector_offer: "Collector offer",
} as const;

export function formatSize(a: ArtworkListItem) {
  const parts = [a.width_cm, a.height_cm, a.depth_cm].filter(
    (n): n is number => typeof n === "number",
  );
  return parts.length ? `${parts.join(" × ")} cm` : "";
}

export function formatPrice(eur: number | null | undefined) {
  if (eur == null) return "";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(eur);
}
