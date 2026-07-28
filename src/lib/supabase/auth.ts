import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "./server";
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
 * Lee la sesión actual y el perfil (rol) del usuario.
 * Devuelve `null` si Supabase no está configurado o no hay sesión válida.
 *
 * Tolera que la migración 0002 aún no esté aplicada: si faltan las columnas
 * `active`, `cargo` o `phone` se asumen los valores por defecto.
 */
export async function getSessionProfile(): Promise<Session | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

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
}

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
