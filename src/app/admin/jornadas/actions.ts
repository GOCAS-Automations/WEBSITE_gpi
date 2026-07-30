"use server";

/**
 * SERVER ACTIONS — Aprobación de jornadas (/admin/jornadas)
 * =========================================================
 * Solo managers (admin | coordinador) con la cuenta activa pueden aprobar o
 * rechazar. La comprobación se hace aquí, en el servidor, además de las
 * políticas RLS `jornadas_update_manager` de la migración 0002.
 *
 * DESGLOSE CONGELADO (migración 0004)
 * -----------------------------------
 * Al **aprobar** se calcula el desglose de horas UNA vez, con el horario del mes
 * y los recargos vigentes en ese momento, y se guarda junto con el contexto que
 * se usó (`contexto_calculo`) y la fecha (`calculado_at`). Desde entonces esa
 * jornada muestra siempre los mismos números: corregir después el horario de un
 * mes o un porcentaje de recargo ya no toca los reportes de nómina.
 *
 * Al **rechazar** o al **devolver a pendiente** se LIMPIA el snapshot: una
 * jornada que no está aprobada no es válida para nómina, y devolverla a
 * pendiente es justamente el mecanismo legítimo para recalcularla (al volver a
 * aprobarla se congela otra vez con lo que esté vigente).
 *
 * Todas las escrituras toleran que la 0004 no esté aplicada: si las columnas no
 * existen, se reintenta sin ellas y el flujo sigue funcionando igual que antes.
 */

import { revalidatePath } from "next/cache";
import { getManagerOrNull, type Session } from "@/lib/supabase/auth";
import { getJornadaConfig, getMapaHorarios } from "@/lib/admin";
import {
  calcularJornada,
  construirContextoCalculo,
  faltaColumnaDesglose,
} from "@/lib/jornada";
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

/** Campos que borran el snapshot: la jornada vuelve a calcularse en vivo. */
const SIN_SNAPSHOT = {
  desglose: null,
  contexto_calculo: null,
  calculado_at: null,
} as const;

/**
 * Actualiza una jornada con el snapshot y, si las columnas de la migración 0004
 * todavía no existen, reintenta sin ellas. Devuelve el mensaje de error o
 * `null` si todo fue bien.
 */
async function actualizarJornada(
  session: Session,
  id: string,
  base: Record<string, unknown>,
  snapshot: Record<string, unknown>,
): Promise<string | null> {
  const primero = await session.supabase
    .from("jornadas")
    .update({ ...base, ...snapshot })
    .eq("id", id);

  if (!primero.error) return null;

  if (!faltaColumnaDesglose(primero.error)) return primero.error.message;

  // La 0004 no está aplicada: se guarda el cambio de estado sin snapshot y el
  // desglose se sigue calculando en vivo (comportamiento anterior).
  const segundo = await session.supabase
    .from("jornadas")
    .update(base)
    .eq("id", id);

  return segundo.error ? segundo.error.message : null;
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

  // Se relee la jornada del servidor (nunca del formulario) para calcular sobre
  // los datos reales del turno.
  const { data: fila, error: errorLectura } = await session.supabase
    .from("jornadas")
    .select("id, start_at, end_at, work_date")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) return fail(errorLectura.message);
  if (!fila)
    return fail(
      "No encontramos esa jornada. Puede que alguien la haya eliminado: recarga la página.",
    );

  const [config, horarios] = await Promise.all([
    getJornadaConfig(),
    getMapaHorarios(),
  ]);

  const workDate = String(fila.work_date ?? "");
  const desglose = calcularJornada(
    String(fila.start_at ?? ""),
    String(fila.end_at ?? ""),
    workDate,
    config,
    horarios,
  );

  // Con los datos que crea el portal esto no debería pasar (la base exige que la
  // salida sea posterior a la entrada), pero si el turno es imposible de
  // calcular no se aprueba: congelar cifras inválidas sería peor.
  if (!desglose.valido)
    return fail(
      `No se puede aprobar porque las horas de esta jornada no cuadran. ${
        desglose.error ?? ""
      } Recházala con una nota para que el empleado la corrija.`.replace(/\s+/g, " ").trim(),
    );

  const ahora = new Date().toISOString();

  const base = {
    status: "aprobada",
    review_note: text(formData, "review_note") || null,
    reviewed_by: session.profile.id,
    reviewed_at: ahora,
  };

  const error = await actualizarJornada(session, id, base, {
    desglose,
    contexto_calculo: construirContextoCalculo(workDate, config, horarios),
    calculado_at: ahora,
  });

  if (error) return fail(error);

  revalidar();
  return {
    status: "success",
    message:
      "Jornada aprobada. Su desglose de horas quedó congelado: cambiar después el horario del mes ya no lo altera.",
  };
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

  // Una jornada rechazada NO es válida para nómina, así que no se congela nada
  // y se limpia cualquier snapshot previo.
  const error = await actualizarJornada(
    session,
    id,
    {
      status: "rechazada",
      review_note: nota,
      reviewed_by: session.profile.id,
      reviewed_at: new Date().toISOString(),
    },
    SIN_SNAPSHOT,
  );

  if (error) return fail(error);

  revalidar();
  return { status: "success", message: "Jornada rechazada con tu nota." };
}

/**
 * Devuelve una jornada ya revisada al estado 'pendiente' para poder corregir
 * una aprobación o un rechazo hecho por error.
 *
 * También es el **mecanismo para recalcular** una jornada: al reabrirla se borra
 * el desglose congelado, así que vuelve a calcularse con el horario del mes y
 * los recargos vigentes, y al aprobarla de nuevo se congela con esos valores.
 */
export async function reopenJornada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la jornada.");

  const error = await actualizarJornada(
    session,
    id,
    {
      status: "pendiente",
      review_note: null,
      reviewed_by: null,
      reviewed_at: null,
    },
    SIN_SNAPSHOT,
  );

  if (error) return fail(error);

  revalidar();
  return {
    status: "success",
    message:
      "La jornada volvió a quedar pendiente de revisión y sus horas se recalculan con el horario del mes vigente.",
  };
}
