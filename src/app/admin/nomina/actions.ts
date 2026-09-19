"use server";

/**
 * SERVER ACTIONS — Nómina (/admin/nomina)
 * =======================================
 * Configurar el salario y las tarifas de un empleado, crear las liquidaciones
 * de un período, editar sus conceptos manuales, cerrarlas, marcarlas pagadas,
 * reabrirlas y eliminarlas.
 *
 * QUIÉN PUEDE QUÉ
 * ---------------
 * **Todo esto es solo para MANAGERS** (admin y coordinador: los mismos que
 * aprueban jornadas). Se comprueba aquí, en el servidor, además de las
 * políticas RLS de la migración 0011. El empleado no escribe nunca su nómina:
 * solo puede LEER sus liquidaciones ya cerradas o pagadas.
 *
 * CERRAR ≠ PAGAR ≠ ELIMINAR
 * -------------------------
 *  · **Cerrar** congela el cálculo (snapshot). Lo que se cambie después —un
 *    horario, una tarifa, una jornada— ya no altera esa nómina.
 *  · **Marcar pagada** solo añade la fecha en que se giró; la cifra ya estaba
 *    congelada.
 *  · **Reabrir** vuelve a borrador y BORRA el cálculo congelado: es el
 *    mecanismo para recalcular, igual que devolver una jornada a pendiente.
 *  · **Eliminar** borra la liquidación entera. Es lo único irreversible.
 *
 * LEER, MEZCLAR, ESCRIBIR
 * -----------------------
 * Los conceptos manuales viven en un solo jsonb (`conceptos`) y varias pantallas
 * escriben sobre la misma liquidación, así que cada guardado LEE lo que hay y
 * mezcla antes de escribir: un `update` a pelo borraría lo que puso otro.
 *
 * Los mensajes están escritos para personas no técnicas: dicen qué pasó y qué
 * hacer, sin jerga.
 */

import { revalidatePath } from "next/cache";
import { getManagerOrNull } from "@/lib/supabase/auth";
import {
  getLiquidacion,
  getNominaConfig,
  horasDelPeriodo,
  listProfiles,
  nominaConfigAColumnas,
} from "@/lib/admin";
import {
  CONCEPTOS_MANUALES,
  calcularLiquidacion,
  construirSnapshot,
  etiquetaPeriodo,
  manualesAJson,
  manualesVacios,
  normalizarManuales,
  pesos,
  rangoPeriodo,
  type ConceptoManual,
  type ConceptosManuales,
  type TipoPeriodo,
} from "@/lib/nomina";
import type { ActionState } from "@/lib/admin-types";

const SIN_PERMISO: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para administrar la nómina. Solo un administrador o un coordinador puede hacerlo.",
};

const ok = (message: string): ActionState => ({ status: "success", message });
const fail = (message: string): ActionState => ({ status: "error", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Convierte a número lo que venga escrito en un campo de dinero.
 *
 * Tiene que aguantar las dos formas que llegan de verdad:
 *   · la que escribe una persona con las reglas colombianas — «1.750.095»,
 *     «$ 1.750.095», «9.115,08» —, donde el punto separa los miles;
 *   · la que manda un `<input type="number">` del navegador, que SIEMPRE usa el
 *     punto como separador DECIMAL: «9115.08».
 *
 * Borrar todos los puntos a ciegas convertía «9115.08» en 911.508 —cien veces
 * la tarifa— y eso ya pasó: se detectó al probar el formulario de
 * configuración de punta a punta. La regla es:
 *   · si hay coma, la coma es el decimal y los puntos son miles;
 *   · si solo hay puntos, son miles, SALVO que haya uno solo y deje uno o dos
 *     dígitos al final («9115.08» → 9115,08; «1.750» → 1750).
 */
function aNumero(bruto: string): number | null {
  let valor = bruto.replace(/[\s$]/g, "");
  if (valor === "") return null;

  if (valor.includes(",")) {
    valor = valor.replace(/\./g, "").replace(",", ".");
  } else {
    const puntos = (valor.match(/\./g) ?? []).length;
    if (puntos > 1) valor = valor.replace(/\./g, "");
    else if (puntos === 1 && !/\.\d{1,2}$/.test(valor))
      valor = valor.replace(".", "");
  }

  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Un importe en pesos ENTEROS (sueldos, bonos, descuentos). Nunca negativo. */
function importe(formData: FormData, key: string): number {
  const n = aNumero(text(formData, key));
  return n !== null && n > 0 ? pesos(n) : 0;
}

/** Un importe con DECIMALES (las tarifas por hora son `numeric(14,2)`). */
function importeDecimal(formData: FormData, key: string): number {
  const n = aNumero(text(formData, key));
  return n !== null && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function entero(formData: FormData, key: string, porDefecto = 0): number {
  const n = Number(text(formData, key));
  return Number.isFinite(n) ? Math.round(n) : porDefecto;
}

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** La nómina se ve en el panel y los volantes en el portal del empleado. */
function revalidar() {
  revalidatePath("/admin/nomina");
  revalidatePath("/admin");
  revalidatePath("/mi-cuenta");
}

/** Traduce el error de PostgREST cuando falta la migración 0011. */
function mensajeDeError(error: { code?: string | null; message?: string | null }) {
  const mensaje = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/nomina_/i.test(mensaje) &&
      /(does not exist|no existe|schema cache|find the table)/i.test(mensaje))
  ) {
    return "Todavía no están creadas las tablas de nómina en la base de datos. Aplica la migración supabase/migrations/0011_nomina.sql desde el SQL Editor de Supabase y vuelve a intentarlo.";
  }
  return mensaje || "No se pudo completar la operación. Inténtalo de nuevo.";
}

/** Lee el período (tipo, año, mes, quincena) de un formulario. */
function leerPeriodo(formData: FormData): {
  tipo: TipoPeriodo;
  anio: number;
  mes: number;
  quincena: 1 | 2 | null;
} | null {
  const tipo: TipoPeriodo = text(formData, "tipo") === "mes" ? "mes" : "quincena";
  const anio = entero(formData, "anio");
  const mes = entero(formData, "mes");
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2200) return null;
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) return null;

  if (tipo === "mes") return { tipo, anio, mes, quincena: null };
  const q = entero(formData, "quincena", 1);
  if (q !== 1 && q !== 2) return null;
  return { tipo, anio, mes, quincena: q };
}

/* ================================================================== */
/* Configuración por empleado y mes                                    */
/* ================================================================== */

/**
 * Guarda el salario, el auxilio, las siete tarifas y los porcentajes de un
 * empleado en un mes.
 *
 * Se hace con `upsert` sobre la clave (empleado, año, mes): la pantalla ya crea
 * la fila al entrar, pero si dos managers guardan a la vez esto no falla.
 */
export async function saveNominaConfig(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const employeeId = text(formData, "employee_id");
  if (!employeeId) return fail("Elige primero a la persona.");

  const anio = entero(formData, "anio");
  const mes = entero(formData, "mes");
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2200)
    return fail("El año no es válido.");
  if (!Number.isInteger(mes) || mes < 1 || mes > 12)
    return fail("El mes no es válido.");

  const salario = importe(formData, "salario_basico");
  if (salario <= 0)
    return fail(
      "Escribe el salario básico mensual: de él salen el sueldo del período y los valores sugeridos de cada tipo de hora.",
    );

  const pctSalud = importeDecimal(formData, "pct_salud");
  const pctPension = importeDecimal(formData, "pct_pension");
  if (pctSalud > 100 || pctPension > 100)
    return fail("Los porcentajes de salud y pensión no pueden pasar de 100.");

  const datos = {
    salario_basico: salario,
    aux_transporte: importe(formData, "aux_transporte"),
    tarifas: {
      horaBase: importeDecimal(formData, "valor_hora_base"),
      rotacionNocturna: importeDecimal(formData, "valor_rotacion_nocturna"),
      extraDiurna: importeDecimal(formData, "valor_extra_diurna"),
      extraNocturna: importeDecimal(formData, "valor_extra_nocturna"),
      festivo: importeDecimal(formData, "valor_festivo"),
      extraFestivoDiurna: importeDecimal(formData, "valor_extra_festivo_diurna"),
      extraFestivoNocturna: importeDecimal(formData, "valor_extra_festivo_nocturna"),
    },
    pct_salud: pctSalud,
    pct_pension: pctPension,
  };

  const { error } = await session.supabase
    .from("nomina_config_mensual")
    .upsert(
      { employee_id: employeeId, anio, mes, ...nominaConfigAColumnas(datos) },
      { onConflict: "employee_id,anio,mes" },
    );

  if (error) return fail(mensajeDeError(error));

  revalidar();
  return ok(
    "Configuración guardada. Las liquidaciones de ese mes que sigan en borrador se recalculan solas; las ya cerradas no se tocan.",
  );
}

/* ================================================================== */
/* Crear liquidaciones                                                 */
/* ================================================================== */

/** Crea el borrador de un empleado en un período, si no existía. */
export async function crearLiquidacion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const periodo = leerPeriodo(formData);
  if (!periodo) return fail("El período seleccionado no es válido.");

  const employeeId = text(formData, "employee_id");
  if (!employeeId) return fail("Falta la persona a liquidar.");

  const config = await getNominaConfig(employeeId, periodo.anio, periodo.mes);
  if (!config || config.salario_basico <= 0) {
    return fail(
      "Esa persona todavía no tiene salario configurado para ese mes. Ve a la pestaña «Configuración», escribe su salario y vuelve.",
    );
  }

  const rango = rangoPeriodo(periodo.tipo, periodo.anio, periodo.mes, periodo.quincena);

  const { error } = await session.supabase.from("nomina_liquidaciones").insert({
    employee_id: employeeId,
    tipo: periodo.tipo,
    anio: periodo.anio,
    mes: periodo.mes,
    quincena: periodo.quincena,
    fecha_inicio: rango.fechaInicio,
    fecha_fin: rango.fechaFin,
    dias_liquidados: rango.diasSugeridos,
    conceptos: manualesAJson(manualesVacios()),
    estado: "borrador",
    creado_por: session.profile.id,
  });

  if (error) {
    if (error.code === "23505")
      return fail("Esa persona ya tiene una liquidación en este período.");
    return fail(mensajeDeError(error));
  }

  revalidar();
  return ok(
    `Liquidación creada en borrador. Revisa el desglose antes de cerrarla: mientras siga en borrador se actualiza sola con las jornadas que apruebes.`,
  );
}

/**
 * Crea de golpe los borradores que falten en el período, uno por cada cuenta
 * activa **con salario configurado** en ese mes. Las que no lo tengan se
 * informan por nombre en vez de fallar en silencio.
 */
export async function liquidarTodos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const periodo = leerPeriodo(formData);
  if (!periodo) return fail("El período seleccionado no es válido.");

  const rango = rangoPeriodo(periodo.tipo, periodo.anio, periodo.mes, periodo.quincena);
  const perfiles = (await listProfiles()).filter((p) => p.active);

  const { data: existentes } = await session.supabase
    .from("nomina_liquidaciones")
    .select("employee_id")
    .eq("anio", periodo.anio)
    .eq("mes", periodo.mes)
    .eq("tipo", periodo.tipo);

  const yaTienen = new Set(
    (existentes ?? [])
      .filter(() => true)
      .map((row) => String(row.employee_id)),
  );

  const nuevas: Record<string, unknown>[] = [];
  const sinConfig: string[] = [];

  for (const perfil of perfiles) {
    if (yaTienen.has(perfil.id)) continue;
    const config = await getNominaConfig(perfil.id, periodo.anio, periodo.mes);
    if (!config || config.salario_basico <= 0) {
      sinConfig.push(perfil.full_name);
      continue;
    }
    nuevas.push({
      employee_id: perfil.id,
      tipo: periodo.tipo,
      anio: periodo.anio,
      mes: periodo.mes,
      quincena: periodo.quincena,
      fecha_inicio: rango.fechaInicio,
      fecha_fin: rango.fechaFin,
      dias_liquidados: rango.diasSugeridos,
      conceptos: manualesAJson(manualesVacios()),
      estado: "borrador",
      creado_por: session.profile.id,
    });
  }

  if (nuevas.length > 0) {
    const { error } = await session.supabase
      .from("nomina_liquidaciones")
      .insert(nuevas);
    if (error) return fail(mensajeDeError(error));
  }

  revalidar();

  const avisoSinConfig =
    sinConfig.length > 0
      ? ` Quedaron por fuera ${sinConfig.length === 1 ? "1 persona" : `${sinConfig.length} personas`} sin salario configurado en este mes (${sinConfig.join(", ")}): configúralas en la pestaña «Configuración».`
      : "";

  if (nuevas.length === 0) {
    return sinConfig.length > 0
      ? fail(`No se creó ninguna liquidación.${avisoSinConfig}`)
      : ok("Todas las personas del equipo ya tenían su liquidación en este período.");
  }

  return ok(
    `Se crearon ${nuevas.length} ${nuevas.length === 1 ? "liquidación" : "liquidaciones"} en borrador para ${etiquetaPeriodo(periodo.tipo, periodo.anio, periodo.mes, periodo.quincena).toLowerCase()}.${avisoSinConfig}`,
  );
}

/* ================================================================== */
/* Editar una liquidación en borrador                                  */
/* ================================================================== */

/** Lee los conceptos manuales de un formulario, mezclándolos con los guardados. */
function leerManuales(
  formData: FormData,
  guardados: ConceptosManuales,
): ConceptosManuales {
  const salida: ConceptosManuales = {
    valores: { ...guardados.valores },
    notas: { ...guardados.notas },
  };

  for (const concepto of CONCEPTOS_MANUALES) {
    const clave: ConceptoManual = concepto.clave;
    // Solo se pisa lo que el formulario mandó: si un campo no viaja, se
    // conserva lo que había.
    if (formData.has(clave)) salida.valores[clave] = importe(formData, clave);

    const claveNota = `nota_${clave}`;
    if (formData.has(claveNota)) {
      const nota = text(formData, claveNota).slice(0, 200);
      if (nota === "") delete salida.notas[clave];
      else salida.notas[clave] = nota;
    }
  }

  return salida;
}

/**
 * Guarda los días liquidados, los conceptos manuales y la nota de una
 * liquidación. **Solo en borrador**: una liquidación cerrada está congelada.
 */
export async function guardarConceptos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la liquidación.");

  const actual = await getLiquidacion(id);
  if (!actual)
    return fail("Esa liquidación ya no existe. Recarga la página, por favor.");
  if (actual.estado !== "borrador")
    return fail(
      "Esta liquidación está cerrada, así que ya no se puede editar. Si hay que corregirla, primero reábrela (eso borra el cálculo congelado).",
    );

  const dias = Number(text(formData, "dias_liquidados"));
  if (!Number.isFinite(dias) || dias < 0 || dias > 31)
    return fail("Los días liquidados deben ser un número entre 0 y 31.");

  const manuales = leerManuales(formData, normalizarManuales(actual.conceptos));

  const { data, error } = await session.supabase
    .from("nomina_liquidaciones")
    .update({
      dias_liquidados: Math.round(dias * 100) / 100,
      conceptos: manualesAJson(manuales),
      notas: text(formData, "notas") || null,
    })
    .eq("id", id)
    .eq("estado", "borrador")
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail(
      "No se pudo guardar: la liquidación cambió de estado mientras editabas. Recarga la página.",
    );

  revalidar();
  return ok("Cambios guardados. La liquidación sigue en borrador.");
}

/* ================================================================== */
/* Cerrar, pagar, reabrir y eliminar                                   */
/* ================================================================== */

/**
 * CIERRA la liquidación: calcula el período con la configuración y las jornadas
 * APROBADAS de ese momento y guarda el resultado completo en `snapshot`.
 *
 * A partir de aquí la cifra no se mueve: es la misma regla del desglose
 * congelado de las jornadas (migración 0004). El volante en PDF se imprime
 * desde ese snapshot.
 */
export async function cerrarLiquidacion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la liquidación.");

  const liquidacion = await getLiquidacion(id);
  if (!liquidacion)
    return fail("Esa liquidación ya no existe. Recarga la página, por favor.");
  if (liquidacion.estado !== "borrador")
    return fail("Esta liquidación ya está cerrada.");

  const config = await getNominaConfig(
    liquidacion.employee_id,
    liquidacion.anio,
    liquidacion.mes,
  );
  if (!config || config.salario_basico <= 0)
    return fail(
      "No se puede cerrar: esa persona no tiene salario configurado en el mes. Configúralo en la pestaña «Configuración».",
    );

  const horas = await horasDelPeriodo(
    liquidacion.employee_id,
    liquidacion.fecha_inicio,
    liquidacion.fecha_fin,
  );

  const calculo = calcularLiquidacion({
    config: {
      salarioBasico: config.salario_basico,
      auxTransporte: config.aux_transporte,
      tarifas: config.tarifas,
      pctSalud: config.pct_salud,
      pctPension: config.pct_pension,
    },
    minutos: horas.minutos,
    dias: liquidacion.dias_liquidados,
    manuales: normalizarManuales(liquidacion.conceptos),
  });

  const snapshot = construirSnapshot(calculo, {
    jornadas: horas.jornadas,
    fechaInicio: liquidacion.fecha_inicio,
    fechaFin: liquidacion.fecha_fin,
  });

  const { data, error } = await session.supabase
    .from("nomina_liquidaciones")
    .update({
      estado: "cerrada",
      snapshot,
      calculado_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "borrador")
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail(
      "No se pudo cerrar: la liquidación cambió de estado. Recarga la página.",
    );

  revalidar();

  const aviso =
    horas.pendientes > 0
      ? ` Ojo: quedaron ${horas.pendientes} ${horas.pendientes === 1 ? "jornada pendiente" : "jornadas pendientes"} de aprobación en el período y NO se pagaron. Si hay que incluirlas, apruébalas y reabre la liquidación.`
      : "";

  return ok(
    `Liquidación cerrada: el cálculo quedó congelado y ya puedes descargar el volante.${aviso}`,
  );
}

/** Marca la liquidación como pagada y guarda la fecha en que se giró. */
export async function marcarPagada(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la liquidación.");

  const fechaPago = text(formData, "fecha_pago");
  if (!ES_FECHA.test(fechaPago))
    return fail("Indica la fecha en que se pagó.");

  const { data, error } = await session.supabase
    .from("nomina_liquidaciones")
    .update({ estado: "pagada", fecha_pago: fechaPago })
    .eq("id", id)
    .in("estado", ["cerrada", "pagada"])
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail(
      "No se pudo marcar como pagada: primero hay que cerrar la liquidación.",
    );

  revalidar();
  return ok("Liquidación marcada como pagada. La fecha aparece en el volante.");
}

/**
 * Devuelve la liquidación a borrador y BORRA el cálculo congelado.
 *
 * Es el único mecanismo para recalcular, igual que devolver una jornada a
 * pendiente. La interfaz lo advierte antes de confirmar.
 */
export async function reabrirLiquidacion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la liquidación.");

  const { data, error } = await session.supabase
    .from("nomina_liquidaciones")
    .update({
      estado: "borrador",
      snapshot: null,
      calculado_at: null,
      fecha_pago: null,
    })
    .eq("id", id)
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail("Esa liquidación ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok(
    "La liquidación volvió a borrador y se borró el cálculo congelado: ahora se recalcula con las jornadas y las tarifas de hoy. Vuelve a cerrarla cuando esté lista.",
  );
}

/**
 * Elimina la liquidación para siempre.
 *
 * REABRIR ≠ ELIMINAR: lo primero permite corregir y volver a cerrar; lo segundo
 * hace desaparecer el registro y su volante. La interfaz lo dice antes de
 * confirmar.
 */
export async function eliminarLiquidacion(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getManagerOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la liquidación.");

  const { data, error } = await session.supabase
    .from("nomina_liquidaciones")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail(
      "No se pudo eliminar: esa liquidación ya no existe o tu cuenta no tiene permiso. Recarga la página.",
    );

  revalidar();
  return ok("Liquidación eliminada definitivamente.");
}
