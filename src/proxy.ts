/**
 * Proxy (en Next.js 16 reemplaza a `middleware`).
 *
 * Responsabilidades:
 *  1. Refrescar la sesión de Supabase y reescribir las cookies de auth
 *     (patrón oficial de @supabase/ssr con `getAll` / `setAll`).
 *  2. Redirección optimista de /admin a /mi-cuenta cuando no hay sesión.
 *     La verificación autoritativa (sesión + role='admin') vive en
 *     `src/app/admin/layout.tsx` y en cada server action.
 *
 * El matcher se limita a las rutas del portal: el resto del sitio es estático
 * y no debe pagar el coste del proxy ni perder el cacheado de ISR.
 * Si Supabase no está configurado, el proxy deja pasar la petición sin tocar nada.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // IMPORTANTE: debe llamarse antes de generar cualquier respuesta para que el
  // refresco de token alcance a escribirse en las cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/admin")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/mi-cuenta";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/mi-cuenta"],
};
