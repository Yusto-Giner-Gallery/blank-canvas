do $$
declare
  t text;
  tables text[] := array[
    'artworks','artwork_images','artwork_tags','collections','collection_artworks',
    'dossiers','contacts','contact_activity','contact_tags','tags',
    'invoices','invoice_lines','deals',
    'boards','lists','cards','card_artwork_mentions','card_members',
    'card_checklist','card_comments','card_attachments','activity_log','locations','artists'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end$$;