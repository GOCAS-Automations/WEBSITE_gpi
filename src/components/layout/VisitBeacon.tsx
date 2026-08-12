"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * CONTADOR DE VISITAS — aviso desde el navegador
 * ==============================================
 * Avisa UNA vez por sesión del navegador a `POST /api/visita`, que es quien
 * suma de verdad (ver `src/app/api/visita/route.ts`). No pinta nada.
 *
 * Decisiones:
 *  - **`sessionStorage`, no `localStorage`**: se quiere contar visitas, no
 *    personas únicas de por vida. Quien vuelve mañana suma otra visita; quien
 *    recorre cinco páginas hoy suma una.
 *  - **El panel no cuenta**: `/admin` y `/mi-cuenta` son el trabajo interno de
 *    GPI. Contarlos inflaría la cifra con la propia empresa.
 *  - **`keepalive`**: la petición sobrevive si el visitante navega o cierra la
 *    pestaña justo después de entrar.
 *  - **Nunca molesta**: si el `fetch` falla (sin red, bloqueador, endpoint
 *    caído) se ignora en silencio. Un contador jamás debe ensuciar la consola
 *    ni romper una página.
 */

const CLAVE_SESION = "gpi:visita-registrada";

/** Rutas que no son "el sitio público" y por tanto no cuentan como visita. */
const RUTAS_EXCLUIDAS = ["/admin", "/mi-cuenta"];

export function VisitBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (RUTAS_EXCLUIDAS.some((ruta) => pathname.startsWith(ruta))) return;

    try {
      if (window.sessionStorage.getItem(CLAVE_SESION) === "1") return;
      window.sessionStorage.setItem(CLAVE_SESION, "1");
    } catch {
      // Navegación privada o almacenamiento bloqueado: sin marca no hay forma
      // de deduplicar desde aquí, así que se deja la cuenta al servidor.
    }

    void fetch("/api/visita", {
      method: "POST",
      keepalive: true,
      cache: "no-store",
    }).catch(() => {
      /* Silencio a propósito: el contador no es crítico. */
    });
  }, [pathname]);

  return null;
}
