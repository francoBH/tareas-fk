import { createClient } from "@supabase/supabase-js";

/* Un solo cliente para toda la app. La sesión vive en el navegador (link por correo). */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" } }
);

/* Solo en la compu de desarrollo: deja el cliente a mano para probar con un usuario de prueba. */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") window.__sb = supabase;
