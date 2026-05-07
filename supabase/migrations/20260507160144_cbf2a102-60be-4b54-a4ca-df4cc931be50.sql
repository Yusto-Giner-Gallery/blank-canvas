
-- =========================================================================
-- ENUMS
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.artwork_status AS ENUM ('available', 'on_hold', 'sold', 'archived');
CREATE TYPE public.collection_kind AS ENUM ('exhibition', 'fair', 'viewing_room', 'other');
CREATE TYPE public.dossier_kind AS ENUM ('solo_show', 'group_show', 'special', 'art_fair', 'collector_offer');
CREATE TYPE public.contact_activity_kind AS ENUM ('artwork_shown', 'dossier_sent', 'reply', 'purchase');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'interested', 'offer_sent', 'negotiating', 'won', 'lost');
CREATE TYPE public.card_label AS ENUM ('red','orange','yellow','green','blue','purple','shipping');
CREATE TYPE public.activity_entity_type AS ENUM ('artwork','contact','invoice','deal','card');

-- =========================================================================
-- TIMESTAMP TRIGGER
-- =========================================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- =========================================================================
-- CORE TABLES
-- =========================================================================
CREATE TABLE public.galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,  -- = auth.users.id
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_gallery ON public.profiles(gallery_id);

-- =========================================================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.current_gallery_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gallery_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = _role)
$$;

-- =========================================================================
-- DOMAIN TABLES
-- =========================================================================
CREATE TABLE public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  nationality text,
  bio text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artists_gallery ON public.artists(gallery_id);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_gallery ON public.locations(gallery_id);

CREATE TABLE public.artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  internal_id text NOT NULL,
  title text NOT NULL,
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE RESTRICT,
  year int,
  medium text,
  width_cm numeric,
  height_cm numeric,
  depth_cm numeric,
  price_eur numeric,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status public.artwork_status NOT NULL DEFAULT 'available',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, internal_id)
);
CREATE INDEX idx_artworks_gallery ON public.artworks(gallery_id);
CREATE INDEX idx_artworks_artist ON public.artworks(artist_id);
CREATE INDEX idx_artworks_location ON public.artworks(location_id);

CREATE TABLE public.artwork_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_artwork_images_artwork ON public.artwork_images(artwork_id);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, name)
);

CREATE TABLE public.artwork_tags (
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (artwork_id, tag_id)
);

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind public.collection_kind NOT NULL DEFAULT 'other',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_collections_gallery ON public.collections(gallery_id);

CREATE TABLE public.collection_artworks (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, artwork_id)
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  interest text,
  notes text,
  newsletter_opt_in boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_gallery ON public.contacts(gallery_id);

CREATE TABLE public.contact_tags (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE public.contact_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  kind public.contact_activity_kind NOT NULL,
  ref_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_activity_contact ON public.contact_activity(contact_id);

CREATE TABLE public.dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  kind public.dossier_kind NOT NULL,
  title text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  body_blocks jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dossiers_gallery ON public.dossiers(gallery_id);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'EUR',
  stripe_payment_link text,
  notes text,
  issued_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_gallery ON public.invoices(gallery_id);

CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount_eur numeric NOT NULL DEFAULT 0,
  discount_eur numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE RESTRICT,
  artwork_id uuid REFERENCES public.artworks(id) ON DELETE SET NULL,
  title text NOT NULL,
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  value_eur numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deals_gallery ON public.deals(gallery_id);

CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boards_gallery ON public.boards(gallery_id);

CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lists_board ON public.lists(board_id);

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  labels public.card_label[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cards_list ON public.cards(list_id);

CREATE TABLE public.card_artwork_mentions (
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, artwork_id)
);

CREATE TABLE public.card_members (
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, profile_id)
);

CREATE TABLE public.card_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.card_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.card_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  name text NOT NULL,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  entity_type public.activity_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  field text,
  before jsonb,
  after jsonb,
  event_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_log_gallery ON public.activity_log(gallery_id);

-- =========================================================================
-- updated_at TRIGGERS
-- =========================================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'galleries','profiles','artists','locations','artworks','collections',
    'contacts','dossiers','invoices','deals','boards','lists','cards'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t);
  END LOOP;
END $$;

-- =========================================================================
-- AUDIT TRIGGER (log_change) — writes per-field diffs to activity_log
-- =========================================================================
CREATE OR REPLACE FUNCTION public.log_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k text;
  old_j jsonb := to_jsonb(OLD);
  new_j jsonb := to_jsonb(NEW);
  ent public.activity_entity_type := TG_ARGV[0]::public.activity_entity_type;
  gid uuid;
BEGIN
  -- Resolve gallery_id (cards have no gallery_id column → climb via list→board)
  IF TG_TABLE_NAME = 'cards' THEN
    SELECT b.gallery_id INTO gid
      FROM public.lists l JOIN public.boards b ON b.id = l.board_id
      WHERE l.id = NEW.list_id;
  ELSE
    gid := (new_j->>'gallery_id')::uuid;
  END IF;

  FOR k IN SELECT jsonb_object_keys(new_j) LOOP
    IF k IN ('updated_at','created_at') THEN CONTINUE; END IF;
    IF (old_j->k) IS DISTINCT FROM (new_j->k) THEN
      INSERT INTO public.activity_log(gallery_id, entity_type, entity_id, profile_id, field, before, after)
      VALUES (gid, ent, NEW.id, auth.uid(), k, old_j->k, new_j->k);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_artworks AFTER UPDATE ON public.artworks FOR EACH ROW EXECUTE FUNCTION public.log_change('artwork');
CREATE TRIGGER trg_log_contacts AFTER UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.log_change('contact');
CREATE TRIGGER trg_log_invoices AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.log_change('invoice');
CREATE TRIGGER trg_log_deals    AFTER UPDATE ON public.deals    FOR EACH ROW EXECUTE FUNCTION public.log_change('deal');
CREATE TRIGGER trg_log_cards    AFTER UPDATE ON public.cards    FOR EACH ROW EXECUTE FUNCTION public.log_change('card');

-- =========================================================================
-- artworks_with_attention VIEW
-- =========================================================================
CREATE OR REPLACE VIEW public.artworks_with_attention AS
SELECT a.*,
  EXISTS (
    SELECT 1 FROM public.card_artwork_mentions m
    JOIN public.cards c ON c.id = m.card_id
    WHERE m.artwork_id = a.id
      AND ('shipping' = ANY(c.labels)
           OR (c.due_date IS NOT NULL AND c.due_date <= now() + interval '7 days'))
  ) AS needs_attention
FROM public.artworks a;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================

-- Enable RLS on every table
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_artwork_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- galleries: members can read their own gallery; only admins update
CREATE POLICY galleries_select ON public.galleries FOR SELECT TO authenticated
  USING (id = public.current_gallery_id());
CREATE POLICY galleries_update ON public.galleries FOR UPDATE TO authenticated
  USING (id = public.current_gallery_id() AND public.has_role(auth.uid(),'admin'));

-- profiles: users see profiles in same gallery; admins manage
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (gallery_id = public.current_gallery_id());
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND gallery_id = public.current_gallery_id())
  WITH CHECK (public.has_role(auth.uid(),'admin') AND gallery_id = public.current_gallery_id());

-- Helper macro pattern: gallery-scoped tables
-- artists, locations, artworks, tags, collections, contacts, dossiers,
-- invoices, deals, boards, activity_log
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'artists','locations','artworks','tags','collections','contacts',
    'dossiers','invoices','deals','boards'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY %1$s_rw ON public.%1$s FOR ALL TO authenticated
      USING (gallery_id = public.current_gallery_id())
      WITH CHECK (gallery_id = public.current_gallery_id());
    $f$, t);
  END LOOP;
END $$;

-- activity_log: read-only for gallery members (writes happen via trigger as definer)
CREATE POLICY activity_log_select ON public.activity_log FOR SELECT TO authenticated
  USING (gallery_id = public.current_gallery_id());

-- Child tables — scoped via parent
CREATE POLICY artwork_images_rw ON public.artwork_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_id AND a.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_id AND a.gallery_id = public.current_gallery_id()));

CREATE POLICY artwork_tags_rw ON public.artwork_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_id AND a.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_id AND a.gallery_id = public.current_gallery_id()));

CREATE POLICY collection_artworks_rw ON public.collection_artworks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.gallery_id = public.current_gallery_id()));

CREATE POLICY contact_tags_rw ON public.contact_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.gallery_id = public.current_gallery_id()));

CREATE POLICY contact_activity_rw ON public.contact_activity FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND c.gallery_id = public.current_gallery_id()));

CREATE POLICY invoice_lines_rw ON public.invoice_lines FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.gallery_id = public.current_gallery_id()));

CREATE POLICY lists_rw ON public.lists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND b.gallery_id = public.current_gallery_id()));

CREATE POLICY cards_rw ON public.cards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lists l JOIN public.boards b ON b.id=l.board_id WHERE l.id = list_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lists l JOIN public.boards b ON b.id=l.board_id WHERE l.id = list_id AND b.gallery_id = public.current_gallery_id()));

CREATE POLICY card_mentions_rw ON public.card_artwork_mentions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()));

CREATE POLICY card_members_rw ON public.card_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()));

CREATE POLICY card_checklist_rw ON public.card_checklist FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()));

CREATE POLICY card_comments_rw ON public.card_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()));

CREATE POLICY card_attachments_rw ON public.card_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.lists l ON l.id=c.list_id JOIN public.boards b ON b.id=l.board_id WHERE c.id = card_id AND b.gallery_id = public.current_gallery_id()));

-- Anonymous insert into contacts (public signup form)
CREATE POLICY contacts_anon_insert ON public.contacts FOR INSERT TO anon
  WITH CHECK (gallery_id IS NOT NULL);

-- =========================================================================
-- REALTIME PUBLICATION (18 tables)
-- =========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.artworks,
  public.artwork_images,
  public.artwork_tags,
  public.collection_artworks,
  public.dossiers,
  public.contacts,
  public.contact_activity,
  public.invoices,
  public.invoice_lines,
  public.deals,
  public.boards,
  public.lists,
  public.cards,
  public.card_artwork_mentions,
  public.card_members,
  public.card_checklist,
  public.card_comments,
  public.card_attachments;
