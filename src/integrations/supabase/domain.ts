// Domain type aliases derived from the auto-generated Database type.
// The generated `types.ts` file is overwritten by Lovable Cloud after each
// migration, so we keep human-friendly aliases here.

import type { Database } from "./types";

type T = Database["public"]["Tables"];
type E = Database["public"]["Enums"];

export type Json = Database["public"]["Tables"]["activity_log"]["Row"]["before"];

// Enums
export type Role = E["app_role"];
export type ArtworkStatus = E["artwork_status"];
export type CollectionKind = E["collection_kind"];
export type DossierKind = E["dossier_kind"];
export type ContactActivityKind = E["contact_activity_kind"];
export type InvoiceStatus = E["invoice_status"];
export type DealStage = E["deal_stage"];
export type CardLabel = E["card_label"];
export type ActivityEntityType = E["activity_entity_type"];
export type LoanStatus = E["loan_status"];
export type ConsignmentStatus = E["consignment_status"];
export type ShipmentStatus = E["shipment_status"];

// Rows
export type Gallery = T["galleries"]["Row"];
export type Profile = T["profiles"]["Row"];
export type Artist = T["artists"]["Row"];
export type Location = T["locations"]["Row"];
export type Artwork = T["artworks"]["Row"] & { needs_attention?: boolean };
export type ArtworkImage = T["artwork_images"]["Row"];
export type Tag = T["tags"]["Row"];
export type ArtworkTag = T["artwork_tags"]["Row"];
export type Collection = T["collections"]["Row"];
export type CollectionArtwork = T["collection_artworks"]["Row"];
export type Contact = T["contacts"]["Row"];
export type ContactTag = T["contact_tags"]["Row"];
export type ContactActivity = T["contact_activity"]["Row"];

export type DossierArtistIntro = {
  bio_en?: string;
  bio_es?: string;
  instagram?: string;
  photo_path?: string;
  // Rich (HTML) variants kept in lockstep with the plain strings above. The
  // editor reads these when present and falls back to the plain field
  // otherwise; on save it writes BOTH so legacy consumers (AI text review,
  // email composer) don't lose access.
  bio_en_html?: string;
  bio_es_html?: string;
  // Editable column labels above each bio. Default "EN" / "ES" when
  // undefined. Empty string hides the label entirely (the user deletes it
  // by selecting + backspace).
  bio_en_label?: string;
  bio_es_label?: string;
};

export type PageLayoutVariant =
  | "image_right" // default — image right, meta block bottom-left
  | "image_left" // mirror — image left, meta block bottom-right
  | "full_image" // full-bleed image, meta as small footer
  | "detail_zoom" // cropped detail view, no meta
  | "pair_with"; // two artworks side-by-side on one page

export type EditorialPageLayout = {
  variant: PageLayoutVariant;
  pair_artwork_id?: string; // for pair_with
  detail_image_path?: string; // for detail_zoom (optional alt image)
  // detail_zoom focal point (0..1) + zoom scale (1..3) — lets the user pick
  // which detail to show and how close (3.2). Absent → centered, scale 1.
  detail_scale?: number;
  detail_x?: number;
  detail_y?: number;
};

export type DossierCustomPage = {
  id: string;
  image_path: string;
  caption?: string;
  // Sort key for display order. Lower = earlier. Custom pages are appended
  // after all artwork pages in ascending position order.
  position: number;
};

export type DossierBodyBlocks = {
  intro?: string;
  extra?: string;
  artwork_descriptions?: Record<string, string>;
  collector_pitch?: string;
  // Rich (HTML) siblings — written by the WYSIWYG editor's rich mode.
  // See DossierArtistIntro for the rationale.
  intro_html?: string;
  extra_html?: string;
  collector_pitch_html?: string;
  artwork_descriptions_html?: Record<string, string>;
  // Per-text-block position offsets in PDF points. Keyed by a stable slot
  // identifier (e.g. "intro.<artist_id>.bio_en"). Default {x:0, y:0}.
  // Drag-to-position in the editor preview persists into here; the PDF
  // template reads from the same map and applies the offsets on render
  // so preview + export never diverge.
  text_offsets?: Record<string, { x: number; y: number }>;
  // Optional diagonal watermark stamped over every page (DRAFT, RESERVED,
  // CONFIDENTIAL, etc.). Custom strings are accepted; sets to undefined
  // when cleared. Per-dossier — toggled in the editor.
  watermark?: string;
  // Editorial-only fields. Stored in JSON so we don't need a schema change;
  // when Lovable adds dedicated columns later the shape can move out.
  show_title?: string;
  // Rich (HTML) sibling for the cover title. When present the editor +
  // PDF render via parseHtmlToRuns so font-family / size / color picks
  // from the toolbar apply to the cover title. Falls back to the plain
  // `show_title` outlined-stroke render when undefined.
  show_title_html?: string;
  // Per-dossier disclaimer that follows the price line in every meta
  // block. Defaults to the historical
  // "TAXES and transport excluded / IVA y Transporte no incluido"
  // string when undefined; empty string hides it entirely.
  disclaimer?: string;
  // Per-dossier accent color (hex string, e.g. "#EC6660"). User-editable;
  // CLAUDE.md §3 4th approved color exception. Defaults to palette.accent.
  accent_color?: string;
  artist_intros?: Record<string, DossierArtistIntro>;
  // Per-artwork layout variant for the editorial template.
  page_layouts?: Record<string /* artwork_id */, EditorialPageLayout>;
  // Non-artwork image pages (installation shots, exhibition views, etc).
  custom_pages?: DossierCustomPage[];
};
export type Dossier = Omit<T["dossiers"]["Row"], "body_blocks" | "image_layout"> & {
  body_blocks: DossierBodyBlocks;
  image_layout: string[];
};

export type Invoice = T["invoices"]["Row"];
export type InvoiceLine = T["invoice_lines"]["Row"];
export type Deal = T["deals"]["Row"];

export type Loan = T["loans"]["Row"];
export type Consignment = T["consignments"]["Row"];
export type Shipment = T["shipments"]["Row"];
export type ArtworkDocument = T["artwork_documents"]["Row"];

export type ShipmentAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
};

export type Board = T["boards"]["Row"];
export type List = T["lists"]["Row"];
export type Card = T["cards"]["Row"];
export type CardArtworkMention = T["card_artwork_mentions"]["Row"];
export type CardMember = T["card_members"]["Row"];
export type CardChecklistItem = T["card_checklist"]["Row"];
export type CardComment = T["card_comments"]["Row"];
export type CardAttachment = T["card_attachments"]["Row"];
export type ActivityLog = T["activity_log"]["Row"];

export type ArtworkListItem = Artwork & {
  artist: Pick<Artist, "id" | "name"> | null;
  location: Pick<Location, "id" | "name"> | null;
  primary_image: Pick<ArtworkImage, "storage_path"> | null;
};
