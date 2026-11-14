"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  atajos as atajosDe, calendario, cercania, dias, dow, fechaCorta, fechaCreacion, fechaLarga, fechaRel, hace, hoyIso, iso, mas, mesKey, sinTildes, tituloMes,
} from "@/lib/fechas";
import { IconoEstado, Bandera, Svg, IcoCal, IcoMas, IcoPuntos, IcoTacho, IcoLapiz, IcoRama, IcoTilde, IcoEnviar, Caret, IcoX, Caras, Texto, achicar, Fotos, Composer, Docs, ACEPTA, TIPOS_OK, PESO_MAX, esImagen } from "@/components/piezas";
import Bandeja from "@/components/Bandeja";
import VersionNueva from "@/components/VersionNueva";
import Feedback from "@/components/Feedback";
import Resumen, { armarBase, medirRango, minutosDe } from "@/components/Resumen";
import { ATAJOS_RECURRENCIA, DIAS_SEMANA_CORTO, diaSemanaDe, mismaRecurrencia, opcionesDelMes, siguienteVuelta, textoRecurrencia, vueltasEntre } from "@/lib/recurrencia";

/* ════════════════════════════════════════════════════════════════════════════════
   EL TABLERO — copia del de Blue OS («Todas» + «Mis tareas»), con Tipo en vez de
   departamento y objetivo. Mismas clases y medidas que la maqueta aprobada.
   ════════════════════════════════════════════════════════════════════════════════ */

const ESTADOS = [
  { id: "idea", label: "Idea", grupo: "Por iniciar", pill: "#8D8D8D" },
  { id: "sin", label: "Sin iniciar", grupo: "Por iniciar", pill: "#454F63" },
  { id: "prog", label: "En progreso", grupo: "Activos", pill: "#E8A500", ink: "#3A2E00" },
  { id: "rev", label: "En revisión", grupo: "Activos", pill: "#B8531C" },
  { id: "corr", label: "Corregir", grupo: "Activos", pill: "#B63936" },
  { id: "comp", label: "Completada", grupo: "Cerrado", pill: "#3A7D53" },
];
const PRIORIDADES = [
  { id: "urgente", label: "Urgente", pill: "#B3261E" },
  { id: "alta", label: "Alta", pill: "#E8A500", ink: "#3A2E00" },
  { id: "media", label: "Media", pill: "#2F74D6" },
  { id: "baja", label: "Baja", pill: "#5E677E" },
];
const TIPOS = [
  { id: "pro", label: "Profesional", largo: "Profesional · BlueHackers", color: "var(--pro)", ink: "var(--pro-ink)" },
  { id: "per", label: "Personal", largo: "Personal · Franco", color: "var(--per)", ink: "var(--per-ink)" },
];
const TIEMPOS = [[15, "15 min"], [30, "30 min"], [45, "45 min"], [60, "1 h"], [120, "2 h"], [240, "4 h"], [480, "1 día"]];
const IcoRepite = ({ tam = 12 }) => <Svg tam={tam} ancho={2}><path d="M17 2.5 20.5 6 17 9.5" /><path d="M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5" /><path d="M7 21.5 3.5 18 7 14.5" /><path d="M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5" /></Svg>;
const IcoPin = ({ tam = 15, lleno = false }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill={lleno ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6Z" /><path d="M12 15v6" fill="none" />
  </svg>
);
const RANGO_PRIO = { urgente: 0, alta: 1, media: 2, baja: 3 };
const estDe = (id) => ESTADOS.find((e) => e.id === id) || ESTADOS[1];
const priDe = (id) => PRIORIDADES.find((p) => p.id === id) || null;
const tipDe = (id) => TIPOS.find((x) => x.id === id) || null;
const parar = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };

/* ── HISTORIAL: una línea chica y gris por cambio, entre los comentarios (como Blue OS y ClickUp) ── */
function textoCambio(h, P) {
  const nom = (k) => (P[k] ? P[k].nombre.split(" ")[0] : k);
  const fecha = (f) => (f ? fechaCorta(String(f).slice(0, 10)) : null);
  const a = h.antes, d = h.despues;
  switch (h.campo) {
    case "creada": return ["creó la tarea"];
    case "estado": return ["cambió el estado", estDe(a).label, estDe(d).label];
    case "fecha": return !a ? ["puso la fecha", null, fecha(d)] : !d ? ["quitó la fecha", fecha(a)] : ["cambió la fecha", fecha(a), fecha(d)];
    case "prio": return !d ? ["quitó la prioridad", priDe(a)?.label] : ["cambió la prioridad", priDe(a)?.label || null, priDe(d)?.label];
    case "tipo": return ["cambió el tipo", tipDe(a)?.label, tipDe(d)?.label];
    case "nombre": return ["cambió el nombre", a, d];
    case "recurrencia": return !d ? ["dejó de repetirse"] : ["hizo que se repita", a ? textoRecurrencia(a) : null, textoRecurrencia(d)];
    case "resp": {
      const antes = a || [], ahora = d || [];
      const suma = ahora.filter((x) => !antes.includes(x)).map(nom), saca = antes.filter((x) => !ahora.includes(x)).map(nom);
      return [[suma.length ? "asignó a " + suma.join(" y ") : "", saca.length ? "sacó a " + saca.join(" y ") : ""].filter(Boolean).join(" · ") || "cambió los responsables"];
    }
    default: return ["cambió " + h.campo];
  }
}
function LineaCambio({ it, P, yo }) {
  let quien, partes, ico;
  if (it.v) {
    quien = it.v.por; partes = ["completó una vuelta", null, it.v.vencia ? "vencía " + fechaCorta(String(it.v.vencia).slice(0, 10)) : null]; ico = "rep";
  } else { quien = it.h.persona; partes = textoCambio(it.h, P); ico = it.h.campo; }
  const nombre = !quien ? "Alguien" : (P[quien]?.nombre.split(" ")[0] || quien);
  const [verbo, antes, despues] = partes;
  return (
    <div className="act-linea">
      <span className={"act-ico " + ico}>
        {ico === "estado" ? <Svg tam={11} ancho={2}><circle cx="12" cy="12" r="7" /></Svg>
          : ico === "fecha" ? <IcoCal tam={11} />
          : ico === "rep" || ico === "recurrencia" ? <IcoRepite tam={11} />
          : ico === "creada" ? <IcoMas tam={11} />
          : <Svg tam={11} ancho={2}><path d="M4.5 19.5h3.8L19 8.8a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4l-.7 3.1Z" /></Svg>}
      </span>
      <span className="act-txt"><b>{nombre}</b> {verbo}{antes && <> <s>{antes}</s></>}{despues && <> → <b className="act-nuevo">{despues}</b></>}</span>
      <span className="act-hora" title={new Date(it.ts).toLocaleString("es-AR")}>{hace(it.ts)}</span>
    </div>
  );
}

export default function Tablero({ personasLista, yo, tema, cambiarTema }) {
  const P = useMemo(() => Object.fromEntries(personasLista.map((p) => [p.clave, p])), [personasLista]);
  const claves = useMemo(() => personasLista.map((p) => p.clave), [personasLista]);
  const yoP = P[yo];
  const [hoy, setHoy] = useState(hoyIso());
  /* Arranca con la última copia guardada en el navegador: abre al instante, aunque el celular
     haya cerrado la pestaña, y se pone al día por detrás sin pantalla de carga. */
  const cache = useMemo(() => { try { return JSON.parse(localStorage.getItem("tf-datos") || "null"); } catch { return null; } }, []);
  const [filas, setFilas] = useState(() => cache?.filas || []);
  const [coms, setComs] = useState(() => cache?.coms || []);
  /* Cada vuelta completada de una recurrente (para el Resumen). */
  const [vueltas, setVueltas] = useState(() => cache?.vueltas || []);
  /* El historial de cambios de cada tarea (lo escribe la base sola). */
  const [historial, setHistorial] = useState(() => cache?.historial || []);
  /* PRIORIDADES FIJADAS: los ids de MIS tareas fijadas, en su orden (como Blue OS). */
  const [pines, setPines] = useState(() => cache?.pines || []);
  const [arrastrandoPin, setArrastrandoPin] = useState(null);
  const pinesRef = useRef(pines);
  pinesRef.current = pines;
  const [verCambios, setVerCambios] = useState(true);
  const [persoRep, setPersoRep] = useState(null);
  const [arrastraDesc, setArrastraDesc] = useState(false);
  const [subiendoDesc, setSubiendoDesc] = useState(0);
  /* Lo que YO ya leí de la bandeja (ids de comentarios). */
  const [leidas, setLeidas] = useState(() => new Set(cache?.leidas || []));
  const [cargando, setCargando] = useState(() => !cache);
  const [urls, setUrls] = useState({});
  const [visor, setVisor] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);

  const [vista, setVista] = useState("inicio");
  const [plegIni, setPlegIni] = useState({});
  const [perIni, setPerIni] = useState("semana");
  const [orden, setOrden] = useState("fecha");
  const [verComp, setVerComp] = useState(false);
  const [plegados, setPlegados] = useState({});
  const [sel, setSel] = useState({});
  const [pop, setPop] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [nueva, setNueva] = useState(null);
  const [ren, setRen] = useState(null);
  const [renDraft, setRenDraft] = useState("");
  const [editTit, setEditTit] = useState(false);
  const [titDraft, setTitDraft] = useState("");
  const [editDesc, setEditDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [subsAbiertas, setSubsAbiertas] = useState(true);
  const [agregandoSub, setAgregandoSub] = useState(false);
  const [subDraft, setSubDraft] = useState("");
  const [com, setCom] = useState("");
  const [resp, setResp] = useState(null);
  const [respDraft, setRespDraft] = useState("");
  const [edit, setEdit] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [calMes, setCalMes] = useState(null);
  const [borrarConf, setBorrarConf] = useState(false);
  const [loteBorrar, setLoteBorrar] = useState(false);
  const [toast, setToast] = useState(null);
  const rootRef = useRef(null);
  const pendientes = useRef(new Map());
  const [fbAbierto, setFbAbierto] = useState(false);
  const tt = useRef(null);

  const salir = () => { try { localStorage.removeItem("tf-datos"); localStorage.removeItem("tf-yo"); } catch {} supabase.auth.signOut(); };
  const avisar = useCallback((t) => { setToast(t); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(null), 2600); }, []);

  /* ── lectura y tiempo real ── */
  const cargar = useCallback(async () => {
    const [a, b, l, v, hi, pr] = await Promise.all([
      supabase.from("tareas").select("*").order("creada", { ascending: true }),
      supabase.from("comentarios").select("*").order("creado", { ascending: true }),
      supabase.from("lecturas").select("comentario_id"),
      supabase.from("vueltas").select("*"),
      supabase.from("historial").select("*").order("creado", { ascending: true }),
      supabase.from("prioridades").select("tarea_id, orden").order("orden", { ascending: true }),
    ]);
    if (!pr.error) setPines((pr.data || []).map((x) => x.tarea_id));
    if (!v.error) setVueltas(v.data || []);
    if (!hi.error) setHistorial(hi.data || []);
    if (a.error || b.error) { setErrorCarga(true); setCargando(false); return; }
    setErrorCarga(false);
    setFilas(a.data || []);
    setComs(b.data || []);
    if (!l.error) setLeidas(new Set((l.data || []).map((x) => x.comentario_id)));
    setCargando(false);
  }, []);

  /* Los cambios de los demás llegan DE A UNO y se aplican sobre lo que hay: antes cada cambio
     volvía a leer el tablero entero (y pisaba lo que uno estaba moviendo). */
  useEffect(() => {
    cargar();
    const aplicarCambio = (setter) => (p) => {
      if (p.eventType === "DELETE") { const id = p.old?.id; if (id) setter((xs) => xs.filter((x) => x.id !== id)); return; }
      const fila = p.new;
      if (!fila?.id) return;
      setter((xs) => {
        const i = xs.findIndex((x) => x.id === fila.id);
        if (i < 0) return xs.concat([fila]);
        const n = xs.slice(); n[i] = { ...xs[i], ...fila }; return n;
      });
    };
    const canal = supabase.channel("tablero")
      .on("postgres_changes", { event: "*", schema: "public", table: "tareas" }, aplicarCambio(setFilas))
      .on("postgres_changes", { event: "*", schema: "public", table: "comentarios" }, aplicarCambio(setComs))
      .on("postgres_changes", { event: "*", schema: "public", table: "vueltas" }, aplicarCambio(setVueltas))
      .on("postgres_changes", { event: "*", schema: "public", table: "historial" }, aplicarCambio(setHistorial))
      /* Las prioridades son de cada uno: lo que cambie en otro dispositivo se vuelve a leer. */
      .on("postgres_changes", { event: "*", schema: "public", table: "prioridades" }, () => {
        supabase.from("prioridades").select("tarea_id, orden").order("orden", { ascending: true }).then(({ data, error }) => { if (!error) setPines((data || []).map((x) => x.tarea_id)); });
      })
      /* Lo leído en otro dispositivo (la compu y el celular) se refleja solo. */
      .on("postgres_changes", { event: "*", schema: "public", table: "lecturas" }, (p) => {
        const id = p.eventType === "DELETE" ? p.old?.comentario_id : p.new?.comentario_id;
        if (!id) return;
        setLeidas((s) => { if ((p.eventType !== "DELETE") === s.has(id)) return s; const n = new Set(s); if (p.eventType === "DELETE") n.delete(id); else n.add(id); return n; });
      })
      .subscribe();
    const reloj = setInterval(() => setHoy(hoyIso()), 60000);
    /* Al volver a la pestaña se pone al día EN SILENCIO (sin pantalla de carga) y solo si estuvo
       un rato afuera: lo que pasó mientras el celular dormía no llega por el canal en vivo. */
    let afuera = 0;
    const alVolver = () => {
      if (document.visibilityState === "hidden") { afuera = Date.now(); return; }
      setHoy(hoyIso());
      if (afuera && Date.now() - afuera > 20000) cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => { supabase.removeChannel(canal); clearInterval(reloj); document.removeEventListener("visibilitychange", alVolver); };
  }, [cargar]);

  /* La copia del navegador se guarda sola, un rato después del último cambio. */
  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem("tf-datos", JSON.stringify({ filas: filas.filter((f) => !String(f.id).startsWith("tmp-")), coms: coms.filter((c) => !String(c.id).startsWith("tmp-") && !c.subiendo), leidas: [...leidas], vueltas, historial: historial.slice(-400), pines })); } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [filas, coms, leidas, vueltas, historial, pines]);

  /* Las imágenes son privadas: se piden links firmados (valen 7 días) para las que falten. */
  useEffect(() => {
    const faltan = [...new Set(coms.flatMap((c) => (c.imagenes || []).concat((c.archivos || []).map((a) => a.ruta).filter(Boolean)))
      .concat(filas.flatMap((f) => (f.adjuntos || []).map((a) => a.ruta))))].filter((p) => p && !urls[p]);
    if (!faltan.length) return;
    supabase.storage.from("adjuntos").createSignedUrls(faltan, 604800).then(({ data }) => {
      if (!data) return;
      setUrls((u) => { const n = { ...u }; data.forEach((d) => { if (d.signedUrl && !n[d.path]) n[d.path] = d.signedUrl; }); return n; });
    });
  }, [coms, filas, urls]);

  /* Las tareas con sus comentarios armados en hilo. */
  const tareas = useMemo(() => {
    const porTarea = {};
    coms.forEach((c) => { (porTarea[c.tarea_id] = porTarea[c.tarea_id] || []).push(c); });
    return filas.map((r) => {
      const lista = porTarea[r.id] || [];
      const raiz = lista.filter((c) => !c.padre_id).map((c) => ({ ...c, hilo: lista.filter((x) => x.padre_id === c.id) }));
      return {
        ...r, resp: r.resp || [], subs: r.subtareas || [], desc: r.descripcion || "", seguidores: r.seguidores || [],
        creadaDia: r.creada ? iso(new Date(r.creada)) : hoy, coms: raiz, nComs: lista.length,
      };
    });
  }, [filas, coms, hoy]);

  /* ── escritura ── */
  const aDb = (c) => {
    const o = {};
    Object.keys(c).forEach((k) => {
      if (k === "desc") o.descripcion = c[k];
      else if (k === "subs") o.subtareas = c[k];
      else o[k] = c[k];
    });
    return o;
  };
  const guardar = useCallback(async (ids, cambios) => {
    await Promise.all(ids.map((id) => pendientes.current.get(id)).filter(Boolean));
    /* 🔁 Una RECURRENTE no se cierra: al completarla pasa a su próxima fecha y vuelve a «Sin
       iniciar», con sus subtareas destildadas (como Blue OS). La vuelta queda anotada. */
    if (cambios.estado === "comp") {
      const rec = filas.filter((f) => ids.includes(f.id) && f.recurrencia);
      if (rec.length) {
        const resto = ids.filter((id) => !rec.some((f) => f.id === id));
        const hoyD = hoyIso();
        const textos = [];
        for (const f of rec) {
          const prox = siguienteVuelta(f.fecha, f.recurrencia, hoyD);
          if (!prox) { resto.push(f.id); continue; }
          const patch = { ...aDb(cambios), estado: "sin", fecha: prox.fecha, fecha_original: prox.fecha, recurrencia: prox.recurrencia, iniciada: null, completada: null,
            subtareas: (f.subtareas || []).map((x) => ({ ...x, hecha: false })) };
          const vuelta = { id: crypto.randomUUID(), tarea_id: f.id, vencia: f.fecha, completada: new Date().toISOString(), por: yo, resp: f.resp || [], iniciada: f.iniciada || null };
          setFilas((fs) => fs.map((x) => (x.id === f.id ? { ...x, ...patch } : x)));
          setVueltas((vs) => vs.concat([vuelta]));
          textos.push(fechaRel(hoyD, prox.fecha).toLowerCase());
          const [u, i] = await Promise.all([
            supabase.from("tareas").update(patch).eq("id", f.id),
            supabase.from("vueltas").insert(vuelta),
          ]);
          if (u.error || i.error) { avisar("No se pudo guardar. Vuelve a intentar."); cargar(); return; }
        }
        if (rec.length === 1 && textos.length) avisar("Lista. Vuelve " + (/^\d/.test(textos[0]) ? "el " : "") + textos[0]);
        else if (textos.length) avisar(textos.length + " recurrentes pasaron a su próxima fecha");
        if (!resto.length) return;
        ids = resto;
      }
    }
    const db = aDb(cambios);
    setFilas((fs) => fs.map((f) => (ids.includes(f.id) ? { ...f, ...db } : f)));
    /* Una prioridad que se completa sale sola de la lista: si no, ocuparía uno de los 20 lugares sin verse. */
    if (cambios.estado === "comp") {
      const fijadas = ids.filter((id) => pinesRef.current.includes(id));
      if (fijadas.length) {
        setPines((xs) => xs.filter((x) => !fijadas.includes(x)));
        supabase.from("prioridades").delete().eq("persona", yo).in("tarea_id", fijadas).then(() => {});
      }
    }
    const { error } = await supabase.from("tareas").update(db).in("id", ids);
    if (error) { avisar("No se pudo guardar. Vuelve a intentar."); cargar(); }
  }, [avisar, cargar, filas, yo]);
  const cambiarTarea = (id, cambios) => guardar([id], cambios);
  const aplicar = (target, cambios) => {
    if (target === "nueva") { setNueva((n) => ({ ...n, ...cambios })); return; }
    if (target === "lote") { guardar(Object.keys(sel), cambios); return; }
    cambiarTarea(target, cambios);
  };
  const valorDe = (target, campo) => {
    if (target === "nueva") return nueva ? nueva[campo] : null;
    if (target === "lote") return null;
    const t = tareas.find((x) => x.id === target);
    return t ? t[campo] : null;
  };

  /* ── popovers ── */
  const abrirPop = (e, tipo, target, ancho, alto) => {
    parar(e);
    if (pop && pop.tipo === tipo && pop.target === target) { setPop(null); return; }
    const root = rootRef.current;
    let left = 40, top = 80;
    if (root && e && e.currentTarget) {
      const r = e.currentTarget.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const z = rr.width / (root.offsetWidth || rr.width) || 1;
      const W = root.offsetWidth, H = root.offsetHeight;
      left = (r.left - rr.left) / z; top = (r.bottom - rr.top) / z + 4;
      if (left + ancho > W - 8) left = Math.max(8, W - 8 - ancho);
      if (top + alto > H - 8) { const arriba = (r.top - rr.top) / z - 4 - alto; top = arriba > 8 ? arriba : Math.max(8, H - 8 - alto); }
    }
    if (tipo === "fecha") setCalMes((valorDe(target, "fecha") || hoy).slice(0, 7));
    setPersoRep(null);
    setBorrarConf(false);
    setPop({ tipo, target, left, top, ancho });
  };
  const cerrarPop = () => setPop(null);

  /* ── crear ── */
  const defaultsGrupo = (key) => {
    const base = { nombre: "", resp: [yo], fecha: hoy, prio: null, tipo: vista === "todas" || vista === "rec" || vista === "inicio" ? null : vista, estado: "sin", recurrencia: vista === "rec" ? { regla: "semanal" } : null };
    if (orden === "fecha" || vista === "inicio") {
      const mapa = { atrasadas: hoy, hoy, manana: mas(hoy, 1), semana: mas(hoy, 2), siguiente: mas(hoy, 7), adelante: mas(hoy, 14), sinfecha: null };
      base.fecha = key in mapa ? mapa[key] : hoy;
    }
    if (orden === "prioridad") base.prio = key === "ninguna" ? null : key;
    if (orden === "tipo") base.tipo = key;
    if (orden === "estado") base.estado = key;
    if (orden === "responsable") base.resp = key === "nadie" ? [] : [key];
    return base;
  };
  const abrirNueva = (grupo) => { setNueva({ grupo, ...defaultsGrupo(grupo) }); setPop(null); setAbierta(null); };
  const guardarNueva = async () => {
    const n = nueva;
    if (!n || !n.nombre.trim() || !n.tipo) return;
    /* La tarea aparece YA, con un id provisorio, y se cambia por la de la base cuando vuelve. */
    const id = crypto.randomUUID();
    const fila = { id, nombre: n.nombre.trim(), tipo: n.tipo, estado: n.estado, prio: n.prio, resp: n.resp, fecha: n.fecha, creado_por: yo, recurrencia: n.recurrencia || null };
    /* Recién creada se abre ENTERA, con la descripción lista para escribir (pedido de Franco,
       14 nov 2026): el nombre solo no alcanza para que el otro sepa qué hacer. */
    setNueva(null);
    setFilas((fs) => fs.concat([{ ...fila, creada: new Date().toISOString(), subtareas: [], seguidores: [], descripcion: "", adjuntos: [] }]));
    abrirTarea(id);
    setEditDesc(true); setDescDraft("");
    /* Lo que se edite antes de que la base confirme espera a que la tarea exista (ver `guardar`). */
    const alta = supabase.from("tareas").insert(fila).select().single();
    pendientes.current.set(id, alta);
    const { data, error } = await alta;
    pendientes.current.delete(id);
    if (error) { setFilas((fs) => fs.filter((f) => f.id !== id)); setAbierta(null); avisar("No se pudo crear la tarea."); return; }
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...data, ...f, creada: data.creada } : f)));
  };

  /* ── prioridades fijadas ── */
  const TOPE_PINES = 20;
  const guardarOrdenPines = async (ids) => {
    const { error } = await supabase.from("prioridades").upsert(ids.map((id, i) => ({ persona: yo, tarea_id: id, orden: i })), { onConflict: "persona,tarea_id" });
    if (error) { avisar("No se pudo guardar el orden."); cargar(); }
  };
  const fijar = async (id) => {
    if (pines.includes(id)) return;
    if (pines.length >= TOPE_PINES) { avisar("Ya tienes 20 prioridades. Saca una para fijar otra: si son veinte, ya no son prioridades."); return; }
    const ids = pines.concat([id]);
    setPines(ids);
    const { error } = await supabase.from("prioridades").insert({ persona: yo, tarea_id: id, orden: ids.length - 1 });
    if (error) { setPines((xs) => xs.filter((x) => x !== id)); avisar("No se pudo fijar."); return; }
    avisar("Fijada en tus prioridades");
  };
  const desfijar = async (id) => {
    setPines((xs) => xs.filter((x) => x !== id));
    const { error } = await supabase.from("prioridades").delete().eq("persona", yo).eq("tarea_id", id);
    if (error) { avisar("No se pudo sacar."); cargar(); }
  };
  const moverPin = (id, paso) => {
    const i = pines.indexOf(id), j = i + paso;
    if (i < 0 || j < 0 || j >= pines.length) return;
    const ids = pines.slice(); ids.splice(i, 1); ids.splice(j, 0, id);
    setPines(ids); guardarOrdenPines(ids);
  };
  const irA = (v) => { setVista(v); setSel({}); setNueva(null); setPop(null); };
  const abrirTarea = (id) => { setAbierta(id); setPop(null); setEditTit(false); setEditDesc(false); setAgregandoSub(false); setResp(null); setEdit(null); setCom(""); };

  /* ── comentarios ── */
  /* El comentario se ve al instante (con sus fotos locales) mientras las imágenes suben. Si algo
     falla, desaparece y el texto vuelve a la caja para no perder lo escrito. */
  /* Sube UN archivo al cajón de la tarea. Las fotos se achican antes; los documentos van tal cual.
     Devuelve { ruta, nombre, tipo, peso }. */
  const subirArchivo = async (tarea, file) => {
    const archivo = esImagen(file.type) ? await achicar(file) : file;
    const ext = (file.name.includes(".") ? file.name.split(".").pop() : (archivo.type.split("/")[1] || "bin")).toLowerCase().replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const ruta = tarea + "/" + crypto.randomUUID() + "." + ext;
    const { error } = await supabase.storage.from("adjuntos").upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    if (error) throw error;
    return { ruta, nombre: file.name || "archivo." + ext, tipo: archivo.type, peso: archivo.size };
  };
  const enviarComentario = async (txt, padre, archivos = [], tareaId) => {
    const t = txt.trim();
    const tarea = tareaId || abierta;
    if ((!t && !archivos.length) || !tarea) return false;
    const id = crypto.randomUUID();
    const imgs = archivos.filter((a) => a.img), docs = archivos.filter((a) => !a.img);
    const locales = imgs.map((a) => a.url);
    const docsLocales = docs.map((a) => ({ nombre: a.file.name, tipo: a.file.type, peso: a.file.size }));
    setComs((cs) => cs.concat([{ id, tarea_id: tarea, padre_id: padre || null, autor: yo, txt: t, imagenes: [], archivos: docsLocales, locales, editado: false, creado: new Date().toISOString(), subiendo: archivos.length > 0 }]));
    try {
      const subidasImg = await Promise.all(imgs.map((a) => subirArchivo(tarea, a.file)));
      const subidasDoc = await Promise.all(docs.map((a) => subirArchivo(tarea, a.file)));
      const rutas = subidasImg.map((x) => x.ruta);
      setUrls((u) => { const n = { ...u }; rutas.forEach((r, i) => { n[r] = locales[i]; }); return n; });
      const { data, error } = await supabase.from("comentarios").insert({ id, tarea_id: tarea, padre_id: padre || null, autor: yo, txt: t, imagenes: rutas, archivos: subidasDoc }).select().single();
      if (error) throw error;
      setComs((cs) => cs.map((c) => (c.id === id ? data : c)));
      return true;
    } catch {
      setComs((cs) => cs.filter((c) => c.id !== id));
      avisar(archivos.length ? "No se pudo subir el archivo. Prueba de nuevo." : "No se pudo enviar el comentario.");
      return false;
    }
  };
  /* Adjuntos de la DESCRIPCIÓN: se suben y se suman a la lista de la tarea. */
  const adjuntarDesc = async (tareaId, files) => {
    const todos = [...(files || [])];
    const ok = todos.filter((f) => TIPOS_OK.includes(f.type) && f.size <= PESO_MAX);
    if (ok.length < todos.length) avisar(todos.some((f) => f.size > PESO_MAX) ? "Hay archivos de más de 25 MB: esos no se suben." : "Ese tipo de archivo no se puede subir.");
    if (!ok.length) return;
    setSubiendoDesc((n) => n + ok.length);
    try {
      const nuevos = await Promise.all(ok.map((f) => subirArchivo(tareaId, f)));
      ok.forEach((f, i) => { if (esImagen(f.type)) { const u = URL.createObjectURL(f); setUrls((x) => ({ ...x, [nuevos[i].ruta]: u })); } });
      const actual = (filas.find((f) => f.id === tareaId)?.adjuntos) || [];
      await guardar([tareaId], { adjuntos: actual.concat(nuevos) });
    } catch { avisar("No se pudo subir el archivo. Prueba de nuevo."); }
    setSubiendoDesc((n) => Math.max(0, n - ok.length));
  };
  const quitarAdjunto = (t, a) => {
    guardar([t.id], { adjuntos: (t.adjuntos || []).filter((x) => x.ruta !== a.ruta) });
    supabase.storage.from("adjuntos").remove([a.ruta]);
    avisar("Archivo quitado");
  };
  const editarComentario = async (id, txt) => {
    setComs((cs) => cs.map((c) => (c.id === id ? { ...c, txt, editado: true } : c)));
    const { error } = await supabase.from("comentarios").update({ txt, editado: true }).eq("id", id);
    if (error) { avisar("No se pudo editar."); cargar(); }
  };
  const borrarComentario = async (id) => {
    const fotos = coms.filter((c) => c.id === id || c.padre_id === id).flatMap((c) => (c.autor === yo ? (c.imagenes || []).concat((c.archivos || []).map((a) => a.ruta)) : []));
    if (fotos.length) supabase.storage.from("adjuntos").remove(fotos);
    setComs((cs) => cs.filter((c) => c.id !== id && c.padre_id !== id));
    const { error } = await supabase.from("comentarios").delete().eq("id", id);
    if (error) { avisar("No se pudo borrar."); cargar(); } else avisar("Comentario borrado");
  };

  /* ── la bandeja: qué comentarios de los demás me tocan, y si ya los leí ── */
  const marcar = useCallback(async (ids, leer) => {
    if (!ids.length) return;
    setLeidas((s) => { const n = new Set(s); ids.forEach((id) => (leer ? n.add(id) : n.delete(id))); return n; });
    const { error } = leer
      ? await supabase.from("lecturas").upsert(ids.map((id) => ({ persona: yo, comentario_id: id })), { onConflict: "persona,comentario_id", ignoreDuplicates: true })
      : await supabase.from("lecturas").delete().eq("persona", yo).in("comentario_id", ids);
    if (error) { avisar("No se pudo marcar. Vuelve a intentar."); cargar(); }
  }, [yo, avisar, cargar]);
  /* Me toca un comentario de otra persona si: me nombró, respondió algo mío, respondió en un
     hilo donde yo escribí, o es de una tarea donde soy responsable, la sigo o la creé. */
  const itemsBandeja = useMemo(() => {
    const porId = new Map(coms.map((c) => [c.id, c]));
    const tPorId = new Map(filas.map((f) => [f.id, f]));
    const miNombre = yoP ? "@" + yoP.nombre : null;
    const hilosMios = new Set(coms.filter((c) => c.autor === yo).map((c) => c.padre_id || c.id));
    const out = [];
    coms.forEach((c) => {
      if (c.autor === yo || c.subiendo) return;
      const t = tPorId.get(c.tarea_id);
      if (!t) return;
      const padre = c.padre_id ? porId.get(c.padre_id) : null;
      let verbo = null;
      if (miNombre && (c.txt || "").includes(miNombre)) verbo = "te nombró";
      else if (padre && padre.autor === yo) verbo = "respondió tu comentario";
      else if (c.padre_id && hilosMios.has(c.padre_id)) verbo = "respondió en el hilo";
      else if ((t.resp || []).includes(yo) || (t.seguidores || []).includes(yo) || t.creado_por === yo) verbo = c.padre_id ? "respondió en el hilo" : "comentó";
      if (verbo) out.push({ c, t, verbo });
    });
    return out;
  }, [coms, filas, yo, yoP]);
  const sinLeerBandeja = itemsBandeja.filter((x) => !leidas.has(x.c.id)).length;
  /* Abrir la tarea y ver su hilo cuenta como leer sus avisos (como ClickUp). */
  useEffect(() => {
    if (!abierta) return;
    const ids = itemsBandeja.filter((x) => x.t.id === abierta && !leidas.has(x.c.id)).map((x) => x.c.id);
    if (ids.length) marcar(ids, true);
  }, [abierta, itemsBandeja, leidas, marcar]);

  /* ══ armado ══ */
  const q = sinTildes(busca.trim());
  const deVista = tareas.filter((t) => vista === "todas" || (vista === "inicio" ? t.resp.includes(yo) : vista === "rec" ? !!t.recurrencia : t.tipo === vista));
  const visibles = deVista
    .filter((t) => ((verComp && vista !== "inicio") || t.estado !== "comp") && (vista === "inicio" || !q || sinTildes(t.nombre).includes(q)))
    .sort((a, b) => {
      const fa = a.fecha || "9999", fb = b.fecha || "9999";
      if (fa !== fb) return fa < fb ? -1 : 1;
      return (RANGO_PRIO[a.prio] ?? 9) - (RANGO_PRIO[b.prio] ?? 9);
    });

  let defs;
  if (orden === "fecha" || vista === "inicio") {
    defs = [["atrasadas", "Atrasadas"], ["hoy", "Hoy"], ["manana", "Mañana"], ["semana", "Esta semana"], ["siguiente", "Semana siguiente"], ["adelante", "Más adelante"], ["sinfecha", "Sin fecha"]]
      .map(([key, label]) => ({ key, label, texto: true, color: key === "atrasadas" ? "var(--neg)" : key === "sinfecha" ? "var(--t3)" : "var(--t1)", de: (t) => cercania(hoy, t.fecha) === key }));
  } else if (orden === "prioridad") {
    defs = PRIORIDADES.map((p) => ({ key: p.id, label: p.label, bg: p.pill, ink: p.ink || "#FFFFFF", de: (t) => t.prio === p.id }))
      .concat([{ key: "ninguna", label: "Sin prioridad", bg: "#8D8D8D", ink: "#FFFFFF", de: (t) => !t.prio }]);
  } else if (orden === "tipo") {
    defs = TIPOS.map((x) => ({ key: x.id, label: x.largo, bg: x.color, ink: x.ink, de: (t) => t.tipo === x.id }));
  } else if (orden === "estado") {
    defs = ESTADOS.map((e) => ({ key: e.id, label: e.label.toUpperCase(), bg: e.pill, ink: e.ink || "#FFFFFF", de: (t) => t.estado === e.id }));
  } else {
    defs = claves.map((id) => ({ key: id, label: P[id].nombre, bg: "var(--bg-4)", ink: "var(--t1)", de: (t) => t.resp.includes(id) }))
      .concat([{ key: "nadie", label: "Sin responsable", bg: "var(--bg-4)", ink: "var(--t3)", de: (t) => !t.resp.length }]);
  }
  const grupos = [];
  const ordenIds = [];
  defs.forEach((g) => {
    const lista = visibles.filter(g.de);
    const nuevaAqui = !!(nueva && nueva.grupo === g.key);
    if (!lista.length && !nuevaAqui) return;
    lista.forEach((t) => { if (!ordenIds.includes(t.id)) ordenIds.push(t.id); });
    grupos.push({ ...g, lista, nuevaAqui });
  });
  const saltar = (paso) => {
    const i = ordenIds.indexOf(abierta);
    if (i < 0 || !ordenIds.length) return;
    abrirTarea(ordenIds[(i + paso + ordenIds.length) % ordenIds.length]);
  };

  const urgentes = (tipo) => tareas.filter((t) => (tipo === "todas" || (tipo === "rec" ? !!t.recurrencia : t.tipo === tipo)) && t.estado !== "comp" && t.fecha && dias(hoy, t.fecha) <= 0).length;
  const navs = [{ id: "todas", label: "Todas" }].concat(TIPOS.map((x) => ({ id: x.id, label: x.label, color: x.color })), [{ id: "rec", label: "Recurrentes" }]);
  const vistaTipo = tipDe(vista);
  const abiertasVista = deVista.filter((t) => t.estado !== "comp").length;
  const selIds = Object.keys(sel).filter((id) => tareas.some((t) => t.id === id));
  const tA = abierta ? tareas.find((t) => t.id === abierta) : null;
  const nadaDeNada = deVista.length === 0;
  const hayVacio = !cargando && !grupos.length && !(nueva && nueva.grupo === "__top");
  const abiertoPop = (tipo, id) => (pop && pop.target === id && pop.tipo === tipo ? "on" : "");

  /* ══ INICIO — copia del Inicio de Blue OS (components/inicio/InicioPersonal.tsx): el saludo con la
     fecha, la franja de «hoy», tus tareas agrupadas por fecha y «Tus números». Los números salen
     de la MISMA cuenta que el Resumen (medirRango), así las dos pantallas dicen lo mismo. ══ */
  const inicio = () => {
    const DIAS_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const MESES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const pd = hoy.split("-").map(Number);
    const fechaTxt = DIAS_L[dow(hoy)] + " " + pd[2] + " de " + MESES_L[pd[1] - 1];
    const misAbiertas = tareas.filter((t) => t.resp.includes(yo) && t.estado !== "comp");
    const deHoy = misAbiertas.filter((t) => t.fecha === hoy).length;
    const atras = misAbiertas.filter((t) => t.fecha && t.fecha < hoy).length;
    const titulo = !deHoy && !atras ? "No tienes tareas para hoy"
      : (deHoy ? (deHoy === 1 ? "1 tarea para hoy" : deHoy + " tareas para hoy") : "Nada nuevo para hoy") + (atras ? " · " + atras + (atras === 1 ? " atrasada" : " atrasadas") : "");
    /* Los números: esta semana (lunes a hoy) o este mes, contra el mismo largo de antes. */
    const dw = dow(hoy) === 0 ? 7 : dow(hoy);
    const d = perIni === "semana" ? mas(hoy, 1 - dw) : hoy.slice(0, 8) + "01";
    const largo = dias(d, hoy) + 1;
    const base = armarBase(tareas, vueltas);
    const m = medirRango(base, d, hoy, hoy), a = medirRango(base, mas(d, -largo), mas(d, -1), hoy);
    const pctTxt = (x, y) => (y > 0 ? Math.round((x / y) * 100) : 0);
    const horas = (mn) => (!mn ? "0 h" : mn < 60 ? mn + " min" : (Math.round((mn / 60) * 10) / 10).toString().replace(".", ",") + " h");
    const cmp = (ahora, antes, fmt, mejorSube = true) => {
      const dif = ahora - antes;
      return { antes: "antes " + fmt(antes), igual: dif === 0, sube: dif > 0, tono: dif === 0 ? "" : (dif > 0) === mejorSube ? "mejor" : "peor" };
    };
    const cumpl = pctTxt(m.cumplidas.length, m.vencian.length), cumplA = pctTxt(a.cumplidas.length, a.vencian.length);
    const abiertasTodas = tareas.filter((t) => t.estado !== "comp");
    const atrasTodas = abiertasTodas.filter((t) => t.fecha && t.fecha < hoy);
    const nums = [
      { nombre: "Completadas", valor: String(m.completadas.length), sub: (Math.round((m.completadas.length / largo) * 10) / 10).toString().replace(".", ",") + " por día", c: cmp(m.completadas.length, a.completadas.length, String), nota: "Tareas completadas en el período, contra el mismo largo de antes." },
      { nombre: "% Cumplimiento", valor: cumpl + "%", sub: m.cumplidas.length + " de " + m.vencian.length + " a tiempo", c: cmp(cumpl, cumplA, (x) => x + "%"), nota: "De lo que vencía, cuánto se hizo el día de su fecha o antes." },
      { nombre: "Tiempo liberado a Franco", valor: horas(m.minLiberados), sub: m.delegadas.length + (m.delegadas.length === 1 ? " tarea resuelta sin ti" : " tareas resueltas sin ti"), c: cmp(m.minLiberados, a.minLiberados, horas), nota: "Estimado: el tiempo de las tareas completadas donde Franco no es responsable." },
      { nombre: "Atrasadas", valor: String(atrasTodas.length), sub: abiertasTodas.length + " abiertas en total", c: null, nota: "Abiertas con la fecha ya pasada, de todo el equipo." },
    ];
    const abiertoIni = (k) => plegIni[k] ?? ["atrasadas", "hoy", "manana"].includes(k);
    const irResumen = () => irA("resumen");
    return (
      <div className="ini">
        <header className="ini-head ini-head--acciones">
          <div>
            <h1>Inicio</h1>
            <p className="ini-saludo">{"Hola, " + yoP.nombre.split(" ")[0] + " · " + fechaTxt}</p>
          </div>
          <div className="ini-head-botones">
            <button type="button" className="ini-btn ini-btn--secundario" onClick={() => irA("bandeja")}>
              <Svg tam={16} ancho={1.7}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>
              Bandeja{sinLeerBandeja > 0 && <span className="ini-btn-n">{sinLeerBandeja}</span>}
            </button>
            <button type="button" className="ini-btn ini-btn--secundario" onClick={irResumen}>
              <Svg tam={16} ancho={1.7}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-6" /></Svg>Resumen
            </button>
            <button type="button" className="ini-btn ini-btn--primario" onClick={() => abrirNueva("__top")}><IcoMas tam={14} />Nueva tarea</button>
          </div>
        </header>

        <div className={"ini-ahora ini-ahora--suave" + (atras ? " ini-ahora--alerta" : "")} role="status">
          <span className="ini-ahora-ico"><Svg tam={22} ancho={1.7}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg></span>
          <div className="ini-ahora-texto">
            <div className="ini-ahora-cap">{"Hoy · " + DIAS_L[dow(hoy)]}</div>
            <div className="ini-ahora-titulo">{cargando ? "Cargando tus tareas…" : titulo}</div>
          </div>
        </div>

        {(() => {
          const lista = pines.map((id) => tareas.find((t) => t.id === id)).filter((t) => t && t.estado !== "comp");
          const soltar = (destino) => {
            if (!arrastrandoPin || arrastrandoPin === destino) return;
            const ids = pines.filter((x) => x !== arrastrandoPin);
            const j = destino ? ids.indexOf(destino) : ids.length;
            ids.splice(j < 0 ? ids.length : j, 0, arrastrandoPin);
            setPines(ids); guardarOrdenPines(ids); setArrastrandoPin(null);
          };
          return (
            <section className="ini-card ini-pri" aria-label="Prioridades">
              <header className="ini-card-head">
                <h2 className="ini-h2"><span className="ini-pri-ico"><IcoPin tam={15} lleno /></span>Prioridades</h2>
                <span className="ini-cuenta">{lista.length ? lista.length + " de " + TOPE_PINES : ""}</span>
              </header>
              {!lista.length ? (
                <p className="ini-pri-vacio">Fija acá lo más importante con el pin <IcoPin tam={12} /> de la tarea o con «Fijar en mis prioridades» del menú «…». Solo las ves tú.</p>
              ) : (
                <div className="pri-lista" onDragOver={(e) => { if (arrastrandoPin) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); soltar(null); }}>
                  {lista.map((t, i) => {
                    const pr = priDe(t.prio);
                    const venc = t.fecha && dias(hoy, t.fecha) < 0;
                    return (
                      <div key={t.id} className={"pri-fila" + (arrastrandoPin === t.id ? " arrastrando" : "")}
                        draggable onDragStart={(e) => { setArrastrandoPin(t.id); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", t.id); } catch {} }}
                        onDragEnd={() => setArrastrandoPin(null)}
                        onDragOver={(e) => { if (arrastrandoPin) e.preventDefault(); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); soltar(t.id); }}
                        onClick={() => abrirTarea(t.id)}>
                        <span className="pri-n">{i + 1}</span>
                        <button type="button" className="ico-est" onClick={(e) => abrirPop(e, "estado", t.id, 230, 320)} aria-label={"Estado: " + estDe(t.estado).label}><IconoEstado estado={t.estado} /></button>
                        <span className="pri-nom" title={t.nombre}>{t.nombre}</span>
                        <Caras ids={t.resp} P={P} />
                        <span className={"pri-fecha" + (venc ? " venc" : "")}>{t.fecha ? fechaRel(hoy, t.fecha) : ""}</span>
                        <span className="pri-prio"><Bandera prio={t.prio} />{pr ? pr.label : ""}</span>
                        <button type="button" className="pri-grip" aria-label={"Mover " + t.nombre + " (⌘ + flechas)"} title="Arrastra para ordenar"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); moverPin(t.id, e.key === "ArrowUp" ? -1 : 1); } }}>
                          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.4" /><circle cx="9" cy="3" r="1.4" /><circle cx="3" cy="8" r="1.4" /><circle cx="9" cy="8" r="1.4" /><circle cx="3" cy="13" r="1.4" /><circle cx="9" cy="13" r="1.4" /></svg>
                        </button>
                        <button type="button" className="pri-x" onClick={(e) => { e.stopPropagation(); desfijar(t.id); }} aria-label={"Sacar " + t.nombre + " de prioridades"} title="Sacar de prioridades"><IcoX tam={12} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

        <section className="ini-card ini-tareas" aria-label="Mis tareas">
          <header className="ini-card-head">
            <h2 className="ini-h2">Mis tareas</h2>
            <span className="ini-cuenta">{misAbiertas.length + (misAbiertas.length === 1 ? " abierta" : " abiertas")}</span>
          </header>
          {nueva && nueva.grupo === "__top" && filaNueva()}
          {!cargando && !grupos.length && !(nueva && nueva.grupo === "__top") && (
            <div className="ini-vacio">
              <p className="ini-vacio-tit">No tienes tareas abiertas</p>
              <button type="button" className="ini-btn ini-btn--secundario" onClick={() => abrirNueva("__top")}><IcoMas tam={14} />Nueva tarea</button>
            </div>
          )}
          {grupos.map((g) => {
            const ab = abiertoIni(g.key);
            return (
              <div key={g.key} className="grupo">
                <div className="ghead">
                  <button type="button" className="caret" onClick={() => setPlegIni((p) => ({ ...p, [g.key]: !ab }))} aria-label="Plegar grupo"><Caret abierto={ab} /></button>
                  <span className="glabel" style={{ color: g.color }}>{g.label}</span>
                  <span className="conteo">{g.lista.length}</span>
                </div>
                {ab && (
                  <div className="gcuerpo">
                    <div className="cols"><span>Nombre</span><span>Responsable</span><span>Fecha</span><span>Calendario</span><span>Prioridad</span><span>Edad</span><span>Tipo</span><span /></div>
                    {g.lista.map(filaTarea)}
                    {g.nuevaAqui ? filaNueva() : <button type="button" className="add" onClick={() => abrirNueva(g.key)}><IcoMas />Añadir tarea</button>}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="ini-card ini-numeros" aria-label="Tus números">
          <header className="ini-card-head">
            <h2 className="ini-h2">Tus números</h2>
            <div className="rs-seg">
              <button type="button" className={perIni === "semana" ? "on" : ""} onClick={() => setPerIni("semana")}>Esta semana</button>
              <button type="button" className={perIni === "mes" ? "on" : ""} onClick={() => setPerIni("mes")}>Este mes</button>
            </div>
          </header>
          <div className="ini-num-grilla">
            {nums.map((n) => (
              <button key={n.nombre} type="button" className="ini-num" onClick={irResumen} title={n.nota}>
                <span className="ini-num-nombre">{n.nombre}</span>
                {cargando ? <span className="ini-num-pastilla" /> : <span className="ini-num-valor">{n.valor}</span>}
                {!cargando && <span className="ini-num-sub">{n.sub}</span>}
                {n.c && !cargando && (
                  <span className="ini-num-cmp">
                    <span className="ini-num-antes">{n.c.antes}</span>
                    {n.c.igual ? <span className="ini-num-flecha">Igual</span>
                      : <span className={"ini-num-flecha ini-num-flecha--" + n.c.tono}>{n.c.sube ? "↑" : "↓"}</span>}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  };

  /* ── piezas ── */
  const filaNueva = () => {
    const n = nueva, pr = priDe(n.prio), tp = tipDe(n.tipo);
    return (
      <div className="nueva">
        <button type="button" className="ico-est" onClick={(e) => abrirPop(e, "estado", "nueva", 230, 290)} aria-label="Estado"><IconoEstado estado={n.estado} /></button>
        <input className="nueva-nombre" placeholder="Nombre de la tarea" value={n.nombre} maxLength={65} autoFocus aria-label="Nombre de la tarea nueva"
          onChange={(e) => { const v = e.target.value; setNueva((x) => ({ ...x, nombre: v })); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardarNueva(); } if (e.key === "Escape") { e.preventDefault(); setNueva(null); } }} />
        <span className="nsep" />
        <button type="button" className={"nchip " + (n.resp.length ? "puesto" : "")} onClick={(e) => abrirPop(e, "resp", "nueva", 230, 130)}>
          {n.resp.length ? <Caras ids={n.resp} P={P} /> : <span>Responsable</span>}
        </button>
        <button type="button" className={"nchip " + (n.fecha ? "puesto" : "")} onClick={(e) => abrirPop(e, "fecha", "nueva", 470, 430)}>
          <IcoCal />{n.fecha ? fechaRel(hoy, n.fecha) : "Fecha"}{n.recurrencia && <IcoRepite />}
        </button>
        <button type="button" className={"nchip " + (pr ? "puesto" : "")} onClick={(e) => abrirPop(e, "prio", "nueva", 200, 230)}>
          <Bandera prio={n.prio} />{pr ? pr.label : "Prioridad"}
        </button>
        <button type="button" className={"nchip " + (tp ? "puesto" : "falta")} onClick={(e) => abrirPop(e, "tipo", "nueva", 240, 110)}>{tp ? tp.label : "Falta tipo"}</button>
        <span className="nsep" />
        <button type="button" className="btn-chico sec" onClick={() => { setNueva(null); setPop(null); }}>Cancelar</button>
        <button type="button" className="btn-chico pri" onClick={guardarNueva} disabled={!(n.nombre.trim() && n.tipo)}>Guardar</button>
      </div>
    );
  };

  const filaTarea = (t) => {
    const pr = priDe(t.prio), tp = tipDe(t.tipo);
    const venc = t.fecha && dias(hoy, t.fecha) < 0 && t.estado !== "comp";
    const hechas = t.subs.filter((x) => x.hecha).length;
    const edad = Math.max(0, -dias(hoy, t.creadaDia));
    const cls = ["fila", sel[t.id] ? "sel" : "", t.estado === "comp" ? "cerrada" : "", abierta === t.id ? "abierta" : ""].join(" ");
    return (
      <div key={t.id} className={cls} onClick={() => abrirTarea(t.id)}>
        <button type="button" className={"check " + (sel[t.id] ? "on" : "")} aria-label={"Elegir " + t.nombre}
          onClick={(e) => { parar(e); setLoteBorrar(false); setSel((s) => { const n = { ...s }; if (n[t.id]) delete n[t.id]; else n[t.id] = true; return n; }); }}>
          {sel[t.id] && <IcoTilde tam={10} ancho={3.2} />}
        </button>
        <div className="nombre">
          <button type="button" className="ico-est" onClick={(e) => abrirPop(e, "estado", t.id, 230, 290)} aria-label={"Estado: " + estDe(t.estado).label}><IconoEstado estado={t.estado} /></button>
          {ren === t.id ? (
            <input className="ncampo" value={renDraft} maxLength={65} autoFocus aria-label="Nombre de la tarea" onClick={parar}
              onChange={(e) => setRenDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } if (e.key === "Escape") { e.preventDefault(); setRen(null); } }}
              onBlur={() => { const v = renDraft.trim(); if (ren && v && v !== t.nombre) cambiarTarea(ren, { nombre: v }); setRen(null); }} />
          ) : (<>
            <span className="ntxt" title={t.nombre}>{t.nombre}</span>
            {t.recurrencia && <span className="hijas rep" title={"Se repite: " + textoRecurrencia(t.recurrencia)}><IcoRepite /></span>}
            {pines.includes(t.id) && <span className="hijas pin" title="En tus prioridades"><IcoPin tam={11} lleno /></span>}
            {t.subs.length > 0 && <span className="hijas" title="Subtareas"><IcoRama />{hechas}/{t.subs.length}</span>}
            {t.nComs > 0 && <span className="hijas" title="Comentarios"><Svg tam={11} ancho={2}><path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.4A7.5 7.5 0 1 1 20 12.5Z" /></Svg>{t.nComs}</span>}
            <button type="button" className="lapiz" aria-label="Renombrar" onClick={(e) => { parar(e); setRen(t.id); setRenDraft(t.nombre); setPop(null); }}><IcoLapiz /></button>
          </>)}
        </div>
        <button type="button" className={"celda " + abiertoPop("resp", t.id)} onClick={(e) => abrirPop(e, "resp", t.id, 230, 130)} aria-label="Responsables">
          {t.resp.length ? <Caras ids={t.resp} P={P} /> : <span className="hueco"><Svg tam={16} ancho={1.7}><circle cx="10" cy="8" r="3.5" /><path d="M3.5 19.5a6.5 6.5 0 0 1 13 0" /><path d="M19 8v6" /><path d="M16 11h6" /></Svg></span>}
        </button>
        <button type="button" className={"celda " + (venc ? "venc " : "") + abiertoPop("fecha", t.id)} onClick={(e) => abrirPop(e, "fecha", t.id, 470, 430)} aria-label="Fecha">
          {t.fecha ? <span>{fechaRel(hoy, t.fecha)}</span> : <span className="hueco"><IcoCal tam={15} /></span>}
        </button>
        <div className="celda">{t.fecha && <span className="chip">{calendario(t.fecha)}</span>}</div>
        <button type="button" className={"celda " + abiertoPop("prio", t.id)} onClick={(e) => abrirPop(e, "prio", t.id, 200, 230)} aria-label="Prioridad">
          <Bandera prio={t.prio} />{pr && <span style={{ color: "var(--t1)", fontWeight: 600, fontSize: 12.5 }}>{pr.label}</span>}
        </button>
        <div className="celda" title={"Creada el " + fechaCreacion(t.creadaDia)}>{edad + (edad === 1 ? " día" : " días")}</div>
        <button type="button" className={"celda " + abiertoPop("tipo", t.id)} onClick={(e) => abrirPop(e, "tipo", t.id, 240, 110)} aria-label="Tipo">
          <span className="chip-tipo" style={{ background: tp ? tp.color : "#FFF4DC", color: tp ? tp.ink : "#8A5300" }}>{tp ? tp.label : "Falta"}</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button type="button" className={"menu-btn " + abiertoPop("menu", t.id)} onClick={(e) => abrirPop(e, "menu", t.id, 210, 220)} aria-label="Más acciones"><IcoPuntos /></button>
        </div>
      </div>
    );
  };

  /* ── contenido del popover ── */
  const contenidoPop = () => {
    if (!pop) return null;
    const tg = pop.target;
    const Opt = ({ on, onClick, children, cls = "" }) => (
      <button type="button" className={"opt " + cls + (on ? " on" : "")} onClick={onClick}>{children}{on && <span className="tilde"><IcoTilde /></span>}</button>
    );
    if (pop.tipo === "estado") {
      const actual = valorDe(tg, "estado");
      let g = "";
      return ESTADOS.map((e) => {
        const tit = e.grupo !== g ? (g = e.grupo, <span key={"t" + e.id} className="pop-tit">{e.grupo}</span>) : null;
        const opt = (
          <Opt key={e.id} on={actual === e.id && tg !== "lote"} onClick={() => { aplicar(tg, { estado: e.id }); cerrarPop(); }}>
            <IconoEstado estado={e.id} /><span className="opt-est" style={{ color: "var(--st-" + e.id + ")" }}>{e.label.toUpperCase()}</span>
          </Opt>
        );
        if (e.id !== "sin") return [tit, opt];
        /* 🔁 «Recurrente» vive en «Por iniciar», debajo de «Sin iniciar» (pedido de Franco, 11 nov):
           al elegirlo se abre el selector de fecha en «Se repite» para elegir cada cuánto. */
        const rep = tg === "lote" ? null : valorDe(tg, "recurrencia");
        const recurrente = (
          <Opt key="rec" on={!!rep} onClick={() => {
            if (tg === "lote") { aplicar(tg, { recurrencia: { regla: "semanal" } }); cerrarPop(); avisar("Ahora se repiten cada semana"); return; }
            if (!rep) aplicar(tg, { recurrencia: { regla: "semanal" }, ...(valorDe(tg, "fecha") ? {} : { fecha: hoy }), ...(actual === "comp" ? { estado: "sin" } : {}) });
            const root = rootRef.current, W = root ? root.offsetWidth : 1200, H = root ? root.offsetHeight : 800;
            setCalMes((valorDe(tg, "fecha") || hoy).slice(0, 7));
            setPop({ ...pop, tipo: "fecha", ancho: 470, left: Math.max(8, Math.min(pop.left, W - 8 - 470)), top: Math.max(8, Math.min(pop.top, H - 8 - 440)) });
          }}>
            <span className="ico-rep"><IcoRepite tam={14} /></span><span className="opt-est" style={{ color: "var(--ac-ink)" }}>RECURRENTE</span>
            {rep && <span className="pista">{textoRecurrencia(rep)}</span>}
          </Opt>
        );
        return [tit, opt, recurrente];
      });
    }
    if (pop.tipo === "prio") {
      const actual = valorDe(tg, "prio");
      return (<>
        {PRIORIDADES.map((p) => <Opt key={p.id} on={actual === p.id && tg !== "lote"} onClick={() => { aplicar(tg, { prio: p.id }); cerrarPop(); }}><Bandera prio={p.id} tam={14} />{p.label}</Opt>)}
        <span className="psep" />
        <Opt onClick={() => { aplicar(tg, { prio: null }); cerrarPop(); }}><Bandera prio={null} tam={14} /><span style={{ color: "var(--t3)" }}>Quitar prioridad</span></Opt>
      </>);
    }
    if (pop.tipo === "tiempo") {
      const actual = valorDe(tg, "minutos");
      return (<>
        {TIEMPOS.map(([m, txt]) => <Opt key={m} on={actual === m} onClick={() => { aplicar(tg, { minutos: m }); cerrarPop(); }}>{txt}</Opt>)}
        <span className="psep" />
        <Opt onClick={() => { aplicar(tg, { minutos: null }); cerrarPop(); }}><span style={{ color: "var(--t3)" }}>Estimar por prioridad</span></Opt>
      </>);
    }
    if (pop.tipo === "tipo") {
      const actual = valorDe(tg, "tipo");
      return TIPOS.map((x) => <Opt key={x.id} on={actual === x.id && tg !== "lote"} onClick={() => { aplicar(tg, { tipo: x.id }); cerrarPop(); }}><span className="cuadro" style={{ background: x.color }} />{x.largo}</Opt>);
    }
    if (pop.tipo === "resp") {
      const actual = valorDe(tg, "resp") || [];
      return (<>
        <span className="pop-tit">Responsables</span>
        {claves.map((id) => (
          <Opt key={id} on={actual.includes(id)} onClick={() => {
            const cur = valorDe(tg, "resp") || [];
            const n = cur.includes(id) ? cur.filter((x) => x !== id) : cur.concat([id]);
            aplicar(tg, { resp: claves.filter((x) => n.includes(x)) });
          }}><span className="cara g" style={{ background: P[id].color }}>{P[id].iniciales}</span>{P[id].nombre}</Opt>
        ))}
      </>);
    }
    if (pop.tipo === "orden") {
      return (<>
        <span className="pop-tit">Ordenar por</span>
        {[["fecha", "Fecha"], ["prioridad", "Prioridad"], ["tipo", "Tipo"], ["estado", "Estado"], ["responsable", "Responsable"]].map(([k, l]) => (
          <Opt key={k} on={orden === k} onClick={() => { setOrden(k); setPop(null); setNueva(null); }}>{l}</Opt>
        ))}
        <span className="psep" />
        <button type="button" className="opt" onClick={() => setVerComp((v) => !v)}>
          <span className={"casilla " + (verComp ? "on" : "")}>{verComp && <IcoTilde tam={10} ancho={3.2} />}</span>Mostrar completadas
        </button>
      </>);
    }
    if (pop.tipo === "menu") {
      const t = tareas.find((x) => x.id === tg);
      if (!t) return null;
      return (<>
        <Opt onClick={() => abrirTarea(t.id)}>Abrir</Opt>
        <Opt onClick={() => { setPop(null); pines.includes(t.id) ? desfijar(t.id) : fijar(t.id); }}>{pines.includes(t.id) ? "Sacar de mis prioridades" : "Fijar en mis prioridades"}</Opt>
        <Opt onClick={() => { setRen(t.id); setRenDraft(t.nombre); setPop(null); setAbierta(null); }}>Renombrar</Opt>
        <Opt onClick={async () => {
          setPop(null);
          const { error } = await supabase.from("tareas").insert({ nombre: t.nombre + " (Copia)", tipo: t.tipo, estado: t.estado, prio: t.prio, resp: t.resp, fecha: t.fecha, descripcion: t.desc, subtareas: t.subs, creado_por: yo });
          if (error) avisar("No se pudo duplicar."); else { avisar("Tarea duplicada"); cargar(); }
        }}>Duplicar</Opt>
        <Opt onClick={() => {
          setPop(null);
          try { navigator.clipboard.writeText(window.location.origin + window.location.pathname + "?tarea=" + t.id); } catch {}
          avisar("Link copiado");
        }}>Copiar link</Opt>
        <span className="psep" />
        <Opt cls={"peligro" + (borrarConf ? " conf" : "")} onClick={async () => {
          if (!borrarConf) { setBorrarConf(true); return; }
          setPop(null); setBorrarConf(false);
          if (abierta === t.id) setAbierta(null);
          setFilas((fs) => fs.filter((f) => f.id !== t.id));
          const { error } = await supabase.from("tareas").delete().eq("id", t.id);
          if (error) { avisar("No se pudo borrar."); cargar(); } else avisar("Tarea borrada");
        }}>{borrarConf ? "Tocar otra vez para borrar" : "Borrar tarea"}</Opt>
      </>);
    }
    if (pop.tipo === "cuenta") {
      return (<>
        <div className="yo" style={{ padding: "8px 10px" }}>
          <span className="cara xg" style={{ background: yoP.color }}>{yoP.iniciales}</span>
          <div><b>{yoP.nombre}</b><span>{yoP.rol || ""}</span></div>
        </div>
        <span className="psep" />
        <Opt onClick={() => { cambiarTema(); setPop(null); }}>{tema === "claro" ? "Tema oscuro" : "Tema claro"}</Opt>
        <Opt onClick={() => { setPop(null); setFbAbierto(true); }}>Mandar feedback</Opt>
        <Opt cls="peligro" onClick={salir}>Salir</Opt>
      </>);
    }
    if (pop.tipo === "fecha") {
      const actual = valorDe(tg, "fecha");
      const poner = (f) => { aplicar(tg, { fecha: f }); setPop(null); };
      const mes = calMes || hoy.slice(0, 7);
      const yy = Number(mes.slice(0, 4)), mm = Number(mes.slice(5, 7));
      const primero = (new Date(yy, mm - 1, 1).getDay() + 6) % 7;
      const inicio = iso(new Date(yy, mm - 1, 1 - primero));
      const diasMes = [];
      for (let i = 0; i < 42; i++) {
        const f = mas(inicio, i);
        if (i >= 35 && f.slice(0, 7) !== mes) break;
        diasMes.push(f);
      }
      const mover = (k) => { const x = new Date(yy, mm - 1 + k, 1); setCalMes(mesKey(x.getFullYear(), x.getMonth() + 1)); };
      /* 🔁 La recurrencia vive en el mismo selector de fecha, como en Blue OS. */
      const rep = tg === "lote" ? null : valorDe(tg, "recurrencia");
      const repetir = (r) => {
        const cambios = { recurrencia: r };
        if (r && !actual) cambios.fecha = hoy;
        aplicar(tg, cambios); setPersoRep(null);
      };
      const proximas = new Set(rep && actual ? vueltasEntre(actual, rep, diasMes[0], diasMes[diasMes.length - 1]) : []);
      const esAtajo = ATAJOS_RECURRENCIA.some((a) => mismaRecurrencia(a.regla, rep));
      const fRef = actual || hoy;
      const pr = persoRep;
      return (
        <div className="fecha-pop">
          <div className="atajos">
            {atajosDe(hoy).map(([l, p, f]) => <button key={l} type="button" className="opt" onClick={() => poner(f)}>{l}<span className="pista">{p}</span></button>)}
            <button type="button" className="quitar" onClick={() => poner(null)}>Quitar fecha</button>
            {tg !== "lote" && (<>
              <span className="rep-tit"><IcoRepite tam={12} />Se repite</span>
              <button type="button" className={"opt " + (!rep ? "on" : "")} onClick={() => repetir(null)}>No se repite</button>
              {ATAJOS_RECURRENCIA.map((a) => (
                <button key={a.id} type="button" className={"opt " + (mismaRecurrencia(a.regla, rep) ? "on" : "")} onClick={() => repetir(a.regla)}>{a.label}</button>
              ))}
              <button type="button" className={"opt " + (rep && !esAtajo ? "on" : "")}
                onClick={() => { const b = rep ? { ...rep } : { regla: "semanal", dias_semana: [diaSemanaDe(fRef) || 1] }; if (b.regla === "semanal" && !(b.dias_semana || []).length) b.dias_semana = [diaSemanaDe(fRef) || 1]; setPersoRep(b); }}>
                Personalizada{rep && !esAtajo && <span className="pista">{textoRecurrencia(rep)}</span>}
              </button>
            </>)}
          </div>
          <div className="calen">
            <div className="calen-head">
              <span>{tituloMes(yy, mm)}</span><span className="esp" />
              <button type="button" className="flecha" onClick={() => mover(-1)} aria-label="Mes anterior"><Svg tam={14} ancho={2}><path d="m15 6-6 6 6 6" /></Svg></button>
              <button type="button" className="flecha" onClick={() => mover(1)} aria-label="Mes siguiente"><Svg tam={14} ancho={2}><path d="m9 6 6 6-6 6" /></Svg></button>
            </div>
            <div className="dias">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="dsem">{d}</span>)}
              {diasMes.map((f) => (
                <button key={f} type="button" className={["dia", f.slice(0, 7) !== mes ? "fuera" : "", f === hoy ? "hoy" : "", f === actual ? "sel" : "", proximas.has(f) ? "prox" : ""].join(" ")} onClick={() => poner(f)} title={proximas.has(f) ? "Próxima vuelta" : undefined}>{Number(f.slice(8))}</button>
              ))}
            </div>
            {pr && (
              <div className="perso">
                <div className="perso-fila">
                  <span>Cada</span>
                  <input type="number" min={1} max={99} value={pr.cada || 1} aria-label="Cada cuántos"
                    onChange={(e) => { const n = Math.max(1, Math.min(99, Number(e.target.value) || 1)); setPersoRep({ ...pr, cada: n }); }} />
                  {[["diaria", "días"], ["semanal", "semanas"], ["mensual", "meses"], ["anual", "años"]].map(([r, l]) => (
                    <button key={r} type="button" className={"perso-u " + (pr.regla === r ? "on" : "")}
                      onClick={() => setPersoRep({ regla: r, cada: pr.cada, ...(r === "semanal" ? { dias_semana: [diaSemanaDe(fRef) || 1] } : {}) })}>{l}</button>
                  ))}
                </div>
                {pr.regla === "semanal" && (
                  <div className="perso-fila">
                    {DIAS_SEMANA_CORTO.map((d, i) => {
                      const on = (pr.dias_semana || []).includes(i + 1);
                      return <button key={d} type="button" className={"perso-d " + (on ? "on" : "")}
                        onClick={() => { const ds = on ? pr.dias_semana.filter((x) => x !== i + 1) : (pr.dias_semana || []).concat([i + 1]); if (ds.length) setPersoRep({ ...pr, dias_semana: ds }); }}>{d}</button>;
                    })}
                  </div>
                )}
                {pr.regla === "mensual" && (
                  <div className="perso-fila">
                    {opcionesDelMes(fRef).map((o) => {
                      const on = (pr.modo_mes || "dia") === o.modo_mes && (o.modo_mes !== "dia_semana" || (pr.semana === o.semana && pr.dia_semana === o.dia_semana));
                      return <button key={o.txt} type="button" className={"perso-u " + (on ? "on" : "")}
                        onClick={() => { const n = { regla: "mensual", cada: pr.cada }; if (o.modo_mes !== "dia") { n.modo_mes = o.modo_mes; if (o.semana) { n.semana = o.semana; n.dia_semana = o.dia_semana; } } setPersoRep(n); }}>{o.txt}</button>;
                    })}
                  </div>
                )}
                <div className="perso-fila fin">
                  <span className="perso-txt">{textoRecurrencia(pr)}</span>
                  <button type="button" className="btn-chico sec" onClick={() => setPersoRep(null)}>Cancelar</button>
                  <button type="button" className="btn-chico pri" onClick={() => { const r = { ...pr }; if (!r.cada || r.cada <= 1) delete r.cada; repetir(r); }}>Listo</button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  /* ── panel de la tarea ── */
  const panel = () => {
    if (!tA) return null;
    const e = estDe(tA.estado), pr = priDe(tA.prio), tp = tipDe(tA.tipo) || TIPOS[0];
    const venc = tA.fecha && dias(hoy, tA.fecha) < 0 && tA.estado !== "comp";
    const hechas = tA.subs.filter((x) => x.hecha).length;
    const pct = tA.subs.length ? Math.round((hechas / tA.subs.length) * 100) : 0;
    const tinte = tema === "claro"
      ? { idea: ["#F2F3F6", "#8D8D8D"], sin: ["#F2F3F6", "#434B61"], prog: ["#FEF6DF", "#8A6100"], rev: ["#FCEBE2", "#A8481A"], corr: ["#F8E3E2", "#B63936"], comp: ["#E4F1E9", "#2F6B46"] }[tA.estado]
      : ["color-mix(in srgb, var(--st-" + tA.estado + ") 16%, var(--bg-2))", "var(--st-" + tA.estado + ")"];
    const edad = Math.max(0, -dias(hoy, tA.creadaDia));
    const sigo = tA.seguidores.includes(yo);
    const comentario = (c, esHilo) => {
      const p = P[c.autor] || { nombre: c.autor, iniciales: "?", color: "#555" };
      const mio = c.autor === yo;
      return (
        <div key={c.id} className="com">
          <span className="cara g" style={{ background: p.color, ...(esHilo ? { width: 22, height: 22 } : {}) }}>{p.iniciales}</span>
          <div className="com-cuerpo">
            <span className="com-meta"><b>{p.nombre}</b> · {hace(c.creado)}{c.editado ? " · editado" : ""}</span>
            {edit === c.id ? (
              <div className="composer">
                <textarea value={editDraft} onChange={(ev) => setEditDraft(ev.target.value)} autoFocus aria-label="Editar comentario" />
                <div className="comp-barra"><span className="esp" />
                  <button type="button" className="btn-chico sec" onClick={() => setEdit(null)}>Cancelar</button>
                  <button type="button" className="btn-chico pri" onClick={() => { const v = editDraft.trim(); if (v || (c.imagenes || []).length) editarComentario(c.id, v); setEdit(null); }}>Guardar</button>
                </div>
              </div>
            ) : <>{c.txt && <Texto txt={c.txt} P={P} />}<Fotos c={c} urls={urls} onVer={setVisor} /><Docs lista={c.archivos} urls={urls} subiendo={c.subiendo} /></>}
            <div className="com-acc">
              {!esHilo && <button type="button" className="responder" onClick={() => { setResp(c.id); setRespDraft(""); setEdit(null); }}><Svg tam={12} ancho={2}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v4" /></Svg>Responder</button>}
              {mio && <>
                <button type="button" className="accion" onClick={() => { setEdit(c.id); setEditDraft(c.txt); setResp(null); }}><IcoLapiz />Editar</button>
                <button type="button" className="accion peligro" onClick={() => borrarComentario(c.id)}><IcoTacho />Borrar</button>
              </>}
            </div>
            {!esHilo && c.hilo.length > 0 && <div className="hilo">{c.hilo.map((r) => comentario(r, true))}</div>}
            {!esHilo && resp === c.id && (
              <div className="hilo">
                <Composer P={P} claves={claves} placeholder="Responde en el hilo · @ para nombrar" autoFocus conCancelar
                  onCancelar={() => setResp(null)}
                  onEnviar={async (t, a) => { setResp(null); return enviarComentario(t, c.id, a); }} />
              </div>
            )}
          </div>
        </div>
      );
    };
    return (<>
      <button type="button" className="scrim" onClick={() => { setAbierta(null); setPop(null); setEditTit(false); setEditDesc(false); }} aria-label="Cerrar tarea" />
      <aside className="det" aria-label="Tarea">
        <div className="det-top">
          <button type="button" className="det-tipo" onClick={(ev) => abrirPop(ev, "tipo", tA.id, 260, 110)}>
            <span className="cuadro" style={{ background: tp.color }} />{tp.largo}<Svg tam={12} ancho={2}><path d="m6 9 6 6 6-6" /></Svg>
          </button>
          <span className="esp" />
          <button type="button" className="icobtn" onClick={() => saltar(-1)} aria-label="Tarea anterior"><Svg ancho={2}><path d="m6 15 6-6 6 6" /></Svg></button>
          <button type="button" className="icobtn" onClick={() => saltar(1)} aria-label="Tarea siguiente"><Svg ancho={2}><path d="m6 9 6 6 6-6" /></Svg></button>
          <button type="button" className={"icobtn " + (pines.includes(tA.id) ? "sigo" : "")} title={pines.includes(tA.id) ? "Sacar de mis prioridades" : "Fijar en mis prioridades"} aria-label={pines.includes(tA.id) ? "Sacar de mis prioridades" : "Fijar en mis prioridades"}
            onClick={() => (pines.includes(tA.id) ? desfijar(tA.id) : fijar(tA.id))}><IcoPin lleno={pines.includes(tA.id)} /></button>
          <button type="button" className={"icobtn " + (sigo ? "sigo" : "")} title={sigo ? "Dejar de seguir" : "Seguir esta tarea"} aria-label={sigo ? "Dejar de seguir" : "Seguir esta tarea"}
            onClick={() => { cambiarTarea(tA.id, { seguidores: sigo ? tA.seguidores.filter((x) => x !== yo) : tA.seguidores.concat([yo]) }); avisar(sigo ? "Ya no sigues esta tarea" : "Sigues esta tarea"); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={sigo ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>
          </button>
          <button type="button" className={"icobtn " + abiertoPop("menu", tA.id)} onClick={(ev) => abrirPop(ev, "menu", tA.id, 210, 220)} aria-label="Más acciones"><IcoPuntos /></button>
          <button type="button" className="icobtn" onClick={() => { setAbierta(null); setPop(null); }} aria-label="Cerrar"><IcoX /></button>
        </div>

        <div className="det-cuerpo">
          {editTit ? (
            <input className="det-tit-campo" value={titDraft} maxLength={65} autoFocus aria-label="Nombre de la tarea"
              onChange={(ev) => setTitDraft(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); ev.currentTarget.blur(); } if (ev.key === "Escape") { ev.preventDefault(); setEditTit(false); } }}
              onBlur={() => { const v = titDraft.trim(); if (v && v !== tA.nombre) cambiarTarea(tA.id, { nombre: v }); setEditTit(false); }} />
          ) : <button type="button" className="det-tit" onClick={() => { setEditTit(true); setTitDraft(tA.nombre); }}>{tA.nombre}</button>}

          <div className="chips">
            <button type="button" className="chip-est" style={{ background: tinte[0], color: tinte[1] }} onClick={(ev) => abrirPop(ev, "estado", tA.id, 230, 290)}>
              <IconoEstado estado={tA.estado} />{e.label}<Svg tam={12} ancho={2}><path d="m6 9 6 6 6-6" /></Svg>
            </button>
            <button type="button" className="dato-btn" onClick={(ev) => abrirPop(ev, "prio", tA.id, 200, 230)}>
              <Bandera prio={tA.prio} tam={14} />{pr ? <span>{pr.label}</span> : <span className="falta-chip">Falta</span>}
            </button>
            <button type="button" className="dato-btn" onClick={(ev) => abrirPop(ev, "resp", tA.id, 230, 130)} aria-label="Responsables">
              {tA.resp.length ? <Caras ids={tA.resp} P={P} grande /> : <span className="falta-chip">Falta responsable</span>}
            </button>
            <button type="button" className="dato-btn" onClick={(ev) => abrirPop(ev, "tiempo", tA.id, 200, 300)} title="Cuánto tiempo le lleva a una persona. Se usa para estimar el tiempo liberado a Franco.">
              <Svg tam={14} ancho={1.8}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>
              {tA.minutos ? <span>{TIEMPOS.find((x) => x[0] === tA.minutos)?.[1] || tA.minutos + " min"}</span> : <span style={{ color: "var(--t3)" }}>~{TIEMPOS.find((x) => x[0] === minutosDe(tA))?.[1] || minutosDe(tA) + " min"}</span>}
            </button>
          </div>
          <div className="chips">
            <button type="button" className={"dato-btn " + (venc ? "venc" : "")} onClick={(ev) => abrirPop(ev, "fecha", tA.id, 470, 430)}>
              <IcoCal tam={14} />{tA.fecha ? <span>{fechaLarga(hoy, tA.fecha)}</span> : <span style={{ color: "var(--t3)" }}>Sin fecha</span>}
            </button>
            {tA.fecha && <span className="chip">{calendario(tA.fecha)}</span>}
            {tA.recurrencia && <button type="button" className="dato-btn rep" onClick={(ev) => abrirPop(ev, "fecha", tA.id, 470, 430)} title="Se repite"><IcoRepite tam={14} /><span>{textoRecurrencia(tA.recurrencia)}</span></button>}
            <span className="edad" title={"Creada el " + fechaCreacion(tA.creadaDia)}>{edad + (edad === 1 ? " día de edad" : " días de edad")}</span>
          </div>

          <div className="seccion">
            <h3>Descripción</h3>
            {editDesc ? (
              <textarea className="desc-campo" value={descDraft} autoFocus placeholder="Qué hay que hacer y cómo se sabe que quedó" aria-label="Descripción"
                onChange={(ev) => setDescDraft(ev.target.value)}
                onBlur={() => { if (descDraft.trim() !== tA.desc) cambiarTarea(tA.id, { desc: descDraft.trim() }); setEditDesc(false); }} />
            ) : (
              <button type="button" className={"desc " + (tA.desc ? "" : "vacia")} onClick={() => { setEditDesc(true); setDescDraft(tA.desc); }}>{tA.desc || "Agrega una descripción"}</button>
            )}
            {/* Adjuntos de la descripción: imágenes y documentos, con el clip o arrastrando. */}
            <div className={"adj" + (arrastraDesc ? " arrastrando" : "")}
              onDragOver={(ev) => { if ([...ev.dataTransfer.types].includes("Files")) { ev.preventDefault(); setArrastraDesc(true); } }}
              onDragLeave={() => setArrastraDesc(false)}
              onDrop={(ev) => { ev.preventDefault(); setArrastraDesc(false); adjuntarDesc(tA.id, ev.dataTransfer.files); }}>
              {(tA.adjuntos || []).some((a) => esImagen(a.tipo)) && (
                <div className="fotos">
                  {tA.adjuntos.filter((a) => esImagen(a.tipo)).map((a) => (
                    <span key={a.ruta} className="foto">
                      <button type="button" className="foto-ver" onClick={() => urls[a.ruta] && setVisor(urls[a.ruta])} aria-label="Ver imagen">{urls[a.ruta] ? <img src={urls[a.ruta]} alt="" loading="lazy" /> : <span className="foto-hueco" />}</button>
                      <button type="button" className="foto-x" aria-label="Quitar imagen" onClick={() => quitarAdjunto(tA, a)}><IcoX tam={11} /></button>
                    </span>
                  ))}
                </div>
              )}
              <Docs lista={(tA.adjuntos || []).filter((a) => !esImagen(a.tipo))} urls={urls} onQuitar={(a) => quitarAdjunto(tA, a)} />
              {subiendoDesc > 0 && <span className="adj-sub">Subiendo {subiendoDesc} {subiendoDesc === 1 ? "archivo" : "archivos"}…</span>}
              <label className="adj-btn">
                <Svg tam={13} ancho={1.9}><path d="m20.5 11.5-8.3 8.3a5.2 5.2 0 0 1-7.4-7.4l8.6-8.6a3.5 3.5 0 0 1 4.9 4.9l-8.4 8.4a1.7 1.7 0 0 1-2.5-2.5l7.8-7.8" /></Svg>
                Adjuntar imagen o documento
                <input type="file" accept={ACEPTA} multiple hidden onChange={(ev) => { adjuntarDesc(tA.id, ev.target.files); ev.target.value = ""; }} />
              </label>
            </div>
          </div>

          <div className="seccion">
            <div className="sub-head">
              <button type="button" className="caret" onClick={() => setSubsAbiertas((v) => !v)} aria-label="Plegar subtareas"><Caret abierto={subsAbiertas} /></button>
              <h3>Subtareas</h3>
              {tA.subs.length > 0 && <>
                <span className={"barra " + (pct === 100 ? "llena" : "")}><span style={{ width: pct + "%" }} /></span>
                <span className="sub-cuenta">{hechas} de {tA.subs.length}</span>
              </>}
            </div>
            {subsAbiertas && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {tA.subs.map((x) => (
                  <div key={x.id} className="sub-fila">
                    <button type="button" className="ico-est" aria-label="Marcar subtarea"
                      onClick={() => cambiarTarea(tA.id, { subs: tA.subs.map((y) => (y.id === x.id ? { ...y, hecha: !y.hecha } : y)) })}>
                      <IconoEstado estado={x.hecha ? "comp" : "sin"} />
                    </button>
                    <span className={"sub-txt " + (x.hecha ? "hecha" : "")}>{x.nombre}</span>
                    <button type="button" className="eico x" aria-label="Borrar subtarea" onClick={() => cambiarTarea(tA.id, { subs: tA.subs.filter((y) => y.id !== x.id) })}><IcoTacho tam={13} /></button>
                  </div>
                ))}
                {agregandoSub && (
                  <input className="sub-campo" placeholder="Nombre de la subtarea y Enter" value={subDraft} autoFocus aria-label="Nueva subtarea"
                    onChange={(ev) => setSubDraft(ev.target.value)}
                    onBlur={() => setAgregandoSub(false)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Escape") { setAgregandoSub(false); return; }
                      if (ev.key !== "Enter") return;
                      ev.preventDefault();
                      const v = subDraft.trim();
                      if (!v) return;
                      cambiarTarea(tA.id, { subs: tA.subs.concat([{ id: crypto.randomUUID(), nombre: v, hecha: false }]) });
                      setSubDraft("");
                    }} />
                )}
                <button type="button" className="sub-add" onClick={() => { setAgregandoSub(true); setSubDraft(""); setSubsAbiertas(true); }}><IcoRama tam={13} />Agregar subtarea</button>
              </div>
            )}
          </div>

          <div className="seccion">
            <div className="act-head">
              <h3>Actividad</h3>
              <span className="esp" />
              <button type="button" className={"act-toggle" + (verCambios ? " on" : "")} onClick={() => setVerCambios((v) => !v)}
                title={verCambios ? "Esconder los cambios y dejar solo los comentarios" : "Mostrar los cambios de fecha, estado y demás"}>
                <Svg tam={13} ancho={1.9}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></Svg>
                {verCambios ? "Con cambios" : "Solo comentarios"}
              </button>
            </div>
            {(() => {
              const cambios = verCambios ? historial.filter((h) => h.tarea_id === tA.id).map((h) => ({ k: "h" + h.id, ts: h.creado, h }))
                .concat(vueltas.filter((v) => v.tarea_id === tA.id).map((v) => ({ k: "v" + v.id, ts: v.completada, v }))) : [];
              const items = tA.coms.map((c) => ({ k: c.id, ts: c.creado, c })).concat(cambios).sort((x, y) => String(x.ts).localeCompare(String(y.ts)));
              if (!items.length) return <span style={{ fontSize: 12.5, color: "var(--t3)" }}>Todavía no hay comentarios. Escribe abajo y usa @ para nombrar al otro.</span>;
              return items.map((it) => it.c ? comentario(it.c, false) : <LineaCambio key={it.k} it={it} P={P} hoy={hoy} yo={yo} />);
            })()}
          </div>
        </div>

        <div className="det-pie">
          <Composer key={tA.id} P={P} claves={claves} placeholder="Escribe un comentario · @ para nombrar"
            onEnviar={(t, a) => enviarComentario(t, null, a)} />
        </div>
      </aside>
    </>);
  };

  /* Abrir la tarea de un link copiado (?tarea=…). */
  useEffect(() => {
    if (cargando) return;
    const id = new URLSearchParams(window.location.search).get("tarea");
    if (id && tareas.some((t) => t.id === id)) { setAbierta(id); window.history.replaceState(null, "", window.location.pathname); }
  }, [cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Escape cierra lo que esté arriba: primero el menú, después el panel. Un campo que ya
     usó el Escape (cancelar una edición) lo marca con preventDefault y acá se respeta. */
  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target;
      const escribiendo = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      if (visor) { setVisor(null); return; }
      if (pop) { setPop(null); return; }
      if (abierta && !escribiendo) { setAbierta(null); }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [pop, abierta, visor]);

  /* La pestaña del navegador dice cuántas hay para hoy o atrasadas, como Blue OS. */
  const pendientesHoy = urgentes("todas");
  useEffect(() => { document.title = pendientesHoy > 0 ? "(" + pendientesHoy + ") Tareas" : "Tareas"; }, [pendientesHoy]);

  const nombresEquipo = personasLista.filter((p) => p.rol !== "Solo prueba").map((p) => p.nombre.split(" ")[0]).join(" · ");
  const botonTema = (
    <button type="button" className="mini" onClick={cambiarTema} aria-label="Cambiar tema">
      {tema === "claro"
        ? <Svg tam={14} ancho={1.7}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></Svg>
        : <Svg tam={14} ancho={1.7}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.9 4.9 1.4 1.4" /><path d="m17.7 17.7 1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.3 17.7-1.4 1.4" /><path d="m19.1 4.9-1.4 1.4" /></Svg>}
      {tema === "claro" ? "Oscuro" : "Claro"}
    </button>
  );


  return (
    <div className={"tf " + (tema === "claro" ? "claro" : "")} ref={rootRef}>
      <aside className="side">
        <div className="marca"><span className="marca-logo">FK</span><div><b>TAREAS</b><span>{nombresEquipo}</span></div></div>
        <button type="button" className={"nav " + (vista === "inicio" ? "on" : "")} onClick={() => irA("inicio")}>
          <Svg tam={16} ancho={1.7}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></Svg>
          <span>Inicio</span>
        </button>
        <button type="button" className={"nav " + (vista === "bandeja" ? "on" : "")} onClick={() => irA("bandeja")}>
          <Svg tam={16} ancho={1.7}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>
          <span>Bandeja</span>
          {sinLeerBandeja > 0 && <span className="cnt" title="Sin leer">{sinLeerBandeja}</span>}
        </button>
        <button type="button" className={"nav " + (vista === "resumen" ? "on" : "")} onClick={() => irA("resumen")}>
          <Svg tam={16} ancho={1.7}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-6" /></Svg>
          <span>Resumen</span>
        </button>
        <div className="side-linea" />
        {navs.map((n) => {
          const c = urgentes(n.id);
          return (
            <button key={n.id} type="button" className={"nav " + (vista === n.id ? "on" : "")} onClick={() => irA(n.id)}>
              {n.id === "todas" ? <Svg tam={16} ancho={1.7}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="M4.5 6h.01" /><path d="M4.5 12h.01" /><path d="M4.5 18h.01" /></Svg> : n.id === "rec" ? <Svg tam={16} ancho={1.7}><path d="M17 2.5 20.5 6 17 9.5" /><path d="M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5" /><path d="M7 21.5 3.5 18 7 14.5" /><path d="M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5" /></Svg> : <span className="cuadro" style={{ background: n.color }} />}
              <span>{n.label}</span>
              {c > 0 && <span className="cnt" title="Hoy y atrasadas">{c}</span>}
            </button>
          );
        })}
        <div className="side-pie">
          <button type="button" className="nav fb-nav" onClick={() => setFbAbierto(true)} title="Cuéntanos qué falla o qué te ayudaría">
            <Svg tam={16} ancho={1.7}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8" /><path d="M8 13h5" /></Svg>
            <span>Feedback</span>
          </button>
          <div className="yo">
            <span className="cara xg" style={{ background: yoP.color }}>{yoP.iniciales}</span>
            <div><b>{yoP.nombre}</b><span>{yoP.rol || ""}</span></div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 4px", alignItems: "center" }}>
            {botonTema}
            <button type="button" className="mini salir" onClick={salir}>Salir</button>
          </div>
        </div>
      </aside>

      <section className="main">
        <div className="tabs-movil">
          <button type="button" className={"nav nav-bandeja " + (vista === "inicio" ? "on" : "")} onClick={() => irA("inicio")} aria-label="Inicio" title="Inicio">
            <Svg tam={16} ancho={1.7}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></Svg>
          </button>
          <button type="button" className={"nav nav-bandeja " + (vista === "bandeja" ? "on" : "")} onClick={() => irA("bandeja")} aria-label="Bandeja de entrada" title="Bandeja de entrada">
            <Svg tam={16} ancho={1.8}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></Svg>
            {sinLeerBandeja > 0 && <span className="cnt">{sinLeerBandeja}</span>}
          </button>
          <button type="button" className={"nav nav-bandeja " + (vista === "resumen" ? "on" : "")} onClick={() => irA("resumen")} aria-label="Resumen" title="Resumen">
            <Svg tam={16} ancho={1.7}><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-6" /></Svg>
          </button>
          {navs.map((n) => {
            const c = urgentes(n.id);
            return (
              <button key={n.id} type="button" className={"nav " + (vista === n.id ? "on" : "")} onClick={() => irA(n.id)}>
                <span>{n.label}</span>{c > 0 && <span className="cnt">{c}</span>}
              </button>
            );
          })}
          <button type="button" className="solo-movil cuenta-btn" onClick={(e) => abrirPop(e, "cuenta", "cuenta", 220, 150)} aria-label="Tu cuenta">
            <span className="cara g" style={{ background: yoP.color }}>{yoP.iniciales}</span>
          </button>
        </div>

        {vista === "inicio" ? <div className="bdj-scroll">{inicio()}</div> : vista === "resumen" ? (<>
          <div className="head">
            <h1>Resumen</h1>
          </div>
          <div className="bdj-scroll">
            <Resumen tareas={tareas} vueltas={vueltas} P={P} claves={claves.filter((k) => P[k]?.rol !== "Solo prueba")} abrirTarea={abrirTarea} tipDe={tipDe} />
          </div>
        </>) : vista === "bandeja" ? (<>
          <div className="head">
            <h1>Bandeja de entrada</h1>
            <span className="sub">{sinLeerBandeja ? sinLeerBandeja + " sin leer" : "Al día"}</span>
          </div>
          <div className="bdj-scroll">
            <Bandeja items={itemsBandeja} coms={coms} P={P} claves={claves} yo={yo} leidas={leidas} marcar={marcar}
              enviar={(tareaId, txt, padre, archivos) => enviarComentario(txt, padre, archivos, tareaId)}
              abrirTarea={abrirTarea} urls={urls} onVer={setVisor} tipDe={tipDe} ocupado={!!(abierta || visor || pop)} avisar={avisar} />
          </div>
        </>) : (<>
        <div className="head">
          {vistaTipo && <span className="cuadro" style={{ width: 18, height: 18, borderRadius: 5, background: vistaTipo.color }} />}
          {vista === "rec" && <span style={{ color: "var(--ac-ink)", display: "inline-flex" }}><Svg tam={20} ancho={1.7}><path d="M17 2.5 20.5 6 17 9.5" /><path d="M3.5 11V9.5a3.5 3.5 0 0 1 3.5-3.5h13.5" /><path d="M7 21.5 3.5 18 7 14.5" /><path d="M20.5 13v1.5a3.5 3.5 0 0 1-3.5 3.5H3.5" /></Svg></span>}
          <h1>{vistaTipo ? vistaTipo.label : vista === "rec" ? "Recurrentes" : "Todas"}</h1>
          <span className="sub">{abiertasVista + (abiertasVista === 1 ? " abierta" : " abiertas")}</span>
          <span className="esp" />
          {buscando && <input className="buscar" placeholder="Buscar por nombre" value={busca} autoFocus aria-label="Buscar tareas" onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setBusca(""); setBuscando(false); } }} />}
          <button type="button" className="btn btn-ico" onClick={() => { setBuscando(!buscando); if (buscando) setBusca(""); }} aria-label="Buscar">
            <Svg ancho={1.8}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>
          </button>
          <button type="button" className="btn" onClick={(e) => abrirPop(e, "orden", "orden", 230, 300)}>
            <Svg tam={14} ancho={1.8}><path d="M4 6h9" /><path d="M4 12h7" /><path d="M4 18h5" /><path d="M17 5v14" /><path d="m14 16 3 3 3-3" /></Svg>
            <span className="ocultar-movil">Ordenar por</span><b>{{ fecha: "Fecha", prioridad: "Prioridad", tipo: "Tipo", estado: "Estado", responsable: "Responsable" }[orden]}</b>
          </button>
          <button type="button" className="btn-pri" onClick={() => abrirNueva("__top")}><IcoMas tam={14} />Nueva<span className="ocultar-movil">&nbsp;tarea</span></button>
        </div>

        <div className={"card " + (selIds.length ? "eligiendo" : "")}>
          <div className="scroll" onScroll={() => pop && setPop(null)}>
            {nueva && nueva.grupo === "__top" && filaNueva()}
            {errorCarga && <div className="vacio"><b>No pude leer las tareas</b><span>Revisa la conexión y vuelve a intentar.</span><button type="button" className="btn" onClick={cargar}>Reintentar</button></div>}
            {hayVacio && !errorCarga && (
              <div className="vacio">
                <span className="vacio-ico"><Svg tam={24} ancho={1.7}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="m3.5 6 1 1 2-2" /><path d="m3.5 12 1 1 2-2" /><path d="m3.5 18 1 1 2-2" /></Svg></span>
                <b>{nadaDeNada ? "Todavía no hay tareas" : q ? "No hay tareas con ese nombre" : "No quedan tareas abiertas"}</b>
                <span>{nadaDeNada ? "Crea la primera y aparece acá, ordenada por fecha." : q ? "Prueba con otra palabra o limpia la búsqueda." : "Las completadas se ven desde Ordenar por."}</span>
                {q ? <button type="button" className="btn" onClick={() => { setBusca(""); setBuscando(false); }}>Limpiar búsqueda</button>
                  : nadaDeNada && <button type="button" className="btn-pri" onClick={() => abrirNueva("__top")}>Crear la primera tarea</button>}
              </div>
            )}
            {grupos.map((g) => {
              const abierto = !plegados[g.key];
              return (
                <div key={g.key} className="grupo">
                  <div className="ghead">
                    <button type="button" className="caret" onClick={() => setPlegados((p) => ({ ...p, [g.key]: !p[g.key] }))} aria-label="Plegar grupo"><Caret abierto={abierto} /></button>
                    {g.texto ? <span className="glabel" style={{ color: g.color }}>{g.label}</span> : <span className="pastilla" style={{ background: g.bg, color: g.ink }}>{g.label}</span>}
                    <span className="conteo">{g.lista.length}</span>
                  </div>
                  {abierto && (
                    <div className="gcuerpo">
                      <div className="cols"><span>Nombre</span><span>Responsable</span><span>Fecha</span><span>Calendario</span><span>Prioridad</span><span>Edad</span><span>Tipo</span><span /></div>
                      {g.lista.map(filaTarea)}
                      {g.nuevaAqui ? filaNueva() : (
                        <button type="button" className="add" onClick={() => abrirNueva(g.key)}><IcoMas />Añadir tarea</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>)}
      </section>

      {panel()}

      {pop && (<>
        <button type="button" className="pop-fondo" onClick={cerrarPop} aria-label="Cerrar menú" />
        <div className="pop" style={{ left: pop.left, top: pop.top, minWidth: pop.ancho }} onClick={parar}>{contenidoPop()}</div>
      </>)}

      {selIds.length > 0 && (
        <div className="lote">
          <button type="button" className="lote-x" onClick={() => { setSel({}); setLoteBorrar(false); setPop(null); }} aria-label="Quitar selección"><IcoX tam={11} /></button>
          <span style={{ fontSize: 12, padding: "0 4px 0 6px" }}><b>{selIds.length}</b> {selIds.length === 1 ? "seleccionada" : "seleccionadas"}</span>
          <span className="lote-sep" />
          <button type="button" className="lote-btn" onClick={() => { guardar(selIds, { estado: "comp" }); setSel({}); avisar(selIds.length + (selIds.length === 1 ? " tarea completada" : " tareas completadas")); }}><IconoEstado estado="comp" tam={13} />Completar</button>
          <button type="button" className="lote-btn" onClick={(e) => abrirPop(e, "prio", "lote", 200, 230)}><Bandera prio={null} />Prioridad</button>
          <button type="button" className="lote-btn" onClick={(e) => abrirPop(e, "fecha", "lote", 470, 330)}><IcoCal />Fecha</button>
          <button type="button" className="lote-btn" onClick={(e) => abrirPop(e, "tipo", "lote", 240, 110)}><span className="cuadro" style={{ background: "rgba(255,255,255,.6)", width: 10, height: 10 }} />Tipo</button>
          <span className="lote-sep" />
          <button type="button" className={"lote-btn borrar " + (loteBorrar ? "conf" : "")} onClick={async () => {
            if (!loteBorrar) { setLoteBorrar(true); return; }
            const ids = selIds;
            setSel({}); setLoteBorrar(false);
            setFilas((fs) => fs.filter((f) => !ids.includes(f.id)));
            const { error } = await supabase.from("tareas").delete().in("id", ids);
            if (error) { avisar("No se pudo borrar."); cargar(); } else avisar(ids.length + (ids.length === 1 ? " tarea borrada" : " tareas borradas"));
          }}><IcoTacho tam={13} />{loteBorrar ? "Borrar " + selIds.length : "Borrar"}</button>
        </div>
      )}

      {visor && (
        <div className="visor" role="dialog" aria-label="Imagen" onClick={() => setVisor(null)}>
          <img src={visor} alt="" />
          <button type="button" className="visor-x" aria-label="Cerrar imagen"><IcoX tam={18} /></button>
        </div>
      )}

      <VersionNueva />
      {fbAbierto && <Feedback P={P} yo={yo} pantalla={vista} avisar={avisar} onCerrar={() => setFbAbierto(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
      {cargando && <span className="cargando">Cargando…</span>}
    </div>
  );
}
