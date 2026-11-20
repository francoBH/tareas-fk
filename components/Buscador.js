"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Caras, IconoEstado, Svg } from "@/components/piezas";
import { fechaCorta, fechaRel, iso, sinTildes } from "@/lib/fechas";

/* ════════════════════════════════════════════════════════════════════════════════
   EL BUSCADOR — ⌘J o ⌘K (Ctrl J / Ctrl K), desde cualquier pantalla (20-nov-2026).
   Copia del buscador global de Blue OS (components/shell/BuscadorGlobal.tsx), con una
   sola fuente: los títulos de TODAS las tareas, abiertas y completadas, cada una con su
   estado tal como se ve en la app. Sin escribir muestra las últimas que abriste.
   Flechas para moverse, Enter abre la tarea, Escape cierra.
   ════════════════════════════════════════════════════════════════════════════════ */

const ESTADOS = { idea: "Idea", sin: "Sin iniciar", prog: "En progreso", rev: "En revisión", corr: "Corregir", comp: "Completada" };
const TOPE = 60;
const CLAVE_REC = "tf-recientes";

export function leerRecientes() { try { return JSON.parse(localStorage.getItem(CLAVE_REC) || "[]"); } catch { return []; } }
export function anotarReciente(id) {
  try { localStorage.setItem(CLAVE_REC, JSON.stringify([id].concat(leerRecientes().filter((x) => x !== id)).slice(0, 12))); } catch {}
}

/* El nombre con lo buscado resaltado (ignora tildes y mayúsculas). */
function Resaltado({ txt, palabras }) {
  if (!palabras.length) return txt;
  const base = sinTildes(txt);
  const marcas = new Array(txt.length).fill(false);
  palabras.forEach((p) => { let i = base.indexOf(p); while (i >= 0) { for (let j = i; j < i + p.length; j++) marcas[j] = true; i = base.indexOf(p, i + p.length); } });
  const out = [];
  let i = 0;
  while (i < txt.length) {
    const m = marcas[i]; let j = i;
    while (j < txt.length && marcas[j] === m) j++;
    out.push(m ? <mark key={i}>{txt.slice(i, j)}</mark> : txt.slice(i, j));
    i = j;
  }
  return out;
}

export default function Buscador({ onCerrar, tareas, P, tipDe, abrirTarea, hoy }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [idx, setIdx] = useState(0);
  const caja = useRef(null);
  const lista = useRef(null);
  const [recientes] = useState(leerRecientes);

  useEffect(() => { const r = setTimeout(() => caja.current?.focus(), 0); return () => clearTimeout(r); }, []);

  const palabras = useMemo(() => sinTildes(q.trim()).split(/\s+/).filter(Boolean), [q]);
  const { res, cuenta } = useMemo(() => {
    if (!palabras.length) {
      const porId = new Map(tareas.map((t) => [t.id, t]));
      const rec = recientes.map((id) => porId.get(id)).filter(Boolean);
      return { res: rec, cuenta: null };
    }
    const frase = palabras.join(" ");
    const hallados = tareas.filter((t) => { const n = sinTildes(t.nombre); return palabras.every((p) => n.includes(p)); })
      .map((t) => {
        const n = sinTildes(t.nombre);
        const puntos = (n.startsWith(frase) ? 4 : 0) + (n.includes(frase) ? 2 : 0) + (palabras.every((p) => (" " + n).includes(" " + p)) ? 1 : 0);
        return { t, puntos };
      })
      .sort((a, b) => (b.puntos - a.puntos) || ((a.t.estado === "comp") - (b.t.estado === "comp")) || String(b.t.actualizada || b.t.creada || "").localeCompare(String(a.t.actualizada || a.t.creada || "")))
      .map((x) => x.t);
    const cuenta = { todas: hallados.length, abiertas: hallados.filter((t) => t.estado !== "comp").length, comp: hallados.filter((t) => t.estado === "comp").length };
    const filtrados = hallados.filter((t) => filtro === "todas" || (filtro === "comp" ? t.estado === "comp" : t.estado !== "comp"));
    return { res: filtrados, cuenta };
  }, [palabras, tareas, filtro, recientes]);

  const visibles = res.slice(0, TOPE);
  const sel = Math.min(idx, Math.max(0, visibles.length - 1));
  useEffect(() => { lista.current?.querySelector('[data-sel="1"]')?.scrollIntoView({ block: "nearest" }); }, [sel]);

  const abrir = (t) => { onCerrar(); abrirTarea(t.id); };
  const teclas = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onCerrar(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(visibles.length - 1, sel + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(Math.max(0, sel - 1)); }
    else if (e.key === "Enter" && visibles[sel]) { e.preventDefault(); abrir(visibles[sel]); }
    else if (e.key === "Tab" && cuenta) { e.preventDefault(); const orden = ["todas", "abiertas", "comp"]; setFiltro(orden[(orden.indexOf(filtro) + (e.shiftKey ? 2 : 1)) % 3]); setIdx(0); }
  };

  return (
    <div className="bus-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="bus" role="dialog" aria-modal="true" aria-label="Buscar tareas">
        <div className="bus-caja">
          <Svg tam={17} ancho={1.8}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
          <input ref={caja} value={q} placeholder="Buscar tareas por su nombre…" aria-label="Buscar tareas" maxLength={120}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={teclas} />
          {q && <button type="button" className="bus-limpiar" onClick={() => { setQ(""); setIdx(0); caja.current?.focus(); }}>Limpiar</button>}
          <kbd className="bus-kbd">Esc</kbd>
        </div>

        {cuenta && (
          <div className="bus-filtros" role="tablist" aria-label="Filtrar">
            {[["todas", "Todas", cuenta.todas], ["abiertas", "Abiertas", cuenta.abiertas], ["comp", "Completadas", cuenta.comp]].map(([k, l, n]) => (
              <button key={k} type="button" role="tab" aria-selected={filtro === k} className={filtro === k ? "on" : ""} onClick={() => { setFiltro(k); setIdx(0); caja.current?.focus(); }}>
                {l}<span className="num">{n}</span>
              </button>
            ))}
          </div>
        )}

        <div className="bus-lista" ref={lista}>
          {!palabras.length && <span className="bus-tit">{visibles.length ? "Abiertas hace poco" : ""}</span>}
          {!palabras.length && !visibles.length && <span className="bus-vacio">Escribe parte del nombre de una tarea. Busca entre las {tareas.length} tareas, abiertas y completadas.</span>}
          {palabras.length > 0 && !visibles.length && (
            <span className="bus-vacio">
              {cuenta && cuenta.todas ? "Ninguna " + (filtro === "comp" ? "completada" : "abierta") + " se llama así. " : "Ninguna tarea se llama así. "}
              {cuenta && cuenta.todas > 0 && <button type="button" className="bus-link" onClick={() => setFiltro("todas")}>Ver las {cuenta.todas}</button>}
            </span>
          )}
          {visibles.map((t, i) => {
            const tp = tipDe(t.tipo);
            const fin = t.estado === "comp" && t.completada ? iso(new Date(t.completada)) : null;
            const venc = t.estado !== "comp" && t.fecha && t.fecha < hoy;
            return (
              <button key={t.id} type="button" className={"bus-fila" + (i === sel ? " sel" : "")} data-sel={i === sel ? "1" : "0"}
                onMouseMove={() => { if (i !== sel) setIdx(i); }} onClick={() => abrir(t)}>
                <IconoEstado estado={t.estado} />
                <span className={"bus-nom" + (t.estado === "comp" ? " hecha" : "")}><Resaltado txt={t.nombre} palabras={palabras} /></span>
                <span className="bus-est" style={{ "--c": "var(--st-" + t.estado + ")" }}>{ESTADOS[t.estado] || t.estado}</span>
                {tp && <span className="cuadro" style={{ background: tp.color }} title={tp.label} />}
                <Caras ids={t.resp} P={P} />
                <span className={"bus-fecha" + (venc ? " venc" : "")}>{fin ? "Hecha " + fechaCorta(fin) : t.fecha ? fechaRel(hoy, t.fecha) : ""}</span>
              </button>
            );
          })}
          {res.length > TOPE && <span className="bus-mas">Y {res.length - TOPE} más: sigue escribiendo para acotar.</span>}
        </div>

        <div className="bus-pie">
          <span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span>{cuenta && <span><kbd>Tab</kbd> filtro</span>}<span className="esp" /><span><kbd>⌘</kbd><kbd>J</kbd> abre y cierra</span>
        </div>
      </div>
    </div>
  );
}
