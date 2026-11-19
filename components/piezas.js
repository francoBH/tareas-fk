"use client";
import { useRef, useState } from "react";
import { sinTildes } from "@/lib/fechas";


/* ── íconos ── */
export function IconoEstado({ estado, tam = 14 }) {
  const col = "var(--st-" + estado + ")";
  if (estado === "idea") {
    return (
      <svg width={tam + 1} height={tam + 1} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 17.2h6" /><path d="M10 20.2h4" />
        <path d="M12 2.8a6.2 6.2 0 0 0-3.6 11.25c.5.36.8.94.8 1.55h5.6c0-.61.3-1.19.8-1.55A6.2 6.2 0 0 0 12 2.8Z" />
      </svg>
    );
  }
  const act = estado === "prog" || estado === "rev" || estado === "corr";
  const comp = estado === "comp";
  return (
    <svg width={tam} height={tam} viewBox="0 0 14 14" aria-hidden="true" style={{ flex: "none" }}>
      <circle cx="7" cy="7" r="5.6" fill={comp ? col : "none"} stroke={col} strokeWidth="1.5" strokeDasharray={estado === "sin" ? "2.2 1.8" : undefined} />
      {act && <circle cx="7" cy="7" r="2.7" fill={col} />}
      {comp && <path d="m4.6 7 1.7 1.7 3.2-3.3" fill="none" stroke="var(--bg-2)" strokeWidth="1.6" />}
    </svg>
  );
}
export function Bandera({ prio, tam = 13 }) {
  const c = prio ? "var(--p-" + prio + ")" : "var(--t4)";
  return <svg width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}><path d="M5 21V4h11l-1.8 4L16 12H5" fill={prio ? c : "none"} stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}
export const Svg = ({ children, tam = 15, ancho = 1.8 }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ancho} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
export const IcoCal = ({ tam = 13 }) => <Svg tam={tam}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17" /><path d="M8 3v4" /><path d="M16 3v4" /></Svg>;
export const IcoMas = ({ tam = 12 }) => <Svg tam={tam} ancho={2}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>;
export const IcoPuntos = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>;
export const IcoTacho = ({ tam = 12 }) => <Svg tam={tam} ancho={2}><path d="M4 7h16" /><path d="M9 7V4.5h6V7" /><path d="M6 7l1 13h10l1-13" /></Svg>;
export const IcoLapiz = ({ tam = 12 }) => <Svg tam={tam} ancho={2}><path d="M4.5 19.5h3.8L19 8.8a2.2 2.2 0 0 0-3.1-3.1L5.2 16.4l-.7 3.1Z" /><path d="m14.2 7.4 3.1 3.1" /></Svg>;
export const IcoRama = ({ tam = 11 }) => <Svg tam={tam} ancho={2.1}><circle cx="6.5" cy="5.5" r="2.3" /><path d="M6.5 7.8V12a4.5 4.5 0 0 0 4.5 4.5h4.7" /><circle cx="18" cy="16.5" r="2.3" /></Svg>;
export const IcoTilde = ({ tam = 14, ancho = 2.4 }) => <Svg tam={tam} ancho={ancho}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const IcoEnviar = () => <Svg tam={14} ancho={2}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></Svg>;
export const Caret = ({ abierto }) => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ transform: abierto ? "none" : "rotate(-90deg)" }}><path d="M1.5 3h7L5 7.5Z" fill="currentColor" /></svg>;
export const IcoX = ({ tam = 15 }) => <Svg tam={tam} ancho={2}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Svg>;

export function Caras({ ids, P, grande }) {
  return (
    <span className="caras">
      {ids.filter((id) => P[id]).map((id) => (
        <span key={id} className={"cara" + (grande ? " g" : "")} style={{ background: P[id].color }} title={P[id].nombre}>{P[id].iniciales}</span>
      ))}
    </span>
  );
}

/* Separa el texto en partes y marca las menciones a una persona. */
export function Texto({ txt, P }) {
  return <Formato txt={txt} P={P} />;
}

/* ══ TEXTO CON FORMATO (como Blue OS): se guarda como texto simple y se dibuja con formato.
   **negrita** · _cursiva_ · ~~tachado~~ · líneas que empiezan con «- » (viñetas) o «1. »
   (numeradas) · links que empiezan con http · @Nombre de alguien del equipo.
   Se dibuja con elementos de React, nunca con HTML crudo: lo que alguien escribe no puede
   meter código en la página. ══ */
function enLinea(txt, P, k0) {
  const nombres = Object.values(P || {}).map((p) => "@" + p.nombre).sort((a, b) => b.length - a.length);
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const partes = ["\\*\\*[^*\\n]+?\\*\\*", "~~[^~\\n]+?~~", "(?<![\\w])_[^_\\n]+?_(?![\\w])", "https?:\\/\\/[^\\s<]+[^\\s<.,;:!?)\\]]"].concat(nombres.map(esc));
  const re = new RegExp("(" + partes.join("|") + ")", "g");
  const out = [];
  let i = 0, m, k = 0;
  while ((m = re.exec(txt))) {
    if (m.index > i) out.push(txt.slice(i, m.index));
    const t = m[0], key = k0 + "-" + k++;
    if (t.startsWith("**")) out.push(<b key={key}>{enLinea(t.slice(2, -2), P, key)}</b>);
    else if (t.startsWith("~~")) out.push(<s key={key}>{enLinea(t.slice(2, -2), P, key)}</s>);
    else if (t.startsWith("_")) out.push(<i key={key}>{enLinea(t.slice(1, -1), P, key)}</i>);
    else if (t.startsWith("http")) out.push(<a key={key} href={t} target="_blank" rel="noopener noreferrer" className="fmt-link" onClick={(e) => e.stopPropagation()}>{t.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a>);
    else out.push(<span key={key} className="mencion">{t}</span>);
    i = m.index + t.length;
  }
  if (i < txt.length) out.push(txt.slice(i));
  return out;
}
export function Formato({ txt, P, className = "com-txt" }) {
  const lineas = String(txt || "").split("\n");
  const bloques = [];
  lineas.forEach((l, n) => {
    const vi = /^\s*[-*•]\s+(.*)$/.exec(l), nu = /^\s*(\d+)[.)]\s+(.*)$/.exec(l);
    const ult = bloques[bloques.length - 1];
    if (vi) { if (ult && ult.t === "ul") ult.items.push(vi[1]); else bloques.push({ t: "ul", items: [vi[1]] }); }
    else if (nu) { if (ult && ult.t === "ol") ult.items.push(nu[2]); else bloques.push({ t: "ol", start: Number(nu[1]), items: [nu[2]] }); }
    else bloques.push({ t: "p", txt: l, n });
  });
  return (
    <div className={className + " fmt"}>
      {bloques.map((b, i) => b.t === "ul" ? <ul key={i}>{b.items.map((x, j) => <li key={j}>{enLinea(x, P, i + "." + j)}</li>)}</ul>
        : b.t === "ol" ? <ol key={i} start={b.start}>{b.items.map((x, j) => <li key={j}>{enLinea(x, P, i + "." + j)}</li>)}</ol>
        : b.txt.trim() ? <p key={i}>{enLinea(b.txt, P, String(i))}</p> : <p key={i} className="fmt-vacia">&nbsp;</p>)}
    </div>
  );
}

/* ══ EL EDITOR: la misma barra de formato y los mismos atajos para la descripción y el hilo ══
   ⌘B negrita · ⌘I cursiva · ⌘⇧X tachado · ⌘K link · Enter dentro de una lista sigue la lista. */
export function usarEditor(txt, setTxt) {
  const ref = useRef(null);
  const reemplazar = (a, b, nuevo, selA, selB) => {
    const v = ref.current ? ref.current.value : txt;
    const n = v.slice(0, a) + nuevo + v.slice(b);
    setTxt(n);
    requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(selA, selB); } });
  };
  const envolver = (marca) => {
    const el = ref.current; if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd, v = el.value, sel = v.slice(a, b);
    if (sel.startsWith(marca) && sel.endsWith(marca) && sel.length >= marca.length * 2) { reemplazar(a, b, sel.slice(marca.length, -marca.length), a, b - marca.length * 2); return; }
    reemplazar(a, b, marca + (sel || "texto") + marca, a + marca.length, a + marca.length + (sel || "texto").length);
  };
  const lista = (tipo) => {
    const el = ref.current; if (!el) return;
    const v = el.value, a = v.lastIndexOf("\n", el.selectionStart - 1) + 1;
    let b = v.indexOf("\n", el.selectionEnd); if (b < 0) b = v.length;
    const ls = v.slice(a, b).split("\n");
    const yaEs = ls.every((l) => (tipo === "ul" ? /^\s*[-*•]\s/ : /^\s*\d+[.)]\s/).test(l));
    const nuevo = ls.map((l, i) => {
      const limpia = l.replace(/^\s*([-*•]|\d+[.)])\s+/, "");
      return yaEs ? limpia : (tipo === "ul" ? "- " : (i + 1) + ". ") + limpia;
    }).join("\n");
    reemplazar(a, b, nuevo, a + nuevo.length, a + nuevo.length);
  };
  const link = () => {
    const el = ref.current; if (!el) return;
    const a = el.selectionStart, b = el.selectionEnd, sel = el.value.slice(a, b);
    const ins = /^https?:\/\//.test(sel) ? sel : "https://";
    reemplazar(a, b, ins, a + ins.length, a + ins.length);
  };
  const arroba = () => {
    const el = ref.current; const v = el ? el.value : txt; const a = el ? el.selectionStart : v.length;
    const ins = (a > 0 && !/\s/.test(v[a - 1]) ? " @" : "@");
    reemplazar(a, el ? el.selectionEnd : a, ins, a + ins.length, a + ins.length);
  };
  /* Devuelve true si la tecla ya la usó el editor. */
  const teclas = (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === "b") { e.preventDefault(); envolver("**"); return true; }
    if (mod && !e.shiftKey && e.key.toLowerCase() === "i") { e.preventDefault(); envolver("_"); return true; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "x") { e.preventDefault(); envolver("~~"); return true; }
    if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); link(); return true; }
    if (e.key === "Enter" && e.shiftKey === false && !mod) {
      const el = ref.current; if (!el || el.selectionStart !== el.selectionEnd) return false;
      const v = el.value, ini = v.lastIndexOf("\n", el.selectionStart - 1) + 1, linea = v.slice(ini, el.selectionStart);
      const vi = /^(\s*[-*•]\s+)(.*)$/.exec(linea), nu = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(linea);
      if (!vi && !nu) return false;
      e.preventDefault();
      if ((vi && !vi[2].trim()) || (nu && !nu[4].trim())) { reemplazar(ini, el.selectionStart, "", ini, ini); return true; }
      const sig = vi ? vi[1] : nu[1] + (Number(nu[2]) + 1) + nu[3];
      reemplazar(el.selectionStart, el.selectionStart, "\n" + sig, el.selectionStart + 1 + sig.length, el.selectionStart + 1 + sig.length);
      return true;
    }
    return false;
  };
  return { ref, envolver, lista, link, arroba, teclas };
}
export function BarraFormato({ ed, conArroba = true }) {
  const B = ({ t, on, children }) => <button type="button" className="fmt-btn" title={t} aria-label={t} onMouseDown={(e) => e.preventDefault()} onClick={on}>{children}</button>;
  return (
    <span className="fmt-barra">
      <B t="Negrita · ⌘B" on={() => ed.envolver("**")}><b>B</b></B>
      <B t="Cursiva · ⌘I" on={() => ed.envolver("_")}><i style={{ fontFamily: "Georgia, serif" }}>I</i></B>
      <B t="Tachado · ⌘⇧X" on={() => ed.envolver("~~")}><s>S</s></B>
      <span className="fmt-sep" />
      <B t="Viñetas" on={() => ed.lista("ul")}><Svg tam={15} ancho={1.8}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><circle cx="4.5" cy="6" r=".9" fill="currentColor" /><circle cx="4.5" cy="12" r=".9" fill="currentColor" /><circle cx="4.5" cy="18" r=".9" fill="currentColor" /></Svg></B>
      <B t="Lista numerada" on={() => ed.lista("ol")}><Svg tam={15} ancho={1.8}><path d="M10 6h10" /><path d="M10 12h10" /><path d="M10 18h10" /><path d="M4 5h1v4" /><path d="M4 9h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></Svg></B>
      <B t="Link · ⌘K" on={ed.link}><Svg tam={15} ancho={1.8}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></Svg></B>
      {conArroba && <B t="Nombrar a alguien" on={ed.arroba}><Svg tam={15} ancho={1.8}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></Svg></B>}
    </span>
  );
}
/* Las sugerencias de @: la persona escribe «@Ka» y elige a Katherine. */
export function Sugerir({ txt, setTxt, P, claves, edRef }) {
  const el = edRef?.current;
  const hasta = el && document.activeElement === el ? el.selectionStart : txt.length;
  const m = /@([^\s@]*)$/.exec(txt.slice(0, hasta));
  const lista = m ? claves.map((k) => P[k]).filter((p) => p && sinTildes(p.nombre).includes(sinTildes(m[1]))) : [];
  if (!lista.length) return null;
  return (
    <div className="sugerir">
      {lista.map((p) => (
        <button key={p.clave} type="button" className="opt" onMouseDown={(e) => e.preventDefault()} onClick={() => {
          const ini = hasta - m[0].length, ins = "@" + p.nombre + " ";
          setTxt(txt.slice(0, ini) + ins + txt.slice(hasta));
          requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(ini + ins.length, ini + ins.length); } });
        }}>
          <span className="cara" style={{ background: p.color }}>{p.iniciales}</span>{p.nombre}
        </button>
      ))}
    </div>
  );
}

/* Achica las fotos grandes antes de subirlas (una foto de celular pesa 3–6 MB; así queda en
   unos cientos de KB y sube rápido). Los GIF y las imágenes chicas van tal cual. */
export async function achicar(file) {
  if (file.type === "image/gif" || file.size < 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const lado = 1920, k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

/* ── Documentos (11 nov 2026): además de imágenes, PDF, Word, Excel, PowerPoint, texto, CSV,
   ZIP, video y audio. Los tipos son los mismos que acepta el cajón de la base; lo demás se
   frena antes de subir con un aviso, para no fallar a mitad de camino. ── */
export const TIPOS_OK = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/heic", "image/heif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed", "video/mp4", "video/quicktime", "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg", "audio/wav", "audio/x-m4a", "audio/aac",
];
export const ACEPTA = TIPOS_OK.join(",") + ",.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.mp4,.mov,.mp3,.m4a";
export const PESO_MAX = 25 * 1024 * 1024;
export const esImagen = (tipo) => /^image\//.test(tipo || "");
export function pesoTxt(b) {
  if (!b) return "";
  if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + " KB";
  return (Math.round((b / 1024 / 1024) * 10) / 10).toString().replace(".", ",") + " MB";
}
function etiquetaDoc(nombre, tipo) {
  const ext = ((nombre || "").split(".").pop() || "").toLowerCase();
  if (tipo === "application/pdf" || ext === "pdf") return ["PDF", "#D93A2B"];
  if (/word/.test(tipo) || ext === "doc" || ext === "docx") return ["DOC", "#2F74D6"];
  if (/sheet|excel|csv/.test(tipo) || ["xls", "xlsx", "csv"].includes(ext)) return ["XLS", "#2F9E6E"];
  if (/presentation|powerpoint/.test(tipo) || ["ppt", "pptx"].includes(ext)) return ["PPT", "#DC682A"];
  if (/zip/.test(tipo)) return ["ZIP", "#7C8698"];
  if (/^video/.test(tipo)) return ["VID", "#8a5cf6"];
  if (/^audio/.test(tipo)) return ["MP3", "#8a5cf6"];
  return ["TXT", "#7C8698"];
}
/* Un documento: su sello de tipo, el nombre y el peso. Se abre en otra pestaña (o se baja). */
export function Doc({ a, url, onQuitar, subiendo }) {
  const [et, col] = etiquetaDoc(a.nombre, a.tipo);
  const cuerpo = (<>
    <span className="doc-sello" style={{ background: col }}>{et}</span>
    <span className="doc-txt"><b title={a.nombre}>{a.nombre}</b><span>{subiendo ? "Subiendo…" : pesoTxt(a.peso)}</span></span>
  </>);
  return (
    <span className={"doc" + (subiendo ? " subiendo" : "")}>
      {url ? <a className="doc-link" href={url} target="_blank" rel="noopener noreferrer" download={a.nombre}>{cuerpo}</a> : <span className="doc-link">{cuerpo}</span>}
      {onQuitar && <button type="button" className="doc-x" aria-label={"Quitar " + a.nombre} onClick={onQuitar}><IcoX tam={11} /></button>}
    </span>
  );
}
export function Docs({ lista, urls, onQuitar, subiendo }) {
  if (!lista || !lista.length) return null;
  return (
    <div className="docs">
      {lista.map((a, i) => a.voz
        ? <NotaVoz key={a.ruta || i} a={a} url={(a.ruta && urls[a.ruta]) || a.local} subiendo={subiendo} onQuitar={onQuitar ? () => onQuitar(a) : null} />
        : <Doc key={a.ruta || i} a={a} url={a.ruta ? urls[a.ruta] : null} subiendo={subiendo} onQuitar={onQuitar ? () => onQuitar(a) : null} />)}
    </div>
  );
}

/* ══ NOTAS DE VOZ (como Blue OS): se graban desde la caja del hilo y abajo va su transcripción.
   La transcripción la hace el propio navegador mientras se habla (gratis, sin mandar el audio a
   ningún servicio). Funciona en Chrome, Edge y Safari; si el navegador no sabe, la nota va sin texto. ══ */
const mmss = (s) => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
export function NotaVoz({ a, url, onQuitar, subiendo }) {
  const ref = useRef(null);
  const [sonando, setSonando] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(a.duracion || 0);
  const [verTxt, setVerTxt] = useState(false);
  const toggle = (e) => { e.stopPropagation(); const el = ref.current; if (!el || !url) return; if (el.paused) el.play(); else el.pause(); };
  const ir = (e) => {
    e.stopPropagation(); const el = ref.current; if (!el || !dur) return;
    const r = e.currentTarget.getBoundingClientRect(); el.currentTime = Math.min(dur, Math.max(0, ((e.clientX - r.left) / r.width) * dur)); setT(el.currentTime);
  };
  return (
    <span className={"voz" + (subiendo ? " subiendo" : "")} onClick={(e) => e.stopPropagation()}>
      <span className="voz-fila">
        <button type="button" className="voz-play" onClick={toggle} disabled={!url} aria-label={sonando ? "Pausar" : "Escuchar"}>
          {sonando ? <Svg tam={14} ancho={2.4}><path d="M8 5v14" /><path d="M16 5v14" /></Svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" /></svg>}
        </button>
        <span className="voz-barra" onClick={ir} role="slider" aria-label="Posición" aria-valuenow={Math.round(t)} aria-valuemax={Math.round(dur)}>
          <span className="voz-onda" />
          <span className="voz-lleno" style={{ width: (dur ? (t / dur) * 100 : 0) + "%" }} />
        </span>
        <span className="voz-tiempo">{subiendo ? "Subiendo…" : mmss(sonando || t ? t : dur)}</span>
        {onQuitar && <button type="button" className="voz-x" aria-label="Quitar la nota de voz" onClick={onQuitar}><IcoX tam={11} /></button>}
      </span>
      {a.transcripcion
        ? <button type="button" className="voz-txt-btn" onClick={(e) => { e.stopPropagation(); setVerTxt((v) => !v); }}>{verTxt ? "Ocultar transcripción" : "Ver transcripción"}</button>
        : !subiendo && <span className="voz-sin">Sin transcripción</span>}
      {verTxt && a.transcripcion && <span className="voz-txt">{a.transcripcion}</span>}
      {url && <audio ref={ref} src={url} preload="metadata" onPlay={() => setSonando(true)} onPause={() => setSonando(false)} onEnded={() => { setSonando(false); setT(0); }}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (isFinite(d) && d > 0) setDur(d); }} />}
    </span>
  );
}

/* El grabador: pide el micrófono, graba hasta 5 minutos y transcribe mientras tanto. */
export function usarGrabador(onListo, onError) {
  const [grabando, setGrabando] = useState(false);
  const [seg, setSeg] = useState(0);
  const [vivo, setVivo] = useState("");
  const r = useRef({});
  const parar = (guardar) => {
    const x = r.current;
    clearInterval(x.reloj);
    try { x.rec && x.rec.stop(); } catch {}
    x.guardar = guardar;
    try { if (x.mr && x.mr.state !== "inactive") x.mr.stop(); } catch {}
    setGrabando(false);
  };
  const empezar = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { onError("Este navegador no puede grabar audio."); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { onError("No pude usar el micrófono. Revisa que el navegador tenga permiso."); return; }
    const tipos = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mime = tipos.find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const partes = [], x = { mr, partes, final: "", inicio: Date.now(), guardar: false };
    r.current = x;
    mr.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (!x.guardar) return;
      const base = (mr.mimeType || mime || "audio/webm").split(";")[0];
      const blob = new Blob(partes, { type: base });
      const ext = base.includes("mp4") ? "m4a" : base.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], "Nota de voz." + ext, { type: base });
      const duracion = (Date.now() - x.inicio) / 1000;
      onListo({ file, duracion, transcripcion: (x.final + " " + (x.parcial || "")).replace(/\s+/g, " ").trim() });
    };
    mr.start(500);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR(); rec.lang = "es-AR"; rec.continuous = true; rec.interimResults = true;
        rec.onresult = (ev) => {
          let parcial = "";
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) x.final += " " + ev.results[i][0].transcript; else parcial += ev.results[i][0].transcript;
          }
          x.parcial = parcial; setVivo((x.final + " " + parcial).trim());
        };
        rec.onend = () => { if (x.mr.state === "recording") { try { rec.start(); } catch {} } };
        rec.start(); x.rec = rec;
      } catch {}
    }
    setSeg(0); setVivo(""); setGrabando(true);
    x.reloj = setInterval(() => {
      const s = Math.round((Date.now() - x.inicio) / 1000); setSeg(s);
      if (s >= 300) parar(true);
    }, 250);
  };
  return { grabando, seg, vivo, empezar, listo: () => parar(true), cancelar: () => parar(false) };
}

/* Las fotos de un comentario: miniaturas que se abren en grande al tocarlas. */
export function Fotos({ c, urls, onVer }) {
  const lista = (c.imagenes || []).length ? c.imagenes.map((p, i) => urls[p] || (c.locales || [])[i]) : (c.locales || []);
  if (!lista.length) return null;
  return (
    <div className="fotos">
      {lista.map((u, i) => (
        <button key={i} type="button" className={"foto" + (c.subiendo ? " subiendo" : "")} onClick={() => u && onVer(u)} aria-label="Ver imagen">
          {u ? <img src={u} alt="" loading="lazy" /> : <span className="foto-hueco" />}
        </button>
      ))}
    </div>
  );
}

/* La caja de escribir, la misma para el comentario principal y para responder en el hilo:
   texto, @ para nombrar, y fotos con el clip, pegando (⌘V) o arrastrando. */
export function Composer({ P, claves, placeholder, autoFocus, onEnviar, onCancelar, conCancelar }) {
  const [txt, setTxt] = useState("");
  const [archivos, setArchivos] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef(null);
  const [avisoTipo, setAvisoTipo] = useState("");
  const sumar = (files) => {
    const todos = [...files];
    const ok = todos.filter((f) => TIPOS_OK.includes(f.type) && f.size <= PESO_MAX);
    if (ok.length < todos.length) setAvisoTipo(todos.some((f) => f.size > PESO_MAX) ? "Hay archivos de más de 25 MB: esos no se suben." : "Ese tipo de archivo no se puede subir. Sirven imágenes, PDF, Word, Excel, PowerPoint, texto, ZIP, video y audio.");
    else setAvisoTipo("");
    if (!ok.length) return;
    setArchivos((a) => a.concat(ok.slice(0, 10 - a.length).map((f) => ({ id: crypto.randomUUID(), file: f, img: esImagen(f.type), url: esImagen(f.type) ? URL.createObjectURL(f) : null }))));
  };
  const enviar = async () => {
    if (!txt.trim() && !archivos.length) return;
    const t = txt, a = archivos;
    setTxt(""); setArchivos([]);
    const ok = await onEnviar(t, a);
    if (!ok) { setTxt(t); setArchivos(a); }
  };
  const ed = usarEditor(txt, setTxt);
  const gr = usarGrabador(
    ({ file, duracion, transcripcion }) => setArchivos((a) => a.concat([{ id: crypto.randomUUID(), file, img: false, voz: true, duracion, transcripcion, local: URL.createObjectURL(file) }])),
    (m) => setAvisoTipo(m),
  );
  return (
    <div className={"composer" + (arrastrando ? " arrastrando" : "") + (gr.grabando ? " grabando" : "")}
      onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); setArrastrando(true); } }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); sumar(e.dataTransfer.files); }}>
      <Sugerir txt={txt} setTxt={setTxt} P={P} claves={claves} edRef={ed.ref} />
      {archivos.some((a) => a.img) && (
        <div className="fotos fotos-borrador">
          {archivos.filter((a) => a.img).map((a) => (
            <span key={a.id} className="foto">
              <img src={a.url} alt="" />
              <button type="button" className="foto-x" aria-label="Quitar imagen" onClick={() => setArchivos((xs) => xs.filter((x) => x.id !== a.id))}><IcoX tam={11} /></button>
            </span>
          ))}
        </div>
      )}
      {archivos.some((a) => !a.img) && (
        <div className="docs">
          {archivos.filter((a) => !a.img).map((a) => (
            a.voz
              ? <NotaVoz key={a.id} a={a} url={a.local} onQuitar={() => setArchivos((xs) => xs.filter((x) => x.id !== a.id))} />
              : <Doc key={a.id} a={{ nombre: a.file.name, tipo: a.file.type, peso: a.file.size }} onQuitar={() => setArchivos((xs) => xs.filter((x) => x.id !== a.id))} />
          ))}
        </div>
      )}
      {avisoTipo && <span className="comp-aviso">{avisoTipo}</span>}
      {gr.grabando && (
        <div className="grab">
          <span className="grab-punto" /><span className="grab-t">{mmss(gr.seg)}</span>
          <span className="grab-vivo">{gr.vivo || "Escuchando…"}</span>
          <button type="button" className="btn-chico sec" onClick={gr.cancelar}>Cancelar</button>
          <button type="button" className="btn-chico pri" onClick={gr.listo}>Listo</button>
        </div>
      )}
      <textarea ref={ed.ref} placeholder={placeholder} value={txt} autoFocus={autoFocus} aria-label={placeholder} hidden={gr.grabando}
        onChange={(e) => setTxt(e.target.value)}
        onPaste={(e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); sumar(f); } }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && onCancelar) { e.preventDefault(); onCancelar(); }
          if (ed.teclas(e)) return;
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
        }} />
      <div className="comp-barra">
        <button type="button" className="eico" onClick={() => inputRef.current?.click()} aria-label="Adjuntar imagen o documento" title="Adjuntar imagen o documento">
          <Svg ancho={1.8}><path d="m20.5 11.5-8.3 8.3a5.2 5.2 0 0 1-7.4-7.4l8.6-8.6a3.5 3.5 0 0 1 4.9 4.9l-8.4 8.4a1.7 1.7 0 0 1-2.5-2.5l7.8-7.8" /></Svg>
        </button>
        <input ref={inputRef} type="file" accept={ACEPTA} multiple hidden onChange={(e) => { sumar(e.target.files); e.target.value = ""; }} />
        <button type="button" className={"eico" + (gr.grabando ? " on" : "")} onClick={() => (gr.grabando ? gr.listo() : gr.empezar())}
          aria-label={gr.grabando ? "Terminar la nota de voz" : "Grabar una nota de voz"} title={gr.grabando ? "Terminar la nota de voz" : "Grabar una nota de voz"}>
          <Svg ancho={1.8}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0" /><path d="M12 17.5V21" /></Svg>
        </button>
        <BarraFormato ed={ed} />
        <span className="esp" />
        {conCancelar && <button type="button" className="btn-chico sec" onClick={onCancelar}>Cancelar</button>}
        <button type="button" className="enviar" disabled={gr.grabando || (!txt.trim() && !archivos.length)} aria-label="Enviar" onClick={enviar}><IcoEnviar /></button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
