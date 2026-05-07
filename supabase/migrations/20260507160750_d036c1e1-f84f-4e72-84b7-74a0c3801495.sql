
drop policy if exists "artwork_images_public_read" on storage.objects;

create policy "artwork_images_auth_list"
on storage.objects for select
to authenticated
using (bucket_id = 'artwork-images');
