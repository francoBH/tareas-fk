/* ════════════════════════════════════════════════════════════════════════════════
   FECHAS QUE SE CORREN (19-nov-2026) — cuántas veces se pospuso cada tarea y por qué.

   Una «corrida» es un cambio de fecha que la manda MÁS ADELANTE (o se la saca), sacado del
   historial que escribe la base. Las recurrentes no cuentan: su fecha avanza sola al
   completarlas. Adelantar una fecha tampoco cuenta.
   Lo de antes del 14-nov (cuando no había historial) se ve por `fecha_original`: si la
   fecha actual quedó después de la primera, cuenta como UNA corrida sin fecha ni motivo.
   ════════════════════════════════════════════════════════════════════════════════ */

export const MOTIVOS = ["Me faltó tiempo", "Esperaba a otra persona", "Cambió la prioridad", "Era más grande de lo pensado"];
export const motivoGrupo = (m) => (!m ? "Sin motivo" : MOTIVOS.includes(m) ? m : "Otro");

const dia = (v) => (v ? String(v).slice(0, 10) : null);
export const esCorrida = (de, a) => !!de && (!a || a > de);

/* Map tareaId → [{ de, a, cuando, persona, motivo }] */
export function corridasDe(tareas, historial) {
  const rec = new Set(tareas.filter((t) => t.recurrencia).map((t) => t.id));
  const out = new Map();
  for (const h of historial) {
    if (h.campo !== "fecha" || rec.has(h.tarea_id)) continue;
    const de = dia(h.antes), a = dia(h.despues);
    if (!esCorrida(de, a)) continue;
    if (!out.has(h.tarea_id)) out.set(h.tarea_id, []);
    out.get(h.tarea_id).push({ de, a, cuando: h.creado, persona: h.persona, motivo: h.motivo || null });
  }
  for (const t of tareas) {
    if (rec.has(t.id) || out.has(t.id)) continue;
    if (t.fecha_original && (!t.fecha || t.fecha > t.fecha_original)) out.set(t.id, [{ de: t.fecha_original, a: t.fecha, cuando: null, persona: null, motivo: null }]);
  }
  return out;
}

/* ¿Posponer a `nueva` desde `actual` es una corrida que pide motivo? */
export const pideMotivo = (t, nueva) => !!t && !t.recurrencia && esCorrida(t.fecha, nueva);
