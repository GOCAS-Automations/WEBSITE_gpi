import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Cliente ANÓNIMO de lectura (sin cookies).
 *
 * Se usa en la capa de contenido (`src/lib/content.ts`) para que las páginas
 * públicas puedan seguir siendo estáticas/ISR: al no tocar `cookies()` no se
 * fuerza el render dinámico. Las tablas `site_*` tienen SELECT público por RLS.
 */
export function getPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Cliente de LECTURA que manda un token de acceso tal cual, sin manejar
 * sesión (sin cookies, sin refresco, sin candado de auth). Lo usa
 * `getSessionProfile()` para leer el perfil EN PARALELO con `getUser()`: el
 * cliente de la sesión serializa sus peticiones detrás de `getUser()`.
 * PostgREST verifica el token en cada consulta y RLS se aplica igual que con
 * el cliente de la sesión; no lo uses para escribir.
 */
export function getTokenSupabase(accessToken: string): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => accessToken,
  });
}

/**
 * Cliente de servidor ligado a la sesión del usuario (cookies).
 *
 * En Next.js 16 `cookies()` es asíncrono. Desde un Server Component no se
 * pueden escribir cookies: por eso `setAll` va dentro de try/catch — el refresco
 * de sesión lo hace `src/proxy.ts` en cada request.
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component: la escritura la resuelve el proxy. Ignorable.
        }
      },
    },
  });
}
