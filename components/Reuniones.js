"use client";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Svg, IcoX } from "@/components/piezas";
import { dow, fechaRel, hoyIso, mas, sinTildes } from "@/lib/fechas";

/* ════════════════════════════════════════════════════════════════════════════════
   TAREAS DE REUNIONES — como la «Daily por aprobar» de Blue OS.
   Se pegan las notas o los compromisos de una reunión (lo que dejó Fathom, un audio pasado a
   texto, lo que se anotó a mano) y la app los separa en tareas PROPUESTAS, adivinando quién y
   para cuándo. Nada llega al tablero hasta que alguien lo aprueba: se corrige el texto, el
   responsable y la fecha, y recién ahí se crea la tarea.
   ════════════════════════════════════════════════════════════════════════════════ */

const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

/* De un renglón saca quién (un nombre del equipo o @Nombre) y para cuándo (hoy, mañana, el
   viernes, la semana que viene, 25/11). Lo que no encuentra queda vacío, para completar. */
export function leerRenglon(linea, personas, hoy) {
  let txt = linea.replace(/^\s*(?:[-*•·]|\d+[.)]|\[[ xX]?\])\s*/, "").replace(/\*\*/g, "").trim();
  const st = sinTildes(txt);
  let resp = null;
  for (const p of personas) {
    const nom = sinTildes(p.nombre.split(" ")[0]);
    const re = new RegExp("(^|[^a-z])@?" + nom + "([^a-z]|$)");
    if (re.test(st)) { resp = p.clave; break; }
  }
  /* «Katherine: mandar el contrato» → el nombre adelante se saca del texto. */
  if (resp) {
    const nom = personas.find((p) => p.clave === resp).nombre.split(" ")[0];
    txt = txt.replace(new RegExp("^@?" + nom + "[^\\s]*\\s*[:\\-–—]\\s*", "i"), "").trim();
  }
  let fecha = null;
  if (/\bhoy\b/.test(st)) fecha = hoy;
  else if (/\bpasado manana\b/.test(st)) fecha = mas(hoy, 2);
  else if (/\bmanana\b/.test(st)) fecha = mas(hoy, 1);
  else if (/semana que viene|proxima semana/.test(st)) fecha = mas(hoy, 8 - (dow(hoy) || 7));
  else {
    const d = DIAS.findIndex((x) => new RegExp("\\b" + x + "\\b").test(st));
    if (d >= 0) { let n = (d - dow(hoy) + 7) % 7; if (n === 0) n = 7; fecha = mas(hoy, n); }
    const m = /\b(\d{1,2})[/.-](\d{1,2})\b/.exec(st);
    if (m) {
      const y = Number(hoy.slice(0, 4)), mm = Number(m[2]), dd = Number(m[1]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        let f = y + "-" + String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0");
        if (f < mas(hoy, -60)) f = (y + 1) + f.slice(4);
        fecha = f;
      }
    }
  }
  const prio = /\burgente\b|\basap\b/.test(st) ? "urgente" : null;
  const tipo = /\bpersonal\b/.test(st) ? "per" : "pro";
  txt = txt.charAt(0).toUpperCase() + txt.slice(1);
  return { txt: txt.slice(0, 300), resp, fecha, prio, tipo };
}

/* Qué renglones son tareas: si hay viñetas o números, solo esos; si no, cada renglón con algo. */
export function separarTareas(notas, personas, hoy) {
  const ls = notas.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const conMarca = ls.filter((l) => /^(?:[-*•·]|\d+[.)]|\[[ xX]?\])\s+/.test(l));
  const elegidas = (conMarca.length ? conMarca : ls)
    .filter((l) => !/^(#|action items|tareas|compromisos|pr[oó]ximos pasos|next steps)\b/i.test(sinTildes(l)) && l.replace(/[^\p{L}]/gu, "").length >= 4);
  return elegidas.map((l) => leerRenglon(l, personas, hoy)).filter((x) => x.txt.length >= 3);
}

export default function Reuniones({ personas, P, yo, avisar, abrirTarea, propuestas, setPropuestas, crearTarea }) {
  const hoy = hoyIso();
  const [nombre, setNombre] = useState("");
  const [dia, setDia] = useState(hoy);
  const [notas, setNotas] = useState("");
  const [abierta, setAbierta] = useState(true);
  const [verResueltas, setVerResueltas] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const equipo = personas.filter((p) => p.rol !== "Solo prueba");

  const previa = useMemo(() => (notas.trim() ? separarTareas(notas, equipo, hoy) : []), [notas, equipo, hoy]);

  const proponer = async () => {
    if (!previa.length) return;
    const reunion = nombre.trim() || "Reunión del " + dia.split("-").reverse().join("/");
    const filas = previa.map((x) => ({ id: crypto.randomUUID(), reunion, reunion_dia: dia, txt: x.txt, resp: x.resp, fecha: x.fecha, tipo: x.tipo, prio: x.prio, estado: "pendiente", creado_por: yo, creado: new Date().toISOString() }));
    setPropuestas((ps) => filas.concat(ps));
    const { error } = await supabase.from("propuestas").insert(filas.map(({ creado, ...f }) => f));
    if (error) { setPropuestas((ps) => ps.filter((p) => !filas.some((f) => f.id === p.id))); avisar("No se pudieron guardar. Prueba de nuevo."); return; }
    setNotas(""); setNombre(""); setAbierta(false);
    avisar(filas.length + (filas.length === 1 ? " tarea para aprobar" : " tareas para aprobar"));
  };

  const cambiar = async (id, cambios) => {
    setPropuestas((ps) => ps.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    const { error } = await supabase.from("propuestas").update(cambios).eq("id", id);
    if (error) avisar("No se pudo guardar el cambio.");
  };
  const resolver = async (lista, aprobar) => {
    for (const p of lista) {
      setOcupado(p.id);
      if (aprobar) {
        const t = await crearTarea({ nombre: p.txt, tipo: p.tipo, prio: p.prio, resp: p.resp ? [p.resp] : [], fecha: p.fecha,
          descripcion: "De la reunión «" + p.reunion + "»" + (p.reunion_dia ? " del " + p.reunion_dia.split("-").reverse().join("/") : "") + "." });
        if (!t) { setOcupado(null); return; }
        await cambiar(p.id, { estado: "aprobada", tarea_id: t, resuelto_por: yo });
      } else {
        await cambiar(p.id, { estado: "descartada", resuelto_por: yo });
      }
    }
    setOcupado(null);
    avisar(aprobar ? (lista.length === 1 ? "Tarea creada" : lista.length + " tareas creadas") : "Descartada");
  };

  const pendientes = propuestas.filter((p) => p.estado === "pendiente");
  const porReunion = [];
  pendientes.forEach((p) => { let g = porReunion.find((x) => x.reunion === p.reunion && x.dia === p.reunion_dia); if (!g) porReunion.push(g = { reunion: p.reunion, dia: p.reunion_dia, items: [] }); g.items.push(p); });
  const resueltas = propuestas.filter((p) => p.estado !== "pendiente").slice(0, 40);

  const Persona = ({ p }) => {
    const [ab, setAb] = useState(false);
    const q = p.resp && P[p.resp];
    return (
      <span className="reu-sel">
        <button type="button" className={"reu-dato" + (q ? " puesto" : " falta")} onClick={() => setAb((v) => !v)}>
          {q ? <><span className="cara" style={{ background: q.color }}>{q.iniciales}</span>{q.nombre.split(" ")[0]}</> : "Falta responsable"}
        </button>
        {ab && (<>
          <button type="button" className="pop-fondo" onClick={() => setAb(false)} aria-label="Cerrar" />
          <span className="reu-menu">
            {equipo.map((x) => <button key={x.clave} type="button" className={"opt" + (p.resp === x.clave ? " on" : "")} onClick={() => { cambiar(p.id, { resp: x.clave }); setAb(false); }}>
              <span className="cara g" style={{ background: x.color }}>{x.iniciales}</span>{x.nombre}</button>)}
            {p.resp && <button type="button" className="quitar" onClick={() => { cambiar(p.id, { resp: null }); setAb(false); }}>Sin responsable</button>}
          </span>
        </>)}
      </span>
    );
  };

  return (
    <div className="reu">
      <section className="ini-card">
        <header className="ini-card-head">
          <h2 className="ini-h2">Sacar tareas de una reunión</h2>
          <button type="button" className="act-toggle" onClick={() => setAbierta((v) => !v)}>{abierta ? "Ocultar" : "Pegar notas"}</button>
        </header>
        {abierta && (<>
          <div className="reu-campos">
            <input className="reu-input" placeholder="Nombre de la reunión (ej. Daily de marketing)" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre de la reunión" />
            <input className="reu-input reu-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Día de la reunión" />
          </div>
          <textarea className="reu-notas" value={notas} onChange={(e) => setNotas(e.target.value)} aria-label="Notas de la reunión"
            placeholder={"Pega acá los compromisos o las notas de la reunión, uno por renglón. Por ejemplo:\n- Katherine: mandar el contrato a Pablo el viernes\n- Franco revisa la landing mañana, urgente\n- Pedir presupuesto de edición 25/11"} />
          {previa.length > 0 && (
            <div className="reu-previa">
              <span className="reu-previa-tit">Va a proponer {previa.length} {previa.length === 1 ? "tarea" : "tareas"}:</span>
              {previa.slice(0, 12).map((x, i) => (
                <span key={i} className="reu-previa-fila"><span className="reu-previa-txt">{x.txt}</span>
                  <span className="reu-previa-meta">{x.resp ? P[x.resp]?.nombre.split(" ")[0] : "sin responsable"} · {x.fecha ? fechaRel(hoy, x.fecha) : "sin fecha"}{x.prio ? " · urgente" : ""}</span></span>
              ))}
              {previa.length > 12 && <span className="reu-previa-meta">y {previa.length - 12} más</span>}
            </div>
          )}
          <div className="reu-acc">
            <span className="reu-ayuda">Se reconocen viñetas y números; el nombre de la persona y palabras como «mañana», «el viernes» o «25/11».</span>
            <button type="button" className="btn-pri" disabled={!previa.length} onClick={proponer}>Proponer {previa.length || ""} {previa.length === 1 ? "tarea" : "tareas"}</button>
          </div>
        </>)}
      </section>

      {!porReunion.length && (
        <div className="vacio">
          <span className="vacio-ico"><Svg tam={24} ancho={1.7}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg></span>
          <b>Nada para aprobar</b>
          <span>Pega las notas de una reunión arriba y las tareas aparecen acá para revisarlas antes de que lleguen al tablero.</span>
        </div>
      )}

      {porReunion.map((g) => {
        const sinFecha = g.items.filter((p) => !p.fecha).length;
        return (
          <section key={g.reunion + g.dia} className="ini-card reu-grupo">
            <header className="ini-card-head">
              <div><h2 className="ini-h2">{g.reunion}</h2><span className="reu-sub">{g.dia ? g.dia.split("-").reverse().join("/") + " · " : ""}{g.items.length} por aprobar</span></div>
              {g.items.length > 1 && <button type="button" className="btn-chico pri" disabled={!!ocupado || sinFecha > 0} title={sinFecha ? "Ponle fecha a todas para aprobarlas juntas" : undefined}
                onClick={() => resolver(g.items, true)}>Aprobar todas</button>}
            </header>
            {g.items.map((p) => (
              <div key={p.id} className={"reu-fila" + (ocupado === p.id ? " ocupado" : "")}>
                <input className="reu-txt" value={p.txt} maxLength={300} aria-label="Texto de la tarea"
                  onChange={(e) => setPropuestas((ps) => ps.map((x) => (x.id === p.id ? { ...x, txt: e.target.value } : x)))}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v) cambiar(p.id, { txt: v }); }} />
                <Persona p={p} />
                <input className={"reu-fecha" + (p.fecha ? "" : " falta")} type="date" value={p.fecha || ""} aria-label="Fecha"
                  title={p.fecha ? undefined : "Ponle fecha para poder aprobarla"} onChange={(e) => cambiar(p.id, { fecha: e.target.value || null })} />
                <button type="button" className={"reu-tipo " + p.tipo} onClick={() => cambiar(p.id, { tipo: p.tipo === "pro" ? "per" : "pro" })} title="Cambiar entre Profesional y Personal">{p.tipo === "pro" ? "Profesional" : "Personal"}</button>
                <button type="button" className="btn-chico pri" disabled={!!ocupado || !p.fecha} onClick={() => resolver([p], true)}>Aprobar</button>
                <button type="button" className="reu-desc" disabled={!!ocupado} onClick={() => resolver([p], false)} aria-label="Descartar" title="Descartar"><IcoX tam={13} /></button>
              </div>
            ))}
          </section>
        );
      })}

      {resueltas.length > 0 && (
        <div className="reu-hist">
          <button type="button" className="act-toggle" onClick={() => setVerResueltas((v) => !v)}>{verResueltas ? "Ocultar" : "Ver"} las ya resueltas ({resueltas.length})</button>
          {verResueltas && resueltas.map((p) => (
            <div key={p.id} className="reu-res">
              <span className={"reu-estado " + p.estado}>{p.estado === "aprobada" ? "Aprobada" : "Descartada"}</span>
              {p.tarea_id ? <button type="button" className="reu-link" onClick={() => abrirTarea(p.tarea_id)}>{p.txt}</button> : <span className="reu-res-txt">{p.txt}</span>}
              <span className="reu-sub">{p.reunion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
