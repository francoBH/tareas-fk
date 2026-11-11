"use client";
import { useEffect, useState } from "react";

/* EL CARTEL DE VERSIÓN NUEVA — copia del de Blue OS (AvisoVersionNueva.tsx).
   La página sabe con qué versión se abrió y le pregunta a /version.json cuál está publicada.
   Pregunta al volver a la pestaña y cada 10 minutos mientras está a la vista (nunca en segundo
   plano). No recarga sola: una recarga automática se lleva lo que la persona estaba escribiendo. */
const PROPIA = process.env.NEXT_PUBLIC_TF_VERSION || "";
const CADA_MS = 10 * 60 * 1000;
const MINIMO_MS = 60 * 1000;

export default function VersionNueva() {
  const [hay, setHay] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  useEffect(() => {
    if (!PROPIA) return;
    let ultima = 0, vivo = true;
    const revisar = async () => {
      if (document.visibilityState !== "visible" || Date.now() - ultima < MINIMO_MS) return;
      ultima = Date.now();
      try {
        const r = await fetch("/tareas-fk/version.json?t=" + Date.now(), { cache: "no-store" });
        if (!r.ok) return;
        const { version } = await r.json();
        if (vivo && version && version !== PROPIA) setHay(true);
      } catch {}
    };
    const reloj = setInterval(revisar, CADA_MS);
    const alVolver = () => revisar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    revisar();
    return () => { vivo = false; clearInterval(reloj); document.removeEventListener("visibilitychange", alVolver); window.removeEventListener("focus", alVolver); };
  }, []);
  if (!hay || cerrado) return null;
  return (
    <div className="version-nueva" role="status" aria-live="polite">
      <span><b>Hay cambios nuevos en Tareas.</b> <span>Actualiza para verlos.</span></span>
      <button type="button" className="btn-chico pri" onClick={() => window.location.reload()}>Actualizar</button>
      <button type="button" className="vn-x" aria-label="Ahora no" title="Ahora no" onClick={() => setCerrado(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
      </button>
    </div>
  );
}
