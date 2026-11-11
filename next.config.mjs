import { writeFileSync } from "node:fs";

/* La VERSIÓN de esta publicación: la página la lleva adentro y la compara con /version.json
   (un archivo suelto que se pide sin caché). Si cambió, aparece el cartel «Hay cambios nuevos». */
const VERSION = process.env.TF_VERSION || Date.now().toString(36);
try { writeFileSync(new URL("./public/version.json", import.meta.url), JSON.stringify({ version: VERSION }) + "\n"); } catch {}

/** GitHub Pages: sitio estático en francobh.github.io/tareas-fk */
const nextConfig = {
  output: "export",
  basePath: "/tareas-fk",
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  env: { NEXT_PUBLIC_TF_VERSION: VERSION },
};
export default nextConfig;
