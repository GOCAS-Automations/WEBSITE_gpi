/**
 * ALIAS `@/` PARA LOS SCRIPTS DE PRUEBA
 * =====================================
 * Los módulos de `src/` se importan entre sí con el alias de Next (`@/lib/…`),
 * que Node no conoce. Este archivo registra un gancho de resolución mínimo:
 * `@/x` → `src/x.ts` (o `.tsx`, o `x/index.ts`). Se importa ANTES de cargar
 * cualquier módulo de `src/`:
 *
 *   import "./alias.mjs";
 *   const J = await import("../src/lib/jornada.ts");
 *
 * Solo resuelve rutas; quitar los tipos lo hace `--experimental-strip-types`.
 * Usa `module.registerHooks` (síncrono, Node ≥ 22.15), sin dependencias.
 */

import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SRC = new URL("../src/", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), SRC).href;
      for (const sufijo of [".ts", ".tsx", "/index.ts"]) {
        const url = `${base}${sufijo}`;
        if (existsSync(fileURLToPath(url))) return nextResolve(url, context);
      }
    }
    return nextResolve(specifier, context);
  },
});
