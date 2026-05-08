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
};

export type DossierBodyBlocks = {
  intro?: string;
  extra?: string;
  artwork_descriptions?: Record<string, string>;
  collector_pitch?: string;
  // Editorial-only fields. Stored in JSON so we don't need a schema change;
  // when Lovable adds dedicated columns later the shape can move out.
  show_title?: string;
  artist_intros?: Record<string, DossierArtistIntro>;
};
export type Dossier = Omit<T["dossiers"]["Row"], "body_blocks" | "image_layout"> & {
  body_blocks: DossierBodyBlocks;
  image_layout: string[];
};

export type Invoice = T["invoices"]["Row"];
export type InvoiceLine = T["invoice_lines"]["Row"];
export type Deal = T["deals"]["Row"];

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
