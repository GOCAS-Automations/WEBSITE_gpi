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
 * QUITAR O SUSPENDER LA CONFIGURACIÓN (22 sep 2026)
 * -------------------------------------------------
 * `quitarConfigMes` y `cortarHerenciaConfig` aplican la REGLA DE LOS
 * BORRADORES (`efectoEnBorradores()` de `nomina.ts`) en la misma operación:
 * cerradas y pagadas, intactas; borradores de meses que siguen heredando,
 * conservados; borradores de meses que quedan sin configuración, eliminados.
 * Y `reabrirLiquidacion` se niega si el mes ya no tiene configuración: no deja
 * un borrador que no se puede calcular.
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
  faltasDelPeriodoEmpleado,
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
  efectoEnBorradores,
  estadoConfigMes,
  etiquetaPeriodo,
  etiquetaPeriodoCorta,
  filasTrasCortar,
  filasTrasQuitar,
  manualesAJson,
  manualesVacios,
  mesAnterior,
  nombreMesNomina,
  normalizarManuales,
  pesos,
  rangoPeriodo,
  derivarTarifas,
  type ConceptoManual,
  type ConceptosManuales,
  type TipoPeriodo,
} from "@/lib/nomina";
import { formatearDinero, formatearNumero, parsearNumero } from "@/lib/dinero";
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

/** «octubre de 2026». */
const mesTexto = (fecha: { anio: number; mes: number }) =>
  `${nombreMesNomina(fecha.mes)} de ${fecha.anio}`;

/**
 * El tramo en que rige algo que empieza en `desde` y dura hasta el próximo
 * cambio: «desde octubre de 2026 en adelante», «desde octubre de 2026 hasta
 * diciembre de 2026» o, si el próximo cambio es al mes siguiente, «solo en
 * octubre de 2026».
 */
const vigencia = (
  desde: { anio: number; mes: number },
  siguiente: { anio: number; mes: number } | null,
) => {
  if (!siguiente) return `desde ${mesTexto(desde)} en adelante`;
  const hasta = mesAnterior(siguiente.anio, siguiente.mes);
  if (hasta.anio === desde.anio && hasta.mes === desde.mes) return `solo en ${mesTexto(desde)}`;
  return `desde ${mesTexto(desde)} hasta ${mesTexto(hasta)}`;
};

/**
 * Guarda el salario, el auxilio, las siete tarifas y los porcentajes de un
 * empleado **desde** un mes (modelo «vigente desde», 18 sep 2026): la fila
 * rige para ese mes y los siguientes, hasta el próximo cambio guardado.
 *
 * Es la ÚNICA manera de crear una fila de configuración (los CORTES los
 * escribe `cortarHerenciaConfig`): ver un mes en la pantalla ya no crea nada.
 * `upsert` sobre la clave (empleado, año, mes); guardar en un mes con corte lo
 * reemplaza por esta configuración.
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

  // LAS TARIFAS NO SE DIGITAN (23 sep 2026): se derivan del salario y de la ley
  // del mes desde el que rige la configuración. Se siguen escribiendo en sus
  // columnas como HISTÓRICO, pero el cálculo de cada liquidación las vuelve a
  // derivar con la ley del mes que se liquida.
  const legal = await parametrosLegalesNomina(anio, mes);
  const tarifas = derivarTarifas(salario, legal);

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

  // `sin_configuracion: false`: guardar sobre un mes con CORTE lo convierte en
  // configuración (la herencia vuelve a correr desde aquí).
  const fila = { employee_id: employeeId, anio, mes, ...nominaConfigAColumnas(datos) };
  let { error } = await session.supabase
    .from("nomina_config_mensual")
    .upsert({ ...fila, sin_configuracion: false }, { onConflict: "employee_id,anio,mes" });
  if (error && faltaColumnaCorte(error)) {
    // Migración 0013 sin aplicar: se guarda como siempre.
    ({ error } = await session.supabase
      .from("nomina_config_mensual")
      .upsert(fila, { onConflict: "employee_id,anio,mes" }));
  }

  if (error) return fail(mensajeDeError(error));

  // Hasta cuándo rige: hasta el próximo cambio guardado de esa persona, si lo hay.
  const { filas } = await listNominaConfigsEmpleado(employeeId);
  const { siguiente } = estadoConfigMes(filas, anio, mes);
  const tramo = siguiente
    ? ` Rige ${vigencia({ anio, mes }, siguiente)}: en ${mesTexto(siguiente)} hay otro cambio guardado y desde ahí manda ese.`
    : ` Rige desde ${mesTexto({ anio, mes })} en adelante, hasta que guardes otro cambio.`;

  // El valor de cada tipo de hora no se digita: lo pone la ley.
  const avisoTarifas =
    ` El valor de cada tipo de hora lo calcula el sistema con la ley: salario ÷ ${formatearNumero(
      legal.divisor,
    )} (jornada de ${formatearNumero(legal.horasSemanales)} h semanales) × el factor de cada concepto, con el recargo de domingo y festivo del ${formatearNumero(
      Math.round(legal.recargoDominical * 100),
    )} % vigente en ${mesTexto({ anio, mes })}. La hora ordinaria queda en ${formatearDinero(
      tarifas.horaBase,
    )}; cada mes se vuelve a calcular con la ley de ese mes.`;

  revalidar();
  return ok(
    `Configuración guardada.${tramo}${avisoTarifas} Las liquidaciones en borrador de esos meses se recalculan solas; las ya cerradas no se tocan.`,
  );
}

/**
 * ¿El error dice que falta la columna `sin_configuracion` (migración 0013 sin
 * aplicar)? Entonces se guarda sin ella, como antes.
 */
function faltaColumnaCorte(error: { code?: string | null; message?: string | null }): boolean {
  return error.code === "PGRST204" || /sin_configuracion/i.test(error.message ?? "");
}

/** «2.ª quincena · octubre 2026, mes completo · noviembre 2026». */
const listaPeriodos = (
  liquidaciones: { tipo: TipoPeriodo; anio: number; mes: number; quincena: 1 | 2 | null }[],
) =>
  liquidaciones
    .map((l) => etiquetaPeriodoCorta(l.tipo, l.anio, l.mes, l.quincena))
    .join(", ");

const borradoresTexto = (n: number) => (n === 1 ? "1 borrador" : `${n} borradores`);

/**
 * QUITAR EL CAMBIO de un mes o SUSPENDER LA HERENCIA desde un mes: las dos
 * acciones comparten todo menos la fila que dejan en ese mes.
 *
 *   · `quitar` borra la fila (configuración o corte) del mes: ese mes y los que
 *     lo seguían hasta el próximo cambio vuelven a heredar del cambio anterior
 *     —o se quedan sin configuración si no hay ninguno—.
 *   · `cortar` escribe un CORTE en un mes que HEREDA: sin configuración desde
 *     ese mes hasta el próximo cambio (retiro, licencia no remunerada…).
 *
 * LA REGLA DE LOS BORRADORES (`efectoEnBorradores()` de `nomina.ts`) se aplica
 * aquí, en el servidor y EN LA MISMA OPERACIÓN (la función
 * `nomina_aplicar_cambio_config` de la 0013, una sola transacción):
 *   · cerradas y pagadas: no se tocan jamás;
 *   · borradores de meses que siguen con configuración heredada: se conservan
 *     (con sus conceptos) y se recalculan solos;
 *   · borradores de meses que quedan sin configuración: se ELIMINAN.
 *
 * La pantalla muestra en la confirmación cuántos borradores y de qué períodos
 * se eliminarán, y manda sus ids en `borradores_confirmados`. Si al llegar aquí
 * la cuenta es otra (alguien creó o cerró una liquidación mientras tanto), la
 * acción se niega: nunca se elimina un borrador que no se vio en la
 * confirmación.
 */
async function aplicarCambioConfig(
  accion: "quitar" | "cortar",
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

  const [{ filas, error: errorLectura }, borradoresLeidos] = await Promise.all([
    listNominaConfigsEmpleado(employeeId),
    session.supabase
      .from("nomina_liquidaciones")
      .select("id, tipo, anio, mes, quincena, estado")
      .eq("employee_id", employeeId)
      .eq("estado", "borrador"),
  ]);
  if (errorLectura || borradoresLeidos.error)
    return fail(
      "No se pudo leer la configuración o las liquidaciones de esa persona. Recarga la página e inténtalo de nuevo.",
    );

  const borradores = (borradoresLeidos.data ?? []).map((row) => ({
    id: String(row.id),
    tipo: (row.tipo === "mes" ? "mes" : "quincena") as TipoPeriodo,
    anio: Number(row.anio),
    mes: Number(row.mes),
    quincena: (Number(row.quincena) === 1 || Number(row.quincena) === 2
      ? Number(row.quincena)
      : null) as 1 | 2 | null,
    estado: String(row.estado),
  }));

  const esteMes = mesTexto({ anio, mes });
  const estado = estadoConfigMes(filas, anio, mes);

  if (accion === "quitar" && !estado.cambioDelMes)
    return fail(
      `En ${esteMes} no hay un cambio propio que quitar: sus valores vienen de otro mes. Recarga la página.`,
    );
  if (accion === "cortar" && estado.origen !== "heredada")
    return fail(
      estado.origen === "propia"
        ? `${esteMes} tiene su propia configuración guardada. Si quieres dejarlo sin configuración, primero quita ese cambio y después suspende la herencia.`
        : estado.origen === "suspendida"
          ? `La herencia ya está suspendida en ${esteMes}: esta persona no tiene configuración en ese mes. Recarga la página.`
          : `En ${esteMes} no hay nada que suspender: esta persona no tiene configuración ni en ese mes ni en los anteriores.`,
    );

  const filasDespues =
    accion === "quitar" ? filasTrasQuitar(filas, anio, mes) : filasTrasCortar(filas, anio, mes);
  const efecto = efectoEnBorradores(borradores, filasDespues, { anio, mes });
  const quedaSinConfig = accion === "cortar" || !estado.alQuitar;

  // Lo que vio la persona en la confirmación tiene que ser exactamente esto.
  if (quedaSinConfig && text(formData, "confirmado") !== "1")
    return fail(
      `Si sigues, esta persona queda SIN configuración ${vigencia({ anio, mes }, estado.siguiente)} y no se podrá liquidar en esos meses. Confirma el aviso para hacerlo.`,
    );
  const confirmados = new Set(
    text(formData, "borradores_confirmados")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const aEliminar = efecto.eliminar.map((l) => l.id);
  if (
    confirmados.size !== aEliminar.length ||
    aEliminar.some((id) => !confirmados.has(id))
  )
    return fail(
      "Las liquidaciones de esta persona cambiaron mientras tenías abierta la pantalla, así que no se hizo nada. Recarga la página y vuelve a confirmar: el aviso dirá qué borradores se eliminarían ahora.",
    );

  const { data, error } = await session.supabase.rpc("nomina_aplicar_cambio_config", {
    p_employee: employeeId,
    p_anio: anio,
    p_mes: mes,
    p_accion: accion,
    p_borradores: aEliminar,
  });

  if (error) {
    const sinFuncion =
      error.code === "PGRST202" || /nomina_aplicar_cambio_config/i.test(error.message ?? "");
    if (!sinFuncion) {
      if (error.code === "P0002")
        return fail("Ese cambio ya no existe. Recarga la página, por favor.");
      return fail(mensajeDeError(error));
    }
    // Migración 0013 sin aplicar: suspender la herencia no existe todavía.
    if (accion === "cortar")
      return fail(
        "Para suspender la herencia falta aplicar la migración supabase/migrations/0013_nomina_corte_configuracion.sql en el SQL Editor de Supabase.",
      );
    // Quitar sí: en dos pasos, como antes, y después los borradores.
    const borrado = await session.supabase
      .from("nomina_config_mensual")
      .delete()
      .eq("employee_id", employeeId)
      .eq("anio", anio)
      .eq("mes", mes)
      .select("id");
    if (borrado.error) return fail(mensajeDeError(borrado.error));
    if (!borrado.data || borrado.data.length === 0)
      return fail("Ese cambio ya no existe. Recarga la página, por favor.");
    if (aEliminar.length > 0) {
      const { error: errorBorradores } = await session.supabase
        .from("nomina_liquidaciones")
        .delete()
        .in("id", aEliminar)
        .eq("employee_id", employeeId)
        .eq("estado", "borrador");
      if (errorBorradores) return fail(mensajeDeError(errorBorradores));
    }
  } else if (!data) {
    return fail("No se pudo completar la operación. Recarga la página e inténtalo de nuevo.");
  }

  revalidar();

  const rango = vigencia({ anio, mes }, estado.siguiente);
  const eliminados =
    efecto.eliminar.length > 0
      ? ` Se ${efecto.eliminar.length === 1 ? "eliminó" : "eliminaron"} ${borradoresTexto(efecto.eliminar.length)} de liquidación que ${efecto.eliminar.length === 1 ? "quedaba" : "quedaban"} sin configuración (${listaPeriodos(efecto.eliminar)}).`
      : "";
  const conservados =
    efecto.conservar.length > 0
      ? ` ${efecto.conservar.length === 1 ? "El borrador" : `Los ${efecto.conservar.length} borradores`} de esos meses se ${efecto.conservar.length === 1 ? "conserva" : "conservan"} con sus conceptos y se ${efecto.conservar.length === 1 ? "recalcula" : "recalculan"} con esa configuración.`
      : "";
  const cerradas = " Las liquidaciones cerradas y pagadas no se tocaron.";

  if (accion === "cortar")
    return ok(
      `Herencia suspendida: esta persona queda sin configuración ${rango}.${eliminados}${cerradas} Para deshacerlo, vuelve a ${esteMes} y usa «Quitar el cambio de este mes».`,
    );
  return ok(
    estado.alQuitar
      ? `Cambio quitado. ${rango.charAt(0).toUpperCase()}${rango.slice(1)} vuelve a regir la configuración guardada en ${mesTexto(estado.alQuitar)}.${conservados}${eliminados}${cerradas}`
      : `Cambio quitado. Esta persona ya no tiene configuración ${rango}: no se podrá liquidar en esos meses hasta que guardes una.${eliminados}${cerradas}`,
  );
}

/**
 * QUITA EL CAMBIO de un mes —una configuración o un corte—: borra la fila de
 * ese mes, y ese mes (con los que lo seguían hasta el próximo cambio) vuelve a
 * heredar del cambio anterior. Sobre un CORTE, esto deshace la suspensión.
 *
 * Si no hay ningún cambio anterior, la persona se queda SIN configuración en
 * esos meses: la pantalla lo advierte en su confirmación y manda
 * `confirmado=1`; sin esa marca, la acción se niega y lo explica. Los
 * borradores de esos meses siguen la regla de `aplicarCambioConfig`.
 */
export async function quitarConfigMes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return aplicarCambioConfig("quitar", formData);
}

/**
 * SUSPENDE LA HERENCIA desde un mes que hereda (22 sep 2026): guarda un CORTE
 * —«sin configuración desde este mes»— que rige hasta el próximo cambio. Para
 * un empleado que se retira o sale a una licencia no remunerada. Se deshace con
 * «Quitar el cambio de este mes» sobre el mes del corte. Los borradores de los
 * meses que quedan sin configuración se eliminan en la misma operación.
 */
export async function cortarHerenciaConfig(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return aplicarCambioConfig("cortar", formData);
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

  // Las TARIFAS las pone la ley del mes que se liquida (23 sep 2026), no las
  // columnas de la configuración (que quedan como histórico): así el
  // 1-jul-2027 el recargo dominical pasa al 100 % sin que nadie toque nada.
  const [horas, legal, faltas] = await Promise.all([
    horasDelPeriodo(
      liquidacion.employee_id,
      liquidacion.fecha_inicio,
      liquidacion.fecha_fin,
    ),
    parametrosLegalesNomina(liquidacion.anio, liquidacion.mes),
    // Permisos APROBADOS y NO remunerados del período: bajan los días que se
    // pagan (y arrastran el domingo perdido). Quedan dentro del snapshot.
    faltasDelPeriodoEmpleado(
      liquidacion.employee_id,
      liquidacion.fecha_inicio,
      liquidacion.fecha_fin,
    ),
  ]);

  const calculo = calcularLiquidacion({
    config: {
      salarioBasico: config.salario_basico,
      auxTransporte: config.aux_transporte,
      tarifas: derivarTarifas(config.salario_basico, legal),
      pctSalud: config.pct_salud,
      pctPension: config.pct_pension,
    },
    minutos: horas.minutos,
    dias: liquidacion.dias_liquidados,
    manuales: normalizarManuales(liquidacion.conceptos),
    faltas,
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

  // Reabrir recalcula EN VIVO con la configuración del mes: si el mes ya no
  // tiene ninguna (se quitó o se suspendió la herencia después de cerrarla),
  // el borrador no se podría calcular. Se niega y se explica.
  const actual = await getLiquidacion(id);
  if (!actual)
    return fail("Esa liquidación ya no existe. Recarga la página, por favor.");
  const config = await getNominaConfigVigente(actual.employee_id, actual.anio, actual.mes);
  if (!config)
    return fail(
      `No se puede reabrir: ${actual.employee_name || "esta persona"} no tiene configuración en ${mesTexto(actual)} (se quitó o se suspendió después de cerrar esta liquidación). Configura primero a la persona en ese mes, en la pestaña «Configuración», y vuelve a intentarlo. Mientras tanto la liquidación sigue cerrada, con su cálculo congelado y su volante.`,
    );

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
