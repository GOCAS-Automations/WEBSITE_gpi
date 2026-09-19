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
 * **Todo esto es solo para el ADMINISTRADOR.** Hasta el 18 sep 2026 era para
 * managers (admin y coordinador); GPI pidió cerrarlo: el coordinador aprueba
 * jornadas y lleva el calendario, pero NO administra la nómina — ve únicamente
 * **la suya**, como cualquier empleado, en `/mi-cuenta?seccion=nomina`. Se
 * comprueba aquí, en el servidor (`getAdminOrNull`), además de las políticas
 * RLS —`is_admin_activo()` desde la migración 0012—. Ningún empleado escribe
 * nunca su nómina: solo puede LEER sus liquidaciones ya cerradas o pagadas.
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
import { getAdminOrNull } from "@/lib/supabase/auth";
import {
  getLiquidacion,
  getNominaConfigVigente,
  horasDelPeriodo,
  listNominaConfigsEmpleado,
  listProfiles,
  mapaNominaConfigsVigentes,
  nominaConfigAColumnas,
  parametrosLegalesNomina,
} from "@/lib/admin";
import {
  CONCEPTOS_MANUALES,
  calcularLiquidacion,
  construirSnapshot,
  estadoConfigMes,
  etiquetaPeriodo,
  manualesAJson,
  manualesVacios,
  mesAnterior,
  nombreMesNomina,
  normalizarManuales,
  pesos,
  rangoPeriodo,
  tarifasBajoMinimoLegal,
  type ConceptoManual,
  type ConceptosManuales,
  type TipoPeriodo,
} from "@/lib/nomina";
import { formatearDinero, parsearNumero } from "@/lib/dinero";
import type { ActionState } from "@/lib/admin-types";

const SIN_PERMISO: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para administrar la nómina. Solo un ADMINISTRADOR puede hacerlo: el coordinador ve su propia nómina en Mi Cuenta, pero no liquida la de nadie.",
};

const ok = (message: string): ActionState => ({ status: "success", message });
const fail = (message: string): ActionState => ({ status: "error", message });

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Un importe escrito en el formulario, leído con `parsearNumero()` de
 * `src/lib/dinero.ts` —el MISMO módulo que formatea el campo en el navegador—.
 *
 * El campo de dinero del panel manda el valor ya limpio («1300000»,
 * «9115.08»), pero aquí se vuelve a leer con la regla colombiana completa por
 * si llega escrito a mano («1.300.000», «$ 9.115,08»). Ya hubo un bug grave con
 * esto: borrar todos los puntos a ciegas convertía «9115.08» en 911.508, cien
 * veces la tarifa. La regla (y el caso ambiguo de «9.115») está explicada en la
 * cabecera de `dinero.ts` y probada en `scripts/pruebas-nomina.mjs`.
 *
 * Vacío = 0. Un texto que no es un número, o un negativo, NO se convierte en
 * cero en silencio: devuelve `null` y la acción avisa con el nombre del campo.
 */
function leerImporte(
  formData: FormData,
  key: string,
  { decimales }: { decimales: 0 | 2 },
): number | null {
  const bruto = text(formData, key);
  if (bruto === "") return 0;
  const n = parsearNumero(bruto);
  if (n === null || n < 0) return null;
  return decimales === 0 ? pesos(n) : Math.round(n * 100) / 100;
}

const campoInvalido = (etiqueta: string) =>
  fail(
    `El valor de «${etiqueta}» no es un número válido. Escríbelo solo con cifras, con punto para los miles y coma para los decimales (por ejemplo 1.300.000 o 9.115,08).`,
  );

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

/** Las siete tarifas: campo del formulario → clave → etiqueta del aviso. */
const CAMPOS_TARIFA = [
  ["valor_hora_base", "horaBase", "Hora de rotación diurna"],
  ["valor_rotacion_nocturna", "rotacionNocturna", "Rotación nocturna"],
  ["valor_extra_diurna", "extraDiurna", "Hora extra diurna"],
  ["valor_extra_nocturna", "extraNocturna", "Hora extra nocturna"],
  ["valor_festivo", "festivo", "Hora en domingo o festivo"],
  ["valor_extra_festivo_diurna", "extraFestivoDiurna", "Hora extra diurna en festivo"],
  ["valor_extra_festivo_nocturna", "extraFestivoNocturna", "Hora extra nocturna en festivo"],
] as const;

/** «octubre de 2026». */
const mesTexto = (fecha: { anio: number; mes: number }) =>
  `${nombreMesNomina(fecha.mes)} de ${fecha.anio}`;

/**
 * «hasta septiembre de 2026» cuando hay un cambio guardado después (rige hasta
 * el mes anterior a ese cambio) o «en adelante» cuando no lo hay.
 */
const hastaTexto = (siguiente: { anio: number; mes: number } | null) =>
  siguiente
    ? `hasta ${mesTexto(mesAnterior(siguiente.anio, siguiente.mes))}`
    : "en adelante";

/**
 * Guarda el salario, el auxilio, las siete tarifas y los porcentajes de un
 * empleado **desde** un mes (modelo «vigente desde», 18 sep 2026): la fila
 * rige para ese mes y los siguientes, hasta el próximo cambio guardado.
 *
 * Es la ÚNICA manera de crear una fila de configuración: ver un mes en la
 * pantalla ya no crea nada. `upsert` sobre la clave (empleado, año, mes).
 */
export async function saveNominaConfig(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdminOrNull();
  if (!session) return SIN_PERMISO;

  const employeeId = text(formData, "employee_id");
  if (!employeeId) return fail("Elige primero a la persona.");

  const anio = entero(formData, "anio");
  const mes = entero(formData, "mes");
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2200)
    return fail("El año no es válido.");
  if (!Number.isInteger(mes) || mes < 1 || mes > 12)
    return fail("El mes no es válido.");

  const salario = leerImporte(formData, "salario_basico", { decimales: 0 });
  if (salario === null) return campoInvalido("Salario básico mensual");
  if (salario <= 0)
    return fail(
      "Escribe el salario básico mensual: de él salen el sueldo del período y los valores sugeridos de cada tipo de hora.",
    );

  const aux = leerImporte(formData, "aux_transporte", { decimales: 0 });
  if (aux === null) return campoInvalido("Auxilio de transporte mensual");

  const tarifas = {
    horaBase: 0,
    rotacionNocturna: 0,
    extraDiurna: 0,
    extraNocturna: 0,
    festivo: 0,
    extraFestivoDiurna: 0,
    extraFestivoNocturna: 0,
  };
  for (const [campo, clave, etiqueta] of CAMPOS_TARIFA) {
    const valor = leerImporte(formData, campo, { decimales: 2 });
    if (valor === null) return campoInvalido(etiqueta);
    tarifas[clave] = valor;
  }

  // Los porcentajes no llevan miles, pero sí coma decimal («4,5»): el mismo
  // lector los entiende.
  const pctSalud = leerImporte(formData, "pct_salud", { decimales: 2 });
  if (pctSalud === null) return campoInvalido("Salud (%)");
  const pctPension = leerImporte(formData, "pct_pension", { decimales: 2 });
  if (pctPension === null) return campoInvalido("Pensión (%)");
  if (pctSalud > 100 || pctPension > 100)
    return fail("Los porcentajes de salud y pensión no pueden pasar de 100.");

  const datos = {
    salario_basico: salario,
    aux_transporte: aux,
    tarifas,
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

  // Hasta cuándo rige: hasta el próximo cambio guardado de esa persona, si lo hay.
  const { filas } = await listNominaConfigsEmpleado(employeeId);
  const { siguiente } = estadoConfigMes(filas, anio, mes);
  const vigencia = siguiente
    ? ` Rige desde ${mesTexto({ anio, mes })} ${hastaTexto(siguiente)}: en ${mesTexto(siguiente)} hay otro cambio guardado y desde ahí manda ese.`
    : ` Rige desde ${mesTexto({ anio, mes })} en adelante, hasta que guardes otro cambio.`;

  // Aviso (no bloqueo) si alguna tarifa queda por debajo del mínimo legal del
  // mes: GPI puede pagar más que la ley, nunca menos.
  const legal = await parametrosLegalesNomina(anio, mes);
  const bajo = tarifasBajoMinimoLegal(tarifas, salario, legal);
  const avisoLegal =
    bajo.length === 0
      ? ""
      : ` OJO: ${bajo.length === 1 ? "una tarifa quedó" : `${bajo.length} tarifas quedaron`} POR DEBAJO del mínimo legal de ${mesTexto({ anio, mes })}: ${bajo
          .map((b) => `${b.etiqueta} (${formatearDinero(b.tarifa)}; mínimo ${formatearDinero(b.minimo)})`)
          .join(", ")}. Se guardó igual, pero conviene subirlas antes de liquidar.`;

  revalidar();
  return ok(
    `Configuración guardada.${vigencia} Las liquidaciones en borrador de esos meses se recalculan solas; las ya cerradas no se tocan.${avisoLegal}`,
  );
}

/**
 * QUITA EL CAMBIO de un mes: borra la fila de ese mes, y ese mes (con los que
 * lo seguían hasta el próximo cambio) vuelve a heredar del cambio anterior.
 *
 * Si no hay ningún cambio anterior, la persona se queda SIN configuración en
 * esos meses y no se puede liquidar. Eso no se deja pasar por accidente: la
 * pantalla lo advierte con una confirmación propia y manda
 * `sin_respaldo_confirmado=1`; sin esa marca, la acción se niega y lo explica.
 *
 * Las liquidaciones cerradas no cambian (leen su snapshot); las que sigan en
 * borrador se recalculan con lo heredado.
 */
export async function quitarConfigMes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdminOrNull();
  if (!session) return SIN_PERMISO;

  const employeeId = text(formData, "employee_id");
  if (!employeeId) return fail("Elige primero a la persona.");
  const anio = entero(formData, "anio");
  const mes = entero(formData, "mes");
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2200)
    return fail("El año no es válido.");
  if (!Number.isInteger(mes) || mes < 1 || mes > 12)
    return fail("El mes no es válido.");

  const { filas, error: errorLectura } = await listNominaConfigsEmpleado(employeeId);
  if (errorLectura)
    return fail(
      "No se pudo leer la configuración de esa persona. Recarga la página e inténtalo de nuevo.",
    );

  const estado = estadoConfigMes(filas, anio, mes);
  if (!estado.propia)
    return fail(
      `En ${mesTexto({ anio, mes })} no hay un cambio propio que quitar: sus valores ya son heredados. Recarga la página.`,
    );

  if (!estado.alQuitar && text(formData, "sin_respaldo_confirmado") !== "1")
    return fail(
      `Si quitas este cambio, la persona queda SIN configuración desde ${mesTexto({ anio, mes })} ${hastaTexto(estado.siguiente)} y no se podrá liquidar, porque no hay ningún mes anterior configurado. Confirma el aviso para hacerlo de todos modos.`,
    );

  const { data, error } = await session.supabase
    .from("nomina_config_mensual")
    .delete()
    .eq("employee_id", employeeId)
    .eq("anio", anio)
    .eq("mes", mes)
    .select("id");

  if (error) return fail(mensajeDeError(error));
  if (!data || data.length === 0)
    return fail("Ese cambio ya no existe. Recarga la página, por favor.");

  revalidar();
  return ok(
    estado.alQuitar
      ? `Cambio quitado. Desde ${mesTexto({ anio, mes })} ${hastaTexto(estado.siguiente)} vuelve a regir la configuración guardada en ${mesTexto(estado.alQuitar)}. Las liquidaciones en borrador se recalculan solas; las cerradas no se tocan.`
      : `Cambio quitado. Esta persona ya no tiene configuración desde ${mesTexto({ anio, mes })} ${hastaTexto(estado.siguiente)}: no se podrá liquidar en esos meses hasta que guardes una.`,
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
  const session = await getAdminOrNull();
  if (!session) return SIN_PERMISO;

  const periodo = leerPeriodo(formData);
  if (!periodo) return fail("El período seleccionado no es válido.");

  const employeeId = text(formData, "employee_id");
  if (!employeeId) return fail("Falta la persona a liquidar.");

  // «Vigente desde»: vale la configuración del mes o la heredada de antes.
  const config = await getNominaConfigVigente(employeeId, periodo.anio, periodo.mes);
  if (!config) {
    return fail(
      "Esa persona no tiene salario configurado ni en ese mes ni en ninguno anterior. Ve a la pestaña «Configuración», escribe su salario y vuelve.",
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
 * activa **con salario vigente** en ese mes (el suyo o el heredado de un mes
 * anterior). Las que no lo tengan se informan por nombre en vez de fallar en
 * silencio.
 *
 * CON EL FILTRO POR PERSONA: si el formulario trae `persona` (el filtro
 * `?persona=` de la pestaña), actúa SOLO sobre esa persona —lo que se ve— y
 * el botón lo dice («Liquidar a …»). Nunca crea liquidaciones de gente que no
 * está en pantalla.
 */
export async function liquidarTodos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getAdminOrNull();
  if (!session) return SIN_PERMISO;

  const periodo = leerPeriodo(formData);
  if (!periodo) return fail("El período seleccionado no es válido.");

  const rango = rangoPeriodo(periodo.tipo, periodo.anio, periodo.mes, periodo.quincena);
  const persona = text(formData, "persona");
  const perfiles = (await listProfiles()).filter(
    (p) => p.active && (!persona || p.id === persona),
  );
  if (persona && perfiles.length === 0)
    return fail("Esa persona ya no está activa. Quita el filtro y recarga la página.");
  const configs = await mapaNominaConfigsVigentes(periodo.anio, periodo.mes);

  const { data: existentes } = await session.supabase
    .from("nomina_liquidaciones")
    .select("employee_id")
    .eq("anio", periodo.anio)
    .eq("mes", periodo.mes)
    .eq("tipo", periodo.tipo)
    // Sin esto, «Liquidar todos» en la 2.ª quincena daba por liquidado a quien
    // solo tenía la 1.ª.
    .match(periodo.quincena ? { quincena: periodo.quincena } : {});

  const yaTienen = new Set(
    (existentes ?? []).map((row) => String(row.employee_id)),
  );

  const nuevas: Record<string, unknown>[] = [];
  const sinConfig: string[] = [];

  for (const perfil of perfiles) {
    if (yaTienen.has(perfil.id)) continue;
    if (!configs.has(perfil.id)) {
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
      ? ` Quedaron por fuera ${sinConfig.length === 1 ? "1 persona" : `${sinConfig.length} personas`} sin salario configurado ni en este mes ni en ninguno anterior (${sinConfig.join(", ")}): configúralas en la pestaña «Configuración».`
      : "";

  if (nuevas.length === 0) {
    return sinConfig.length > 0
      ? fail(`No se creó ninguna liquidación.${avisoSinConfig}`)
      : ok(
          persona
            ? "Esa persona ya tenía su liquidación en este período."
            : "Todas las personas del equipo ya tenían su liquidación en este período.",
        );
  }

  return ok(
    `Se crearon ${nuevas.length} ${nuevas.length === 1 ? "liquidación" : "liquidaciones"} en borrador para ${etiquetaPeriodo(periodo.tipo, periodo.anio, periodo.mes, periodo.quincena).toLowerCase()}.${avisoSinConfig}`,
  );
}

/* ================================================================== */
/* Editar una liquidación en borrador                                  */
/* ================================================================== */

/**
 * Lee los conceptos manuales de un formulario, mezclándolos con los guardados.
 * Si un importe no se puede leer devuelve la etiqueta de ese campo.
 */
function leerManuales(
  formData: FormData,
  guardados: ConceptosManuales,
): ConceptosManuales | { invalido: string } {
  const salida: ConceptosManuales = {
    valores: { ...guardados.valores },
    notas: { ...guardados.notas },
  };

  for (const concepto of CONCEPTOS_MANUALES) {
    const clave: ConceptoManual = concepto.clave;
    // Solo se pisa lo que el formulario mandó: si un campo no viaja, se
    // conserva lo que había.
    if (formData.has(clave)) {
      const valor = leerImporte(formData, clave, { decimales: 0 });
      if (valor === null) return { invalido: concepto.label };
      salida.valores[clave] = valor;
    }

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
  const session = await getAdminOrNull();
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
  if ("invalido" in manuales) return campoInvalido(manuales.invalido);

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
  const session = await getAdminOrNull();
  if (!session) return SIN_PERMISO;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la liquidación.");

  const liquidacion = await getLiquidacion(id);
  if (!liquidacion)
    return fail("Esa liquidación ya no existe. Recarga la página, por favor.");
  if (liquidacion.estado !== "borrador")
    return fail("Esta liquidación ya está cerrada.");

  // «Vigente desde»: la configuración del mes o la heredada de antes. Es la
  // que queda escrita en el snapshot y ya no se mueve.
  const config = await getNominaConfigVigente(
    liquidacion.employee_id,
    liquidacion.anio,
    liquidacion.mes,
  );
  if (!config)
    return fail(
      "No se puede cerrar: esa persona no tiene salario configurado ni en el mes ni en ninguno anterior. Configúralo en la pestaña «Configuración».",
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
  const session = await getAdminOrNull();
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
  const session = await getAdminOrNull();
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
  const session = await getAdminOrNull();
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
