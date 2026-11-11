-- Tareas recurrentes, como en Blue OS: una recurrente NO se vuelve a crear. Al completarla,
-- la MISMA tarea pasa a su próxima fecha y vuelve a «Sin iniciar» (conserva hilo e historial).
-- Cada vuelta completada queda anotada en «vueltas», para que el Resumen la cuente.
alter table public.tareas add column if not exists recurrencia jsonb;

create table if not exists public.vueltas (
  id         uuid primary key default gen_random_uuid(),
  tarea_id   uuid not null references public.tareas(id) on delete cascade,
  vencia     date,                     -- la fecha que tenía esa vuelta
  completada timestamptz not null default now(),
  por        text,                     -- quién la marcó
  resp       text[] not null default '{}',
  iniciada   timestamptz
);
create index if not exists vueltas_tarea_idx on public.vueltas (tarea_id);
alter table public.vueltas enable row level security;
drop policy if exists vueltas_todo on public.vueltas;
create policy vueltas_todo on public.vueltas for all to authenticated
  using (public.mi_clave() is not null) with check (public.mi_clave() is not null);
revoke all on public.vueltas from anon;
alter publication supabase_realtime add table public.vueltas;
