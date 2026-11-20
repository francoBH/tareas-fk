-- FECHAS QUE SE CORREN (19-nov-2026): 17 de 41 tareas tenían la fecha movida.
-- Al POSPONER una fecha, la app pide un motivo corto. Viaja en el mismo update como
-- `tareas.motivo_fecha` y el disparador del historial lo copia a `historial.motivo`
-- (la app manda motivo_fecha = null en todo otro cambio de fecha, así no se arrastra).
alter table public.tareas add column if not exists motivo_fecha text check (motivo_fecha is null or char_length(motivo_fecha) <= 200);
alter table public.historial add column if not exists motivo text;

create or replace function public.tareas_historial() returns trigger
language plpgsql security definer set search_path = public as $$
declare yo text := public.mi_clave();
begin
  if tg_op = 'INSERT' then
    insert into historial(tarea_id, persona, campo, despues) values (new.id, coalesce(yo, new.creado_por), 'creada', to_jsonb(new.nombre));
    return new;
  end if;
  if new.estado is distinct from old.estado then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'estado', to_jsonb(old.estado), to_jsonb(new.estado)); end if;
  if new.fecha is distinct from old.fecha then insert into historial(tarea_id, persona, campo, antes, despues, motivo) values (new.id, yo, 'fecha', to_jsonb(old.fecha), to_jsonb(new.fecha), nullif(trim(new.motivo_fecha), '')); end if;
  if new.prio is distinct from old.prio then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'prio', to_jsonb(old.prio), to_jsonb(new.prio)); end if;
  if new.resp is distinct from old.resp then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'resp', to_jsonb(old.resp), to_jsonb(new.resp)); end if;
  if new.tipo is distinct from old.tipo then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'tipo', to_jsonb(old.tipo), to_jsonb(new.tipo)); end if;
  if new.nombre is distinct from old.nombre then insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'nombre', to_jsonb(old.nombre), to_jsonb(new.nombre)); end if;
  if new.recurrencia is distinct from old.recurrencia and (new.recurrencia - 'dia') is distinct from (old.recurrencia - 'dia') then
    insert into historial(tarea_id, persona, campo, antes, despues) values (new.id, yo, 'recurrencia', old.recurrencia, new.recurrencia); end if;
  return new;
end $$;
revoke all on function public.tareas_historial() from public, anon, authenticated;
