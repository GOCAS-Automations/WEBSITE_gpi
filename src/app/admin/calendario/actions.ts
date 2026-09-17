"use server";

/**
 * SERVER ACTIONS — Calendario interno (/admin/calendario)
 * =======================================================
 * Programar, editar, cerrar, aplazar y eliminar eventos, y escribir notas.
 *
 * QUIÉN PUEDE QUÉ
 * ---------------
 *  · Crear / editar / cerrar / aplazar / eliminar un evento → solo MANAGERS
 *    (admin y coordinador: los mismos que aprueban jornadas). Se comprueba aquí,
 *    en el servidor, además de las políticas RLS de la migración 0010.
 *  · Escribir una NOTA → cualquier cuenta activa que pueda VER el evento, es
 *    decir un manager o un responsable. La barrera de verdad es la política
 *    `evento_notas_insert_autor`: exige `autor_id = auth.uid()`, así que nadie
 *    firma una nota a nombre de otro ni escribe en un evento que no ve. Por eso
 *    `agregarNotaEvento` también la usa el portal del empleado (`/mi-cuenta`).
 *
 * RESPONSABLES
 * ------------
 * Al guardar se BORRAN y se vuelven a insertar todas las filas de
 * `evento_responsables` del evento. Es lo más simple y no deja estados a
 * medias: la tabla no guarda nada más que la asignación.
 *
 * APLAZAR
 * -------
 * `fecha_original` guarda la fecha del PRIMER aplazamiento y no se vuelve a
 * tocar: si un evento se mueve tres veces, sigue diciendo para cuándo estaba
 * previsto al principio, que es la pregunta que hace la gerencia.
 *
 * Los mensajes están escritos para personas no técnicas: dicen qué pasó y qué
 * hacer, sin jerga.
 */

import { revalidatePath } from "next/cache";
import { getActiveSession, getManagerOrNull } from "@/lib/supabase/auth";
import {
  EVENTO_ESTADOS,
  LIMITES_EVENTO,
  type EventoEstado,
} from "@/lib/calendario";
import type { ActionState } from "@/lib/admin-types";

const SIN_PERMISO: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para administrar el calendario.",
};

const SIN_SESION: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta está desactivada. Vuelve a ingresar, por favor.",
};

const ok = (message: string): ActionState => ({ status: "success", message });
const fail = (message: string): ActionState => ({ status: "error", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

/** Todos los valores no vacíos de un campo repetido, sin duplicados. */
function lista(formData: FormData, key: string): string[] {
  return [
    ...new Set(
      formData
        .getAll(key)
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim())
        .filter((v) => v !== ""),
    ),
  ];
}

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ES_HORA = /^\d{2}:\d{2}$/;

/**
 * El calendario se ve en el panel y en el portal del empleado, y el dashboard
 * cuenta los eventos próximos: cualquier cambio invalida las tres.
 */
function revalidar() {
  revalidatePath("/admin/calendario");
  revalidatePath("/admin");
  revalidatePath("/mi-cuenta");
}

/* ------------------------------------------------------------------ */
/* Crear y editar un evento                                            */
/* ------------------------------------------------------------------ */

export async function saveEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  const titulo = text(formData, "titulo");
  const fecha = text(formData, "fecha");
  const horaInicio = text(formData, "hora_inicio");
  const horaFin = text(formData, "hora_fin");
  const descripcion = textOrNull(formData, "descripcion");

  /* --- Validaciones amables, una a una --- */
  if (titulo === "")
    return fail("Ponle un título al evento: es lo que se lee en el calendario.");
  if (titulo.length > LIMITES_EVENTO.titulo)
    return fail(
      `El título es muy largo (máximo ${LIMITES_EVENTO.titulo} caracteres). Resúmelo y deja el detalle en la descripción.`,
    );
  if (!ES_FECHA.test(fecha)) return fail("Selecciona el día del evento.");
  if (!ES_HORA.test(horaInicio)) return fail("Indica la hora de inicio.");
  if (!ES_HORA.test(horaFin)) return fail("Indica la hora de finalización.");
  if (horaFin <= horaInicio)
    return fail(
      "La hora de finalización debe ser posterior a la de inicio. Si la actividad pasa de la medianoche, prográmala como dos eventos.",
    );
  if (descripcion && descripcion.length > LIMITES_EVENTO.descripcion)
    return fail(
      `La descripción es muy larga (máximo ${LIMITES_EVENTO.descripcion} caracteres).`,
    );

  const perfiles = lista(formData, "responsable_id");
  const externos = lista(formData, "responsable_externo").map((n) =>
    n.slice(0, LIMITES_EVENTO.nombreExterno),
  );

  if (perfiles.length + externos.length > LIMITES_EVENTO.responsables)
    return fail(
      `Son demasiados responsables (máximo ${LIMITES_EVENTO.responsables}). Si es una actividad de toda la empresa, indícalo en la descripción.`,
    );

  const datos = {
    titulo,
    descripcion,
    fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
  };

  let eventoId = id;

  if (id) {
    const { data, error } = await session.supabase
      .from("eventos")
      .update(datos)
      .eq("id", id)
      .select("id");

    if (error) return fail(error.message);
    if (!data || data.length === 0)
      return fail(
        "No se pudo editar: ese evento ya no existe. Recarga la página, por favor.",
      );
  } else {
    const { data, error } = await session.supabase
      .from("eventos")
      .insert({ ...datos, estado: "programado", creado_por: session.profile.id })
      .select("id")
      .maybeSingle();

    if (error) return fail(error.message);
    if (!data) return fail("No se pudo crear el evento. Inténtalo de nuevo.");
    eventoId = String(data.id);
  }

  /* --- Responsables: se reemplazan por completo --- */
  const { error: errorBorrado } = await session.supabase
    .from("evento_responsables")
    .delete()
    .eq("evento_id", eventoId);
  if (errorBorrado) return fail(errorBorrado.message);

  const filas = [
    ...perfiles.map((profileId) => ({
      evento_id: eventoId,
      profile_id: profileId,
      nombre_externo: null,
    })),
    ...externos.map((nombre) => ({
      evento_id: eventoId,
      profile_id: null,
      nombre_externo: nombre,
    })),
  ];

  if (filas.length > 0) {
    const { error } = await session.supabase
      .from("evento_responsables")
      .insert(filas);
    if (error) return fail(error.message);
  }

  revalidar();
  return ok(
    id
      ? "Los cambios del evento quedaron guardados."
      : "Evento programado. Ya aparece en el calendario y en Mi Cuenta de cada responsable.",
  );
}

/* ------------------------------------------------------------------ */
/* Cerrar o reabrir un evento                                          */
/* ------------------------------------------------------------------ */

/**
 * Marca el evento como cumplido, incompleto o lo devuelve a programado.
 *
 * Reabrir NO borra `fecha_original`: que un evento vuelva a estar abierto no
 * cambia el hecho de que en su día se movió de fecha.
 */
export async function cambiarEstadoEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del evento.");

  const estado = text(formData, "estado") as EventoEstado;
  if (!(EVENTO_ESTADOS as readonly string[]).includes(estado))
    return fail("Ese estado no existe.");
  if (estado === "aplazado")
    return fail(
      "Para aplazar un evento usa el botón «Aplazar»: hay que indicar la nueva fecha.",
    );

  const { data, error } = await session.supabase
    .from("eventos")
    .update({ estado })
    .eq("id", id)
    .select("id");

  if (error) return fail(error.message);
  if (!data || data.length === 0)
    return fail("Ese evento ya no existe. Recarga la página, por favor.");

  revalidar();
  const mensajes: Record<string, string> = {
    cumplido: "Evento marcado como cumplido.",
    incompleto:
      "Evento marcado como incompleto. Deja una nota explicando qué faltó: es lo que va a leer quien revise el mes.",
    programado: "El evento volvió a quedar programado.",
  };
  return ok(mensajes[estado] ?? "Estado actualizado.");
}

/* ------------------------------------------------------------------ */
/* Aplazar                                                             */
/* ------------------------------------------------------------------ */

export async function aplazarEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del evento.");

  const nuevaFecha = text(formData, "nueva_fecha");
  if (!ES_FECHA.test(nuevaFecha))
    return fail("Selecciona la nueva fecha del evento.");

  const { data: actual, error: errorLectura } = await session.supabase
    .from("eventos")
    .select("fecha, fecha_original")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) return fail(errorLectura.message);
  if (!actual)
    return fail("Ese evento ya no existe. Recarga la página, por favor.");

  const fechaActual = String(actual.fecha ?? "");
  if (nuevaFecha === fechaActual)
    return fail(
      "La nueva fecha es la misma que tiene el evento. Elige otro día.",
    );

  // La fecha original se escribe UNA sola vez: la primera que se aplaza.
  const fechaOriginal =
    typeof actual.fecha_original === "string" && actual.fecha_original
      ? actual.fecha_original
      : fechaActual;

  const { data, error } = await session.supabase
    .from("eventos")
    .update({
      fecha: nuevaFecha,
      estado: "aplazado",
      fecha_original: fechaOriginal,
    })
    .eq("id", id)
    .select("id");

  if (error) return fail(error.message);
  if (!data || data.length === 0)
    return fail("Ese evento ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok(
    "Evento aplazado. Queda en la fecha nueva y el calendario recuerda para cuándo estaba programado al principio.",
  );
}

/* ------------------------------------------------------------------ */
/* Eliminar                                                            */
/* ------------------------------------------------------------------ */

/**
 * Borra el evento para siempre, con sus responsables y sus notas (la base de
 * datos las arrastra con `on delete cascade`).
 *
 * MARCAR COMO INCOMPLETO ≠ ELIMINAR: lo primero deja constancia de que la
 * actividad no salió, con sus notas; lo segundo hace desaparecer el registro.
 * La interfaz lo dice antes de confirmar.
 */
export async function eliminarEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del evento.");

  const { data, error } = await session.supabase
    .from("eventos")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return fail(error.message);
  if (!data || data.length === 0)
    return fail(
      "No se pudo eliminar: ese evento ya no existe o tu cuenta no tiene permiso. Recarga la página.",
    );

  revalidar();
  return ok("Evento eliminado definitivamente, con sus notas.");
}

/* ------------------------------------------------------------------ */
/* Notas                                                               */
/* ------------------------------------------------------------------ */

/**
 * Añade una nota de seguimiento.
 *
 * La usan las tres pantallas del calendario Y el portal del empleado: aquí solo
 * se exige sesión activa, y es RLS quien decide si esa persona puede escribir
 * en ese evento (manager o responsable). Si no puede, la inserción se rechaza y
 * el mensaje lo explica.
 */
export async function agregarNotaEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getActiveSession();
  if (!session) return SIN_SESION;

  const eventoId = text(formData, "evento_id");
  if (!eventoId) return fail("Elige el evento al que va la nota.");

  const texto = text(formData, "texto");
  if (texto === "") return fail("Escribe la nota antes de guardarla.");
  if (texto.length > LIMITES_EVENTO.nota)
    return fail(
      `La nota es muy larga (máximo ${LIMITES_EVENTO.nota} caracteres). Divídela en dos si hace falta.`,
    );

  const { data, error } = await session.supabase
    .from("evento_notas")
    .insert({
      evento_id: eventoId,
      autor_id: session.profile.id,
      texto,
    })
    .select("id");

  if (error) return fail(error.message);
  if (!data || data.length === 0)
    return fail(
      "No se pudo guardar la nota: ese evento ya no existe o no tienes acceso a él.",
    );

  revalidar();
  return ok("Nota guardada.");
}

/** Borra una nota. Solo managers: es el hilo de seguimiento de la empresa. */
export async function eliminarNotaEvento(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la nota.");

  const { data, error } = await session.supabase
    .from("evento_notas")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return fail(error.message);
  if (!data || data.length === 0)
    return fail("Esa nota ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok("Nota eliminada.");
}
