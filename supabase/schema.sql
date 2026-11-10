-- Tareas Franco y Katherine — esquema completo.
-- Solo entran los correos de la tabla «personas». Todo lo demás está cerrado por RLS.

create table if not exists public.personas (
  email     text primary key,
  clave     text not null unique check (clave ~ '^[A-Z]{1,3}$'),
  nombre    text not null,
  iniciales text not null,
  color     text not null default '#3560FF',
  rol       text
);

create table if not exists public.tareas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 1 and 200),
  tipo        text not null check (tipo in ('pro', 'per')),
  estado      text not null default 'sin' check (estado in ('idea', 'sin', 'prog', 'rev', 'corr', 'comp')),
  prio        text check (prio in ('urgente', 'alta', 'media', 'baja')),
  resp        text[] not null default '{}',
  fecha       date,
  descripcion text not null default '',
  subtareas   jsonb not null default '[]'::jsonb,
  seguidores  text[] not null default '{}',
  creado_por  text,
  creada      timestamptz not null default now(),
  actualizada timestamptz not null default now()
);

create table if not exists public.comentarios (
  id       uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  padre_id uuid references public.comentarios(id) on delete cascade,
  autor    text not null,
  txt      text not null check (char_length(txt) between 1 and 5000),
  editado  boolean not null default false,
  creado   timestamptz not null default now()
);
create index if not exists comentarios_tarea_idx on public.comentarios (tarea_id);

-- Quién soy: la clave de la persona con el correo de la sesión (null si no está en la lista).
create or replace function public.mi_clave() returns text
language sql stable security definer set search_path = public as $$
  select clave from public.personas where lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;
revoke all on function public.mi_clave() from public, anon;
grant execute on function public.mi_clave() to authenticated;

create or replace function public.tocar_actualizada() returns trigger language plpgsql as $$
begin new.actualizada := now(); return new; end $$;
drop trigger if exists tareas_actualizada on public.tareas;
create trigger tareas_actualizada before update on public.tareas for each row execute function public.tocar_actualizada();

alter table public.personas enable row level security;
alter table public.tareas enable row level security;
alter table public.comentarios enable row level security;

drop policy if exists personas_leer on public.personas;
create policy personas_leer on public.personas for select to authenticated using (public.mi_clave() is not null);

drop policy if exists tareas_todo on public.tareas;
create policy tareas_todo on public.tareas for all to authenticated
  using (public.mi_clave() is not null) with check (public.mi_clave() is not null);

drop policy if exists comentarios_leer on public.comentarios;
create policy comentarios_leer on public.comentarios for select to authenticated using (public.mi_clave() is not null);
drop policy if exists comentarios_crear on public.comentarios;
create policy comentarios_crear on public.comentarios for insert to authenticated with check (autor = public.mi_clave());
drop policy if exists comentarios_editar on public.comentarios;
create policy comentarios_editar on public.comentarios for update to authenticated using (autor = public.mi_clave()) with check (autor = public.mi_clave());
drop policy if exists comentarios_borrar on public.comentarios;
create policy comentarios_borrar on public.comentarios for delete to authenticated using (autor = public.mi_clave());

revoke all on public.personas, public.tareas, public.comentarios from anon;

-- Que los cambios del otro aparezcan solos.
alter publication supabase_realtime add table public.tareas;
alter publication supabase_realtime add table public.comentarios;
