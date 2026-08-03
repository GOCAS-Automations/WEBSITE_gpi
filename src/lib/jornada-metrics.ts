/**
 * MÉTRICAS DE JORNADAS — modelo de datos del tablero
 * ==================================================
 * Módulo PURO (sin Supabase ni `next/headers`): lo importan por igual el Server
 * Component que trae los datos y el Client Component que filtra y grafica.
 *
 * La idea: el servidor calcula UNA sola vez el desglose de cada jornada con
 * `calcularJornada` (que recorre el turno minuto a minuto) y manda al navegador
 * una fila plana y liviana. El cliente solo suma, filtra y dibuja.
 *
 * GOTCHA DE ZONA HORARIA: para saber a qué día de la semana pertenece una fecha
 * `YYYY-MM-DD` SIEMPRE se construye `new Date(fecha + "T12:00:00")`. Una fecha
 * ISO "pura" se interpreta en UTC y en Colombia (UTC-5) caería en el día
 * anterior.
 */

import type { JornadaRecord, JornadaStatus } from "@/lib/admin-types";
import {
  fechaColombia,
  horaColombia,
  jornadaConfigDefaults,
  obtenerDesglose,
  type JornadaConfig,
} from "@/lib/jornada";
import type { MapaHorarios } from "@/lib/horarios";

/* ------------------------------------------------------------------ */
/* Fila del tablero                                                    */
/* ------------------------------------------------------------------ */

export interface JornadaMetrica {
  id: string;
  empleadoId: string;
  empleadoNombre: string;
  /**
   * Orden de trabajo, o cadena vacía si la jornada no tenía ninguna (opcional
   * desde la migración 0005). Quien la muestre usa `SIN_ORDEN_TRABAJO`.
   */
  ordenTrabajo: string;
  /** Día laboral imputado, `YYYY-MM-DD`. */
  fecha: string;
  /** Hora de pared colombiana, `HH:MM`. */
  inicio: string;
  fin: string;
  /** Hora decimal para el Gantt (el fin puede pasar de 24 si cruza medianoche). */
  inicioDecimal: number;
  finDecimal: number;

  /** Minutos efectivamente trabajados (sin el almuerzo). */
  totalMinutos: number;
  /** Duración del turno de entrada a salida, incluido el almuerzo. */
  duracionMin: number;
  /** Almuerzo descontado según el horario del mes. */
  almuerzoMin: number;
  ordinariasMin: number;
  extrasMin: number;
  extraDiurnaMin: number;
  extraNocturnaMin: number;
  extraDominicalDiurnaMin: number;
  extraDominicalNocturnaMin: number;
  nocturnasMin: number;
  dominicalMin: number;
  /** Minutos ordinarios "puros": dentro de la jornada, diurnos, día laboral normal. */
  ordinariaDiurnaMin: number;
  /** Minutos ordinarios con recargo nocturno (dentro de la jornada, franja nocturna). */
  ordinariaNocturnaMin: number;
  /** Minutos ordinarios en domingo/festivo, diurnos. */
  dominicalDiurnaMin: number;
  /** Minutos ordinarios en domingo/festivo, nocturnos. */
  dominicalNocturnaMin: number;

  esDominicalFestivo: boolean;
  cruzaMedianoche: boolean;
  festivos: string[];
  status: JornadaStatus;
  /** Instante de creación (para el pill de frescura). */
  creadaEn: string | null;

  /**
   * true = las cifras vienen del desglose CONGELADO al aprobar la jornada, no
   * de un recálculo. Es lo que garantiza que un reporte de nómina ya cerrado no
   * cambie si después se corrige el horario de un mes.
   */
  congelado: boolean;
  /** Instante ISO en que se congeló, o `null` si se calculó en vivo. */
  calculadoEn: string | null;
}

/** "07:58" → 7.9667. Devuelve 0 si la hora no es válida. */
export function horaADecimal(hora: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora ?? "");
  if (!m) return 0;
  return Number(m[1]) + Number(m[2]) / 60;
}

/**
 * Convierte una fila cruda de `jornadas` en la fila plana del tablero.
 * Nunca lanza: si las horas no son válidas devuelve una fila en ceros para que
 * el tablero siga dibujándose.
 *
 * El desglose se pide SIEMPRE a `obtenerDesglose()`: si la jornada se aprobó con
 * la migración 0004 aplicada, sus cifras vienen del snapshot congelado; si no,
 * se calculan en vivo. Así los KPIs, las gráficas, el control semanal y el CSV
 * de nómina hablan todos del mismo número.
 */
export function construirMetrica(
  jornada: JornadaRecord,
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
): JornadaMetrica {
  const { desglose, congelado, calculadoEn } = obtenerDesglose(
    jornada,
    config,
    horarios,
  );

  const inicio = horaColombia(jornada.start_at);
  const fin = horaColombia(jornada.end_at);
  const inicioDecimal = horaADecimal(inicio);

  return {
    id: jornada.id,
    empleadoId: jornada.employee_id,
    empleadoNombre: jornada.employee_name?.trim() || "Sin nombre",
    ordenTrabajo: jornada.work_order ?? "",
    fecha: jornada.work_date || fechaColombia(jornada.start_at),
    inicio,
    fin,
    inicioDecimal,
    // Si el turno cruzó la medianoche la hora de fin es "menor" que la de
    // inicio: para la barra del Gantt se prolonga más allá de las 24.
    finDecimal: inicioDecimal + desglose.totalMinutos / 60,

    // Las métricas de nómina cuentan tiempo TRABAJADO: el almuerzo va aparte.
    totalMinutos: desglose.minutosTrabajados,
    duracionMin: desglose.totalMinutos,
    almuerzoMin: desglose.almuerzoMinutos,
    ordinariasMin: desglose.ordinarias,
    extrasMin: desglose.extras,
    extraDiurnaMin: desglose.extraDiurna,
    extraNocturnaMin: desglose.extraNocturna,
    extraDominicalDiurnaMin: desglose.extraDominicalDiurna,
    extraDominicalNocturnaMin: desglose.extraDominicalNocturna,
    nocturnasMin: desglose.minutosNocturnos,
    dominicalMin: desglose.minutosDominicales,
    ordinariaDiurnaMin: desglose.ordinariaDiurna,
    ordinariaNocturnaMin: desglose.ordinariaNocturna,
    dominicalDiurnaMin: desglose.dominicalDiurna,
    dominicalNocturnaMin: desglose.dominicalNocturna,

    esDominicalFestivo: desglose.esDominicalFestivo,
    cruzaMedianoche: desglose.cruzaMedianoche,
    festivos: desglose.festivos,
    status: jornada.status,
    creadaEn: jornada.created_at,

    congelado,
    calculadoEn,
  };
}

/* ------------------------------------------------------------------ */
/* Fechas (siempre con el ancla de mediodía)                           */
/* ------------------------------------------------------------------ */

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** `YYYY-MM-DD` → Date anclado al mediodía (nunca cambia de día por la zona). */
export function fechaLocal(fecha: string): Date {
  return new Date(`${fecha}T12:00:00`);
}

/** Date → `YYYY-MM-DD`. */
export function aISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Suma (o resta) días a una fecha `YYYY-MM-DD`. */
export function sumarDias(fecha: string, dias: number): string {
  const d = fechaLocal(fecha);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

/** "2026-07-27" → "Lun 27/07" (etiqueta compacta de los ejes). */
export function etiquetaDia(fecha: string): string {
  const d = fechaLocal(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return `${DIAS_CORTOS[d.getDay()]} ${fecha.slice(8)}/${fecha.slice(5, 7)}`;
}

/** Lunes de una semana, `"2026-07-27"` → `"Sem del 27/07"` (eje de tendencias). */
export function etiquetaSemana(lunes: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lunes)) return lunes;
  return `Sem del ${lunes.slice(8, 10)}/${lunes.slice(5, 7)}`;
}

/** Lunes de la semana a la que pertenece la fecha (`YYYY-MM-DD`). */
export function inicioDeSemana(fecha: string): string {
  const d = fechaLocal(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  // getDay(): 0 = domingo. Se retrocede hasta el lunes.
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return aISO(d);
}

/* ------------------------------------------------------------------ */
/* Agregaciones                                                        */
/* ------------------------------------------------------------------ */

export interface ResumenSemanal {
  clave: string;
  empleadoId: string;
  empleadoNombre: string;
  /** Lunes de la semana, `YYYY-MM-DD`. */
  semanaInicio: string;
  semanaFin: string;
  extrasMin: number;
  totalMin: number;
  jornadas: number;
  /** Jornadas de esa semana que superan el tope diario. */
  diasSobreTope: number;
  /** true si la semana supera el tope semanal configurado. */
  excedeSemana: boolean;
}

/**
 * Acumulado semanal de horas extra por empleado, de mayor a menor.
 * `limiteSemanaHoras` y `limiteDiaHoras` vienen de `jornada_config`.
 */
export function resumenSemanalExtras(
  datos: JornadaMetrica[],
  limiteSemanaHoras: number,
  limiteDiaHoras: number,
): ResumenSemanal[] {
  const mapa = new Map<string, ResumenSemanal>();
  const topeDiaMin = limiteDiaHoras * 60;

  for (const j of datos) {
    const semanaInicio = inicioDeSemana(j.fecha);
    const clave = `${j.empleadoId}|${semanaInicio}`;
    let fila = mapa.get(clave);
    if (!fila) {
      fila = {
        clave,
        empleadoId: j.empleadoId,
        empleadoNombre: j.empleadoNombre,
        semanaInicio,
        semanaFin: sumarDias(semanaInicio, 6),
        extrasMin: 0,
        totalMin: 0,
        jornadas: 0,
        diasSobreTope: 0,
        excedeSemana: false,
      };
      mapa.set(clave, fila);
    }
    fila.extrasMin += j.extrasMin;
    fila.totalMin += j.totalMinutos;
    fila.jornadas += 1;
    if (topeDiaMin > 0 && j.extrasMin > topeDiaMin) fila.diasSobreTope += 1;
  }

  const topeSemanaMin = limiteSemanaHoras * 60;
  return [...mapa.values()]
    .map((f) => ({
      ...f,
      excedeSemana: topeSemanaMin > 0 && f.extrasMin > topeSemanaMin,
    }))
    .sort(
      (a, b) =>
        b.extrasMin - a.extrasMin ||
        b.semanaInicio.localeCompare(a.semanaInicio) ||
        a.empleadoNombre.localeCompare(b.empleadoNombre),
    );
}
