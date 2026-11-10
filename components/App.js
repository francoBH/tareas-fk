"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Tablero from "@/components/Tablero";

/* La puerta: sin sesión pide el correo y manda el link; con sesión de alguien que no está
   en la lista de personas, lo dice; con sesión válida, dibuja el tablero. */
export default function App() {
  const [sesion, setSesion] = useState(undefined);
  const [yo, setYo] = useState(undefined);
  const [tema, setTema] = useState("oscuro");

  useEffect(() => {
    try { const t = localStorage.getItem("tf-tema"); if (t) setTema(t); } catch {}
    supabase.auth.getSession().then(({ data }) => setSesion(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sesion) { setYo(sesion === null ? null : undefined); return; }
    setYo(undefined);
    supabase.from("personas").select("*").then(({ data }) => {
      const email = (sesion.user.email || "").toLowerCase();
      const p = (data || []).find((x) => x.email.toLowerCase() === email);
      setYo(p ? { personas: data, clave: p.clave } : false);
    });
  }, [sesion]);

  const cambiarTema = () => {
    const t = tema === "claro" ? "oscuro" : "claro";
    setTema(t);
    try { localStorage.setItem("tf-tema", t); } catch {}
  };

  const clase = "tf " + (tema === "claro" ? "claro" : "");
  if (sesion === undefined || (sesion && !yo && yo !== false)) return <div className={clase} />;
  if (!sesion) return <div className={clase}><Entrar /></div>;
  if (yo === false) {
    return (
      <div className={clase}><div className="entrar"><div className="entrar-caja">
        <h1>Este correo no tiene acceso</h1>
        <p>Entraste con {sesion.user.email}. Este tablero es solo para Franco y Katherine.</p>
        <button type="button" className="entrar-btn" onClick={() => supabase.auth.signOut()}>Salir</button>
      </div></div></div>
    );
  }
  return <Tablero personasLista={yo.personas} yo={yo.clave} tema={tema} cambiarTema={cambiarTema} />;
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState("listo");
  const [error, setError] = useState("");
  const enviar = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    setEstado("enviando"); setError("");
    const { error: err } = await supabase.auth.signInWithOtp({ email: v, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (err) { setEstado("listo"); setError("No pude mandar el link. Prueba de nuevo en un minuto."); return; }
    setEstado("enviado");
  };
  return (
    <div className="entrar">
      <form className="entrar-caja" onSubmit={enviar}>
        <span className="marca-logo">FK</span>
        <h1>Tareas</h1>
        <p>Escribe tu correo y te mandamos un link para entrar. Ábrelo en este mismo navegador.</p>
        {estado === "enviado" ? (
          <div className="entrar-ok">Listo. Te mandamos el link a <b>{email.trim()}</b>. Revisa también la carpeta de spam.</div>
        ) : (<>
          <input className="entrar-campo" type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus aria-label="Correo" />
          <button type="submit" className="entrar-btn" disabled={estado === "enviando" || !email.trim()}>{estado === "enviando" ? "Enviando…" : "Mandarme el link"}</button>
          {error && <span className="entrar-error">{error}</span>}
        </>)}
      </form>
    </div>
  );
}
