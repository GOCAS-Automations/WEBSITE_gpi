"use server";

/**
 * SERVER ACTIONS — Gestión de cuentas del equipo (/admin/empleados)
 * =================================================================
 * Crear, editar, restablecer contraseña y eliminar usuarios del portal.
 *
 * SEGURIDAD (se valida SIEMPRE en el servidor, en cada acción):
 *  1. Quien ejecuta debe ser manager activo (admin | coordinador).
 *  2. Un coordinador NO puede crear administradores ni tocar (editar,
 *     restablecer la contraseña o eliminar) la cuenta de un administrador:
 *     solo un admin gestiona admins.
 *  3. Nadie puede desactivarse, degradarse ni eliminarse a sí mismo (evita
 *     quedarse sin ningún administrador con acceso).
 *
 * Crear y eliminar cuentas requiere la Auth Admin API, que solo funciona con
 * `SUPABASE_SERVICE_ROLE_KEY`. Si la variable no está configurada, las acciones
 * devuelven un mensaje explicando qué falta en vez de romperse.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getManagerOrNull } from "@/lib/supabase/auth";
import {
  generarPassword,
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { normalizeRole, type UserRole } from "@/lib/roles";
import type { ActionState, CredentialState } from "@/lib/admin-types";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const SIN_PERMISO: CredentialState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para gestionar el equipo.",
};

const SIN_SERVICE_ROLE: CredentialState = {
  status: "error",
  message:
    "Falta la variable SUPABASE_SERVICE_ROLE_KEY en el servidor. Sin ella no se pueden crear ni eliminar cuentas. Consulta docs/ADMIN.md para configurarla.",
};

const fail = (message: string): CredentialState => ({
  status: "error",
  message,
});

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function bool(formData: FormData, key: string, fallback = true): boolean {
  const values = formData.getAll(key);
  if (values.length === 0) return fallback;
  return values.includes("true");
}

function esCorreoValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function revalidarEquipo() {
  revalidatePath("/admin/empleados");
  revalidatePath("/admin/jornadas");
  revalidatePath("/admin");
}

/**
 * Reglas de quién puede gestionar a quién.
 * @param actorRole  rol de quien ejecuta la acción
 * @param targetRole rol de la cuenta afectada (o el rol que se quiere asignar)
 */
function puedeGestionar(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === "admin") return true;
  // Coordinador: todo menos administradores.
  return actorRole === "coordinador" && targetRole !== "admin";
}

/* ------------------------------------------------------------------ */
/* Crear cuenta                                                        */
/* ------------------------------------------------------------------ */

export async function createEmployee(
  _prev: CredentialState,
  formData: FormData,
): Promise<CredentialState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;
  if (!isServiceRoleConfigured()) return SIN_SERVICE_ROLE;

  const fullName = text(formData, "full_name");
  const email = text(formData, "email").toLowerCase();
  const role = normalizeRole(text(formData, "role"));

  if (fullName === "") return fail("Escribe el nombre completo de la persona.");
  if (!esCorreoValido(email))
    return fail("El correo electrónico no parece válido. Revísalo, por favor.");
  if (!puedeGestionar(session.profile.role, role))
    return fail(
      "Solo un administrador puede crear cuentas de administrador. Elige otro rol.",
    );

  const admin = getServiceRoleSupabase();
  if (!admin) return SIN_SERVICE_ROLE;

  const password = generarPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // sin correo de verificación: la cuenta la crea GPI
    user_metadata: {
      full_name: fullName,
      role,
      cargo: textOrNull(formData, "cargo") ?? "",
      phone: textOrNull(formData, "phone") ?? "",
    },
  });

  if (error || !data?.user) {
    const mensaje = error?.message ?? "";
    if (/already/i.test(mensaje) || /registered/i.test(mensaje)) {
      return fail(`Ya existe una cuenta con el correo ${email}.`);
    }
    return fail(mensaje || "No fue posible crear la cuenta. Inténtalo de nuevo.");
  }

  // Red de seguridad: si el trigger `on_auth_user_created` no pudo ejecutarse,
  // el profile se crea/actualiza aquí con el service role.
  const { error: perfilError } = await admin.from("profiles").upsert(
    {
      id: data.user.id,
      email,
      full_name: fullName,
      role,
      cargo: textOrNull(formData, "cargo"),
      phone: textOrNull(formData, "phone"),
      active: true,
    },
    { onConflict: "id" },
  );

  if (perfilError) {
    return fail(
      `La cuenta se creó, pero no se pudo guardar su perfil (${perfilError.message}). Revisa la sección desde el panel.`,
    );
  }

  revalidarEquipo();

  return {
    status: "success",
    message: `Cuenta creada para ${fullName}.`,
    credential: { email, password, kind: "created" },
  };
}

/* ------------------------------------------------------------------ */
/* Editar cuenta                                                       */
/* ------------------------------------------------------------------ */

export async function updateEmployee(
  _prev: CredentialState,
  formData: FormData,
): Promise<CredentialState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la cuenta.");

  const { data: actual, error: lecturaError } = await session.supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (lecturaError || !actual) return fail("No se encontró esa cuenta.");

  const rolActual = normalizeRole(actual.role);
  const rolNuevo = normalizeRole(text(formData, "role"));

  if (!puedeGestionar(session.profile.role, rolActual))
    return fail("Solo un administrador puede modificar cuentas de administrador.");
  if (!puedeGestionar(session.profile.role, rolNuevo))
    return fail("Solo un administrador puede asignar el rol de administrador.");

  const fullName = text(formData, "full_name");
  if (fullName === "") return fail("El nombre completo es obligatorio.");

  const active = bool(formData, "active");
  const esUnoMismo = id === session.profile.id;

  if (esUnoMismo && !active)
    return fail("No puedes desactivar tu propia cuenta.");
  if (esUnoMismo && rolNuevo !== rolActual)
    return fail(
      "No puedes cambiar tu propio rol. Pídeselo a otro administrador.",
    );

  const { error } = await session.supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role: rolNuevo,
      cargo: textOrNull(formData, "cargo"),
      phone: textOrNull(formData, "phone"),
      active,
    })
    .eq("id", id);

  if (error) return fail(error.message);

  // Se replica el rol en los metadatos de Auth para mantener la coherencia si
  // en el futuro alguien recrea el profile desde el trigger.
  const admin = getServiceRoleSupabase();
  if (admin) {
    await admin.auth.admin.updateUserById(id, {
      user_metadata: { full_name: fullName, role: rolNuevo },
    });
  }

  revalidarEquipo();
  return {
    status: "success",
    message: active
      ? "Cambios guardados."
      : "Cambios guardados. La cuenta quedó desactivada y no podrá iniciar sesión.",
  };
}

/* ------------------------------------------------------------------ */
/* Restablecer contraseña                                              */
/* ------------------------------------------------------------------ */

export async function resetEmployeePassword(
  _prev: CredentialState,
  formData: FormData,
): Promise<CredentialState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;
  if (!isServiceRoleConfigured()) return SIN_SERVICE_ROLE;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la cuenta.");

  const { data: actual } = await session.supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!actual) return fail("No se encontró esa cuenta.");
  if (!puedeGestionar(session.profile.role, normalizeRole(actual.role)))
    return fail(
      "Solo un administrador puede restablecer la contraseña de otro administrador.",
    );

  const admin = getServiceRoleSupabase();
  if (!admin) return SIN_SERVICE_ROLE;

  const password = generarPassword();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return fail(error.message);

  return {
    status: "success",
    message: "Contraseña restablecida.",
    credential: {
      email: String(actual.email ?? ""),
      password,
      kind: "reset",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Eliminar cuenta                                                     */
/* ------------------------------------------------------------------ */

export async function deleteEmployee(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;
  if (!isServiceRoleConfigured()) return SIN_SERVICE_ROLE;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la cuenta.");
  if (id === session.profile.id)
    return fail("No puedes eliminar tu propia cuenta.");

  const { data: actual } = await session.supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!actual) return fail("No se encontró esa cuenta.");
  if (!puedeGestionar(session.profile.role, normalizeRole(actual.role)))
    return fail("Solo un administrador puede eliminar a otro administrador.");

  // Confirmación fuerte: hay que escribir el correo exacto de la cuenta.
  const confirmacion = text(formData, "confirm_email").toLowerCase();
  const correo = String(actual.email ?? "").toLowerCase();
  if (confirmacion !== correo)
    return fail(
      "Para eliminar la cuenta debes escribir su correo exactamente como aparece arriba.",
    );

  const admin = getServiceRoleSupabase();
  if (!admin) return SIN_SERVICE_ROLE;

  // Borrar el usuario de Auth arrastra el profile (ON DELETE CASCADE) y con él
  // sus jornadas.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return fail(error.message);

  revalidarEquipo();
  redirect("/admin/empleados");
}
