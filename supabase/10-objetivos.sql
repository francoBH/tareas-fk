-- OBJETIVOS (como Blue OS): una meta con fecha, que avanza con las tareas atadas (cuántas se
-- completaron) o con un número cargado a mano. On track = el avance no queda más de 5 puntos
-- por debajo del tiempo que ya pasó.
create table if not exists public.objetivos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (char_length(nombre) between 1 and 120),
  ddc           text not null default '',
  tipo          text not null default 'pro' check (tipo in ('pro', 'per')),
  resp          text,
  desde         date not null default current_date,
  fecha         date,
  meta          numeric,
  unidad        text not null default 'numero' check (unidad in ('numero', 'moneda', 'porcentaje')),
  origen        text not null default 'tareas' check (origen in ('tareas', 'manual')),
  actual_manual numeric,
  sentido       text not null default 'subir' check (sentido in ('subir', 'bajar')),
  estado        text not null default 'activo' check (estado in ('activo', 'archivado')),
  creado_por    text,
  creado        timestamptz not null default now()
);
alter table public.objetivos enable row level security;
drop policy if exists objetivos_todo on public.objetivos;
create policy objetivos_todo on public.objetivos for all to authenticated
  using (public.mi_clave() is not null) with check (public.mi_clave() is not null);
revoke all on public.objetivos from anon;
alter publication supabase_realtime add table public.objetivos;

alter table public.tareas add column if not exists objetivo_id uuid references public.objetivos(id) on delete set null;
create index if not exists tareas_objetivo_idx on public.tareas (objetivo_id);
