/**
 * HORARIOS LABORALES MENSUALES
 * ============================
 * Módulo PURO y sin dependencias (ni Supabase ni `next/headers`): lo importan
 * por igual los Server Components, las server actions y los Client Components
 * del panel y del portal del empleado.
 *
 * QUÉ RESUELVE
 * ------------
 * GPI define su jornada laboral **mes a mes** (a veces cambia). Cada mes tiene
 * un horario por día de la semana:
 *
 *     { "lun": { "inicio": "08:00", "fin": "17:30", "almuerzoHoras": 1 },
 *       ...
 *       "sab": null,   // null = día NO laboral
 *       "dom": null }
 *
 * La **jornada ordinaria neta** de un día es `(fin − inicio) − almuerzo`: el
 * almuerzo NO cuenta como trabajo. Todo lo que exceda esa jornada se calcula
 * como hora extra (ver `src/lib/jornada.ts`).
 *
 * Los horarios viven en la tabla `horarios_mensuales` (migración 0003). Si esa
 * tabla no existe todavía o el mes no está cargado, se usa el horario
 * predeterminado de abajo: el portal nunca depende de la base de datos.
 */

/* ------------------------------------------------------------------ */
/* Días de la semana                                                   */
/* ------------------------------------------------------------------ */

/** Claves de los días tal como se guardan en el JSON de `horarios_mensuales`. */
export type DiaClave = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

/** Orden de presentación: la semana laboral colombiana empieza el lunes. */
export const DIAS_ORDEN: readonly DiaClave[] = [
  "lun",
  "mar",
  "mie",
  "jue",
  "vie",
  "sab",
  "dom",
] as const;

export const DIA_LABELS: Record<DiaClave, string> = {
  lun: "Lunes",
  mar: "Martes",
  mie: "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  sab: "Sábado",
  dom: "Domingo",
};

/** `Date.getDay()` (0 = domingo) → clave del día. */
export function claveDiaSemana(diaSemana: number): DiaClave {
  const mapa: DiaClave[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  return mapa[((diaSemana % 7) + 7) % 7];
}

/**
 * Día de la semana de una fecha `YYYY-MM-DD` (0 = domingo).
 *
 * GOTCHA DE ZONA HORARIA: se ancla al mediodía UTC a propósito. Una fecha ISO
 * "pura" se interpreta como medianoche UTC y en Colombia (UTC-5) caería en el
 * día anterior.
 */
export function diaSemanaDeFecha(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? 1 : d.getUTCDay();
}

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface HorarioDia {
  /** Hora de entrada, `HH:MM`. */
  inicio: string;
  /** Hora de salida, `HH:MM`. */
  fin: string;
  /** Horas de almuerzo que NO cuentan como trabajo (acepta medias horas). */
  almuerzoHoras: number;
}

/** Horario de una semana completa. `null` = día no laboral. */
export type HorarioDias = Record<DiaClave, HorarioDia | null>;

/** Horarios de varios meses, indexados por `"YYYY-MM"`. */
export type MapaHorarios = Record<string, HorarioDias>;

/**
 * HORARIO PREDETERMINADO DE GPI (confirmado por la empresa en julio de 2026):
 *
 *   · Lunes a jueves  08:00 – 17:30  (9,5 h de presencia − 1 h de almuerzo = 8,5 h)
 *   · Viernes         08:00 – 17:00  (9 h de presencia − 1 h de almuerzo = 8 h)
 *   · Sábado y domingo: no laborales
 *   · Total semanal neto: 42 horas
 *
 * Se usa para sembrar meses nuevos y como red de seguridad cuando la base de
 * datos no tiene el mes cargado.
 */
export const horarioPredeterminado: HorarioDias = {
  lun: { inicio: "08:00", fin: "17:30", almuerzoHoras: 1 },
  mar: { inicio: "08:00", fin: "17:30", almuerzoHoras: 1 },
  mie: { inicio: "08:00", fin: "17:30", almuerzoHoras: 1 },
  jue: { inicio: "08:00", fin: "17:30", almuerzoHoras: 1 },
  vie: { inicio: "08:00", fin: "17:00", almuerzoHoras: 1 },
  sab: null,
  dom: null,
};

/** Copia profunda: los horarios se editan en formularios y nunca se comparte estado. */
export function clonarHorario(dias: HorarioDias): HorarioDias {
  const salida = {} as HorarioDias;
  for (const clave of DIAS_ORDEN) {
    const dia = dias[clave];
    salida[clave] = dia ? { ...dia } : null;
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Horas y minutos                                                     */
/* ------------------------------------------------------------------ */

/** `"08:30"` → 510. Devuelve `null` si la hora no es válida. */
export function minutosDesdeHora(hora: unknown): number | null {
  if (typeof hora !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 510 → `"08:30"`. */
export function horaDesdeMinutos(minutos: number): string {
  const total = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutos)));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Minutos de **jornada ordinaria neta** de un día: `(fin − inicio) − almuerzo`.
 * Un día no laboral (o mal configurado) devuelve 0.
 */
export function minutosJornadaDia(dia: HorarioDia | null | undefined): number {
  if (!dia) return 0;
  const inicio = minutosDesdeHora(dia.inicio);
  const fin = minutosDesdeHora(dia.fin);
  if (inicio === null || fin === null || fin <= inicio) return 0;
  const almuerzo = Math.max(0, Math.round((Number(dia.almuerzoHoras) || 0) * 60));
  return Math.max(0, fin - inicio - almuerzo);
}

/** Minutos de almuerzo de un día (0 si no es laboral). */
export function minutosAlmuerzoDia(dia: HorarioDia | null | undefined): number {
  if (!dia) return 0;
  return Math.max(0, Math.round((Number(dia.almuerzoHoras) || 0) * 60));
}

/** Suma de la jornada neta de los siete días: el "total semanal" del editor. */
export function minutosSemanales(dias: HorarioDias): number {
  return DIAS_ORDEN.reduce((total, clave) => total + minutosJornadaDia(dias[clave]), 0);
}

/** Número de días laborales de la semana. */
export function diasLaborales(dias: HorarioDias): number {
  return DIAS_ORDEN.filter((clave) => dias[clave] !== null).length;
}

/** 510 → `"8,5 h"` (celda calculada del editor, al estilo del Excel de GPI). */
export function formatearHorasDecimales(minutos: number): string {
  const horas = Math.round((minutos / 60) * 100) / 100;
  return `${horas.toLocaleString("es-CO", { maximumFractionDigits: 2 })} h`;
}

/* ------------------------------------------------------------------ */
/* Normalización de lo que llega de la base de datos                   */
/* ------------------------------------------------------------------ */

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Convierte el JSON de `horarios_mensuales.dias` en un `HorarioDias` completo.
 * Nunca lanza: lo que venga mal escrito se reemplaza por el valor de
 * `porDefecto` para ese día.
 */
export function normalizarHorarioDias(
  value: unknown,
  porDefecto: HorarioDias = horarioPredeterminado,
): HorarioDias {
  if (!esObjeto(value)) return clonarHorario(porDefecto);

  const salida = {} as HorarioDias;

  for (const clave of DIAS_ORDEN) {
    const base = porDefecto[clave];

    if (!(clave in value)) {
      salida[clave] = base ? { ...base } : null;
      continue;
    }

    const bruto = value[clave];
    // `null` explícito = día no laboral (es información, no un error).
    if (bruto === null || bruto === false) {
      salida[clave] = null;
      continue;
    }
    if (!esObjeto(bruto)) {
      salida[clave] = base ? { ...base } : null;
      continue;
    }

    const inicio = minutosDesdeHora(bruto.inicio);
    const fin = minutosDesdeHora(bruto.fin);
    if (inicio === null || fin === null || fin <= inicio) {
      salida[clave] = base ? { ...base } : null;
      continue;
    }

    const almuerzoBruto = Number(bruto.almuerzoHoras);
    const almuerzo = Number.isFinite(almuerzoBruto)
      ? Math.max(0, Math.min(8, almuerzoBruto))
      : (base?.almuerzoHoras ?? 0);

    salida[clave] = {
      inicio: horaDesdeMinutos(inicio),
      fin: horaDesdeMinutos(fin),
      almuerzoHoras: almuerzo,
    };
  }

  return salida;
}

/* ------------------------------------------------------------------ */
/* Meses                                                               */
/* ------------------------------------------------------------------ */

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** 7 → "julio". */
export function nombreMes(mes: number): string {
  return MESES[Math.min(12, Math.max(1, Math.round(mes))) - 1];
}

/** (2026, 7) → "julio de 2026". */
export function etiquetaMes(anio: number, mes: number): string {
  return `${nombreMes(mes)} de ${anio}`;
}

/** (2026, 7) → "2026-07". */
export function claveMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

/** "2026-07-28" → "2026-07". */
export function mesDeFecha(fecha: string): string {
  return typeof fecha === "string" ? fecha.slice(0, 7) : "";
}

export interface Mes {
  anio: number;
  mes: number;
}

export function mesAnterior({ anio, mes }: Mes): Mes {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

export function mesSiguiente({ anio, mes }: Mes): Mes {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/**
 * Mes en curso en Colombia (UTC-5 fijo, sin horario de verano).
 * Se calcula igual que `hoyEnColombia()` de `src/lib/jornada.ts` para que el
 * panel y el portal nunca discrepen de mes.
 */
export function hoyMesEnColombia(ahora: Date = new Date()): Mes {
  const desplazado = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  return {
    anio: desplazado.getUTCFullYear(),
    mes: desplazado.getUTCMonth() + 1,
  };
}

/** Valida y acota un par año/mes que llega de la URL o de un formulario. */
export function normalizarMes(anio: unknown, mes: unknown, porDefecto: Mes): Mes {
  const a = Number(anio);
  const m = Number(mes);
  if (!Number.isInteger(a) || a < 2000 || a > 2200) return porDefecto;
  if (!Number.isInteger(m) || m < 1 || m > 12) return porDefecto;
  return { anio: a, mes: m };
}

/**
 * Horario que rige en una fecha concreta.
 * Busca el mes de la fecha en el mapa y, si no está, usa `porDefecto`.
 */
export function horarioDeFecha(
  fecha: string,
  horarios?: MapaHorarios | null,
  porDefecto: HorarioDias = horarioPredeterminado,
): HorarioDias {
  const mes = mesDeFecha(fecha);
  const encontrado = horarios?.[mes];
  return encontrado ?? porDefecto;
}

/** Horario del día concreto (ya resuelto el mes). `null` = día no laboral. */
export function horarioDelDia(
  fecha: string,
  horarios?: MapaHorarios | null,
  porDefecto: HorarioDias = horarioPredeterminado,
): HorarioDia | null {
  const dias = horarioDeFecha(fecha, horarios, porDefecto);
  return dias[claveDiaSemana(diaSemanaDeFecha(fecha))];
}

/**
 * Resumen legible del horario semanal, para textos de ayuda:
 * "Lunes a jueves 8:00 a. m. – 5:30 p. m. · Viernes 8:00 a. m. – 5:00 p. m."
 * (Agrupa días consecutivos con el mismo horario.)
 */
export function resumenHorario(dias: HorarioDias): string {
  const grupos: { desde: DiaClave; hasta: DiaClave; dia: HorarioDia }[] = [];

  for (const clave of DIAS_ORDEN) {
    const dia = dias[clave];
    if (!dia) continue;
    const ultimo = grupos[grupos.length - 1];
    if (
      ultimo &&
      ultimo.dia.inicio === dia.inicio &&
      ultimo.dia.fin === dia.fin &&
      DIAS_ORDEN.indexOf(clave) === DIAS_ORDEN.indexOf(ultimo.hasta) + 1
    ) {
      ultimo.hasta = clave;
      continue;
    }
    grupos.push({ desde: clave, hasta: clave, dia });
  }

  if (grupos.length === 0) return "Sin días laborales configurados";

  return grupos
    .map((g) => {
      const nombre =
        g.desde === g.hasta
          ? DIA_LABELS[g.desde]
          : `${DIA_LABELS[g.desde]} a ${DIA_LABELS[g.hasta].toLowerCase()}`;
      return `${nombre} ${g.dia.inicio}–${g.dia.fin}`;
    })
    .join(" · ");
}
