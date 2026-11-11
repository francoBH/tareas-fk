"use client";
import { useMemo, useState } from "react";
import { Caras, IconoEstado, Svg } from "@/components/piezas";
import { dias, fechaCorta, hoyIso, iso, mas, mesKey, tituloMes } from "@/lib/fechas";

/* ════════════════════════════════════════════════════════════════════════════════
   EL RESUMEN — cómo venimos con las tareas en un rango de fechas.

   Qué cuenta cada número (todo sale de las mismas tareas del tablero):
   - Completadas: tareas que pasaron a «Completada» DENTRO del rango (columna `completada`).
   - Cumplimiento: de las que vencían en el rango, cuántas se completaron a tiempo
     (completada el día de su fecha límite o antes). Las que vencieron y siguen abiertas
     cuentan como incumplidas.
   - A tiempo: de las completadas en el rango, cuántas antes de su PRIMERA fecha límite
     (`fecha_original`): si se reprogramó, no cuenta como a tiempo.
   - Velocidad: días desde que se creó hasta que se completó (mediana: la tarea rara no la
     ensucia). Y desde que se empezó hasta que se terminó.
   - Tiempo liberado a Franco: las tareas completadas donde Franco NO es responsable, por los
     minutos que dice cada tarea o, si no los tiene, un estimado por prioridad. Es un
     estimado y la pantalla lo dice.
   ════════════════════════════════════════════════════════════════════════════════ */

const MIN_POR_PRIO = { urgente: 60, alta: 45, media: 30, baja: 15 };
const MIN_SIN_PRIO = 30;
export const minutosDe = (t) => t.minutos || (t.prio ? MIN_POR_PRIO[t.prio] : MIN_SIN_PRIO);

const diaLocal = (ts) => (ts ? iso(new Date(ts)) : null);
const horas = (min) => {
  if (!min) return "0 h";
  if (min < 60) return min + " min";
  const h = min / 60;
  return (Math.round(h * 10) / 10).toString().replace(".", ",") + " h";
};
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const unDecimal = (n) => (Math.round(n * 10) / 10).toString().replace(".", ",");
function mediana(xs) {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const diasEntre = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 86400000);
const durTexto = (d) => (d === null ? "0 días" : d < 1 ? Math.max(1, Math.round(d * 24)) + " h" : unDecimal(d) + (unDecimal(d) === "1" ? " día" : " días"));

function rangoDe(preset, hoy) {
  const p = hoy.split("-").map(Number);
  if (preset === "7") return [mas(hoy, -6), hoy];
  if (preset === "30") return [mas(hoy, -29), hoy];
  if (preset === "mes") return [mesKey(p[0], p[1]) + "-01", hoy];
  if (preset === "pasado") {
    const ini = iso(new Date(p[0], p[1] - 2, 1)), fin = iso(new Date(p[0], p[1] - 1, 0));
    return [ini, fin];
  }
  return [mas(hoy, -6), hoy];
}
const PRESETS = [["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["mes", "Este mes"], ["pasado", "Mes pasado"]];

/* El ícono de ayuda: la explicación vive acá, no en la pantalla. */
const Ayuda = ({ txt }) => (
  <span className="rs-ayuda" tabIndex={0} aria-label={txt}>
    <Svg tam={13} ancho={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Svg>
    <span className="rs-ayuda-pop" role="tooltip">{txt}</span>
  </span>
);

function Kpi({ etiqueta, valor, extra, ayuda, antes, mejorSiSube = true, onClick, tono }) {
  let comp = null;
  if (antes) {
    const dif = antes.dif;
    const bueno = dif === 0 ? null : (dif > 0) === mejorSiSube;
    comp = (
      <span className="rs-kpi-antes">
        antes {antes.txt}
        {dif !== 0 && <b className={bueno ? "bien" : "mal"}>{(dif > 0 ? "+" : "") + antes.difTxt}</b>}
      </span>
    );
  }
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={"rs-kpi" + (onClick ? " toca" : "")} onClick={onClick}>
      <span className="rs-kpi-et">{etiqueta}{ayuda && <Ayuda txt={ayuda} />}</span>
      <span className="rs-kpi-val">
        <b className={tono || ""}>{valor}</b>{extra && <span className={"rs-kpi-pct " + (tono || "")}>{extra}</span>}
      </span>
      {comp}
    </Tag>
  );
}

/* Cada vuelta completada de una recurrente cuenta como una tarea completada más, con la fecha
   que tenía esa vuelta (la recurrente en sí nunca queda «Completada»). Lo usan Resumen e Inicio. */
export function armarBase(tareas, vueltas = []) {
  const porId = new Map(tareas.map((t) => [t.id, t]));
  const deVueltas = vueltas.map((v) => {
    const t = porId.get(v.tarea_id);
    if (!t) return null;
    return { ...t, id: "v-" + v.id, tareaId: t.id, estado: "comp", resp: v.resp && v.resp.length ? v.resp : t.resp, completada: v.completada,
      fecha: v.vencia, fecha_original: v.vencia, creada: null, iniciada: v.iniciada, subs: [] };
  }).filter(Boolean);
  return tareas.concat(deVueltas);
}

/* Todas las cuentas de un rango [d, h], en una sola función: el período anterior, el Resumen y el
   Inicio se calculan igual. */
export function medirRango(base, d, h, hoy) {
  const enRango = (s) => s && s >= d && s <= h;
  const completadas = base.filter((t) => t.estado === "comp" && enRango(diaLocal(t.completada)));
  const creadas = base.filter((t) => enRango(diaLocal(t.creada)));
  /* Lo que vence HOY y sigue abierto todavía está a tiempo: no cuenta hasta mañana. */
  const vencian = base.filter((t) => enRango(t.fecha) && (t.fecha < hoy || (t.fecha === hoy && t.estado === "comp")));
  const cumplidas = vencian.filter((t) => t.estado === "comp" && diaLocal(t.completada) <= t.fecha);
  const conFecha = completadas.filter((t) => t.fecha_original || t.fecha);
  const aTiempo = conFecha.filter((t) => diaLocal(t.completada) <= (t.fecha_original || t.fecha));
  const ciclo = mediana(completadas.filter((t) => t.creada).map((t) => diasEntre(t.creada, t.completada)));
  const trabajo = mediana(completadas.filter((t) => t.iniciada).map((t) => diasEntre(t.iniciada, t.completada)));
  const delegadas = completadas.filter((t) => !t.resp.includes("F"));
  const minLiberados = delegadas.reduce((s, t) => s + minutosDe(t), 0);
  return { completadas, creadas, vencian, cumplidas, conFecha, aTiempo, ciclo, trabajo, delegadas, minLiberados };
}

export default function Resumen({ tareas, vueltas = [], P, claves, abrirTarea, tipDe }) {
  const hoy = hoyIso();
  const [preset, setPreset] = useState("30");
  const [tipo, setTipo] = useState(null);
  const [lista, setLista] = useState(null); // { titulo, tareas }
  const [mesCal, setMesCal] = useState(hoy.slice(0, 7));
  const [diaSel, setDiaSel] = useState(null);

  const [desde, hasta] = rangoDe(preset, hoy);
  const largo = dias(desde, hasta) + 1;
  const [desdeA, hastaA] = [mas(desde, -largo), mas(desde, -1)];

  /* Cada vuelta completada de una recurrente cuenta como una tarea completada más, con la
     fecha que tenía esa vuelta (la recurrente en sí nunca queda «Completada»). */
  const base = useMemo(() => armarBase(tareas, vueltas).filter((t) => !tipo || t.tipo === tipo), [tareas, vueltas, tipo]);
  const medir = (d, h) => medirRango(base, d, h, hoy);
  const m = useMemo(() => medir(desde, hasta), [base, desde, hasta, hoy]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useMemo(() => medir(desdeA, hastaA), [base, desdeA, hastaA, hoy]); // eslint-disable-line react-hooks/exhaustive-deps
  /* (las cuentas viven en medirRango, que también usa el Inicio) */

  /* Lo de hoy, sin rango: la foto del tablero. */
  const abiertas = base.filter((t) => t.estado !== "comp");
  const atrasadas = abiertas.filter((t) => t.fecha && t.fecha < hoy);
  const reprogramadas = abiertas.filter((t) => t.fecha_original && t.fecha && t.fecha !== t.fecha_original);
  const enCurso = abiertas.filter((t) => ["prog", "rev", "corr"].includes(t.estado));

  const ant = (ahora, antes, fmt, difFmt) => ({ txt: fmt(antes), dif: ahora - antes, difTxt: difFmt(ahora - antes) });
  const nInt = (n) => String(n);
  const nPct = (n) => n + "%";
  const pp = (n) => n + " pts";

  const cumplPct = pct(m.cumplidas.length, m.vencian.length), cumplPctA = pct(a.cumplidas.length, a.vencian.length);
  const tiempoPct = pct(m.aTiempo.length, m.conFecha.length), tiempoPctA = pct(a.aTiempo.length, a.conFecha.length);
  const ver = (titulo, ts) => setLista({ titulo, tareas: ts });

  /* ── el gráfico: completadas y creadas por día ── */
  const serie = useMemo(() => {
    const out = [];
    for (let i = 0; i < largo; i++) {
      const d = mas(desde, i);
      out.push({ d, comp: m.completadas.filter((t) => diaLocal(t.completada) === d), crea: m.creadas.filter((t) => diaLocal(t.creada) === d).length });
    }
    return out;
  }, [m, desde, largo]);
  const tope = Math.max(1, ...serie.map((s) => Math.max(s.comp.length, s.crea)));

  /* ── por persona ── */
  const porPersona = claves.map((k) => {
    const mias = base.filter((t) => t.resp.includes(k));
    const comp = m.completadas.filter((t) => t.resp.includes(k));
    const venc = m.vencian.filter((t) => t.resp.includes(k));
    const cumpl = m.cumplidas.filter((t) => t.resp.includes(k));
    return { k, abiertas: mias.filter((t) => t.estado !== "comp"), comp, cumpl: pct(cumpl.length, venc.length), venc: venc.length, atras: mias.filter((t) => t.estado !== "comp" && t.fecha && t.fecha < hoy) };
  }).filter((r) => r.abiertas.length || r.comp.length);

  /* ── el calendario del mes ── */
  const [cy, cm] = mesCal.split("-").map(Number);
  const primero = (new Date(cy, cm - 1, 1).getDay() + 6) % 7;
  const diasMes = new Date(cy, cm, 0).getDate();
  const celdas = [];
  for (let i = 0; i < primero; i++) celdas.push(null);
  for (let d = 1; d <= diasMes; d++) celdas.push(mesKey(cy, cm) + "-" + String(d).padStart(2, "0"));
  const delDia = (d) => ({
    comp: base.filter((t) => t.estado === "comp" && diaLocal(t.completada) === d),
    vence: base.filter((t) => t.estado !== "comp" && t.fecha === d),
  });
  const moverMes = (n) => { const x = new Date(cy, cm - 1 + n, 1); setMesCal(mesKey(x.getFullYear(), x.getMonth() + 1)); setDiaSel(null); };
  const sel = diaSel ? delDia(diaSel) : null;

  const filaTarea = (t) => {
    const tp = tipDe(t.tipo);
    const fin = t.completada ? diaLocal(t.completada) : null;
    const tarde = fin && (t.fecha_original || t.fecha) && fin > (t.fecha_original || t.fecha);
    return (
      <button key={t.id} type="button" className="rs-tarea" onClick={() => abrirTarea(t.tareaId || t.id)}>
        <IconoEstado estado={t.estado} />
        <span className="rs-tarea-nom">{t.nombre}</span>
        {tp && <span className="rs-tipo" style={{ "--c": tp.color }}>{tp.label}</span>}
        <Caras ids={t.resp} P={P} />
        <span className={"rs-tarea-fecha" + (tarde ? " tarde" : "")}>
          {fin ? "Hecha " + fechaCorta(fin) : t.fecha ? "Vence " + fechaCorta(t.fecha) : "Sin fecha"}
        </span>
      </button>
    );
  };

  return (
    <div className="rs">
      <div className="rs-filtros">
        <div className="rs-seg" role="tablist" aria-label="Período">
          {PRESETS.map(([id, txt]) => <button key={id} type="button" role="tab" aria-selected={preset === id} className={preset === id ? "on" : ""} onClick={() => setPreset(id)}>{txt}</button>)}
        </div>
        <span className="rs-rango num">{fechaCorta(desde)} – {fechaCorta(hasta)}</span>
        <span className="esp" />
        <div className="rs-seg">
          <button type="button" className={!tipo ? "on" : ""} onClick={() => setTipo(null)}>Todas</button>
          <button type="button" className={tipo === "pro" ? "on" : ""} onClick={() => setTipo("pro")}>Profesional</button>
          <button type="button" className={tipo === "per" ? "on" : ""} onClick={() => setTipo("per")}>Personal</button>
        </div>
      </div>

      {/* Lo principal: dos por línea. */}
      <div className="rs-grilla">
        <div className="rs-card">
          <h3>Cumplimiento</h3>
          <div className="rs-kpis">
            <Kpi etiqueta="Completadas" valor={nInt(m.completadas.length)} onClick={() => ver("Completadas", m.completadas)}
              ayuda="Tareas que se marcaron como completadas dentro del período."
              antes={ant(m.completadas.length, a.completadas.length, nInt, nInt)} />
            <Kpi etiqueta="% Cumplimiento" valor={m.cumplidas.length + " de " + m.vencian.length} extra={nPct(cumplPct)} tono="azul"
              onClick={() => ver("Vencían en el período", m.vencian)}
              ayuda="De las tareas que vencían en el período, cuántas se completaron el día de su fecha o antes. Las vencidas que siguen abiertas cuentan como no cumplidas; las de hoy recién cuentan mañana."
              antes={ant(cumplPct, cumplPctA, nPct, pp)} />
            <Kpi etiqueta="% A tiempo" valor={m.aTiempo.length + " de " + m.conFecha.length} extra={nPct(tiempoPct)} tono="azul"
              onClick={() => ver("Completadas a tiempo", m.aTiempo)}
              ayuda="De las completadas, cuántas se terminaron antes de su PRIMERA fecha límite. Si se reprogramó y se terminó después, no cuenta como a tiempo."
              antes={ant(tiempoPct, tiempoPctA, nPct, pp)} />
            <Kpi etiqueta="Creadas" valor={nInt(m.creadas.length)} onClick={() => ver("Creadas en el período", m.creadas)}
              ayuda="Tareas nuevas en el período. Si se crean más de las que se completan, la lista crece."
              antes={ant(m.creadas.length, a.creadas.length, nInt, nInt)} mejorSiSube={false} />
          </div>
        </div>

        <div className="rs-card">
          <h3>Velocidad y tiempo</h3>
          <div className="rs-kpis">
            <Kpi etiqueta="Días para resolver" valor={durTexto(m.ciclo)} onClick={() => ver("Completadas", m.completadas)}
              ayuda="Mediana del tiempo entre que se creó la tarea y se completó. La mediana evita que una tarea rara mueva el número."
              antes={m.ciclo !== null && a.ciclo !== null ? { txt: durTexto(a.ciclo), dif: Math.round((m.ciclo - a.ciclo) * 10) / 10, difTxt: durTexto(Math.abs(m.ciclo - a.ciclo)) } : null} mejorSiSube={false} />
            <Kpi etiqueta="Días trabajando" valor={durTexto(m.trabajo)}
              ayuda="Mediana del tiempo entre que la tarea pasó a «En progreso» y se completó."
              antes={m.trabajo !== null && a.trabajo !== null ? { txt: durTexto(a.trabajo), dif: Math.round((m.trabajo - a.trabajo) * 10) / 10, difTxt: durTexto(Math.abs(m.trabajo - a.trabajo)) } : null} mejorSiSube={false} />
            <Kpi etiqueta="Tiempo liberado a Franco" valor={horas(m.minLiberados)} extra={m.delegadas.length + (m.delegadas.length === 1 ? " tarea" : " tareas")} tono="verde"
              onClick={() => ver("Resueltas sin Franco", m.delegadas)}
              ayuda={"Estimado. Suma el tiempo de las tareas completadas donde Franco no es responsable. Usa el «Tiempo» que tenga cada tarea; si no lo tiene: urgente 1 h, alta 45 min, media 30 min, baja 15 min, sin prioridad 30 min."}
              antes={{ txt: horas(a.minLiberados), dif: m.minLiberados - a.minLiberados, difTxt: horas(Math.abs(m.minLiberados - a.minLiberados)) }} />
            <Kpi etiqueta="Por día" valor={unDecimal(m.completadas.length / largo)} extra="completadas"
              ayuda={"Promedio de tareas completadas por día en los " + largo + " días del período."}
              antes={{ txt: unDecimal(a.completadas.length / largo), dif: Math.round((m.completadas.length - a.completadas.length) / largo * 10) / 10, difTxt: unDecimal(Math.abs(m.completadas.length - a.completadas.length) / largo) }} />
          </div>
        </div>
      </div>

      {/* La foto de hoy: sin rango. */}
      <div className="rs-hoy">
        <span className="rs-hoy-tit">Hoy</span>
        <button type="button" className="rs-hoy-dato" onClick={() => ver("Abiertas", abiertas)}><b>{abiertas.length}</b> abiertas</button>
        <button type="button" className="rs-hoy-dato" onClick={() => ver("En curso", enCurso)}><b>{enCurso.length}</b> en curso</button>
        <button type="button" className={"rs-hoy-dato" + (atrasadas.length ? " rojo" : "")} onClick={() => ver("Atrasadas", atrasadas)}><b>{atrasadas.length}</b> atrasadas</button>
        <button type="button" className="rs-hoy-dato" onClick={() => ver("Reprogramadas", reprogramadas)}><b>{reprogramadas.length}</b> reprogramadas</button>
      </div>

      <div className="rs-grilla">
        <div className="rs-card">
          <div className="rs-card-cab">
            <h3>Completadas y creadas por día</h3>
            <span className="rs-leyenda"><i className="c-comp" />Completadas<i className="c-crea" />Creadas</span>
          </div>
          <div className="rs-graf" style={{ "--n": serie.length }}>
            {serie.map((s) => (
              <button key={s.d} type="button" className="rs-col" title={fechaCorta(s.d) + " · " + s.comp.length + " completadas · " + s.crea + " creadas"}
                onClick={() => s.comp.length && ver("Completadas el " + fechaCorta(s.d), s.comp)}>
                <span className="rs-barras">
                  <span className="rs-bar comp" style={{ height: (s.comp.length / tope) * 100 + "%" }} />
                  <span className="rs-bar crea" style={{ height: (s.crea / tope) * 100 + "%" }} />
                </span>
                {(serie.length <= 10 || dias(desde, s.d) % 7 === 0 || (s.d === hasta && dias(desde, hasta) % 7 >= 3)) && <span className="rs-col-et num">{Number(s.d.slice(8))}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="rs-card">
          <div className="rs-card-cab">
            <h3>Calendario</h3>
            <div className="rs-cal-nav">
              <button type="button" className="rs-ibtn" onClick={() => moverMes(-1)} aria-label="Mes anterior"><Svg tam={14} ancho={2}><path d="m15 18-6-6 6-6" /></Svg></button>
              <span className="rs-cal-mes">{tituloMes(cy, cm)}</span>
              <button type="button" className="rs-ibtn" onClick={() => moverMes(1)} aria-label="Mes siguiente"><Svg tam={14} ancho={2}><path d="m9 18 6-6-6-6" /></Svg></button>
            </div>
          </div>
          <div className="rs-cal">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="rs-cal-dow">{d}</span>)}
            {celdas.map((d, i) => {
              if (!d) return <span key={"v" + i} />;
              const x = delDia(d);
              const vencida = x.vence.length > 0 && d < hoy;
              return (
                <button key={d} type="button" className={"rs-cal-dia" + (d === hoy ? " hoy" : "") + (d === diaSel ? " sel" : "")}
                  onClick={() => setDiaSel(d === diaSel ? null : d)} title={x.comp.length + " completadas · " + x.vence.length + " por vencer"}>
                  <span className="num">{Number(d.slice(8))}</span>
                  <span className="rs-cal-marcas">
                    {x.comp.length > 0 && <span className="rs-cal-n comp">{x.comp.length}</span>}
                    {x.vence.length > 0 && <span className={"rs-cal-n " + (vencida ? "venc" : "pend")}>{x.vence.length}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="rs-cal-ley"><i className="c-comp" />Completadas<i className="c-pend" />Vencen<i className="c-venc" />Vencidas</div>
          {sel && (
            <div className="rs-cal-sel">
              <span className="rs-cal-sel-tit">{fechaCorta(diaSel)}</span>
              {!sel.comp.length && !sel.vence.length && <span className="rs-vacio-chico">Nada ese día.</span>}
              {sel.comp.map(filaTarea)}
              {sel.vence.map(filaTarea)}
            </div>
          )}
        </div>
      </div>

      <div className="rs-card">
        <h3>Por persona</h3>
        <div className="rs-personas">
          <div className="rs-pers rs-pers-cab"><span>Persona</span><span><span className="solo-ancho">Completadas</span><span className="solo-angosto">Hechas</span></span><span><span className="solo-ancho">% Cumplimiento</span><span className="solo-angosto">% Cumpl.</span></span><span>Abiertas</span><span>Atrasadas</span></div>
          {!porPersona.length && <span className="rs-vacio-chico">Todavía no hay tareas con responsable.</span>}
          {porPersona.map((r) => {
            const p = P[r.k];
            return (
              <div key={r.k} className="rs-pers">
                <span className="rs-pers-nom"><span className="cara g" style={{ background: p.color }}>{p.iniciales}</span>{p.nombre}</span>
                <button type="button" className="num" onClick={() => ver(p.nombre.split(" ")[0] + " · completadas", r.comp)}>{r.comp.length}</button>
                <span className="num azul">{r.venc ? r.cumpl + "%" : "0%"}</span>
                <button type="button" className="num" onClick={() => ver(p.nombre.split(" ")[0] + " · abiertas", r.abiertas)}>{r.abiertas.length}</button>
                <button type="button" className={"num" + (r.atras.length ? " rojo" : "")} onClick={() => ver(p.nombre.split(" ")[0] + " · atrasadas", r.atras)}>{r.atras.length}</button>
              </div>
            );
          })}
        </div>
      </div>

      {lista && (<>
        <button type="button" className="pop-fondo" onClick={() => setLista(null)} aria-label="Cerrar lista" />
        <div className="rs-lista" role="dialog" aria-label={lista.titulo}>
          <div className="rs-lista-cab">
            <b>{lista.titulo}</b><span className="num">{lista.tareas.length}</span>
            <span className="esp" />
            <button type="button" className="rs-ibtn" onClick={() => setLista(null)} aria-label="Cerrar"><Svg tam={15} ancho={2}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg></button>
          </div>
          <div className="rs-lista-cuerpo">
            {lista.tareas.length ? lista.tareas.slice().sort((x, y) => String(y.completada || y.fecha || "").localeCompare(String(x.completada || x.fecha || ""))).map((t) => <div key={t.id} onClick={() => setLista(null)}>{filaTarea(t)}</div>) : <span className="rs-vacio-chico">No hay tareas acá.</span>}
          </div>
        </div>
      </>)}
    </div>
  );
}
