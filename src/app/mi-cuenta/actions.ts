"use server";

/**
 * SERVER ACTIONS — Portal del empleado (/mi-cuenta)
 * =================================================
 * Registrar, editar y eliminar las jornadas propias, y cambiar la contraseña.
 *
 * SEGURIDAD:
 *  - Todas las acciones exigen sesión activa (`getActiveSession`) y fijan
 *    `employee_id = auth.uid()`: nadie puede registrar jornadas a nombre de
 *    otro, ni aunque manipule el formulario.
 *  - Solo se pueden editar o eliminar jornadas PROPIAS y en estado
 *    'pendiente'. Las políticas RLS de la migración 0002 lo garantizan
 *    también a nivel de base de datos.
 *
 * Los mensajes están escritos para personas no técnicas: dicen qué pasó y qué
 * hacer, sin jerga.
 */

import { revalidatePath } from "next/cache";
import { getActiveSession } from "@/lib/supabase/auth";
import { instanteColombia } from "@/lib/jornada";
import type { ActionState } from "@/lib/admin-types";

const SIN_SESION: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta está desactivada. Vuelve a ingresar, por favor.",
};

const fail = (message: string): ActionState => ({ status: "error", message });
const ok = (message: string): ActionState => ({ status: "success", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function marcado(formData: FormData, key: string): boolean {
  return formData.getAll(key).includes("true");
}

function revalidar() {
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/jornadas");
}

/* ------------------------------------------------------------------ */
/* Registrar / editar una jornada                                      */
/* ------------------------------------------------------------------ */

export async function saveJornada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getActiveSession();
  if (!session) return SIN_SESION;

  const id = text(formData, "id");
  const workOrder = text(formData, "work_order");
  const workDate = text(formData, "work_date");
  const horaInicio = text(formData, "start_time");
  const horaFin = text(formData, "end_time");
  const description = text(formData, "description");

  /* --- Validaciones amables, una a una --- */
  if (workOrder === "")
    return fail("Escribe el número de la orden de trabajo.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate))
    return fail("Selecciona la fecha del día que trabajaste.");
  if (!/^\d{2}:\d{2}$/.test(horaInicio))
    return fail("Indica la hora en que empezaste.");
  if (!/^\d{2}:\d{2}$/.test(horaFin))
    return fail("Indica la hora en que terminaste.");
  if (description === "")
    return fail("Cuéntanos brevemente qué labor realizaste.");

  // El turno cruza la medianoche si el empleado lo marcó o si la hora de fin
  // es menor o igual a la de inicio (p. ej. 22:00 → 02:00).
  const cruzaMedianoche = marcado(formData, "next_day") || horaFin <= horaInicio;

  const startAt = instanteColombia(workDate, horaInicio);
  const endAt = instanteColombia(workDate, horaFin, cruzaMedianoche ? 1 : 0);

  if (!startAt || !endAt)
    return fail("No pudimos leer las horas ingresadas. Revísalas, por favor.");

  const duracionMin =
    (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000;

  if (duracionMin <= 0)
    return fail(
      "La hora de finalización debe ser posterior a la de inicio. Si terminaste después de medianoche, marca la casilla «terminé al día siguiente».",
    );
  if (duracionMin > 24 * 60)
    return fail("Una jornada no puede durar más de 24 horas. Revisa las horas.");

  const payload = {
    employee_id: session.profile.id, // SIEMPRE el usuario de la sesión
    work_order: workOrder,
    work_date: workDate,
    start_at: startAt,
    end_at: endAt,
    description,
    observations: textOrNull(formData, "observations"),
  };

  if (id) {
    // Editar: solo si sigue pendiente y es propia (doble filtro + RLS).
    const { data, error } = await session.supabase
      .from("jornadas")
      .update(payload)
      .eq("id", id)
      .eq("employee_id", session.profile.id)
      .eq("status", "pendiente")
      .select("id");

    if (error) return fail(error.message);
    if (!data || data.length === 0)
      return fail(
        "No se pudo editar: esa jornada ya fue revisada o no te pertenece.",
      );

    revalidar();
    return ok("Los cambios de tu jornada quedaron guardados.");
  }

  const { error } = await session.supabase
    .from("jornadas")
    .insert({ ...payload, status: "pendiente" });

  if (error) return fail(error.message);

  revalidar();
  return ok(
    "Tu jornada quedó registrada y está pendiente de aprobación. Te avisaremos aquí mismo cuando la revisen.",
  );
}

/* ------------------------------------------------------------------ */
/* Eliminar una jornada propia                                         */
/* ------------------------------------------------------------------ */

export async function deleteJornada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getActiveSession();
  if (!session) return SIN_SESION;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la jornada.");

  const { data, error } = await session.supabase
    .from("jornadas")
    .delete()
    .eq("id", id)
    .eq("employee_id", session.profile.id)
    .eq("status", "pendiente")
    .select("id");

  if (error) return fail(error.message);
  if (!data || data.length === 0)
    return fail(
      "No se pudo eliminar: esa jornada ya fue revisada o no te pertenece.",
    );

  revalidar();
  return ok("Jornada eliminada.");
}

/* ------------------------------------------------------------------ */
/* Cambiar la propia contraseña                                        */
/* ------------------------------------------------------------------ */

export async function changeOwnPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getActiveSession();
  if (!session) return SIN_SESION;

  const nueva = text(formData, "password");
  const repetida = text(formData, "password_confirm");

  if (nueva.length < 8)
    return fail("La contraseña debe tener al menos 8 caracteres.");
  if (nueva !== repetida)
    return fail("Las dos contraseñas no coinciden. Vuelve a escribirlas.");

  const { error } = await session.supabase.auth.updateUser({ password: nueva });
  if (error) return fail(error.message);

  revalidatePath("/mi-cuenta");
  return ok(
    "Tu contraseña se actualizó. Úsala la próxima vez que inicies sesión.",
  );
}
