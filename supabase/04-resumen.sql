-- El Resumen necesita saber CUÁNDO pasa cada cosa, no sólo el estado de hoy.
--   completada     → cuándo se marcó completada (se borra si se reabre)
--   iniciada       → la primera vez que pasó a «en progreso», «en revisión» o «corregir»
--   fecha_original → la primera fecha límite que tuvo (para saber si se reprogramó)
--   minutos        → cuánto tiempo le lleva a una persona hacerla (opcional; si falta se estima por prioridad)
alter table public.tareas
  add column if not exists completada timestamptz,
  add column if not exists iniciada timestamptz,
  add column if not exists fecha_original date,
  add column if not exists minutos int check (minutos is null or minutos between 1 and 6000);

create or replace function public.tareas_tiempos() returns trigger language plpgsql as $$
begin
  if new.estado = 'comp' then
    if tg_op = 'INSERT' or old.estado is distinct from 'comp' then new.completada := now(); end if;
  else
    new.completada := null;
  end if;
  if new.estado in ('prog', 'rev', 'corr') and new.iniciada is null then new.iniciada := now(); end if;
  if new.fecha_original is null and new.fecha is not null then new.fecha_original := new.fecha; end if;
  return new;
end $$;
drop trigger if exists tareas_tiempos on public.tareas;
create trigger tareas_tiempos before insert or update on public.tareas for each row execute function public.tareas_tiempos();

-- Lo que ya existía: la fecha de hoy pasa a ser la original, y lo que ya está en curso arranca en su último cambio.
update public.tareas set fecha_original = fecha where fecha_original is null and fecha is not null;
update public.tareas set iniciada = actualizada where iniciada is null and estado in ('prog', 'rev', 'corr');
update public.tareas set completada = actualizada where completada is null and estado = 'comp';
