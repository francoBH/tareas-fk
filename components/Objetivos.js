"use client";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Svg, IcoX, IconoEstado } from "@/components/piezas";
import { dias, fechaCorta, fechaRel, hoyIso, sinTildes } from "@/lib/fechas";

/* ════════════════════════════════════════════════════════════════════════════════
   OBJETIVOS — copia de los de Blue OS (components/tareas/Objetivos.tsx), recortada.
   Cada objetivo: nombre, cómo se sabe que se cumplió, responsable, fecha, meta, actual,
   diferencia, barra de avance y estado.
   · El ACTUAL sale de las TAREAS atadas (cuántas se completaron) o se carga A MANO.
   · avance = actual ÷ meta (en los de «bajar», meta ÷ actual).
   · On track cuando el avance queda a menos de 5 puntos del tiempo que ya pasó entre
     «desde» y la fecha. Llegar a la meta = Completado.
   ════════════════════════════════════════════════════════════════════════════════ */

const ESTADO = { done: ["Completado", "var(--verde-txt)"], on: ["On track", "var(--ac-ink)"], off: ["Off track", "var(--rojo-txt)"], sinmeta: ["Sin meta", "var(--t3)"] };

const num = (n) => (n === null || n === undefined || n === "" ? null : Number(n));
export function formatear(v, unidad) {
  if (v === null || v === undefined || !Number.isFinite(v)) return unidad === "moneda" ? "$0" : unidad === "porcentaje" ? "0%" : "0";
  const r = Math.round(v * 10) / 10;
  const t = r.toLocaleString("es-AR", { maximumFractionDigits: unidad === "porcentaje" ? 1 : 0 });
  return unidad === "moneda" ? "$" + t : unidad === "porcentaje" ? t + "%" : t;
}

/* Las cuentas de un objetivo, con las tareas que tiene atadas. */
export function medirObjetivo(o, tareas, hoy) {
  const atadas = tareas.filter((t) => t.objetivo_id === o.id);
  const hechas = atadas.filter((t) => t.estado === "comp" && !t.recurrencia).length;
  const deTareas = o.origen === "tareas";
  const meta = num(o.meta) ?? (deTareas ? atadas.filter((t) => !t.recurrencia).length : null);
  const actual = deTareas ? hechas : num(o.actual_manual);
  const bajar = o.sentido === "bajar";
  let pct = 0;
  if (meta && meta > 0) {
    if (bajar) pct = actual === null ? 0 : actual <= meta ? 100 : Math.min(99, Math.round((meta / actual) * 100));
    else { const a = actual ?? 0; pct = a >= meta ? Math.round((a / meta) * 100) : Math.min(99, Math.round((a / meta) * 100)); }
  }
  let trans = 0;
  if (o.fecha) {
    const total = Math.max(1, dias(o.desde || hoy, o.fecha) + 1), paso = dias(o.desde || hoy, hoy) + 1;
    trans = Math.max(0, Math.min(100, Math.round((paso / total) * 100)));
  }
  const llego = meta > 0 && actual !== null && (bajar ? actual <= meta : actual >= meta);
  const estado = llego ? "done" : !(meta > 0) ? "sinmeta" : !o.fecha ? (pct > 0 ? "on" : "off") : pct >= trans - 5 ? "on" : "off";
  const dif = meta === null ? null : bajar ? meta - (actual ?? 0) : (actual ?? 0) - meta;
  return { atadas, hechas, meta, actual, pct, trans, estado, dif, vencido: o.fecha && o.fecha < hoy && !llego };
}

export default function Objetivos({ objetivos, setObjetivos, tareas, P, claves, yo, avisar, abrirTarea, cambiarTarea, tipDe }) {
  const hoy = hoyIso();
  const [abierto, setAbierto] = useState(null);
  const [verArch, setVerArch] = useState(false);
  const [busca, setBusca] = useState("");

  const lista = objetivos.filter((o) => (verArch ? o.estado === "archivado" : o.estado !== "archivado"));
  const medidos = useMemo(() => Object.fromEntries(objetivos.map((o) => [o.id, medirObjetivo(o, tareas, hoy)])), [objetivos, tareas, hoy]);

  const guardar = async (id, cambios) => {
    setObjetivos((os) => os.map((o) => (o.id === id ? { ...o, ...cambios } : o)));
    const { error } = await supabase.from("objetivos").update(cambios).eq("id", id);
    if (error) avisar("No se pudo guardar el objetivo.");
  };
  const crear = async () => {
    const o = { id: crypto.randomUUID(), nombre: "Nuevo objetivo", ddc: "", tipo: "pro", resp: yo, desde: hoy, fecha: null, meta: null, unidad: "numero", origen: "tareas", actual_manual: null, sentido: "subir", estado: "activo", creado_por: yo, creado: new Date().toISOString() };
    setObjetivos((os) => os.concat([o]));
    setAbierto(o.id);
    const { creado, ...fila } = o;
    const { error } = await supabase.from("objetivos").insert(fila);
    if (error) { setObjetivos((os) => os.filter((x) => x.id !== o.id)); setAbierto(null); avisar("No se pudo crear el objetivo."); }
  };
  const borrar = async (id) => {
    setObjetivos((os) => os.filter((o) => o.id !== id)); setAbierto(null);
    const { error } = await supabase.from("objetivos").delete().eq("id", id);
    if (error) avisar("No se pudo borrar."); else avisar("Objetivo borrado. Sus tareas quedaron sin objetivo.");
  };

  const grupos = [["pro", "Profesional · BlueHackers"], ["per", "Personal · Franco"]].map(([k, label]) => ({ k, label, os: lista.filter((o) => o.tipo === k) })).filter((g) => g.os.length);
  const oA = abierto ? objetivos.find((o) => o.id === abierto) : null;
  const mA = oA ? medidos[oA.id] : null;
  const candidatas = oA ? tareas.filter((t) => t.objetivo_id !== oA.id && t.estado !== "comp" && (!busca.trim() || sinTildes(t.nombre).includes(sinTildes(busca.trim())))).slice(0, 8) : [];

  const fila = (o) => {
    const m = medidos[o.id], [eTxt, eCol] = ESTADO[m.estado];
    const p = o.resp && P[o.resp];
    return (
      <div key={o.id} className={"obj-fila" + (abierto === o.id ? " on" : "")} role="button" tabIndex={0} onClick={() => setAbierto(o.id)}
        onKeyDown={(e) => { if (e.key === "Enter") setAbierto(o.id); }}>
        <span className="obj-nom"><b>{o.nombre}</b>{o.ddc && <span>{o.ddc}</span>}</span>
        <span className="obj-c">{p ? <span className="cara g" style={{ background: p.color }} title={p.nombre}>{p.iniciales}</span> : <span className="obj-falta">Falta</span>}</span>
        <span className={"obj-c" + (m.vencido ? " venc" : "")}>{o.fecha ? fechaRel(hoy, o.fecha) : <span className="obj-falta">Falta</span>}</span>
        <span className="obj-c num">{m.meta !== null ? formatear(m.meta, o.unidad) : <span className="obj-falta">Falta</span>}</span>
        <span className="obj-c num"><b>{formatear(m.actual ?? 0, o.unidad)}</b><span className="obj-origen">{o.origen === "tareas" ? "Tareas" : "Manual"}</span></span>
        <span className={"obj-c num " + (m.dif === null ? "" : m.dif >= 0 ? "bien" : "mal")}>{m.dif === null ? "" : (m.dif > 0 ? "+" : m.dif < 0 ? "−" : "") + formatear(Math.abs(m.dif), o.unidad)}</span>
        <span className="obj-avance">
          <span className="obj-barra"><span style={{ width: Math.min(100, m.pct) + "%", background: eCol }} />{o.fecha && <i style={{ left: m.trans + "%" }} title={"Ya pasó el " + m.trans + "% del plazo"} />}</span>
          <span className="obj-pct num">{m.pct}%</span>
        </span>
        <span className="obj-c"><span className="obj-estado" style={{ "--c": eCol }}>{eTxt}</span></span>
      </div>
    );
  };

  return (
    <div className="obj">
      <div className="obj-barra-sup">
        <button type="button" className="btn-pri" onClick={crear}><Svg tam={14} ancho={2}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>Nuevo objetivo</button>
        <span className="esp" />
        <button type="button" className="act-toggle" onClick={() => setVerArch((v) => !v)}>{verArch ? "Ver activos" : "Ver archivados"}</button>
      </div>

      {!grupos.length && (
        <div className="vacio">
          <span className="vacio-ico"><Svg tam={24} ancho={1.7}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></Svg></span>
          <b>{verArch ? "No hay objetivos archivados" : "Todavía no hay objetivos"}</b>
          <span>Un objetivo junta tareas bajo una meta con fecha, y te dice si vas en camino o atrasado.</span>
          {!verArch && <button type="button" className="btn-pri" onClick={crear}>Crear el primero</button>}
        </div>
      )}

      {grupos.map((g) => {
        const done = g.os.filter((o) => medidos[o.id].estado === "done").length;
        return (
          <section key={g.k} className="obj-grupo">
            <div className="obj-div" style={{ "--c": tipDe(g.k)?.color }}><b>{g.label}</b><span>{done} de {g.os.length} completados</span></div>
            <div className="obj-cols"><span>Objetivo</span><span>Resp.</span><span>Fecha</span><span>Meta</span><span>Actual</span><span>Diferencia</span><span>Avance</span><span>Estado</span></div>
            {g.os.map(fila)}
          </section>
        );
      })}

      {oA && mA && (<>
        <button type="button" className="pop-fondo" onClick={() => setAbierto(null)} aria-label="Cerrar" />
        <aside className="rs-lista obj-panel" role="dialog" aria-label={oA.nombre}>
          <div className="rs-lista-cab">
            <b>Objetivo</b><span className="obj-estado" style={{ "--c": ESTADO[mA.estado][1] }}>{ESTADO[mA.estado][0]}</span>
            <span className="esp" />
            <button type="button" className="rs-ibtn" onClick={() => guardar(oA.id, { estado: oA.estado === "archivado" ? "activo" : "archivado" })} title={oA.estado === "archivado" ? "Volver a activos" : "Archivar"}>
              <Svg tam={15} ancho={1.8}><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10h14V9" /><path d="M10 13h4" /></Svg>
            </button>
            <button type="button" className="rs-ibtn" onClick={() => borrar(oA.id)} title="Borrar el objetivo"><Svg tam={15} ancho={1.8}><path d="M4 7h16" /><path d="M9 7V4.5h6V7" /><path d="M6 7l1 13h10l1-13" /></Svg></button>
            <button type="button" className="rs-ibtn" onClick={() => setAbierto(null)} aria-label="Cerrar"><IcoX tam={15} /></button>
          </div>
          <div className="rs-lista-cuerpo obj-ed">
            <input className="obj-tit" defaultValue={oA.nombre} key={"n" + oA.id} maxLength={120} aria-label="Nombre del objetivo"
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== oA.nombre) guardar(oA.id, { nombre: v }); }} />
            <textarea className="obj-ddc" defaultValue={oA.ddc} key={"d" + oA.id} placeholder="¿Cómo se sabe que se cumplió? (definición de completado)" aria-label="Definición de completado"
              onBlur={(e) => { if (e.target.value.trim() !== oA.ddc) guardar(oA.id, { ddc: e.target.value.trim() }); }} />

            <div className="obj-progreso">
              <span className="obj-grande num">{formatear(mA.actual ?? 0, oA.unidad)}<small> de {mA.meta !== null ? formatear(mA.meta, oA.unidad) : "—"}</small></span>
              <span className="obj-barra grande"><span style={{ width: Math.min(100, mA.pct) + "%", background: ESTADO[mA.estado][1] }} />{oA.fecha && <i style={{ left: mA.trans + "%" }} />}</span>
              <span className="obj-sub">{mA.pct}% de avance{oA.fecha ? " · ya pasó el " + mA.trans + "% del plazo" : ""}</span>
            </div>

            <div className="obj-campos">
              <label>Tipo</label>
              <span className="rs-seg">{[["pro", "Profesional"], ["per", "Personal"]].map(([k, l]) => <button key={k} type="button" className={oA.tipo === k ? "on" : ""} onClick={() => guardar(oA.id, { tipo: k })}>{l}</button>)}</span>
              <label>Responsable</label>
              <span className="obj-personas">{claves.map((k) => <button key={k} type="button" className={"obj-persona" + (oA.resp === k ? " on" : "")} onClick={() => guardar(oA.id, { resp: oA.resp === k ? null : k })} title={P[k].nombre}>
                <span className="cara g" style={{ background: P[k].color }}>{P[k].iniciales}</span>{P[k].nombre.split(" ")[0]}</button>)}</span>
              <label>Desde</label>
              <input type="date" className="reu-fecha" value={oA.desde || ""} onChange={(e) => guardar(oA.id, { desde: e.target.value || hoy })} />
              <label>Fecha límite</label>
              <input type="date" className={"reu-fecha" + (oA.fecha ? "" : " falta")} value={oA.fecha || ""} onChange={(e) => guardar(oA.id, { fecha: e.target.value || null })} />
              <label>Actual sale de</label>
              <span className="rs-seg">{[["tareas", "Tareas"], ["manual", "Manual"]].map(([k, l]) => <button key={k} type="button" className={oA.origen === k ? "on" : ""} onClick={() => guardar(oA.id, { origen: k })}>{l}</button>)}</span>
              <label>Unidad</label>
              <span className="rs-seg">{[["numero", "#"], ["moneda", "$"], ["porcentaje", "%"]].map(([k, l]) => <button key={k} type="button" className={oA.unidad === k ? "on" : ""} onClick={() => guardar(oA.id, { unidad: k })}>{l}</button>)}</span>
              <label>Meta</label>
              <input type="number" className="obj-num" key={"m" + oA.id + oA.origen} defaultValue={oA.meta ?? ""} placeholder={oA.origen === "tareas" ? "Si la dejas vacía, la meta es completar todas sus tareas" : "Número a alcanzar"}
                onBlur={(e) => guardar(oA.id, { meta: e.target.value === "" ? null : Number(e.target.value) })} />
              {oA.origen === "manual" && (<>
                <label>Actual</label>
                <input type="number" className="obj-num" key={"a" + oA.id} defaultValue={oA.actual_manual ?? ""} placeholder="Dónde está hoy"
                  onBlur={(e) => guardar(oA.id, { actual_manual: e.target.value === "" ? null : Number(e.target.value) })} />
              </>)}
              <label>Mejor si</label>
              <span className="rs-seg">{[["subir", "Sube"], ["bajar", "Baja"]].map(([k, l]) => <button key={k} type="button" className={oA.sentido === k ? "on" : ""} onClick={() => guardar(oA.id, { sentido: k })}>{l}</button>)}</span>
            </div>

            <div className="obj-tareas">
              <div className="obj-tareas-cab"><b>Tareas del objetivo</b><span>{mA.hechas} de {mA.atadas.filter((t) => !t.recurrencia).length} completadas</span></div>
              {!mA.atadas.length && <span className="rs-vacio-chico">Todavía no tiene tareas. Átalas acá abajo o desde el panel de cada tarea.</span>}
              {mA.atadas.map((t) => (
                <div key={t.id} className="obj-tarea">
                  <IconoEstado estado={t.estado} />
                  <button type="button" className="obj-tarea-nom" onClick={() => { setAbierto(null); abrirTarea(t.id); }}>{t.nombre}</button>
                  {t.recurrencia && <span className="obj-nosuma" title="Una recurrente vuelve a empezar y nunca queda completada: no suma al avance">No suma</span>}
                  <span className="obj-tarea-f">{t.fecha ? fechaCorta(t.fecha) : ""}</span>
                  <button type="button" className="reu-desc" onClick={() => cambiarTarea(t.id, { objetivo_id: null })} title="Desatar del objetivo" aria-label="Desatar"><IcoX tam={12} /></button>
                </div>
              ))}
              <input className="reu-input obj-busca" placeholder="Buscar una tarea para atar…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar tarea" />
              {busca.trim() && candidatas.map((t) => (
                <button key={t.id} type="button" className="obj-cand" onClick={() => { cambiarTarea(t.id, { objetivo_id: oA.id }); setBusca(""); avisar("Tarea atada al objetivo"); }}>
                  <IconoEstado estado={t.estado} /><span>{t.nombre}</span>{t.objetivo_id && <em>ya en otro objetivo</em>}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </>)}
    </div>
  );
}
