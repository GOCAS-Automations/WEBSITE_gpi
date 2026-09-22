import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase, getTokenSupabase } from "./server";
import {
  isContentEditorRole,
  isEmployeeRole,
  isManagerRole,
  normalizeRole,
  type UserRole,
} from "@/lib/roles";
import { identificadorCuenta, usuarioDesdeEmail } from "@/lib/usuarios";

export type { UserRole };

export interface SessionProfile {
  id: string;
  /** Correo con el que Supabase Auth identifica la cuenta (puede ser sintético). */
  email: string;
  /** Usuario del portal; `null` en las cuentas anteriores a la migración 0003. */
  username: string | null;
  /** Lo que se muestra en la interfaz: el usuario si lo hay, si no el correo. */
  identificador: string;
  fullName: string;
  role: UserRole;
  cargo: string | null;
  phone: string | null;
  /** false = cuenta desactivada por un administrador. */
  active: boolean;
}

export interface Session {
  supabase: SupabaseClient;
  profile: SessionProfile;
}

/**
 * El `sub` (id de la cuenta) que DICE el token de acceso de la cookie, sin
 * verificarlo. Solo sirve para adelantar la lectura del perfil en paralelo con
 * `getUser()`: el resultado se usa únicamente si `getUser()` —que sí verifica
 * el token contra Supabase Auth— confirma el mismo id. Se lee del token y no de
 * `session.user` para no disparar el aviso de «getSession no es seguro».
 */
function subDelToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const cuerpo = token.split(".")[1];
    if (!cuerpo) return null;
    const json = JSON.parse(Buffer.from(cuerpo, "base64url").toString("utf8"));
    return typeof json?.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

/**
 * Lee la sesión actual y el perfil (rol) del usuario.
 * Devuelve `null` si Supabase no está configurado o no hay sesión válida.
 *
 * Tolera que la migración 0002 aún no esté aplicada: si faltan las columnas
 * `active`, `cargo` o `phone` se asumen los valores por defecto.
 *
 * RENDIMIENTO (22 sep 2026). Es lo primero que hace CADA pantalla del panel
 * (el layout de `/admin` y otra vez la página), y eran dos viajes en serie a
 * Supabase —`getUser()` y después el perfil— de ~115 ms cada uno. Ahora:
 *   · `cache()` de React: una sola lectura por petición aunque la pidan el
 *     layout y la página (la caché es de ESA petición: nada se comparte entre
 *     usuarios ni entre peticiones);
 *   · el perfil se pide EN PARALELO con `getUser()`, con el id que trae el
 *     token, y solo se acepta si `getUser()` confirma ese mismo id; si no
 *     coinciden, se vuelve a leer con el id verificado. La seguridad no cambia:
 *     manda `getUser()`, y PostgREST verifica el token por su cuenta en la
 *     consulta del perfil.
 */
export const getSessionProfile = cache(async (): Promise<Session | null> => {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  // Local: lee la cookie (el proxy ya refrescó la sesión en esta petición).
  const {
    data: { session: sesionCookie },
  } = await supabase.auth.getSession();
  const token = sesionCookie?.access_token;
  const idTentativo = subDelToken(token);
  // La lectura adelantada va por un cliente APARTE que lleva el token tal cual:
  // el cliente de la sesión encola sus peticiones detrás de `getUser()` (el
  // candado interno de supabase-js), y por ahí no habría paralelo.
  const lector = token && idTentativo ? getTokenSupabase(token) : null;

  const [
    {
      data: { user },
      error,
    },
    perfilTentativo,
  ] = await Promise.all([
    supabase.auth.getUser(),
    lector && idTentativo
      ? lector.from("profiles").select("*").eq("id", idTentativo).maybeSingle()
      : Promise.resolve(null),
  ]);
  if (error || !user) return null;

  const { data } =
    perfilTentativo && idTentativo === user.id
      ? perfilTentativo
      : await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const email = data?.email ?? user.email ?? "";
  // `username` llega `undefined` mientras la migración 0003 no esté aplicada:
  // en ese caso la cuenta se identifica por su correo, como siempre.
  const username =
    typeof data?.username === "string" && data.username.trim() !== ""
      ? data.username.trim()
      : usuarioDesdeEmail(email);

  return {
    supabase,
    profile: {
      id: user.id,
      email,
      username,
      identificador: identificadorCuenta({ username, email }),
      fullName: data?.full_name ?? email,
      role: normalizeRole(data?.role),
      cargo: data?.cargo ?? null,
      phone: data?.phone ?? null,
      active: data?.active !== false,
    },
  };
});

/** Sesión válida y cuenta activa; `null` en cualquier otro caso. */
export async function getActiveSession(): Promise<Session | null> {
  const session = await getSessionProfile();
  if (!session || !session.profile.active) return null;
  return session;
}

/* ------------------------------------------------------------------ */
/* Guardas para páginas (redirigen)                                    */
/* ------------------------------------------------------------------ */

/**
 * Exige sesión activa con permiso para editar contenido
 * (admin | coordinador | marketing). Se usa en el layout de /admin.
 */
export async function requireContentEditor(): Promise<Session> {
  const session = await getActiveSession();
  if (!session || !isContentEditorRole(session.profile.role)) {
    redirect("/mi-cuenta");
  }
  return session;
}

/** Exige sesión activa de manager (admin | coordinador). */
export async function requireManager(): Promise<Session> {
  const session = await getActiveSession();
  if (!session || !isManagerRole(session.profile.role)) {
    redirect("/admin");
  }
  return session;
}

/** Exige sesión activa con rol 'admin'. */
export async function requireAdmin(): Promise<Session> {
  const session = await getActiveSession();
  if (!session || session.profile.role !== "admin") {
    redirect("/admin");
  }
  return session;
}

/* ------------------------------------------------------------------ */
/* Guardas para server actions (devuelven null, no redirigen)          */
/* ------------------------------------------------------------------ */

/** Editor de contenido o `null` — apto para server actions con mensaje. */
export async function getContentEditorOrNull(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || !isContentEditorRole(session.profile.role)) return null;
  return session;
}

/** Manager (admin | coordinador) o `null`. */
export async function getManagerOrNull(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || !isManagerRole(session.profile.role)) return null;
  return session;
}

/** Administrador o `null`. */
export async function getAdminOrNull(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || session.profile.role !== "admin") return null;
  return session;
}

/**
 * Cuenta con rol EXACTAMENTE 'empleado', o `null`.
 *
 * OJO: el portal de jornadas de `/mi-cuenta` ya NO usa esta guarda — desde
 * julio de 2026 cualquier cuenta activa registra sus propias jornadas (basta
 * con `getActiveSession()`, y las políticas RLS exigen `employee_id =
 * auth.uid()`). Esta función queda para reglas que sí necesiten distinguir al
 * personal de campo del resto del equipo.
 */
export async function getEmployeeOrNull(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || !isEmployeeRole(session.profile.role)) return null;
  return session;
}
