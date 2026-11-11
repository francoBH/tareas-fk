"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Composer, Fotos, Svg, Texto } from "@/components/piezas";

/* ════════════════════════════════════════════════════════════════════════════════
   LA BANDEJA DE ENTRADA — copia de la de Blue OS (components/bandeja/BandejaEntrada.tsx
   y VistaPrevia.tsx), recortada a lo único que acá genera avisos: los HILOS.

   - Lista por día (Hoy · Ayer · Esta semana · Antes), una caja por día y una fila por
     tarea: [punto sin leer] [Profesional · Personal] [tarea en negrita] [cara + qué pasó +
     el comentario] [cuántos · hora], y al pasar el mouse el botón azul «Marcar leída».
   - Pestañas Todos · Profesional · Personal con lo sin leer de cada una, y «Ver también
     leídos». Abre mostrando sólo lo sin leer, como Blue OS.
   - Tocar una fila abre la VISTA PREVIA en el lugar de la lista: flechas para moverse,
     el comentario entero con lo que se dijo antes como contexto, y la caja para responder
     ahí mismo (con fotos). Responder o marcar leída pasa a la siguiente sin leer.
   - Teclas como en Blue OS: J / K para moverse, E para marcar leída, Enter abre, Esc vuelve.
   ════════════════════════════════════════════════════════════════════════════════ */

const IC_CHECK = <Svg tam={13} ancho={2.2}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
const IC_NO_LEIDA = <Svg tam={13} ancho={1.9}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="currentColor" /></Svg>;
const IC_ATRAS = <Svg tam={15} ancho={1.9}><path d="m15 18-6-6 6-6" /></Svg>;
const IC_ARRIBA = <Svg tam={15} ancho={1.9}><path d="m18 15-6-6-6 6" /></Svg>;
const IC_ABAJO = <Svg tam={15} ancho={1.9}><path d="m6 9 6 6 6-6" /></Svg>;
const IC_CERRAR = <Svg tam={13} ancho={2}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>;
const IC_BANDEJA = <Svg tam={24} ancho={1.7}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>;

function seccionDe(ts) {
  const d = new Date(ts), hoy = new Date();
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dif = Math.round((dia(hoy) - dia(d)) / 86400000);
  if (dif <= 0) return "Hoy";
  if (dif === 1) return "Ayer";
  if (dif < 7) return "Esta semana";
  return "Antes";
}
const ORDEN_SECCION = ["Hoy", "Ayer", "Esta semana", "Antes"];
function hora(ts) {
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}
function fechaHora(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}
const enRenglon = (t) => String(t || "").replace(/\s+/g, " ").trim();

function Pill({ activo, onClick, children, badge }) {
  return (
    <button type="button" className={"bdj-pill" + (activo ? " on" : "")} onClick={onClick}>
      {children}
      {badge > 0 && <span className="bdj-pill-n">{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}

function Chip({ tp }) {
  if (!tp) return null;
  return <span className="bdj-chip" style={{ "--bdj-c": tp.color }}>{tp.label}</span>;
}

export default function Bandeja({ items, coms, P, claves, yo, leidas, marcar, enviar, abrirTarea, urls, onVer, tipDe, ocupado, avisar }) {
  const [tipo, setTipo] = useState(null);
  const [soloSinLeer, setSoloSinLeer] = useState(true);
  const [previa, setPrevia] = useState(null); // { tareaId, ids, idx }
  const [apuntado, setApuntado] = useState(null);
  const [teclado, setTeclado] = useState(false);
  const [padreResp, setPadreResp] = useState(null);
  const refPrev = useRef(null);
  const refComposer = useRef(null);

  /* Las filas: una por tarea, con todos sus avisos apilados (como ClickUp y Blue OS). */
  const sinLeerDe = (lista) => lista.filter((x) => !leidas.has(x.c.id)).length;
  const porTipo = useMemo(() => {
    const o = { pro: 0, per: 0, todos: 0 };
    items.forEach((x) => { if (!leidas.has(x.c.id)) { o.todos++; o[x.t.tipo] = (o[x.t.tipo] || 0) + 1; } });
    return o;
  }, [items, leidas]);

  const grupos = useMemo(() => {
    const m = new Map();
    items.forEach((x) => {
      if (tipo && x.t.tipo !== tipo) return;
      if (soloSinLeer && leidas.has(x.c.id)) return;
      if (!m.has(x.t.id)) m.set(x.t.id, []);
      m.get(x.t.id).push(x);
    });
    return [...m.values()].map((filas) => {
      filas.sort((a, b) => a.c.creado.localeCompare(b.c.creado));
      const ultima = filas[filas.length - 1];
      return { tareaId: ultima.t.id, t: ultima.t, filas, ultima, ids: filas.map((f) => f.c.id), todasLeidas: filas.every((f) => leidas.has(f.c.id)) };
    }).sort((a, b) => b.ultima.c.creado.localeCompare(a.ultima.c.creado));
  }, [items, tipo, soloSinLeer, leidas]);

  const secciones = useMemo(() => {
    const s = {};
    grupos.forEach((g) => { const k = seccionDe(g.ultima.c.creado); (s[k] = s[k] || []).push(g); });
    return ORDEN_SECCION.filter((k) => s[k]).map((k) => [k, s[k]]);
  }, [grupos]);
  const orden = useMemo(() => secciones.flatMap(([, gs]) => gs), [secciones]);

  /* ── la vista previa ── */
  /* Lo que se abrió queda fijo (si se marca leída no se va de abajo), y suma lo que llegue
     nuevo de la misma tarea mientras está abierta. */
  const gp = useMemo(() => {
    if (!previa) return null;
    const propios = items.filter((x) => x.t.id === previa.tareaId && (previa.ids.includes(x.c.id) || !leidas.has(x.c.id)));
    if (!propios.length) return null;
    propios.sort((a, b) => a.c.creado.localeCompare(b.c.creado));
    const ultima = propios[propios.length - 1];
    return { tareaId: previa.tareaId, t: ultima.t, filas: propios, ultima, ids: propios.map((f) => f.c.id), todasLeidas: propios.every((f) => leidas.has(f.c.id)) };
  }, [previa, items, leidas]);
  useEffect(() => { if (previa && !gp) setPrevia(null); }, [previa, gp]);

  const posActual = () => {
    if (!previa) return -1;
    const i = orden.findIndex((g) => g.tareaId === previa.tareaId);
    return i;
  };
  const vecinos = () => {
    const i = posActual();
    if (i >= 0) return { anterior: orden[i - 1] || null, siguiente: orden[i + 1] || null };
    const k = previa ? previa.idx : 0; // ya no está en la lista: su lugar lo ocupa la que venía después
    return { anterior: orden[k - 1] || null, siguiente: orden[k] || null };
  };
  const proximaSinLeer = () => {
    const i = posActual();
    const base = i >= 0 ? i + 1 : (previa ? previa.idx : 0);
    const despues = orden.slice(base).find((g) => g.tareaId !== previa?.tareaId && !g.todasLeidas);
    if (despues) return despues;
    return orden.slice(0, Math.max(0, i)).find((g) => g.tareaId !== previa?.tareaId && !g.todasLeidas) || null;
  };
  const abrir = (g) => {
    if (!g) return;
    setApuntado(g.tareaId);
    setPadreResp(null);
    setPrevia({ tareaId: g.tareaId, ids: g.ids, idx: Math.max(0, orden.findIndex((x) => x.tareaId === g.tareaId)) });
  };
  const volver = () => { if (previa) setApuntado(previa.tareaId); setPrevia(null); };
  const seguir = () => { const p = proximaSinLeer(); if (p) abrir(p); else setPrevia(null); };

  const toggleGrupo = (g) => {
    const leer = !g.todasLeidas;
    marcar(g.ids, leer);
    avisar(leer ? "Marcada como leída" : "Marcada como no leída");
  };
  const toggleLeidaPrevia = () => {
    if (!gp) return;
    if (gp.todasLeidas) { marcar(gp.ids, false); avisar("Marcada como no leída"); return; }
    const p = proximaSinLeer();
    marcar(gp.ids, true);
    if (p) abrir(p); else setPrevia(null);
  };

  /* Al cambiar de aviso, la vista previa arranca arriba y con el foco en ella (no en el
     último botón tocado). */
  useEffect(() => { if (previa) { refPrev.current?.focus({ preventScroll: true }); refPrev.current?.scrollIntoView({ block: "start" }); } }, [previa?.tareaId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── teclas ── */
  useEffect(() => {
    const h = (e) => {
      if (ocupado || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "textarea" || tag === "input" || e.target?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (previa) {
        const { anterior, siguiente } = vecinos();
        if (k === "escape") { e.preventDefault(); volver(); }
        else if (k === "j" || e.key === "ArrowDown") { if (siguiente) { e.preventDefault(); abrir(siguiente); } }
        else if (k === "k" || e.key === "ArrowUp") { if (anterior) { e.preventDefault(); abrir(anterior); } }
        else if (k === "e") { e.preventDefault(); toggleLeidaPrevia(); }
        else if (k === "r") { e.preventDefault(); refComposer.current?.querySelector("textarea")?.focus(); }
        return;
      }
      if (!orden.length) return;
      const i = orden.findIndex((g) => g.tareaId === apuntado);
      if (k === "j" || e.key === "ArrowDown") { e.preventDefault(); setTeclado(true); setApuntado(orden[Math.min(orden.length - 1, i + 1)].tareaId); }
      else if (k === "k" || e.key === "ArrowUp") { e.preventDefault(); setTeclado(true); setApuntado(orden[Math.max(0, i - 1)].tareaId); }
      else if (k === "e" && i >= 0) { e.preventDefault(); toggleGrupo(orden[i]); }
      else if (e.key === "Enter" && i >= 0 && e.target === document.body) { e.preventDefault(); abrir(orden[i]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  useEffect(() => {
    if (!teclado || !apuntado || previa) return;
    document.getElementById("bdj-" + apuntado)?.scrollIntoView({ block: "nearest" });
  }, [apuntado, teclado, previa]);

  /* ══ la vista previa ══ */
  if (gp) {
    const { anterior, siguiente } = vecinos();
    const tp = tipDe(gp.t.tipo);
    const delHilo = coms.filter((c) => c.tarea_id === gp.tareaId).sort((a, b) => a.creado.localeCompare(b.creado));
    const avisos = new Map(gp.filas.map((f) => [f.c.id, f]));
    const primero = delHilo.findIndex((c) => avisos.has(c.id));
    const desde = Math.max(0, primero - 2);
    const mostrar = delHilo.slice(desde);
    /* El «Responder en este hilo» va UNA vez por hilo: debajo de su último mensaje a la vista. */
    const ultimoDelHilo = new Map();
    mostrar.forEach((c) => ultimoDelHilo.set(c.padre_id || c.id, c.id));
    /* Se responde en el hilo del último aviso, salvo que se elija otro con «Responder». */
    const raizDe = (c) => (c.padre_id ? c.padre_id : c.id);
    const padre = padreResp || raizDe(gp.ultima.c);
    const autorPadreId = delHilo.find((c) => c.id === padre)?.autor;
    const autorPadre = autorPadreId && autorPadreId !== yo ? P[autorPadreId]?.nombre?.split(" ")[0] : null;
    const idx = posActual() >= 0 ? posActual() + 1 : null;

    return (
      <div className={"bdj-prev" + (teclado ? " bdj-teclado" : "")} ref={refPrev} tabIndex={-1}>
        <nav className="bdj-prev-nav" aria-label="Moverse entre avisos">
          <button type="button" className="bdj-ibtn caja" onClick={volver} title="Volver a la lista · Esc" aria-label="Volver a la lista">{IC_ATRAS}</button>
          <div className="bdj-prev-flechas">
            <button type="button" className="bdj-ibtn" onClick={() => abrir(anterior)} disabled={!anterior} title="Aviso anterior · K" aria-label="Aviso anterior">{IC_ARRIBA}</button>
            <button type="button" className="bdj-ibtn" onClick={() => abrir(siguiente)} disabled={!siguiente} title="Aviso siguiente · J" aria-label="Aviso siguiente">{IC_ABAJO}</button>
          </div>
        </nav>

        <div className="bdj-prev-main">
          <header className="bdj-prev-cab">
            <div className="bdj-prev-tit">
              <div className="bdj-prev-camino">
                <span>Bandeja</span><span aria-hidden>›</span><span>{tp ? tp.largo : "Tarea"}</span>
                {idx && <span className="num">· {idx} de {orden.length}</span>}
              </div>
              <h2 className="bdj-prev-nombre">
                <Chip tp={tp} />
                <button type="button" className="bdj-prev-ir" onClick={() => abrirTarea(gp.tareaId)} title="Abrir la tarea">{gp.t.nombre}</button>
              </h2>
            </div>
            <div className="bdj-prev-acciones">
              <button type="button" className={"bdj-btn " + (gp.todasLeidas ? "sec" : "pri")} onClick={toggleLeidaPrevia}
                title={gp.todasLeidas ? "Marcar como no leída · E" : "Marcar como leída y pasar al siguiente · E"}>
                {gp.todasLeidas ? IC_NO_LEIDA : IC_CHECK}{gp.todasLeidas ? "Marcar no leída" : "Marcar leída"}
              </button>
              <button type="button" className="bdj-btn neutro" onClick={seguir} title="Pasar a la próxima sin leer, o volver a la lista si no queda ninguna">
                {IC_CERRAR}Cerrar
              </button>
            </div>
          </header>

          <section className="bdj-prev-caja">
            {mostrar.map((c) => {
              const aviso = avisos.get(c.id);
              const previo = !aviso && delHilo.indexOf(c) < primero;
              const p = P[c.autor] || { nombre: c.autor, iniciales: "?", color: "#555" };
              const verbo = aviso ? aviso.verbo : c.padre_id ? "respondió en el hilo" : "comentó";
              const enHilo = !!c.padre_id;
              return (
                <article key={c.id} className={"bdj-com" + (previo ? " previo" : "") + (enHilo ? " en-hilo" : "")}>
                  <div className="bdj-com-tarjeta">
                    <header className="bdj-com-cab">
                      <span className="cara g" style={{ background: p.color }}>{p.iniciales}</span>
                      <span className="bdj-com-autor">{c.autor === yo ? "Tú" : p.nombre}</span>
                      {!previo && <span className="bdj-com-verbo">{verbo}</span>}
                      {aviso && !leidas.has(c.id) && <span className="bdj-nuevo">Nuevo</span>}
                      <span className="bdj-com-fecha num">{fechaHora(c.creado)}</span>
                    </header>
                    <div className="bdj-com-cuerpo">
                      {c.txt ? <Texto txt={c.txt} P={P} /> : !(c.imagenes || []).length && !(c.locales || []).length && <span className="bdj-com-vacio">Sin texto.</span>}
                      <Fotos c={c} urls={urls} onVer={onVer} />
                    </div>
                  </div>
                  {!previo && ultimoDelHilo.get(raizDe(c)) === c.id && (
                    <button type="button" className={"bdj-link" + (padre === raizDe(c) ? " on" : "")}
                      onClick={() => { setPadreResp(raizDe(c)); setTimeout(() => refComposer.current?.querySelector("textarea")?.focus(), 0); }}>
                      {padre === raizDe(c) ? "Respondiendo en este hilo" : "Responder en este hilo"}
                    </button>
                  )}
                </article>
              );
            })}
          </section>

          <div className="bdj-resp" ref={refComposer}>
            <Composer key={gp.tareaId + padre} P={P} claves={claves}
              placeholder={"Responde en el hilo" + (autorPadre ? " de " + autorPadre : "") + " · @ para nombrar"}
              onEnviar={async (txt, archivos) => {
                const p = proximaSinLeer();
                const ok = await enviar(gp.tareaId, txt, padre, archivos);
                if (!ok) return false;
                marcar(gp.ids, true);
                avisar("Respuesta enviada");
                if (p) abrir(p);
                return true;
              }} />
            <span className="bdj-resp-ayuda">Enter envía · Shift + Enter hace otro renglón · al responder pasa a la siguiente sin leer</span>
          </div>
        </div>
      </div>
    );
  }

  /* ══ la lista ══ */
  return (
    <div className={"bdj" + (teclado ? " bdj-teclado" : "")} onMouseMove={() => { if (teclado) setTeclado(false); }}>
      <div className="bdj-filtros">
        <Pill activo={tipo === null} onClick={() => setTipo(null)} badge={porTipo.todos}>Todos</Pill>
        <Pill activo={tipo === "pro"} onClick={() => setTipo("pro")} badge={porTipo.pro}>Profesional</Pill>
        <Pill activo={tipo === "per"} onClick={() => setTipo("per")} badge={porTipo.per}>Personal</Pill>
        <span className="esp" />
        <Pill activo={!soloSinLeer} onClick={() => setSoloSinLeer(!soloSinLeer)}>{soloSinLeer ? "Ver también leídos" : "Ver sin leer"}</Pill>
      </div>

      {!grupos.length && (
        <div className="vacio">
          <span className="vacio-ico">{IC_BANDEJA}</span>
          <b>{soloSinLeer ? (items.length ? "Estás al día" : "Todavía no tienes avisos") : "Todavía no tienes avisos"}</b>
          <span>{soloSinLeer && items.length
            ? "No queda nada sin leer" + (tipo ? " en " + tipDe(tipo).label : "") + "."
            : "Cuando alguien comente una tarea tuya, te nombre o te responda, aparece acá."}</span>
          {soloSinLeer && items.length > 0 && <button type="button" className="btn" onClick={() => setSoloSinLeer(false)}>Ver también leídos</button>}
        </div>
      )}

      {secciones.map(([titulo, gs]) => (
        <div key={titulo} className="bdj-dia">
          <div className="bdj-dia-tit">{titulo}</div>
          <div className="bdj-caja">
            {gs.map((g) => {
              const n = g.ultima, p = P[n.c.autor] || { nombre: n.c.autor, iniciales: "?", color: "#555" };
              const leida = g.todasLeidas;
              const nSin = sinLeerDe(g.filas);
              const texto = enRenglon(n.c.txt) || ((n.c.imagenes || []).length ? "📷 Imagen" : "");
              return (
                <div key={g.tareaId} id={"bdj-" + g.tareaId}
                  className={"bdj-fila" + (apuntado === g.tareaId ? " activa" : "") + (leida ? " leida" : "")}
                  role="button" tabIndex={0}
                  onMouseMove={() => { if (apuntado !== g.tareaId) setApuntado(g.tareaId); }}
                  onMouseLeave={() => { if (!teclado) setApuntado((a) => (a === g.tareaId ? null : a)); }}
                  onFocus={() => setApuntado(g.tareaId)}
                  onClick={() => abrir(g)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(g); } }}
                  title={p.nombre + " " + n.verbo + ": " + enRenglon(n.c.txt)}>
                  <span className="bdj-punto" aria-hidden />
                  <Chip tp={tipDe(g.t.tipo)} />
                  <span className="bdj-nombre">{g.t.nombre}</span>
                  <span className="bdj-texto">
                    <span className="cara g" style={{ background: p.color }}>{p.iniciales}</span>
                    <span className="bdj-frase">
                      <span className="bdj-verbo">{p.nombre.split(" ")[0]} {n.verbo}</span>
                      {texto && <span className="bdj-detalle"> {texto}</span>}
                    </span>
                  </span>
                  <span className="bdj-der">
                    {g.filas.length > 1 && <span className="bdj-cuenta num" title={(leida ? g.filas.length : nSin) + " comentarios" + (leida ? "" : " sin leer")}>{leida ? g.filas.length : nSin}</span>}
                    <span className="bdj-hora num">{hora(n.c.creado)}</span>
                    <span className="bdj-acciones">
                      <button type="button" className={"bdj-btn " + (leida ? "sec" : "pri")}
                        onClick={(e) => { e.stopPropagation(); toggleGrupo(g); }} onKeyDown={(e) => e.stopPropagation()}
                        title={leida ? "Marcar como no leída · E" : "Marcar como leída · E"}>
                        {leida ? IC_NO_LEIDA : IC_CHECK}<span className="bdj-leida-txt">{leida ? "Marcar no leída" : "Marcar leída"}</span>
                      </button>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

