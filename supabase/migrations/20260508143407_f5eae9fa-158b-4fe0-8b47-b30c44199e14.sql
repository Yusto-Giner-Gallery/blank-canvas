
-- Drop dependent view so we can add is_nfs to artworks
DROP VIEW IF EXISTS public.artworks_with_attention;

-- 1. is_nfs on artworks
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS is_nfs boolean NOT NULL DEFAULT false;

-- 2. New enums
DO $$ BEGIN
  CREATE TYPE public.loan_status AS ENUM ('active','returned','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.consignment_status AS ENUM ('active','returned','sold');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shipment_status AS ENUM ('prep','in_transit','delivered','returned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend activity_entity_type
DO $$ BEGIN ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'loan'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'consignment'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'shipment'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.activity_entity_type ADD VALUE IF NOT EXISTS 'document'; EXCEPTION WHEN others THEN NULL; END $$;

-- 3. loans
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL,
  artwork_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status public.loan_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS loans_one_active_per_artwork
  ON public.loans (artwork_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS loans_artwork_idx ON public.loans (artwork_id);
CREATE INDEX IF NOT EXISTS loans_gallery_idx ON public.loans (gallery_id);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS loans_rw ON public.loans;
CREATE POLICY loans_rw ON public.loans FOR ALL TO authenticated
  USING (gallery_id = public.current_gallery_id())
  WITH CHECK (gallery_id = public.current_gallery_id());
DROP TRIGGER IF EXISTS loans_touch ON public.loans;
CREATE TRIGGER loans_touch BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS loans_log ON public.loans;
CREATE TRIGGER loans_log AFTER UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.log_change('loan');

-- 4. consignments
CREATE TABLE IF NOT EXISTS public.consignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL,
  artwork_id uuid NOT NULL,
  partner_contact_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  split_pct numeric NOT NULL DEFAULT 50,
  status public.consignment_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS consignments_one_active_per_artwork
  ON public.consignments (artwork_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS consignments_artwork_idx ON public.consignments (artwork_id);
CREATE INDEX IF NOT EXISTS consignments_gallery_idx ON public.consignments (gallery_id);
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consignments_rw ON public.consignments;
CREATE POLICY consignments_rw ON public.consignments FOR ALL TO authenticated
  USING (gallery_id = public.current_gallery_id())
  WITH CHECK (gallery_id = public.current_gallery_id());
DROP TRIGGER IF EXISTS consignments_touch ON public.consignments;
CREATE TRIGGER consignments_touch BEFORE UPDATE ON public.consignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS consignments_log ON public.consignments;
CREATE TRIGGER consignments_log AFTER UPDATE ON public.consignments
  FOR EACH ROW EXECUTE FUNCTION public.log_change('consignment');

-- 5. shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL,
  artwork_id uuid NOT NULL,
  from_location_id uuid,
  to_contact_id uuid,
  to_address jsonb,
  carrier text,
  tracking_no text,
  status public.shipment_status NOT NULL DEFAULT 'prep',
  shipped_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shipments_destination_xor CHECK (
    (to_contact_id IS NOT NULL AND to_address IS NULL) OR
    (to_contact_id IS NULL AND to_address IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS shipments_artwork_idx ON public.shipments (artwork_id);
CREATE INDEX IF NOT EXISTS shipments_gallery_idx ON public.shipments (gallery_id);
CREATE INDEX IF NOT EXISTS shipments_status_idx ON public.shipments (status);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipments_rw ON public.shipments;
CREATE POLICY shipments_rw ON public.shipments FOR ALL TO authenticated
  USING (gallery_id = public.current_gallery_id())
  WITH CHECK (gallery_id = public.current_gallery_id());
DROP TRIGGER IF EXISTS shipments_touch ON public.shipments;
CREATE TRIGGER shipments_touch BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS shipments_log ON public.shipments;
CREATE TRIGGER shipments_log AFTER UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_change('shipment');

-- 6. artwork_documents
CREATE TABLE IF NOT EXISTS public.artwork_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL,
  artwork_id uuid NOT NULL,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text,
  byte_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS artwork_documents_artwork_idx ON public.artwork_documents (artwork_id);
CREATE INDEX IF NOT EXISTS artwork_documents_gallery_idx ON public.artwork_documents (gallery_id);
ALTER TABLE public.artwork_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS artwork_documents_rw ON public.artwork_documents;
CREATE POLICY artwork_documents_rw ON public.artwork_documents FOR ALL TO authenticated
  USING (gallery_id = public.current_gallery_id())
  WITH CHECK (gallery_id = public.current_gallery_id());
DROP TRIGGER IF EXISTS artwork_documents_log ON public.artwork_documents;
CREATE TRIGGER artwork_documents_log AFTER UPDATE ON public.artwork_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_change('document');

-- 7. artworks_with_attention view (recreated)
CREATE VIEW public.artworks_with_attention
WITH (security_invoker = true) AS
SELECT
  a.*,
  (
    EXISTS (
      SELECT 1 FROM public.card_artwork_mentions m
      JOIN public.cards c ON c.id = m.card_id
      WHERE m.artwork_id = a.id
        AND (
          'shipping'::public.card_label = ANY(c.labels)
          OR (c.due_date IS NOT NULL AND c.due_date <= now() + interval '7 days')
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE l.artwork_id = a.id
        AND (l.status = 'overdue'
             OR (l.status = 'active' AND l.end_date < current_date))
    )
    OR EXISTS (
      SELECT 1 FROM public.shipments s
      WHERE s.artwork_id = a.id AND s.status = 'in_transit'
    )
  ) AS needs_attention
FROM public.artworks a;

-- 8. Storage bucket: artwork-documents (private, 25 MB cap, MIME allowlist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'artwork-documents','artwork-documents', false, 26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/heic','image/tiff',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS artwork_documents_select ON storage.objects;
CREATE POLICY artwork_documents_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'artwork-documents'
    AND (storage.foldername(name))[1] = public.current_gallery_id()::text);

DROP POLICY IF EXISTS artwork_documents_insert ON storage.objects;
CREATE POLICY artwork_documents_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artwork-documents'
    AND (storage.foldername(name))[1] = public.current_gallery_id()::text);

DROP POLICY IF EXISTS artwork_documents_update ON storage.objects;
CREATE POLICY artwork_documents_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'artwork-documents'
    AND (storage.foldername(name))[1] = public.current_gallery_id()::text);

DROP POLICY IF EXISTS artwork_documents_delete ON storage.objects;
CREATE POLICY artwork_documents_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'artwork-documents'
    AND (storage.foldername(name))[1] = public.current_gallery_id()::text);

-- 9. Realtime publication
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['loans','consignments','shipments','artwork_documents']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- 10. Nightly cron: flip active loans → overdue
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.flip_overdue_loans()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.loans
     SET status = 'overdue'
   WHERE status = 'active' AND end_date < current_date;
$$;

DO $$ BEGIN
  PERFORM cron.unschedule('flip-overdue-loans-nightly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'flip-overdue-loans-nightly',
  '0 2 * * *',
  $$SELECT public.flip_overdue_loans();$$
);
