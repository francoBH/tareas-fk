-- PRIORIDADES FIJADAS (como «Mis tareas» de Blue OS): cada persona fija hasta 20 tareas arriba
-- del Inicio, en el orden que elige. Son SUYAS: nadie ve ni toca las prioridades de otro.
create table if not exists public.prioridades (
  persona  text not null,
  tarea_id uuid not null references public.tareas(id) on delete cascade,
  orden    int not null default 0,
  creado   timestamptz not null default now(),
  primary key (persona, tarea_id)
);
alter table public.prioridades enable row level security;
drop policy if exists prioridades_mias on public.prioridades;
create policy prioridades_mias on public.prioridades for all to authenticated
  using (persona = public.mi_clave()) with check (persona = public.mi_clave());
revoke all on public.prioridades from anon;
alter publication supabase_realtime add table public.prioridades;
