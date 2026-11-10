-- La bandeja de entrada: qué comentarios ya leyó cada persona.
-- Una fila = «esta persona ya leyó este comentario». Borrarla = «marcar como no leída».
create table if not exists public.lecturas (
  persona       text not null,
  comentario_id uuid not null references public.comentarios(id) on delete cascade,
  leido         timestamptz not null default now(),
  primary key (persona, comentario_id)
);
alter table public.lecturas enable row level security;
drop policy if exists lecturas_mias on public.lecturas;
create policy lecturas_mias on public.lecturas for all to authenticated
  using (persona = public.mi_clave()) with check (persona = public.mi_clave());
revoke all on public.lecturas from anon;
alter publication supabase_realtime add table public.lecturas;
