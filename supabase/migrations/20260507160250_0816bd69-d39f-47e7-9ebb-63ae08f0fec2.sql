
DROP VIEW IF EXISTS public.artworks_with_attention;
CREATE VIEW public.artworks_with_attention
WITH (security_invoker = true) AS
SELECT a.*,
  EXISTS (
    SELECT 1 FROM public.card_artwork_mentions m
    JOIN public.cards c ON c.id = m.card_id
    WHERE m.artwork_id = a.id
      AND ('shipping' = ANY(c.labels)
           OR (c.due_date IS NOT NULL AND c.due_date <= now() + interval '7 days'))
  ) AS needs_attention
FROM public.artworks a;
