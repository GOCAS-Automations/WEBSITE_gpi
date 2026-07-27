"use server";

/**
 * SERVER ACTIONS — Aprobación de jornadas (/admin/jornadas)
 * =========================================================
 * Solo managers (admin | coordinador) con la cuenta activa pueden aprobar o
 * rechazar. La comprobación se hace aquí, en el servidor, además de las
 * políticas RLS `jornadas_update_manager` de la migración 0002.
 */

import { revalidatePath } from "next/cache";
import { getManagerOrNull } from "@/lib/supabase/auth";
import type { ActionState } from "@/lib/admin-types";

const SIN_PERMISO: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para revisar jornadas.",
};

const fail = (message: string): ActionState => ({ status: "error", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function revalidar() {
  revalidatePath("/admin/jornadas");
  revalidatePath("/admin");
  revalidatePath("/mi-cuenta");
}

/* ------------------------------------------------------------------ */

export async function approveJornada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la jornada.");

  const { error } = await session.supabase
    .from("jornadas")
    .update({
      status: "aprobada",
      review_note: text(formData, "review_note") || null,
      reviewed_by: session.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidar();
  return { status: "success", message: "Jornada aprobada." };
}

export async function rejectJornada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la jornada.");

  // Al rechazar, la nota es obligatoria: el empleado necesita saber qué
  // corregir para volver a registrarla.
  const nota = text(formData, "review_note");
  if (nota === "")
    return fail(
      "Escribe el motivo del rechazo: es lo que verá el empleado para saber qué corregir.",
    );

  const { error } = await session.supabase
    .from("jornadas")
    .update({
      status: "rechazada",
      review_note: nota,
      reviewed_by: session.profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidar();
  return { status: "success", message: "Jornada rechazada con tu nota." };
}

/**
 * Devuelve una jornada ya revisada al estado 'pendiente' para poder corregir
 * una aprobación o un rechazo hecho por error.
 */
export async function reopenJornada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la jornada.");

  const { error } = await session.supabase
    .from("jornadas")
    .update({
      status: "pendiente",
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidar();
  return {
    status: "success",
    message: "La jornada volvió a quedar pendiente de revisión.",
  };
}
