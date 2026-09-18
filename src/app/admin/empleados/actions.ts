"use server";

/**
 * SERVER ACTIONS — Gestión de cuentas del equipo (/admin/empleados)
 * =================================================================
 * Crear, editar, restablecer contraseña y eliminar usuarios del portal.
 *
 * CUENTAS POR USUARIO: el equipo de GPI no tiene correo corporativo, así que
 * entra con un **usuario** (p. ej. `mgomez`). Supabase Auth exige un correo, de
 * modo que la cuenta se crea con el sintético interno
 * `mgomez@cuentas.gpiprofesionales.com` (ver `src/lib/usuarios.ts`). El correo
 * real de la persona, si lo tiene, se guarda aparte en `email_contacto` y es
 * solo informativo.
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
import { isManagerRole, normalizeRole, type UserRole } from "@/lib/roles";
import {
  AYUDA_USUARIO,
  emailDeUsuario,
  esUsuarioValido,
  identificadorCuenta,
  normalizarApodo,
  normalizarUsuario,
} from "@/lib/usuarios";
import type { ActionState, CredentialState } from "@/lib/admin-types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/* ------------------------------------------------------------------ */
/* Tolerancia a la migración 0003 sin aplicar                          */
/* ------------------------------------------------------------------ */

/**
 * PostgREST devuelve este tipo de error cuando se escribe en una columna que
 * todavía no existe (base sin la migración 0003). En ese caso se reintenta sin
 * las columnas nuevas: el panel sigue funcionando, solo que sin usuario, cédula
 * ni correo de contacto.
 */
function esColumnaDesconocida(mensaje: string): boolean {
  return /(column .* does not exist|could not find the .* column|schema cache)/i.test(
    mensaje,
  );
}

/** Campos que solo existen a partir de la migración 0003 (y `apodo`, de la 0010). */
interface CamposNuevos {
  username?: string | null;
  cedula?: string | null;
  email_contacto?: string | null;
  apodo?: string | null;
}

/** Quita del payload los campos que pueden no existir todavía en `profiles`. */
function sinCamposNuevos<T extends CamposNuevos>(payload: T) {
  const copia = { ...payload };
  delete copia.username;
  delete copia.cedula;
  delete copia.email_contacto;
  delete copia.apodo;
  return copia;
}

/**
 * EL APODO LO ESCRIBEN LOS MANAGERS (admin y coordinador)
 * ------------------------------------------------------
 * Hasta el 18 sep 2026 era solo del administrador; GPI pidió que el coordinador
 * también pueda ponerlo, porque es quien arma el calendario y necesita que las
 * fichas se lean. El Community Manager sigue fuera, aunque manipule el
 * formulario: esta función devuelve `undefined` para cualquier otro rol y el
 * campo NO entra en el payload, así que la fila conserva el apodo que tenía.
 * La interfaz se lo muestra en un campo de solo lectura, pero la barrera real
 * es esta. (En la base, la RLS de `profiles` ya era `is_manager()`.)
 */
function apodoSiEsManager(
  actorRole: UserRole,
  formData: FormData,
): string | null | undefined {
  if (!isManagerRole(actorRole)) return undefined;
  const valor = normalizarApodo(formData.get("apodo"));
  return valor === "" ? null : valor;
}

/** Añade `apodo` al payload solo si quien guarda tiene permiso para tocarlo. */
function conApodo(
  payload: Record<string, unknown> & CamposNuevos,
  apodo: string | null | undefined,
): Record<string, unknown> & CamposNuevos {
  return apodo === undefined ? payload : { ...payload, apodo };
}

/** `upsert` en `profiles` que reintenta sin las columnas de la 0003. */
async function upsertPerfil(
  client: SupabaseClient,
  payload: Record<string, unknown> & CamposNuevos,
): Promise<{ error: { message: string } | null }> {
  const { error } = await client.from("profiles").upsert(payload, { onConflict: "id" });
  if (error && esColumnaDesconocida(error.message)) {
    return client.from("profiles").upsert(sinCamposNuevos(payload), { onConflict: "id" });
  }
  return { error };
}

/** `update` en `profiles` que reintenta sin las columnas de la 0003. */
async function updatePerfil(
  client: SupabaseClient,
  id: string,
  payload: Record<string, unknown> & CamposNuevos,
): Promise<{ error: { message: string } | null }> {
  const { error } = await client.from("profiles").update(payload).eq("id", id);
  if (error && esColumnaDesconocida(error.message)) {
    return client.from("profiles").update(sinCamposNuevos(payload)).eq("id", id);
  }
  return { error };
}

/** true si ya hay una cuenta con ese usuario (tolera la columna inexistente). */
async function usuarioOcupado(
  client: SupabaseClient,
  usuario: string,
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from("profiles")
      .select("id")
      .eq("username", usuario)
      .limit(1);
    if (error) return false; // columna aún no creada: lo resuelve el correo único
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
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
  const usuario = normalizarUsuario(text(formData, "username"));
  const role = normalizeRole(text(formData, "role"));
  const emailContacto = textOrNull(formData, "email_contacto");

  if (fullName === "") return fail("Escribe el nombre completo de la persona.");
  if (usuario === "") return fail("Escribe el usuario con el que ingresará al portal.");
  if (!esUsuarioValido(usuario))
    return fail(`Ese usuario no es válido. ${AYUDA_USUARIO}`);
  if (emailContacto !== null && !esCorreoValido(emailContacto))
    return fail("El correo de contacto no parece válido. Revísalo o déjalo vacío.");
  if (!puedeGestionar(session.profile.role, role))
    return fail(
      "Solo un administrador puede crear cuentas de administrador. Elige otro rol.",
    );

  if (await usuarioOcupado(session.supabase, usuario))
    return fail(
      `Ya existe una cuenta con el usuario "${usuario}". Elige otro (por ejemplo, añadiendo la inicial del segundo apellido).`,
    );

  const admin = getServiceRoleSupabase();
  if (!admin) return SIN_SERVICE_ROLE;

  // Correo sintético interno: es lo que Supabase Auth guarda como identidad.
  // La persona nunca lo ve ni lo necesita: ingresa con su usuario.
  const email = emailDeUsuario(usuario);
  const password = generarPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // sin correo de verificación: la cuenta la crea GPI
    user_metadata: {
      full_name: fullName,
      role,
      username: usuario,
      cedula: textOrNull(formData, "cedula") ?? "",
      email_contacto: emailContacto ?? "",
      cargo: textOrNull(formData, "cargo") ?? "",
      phone: textOrNull(formData, "phone") ?? "",
    },
  });

  if (error || !data?.user) {
    const mensaje = error?.message ?? "";
    if (/already/i.test(mensaje) || /registered/i.test(mensaje)) {
      return fail(`Ya existe una cuenta con el usuario "${usuario}".`);
    }
    return fail(mensaje || "No fue posible crear la cuenta. Inténtalo de nuevo.");
  }

  // Red de seguridad: si el trigger `on_auth_user_created` no pudo ejecutarse,
  // el profile se crea/actualiza aquí con el service role.
  const { error: perfilError } = await upsertPerfil(
    admin,
    conApodo(
      {
        id: data.user.id,
        email,
        username: usuario,
        full_name: fullName,
        role,
        cedula: textOrNull(formData, "cedula"),
        email_contacto: emailContacto,
        cargo: textOrNull(formData, "cargo"),
        phone: textOrNull(formData, "phone"),
        active: true,
      },
      apodoSiEsManager(session.profile.role, formData),
    ),
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
    credential: { usuario, password, kind: "created" },
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

  const emailContacto = textOrNull(formData, "email_contacto");
  if (emailContacto !== null && !esCorreoValido(emailContacto))
    return fail("El correo de contacto no parece válido. Revísalo o déjalo vacío.");

  const active = bool(formData, "active");
  const esUnoMismo = id === session.profile.id;

  if (esUnoMismo && !active)
    return fail("No puedes desactivar tu propia cuenta.");
  if (esUnoMismo && rolNuevo !== rolActual)
    return fail(
      "No puedes cambiar tu propio rol. Pídeselo a otro administrador.",
    );

  // El usuario NO se puede cambiar: es la identidad de la cuenta en Auth.
  const { error } = await updatePerfil(
    session.supabase,
    id,
    conApodo(
      {
        full_name: fullName,
        role: rolNuevo,
        cedula: textOrNull(formData, "cedula"),
        email_contacto: emailContacto,
        cargo: textOrNull(formData, "cargo"),
        phone: textOrNull(formData, "phone"),
        active,
      },
      apodoSiEsManager(session.profile.role, formData),
    ),
  );

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
      usuario: identificadorCuenta({
        username: typeof actual.username === "string" ? actual.username : null,
        email: String(actual.email ?? ""),
      }),
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

  // Confirmación fuerte: hay que escribir el usuario exacto de la cuenta.
  const confirmacion = text(formData, "confirm_usuario").toLowerCase();
  const esperado = identificadorCuenta({
    username: typeof actual.username === "string" ? actual.username : null,
    email: String(actual.email ?? ""),
  }).toLowerCase();
  if (confirmacion !== esperado)
    return fail(
      "Para eliminar la cuenta debes escribir su usuario exactamente como aparece arriba.",
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
