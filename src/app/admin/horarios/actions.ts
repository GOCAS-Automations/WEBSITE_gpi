"use server";

/**
 * SERVER ACTIONS — Horarios laborales mensuales (/admin/horarios)
 * ==============================================================
 * GPI define su jornada mes a mes. Aquí se guarda el horario de un mes: por
 * cada día de la semana, si es laboral y en qué horario, más las horas de
 * almuerzo (que NO cuentan como trabajo).
 *
 * SEGURIDAD: solo managers (admin | coordinador). La comprobación se repite en
 * cada acción; las políticas RLS de la migración 0003 exigen `is_manager()`
 * también en la base de datos.
 *
 * Los mensajes están escritos para personas no técnicas.
 */

import { revalidatePath } from "next/cache";
import { getManagerOrNull } from "@/lib/supabase/auth";
import {
  DIAS_ORDEN,
  DIA_LABELS,
  etiquetaMes,
  minutosDesdeHora,
  type DiaClave,
  type HorarioDia,
  type HorarioDias,
} from "@/lib/horarios";
import type { ActionState } from "@/lib/admin-types";

const SIN_PERMISO: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para editar los horarios. Solo un administrador o un coordinador puede hacerlo.",
};

const fail = (message: string): ActionState => ({ status: "error", message });
const ok = (message: string): ActionState => ({ status: "success", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * ¿Falta aplicar la migración 0003? Se detecta por el error de PostgREST y se
 * traduce a un mensaje que dice exactamente qué hacer.
 */
function esTablaFaltante(mensaje: string): boolean {
  return /horarios_mensuales/i.test(mensaje) && /(does not exist|no existe|schema cache|find the table)/i.test(mensaje);
}

/* ------------------------------------------------------------------ */
/* Guardar el horario de un mes                                        */
/* ------------------------------------------------------------------ */

export async function saveHorarioMensual(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const anio = Number(text(formData, "anio"));
  const mes = Number(text(formData, "mes"));

  if (!Number.isInteger(anio) || anio < 2000 || anio > 2200)
    return fail("El año del horario no es válido.");
  if (!Number.isInteger(mes) || mes < 1 || mes > 12)
    return fail("El mes del horario no es válido.");

  /* --- Un día a la vez, con mensajes que señalan el día concreto --- */
  const dias = {} as HorarioDias;

  for (const clave of DIAS_ORDEN) {
    const laboral = text(formData, `${clave}_laboral`) === "true";
    if (!laboral) {
      dias[clave] = null;
      continue;
    }

    const inicio = text(formData, `${clave}_inicio`);
    const fin = text(formData, `${clave}_fin`);
    const almuerzoBruto = text(formData, `${clave}_almuerzo`);

    const minInicio = minutosDesdeHora(inicio);
    const minFin = minutosDesdeHora(fin);
    const nombre = DIA_LABELS[clave as DiaClave].toLowerCase();

    if (minInicio === null)
      return fail(`Revisa la hora de entrada del ${nombre}: no es una hora válida.`);
    if (minFin === null)
      return fail(`Revisa la hora de salida del ${nombre}: no es una hora válida.`);
    if (minFin <= minInicio)
      return fail(
        `El ${nombre} la hora de salida debe ser posterior a la de entrada. Si ese día no se trabaja, márcalo como no laboral.`,
      );

    const almuerzo = almuerzoBruto === "" ? 0 : Number(almuerzoBruto);
    if (!Number.isFinite(almuerzo) || almuerzo < 0)
      return fail(`Las horas de almuerzo del ${nombre} no son válidas.`);

    const minAlmuerzo = Math.round(almuerzo * 60);
    if (minAlmuerzo >= minFin - minInicio)
      return fail(
        `El almuerzo del ${nombre} no puede durar tanto como la jornada. Revisa las horas.`,
      );

    const dia: HorarioDia = {
      inicio,
      fin,
      almuerzoHoras: Math.round(almuerzo * 100) / 100,
    };
    dias[clave] = dia;
  }

  const notas = text(formData, "notas");

  const { error } = await session.supabase.from("horarios_mensuales").upsert(
    {
      anio,
      mes,
      dias,
      notas: notas === "" ? null : notas,
    },
    { onConflict: "anio,mes" },
  );

  if (error) {
    if (esTablaFaltante(error.message))
      return fail(
        "Todavía no está creada la tabla de horarios en la base de datos. Aplica la migración supabase/migrations/0003_horarios_mensuales.sql desde el SQL Editor de Supabase y vuelve a intentarlo.",
      );
    return fail(error.message);
  }

  // El horario cambia el cálculo de horas en el portal, en las aprobaciones y
  // en el tablero de métricas.
  revalidatePath("/admin/horarios");
  revalidatePath("/admin/jornadas");
  revalidatePath("/mi-cuenta");

  return ok(
    `Horario de ${etiquetaMes(anio, mes)} guardado. Ya se aplica al cálculo de las horas de ese mes.`,
  );
}
