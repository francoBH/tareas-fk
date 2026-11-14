-- HISTORIAL de cada tarea (como Blue OS: tareas_historial): una fila por cada cambio de estado,
-- fecha, prioridad, responsables, tipo, nombre o repetición, con quién lo hizo y cuándo.
-- Lo escribe la base sola (un disparador), así no depende de qué pantalla hizo el cambio.
create table if not exists public.historial (
  id       uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  persona  text,
  campo    text not null,
  antes    jsonb,
  despues  jsonb,
  creado   timestamptz not null default now()
);
create index if not exists historial_tarea_idx on public.historial (tarea_id, creado);
alter table public.historial enable row level security;
drop policy if exists historial_leer on public.historial;
create policy historial_leer on public.historial for select to authenticated using (public.mi_clave() is not null);
revoke all on public.historial from anon;
alter publication supabase_realtime add table public.historial;

create or replace function public.tareas_historial() returns trigger
language plpgsql security definer set search_path = public as $$
declare yo text := public.mi_clave();
begin
  if tg_op = 'INSERT' then
    insert into historial(tarea_id, persona, campo, despues) values (new.id, coalesce(yo, new.creado_por), 'creada', to_jsonb(new.nombre));
    return new;
  end if;
  if new.estado is distinct from old.estado then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'estado', to_jsonb(old.estado), to_jsonb(new.estado)); end if;
  if new.fecha is distinct from old.fecha then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'fecha', to_jsonb(old.fecha), to_jsonb(new.fecha)); end if;
  if new.prio is distinct from old.prio then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'prio', to_jsonb(old.prio), to_jsonb(new.prio)); end if;
  if new.resp is distinct from old.resp then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'resp', to_jsonb(old.resp), to_jsonb(new.resp)); end if;
  if new.tipo is distinct from old.tipo then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'tipo', to_jsonb(old.tipo), to_jsonb(new.tipo)); end if;
  if new.nombre is distinct from old.nombre then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'nombre', to_jsonb(old.nombre), to_jsonb(new.nombre)); end if;
  if new.recurrencia is distinct from old.recurrencia and (new.recurrencia - 'dia') is distinct from (old.recurrencia - 'dia') then
    insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'recurrencia', old.recurrencia, new.recurrencia); end if;
  return new;
end $$;
revoke all on function public.tareas_historial() from public, anon, authenticated;
drop trigger if exists tareas_historial on public.tareas;
create trigger tareas_historial after insert or update on public.tareas for each row execute function public.tareas_historial();

-- FEEDBACK del equipo sobre la app: cada uno manda lo suyo y ve lo de todos.
-- Claude lo lee al empezar cada sesión de trabajo sobre la app y marca qué se hizo.
create table if not exists public.feedback (
  id        uuid primary key default gen_random_uuid(),
  autor     text not null,
  tipo      text not null default 'idea' check (tipo in ('error', 'idea', 'mejora')),
  txt       text not null check (char_length(txt) between 1 and 5000),
  pantalla  text,
  imagenes  jsonb not null default '[]'::jsonb,
  estado    text not null default 'nuevo' check (estado in ('nuevo', 'en_curso', 'hecho', 'descartado')),
  respuesta text,
  creado    timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists feedback_leer on public.feedback;
create policy feedback_leer on public.feedback for select to authenticated using (public.mi_clave() is not null);
drop policy if exists feedback_crear on public.feedback;
create policy feedback_crear on public.feedback for insert to authenticated with check (autor = public.mi_clave());
drop policy if exists feedback_borrar on public.feedback;
create policy feedback_borrar on public.feedback for delete to authenticated using (autor = public.mi_clave() and estado = 'nuevo');
revoke all on public.feedback from anon;
alter publication supabase_realtime add table public.feedback;
