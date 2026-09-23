"use server";

/**
 * SERVER ACTIONS — Permisos del colaborador (/mi-cuenta?seccion=permisos)
 * =======================================================================
 * Pedir un permiso, corregirlo mientras siga pendiente y anularlo. Es la
 * versión digital del formato en papel «SOLICITUD DE PERMISO» (XP C2 C91):
 * el nombre, la cédula y el cargo salen del perfil, y la fecha de
 * diligenciamiento es la de hoy en Colombia.
 *
 * SEGURIDAD
 * ---------
 *  · Todas exigen sesión activa (`getActiveSession`) y fijan
 *    `employee_id = auth.uid()`: nadie pide un permiso a nombre de otro, ni
 *    manipulando el formulario.
 *  · Solo se puede editar o anular lo PROPIO y en estado `pendiente`. Lo
 *    garantizan también las políticas RLS de la migración 0014, que además
 *    impiden que una solicitud nazca aprobada o se apruebe a sí misma.
 *  · El SOPORTE se sube desde aquí, en el servidor, con la clave de servicio,
 *    a un bucket PRIVADO (`src/lib/soportes.ts`). Nunca desde el navegador y
 *    nunca a `site-images`, que es público.
 *
 * Los mensajes están escritos para personas no técnicas: dicen qué pasó y qué
 * hacer, sin jerga.
 */

import { revalidatePath } from "next/cache";
import { getActiveSession } from "@/lib/supabase/auth";
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

function textOrNull(formData: FormData, key: string, max: number): string | null {
  const value = text(formData, key).slice(0, max);
  return value === "" ? null : value;
}

function marcado(formData: FormData, key: string): boolean {
  return formData.getAll(key).includes("true");
}

/** El archivo adjunto, si de verdad viene uno. */
function archivo(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!(value instanceof File)) return null;
  return value.size > 0 && value.name ? value : null;
}

/** Los permisos se ven en el portal, en la bandeja y en la nómina. */
function revalidar() {
  revalidatePath("/mi-cuenta");
  revalidatePath("/admin/jornadas");
  revalidatePath("/admin/nomina");
}

/** Traduce el error de PostgREST cuando falta la migración 0014. */
function mensajeDeError(error: { code?: string | null; message?: string | null }) {
  const mensaje = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/permisos/i.test(mensaje) &&
      /(does not exist|no existe|schema cache|find the table)/i.test(mensaje))
  ) {
    return "Todavía no está creada la tabla de permisos en la base de datos. Avisa al administrador: falta aplicar la migración supabase/migrations/0014_permisos.sql.";
  }
  return mensaje || "No se pudo completar la operación. Inténtalo de nuevo.";
}

/** Tope de días de un permiso de una sola solicitud (medio año ya es otra cosa). */
const MAX_DIAS_SOLICITUD = 180;

/**
 * Lo que el formulario dice del permiso, ya validado. Devuelve el motivo del
 * rechazo escrito en llano, o los campos listos para escribir.
 */
function leerPermiso(formData: FormData):
  | { error: string }
  | {
      tipo: PermisoTipo;
      fecha_inicio: string;
      fecha_fin: string;
      hora_inicio: string | null;
      hora_fin: string | null;
      motivo: string;
      reemplazo: string | null;
      observaciones: string | null;
    } {
  const tipo: PermisoTipo = text(formData, "tipo") === "horas" ? "horas" : "dia";
  const inicio = text(formData, "fecha_inicio");
  if (!esFechaValida(inicio))
    return { error: "Elige el día del permiso." };

  const finBruto = text(formData, "fecha_fin");
  const fin = tipo === "horas" ? inicio : esFechaValida(finBruto) ? finBruto : inicio;
  if (fin < inicio)
    return {
      error:
        "El último día del permiso no puede ser anterior al primero. Revisa las fechas.",
    };
  if (diasEntre(inicio, fin) > MAX_DIAS_SOLICITUD)
    return {
      error:
        "Un permiso de más de seis meses no se pide por aquí. Habla con tu coordinador.",
    };

  let horaInicio: string | null = null;
  let horaFin: string | null = null;
  if (tipo === "horas") {
    horaInicio = text(formData, "hora_inicio");
    horaFin = text(formData, "hora_fin");
    if (minutosDeHora(horaInicio) === null)
      return { error: "Indica desde qué hora necesitas el permiso." };
    if (minutosDeHora(horaFin) === null)
      return { error: "Indica hasta qué hora necesitas el permiso." };
    if (horasDelTramo(horaInicio, horaFin) <= 0)
      return {
        error:
          "La hora de fin tiene que ser posterior a la de inicio. Si necesitas el día entero, elige «Día completo».",
      };
  }

  const motivo = text(formData, "motivo").slice(0, LIMITES_PERMISO.motivo);
  if (motivo === "")
    return { error: "Cuéntanos el motivo del permiso: es lo que va a leer quien lo aprueba." };

  return {
    tipo,
    fecha_inicio: inicio,
    fecha_fin: fin,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    motivo,
    reemplazo: textOrNull(formData, "reemplazo", LIMITES_PERMISO.reemplazo),
    observaciones: textOrNull(formData, "observaciones", LIMITES_PERMISO.observaciones),
  };
}

/* ------------------------------------------------------------------ */
/* Pedir o corregir un permiso                                         */
/* ------------------------------------------------------------------ */

/**
 * Crea la solicitud o corrige una PROPIA que siga pendiente.
 *
 * El soporte es opcional y se sube DESPUÉS de tener el id del permiso, porque
 * la ruta del bucket lo incluye (`permisos/<empleado>/<permiso>/<archivo>`).
 * Si la subida falla, el permiso queda guardado igual y el mensaje lo dice: es
 * mejor una solicitud sin soporte que perder lo que la persona escribió.
 */
export async function guardarPermiso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getActiveSession();
  if (!session) return SIN_SESION;

  const datos = leerPermiso(formData);
  if ("error" in datos) return fail(datos.error);

  const id = text(formData, "id");
  const pideRemunerado = marcado(formData, "remunerado_solicitado");
  const soporte = archivo(formData, "soporte");
  const quitarSoporte = marcado(formData, "quitar_soporte");

  /* --- Editar una solicitud propia que siga pendiente --- */
  if (id) {
    const { data: actual, error: errorLectura } = await session.supabase
      .from("permisos")
      .select("id, employee_id, estado, soporte_path")
      .eq("id", id)
      .maybeSingle();
    if (errorLectura) return fail(mensajeDeError(errorLectura));
    if (!actual || String(actual.employee_id) !== session.profile.id)
      return fail("Esa solicitud ya no existe. Recarga la página, por favor.");
    if (String(actual.estado) !== "pendiente")
      return fail(
        "Esta solicitud ya fue revisada, así que no se puede editar. Si hay que corregirla, habla con tu coordinador.",
      );

    const { data, error } = await session.supabase
      .from("permisos")
      .update({ ...datos, remunerado_solicitado: pideRemunerado })
      .eq("id", id)
      .eq("employee_id", session.profile.id)
      .eq("estado", "pendiente")
      .select("id");
    if (error) return fail(mensajeDeError(error));
    if (!data || data.length === 0)
      return fail(
        "No se pudo guardar: tu coordinador revisó la solicitud mientras la editabas. Recarga la página.",
      );

    const pathAnterior =
      typeof actual.soporte_path === "string" ? actual.soporte_path : null;
    const aviso = await cambiarSoporte({
      supabase: session.supabase,
      permisoId: id,
      employeeId: session.profile.id,
      pathAnterior,
      soporte,
      quitarSoporte,
    });

    revalidar();
    return ok(
      `Solicitud actualizada (${cuandoEs(datos)}). Sigue pendiente de revisión.${aviso}`,
    );
  }

  /* --- Crear la solicitud --- */
  const { data, error } = await session.supabase
    .from("permisos")
    .insert({
      ...datos,
      employee_id: session.profile.id,
      remunerado_solicitado: pideRemunerado,
      estado: "pendiente",
      origen: "solicitud",
      creado_por: session.profile.id,
    })
    .select("id")
    .maybeSingle();

  if (error) return fail(mensajeDeError(error));
  if (!data) return fail("No se pudo guardar la solicitud. Inténtalo de nuevo.");

  const aviso = await cambiarSoporte({
    supabase: session.supabase,
    permisoId: String(data.id),
    employeeId: session.profile.id,
    pathAnterior: null,
    soporte,
    quitarSoporte: false,
  });

  revalidar();
  return ok(
    `Solicitud enviada (${cuandoEs(datos)}). Tu coordinador la revisará y verás aquí su respuesta.${aviso}`,
  );
}

/**
 * Sube, reemplaza o quita el soporte de un permiso ya guardado. Devuelve un
 * texto que se añade al mensaje de la acción (vacío si no hubo nada que decir).
 */
async function cambiarSoporte({
  supabase,
  permisoId,
  employeeId,
  pathAnterior,
  soporte,
  quitarSoporte,
}: {
  supabase: NonNullable<Awaited<ReturnType<typeof getActiveSession>>>["supabase"];
  permisoId: string;
  employeeId: string;
  pathAnterior: string | null;
  soporte: File | null;
  quitarSoporte: boolean;
}): Promise<string> {
  if (soporte) {
    const subida = await subirSoporte(soporte, employeeId, permisoId);
    if (!subida.ok) return ` ${subida.error}`;
    const { error } = await supabase
      .from("permisos")
      .update({ soporte_path: subida.path, soporte_nombre: subida.nombre })
      .eq("id", permisoId);
    if (error) {
      await borrarSoporte(subida.path);
      return " No se pudo asociar el soporte a la solicitud; vuelve a adjuntarlo desde «Editar».";
    }
    // El anterior ya no lo apunta nadie.
    if (pathAnterior && pathAnterior !== subida.path) await borrarSoporte(pathAnterior);
    return " El soporte quedó adjunto.";
  }

  if (quitarSoporte && pathAnterior) {
    const { error } = await supabase
      .from("permisos")
      .update({ soporte_path: null, soporte_nombre: null })
      .eq("id", permisoId);
    if (error) return " No se pudo quitar el soporte; inténtalo de nuevo.";
    await borrarSoporte(pathAnterior);
    return " Se quitó el soporte.";
  }

  return "";
}

/* ------------------------------------------------------------------ */
/* Anular una solicitud propia                                         */
/* ------------------------------------------------------------------ */

/**
 * ANULA una solicitud propia que siga PENDIENTE: desaparece, con su soporte.
 * Una vez revisada ya no se puede anular —entonces hay que hablar con el
 * coordinador—, y eso lo garantiza también la política RLS.
 */
export async function anularPermiso(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getActiveSession();
  if (!session) return SIN_SESION;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la solicitud.");

  const { data, error } = await session.supabase
    .from("permisos")
    .delete()
    .eq("id", id)
    .eq("employee_id", session.profile.id)
    .eq("estado", "pendiente")
    .select("id, soporte_path");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail(
      "No se pudo anular: la solicitud ya no existe o tu coordinador la revisó. Recarga la página.",
    );

  await borrarSoporte(
    typeof data[0].soporte_path === "string" ? data[0].soporte_path : null,
  );

  revalidar();
  return ok("Solicitud anulada. Puedes volver a pedir el permiso cuando quieras.");
}
