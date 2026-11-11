/* LA TAREA RECURRENTE — copia de la cuenta de Blue OS (lib/tareas/recurrencia.ts), sin tipos.
   Una recurrente no se vuelve a crear: al completarla, la MISMA tarea pasa a su próxima fecha.
   Las tres reglas que trae arregladas de Blue OS:
   1. El día 31 no se corre: 31 ago → 30 sep → 31 oct (el día original queda como ancla `dia`).
   2. La atrasada se pone al día: la vuelta nueva es la primera de su serie DESPUÉS de hoy.
   3. Todo se cuenta en días enteros AAAA-MM-DD, sin horas. */

export const ATAJOS_RECURRENCIA = [
  { id: "diaria", label: "Diaria", regla: { regla: "diaria" } },
  { id: "habiles", label: "Días hábiles", regla: { regla: "semanal", dias_semana: [1, 2, 3, 4, 5] } },
  { id: "semanal", label: "Semanal", regla: { regla: "semanal" } },
  { id: "mensual", label: "Mensual", regla: { regla: "mensual" } },
  { id: "anual", label: "Anual", regla: { regla: "anual" } },
];
export const DIAS_SEMANA_CORTO = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const DIAS_SEMANA_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const NOMBRE_SEMANA = { 1: "primer", 2: "segundo", 3: "tercer", 4: "cuarto", [-1]: "último" };

export function mismaRecurrencia(a, b) {
  if (!a || !b) return !a && !b;
  const norm = (r) => JSON.stringify({
    regla: r.regla, cada: r.cada && r.cada > 1 ? r.cada : 1,
    ds: r.regla === "semanal" ? [...(r.dias_semana || [])].sort() : [],
    mm: r.regla === "mensual" ? r.modo_mes || "dia" : "dia",
  });
  return norm(a) === norm(b);
}

function listaDias(ds) {
  const d = [...new Set(ds)].filter((x) => x >= 1 && x <= 7).sort((x, y) => x - y);
  if (d.length >= 3 && d[d.length - 1] - d[0] === d.length - 1) return DIAS_SEMANA_CORTO[d[0] - 1] + " a " + DIAS_SEMANA_CORTO[d[d.length - 1] - 1];
  const n = d.map((x) => DIAS_SEMANA_CORTO[x - 1]);
  return n.length <= 1 ? n.join("") : n.slice(0, -1).join(", ") + " y " + n[n.length - 1];
}

/** «Días hábiles», «Cada 3 semanas, jue», «Mensual, el último día». */
export function textoRecurrencia(r) {
  if (!r) return "No se repite";
  const cada = r.cada && r.cada > 1 ? r.cada : 1;
  switch (r.regla) {
    case "diaria": return cada === 1 ? "Diaria" : "Cada " + cada + " días";
    case "semanal": {
      const ds = r.dias_semana || [];
      if (cada === 1 && ds.length === 5 && [1, 2, 3, 4, 5].every((x) => ds.includes(x))) return "Días hábiles";
      const base = cada === 1 ? "Semanal" : "Cada " + cada + " semanas";
      return ds.length ? base + ", " + listaDias(ds) : base;
    }
    case "mensual": {
      const base = cada === 1 ? "Mensual" : "Cada " + cada + " meses";
      if (r.modo_mes === "ultimo_dia") return base + ", el último día";
      if (r.modo_mes === "dia_semana" && r.semana && r.dia_semana) return base + ", el " + (NOMBRE_SEMANA[r.semana] || "") + " " + (DIAS_SEMANA_LARGO[r.dia_semana - 1] || "");
      return base;
    }
    case "anual": return cada === 1 ? "Anual" : "Cada " + cada + " años";
    default: return "Se repite";
  }
}

/* ── el calendario en días enteros ── */
function leerDia(s) {
  s = (s || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}
const dos = (n) => String(n).padStart(2, "0");
const escribirDia = (x) => x.y + "-" + dos(x.m) + "-" + dos(x.d);
const ultimoDia = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const MS = 86400000;
const aSerie = (x) => Math.round(Date.UTC(x.y, x.m - 1, x.d) / MS);
function deSerie(n) { const t = new Date(n * MS); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
const diaSemana = (x) => { const w = new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay(); return w === 0 ? 7 : w; };
export const diaSemanaDe = (s) => { const x = leerDia(s); return x ? diaSemana(x) : null; };

function enesimoDia(y, m, semana, dia) {
  if (semana === -1) { const fin = ultimoDia(y, m); return fin - ((diaSemana({ y, m, d: fin }) - dia + 7) % 7); }
  return 1 + ((dia - diaSemana({ y, m, d: 1 }) + 7) % 7) + (semana - 1) * 7;
}
function diaDelMes(y, m, r, ancla) {
  if (r.regla === "mensual" && r.modo_mes === "ultimo_dia") return ultimoDia(y, m);
  if (r.regla === "mensual" && r.modo_mes === "dia_semana" && r.semana && r.dia_semana) return enesimoDia(y, m, r.semana, r.dia_semana);
  return Math.min(ancla, ultimoDia(y, m));
}
const usaAncla = (r) => r.regla === "anual" || (r.regla === "mensual" && (r.modo_mes || "dia") === "dia");

function* serie(base, r, saltar) {
  const cada = r.cada && r.cada > 1 ? r.cada : 1;
  const b = aSerie(base);
  if (r.regla === "diaria") { for (let k = Math.max(0, Math.floor((saltar - b) / cada)); ; k++) yield deSerie(b + k * cada); }
  if (r.regla === "semanal") {
    const v = [...new Set(r.dias_semana || [])].filter((d) => d >= 1 && d <= 7).sort((a, c) => a - c);
    const ds = v.length ? v : [diaSemana(base)];
    const lunes = b - (diaSemana(base) - 1), paso = 7 * cada;
    for (let k = Math.max(0, Math.floor((saltar - lunes) / paso) - 1); ; k++) for (const d of ds) yield deSerie(lunes + k * paso + d - 1);
  }
  const ancla = r.dia || base.d, pasoMeses = (r.regla === "anual" ? 12 : 1) * cada;
  const s = deSerie(saltar), meses = (s.y - base.y) * 12 + (s.m - base.m);
  for (let k = Math.max(0, Math.floor(meses / pasoMeses) - 1); ; k++) {
    const total = base.m - 1 + k * pasoMeses;
    const y = base.y + Math.floor(total / 12), m = (total % 12) + 1;
    yield { y, m, d: diaDelMes(y, m, r, ancla) };
  }
}

/** La próxima vuelta al completar: la primera de su serie DESPUÉS de hoy (o de su fecha, si
    todavía no vencía). Devuelve { fecha: "AAAA-MM-DD", recurrencia } o null. */
export function siguienteVuelta(desde, r, hoy) {
  if (!r) return null;
  const diaHoy = leerDia(hoy);
  if (!diaHoy) return null;
  const base = leerDia(desde) || diaHoy;
  const limite = Math.max(aSerie(base), aSerie(diaHoy));
  let prox = null, i = 0;
  for (const v of serie(base, r, limite)) { if (aSerie(v) > limite) { prox = v; break; } if (++i > 5000) break; }
  if (!prox) return null;
  const recurrencia = { ...r };
  if (usaAncla(r)) recurrencia.dia = r.dia || base.d; else delete recurrencia.dia;
  return { fecha: escribirDia(prox), recurrencia };
}

/** Las próximas vueltas que caen entre `inicio` y `fin`, para marcarlas en el calendario. */
export function vueltasEntre(desde, r, inicio, fin) {
  const base = leerDia(desde), a = leerDia(inicio), b = leerDia(fin);
  if (!r || !base || !a || !b) return [];
  const out = []; let i = 0;
  for (const v of serie(base, r, Math.max(aSerie(base), aSerie(a)))) {
    const n = aSerie(v);
    if (n > aSerie(b) || ++i > 5000) break;
    if (n > aSerie(base) && n >= aSerie(a)) out.push(escribirDia(v));
  }
  return out;
}

/** Las opciones de «El mes» para una fecha, como Google Calendar: «el día 30», «el último día»,
    «el primer lunes», «el último miércoles». */
export function opcionesDelMes(s) {
  const x = leerDia(s);
  if (!x) return [];
  const ds = diaSemana(x), fin = ultimoDia(x.y, x.m), semana = Math.ceil(x.d / 7);
  const out = [{ modo_mes: "dia", txt: "El día " + x.d }];
  if (x.d === fin) out.push({ modo_mes: "ultimo_dia", txt: "El último día" });
  if (semana <= 4) out.push({ modo_mes: "dia_semana", semana, dia_semana: ds, txt: "El " + NOMBRE_SEMANA[semana] + " " + DIAS_SEMANA_LARGO[ds - 1] });
  if (x.d + 7 > fin) out.push({ modo_mes: "dia_semana", semana: -1, dia_semana: ds, txt: "El último " + DIAS_SEMANA_LARGO[ds - 1] });
  return out;
}
