"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Tablero from "@/components/Tablero";

/* La puerta: sin sesión pide el correo y manda el link; con sesión de alguien que no está
   en la lista de personas, lo dice; con sesión válida, dibuja el tablero. */
/* ⚠️ LA RECARGA AL VOLVER A LA PESTAÑA (10 nov 2026): Supabase renueva la sesión cada vez que
   la pestaña vuelve a estar a la vista y avisa con un objeto de sesión NUEVO. Antes eso volvía a
   pedir quién soy, mostraba la pantalla de carga y armaba el tablero de cero (se perdía la tarea
   abierta). Ahora lo que importa es el CORREO: si es el mismo, no se toca nada. */
const leerCache = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const guardarCache = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function App() {
  const [email, setEmail] = useState(undefined);
  const [yo, setYo] = useState(undefined);
  const [tema, setTema] = useState("oscuro");

  useEffect(() => {
    try { const t = localStorage.getItem("tf-tema"); if (t) setTema(t); } catch {}
    const poner = (s) => setEmail(s?.user?.email ? s.user.email.toLowerCase() : null);
    supabase.auth.getSession().then(({ data }) => poner(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => poner(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!email) { setYo(email === null ? null : undefined); return; }
    /* Arranca con lo guardado (abre al instante) y se pone al día por detrás. */
    const c = leerCache("tf-yo");
    if (c && c.email === email) setYo(c.valor);
    supabase.from("personas").select("*").then(({ data, error }) => {
      if (error) { if (!c || c.email !== email) setYo(false); return; }
      const p = (data || []).find((x) => x.email.toLowerCase() === email);
      const valor = p ? { personas: data, clave: p.clave } : false;
      setYo((prev) => (JSON.stringify(prev) === JSON.stringify(valor) ? prev : valor));
      if (valor) guardarCache("tf-yo", { email, valor });
    });
  }, [email]);
  const sesion = email ? { user: { email } } : email;

  const cambiarTema = () => {
    const t = tema === "claro" ? "oscuro" : "claro";
    setTema(t);
    try { localStorage.setItem("tf-tema", t); } catch {}
  };

  const clase = "tf " + (tema === "claro" ? "claro" : "");
  if (sesion === undefined || (sesion && !yo && yo !== false)) return <div className={clase}><div className="carga"><span className="marca-logo">FK</span></div></div>;
  if (!sesion) return <div className={clase}><Entrar /></div>;
  if (yo === false) {
    return (
      <div className={clase}><div className="entrar"><div className="entrar-caja">
        <h1>Este correo no tiene acceso</h1>
        <p>Entraste con {sesion.user.email}. Este tablero es solo para el equipo de Franco.</p>
        <button type="button" className="entrar-btn" onClick={() => { try { localStorage.removeItem("tf-yo"); localStorage.removeItem("tf-datos"); } catch {} supabase.auth.signOut(); }}>Salir</button>
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
