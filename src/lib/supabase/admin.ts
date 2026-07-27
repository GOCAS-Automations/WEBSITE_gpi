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

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que dictarla por teléfono
// o copiarla a mano no se preste a confusiones.
const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const NUMEROS = "23456789";
const SIMBOLOS = "!@#$%*-_+=?";
const ALFABETO = MAYUSCULAS + MINUSCULAS + NUMEROS + SIMBOLOS;

function elegir(alfabeto: string, cantidad: number): string[] {
  const bytes = new Uint32Array(cantidad);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]);
}

/**
 * Genera una contraseña fuerte (16 caracteres) garantizando al menos una
 * mayúscula, una minúscula, un número y un símbolo.
 */
export function generarPassword(longitud = 16): string {
  const obligatorios = [
    ...elegir(MAYUSCULAS, 1),
    ...elegir(MINUSCULAS, 1),
    ...elegir(NUMEROS, 1),
    ...elegir(SIMBOLOS, 1),
  ];
  const resto = elegir(ALFABETO, Math.max(4, longitud) - obligatorios.length);
  const todos = [...obligatorios, ...resto];

  // Mezcla Fisher-Yates con aleatoriedad criptográfica.
  const orden = new Uint32Array(todos.length);
  crypto.getRandomValues(orden);
  for (let i = todos.length - 1; i > 0; i -= 1) {
    const j = orden[i] % (i + 1);
    [todos[i], todos[j]] = [todos[j], todos[i]];
  }

  return todos.join("");
}
