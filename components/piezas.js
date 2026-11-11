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
  const nombres = Object.values(P).map((p) => "@" + p.nombre);
  if (!nombres.length) return <span className="com-txt">{txt}</span>;
  const re = new RegExp("(" + nombres.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "g");
  return <span className="com-txt">{String(txt).split(re).filter(Boolean).map((p, i) => <span key={i} className={nombres.includes(p) ? "mencion" : ""}>{p}</span>)}</span>;
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
  "application/zip", "application/x-zip-compressed", "video/mp4", "video/quicktime", "audio/mpeg", "audio/mp4",
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
  return <div className="docs">{lista.map((a, i) => <Doc key={a.ruta || i} a={a} url={a.ruta ? urls[a.ruta] : null} subiendo={subiendo} onQuitar={onQuitar ? () => onQuitar(a) : null} />)}</div>;
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
  const m = /@([^\s@]*)$/.exec(txt);
  const sugerir = m ? claves.map((k) => P[k]).filter((p) => sinTildes(p.nombre).includes(sinTildes(m[1]))) : [];
  return (
    <div className={"composer" + (arrastrando ? " arrastrando" : "")}
      onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) { e.preventDefault(); setArrastrando(true); } }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); sumar(e.dataTransfer.files); }}>
      {sugerir.length > 0 && (
        <div className="sugerir">
          {sugerir.map((p) => (
            <button key={p.clave} type="button" className="opt" onClick={() => setTxt((c) => c.replace(/@([^\s@]*)$/, "@" + p.nombre + " "))}>
              <span className="cara" style={{ background: p.color }}>{p.iniciales}</span>{p.nombre}
            </button>
          ))}
        </div>
      )}
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
            <Doc key={a.id} a={{ nombre: a.file.name, tipo: a.file.type, peso: a.file.size }} onQuitar={() => setArchivos((xs) => xs.filter((x) => x.id !== a.id))} />
          ))}
        </div>
      )}
      {avisoTipo && <span className="comp-aviso">{avisoTipo}</span>}
      <textarea placeholder={placeholder} value={txt} autoFocus={autoFocus} aria-label={placeholder}
        onChange={(e) => setTxt(e.target.value)}
        onPaste={(e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); sumar(f); } }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && onCancelar) { e.preventDefault(); onCancelar(); }
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
        }} />
      <div className="comp-barra">
        <button type="button" className="eico" onClick={() => inputRef.current?.click()} aria-label="Adjuntar imagen o documento" title="Adjuntar imagen o documento">
          <Svg ancho={1.8}><path d="m20.5 11.5-8.3 8.3a5.2 5.2 0 0 1-7.4-7.4l8.6-8.6a3.5 3.5 0 0 1 4.9 4.9l-8.4 8.4a1.7 1.7 0 0 1-2.5-2.5l7.8-7.8" /></Svg>
        </button>
        <input ref={inputRef} type="file" accept={ACEPTA} multiple hidden onChange={(e) => { sumar(e.target.files); e.target.value = ""; }} />
        <button type="button" className="eico" onClick={() => setTxt((c) => c + (c && !/\s$/.test(c) ? " @" : "@"))} aria-label="Nombrar a alguien">
          <Svg ancho={1.8}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" /></Svg>
        </button>
        <span className="esp" />
        {conCancelar && <button type="button" className="btn-chico sec" onClick={onCancelar}>Cancelar</button>}
        <button type="button" className="enviar" disabled={!txt.trim() && !archivos.length} aria-label="Enviar" onClick={enviar}><IcoEnviar /></button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */
