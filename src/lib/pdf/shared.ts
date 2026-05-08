import { Font, StyleSheet } from "@react-pdf/renderer";
import type {
  ArtworkListItem,
  Dossier,
} from "@/integrations/supabase/domain";

// Register the bundled Inter family so the rich-text toolbar's "Inter"
// choice actually applies in PDF exports. Helvetica / Times-Roman /
// Courier are built into @react-pdf and don't need registering. We
// guard with a flag because Font.register is idempotent-noisy when
// hot-reloaded.
declare global {
  interface Window {
    __ygm_pdf_fonts_registered__?: boolean;
  }
}
if (typeof window !== "undefined" && !window.__ygm_pdf_fonts_registered__) {
  window.__ygm_pdf_fonts_registered__ = true;
  Font.register({
    family: "Inter",
    fonts: [{ src: "/fonts/Inter-Bold.ttf", fontWeight: "bold" }],
  });
  // Recta — gallery wordmark only. Registered with three weights so PDF
  // headers and the editorial cover/interior wordmark render in the
  // brand typeface (CLAUDE.md §3).
  Font.register({
    family: "Recta",
    fonts: [
      { src: "/fonts/Recta-Regular.otf", fontWeight: 400 },
      { src: "/fonts/Recta-Medium.otf", fontWeight: 500 },
      { src: "/fonts/Recta-Bold.otf", fontWeight: 700 },
    ],
  });
}

export type TitlePathData = {
  d: string;
  width: number;
  cap_height: number;
};

export type CommonProps = {
  dossier: Dossier;
  artworks: ArtworkListItem[];
  galleryName: string;
  imageUrlFor: (storage_path: string | null | undefined) => string | null;
  // Outlined-stroke title path (editorial cover only). Extracted from
  // Inter-Bold via opentype.js so we can render the PARALLELS hollow type.
  // null/undefined → cover falls back to solid white text.
  titlePath?: TitlePathData | null;
};

export const palette = {
  bg: "#ffffff",
  ink: "#0a0a0a",
  body: "#262626",
  muted: "#737373",
  hairline: "#e5e5e5",
  // Editorial accent — pixel-sampled from the PARALLELS dossier cover band.
  // Approved as the 4th color exception in CLAUDE.md §3 (per-dossier accent,
  // user-overridable via body_blocks.accent_color).
  accent: "#EC6660",
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
  wordmark: {
    fontFamily: "Recta",
    fontWeight: 500,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
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
  editorial: "Editorial",
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
