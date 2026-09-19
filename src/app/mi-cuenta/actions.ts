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
import {
  faltaColumnaDesglose,
  formatearFechaLarga,
  formatearHora12,
  horaColombia,
  instanteColombia,
} from "@/lib/jornada";
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

/**
 * ¿La base de datos rechazó la jornada porque `work_order` todavía es
 * obligatoria (migración 0005 sin aplicar) y la persona la dejó vacía?
 *
 * Misma filosofía que el resto del portal: el sistema funciona con migraciones
 * pendientes. Si es el caso, se reintenta guardando cadena vacía —que
 * `rowToJornada` vuelve a leer como "sin orden"—, así el empleado registra su
 * jornada igual y ve exactamente lo mismo en pantalla.
 */
function rechazaOrdenVacia(
  error: { code?: string | null; message?: string | null } | null | undefined,
  workOrder: string | null,
): boolean {
  if (!error || workOrder !== null) return false;
  // 23502 = not_null_violation.
  if ((error.code ?? "") === "23502") return true;
  const mensaje = error.message ?? "";
  return /work_order/i.test(mensaje) && /null/i.test(mensaje);
}

/** Lo que se le dice a quien registra dos tramos del mismo día. */
const AVISO_UN_REGISTRO =
  "Si saliste y volviste el mismo día, registra UNA sola jornada, desde tu primera entrada hasta tu última salida (edita la que ya tenías y, si hace falta, cuéntalo en observaciones).";

type SesionActiva = NonNullable<Awaited<ReturnType<typeof getActiveSession>>>;

interface OtraJornada {
  id: string;
  work_date: string;
  start_at: string;
  end_at: string;
}

/**
 * Las OTRAS jornadas propias que cumplen un filtro, sin contar la que se está
 * editando ni las rechazadas. Si la consulta falla devuelve `[]`: la
 * comprobación es una ayuda y nunca debe impedir registrar por un error de red.
 */
async function otrasJornadas(
  session: SesionActiva,
  idEditada: string,
  filtro: { seCruzaCon: { desde: string; hasta: string } } | { delDia: string },
): Promise<OtraJornada[]> {
  let consulta = session.supabase
    .from("jornadas")
    .select("id, work_date, start_at, end_at")
    .eq("employee_id", session.profile.id)
    .neq("status", "rechazada");
  if (idEditada) consulta = consulta.neq("id", idEditada);
  // Dos intervalos [a, b) y [c, d) se cruzan si a < d y c < b: tocarse en el
  // borde (una termina a las 12:00 y otra empieza a las 12:00) no es cruzarse.
  consulta =
    "seCruzaCon" in filtro
      ? consulta.lt("start_at", filtro.seCruzaCon.hasta).gt("end_at", filtro.seCruzaCon.desde)
      : consulta.eq("work_date", filtro.delDia);
  const { data, error } = await consulta.order("start_at").limit(5);
  if (error || !data) return [];
  return data as OtraJornada[];
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
  // Opcional desde la migración 0005: hay labores sin orden de trabajo
  // asociada. Vacío se guarda como NULL, nunca como cadena vacía.
  const workOrder = textOrNull(formData, "work_order");
  const workDate = text(formData, "work_date");
  const horaInicio = text(formData, "start_time");
  const horaFin = text(formData, "end_time");
  const description = text(formData, "description");

  /* --- Validaciones amables, una a una --- */
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

  /* --- Dos registros no pueden solaparse (auditoría legal, 19 sep 2026) ---
     Si alguien registra dos tramos del mismo turno, cada uno recibe su propia
     jornada ordinaria y su propio almuerzo, y las horas extra del día se
     pierden. Se RECHAZA lo que se cruce con otra jornada propia (las
     rechazadas no cuentan: son las que el empleado vuelve a registrar bien) y
     se AVISA, sin bloquear, si ese día ya había otra. */
  const [solapadas, delMismoDia] = await Promise.all([
    otrasJornadas(session, id, { seCruzaCon: { desde: startAt, hasta: endAt } }),
    otrasJornadas(session, id, { delDia: workDate }),
  ]);
  if (solapadas.length > 0) {
    const otra = solapadas[0];
    return fail(
      `Este horario se cruza con otra jornada tuya: la del ${formatearFechaLarga(
        otra.work_date,
      )} (de ${formatearHora12(horaColombia(otra.start_at))} a ${formatearHora12(
        horaColombia(otra.end_at),
      )}). Dos registros no pueden solaparse. ${AVISO_UN_REGISTRO}`,
    );
  }
  const avisoMismoDia =
    delMismoDia.length > 0
      ? ` Ojo: ese día ya tenías otra jornada registrada. ${AVISO_UN_REGISTRO}`
      : "";

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
    //
    // El desglose congelado solo existe en jornadas APROBADAS, así que aquí no
    // hay nada que invalidar; se limpia igualmente por si un snapshot quedó
    // huérfano (p. ej. una jornada reabierta antes de una corrección de
    // versiones anteriores). Si las columnas de la 0004 no existen todavía, se
    // reintenta sin ellas.
    const editar = (datos: Record<string, unknown>) =>
      session.supabase
        .from("jornadas")
        .update(datos)
        .eq("id", id)
        .eq("employee_id", session.profile.id)
        .eq("status", "pendiente")
        .select("id");

    let { data, error } = await editar({
      ...payload,
      desglose: null,
      contexto_calculo: null,
      calculado_at: null,
    });

    if (error && faltaColumnaDesglose(error)) {
      ({ data, error } = await editar(payload));
    }
    if (error && rechazaOrdenVacia(error, workOrder)) {
      ({ data, error } = await editar({ ...payload, work_order: "" }));
    }

    if (error) return fail(error.message);
    if (!data || data.length === 0)
      return fail(
        "No se pudo editar: esa jornada ya fue revisada o no te pertenece.",
      );

    revalidar();
    return ok(`Los cambios de tu jornada quedaron guardados.${avisoMismoDia}`);
  }

  const crear = (datos: Record<string, unknown>) =>
    session.supabase.from("jornadas").insert({ ...datos, status: "pendiente" });

  let { error } = await crear(payload);

  if (error && rechazaOrdenVacia(error, workOrder)) {
    ({ error } = await crear({ ...payload, work_order: "" }));
  }

  if (error) return fail(error.message);

  revalidar();
  return ok(
    `Tu jornada quedó registrada y está pendiente de aprobación. Te avisaremos aquí mismo cuando la revisen.${avisoMismoDia}`,
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
