-- Imágenes en los comentarios (10 nov 2026).
alter table public.comentarios add column if not exists imagenes text[] not null default '{}';
alter table public.comentarios drop constraint if exists comentarios_txt_check;
alter table public.comentarios drop constraint if exists comentarios_contenido;
alter table public.comentarios add constraint comentarios_contenido
  check (char_length(txt) <= 5000 and (char_length(txt) > 0 or cardinality(imagenes) > 0));

-- Las imágenes viven en un cajón privado: solo las personas de la lista las ven.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('adjuntos', 'adjuntos', false, 10485760, array['image/png','image/jpeg','image/gif','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists adjuntos_leer on storage.objects;
create policy adjuntos_leer on storage.objects for select to authenticated
  using (bucket_id = 'adjuntos' and public.mi_clave() is not null);
drop policy if exists adjuntos_subir on storage.objects;
create policy adjuntos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'adjuntos' and public.mi_clave() is not null);
drop policy if exists adjuntos_borrar on storage.objects;
create policy adjuntos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'adjuntos' and owner = auth.uid());
