import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "./server";

export type UserRole = "admin" | "employee";

export interface SessionProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * Lee la sesión actual y el perfil (rol) del usuario.
 * Devuelve `null` si Supabase no está configurado o no hay sesión válida.
 */
export async function getSessionProfile(): Promise<{
  supabase: SupabaseClient;
  profile: SessionProfile;
} | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role: UserRole = data?.role === "admin" ? "admin" : "employee";

  return {
    supabase,
    profile: {
      id: user.id,
      email: data?.email ?? user.email ?? "",
      fullName: data?.full_name ?? user.email ?? "",
      role,
    },
  };
}

/**
 * Exige sesión con rol 'admin'. Si no la hay, redirige a /mi-cuenta.
 * Se usa en el layout de /admin y en TODAS las server actions del panel.
 */
export async function requireAdmin(): Promise<{
  supabase: SupabaseClient;
  profile: SessionProfile;
}> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") {
    redirect("/mi-cuenta");
  }
  return session;
}

/**
 * Igual que `requireAdmin` pero sin redirigir: apto para server actions que
 * quieren devolver un mensaje de error en lugar de navegar.
 */
export async function getAdminOrNull(): Promise<{
  supabase: SupabaseClient;
  profile: SessionProfile;
} | null> {
  const session = await getSessionProfile();
  if (!session || session.profile.role !== "admin") return null;
  return session;
}
