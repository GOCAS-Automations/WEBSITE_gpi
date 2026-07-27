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

export type { UserRole };

export interface SessionProfile {
  id: string;
  email: string;
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

  return {
    supabase,
    profile: {
      id: user.id,
      email: data?.email ?? user.email ?? "",
      fullName: data?.full_name ?? user.email ?? "",
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

/** Empleado (rol 'empleado') activo o `null` — portal de jornadas. */
export async function getEmployeeOrNull(): Promise<Session | null> {
  const session = await getActiveSession();
  if (!session || !isEmployeeRole(session.profile.role)) return null;
  return session;
}
