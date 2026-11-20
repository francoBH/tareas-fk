-- TAREAS DE REUNIONES (como la «Daily por aprobar» de Blue OS): de las notas de una reunión salen
-- tareas PROPUESTAS; nada llega al tablero hasta que alguien la aprueba (con su texto, responsable y fecha).
create table if not exists public.propuestas (
  id         uuid primary key default gen_random_uuid(),
  reunion    text not null,
  reunion_dia date,
  txt        text not null check (char_length(txt) between 1 and 300),
  resp       text,
  fecha      date,
  tipo       text not null default 'pro' check (tipo in ('pro', 'per')),
  prio       text check (prio in ('urgente', 'alta', 'media', 'baja')),
  estado     text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'descartada')),
  tarea_id   uuid references public.tareas(id) on delete set null,
  creado_por text,
  resuelto_por text,
  creado     timestamptz not null default now()
);
create index if not exists propuestas_estado_idx on public.propuestas (estado, creado);
alter table public.propuestas enable row level security;
drop policy if exists propuestas_todo on public.propuestas;
create policy propuestas_todo on public.propuestas for all to authenticated
  using (public.mi_clave() is not null) with check (public.mi_clave() is not null);
revoke all on public.propuestas from anon;
alter publication supabase_realtime add table public.propuestas;
