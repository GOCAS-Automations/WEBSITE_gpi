/**
 * CLIENTE SERVICE-ROLE — ¡SOLO SERVIDOR!
 * ======================================
 * Usa la clave `SUPABASE_SERVICE_ROLE_KEY`, que **salta todas las políticas
 * RLS** y habilita la Auth Admin API (crear usuarios, cambiar contraseñas,
 * eliminar cuentas). Es la clave más sensible del proyecto.
 *
 * REGLAS:
 *  - Este módulo SOLO puede importarse desde server actions ("use server") o
 *    Server Components. NUNCA desde un Client Component.
 *  - La variable NO lleva el prefijo `NEXT_PUBLIC_`, así que Next.js jamás la
 *    incrusta en el bundle del navegador. El guard de abajo es una segunda
 *    barrera por si alguien la importara por error desde el cliente.
 *  - El sitio debe seguir funcionando SIN esta variable: en ese caso
 *    `isServiceRoleConfigured()` devuelve false y /admin/empleados muestra un
 *    aviso explicando cómo configurarla, en lugar de romperse.
 *
 * Dónde encontrarla: Dashboard de Supabase → Settings → API Keys →
 * `service_role` (secret). En Vercel se añade SIN el prefijo NEXT_PUBLIC.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, isSupabaseConfigured } from "./config";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** true cuando la clave service-role está presente y es plausible. */
export function isServiceRoleConfigured(): boolean {
  return isSupabaseConfigured() && SERVICE_ROLE_KEY.length > 20;
}

/**
 * Devuelve el cliente con privilegios de servicio, o `null` si falta la clave.
 * Nunca se cachea entre peticiones para evitar fugas de estado de sesión.
 */
export function getServiceRoleSupabase(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error(
      "getServiceRoleSupabase() solo puede usarse en el servidor: la clave service_role nunca debe llegar al navegador.",
    );
  }
  if (!isServiceRoleConfigured()) return null;

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Generación de contraseñas                                           */
/* ------------------------------------------------------------------ */

/**
 * CONTRASEÑAS "NATURALES"
 * -----------------------
 * Las cuentas del portal las entrega un coordinador, muchas veces DICTÁNDOLAS
 * por teléfono o por WhatsApp a personal de campo. Una cadena como
 * `k7#mQx4-Rv9zBp2` es imposible de dictar sin errores, así que se generan con
 * el formato `Palabra-Palabra##`:
 *
 *     Sol-Andes42 · Rio-Cumbre07 · Faro-Bosque93
 *
 * Siguen siendo seguras: dos palabras de una lista de 40 (1 600 combinaciones)
 * × 2 números (100) × el orden = suficiente para una contraseña TEMPORAL que la
 * persona cambia al entrar, y siempre tienen mayúsculas, minúsculas, un símbolo
 * y números, así que cumplen cualquier política razonable.
 *
 * Palabras cortas, sin tildes y sin eñes: se dictan y se escriben sin dudar.
 */
const PALABRAS = [
  "Sol",
  "Luna",
  "Rio",
  "Mar",
  "Andes",
  "Cumbre",
  "Valle",
  "Selva",
  "Bosque",
  "Campo",
  "Faro",
  "Puerto",
  "Cielo",
  "Nube",
  "Lluvia",
  "Viento",
  "Fuego",
  "Tierra",
  "Piedra",
  "Arena",
  "Palma",
  "Ceiba",
  "Cedro",
  "Roble",
  "Guadua",
  "Cafe",
  "Cacao",
  "Maiz",
  "Mango",
  "Guayaba",
  "Colibri",
  "Condor",
  "Delfin",
  "Tucan",
  "Jaguar",
  "Pardo",
  "Verde",
  "Turbina",
  "Motor",
  "Puente",
] as const;

/** Enteros aleatorios criptográficos en el rango [0, tope). */
function aleatorios(tope: number, cantidad: number): number[] {
  const bytes = new Uint32Array(cantidad);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b % tope);
}

/**
 * Genera una contraseña temporal fácil de dictar: dos palabras en español
 * separadas por guion y dos dígitos al final (`Sol-Andes42`). Siempre tiene 10
 * caracteres o más; si hiciera falta, se rellena con dígitos.
 */
export function generarPassword(longitudMinima = 10): string {
  const [i, j] = aleatorios(PALABRAS.length, 2);
  // Dos palabras DISTINTAS (si salen iguales, se toma la siguiente).
  const primera = PALABRAS[i];
  const segunda = PALABRAS[j === i ? (j + 1) % PALABRAS.length : j];

  const [numero] = aleatorios(100, 1);
  let password = `${primera}-${segunda}${String(numero).padStart(2, "0")}`;

  while (password.length < Math.max(10, longitudMinima)) {
    const [extra] = aleatorios(10, 1);
    password += String(extra);
  }

  return password;
}
