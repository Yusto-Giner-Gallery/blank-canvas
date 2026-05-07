
create or replace view public.artworks_with_attention
with (security_invoker = true)
as
select
  a.*,
  exists (
    select 1
      from public.card_artwork_mentions m
      join public.cards c on c.id = m.card_id
     where m.artwork_id = a.id
       and (
         'shipping'::public.card_label = any (c.labels)
         or (c.due_date is not null and c.due_date <= now() + interval '7 days')
       )
  ) as needs_attention
from public.artworks a;
