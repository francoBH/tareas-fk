"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { achicar, Svg, IcoX } from "@/components/piezas";
import { hace } from "@/lib/fechas";

/* FEEDBACK — para que el equipo cuente qué falla o qué falta, sin tener que mandarle un
   mensaje a Franco. Queda guardado en la base (tabla «feedback») y Claude lo lee al empezar
   cada sesión de trabajo sobre la app: lo que se arregla pasa a «Hecho» con una respuesta. */
const TIPOS = [
  { id: "error", label: "Algo no anda", color: "var(--neg)" },
  { id: "idea", label: "Una idea", color: "var(--ac-ink)" },
  { id: "mejora", label: "Mejorar algo", color: "var(--st-prog)" },
];
const ESTADO = { nuevo: ["Recibido", "var(--t3)"], en_curso: ["En curso", "var(--st-prog)"], hecho: ["Hecho", "var(--pos)"], descartado: ["No se hará", "var(--t3)"] };

export default function Feedback({ P, yo, pantalla, onCerrar, avisar }) {
  const [tipo, setTipo] = useState("idea");
  const [txt, setTxt] = useState("");
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState(null);
  const [urls, setUrls] = useState({});
  const inputRef = useRef(null);

  const cargar = async () => {
    const { data } = await supabase.from("feedback").select("*").order("creado", { ascending: false }).limit(50);
    setLista(data || []);
    const rutas = (data || []).flatMap((f) => f.imagenes || []).map((a) => a.ruta).filter(Boolean);
    if (rutas.length) {
      const { data: u } = await supabase.storage.from("adjuntos").createSignedUrls(rutas, 3600);
      if (u) setUrls(Object.fromEntries(u.map((x) => [x.path, x.signedUrl])));
    }
  };
  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCerrar(); } };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onCerrar]);

  const sumar = (files) => {
    const imgs = [...(files || [])].filter((f) => f.type.startsWith("image/")).slice(0, 4 - fotos.length);
    setFotos((a) => a.concat(imgs.map((f) => ({ id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) }))));
  };
  const enviar = async () => {
    const t = txt.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      const imagenes = await Promise.all(fotos.map(async (f) => {
        const archivo = await achicar(f.file);
        const ruta = "feedback/" + crypto.randomUUID() + ".jpg";
        const { error } = await supabase.storage.from("adjuntos").upload(ruta, archivo, { contentType: archivo.type });
        if (error) throw error;
        return { ruta, nombre: f.file.name, tipo: archivo.type, peso: archivo.size };
      }));
      const { error } = await supabase.from("feedback").insert({ autor: yo, tipo, txt: t, pantalla, imagenes });
      if (error) throw error;
      setTxt(""); setFotos([]);
      avisar("¡Gracias! Lo recibimos");
      cargar();
    } catch { avisar("No se pudo mandar. Prueba de nuevo."); }
    setEnviando(false);
  };

  return (<>
    <button type="button" className="fb-fondo" onClick={onCerrar} aria-label="Cerrar" />
    <div className="fb" role="dialog" aria-label="Feedback">
      <div className="fb-cab">
        <b>Feedback de la app</b>
        <span className="esp" />
        <button type="button" className="rs-ibtn" onClick={onCerrar} aria-label="Cerrar"><IcoX tam={15} /></button>
      </div>
      <div className="fb-cuerpo">
        <div className="fb-tipos">
          {TIPOS.map((x) => (
            <button key={x.id} type="button" className={"fb-tipo" + (tipo === x.id ? " on" : "")} style={{ "--c": x.color }} onClick={() => setTipo(x.id)}>{x.label}</button>
          ))}
        </div>
        <div className="composer"
          onDragOver={(e) => { if ([...e.dataTransfer.types].includes("Files")) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); sumar(e.dataTransfer.files); }}>
          {fotos.length > 0 && (
            <div className="fotos fotos-borrador">
              {fotos.map((f) => (
                <span key={f.id} className="foto"><img src={f.url} alt="" />
                  <button type="button" className="foto-x" aria-label="Quitar imagen" onClick={() => setFotos((xs) => xs.filter((x) => x.id !== f.id))}><IcoX tam={11} /></button>
                </span>
              ))}
            </div>
          )}
          <textarea value={txt} autoFocus aria-label="Qué nos quieres contar"
            placeholder={tipo === "error" ? "¿Qué estabas haciendo y qué pasó?" : tipo === "idea" ? "¿Qué te ayudaría a trabajar mejor?" : "¿Qué cambiarías y por qué?"}
            onChange={(e) => setTxt(e.target.value)}
            onPaste={(e) => { const f = [...(e.clipboardData?.files || [])]; if (f.length) { e.preventDefault(); sumar(f); } }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(); } }} />
          <div className="comp-barra">
            <button type="button" className="eico" onClick={() => inputRef.current?.click()} title="Sumar una captura" aria-label="Sumar una captura">
              <Svg ancho={1.8}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m21 15-4.5-4.5L8 19" /></Svg>
            </button>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { sumar(e.target.files); e.target.value = ""; }} />
            <span className="fb-ayuda">Puedes pegar una captura con ⌘V</span>
            <span className="esp" />
            <button type="button" className="btn-chico pri" disabled={!txt.trim() || enviando} onClick={enviar}>{enviando ? "Mandando…" : "Mandar"}</button>
          </div>
        </div>

        <div className="fb-lista-tit">Lo que mandó el equipo</div>
        {lista === null && <span className="rs-vacio-chico">Cargando…</span>}
        {lista && !lista.length && <span className="rs-vacio-chico">Todavía no hay nada. Lo primero que mandes aparece acá.</span>}
        {lista && lista.map((f) => {
          const p = P[f.autor] || { nombre: f.autor, iniciales: "?", color: "#555" };
          const t = TIPOS.find((x) => x.id === f.tipo) || TIPOS[1];
          const [est, col] = ESTADO[f.estado] || ESTADO.nuevo;
          return (
            <div key={f.id} className="fb-item">
              <div className="fb-item-cab">
                <span className="cara g" style={{ background: p.color }}>{p.iniciales}</span>
                <b>{f.autor === yo ? "Tú" : p.nombre.split(" ")[0]}</b>
                <span className="fb-chip" style={{ "--c": t.color }}>{t.label}</span>
                <span className="fb-hora">{hace(f.creado)}</span>
                <span className="esp" />
                <span className="fb-estado" style={{ color: col }}>{est}</span>
              </div>
              <div className="fb-txt">{f.txt}</div>
              {(f.imagenes || []).length > 0 && (
                <div className="fotos">{f.imagenes.map((a) => <a key={a.ruta} className="foto" href={urls[a.ruta]} target="_blank" rel="noopener noreferrer">{urls[a.ruta] ? <img src={urls[a.ruta]} alt="" /> : <span className="foto-hueco" />}</a>)}</div>
              )}
              {f.respuesta && <div className="fb-resp"><b>Respuesta:</b> {f.respuesta}</div>}
            </div>
          );
        })}
      </div>
    </div>
  </>);
}
