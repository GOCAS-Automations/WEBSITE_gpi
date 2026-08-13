/**
 * CONTADOR DE VISITAS — registro de una visita
 * ============================================
 * `POST /api/visita`. Lo llama una sola vez por sesión el componente
 * `VisitBeacon` del sitio público (ver `src/components/layout/VisitBeacon.tsx`).
 *
 * POR QUÉ UN ROUTE HANDLER Y NO UNA FUNCIÓN RPC PÚBLICA
 * -----------------------------------------------------
 * La alternativa evidente era exponer una función `security definer` a `anon`
 * y llamarla desde el navegador. Se descartó: la clave anónima de Supabase es
 * pública por diseño, así que cualquiera podría invocarla en bucle desde la
 * consola y dejar el contador en un número inventado. Aquí el incremento lo
 * hace el SERVIDOR con la clave `service_role`, y la función de base de datos
 * solo tiene permiso de ejecución para ese rol.
 *
 * El incremento en sí se delega a `public.registrar_visita()` (migración 0007)
 * porque un `select` + `update` desde aquí perdería cuentas cuando dos visitas
 * caen a la vez; el `insert … on conflict do update set total = total + 1` del
 * lado de Postgres es atómico.
 *
 * DEDUPE — deliberadamente modesto
 * --------------------------------
 * Dos filtros baratos, ninguno infalible, y está bien que así sea: esto es una
 * cifra de vanidad para la página de inicio, no una analítica de facturación.
 *   1. En el navegador: una marca en `sessionStorage`, así recorrer el sitio
 *      entero cuenta como UNA visita.
 *   2. Aquí: memoria del proceso con una ventana de 30 minutos por IP, que
 *      corta el caso de alguien recargando o abriendo pestañas sin parar.
 *
 * NUNCA falla hacia el visitante: si la migración 0007 está pendiente, si falta
 * la clave service-role o si Supabase no responde, responde 204 igual. Un
 * contador roto no puede ensuciar la consola de quien visita el sitio.
 */

import { headers } from "next/headers";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import { getVisitas } from "@/lib/content";

/**
 * Nunca se cachea: la mitad de la gracia de este endpoint es que el número que
 * devuelve sea el de este segundo, no el del último build.
 */
export const dynamic = "force-dynamic";

/** Una IP no vuelve a sumar hasta pasada esta ventana. */
const VENTANA_MS = 30 * 60 * 1000;
/** Tope de entradas del mapa antes de barrer las caducadas. */
const MAXIMO_EN_MEMORIA = 2000;

const ultimaVisita = new Map<string, number>();

/** Sin aviso repetido: si falta la tabla, se anota UNA vez por proceso. */
let avisadoSinTabla = false;

async function ipDelVisitante(): Promise<string> {
  const h = await headers();
  // `x-forwarded-for` puede traer varias IPs; la primera es la del cliente.
  const reenviada = h.get("x-forwarded-for");
  return (reenviada?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

function repetida(ip: string): boolean {
  const ahora = Date.now();
  const anterior = ultimaVisita.get(ip);
  if (anterior !== undefined && ahora - anterior < VENTANA_MS) return true;

  ultimaVisita.set(ip, ahora);

  // Barrido perezoso para que el mapa no crezca sin fin en un proceso longevo.
  if (ultimaVisita.size > MAXIMO_EN_MEMORIA) {
    for (const [clave, marca] of ultimaVisita) {
      if (ahora - marca >= VENTANA_MS) ultimaVisita.delete(clave);
    }
  }
  return false;
}

/** 204: la respuesta no lleva cuerpo y al navegador no le interesa el total. */
const SIN_CONTENIDO = new Response(null, { status: 204 });

export async function POST(): Promise<Response> {
  try {
    if (repetida(await ipDelVisitante())) return SIN_CONTENIDO;

    const supabase = getServiceRoleSupabase();
    if (!supabase) return SIN_CONTENIDO;

    const { error } = await supabase.rpc("registrar_visita");

    if (error && !avisadoSinTabla) {
      avisadoSinTabla = true;
      console.warn(
        "[visitas] No se pudo registrar la visita (¿migración 0007 pendiente?):",
        error.message,
      );
    }
  } catch (error) {
    if (!avisadoSinTabla) {
      avisadoSinTabla = true;
      console.warn("[visitas] Error inesperado al registrar la visita:", error);
    }
  }

  return SIN_CONTENIDO;
}

/* ------------------------------------------------------------------ */
/* Lectura en vivo del total                                           */
/* ------------------------------------------------------------------ */

/**
 * `GET /api/visita` → `{ total, formateado, disponible }`.
 *
 * POR QUÉ EXISTE
 * --------------
 * El inicio y Nosotros son páginas estáticas con ISR (`revalidate = 300`), así
 * que el número que llega en el HTML puede tener hasta cinco minutos. GPI abre
 * su sitio, cuenta la visita que acaba de hacer y ve la cifra de antes: parece
 * roto aunque no lo esté.
 *
 * La alternativa era volver dinámicas las dos páginas para refrescar una cifra
 * de vanidad, tirando por la borda el ISR de todo el sitio. En vez de eso, el
 * HTML sigue siendo estático y `VisitCounter` pide el total AQUÍ al montarse,
 * ya en el navegador: el visitante ve un número al instante (el del build) y,
 * una décima después, el de verdad.
 *
 * Solo LEE: sumar sigue siendo cosa del `POST`, que va con la clave
 * service-role. La lectura usa el cliente anónimo, al que la política
 * `site_visitas_select_public` de la migración 0007 ya le permite consultar la
 * tabla.
 */
export async function GET(): Promise<Response> {
  const visitas = await getVisitas();

  return Response.json(visitas, {
    headers: {
      // Ni el navegador ni el CDN de Vercel deben guardarse esta respuesta:
      // cachearla anularía justo lo que se quiere conseguir.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
