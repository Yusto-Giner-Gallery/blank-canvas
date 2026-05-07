// Hand-written until Supabase backend exists on Lovable Cloud.
// Then replace with: supabase gen types typescript --project-id <ref> > this file.
// Source of truth for the schema is CLAUDE.md §6.
// Shape matches `supabase gen types` output so the typed client works.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Role = "admin" | "staff";
export type ArtworkStatus = "available" | "on_hold" | "sold" | "archived";

// --- Galleries ---
export type Gallery = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
type GalleryInsert = {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};
type GalleryUpdate = Partial<GalleryInsert>;

// --- Profiles ---
export type Profile = {
  id: string;
  gallery_id: string;
  role: Role;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
};
type ProfileInsert = {
  id: string;
  gallery_id: string;
  role: Role;
  full_name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
};
type ProfileUpdate = Partial<ProfileInsert>;

// --- Artists ---
export type Artist = {
  id: string;
  gallery_id: string;
  name: string;
  nationality: string | null;
  bio: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
type ArtistInsert = {
  id?: string;
  gallery_id: string;
  name: string;
  nationality?: string | null;
  bio?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ArtistUpdate = Partial<ArtistInsert>;

// --- Locations ---
export type Location = {
  id: string;
  gallery_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
type LocationInsert = {
  id?: string;
  gallery_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};
type LocationUpdate = Partial<LocationInsert>;

// --- Artworks ---
type ArtworkRow = {
  id: string;
  gallery_id: string;
  internal_id: string;
  title: string;
  artist_id: string;
  year: number | null;
  medium: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  price_eur: number | null;
  location_id: string | null;
  status: ArtworkStatus;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
// Computed by the artworks_with_attention view; defaults to false until
// the view exists on Lovable Cloud.
export type Artwork = ArtworkRow & { needs_attention?: boolean };
type ArtworkInsert = {
  id?: string;
  gallery_id: string;
  internal_id: string;
  title: string;
  artist_id: string;
  year?: number | null;
  medium?: string | null;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
  price_eur?: number | null;
  location_id?: string | null;
  status?: ArtworkStatus;
  notes?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ArtworkUpdate = Partial<ArtworkInsert>;

// --- Artwork images ---
export type ArtworkImage = {
  id: string;
  artwork_id: string;
  storage_path: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
};
type ArtworkImageInsert = {
  id?: string;
  artwork_id: string;
  storage_path: string;
  sort_order?: number;
  is_primary?: boolean;
  created_at?: string;
};
type ArtworkImageUpdate = Partial<ArtworkImageInsert>;

// --- Tags ---
export type Tag = {
  id: string;
  gallery_id: string;
  name: string;
  created_at: string;
};
type TagInsert = {
  id?: string;
  gallery_id: string;
  name: string;
  created_at?: string;
};
type TagUpdate = Partial<TagInsert>;

export type ArtworkTag = {
  artwork_id: string;
  tag_id: string;
};
type ArtworkTagInsert = ArtworkTag;
type ArtworkTagUpdate = Partial<ArtworkTag>;

// --- Collections ---
export type CollectionKind = "exhibition" | "fair" | "viewing_room" | "other";

export type Collection = {
  id: string;
  gallery_id: string;
  name: string;
  kind: CollectionKind;
  created_at: string;
  updated_at: string;
};
type CollectionInsert = {
  id?: string;
  gallery_id: string;
  name: string;
  kind?: CollectionKind;
  created_at?: string;
  updated_at?: string;
};
type CollectionUpdate = Partial<CollectionInsert>;

export type CollectionArtwork = {
  collection_id: string;
  artwork_id: string;
  sort_order: number;
};
type CollectionArtworkInsert = CollectionArtwork;
type CollectionArtworkUpdate = Partial<CollectionArtwork>;

// --- Dossiers ---
export type DossierKind =
  | "solo_show"
  | "group_show"
  | "special"
  | "art_fair"
  | "collector_offer";

export type DossierBodyBlocks = {
  intro?: string;
  extra?: string;
  artwork_descriptions?: Record<string, string>;
  collector_pitch?: string;
};

export type Dossier = {
  id: string;
  gallery_id: string;
  kind: DossierKind;
  title: string;
  contact_id: string | null;
  body_blocks: DossierBodyBlocks;
  image_layout: string[]; // ordered artwork_ids
  created_at: string;
  updated_at: string;
};
type DossierInsert = {
  id?: string;
  gallery_id: string;
  kind: DossierKind;
  title: string;
  contact_id?: string | null;
  body_blocks?: DossierBodyBlocks;
  image_layout?: string[];
  created_at?: string;
  updated_at?: string;
};
type DossierUpdate = Partial<DossierInsert>;

// --- Contacts ---
export type Contact = {
  id: string;
  gallery_id: string;
  email: string;
  full_name: string;
  interest: string | null;
  notes: string | null;
  newsletter_opt_in: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
type ContactInsert = {
  id?: string;
  gallery_id: string;
  email: string;
  full_name: string;
  interest?: string | null;
  notes?: string | null;
  newsletter_opt_in?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ContactUpdate = Partial<ContactInsert>;

export type ContactTag = {
  contact_id: string;
  tag_id: string;
};
type ContactTagInsert = ContactTag;
type ContactTagUpdate = Partial<ContactTag>;

export type ContactActivityKind =
  | "artwork_shown"
  | "dossier_sent"
  | "reply"
  | "purchase";

export type ContactActivity = {
  id: string;
  contact_id: string;
  kind: ContactActivityKind;
  ref_id: string | null;
  note: string | null;
  created_at: string;
};
type ContactActivityInsert = {
  id?: string;
  contact_id: string;
  kind: ContactActivityKind;
  ref_id?: string | null;
  note?: string | null;
  created_at?: string;
};
type ContactActivityUpdate = Partial<ContactActivityInsert>;

// --- Invoices ---
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export type Invoice = {
  id: string;
  gallery_id: string;
  contact_id: string;
  status: InvoiceStatus;
  currency: "EUR";
  stripe_payment_link: string | null;
  notes: string | null;
  issued_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
type InvoiceInsert = {
  id?: string;
  gallery_id: string;
  contact_id: string;
  status?: InvoiceStatus;
  currency?: "EUR";
  stripe_payment_link?: string | null;
  notes?: string | null;
  issued_at?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};
type InvoiceUpdate = Partial<InvoiceInsert>;

export type InvoiceLine = {
  id: string;
  invoice_id: string;
  artwork_id: string | null;
  description: string;
  amount_eur: number;
  discount_eur: number;
  sort_order: number;
};
type InvoiceLineInsert = {
  id?: string;
  invoice_id: string;
  artwork_id?: string | null;
  description: string;
  amount_eur: number;
  discount_eur?: number;
  sort_order?: number;
};
type InvoiceLineUpdate = Partial<InvoiceLineInsert>;

// --- Deals (sales pipeline) ---
export type DealStage =
  | "lead"
  | "interested"
  | "offer_sent"
  | "negotiating"
  | "won"
  | "lost";

export type Deal = {
  id: string;
  gallery_id: string;
  contact_id: string;
  artwork_id: string | null;
  title: string;
  stage: DealStage;
  value_eur: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type DealInsert = {
  id?: string;
  gallery_id: string;
  contact_id: string;
  artwork_id?: string | null;
  title: string;
  stage?: DealStage;
  value_eur?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};
type DealUpdate = Partial<DealInsert>;

// --- Kanban (boards/lists/cards) ---
export type CardLabel =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "shipping";

export type Board = {
  id: string;
  gallery_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};
type BoardInsert = {
  id?: string;
  gallery_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};
type BoardUpdate = Partial<BoardInsert>;

export type List = {
  id: string;
  board_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type ListInsert = {
  id?: string;
  board_id: string;
  name: string;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};
type ListUpdate = Partial<ListInsert>;

export type Card = {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  labels: CardLabel[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type CardInsert = {
  id?: string;
  list_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  labels?: CardLabel[];
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};
type CardUpdate = Partial<CardInsert>;

export type CardArtworkMention = {
  card_id: string;
  artwork_id: string;
};
type CardArtworkMentionInsert = CardArtworkMention;
type CardArtworkMentionUpdate = Partial<CardArtworkMention>;

export type CardMember = {
  card_id: string;
  profile_id: string;
};
type CardMemberInsert = CardMember;
type CardMemberUpdate = Partial<CardMember>;

export type CardChecklistItem = {
  id: string;
  card_id: string;
  text: string;
  done: boolean;
  sort_order: number;
  created_at: string;
};
type CardChecklistItemInsert = {
  id?: string;
  card_id: string;
  text: string;
  done?: boolean;
  sort_order?: number;
  created_at?: string;
};
type CardChecklistItemUpdate = Partial<CardChecklistItemInsert>;

export type CardComment = {
  id: string;
  card_id: string;
  profile_id: string;
  body: string;
  created_at: string;
};
type CardCommentInsert = {
  id?: string;
  card_id: string;
  profile_id: string;
  body: string;
  created_at?: string;
};
type CardCommentUpdate = Partial<CardCommentInsert>;

export type CardAttachment = {
  id: string;
  card_id: string;
  storage_path: string;
  name: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};
type CardAttachmentInsert = {
  id?: string;
  card_id: string;
  storage_path: string;
  name: string;
  size_bytes?: number | null;
  uploaded_by?: string | null;
  created_at?: string;
};
type CardAttachmentUpdate = Partial<CardAttachmentInsert>;

// --- Activity log (per CLAUDE.md §6) ---
//
// Field-level audit trail. Rows are written by the `log_change()` Postgres
// trigger on Lovable; the frontend only reads. Either `field` (with
// before/after) or `event_type` is set per row.
export type ActivityEntityType =
  | "artwork"
  | "contact"
  | "invoice"
  | "deal"
  | "card";

export type ActivityLog = {
  id: string;
  gallery_id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  profile_id: string | null;
  field: string | null;
  before: Json | null;
  after: Json | null;
  event_type: string | null;
  created_at: string;
};
type ActivityLogInsert = {
  id?: string;
  gallery_id: string;
  entity_type: ActivityEntityType;
  entity_id: string;
  profile_id?: string | null;
  field?: string | null;
  before?: Json | null;
  after?: Json | null;
  event_type?: string | null;
  created_at?: string;
};
type ActivityLogUpdate = Partial<ActivityLogInsert>;

export type Database = {
  public: {
    Tables: {
      galleries: {
        Row: Gallery;
        Insert: GalleryInsert;
        Update: GalleryUpdate;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      artists: {
        Row: Artist;
        Insert: ArtistInsert;
        Update: ArtistUpdate;
        Relationships: [];
      };
      locations: {
        Row: Location;
        Insert: LocationInsert;
        Update: LocationUpdate;
        Relationships: [];
      };
      artworks: {
        Row: ArtworkRow;
        Insert: ArtworkInsert;
        Update: ArtworkUpdate;
        Relationships: [];
      };
      artwork_images: {
        Row: ArtworkImage;
        Insert: ArtworkImageInsert;
        Update: ArtworkImageUpdate;
        Relationships: [];
      };
      tags: {
        Row: Tag;
        Insert: TagInsert;
        Update: TagUpdate;
        Relationships: [];
      };
      artwork_tags: {
        Row: ArtworkTag;
        Insert: ArtworkTagInsert;
        Update: ArtworkTagUpdate;
        Relationships: [];
      };
      collections: {
        Row: Collection;
        Insert: CollectionInsert;
        Update: CollectionUpdate;
        Relationships: [];
      };
      collection_artworks: {
        Row: CollectionArtwork;
        Insert: CollectionArtworkInsert;
        Update: CollectionArtworkUpdate;
        Relationships: [];
      };
      dossiers: {
        Row: Dossier;
        Insert: DossierInsert;
        Update: DossierUpdate;
        Relationships: [];
      };
      contacts: {
        Row: Contact;
        Insert: ContactInsert;
        Update: ContactUpdate;
        Relationships: [];
      };
      contact_tags: {
        Row: ContactTag;
        Insert: ContactTagInsert;
        Update: ContactTagUpdate;
        Relationships: [];
      };
      contact_activity: {
        Row: ContactActivity;
        Insert: ContactActivityInsert;
        Update: ContactActivityUpdate;
        Relationships: [];
      };
      invoices: {
        Row: Invoice;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
        Relationships: [];
      };
      invoice_lines: {
        Row: InvoiceLine;
        Insert: InvoiceLineInsert;
        Update: InvoiceLineUpdate;
        Relationships: [];
      };
      deals: {
        Row: Deal;
        Insert: DealInsert;
        Update: DealUpdate;
        Relationships: [];
      };
      boards: {
        Row: Board;
        Insert: BoardInsert;
        Update: BoardUpdate;
        Relationships: [];
      };
      lists: {
        Row: List;
        Insert: ListInsert;
        Update: ListUpdate;
        Relationships: [];
      };
      cards: {
        Row: Card;
        Insert: CardInsert;
        Update: CardUpdate;
        Relationships: [];
      };
      card_artwork_mentions: {
        Row: CardArtworkMention;
        Insert: CardArtworkMentionInsert;
        Update: CardArtworkMentionUpdate;
        Relationships: [];
      };
      card_members: {
        Row: CardMember;
        Insert: CardMemberInsert;
        Update: CardMemberUpdate;
        Relationships: [];
      };
      card_checklist: {
        Row: CardChecklistItem;
        Insert: CardChecklistItemInsert;
        Update: CardChecklistItemUpdate;
        Relationships: [];
      };
      card_comments: {
        Row: CardComment;
        Insert: CardCommentInsert;
        Update: CardCommentUpdate;
        Relationships: [];
      };
      card_attachments: {
        Row: CardAttachment;
        Insert: CardAttachmentInsert;
        Update: CardAttachmentUpdate;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityLog;
        Insert: ActivityLogInsert;
        Update: ActivityLogUpdate;
        Relationships: [];
      };
    };
    Views: {
      artworks_with_attention: {
        Row: ArtworkRow & { needs_attention: boolean };
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: {
      role: Role;
      artwork_status: ArtworkStatus;
      collection_kind: CollectionKind;
      dossier_kind: DossierKind;
      contact_activity_kind: ContactActivityKind;
      invoice_status: InvoiceStatus;
      deal_stage: DealStage;
      card_label: CardLabel;
      activity_entity_type: ActivityEntityType;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type ArtworkListItem = Artwork & {
  artist: Pick<Artist, "id" | "name"> | null;
  location: Pick<Location, "id" | "name"> | null;
  primary_image: Pick<ArtworkImage, "storage_path"> | null;
};
