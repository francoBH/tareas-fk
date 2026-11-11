-- Documentos además de imágenes: en los hilos y en la descripción de la tarea.
--   comentarios.archivos y tareas.adjuntos = lista de { ruta, nombre, tipo, peso }.
--   Las imágenes de un comentario siguen en comentarios.imagenes (lo de antes no cambia).
alter table public.comentarios add column if not exists archivos jsonb not null default '[]'::jsonb;
alter table public.tareas add column if not exists adjuntos jsonb not null default '[]'::jsonb;

-- Un comentario puede ser sólo un documento, sin texto ni imagen.
alter table public.comentarios drop constraint if exists comentarios_contenido;
alter table public.comentarios add constraint comentarios_contenido check (
  char_length(txt) <= 5000 and (char_length(txt) > 0 or coalesce(array_length(imagenes, 1), 0) > 0 or jsonb_array_length(archivos) > 0)
);

-- El cajón acepta documentos comunes, hasta 25 MB.
update storage.buckets set file_size_limit = 26214400, allowed_mime_types = array[
  'image/png','image/jpeg','image/gif','image/webp','image/heic','image/heif',
  'application/pdf','text/plain','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip','application/x-zip-compressed','video/mp4','video/quicktime','audio/mpeg','audio/mp4'
] where id = 'adjuntos';
