"use server";

/**
 * SERVER ACTIONS — Bandeja de permisos (/admin/jornadas?vista=permisos)
 * =====================================================================
 * Aprobar, rechazar, devolver a pendiente, registrar una falta y eliminar.
 * Todo esto es **solo para MANAGERS** (admin | coordinador), igual que la
 * revisión de jornadas: se comprueba aquí (`getManagerOrNull`) además de las
 * políticas RLS de la migración 0014.
 *
 * TRES COSAS QUE HAY QUE DECIR SIEMPRE
 * ------------------------------------
 *  · **Rechazar ≠ eliminar.** Rechazar conserva la solicitud con la nota que
 *    el colaborador lee para corregirla; eliminar la borra para siempre, con
 *    su soporte. Eliminar existe para limpiar registros de prueba o creados
 *    por error.
 *  · **Aprobar es decidir si se paga.** La casilla llega marcada con lo que
 *    pidió el colaborador (`remunerado_solicitado`), pero manda el aprobador.
 *    Aprobar como NO remunerado descuenta en la nómina del período: ese día y
 *    el domingo de esa semana (art. 173 del CST).
 *  · **Registrar una falta** (`origen = registro_admin`) nace **aprobada y no
 *    remunerada**: es para dejar constancia de lo que no se pidió por el
 *    sistema.
 *
 * Como el descuento entra en la nómina, todas revalidan también `/admin/nomina`:
 * las liquidaciones en BORRADOR se recalculan solas; las cerradas, jamás.
 */

import { revalidatePath } from "next/cache";
import { getManagerOrNull } from "@/lib/supabase/auth";
import { listProfiles } from "@/lib/admin";
import {
  LIMITES_PERMISO,
  cuandoEs,
  diasEntre,
  esFechaValida,
  horasDelTramo,
  minutosDeHora,
  type PermisoTipo,
} from "@/lib/permisos";
import { borrarSoporte, subirSoporte } from "@/lib/soportes";
import type { ActionState } from "@/lib/admin-types";

const SIN_PERMISO: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para revisar los permisos del equipo. Solo el administrador y el coordinador pueden hacerlo.",
};

const fail = (message: string): ActionState => ({ status: "error", message });
const ok = (message: string): ActionState => ({ status: "success", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(formData: FormData, key: string, max: number): string | null {
  const value = text(formData, key).slice(0, max);
  return value === "" ? null : value;
}

function marcado(formData: FormData, key: string): boolean {
  return formData.getAll(key).includes("true");
}

function archivo(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File)) return null;
  return value.size > 0 && value.name ? value : null;
}

function revalidar() {
  revalidatePath("/admin/jornadas");
  revalidatePath("/admin/nomina");
  revalidatePath("/admin");
  revalidatePath("/mi-cuenta");
}

function mensajeDeError(error: { code?: string | null; message?: string | null }) {
  const mensaje = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/permisos/i.test(mensaje) &&
      /(does not exist|no existe|schema cache|find the table)/i.test(mensaje))
  ) {
    return "Todavía no está creada la tabla de permisos en la base de datos. Aplica la migración supabase/migrations/0014_permisos.sql desde el SQL Editor de Supabase y vuelve a intentarlo.";
  }
  return mensaje || "No se pudo completar la operación. Inténtalo de nuevo.";
}

/** Lo que se le recuerda al aprobador cuando el permiso queda sin pagar. */
const AVISO_DESCUENTO =
  "Como quedó NO remunerado, se descuenta en la nómina del período: ese día y el domingo de esa semana. Las liquidaciones en borrador se recalculan solas; las cerradas no se tocan.";

/* ------------------------------------------------------------------ */
/* Aprobar                                                             */
/* ------------------------------------------------------------------ */

/**
 * APRUEBA el permiso y decide si se paga. `remunerado` llega del formulario
 * (marcado por defecto con lo que pidió el colaborador) y es la palabra final.
 */
export async function aprobarPermiso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la solicitud.");
  const remunerado = marcado(formData, "remunerado");

  const { data, error } = await session.supabase
    .from("permisos")
    .update({
      estado: "aprobado",
      remunerado,
      nota_revision: textOrNull(formData, "nota", LIMITES_PERMISO.nota),
      revisado_por: session.profile.id,
      revisado_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, fecha_inicio");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail("Esa solicitud ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok(
    remunerado
      ? "Permiso aprobado y REMUNERADO: no se descuenta nada de la nómina."
      : `Permiso aprobado y NO remunerado. ${AVISO_DESCUENTO}`,
  );
}

/* ------------------------------------------------------------------ */
/* Rechazar                                                            */
/* ------------------------------------------------------------------ */

/**
 * RECHAZA el permiso con una nota obligatoria. **Rechazar no es eliminar**: la
 * solicitud se queda con la nota y el colaborador la lee en su Mi Cuenta.
 */
export async function rechazarPermiso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la solicitud.");

  const nota = text(formData, "nota").slice(0, LIMITES_PERMISO.nota);
  if (nota === "")
    return fail(
      "Escribe por qué no se concede el permiso: ese texto es lo que va a leer el colaborador para corregir o volver a pedirlo.",
    );

  const { data, error } = await session.supabase
    .from("permisos")
    .update({
      estado: "rechazado",
      remunerado: null,
      nota_revision: nota,
      revisado_por: session.profile.id,
      revisado_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail("Esa solicitud ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok(
    "Permiso rechazado. La solicitud sigue en el sistema con tu nota: el colaborador la verá en su Mi Cuenta. No se descuenta nada en la nómina.",
  );
}

/* ------------------------------------------------------------------ */
/* Devolver a pendiente                                                */
/* ------------------------------------------------------------------ */

/**
 * Devuelve el permiso a PENDIENTE y borra la decisión (quién revisó, la nota y
 * si era remunerado). Es la forma de corregir una aprobación equivocada: si
 * estaba aprobado y no remunerado, deja de descontar en las liquidaciones en
 * borrador. No es eliminar.
 */
export async function reabrirPermiso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la solicitud.");

  const { data, error } = await session.supabase
    .from("permisos")
    .update({
      estado: "pendiente",
      remunerado: null,
      nota_revision: null,
      revisado_por: null,
      revisado_at: null,
    })
    .eq("id", id)
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail("Esa solicitud ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok(
    "La solicitud volvió a pendiente: se borró la decisión anterior y, si descontaba, deja de hacerlo en las liquidaciones en borrador. El colaborador puede volver a editarla.",
  );
}

/* ------------------------------------------------------------------ */
/* Registrar una falta directamente                                    */
/* ------------------------------------------------------------------ */

/** Tope de días de una falta registrada de una sola vez. */
const MAX_DIAS_FALTA = 180;

/**
 * REGISTRA UNA FALTA de cualquier persona (`origen = registro_admin`): para
 * dejar constancia de lo que no se pidió por el sistema. Nace **aprobada** y
 * **no remunerada** por defecto, así que descuenta desde ya; si esa falta sí se
 * va a pagar, se marca «remunerado» al crearla.
 */
export async function registrarFalta(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const employeeId = text(formData, "employee_id");
  if (!employeeId) return fail("Elige primero a la persona.");

  const perfil = (await listProfiles()).find((p) => p.id === employeeId);
  if (!perfil) return fail("Esa persona ya no está en el equipo. Recarga la página.");

  const tipo: PermisoTipo = text(formData, "tipo") === "horas" ? "horas" : "dia";
  const inicio = text(formData, "fecha_inicio");
  if (!esFechaValida(inicio)) return fail("Elige el día de la falta.");

  const finBruto = text(formData, "fecha_fin");
  const fin = tipo === "horas" ? inicio : esFechaValida(finBruto) ? finBruto : inicio;
  if (fin < inicio)
    return fail("El último día no puede ser anterior al primero. Revisa las fechas.");
  if (diasEntre(inicio, fin) > MAX_DIAS_FALTA)
    return fail("Una falta de más de seis meses no se registra de una sola vez.");

  let horaInicio: string | null = null;
  let horaFin: string | null = null;
  if (tipo === "horas") {
    horaInicio = text(formData, "hora_inicio");
    horaFin = text(formData, "hora_fin");
    if (minutosDeHora(horaInicio) === null || minutosDeHora(horaFin) === null)
      return fail("Indica desde qué hora y hasta qué hora faltó.");
    if (horasDelTramo(horaInicio, horaFin) <= 0)
      return fail(
        "La hora de fin tiene que ser posterior a la de inicio. Si faltó el día entero, elige «Día completo».",
      );
  }

  const motivo = text(formData, "motivo").slice(0, LIMITES_PERMISO.motivo);
  if (motivo === "") return fail("Escribe el motivo de la falta.");

  const remunerado = marcado(formData, "remunerado");
  const datos = {
    employee_id: employeeId,
    tipo,
    fecha_inicio: inicio,
    fecha_fin: fin,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    motivo,
    reemplazo: textOrNull(formData, "reemplazo", LIMITES_PERMISO.reemplazo),
    observaciones: textOrNull(formData, "observaciones", LIMITES_PERMISO.observaciones),
    remunerado_solicitado: false,
    remunerado,
    estado: "aprobado",
    origen: "registro_admin",
    nota_revision: textOrNull(formData, "nota", LIMITES_PERMISO.nota),
    revisado_por: session.profile.id,
    revisado_at: new Date().toISOString(),
    creado_por: session.profile.id,
  };

  const { data, error } = await session.supabase
    .from("permisos")
    .insert(datos)
    .select("id")
    .maybeSingle();

  if (error) return fail(mensajeDeError(error));
  if (!data) return fail("No se pudo registrar la falta. Inténtalo de nuevo.");

  // Soporte opcional: el papel que llegó después.
  let aviso = "";
  const soporte = archivo(formData, "soporte");
  if (soporte) {
    const subida = await subirSoporte(soporte, employeeId, String(data.id));
    if (!subida.ok) {
      aviso = ` ${subida.error}`;
    } else {
      const { error: errorSoporte } = await session.supabase
        .from("permisos")
        .update({ soporte_path: subida.path, soporte_nombre: subida.nombre })
        .eq("id", data.id);
      if (errorSoporte) {
        await borrarSoporte(subida.path);
        aviso = " No se pudo asociar el soporte a la falta.";
      } else {
        aviso = " El soporte quedó adjunto.";
      }
    }
  }

  revalidar();
  const cuando = cuandoEs({
    tipo,
    fecha_inicio: inicio,
    fecha_fin: fin,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
  });
  return ok(
    `Falta registrada para ${perfil.full_name} (${cuando}), ya aprobada y ${
      remunerado ? "REMUNERADA: no descuenta nada." : `NO remunerada. ${AVISO_DESCUENTO}`
    }${aviso}`,
  );
}

/* ------------------------------------------------------------------ */
/* Eliminar                                                            */
/* ------------------------------------------------------------------ */

/**
 * ELIMINA el permiso para siempre, con su soporte.
 *
 * **Rechazar ≠ eliminar**: lo primero deja constancia con una nota que el
 * colaborador lee; esto hace desaparecer el registro. Es para limpiar pruebas
 * o cosas creadas por error, y la interfaz lo confirma dos veces.
 */
export async function eliminarPermiso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la solicitud.");

  const { data, error } = await session.supabase
    .from("permisos")
    .delete()
    .eq("id", id)
    .select("id, soporte_path");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail(
      "No se pudo eliminar: ese permiso ya no existe o tu cuenta no tiene permiso. Recarga la página.",
    );

  await borrarSoporte(
    typeof data[0].soporte_path === "string" ? data[0].soporte_path : null,
  );

  revalidar();
  return ok(
    "Permiso eliminado definitivamente, con su soporte. Si lo que querías era dejar constancia de que no se concedía, la opción era «Rechazar».",
  );
}
