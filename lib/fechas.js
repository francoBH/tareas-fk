/* Las mismas cuentas de fechas que el tablero de Blue OS (lib/tareas/tipos.ts). */
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MES3 = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DIA_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const pad = (n) => (n < 10 ? "0" : "") + n;
export const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const hoyIso = () => iso(new Date());
export const mas = (s, n) => { const p = s.split("-").map(Number); return iso(new Date(p[0], p[1] - 1, p[2] + n)); };
export const dow = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]).getDay(); };
export const mesKey = (y, m) => y + "-" + pad(m);

export function dias(hoy, f) {
  if (!f) return null;
  const a = f.slice(0, 10).split("-").map(Number), b = hoy.split("-").map(Number);
  return Math.round((Date.UTC(a[0], a[1] - 1, a[2]) - Date.UTC(b[0], b[1] - 1, b[2])) / 86400000);
}
export const fechaCorta = (s) => { const p = s.split("-").map(Number); return p[2] + " " + MES_CORTO[p[1] - 1]; };
export function fechaRel(hoy, s) {
  const d = dias(hoy, s);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  if (d < -1 && d >= -7) return "Hace " + Math.abs(d) + " días";
  if (d > 1 && d <= 6) return DIA_CORTO[dow(s)] + " " + Number(s.slice(8, 10));
  return fechaCorta(s);
}
export function fechaLarga(hoy, s) {
  const p = s.split("-").map(Number);
  const d = dias(hoy, s);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d === -1) return "Ayer";
  if (d > 1 && d <= 6) return DIA[dow(s)];
  return DIA[dow(s)] + " " + p[2] + " de " + MESES[p[1] - 1];
}
export const fechaCreacion = (s) => { const p = s.slice(0, 10).split("-").map(Number); return p[2] + " " + MESES[p[1] - 1] + " " + p[0]; };
export const tituloMes = (y, m) => MESES[m - 1] + " " + y;
export function calendario(s) {
  const p = s.split("-").map(Number);
  const primero = (new Date(Date.UTC(p[0], p[1] - 1, 1)).getUTCDay() + 6) % 7;
  const sem = Math.floor((p[2] - 1 + primero) / 7) + 1;
  return "Q" + (Math.floor((p[1] - 1) / 3) + 1) + " · " + MES3[p[1] - 1] + " · S" + sem;
}
export function cercania(hoy, s) {
  const d = dias(hoy, s);
  if (d === null) return "sinfecha";
  if (d < 0) return "atrasadas";
  if (d === 0) return "hoy";
  if (d === 1) return "manana";
  const dw = dow(hoy) === 0 ? 7 : dow(hoy);
  const hastaDom = 7 - dw;
  if (d <= hastaDom) return "semana";
  if (d <= hastaDom + 7) return "siguiente";
  return "adelante";
}
export function hace(ts) {
  const m = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return "hace " + m + " min";
  const h = Math.round(m / 60);
  if (h < 24) return "hace " + h + (h === 1 ? " hora" : " horas");
  const d = Math.round(h / 24);
  return "hace " + d + (d === 1 ? " día" : " días");
}
export function atajos(hoy) {
  const dw = dow(hoy) === 0 ? 7 : dow(hoy);
  const nom = (s) => ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][dow(s)];
  const sab = mas(hoy, dw >= 6 ? 6 - dw + 7 : 6 - dw);
  return [
    ["Hoy", nom(hoy), hoy], ["Mañana", nom(mas(hoy, 1)), mas(hoy, 1)],
    ["Próxima semana", nom(mas(hoy, 8 - dw)), mas(hoy, 8 - dw)], ["Próximo fin de semana", nom(sab), sab],
    ["2 semanas", fechaCorta(mas(hoy, 14)), mas(hoy, 14)], ["4 semanas", fechaCorta(mas(hoy, 28)), mas(hoy, 28)],
    ["8 semanas", fechaCorta(mas(hoy, 56)), mas(hoy, 56)],
  ];
}
export const sinTildes = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
