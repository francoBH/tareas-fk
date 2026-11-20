-- PLANTILLAS DE TAREAS (19-nov-2026): una tarea que se repite a mano («Pago a diseñadores» 3 veces,
-- los «Agendar con…», «Revisar y subir reels») se guarda una vez como plantilla y la próxima nace
-- con su descripción, subtareas, tipo, prioridad, responsables y tiempo ya puestos.
create table if not exists public.plantillas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 1 and 120),
  tipo        text check (tipo is null or tipo in ('pro','per')),
  prio        text,
  resp        text[] not null default '{}',
  minutos     int,
  descripcion text not null default '',
  subtareas   jsonb not null default '[]'::jsonb,
  creado_por  text,
  creado      timestamptz not null default now()
);
alter table public.plantillas enable row level security;
drop policy if exists plantillas_todo on public.plantillas;
create policy plantillas_todo on public.plantillas for all to authenticated using (public.mi_clave() is not null) with check (public.mi_clave() is not null);
revoke all on public.plantillas from anon;
alter publication supabase_realtime add table public.plantillas;
