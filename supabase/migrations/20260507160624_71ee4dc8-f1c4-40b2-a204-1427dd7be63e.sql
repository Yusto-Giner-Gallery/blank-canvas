
-- Buckets
insert into storage.buckets (id, name, public)
values
  ('artwork-images', 'artwork-images', true),
  ('card-attachments', 'card-attachments', false),
  ('dossier-exports', 'dossier-exports', false)
on conflict (id) do nothing;

-- ============ artwork-images (public read, gallery-scoped write) ============
create policy "artwork_images_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'artwork-images');

create policy "artwork_images_auth_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'artwork-images'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "artwork_images_auth_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'artwork-images'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "artwork_images_auth_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'artwork-images'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

-- ============ card-attachments (private, gallery-scoped) ============
create policy "card_attachments_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "card_attachments_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "card_attachments_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "card_attachments_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'card-attachments'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

-- ============ dossier-exports (private, gallery-scoped) ============
create policy "dossier_exports_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'dossier-exports'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "dossier_exports_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'dossier-exports'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "dossier_exports_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'dossier-exports'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);

create policy "dossier_exports_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'dossier-exports'
  and (storage.foldername(name))[1] = public.current_gallery_id()::text
);
