/**
 * CÁLCULO DE JORNADAS Y HORAS EXTRA
 * =================================
 * Módulo PURO (solo depende de `src/lib/horarios.ts`, que también lo es): lo
 * usan por igual el portal del empleado (vista previa en vivo), la pantalla de
 * aprobaciones de /admin/jornadas y el tablero de métricas.
 *
 * Zona horaria: todo el cálculo trabaja con la hora de pared de Colombia
 * (America/Bogotá, UTC-5 fijo, sin horario de verano). Así el resultado es el
 * mismo en el navegador del empleado, en el servidor de Vercel y en la base de
 * datos, sin depender de la zona horaria de la máquina.
 *
 * QUÉ CUENTA COMO JORNADA ORDINARIA
 * ---------------------------------
 * Desde la migración 0003 la jornada ordinaria **sale del horario del mes**
 * (tabla `horarios_mensuales`, ver `src/lib/horarios.ts`), no de un número fijo:
 * para la fecha trabajada se busca el horario de ese año/mes, se toma el día de
 * la semana y la jornada ordinaria neta es `(fin − inicio) − almuerzo`. Lo que
 * exceda esa jornada es hora extra. Si no hay horario cargado para ese mes se
 * usa el horario predeterminado de GPI, así que el cálculo nunca depende de la
 * base de datos.
 *
 * IMPORTANTE: los porcentajes de recargo son PARÁMETROS, no reglas fijas.
 * Salen del ajuste `jornada_config` de Supabase (editable) y aquí solo viven
 * como valores por defecto. GPI debe confirmar sus propias reglas.
 */

import {
  claveDiaSemana,
  diaSemanaDeFecha,
  etiquetaMes,
  horarioDeFecha,
  horarioPredeterminado,
  mesDeFecha,
  minutosAlmuerzoDia,
  minutosDesdeHora,
  minutosJornadaDia,
  normalizarHorarioDias,
  resumenHorario,
  type HorarioDia,
  type HorarioDias,
  type MapaHorarios,
} from "@/lib/horarios";

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

export interface JornadaRecargos {
  /** Hora extra diurna (sobre la hora ordinaria). */
  extraDiurna: number;
  /** Hora extra nocturna. */
  extraNocturna: number;
  /** Recargo por trabajo nocturno en horas NO extra. */
  nocturno: number;
  /** Recargo por domingo o festivo. */
  dominicalFestivo: number;
  /** Hora extra diurna en domingo o festivo. */
  extraDominicalDiurna: number;
  /** Hora extra nocturna en domingo o festivo. */
  extraDominicalNocturna: number;
}

export interface JornadaConfig {
  /**
   * Horario base de oficina (LEGADO / referencia informativa).
   * Desde la migración 0003 la jornada ordinaria real sale de
   * `horarios_mensuales`; estos campos solo se conservan como referencia.
   */
  jornadaOrdinariaInicio: string;
  jornadaOrdinariaFin: string;
  /**
   * Horas ordinarias por día (LEGADO). Ya no se usa para clasificar el turno:
   * la jornada ordinaria de cada día la define el horario del mes.
   */
  horasOrdinariasDia: number;
  /**
   * Horario semanal POR DEFECTO: se usa para crear meses nuevos en
   * `/admin/horarios` y como red de seguridad cuando la base de datos no tiene
   * el mes cargado.
   */
  horarioSemanal: HorarioDias;
  /** Franja nocturna (cruza la medianoche). */
  inicioNocturno: string;
  finNocturno: string;
  /** Tope de horas extra por día antes de encender la alerta del tablero. */
  limiteExtrasDia: number;
  /** Tope de horas extra por semana antes de encender la alerta del tablero. */
  limiteExtrasSemana: number;
  recargos: JornadaRecargos;
}

/**
 * Valores por defecto — horario confirmado por GPI (lunes a jueves 8:00 a. m.
 * a 5:30 p. m., viernes hasta las 5:00 p. m., 1 hora de almuerzo, 42 h
 * semanales netas) y normativa laboral colombiana vigente en 2026: franja
 * nocturna desde las 7:00 p. m. (Ley 2101 de 2021) y recargo dominical del 80%
 * (Ley 2466 de 2025).
 * Los topes de horas extra (2 h al día, 12 h a la semana) son los del artículo
 * 22 de la Ley 50 de 1990; el tablero solo los usa para avisar, nunca bloquea.
 * Son AJUSTABLES desde `jornada_config` cuando GPI confirme sus reglas.
 */
export const jornadaConfigDefaults: JornadaConfig = {
  jornadaOrdinariaInicio: "08:00",
  jornadaOrdinariaFin: "17:30",
  horasOrdinariasDia: 8.5,
  horarioSemanal: horarioPredeterminado,
  inicioNocturno: "19:00",
  finNocturno: "06:00",
  limiteExtrasDia: 2,
  limiteExtrasSemana: 12,
  recargos: {
    extraDiurna: 0.25,
    extraNocturna: 0.75,
    nocturno: 0.35,
    dominicalFestivo: 0.8,
    extraDominicalDiurna: 1.05,
    extraDominicalNocturna: 1.55,
  },
};

/* ------------------------------------------------------------------ */
/* Zona horaria de Colombia                                            */
/* ------------------------------------------------------------------ */

/** Colombia es UTC-5 todo el año (no hay horario de verano). */
export const COLOMBIA_UTC_OFFSET = "-05:00";
const OFFSET_MINUTOS = -5 * 60;

interface PartesLocales {
  fecha: string; // YYYY-MM-DD
  minutosDelDia: number; // 0..1439
  diaSemana: number; // 0 = domingo
}

function dosDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Descompone un instante en su hora de pared colombiana. */
function partesLocales(instante: Date): PartesLocales {
  const desplazado = new Date(instante.getTime() + OFFSET_MINUTOS * 60_000);
  return {
    fecha: `${desplazado.getUTCFullYear()}-${dosDigitos(
      desplazado.getUTCMonth() + 1,
    )}-${dosDigitos(desplazado.getUTCDate())}`,
    minutosDelDia:
      desplazado.getUTCHours() * 60 + desplazado.getUTCMinutes(),
    diaSemana: desplazado.getUTCDay(),
  };
}

/**
 * Construye el instante exacto (ISO 8601) a partir de una fecha `YYYY-MM-DD`,
 * una hora `HH:MM` y, opcionalmente, un desplazamiento de días.
 * Se usa al guardar una jornada: `start_at` y `end_at` quedan anclados a la
 * hora real de Colombia.
 */
export function instanteColombia(
  fecha: string,
  hora: string,
  masDias = 0,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  if (!/^\d{2}:\d{2}$/.test(hora)) return null;

  const base = new Date(`${fecha}T${hora}:00.000${COLOMBIA_UTC_OFFSET}`);
  if (Number.isNaN(base.getTime())) return null;

  return new Date(base.getTime() + masDias * 86_400_000).toISOString();
}

/** Devuelve la fecha de hoy en Colombia como `YYYY-MM-DD`. */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return partesLocales(ahora).fecha;
}

/** Devuelve la hora local colombiana de un instante como `HH:MM`. */
export function horaColombia(instante: Date | string): string {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  if (Number.isNaN(fecha.getTime())) return "--:--";
  const { minutosDelDia } = partesLocales(fecha);
  return `${dosDigitos(Math.floor(minutosDelDia / 60))}:${dosDigitos(
    minutosDelDia % 60,
  )}`;
}

/** Devuelve la fecha local colombiana de un instante como `YYYY-MM-DD`. */
export function fechaColombia(instante: Date | string): string {
  const fecha = typeof instante === "string" ? new Date(instante) : instante;
  if (Number.isNaN(fecha.getTime())) return "";
  return partesLocales(fecha).fecha;
}

/* ------------------------------------------------------------------ */
/* Festivos de Colombia                                                */
/* ------------------------------------------------------------------ */

/**
 * Festivos nacionales de Colombia — AÑO 2026.
 *
 * MANTENIMIENTO: esta lista hay que ampliarla cada año (los festivos
 * "trasladables" de la Ley Emiliani caen siempre en lunes, y la Semana Santa
 * depende de la Pascua). Mientras un año no esté en la tabla, el cálculo sigue
 * funcionando: solo los domingos se tratan como día de recargo dominical.
 */
export const FESTIVOS_COLOMBIA: Record<string, string> = {
  "2026-01-01": "Año Nuevo",
  "2026-01-12": "Día de los Reyes Magos",
  "2026-03-23": "Día de San José",
  "2026-04-02": "Jueves Santo",
  "2026-04-03": "Viernes Santo",
  "2026-05-01": "Día del Trabajo",
  "2026-05-18": "Ascensión del Señor",
  "2026-06-08": "Corpus Christi",
  "2026-06-15": "Sagrado Corazón de Jesús",
  "2026-06-29": "San Pedro y San Pablo",
  "2026-07-20": "Día de la Independencia",
  "2026-08-07": "Batalla de Boyacá",
  "2026-08-17": "Asunción de la Virgen",
  "2026-10-12": "Día de la Raza",
  "2026-11-02": "Día de Todos los Santos",
  "2026-11-16": "Independencia de Cartagena",
  "2026-12-08": "Día de la Inmaculada Concepción",
  "2026-12-25": "Navidad",
};

/** Nombre del festivo si la fecha `YYYY-MM-DD` lo es; si no, `null`. */
export function nombreFestivo(fecha: string): string | null {
  return FESTIVOS_COLOMBIA[fecha] ?? null;
}

/* ------------------------------------------------------------------ */
/* Desglose de una jornada                                             */
/* ------------------------------------------------------------------ */

export interface DesgloseJornada {
  /** false cuando los datos no permiten calcular (fechas inválidas, etc.). */
  valido: boolean;
  /** Mensaje amable para mostrarle al usuario cuando `valido` es false. */
  error?: string;

  /** Duración total del turno (de la hora de entrada a la de salida), en minutos. */
  totalMinutos: number;

  /** Minutos de almuerzo descontados: NO cuentan como trabajo. */
  almuerzoMinutos: number;
  /** Minutos efectivamente trabajados = `totalMinutos − almuerzoMinutos`. */
  minutosTrabajados: number;
  /** Jornada ordinaria neta del día según el horario del mes, en minutos. */
  jornadaOrdinariaMinutos: number;
  /** false = el día no es laboral en el horario del mes (o es festivo). */
  diaLaboral: boolean;

  /* Minutos por categoría (las ocho combinaciones posibles). */
  ordinariaDiurna: number;
  ordinariaNocturna: number;
  extraDiurna: number;
  extraNocturna: number;
  dominicalDiurna: number;
  dominicalNocturna: number;
  extraDominicalDiurna: number;
  extraDominicalNocturna: number;

  /* Agregados cómodos para la interfaz. */
  /** Minutos ordinarios (dentro de la jornada legal del día). */
  ordinarias: number;
  /** Minutos que superan la jornada ordinaria (horas extra). */
  extras: number;
  /** Minutos trabajados dentro de la franja nocturna. */
  minutosNocturnos: number;
  /** Minutos trabajados en domingo o festivo. */
  minutosDominicales: number;

  /** true si alguna parte del turno cayó en domingo o festivo. */
  esDominicalFestivo: boolean;
  /** Nombres de los festivos que toca el turno (puede estar vacío). */
  festivos: string[];
  /** true si el turno terminó en un día distinto al que empezó. */
  cruzaMedianoche: boolean;

  /**
   * Equivalente en horas ordinarias aplicando los recargos configurados.
   * Sirve como referencia de costo; el valor monetario lo define GPI.
   */
  horasEquivalentes: number;
}

function desgloseVacio(error?: string): DesgloseJornada {
  return {
    valido: error === undefined,
    error,
    totalMinutos: 0,
    almuerzoMinutos: 0,
    minutosTrabajados: 0,
    jornadaOrdinariaMinutos: 0,
    diaLaboral: true,
    ordinariaDiurna: 0,
    ordinariaNocturna: 0,
    extraDiurna: 0,
    extraNocturna: 0,
    dominicalDiurna: 0,
    dominicalNocturna: 0,
    extraDominicalDiurna: 0,
    extraDominicalNocturna: 0,
    ordinarias: 0,
    extras: 0,
    minutosNocturnos: 0,
    minutosDominicales: 0,
    esDominicalFestivo: false,
    festivos: [],
    cruzaMedianoche: false,
    horasEquivalentes: 0,
  };
}

function minutosDeHora(hora: string, porDefecto: number): number {
  return minutosDesdeHora(hora) ?? porDefecto;
}

/** Duración máxima admitida para un turno (24 horas). */
const MAX_MINUTOS_TURNO = 24 * 60;

/**
 * REGLA DEL ALMUERZO — pendiente de confirmar con GPI.
 *
 * El horario del mes dice cuántas horas de almuerzo tiene cada día laboral,
 * pero el empleado solo registra su hora de entrada y su hora de salida. Para
 * saber si dentro de ese rango hubo almuerzo se aplica una regla pragmática:
 *
 *   · En un día LABORAL, si el turno dura más de 6 horas se descuenta el
 *     almuerzo del día (normalmente 1 hora).
 *   · En turnos de 6 horas o menos NO se descuenta nada (no dio tiempo de
 *     almorzar en la jornada).
 *   · En días NO laborales (sábado, domingo o festivo) tampoco se descuenta:
 *     todo el tiempo es trabajo con recargo.
 *
 * El almuerzo se ubica en el centro del tramo ordinario del turno, que es lo
 * que ocurre en la práctica (empezando a las 8:00 a. m., cae alrededor del
 * mediodía). Esto solo afecta a la clasificación diurna/nocturna de esos
 * minutos, no a su cantidad.
 *
 * Está documentada también en `docs/ADMIN.md` para que GPI la confirme o la
 * ajuste.
 */
const UMBRAL_ALMUERZO_MINUTOS = 6 * 60;

/**
 * Calcula el desglose de una jornada minuto a minuto.
 *
 * @param startAt   Instante de inicio (Date o ISO string).
 * @param endAt     Instante de fin (Date o ISO string). Puede ser del día siguiente.
 * @param workDate  Día laboral `YYYY-MM-DD` al que se imputa la jornada.
 * @param config    Parámetros de cálculo (por defecto, los de `jornadaConfigDefaults`).
 * @param horarios  Horarios mensuales de GPI indexados por `"YYYY-MM"`. Si no
 *                  se pasa (o el mes no está cargado) se usa el horario
 *                  semanal por defecto de `config`.
 */
export function calcularJornada(
  startAt: Date | string,
  endAt: Date | string,
  workDate: string,
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
): DesgloseJornada {
  const inicio = typeof startAt === "string" ? new Date(startAt) : startAt;
  const fin = typeof endAt === "string" ? new Date(endAt) : endAt;

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return desgloseVacio("Las horas de inicio y fin no son válidas.");
  }

  const totalMinutos = Math.round((fin.getTime() - inicio.getTime()) / 60_000);

  if (totalMinutos <= 0) {
    return desgloseVacio(
      "La hora de finalización debe ser posterior a la de inicio. Si el turno terminó después de medianoche, marca la casilla «terminó al día siguiente».",
    );
  }
  if (totalMinutos > MAX_MINUTOS_TURNO) {
    return desgloseVacio(
      "Una jornada no puede durar más de 24 horas. Revisa las horas ingresadas.",
    );
  }

  const inicioNocturno = minutosDeHora(config.inicioNocturno, 19 * 60);
  const finNocturno = minutosDeHora(config.finNocturno, 6 * 60);

  const esNocturno = (minutosDelDia: number): boolean =>
    inicioNocturno > finNocturno
      ? minutosDelDia >= inicioNocturno || minutosDelDia < finNocturno
      : minutosDelDia >= inicioNocturno && minutosDelDia < finNocturno;

  /* ---- Horario del mes que rige cada fecha (con caché por día) ---- */
  const semanaPorDefecto = normalizarHorarioDias(
    config.horarioSemanal ?? horarioPredeterminado,
    horarioPredeterminado,
  );
  const cacheDias = new Map<string, HorarioDias>();
  const diasDe = (fecha: string): HorarioDias => {
    let dias = cacheDias.get(fecha);
    if (!dias) {
      dias = horarioDeFecha(fecha, horarios, semanaPorDefecto);
      cacheDias.set(fecha, dias);
    }
    return dias;
  };

  /* ---- Jornada ordinaria del día laboral imputado ---------------- */
  const fechaBase = /^\d{4}-\d{2}-\d{2}$/.test(workDate)
    ? workDate
    : partesLocales(inicio).fecha;

  const horarioBase =
    diasDe(fechaBase)[claveDiaSemana(diaSemanaDeFecha(fechaBase))];
  const festivoBase = nombreFestivo(fechaBase);

  // Día laboral = el horario del mes lo marca como laboral y no es festivo.
  // Sábado, domingo, festivo o día apagado en el horario → jornada ordinaria 0:
  // todo el turno se paga como extra con tratamiento dominical/festivo.
  const diaLaboral = horarioBase !== null && festivoBase === null;
  const jornadaOrdinariaMinutos = diaLaboral ? minutosJornadaDia(horarioBase) : 0;

  // Regla del almuerzo (ver comentario de UMBRAL_ALMUERZO_MINUTOS).
  const almuerzoMinutos =
    diaLaboral && totalMinutos > UMBRAL_ALMUERZO_MINUTOS
      ? Math.min(minutosAlmuerzoDia(horarioBase), totalMinutos)
      : 0;

  // Tramo ordinario medido en tiempo transcurrido desde la entrada: la jornada
  // neta más el almuerzo que ocurre dentro de ella. Con el horario de GPI
  // (8,5 h netas + 1 h de almuerzo) el reloj de las extras empieza a las 5:30
  // p. m. para quien entró a las 8:00 a. m., que es justo lo esperado.
  const limiteTranscurrido = Math.min(
    totalMinutos,
    jornadaOrdinariaMinutos + almuerzoMinutos,
  );

  // Ventana de almuerzo, centrada en ese tramo ordinario.
  const almuerzoDesde =
    almuerzoMinutos > 0
      ? Math.max(0, Math.round((limiteTranscurrido - almuerzoMinutos) / 2))
      : -1;
  const almuerzoHasta = almuerzoDesde + almuerzoMinutos;

  const resultado = desgloseVacio();
  resultado.valido = true;
  resultado.totalMinutos = totalMinutos;
  resultado.almuerzoMinutos = almuerzoMinutos;
  resultado.minutosTrabajados = totalMinutos - almuerzoMinutos;
  resultado.jornadaOrdinariaMinutos = jornadaOrdinariaMinutos;
  resultado.diaLaboral = diaLaboral;

  const festivos = new Set<string>();

  for (let i = 0; i < totalMinutos; i += 1) {
    // El almuerzo no es tiempo de trabajo: no entra en ninguna categoría.
    if (almuerzoMinutos > 0 && i >= almuerzoDesde && i < almuerzoHasta) continue;

    const instante = new Date(inicio.getTime() + i * 60_000);
    const { fecha, minutosDelDia, diaSemana } = partesLocales(instante);

    const festivo = nombreFestivo(fecha);
    if (festivo) festivos.add(festivo);

    // Se evalúa con la fecha REAL de cada minuto: un turno que cruza la
    // medianoche hacia un domingo o un festivo cambia de tratamiento a partir
    // de las 12:00 a. m.
    const noLaboral = diasDe(fecha)[claveDiaSemana(diaSemana)] === null;
    const dominical = diaSemana === 0 || festivo !== null || noLaboral;
    const nocturno = esNocturno(minutosDelDia);
    const extra = i >= limiteTranscurrido;

    if (dominical) {
      if (extra) {
        if (nocturno) resultado.extraDominicalNocturna += 1;
        else resultado.extraDominicalDiurna += 1;
      } else if (nocturno) {
        resultado.dominicalNocturna += 1;
      } else {
        resultado.dominicalDiurna += 1;
      }
    } else if (extra) {
      if (nocturno) resultado.extraNocturna += 1;
      else resultado.extraDiurna += 1;
    } else if (nocturno) {
      resultado.ordinariaNocturna += 1;
    } else {
      resultado.ordinariaDiurna += 1;
    }

    if (nocturno) resultado.minutosNocturnos += 1;
    if (dominical) resultado.minutosDominicales += 1;
  }

  resultado.ordinarias =
    resultado.ordinariaDiurna +
    resultado.ordinariaNocturna +
    resultado.dominicalDiurna +
    resultado.dominicalNocturna;

  resultado.extras =
    resultado.extraDiurna +
    resultado.extraNocturna +
    resultado.extraDominicalDiurna +
    resultado.extraDominicalNocturna;

  resultado.festivos = [...festivos];
  resultado.esDominicalFestivo = resultado.minutosDominicales > 0;
  resultado.cruzaMedianoche =
    partesLocales(inicio).fecha !== partesLocales(new Date(fin.getTime() - 1)).fecha;

  const r = { ...jornadaConfigDefaults.recargos, ...(config.recargos ?? {}) };
  const equivalente =
    resultado.ordinariaDiurna * 1 +
    resultado.ordinariaNocturna * (1 + r.nocturno) +
    resultado.extraDiurna * (1 + r.extraDiurna) +
    resultado.extraNocturna * (1 + r.extraNocturna) +
    resultado.dominicalDiurna * (1 + r.dominicalFestivo) +
    resultado.dominicalNocturna * (1 + r.dominicalFestivo + r.nocturno) +
    resultado.extraDominicalDiurna * (1 + r.extraDominicalDiurna) +
    resultado.extraDominicalNocturna * (1 + r.extraDominicalNocturna);

  resultado.horasEquivalentes = Math.round((equivalente / 60) * 100) / 100;

  return resultado;
}

/* ------------------------------------------------------------------ */
/* Formateo para la interfaz                                           */
/* ------------------------------------------------------------------ */

/** 510 → "8 h 30 min"; 480 → "8 h"; 45 → "45 min". */
export function formatearDuracion(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return "0 min";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/**
 * Versión compacta para el tablero de métricas: 510 → "8h 30m"; 480 → "8h";
 * 45 → "45m". Es el formato que piden las tarjetas y los tooltips (menos
 * ancho que "8 h 30 min", que se sigue usando en las fichas de aprobación).
 */
export function formatearHoras(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return "0h";
  const total = Math.round(minutos);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "2026-07-27" → "27/07/2026" (formato de fecha de toda la interfaz). */
export function formatearFechaNumerica(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-07-27" → "lunes, 27 de julio de 2026". */
export function formatearFechaLarga(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const [y, m, d] = fecha.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc);
}

/** "2026-07-27" → "27 jul 2026" (versión compacta para tablas). */
export function formatearFechaCorta(fecha: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const [y, m, d] = fecha.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(utc);
}

/** Convierte "HH:MM" de 24 h a "7:00 a. m." (como el formulario anterior). */
export function formatearHora12(hora: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora ?? "");
  if (!match) return hora ?? "";
  const h = Number(match[1]);
  const m = match[2];
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${sufijo}`;
}

/* ------------------------------------------------------------------ */
/* Normalización de la configuración guardada en Supabase              */
/* ------------------------------------------------------------------ */

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numeroOr(value: unknown, porDefecto: number): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : porDefecto;
}

function horaOr(value: unknown, porDefecto: string): string {
  return typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value)
    ? value
    : porDefecto;
}

/**
 * Convierte el JSON guardado en `site_settings.jornada_config` en una
 * `JornadaConfig` completa, rellenando con los valores por defecto lo que falte
 * o venga mal escrito. Nunca lanza: el portal debe funcionar sin base de datos.
 */
export function normalizarJornadaConfig(value: unknown): JornadaConfig {
  if (!esObjeto(value)) return jornadaConfigDefaults;

  const recargosRaw = esObjeto(value.recargos) ? value.recargos : {};
  const d = jornadaConfigDefaults;

  return {
    jornadaOrdinariaInicio: horaOr(
      value.jornadaOrdinariaInicio,
      d.jornadaOrdinariaInicio,
    ),
    jornadaOrdinariaFin: horaOr(value.jornadaOrdinariaFin, d.jornadaOrdinariaFin),
    horasOrdinariasDia: Math.min(
      24,
      Math.max(1, numeroOr(value.horasOrdinariasDia, d.horasOrdinariasDia)),
    ),
    // Horario semanal por defecto: si `jornada_config` todavía no lo trae
    // (bases anteriores a la migración 0003) se usa el horario de GPI.
    horarioSemanal: normalizarHorarioDias(
      value.horarioSemanal,
      d.horarioSemanal,
    ),
    inicioNocturno: horaOr(value.inicioNocturno, d.inicioNocturno),
    finNocturno: horaOr(value.finNocturno, d.finNocturno),
    // Claves nuevas: si `jornada_config` todavía no las trae (la migración 0002
    // no las sembró), se usan los topes legales por defecto. No hace falta
    // ninguna migración adicional para que el tablero funcione.
    limiteExtrasDia: Math.min(
      24,
      Math.max(0, numeroOr(value.limiteExtrasDia, d.limiteExtrasDia)),
    ),
    limiteExtrasSemana: Math.min(
      168,
      Math.max(0, numeroOr(value.limiteExtrasSemana, d.limiteExtrasSemana)),
    ),
    recargos: {
      extraDiurna: numeroOr(recargosRaw.extraDiurna, d.recargos.extraDiurna),
      extraNocturna: numeroOr(recargosRaw.extraNocturna, d.recargos.extraNocturna),
      nocturno: numeroOr(recargosRaw.nocturno, d.recargos.nocturno),
      dominicalFestivo: numeroOr(
        recargosRaw.dominicalFestivo,
        d.recargos.dominicalFestivo,
      ),
      extraDominicalDiurna: numeroOr(
        recargosRaw.extraDominicalDiurna,
        d.recargos.extraDominicalDiurna,
      ),
      extraDominicalNocturna: numeroOr(
        recargosRaw.extraDominicalNocturna,
        d.recargos.extraDominicalNocturna,
      ),
    },
  };
}

/* ------------------------------------------------------------------ */
/* DESGLOSE CONGELADO (migración 0004)                                 */
/* ------------------------------------------------------------------ */

/**
 * EL PROBLEMA QUE RESUELVE ESTA SECCIÓN
 * -------------------------------------
 * `calcularJornada` es una función pura: con el mismo turno, pero con OTRO
 * horario del mes o otros porcentajes de recargo, devuelve otro resultado. Eso
 * está bien mientras la jornada está pendiente, pero es inaceptable para nómina:
 * si en septiembre alguien corrige el horario de julio, cambiarían los reportes
 * de jornadas ya aprobadas y pagadas.
 *
 * Solución: al APROBAR se calcula una vez y se guarda el resultado (`desglose`)
 * junto con el contexto que se usó (`contexto_calculo`) y el momento
 * (`calculado_at`). Desde entonces esa jornada muestra siempre lo mismo.
 *
 * REGLA DE LECTURA ÚNICA: todos los consumidores —aprobaciones, tablero de
 * métricas, CSV de nómina e historial del empleado— leen el desglose con
 * `obtenerDesglose()`, nunca llamando a `calcularJornada` por su cuenta. Si hay
 * snapshot lo usa; si no, calcula en vivo. Así el comportamiento es idéntico con
 * la migración 0004 aplicada o sin aplicar.
 */

/** Versión del formato del snapshot, por si algún día cambia su estructura. */
export const VERSION_CONTEXTO_CALCULO = 1;

/**
 * Todo lo que se usó para calcular una jornada, guardado tal cual.
 * Es el respaldo de auditoría: permite explicarle a una persona POR QUÉ salió
 * ese número aunque después se cambie el horario del mes o un recargo.
 */
export interface ContextoCalculo {
  version: number;
  /** Mes del horario aplicado, `"YYYY-MM"` (`""` si la fecha no era válida). */
  mes: string;
  /** Ese mes en palabras: "julio de 2026". */
  mesEtiqueta: string;
  /** Horario del día trabajado. `null` = ese día no era laboral. */
  horarioDia: HorarioDia | null;
  /** Resumen legible del horario semanal de ese mes. */
  horarioSemana: string;
  /** false = día no laboral o festivo: todo el turno va con recargo. */
  diaLaboral: boolean;
  /** Nombre del festivo del día imputado, si lo era. */
  festivo: string | null;
  /** Jornada ordinaria neta de ese día, en minutos. */
  jornadaOrdinariaMinutos: number;
  /** Franja nocturna vigente al calcular. */
  inicioNocturno: string;
  finNocturno: string;
  /** Porcentajes de recargo vigentes al calcular. */
  recargos: JornadaRecargos;
  /** Topes de horas extra vigentes al calcular. */
  limiteExtrasDia: number;
  limiteExtrasSemana: number;
}

/** Lo mínimo que necesita `obtenerDesglose` de una fila de `jornadas`. */
export interface JornadaCalculable {
  start_at: string;
  end_at: string;
  work_date: string;
  /** Snapshot guardado al aprobar. `undefined` si la 0004 no está aplicada. */
  desglose?: unknown;
  contexto_calculo?: unknown;
  calculado_at?: string | null;
}

export interface DesgloseResuelto {
  desglose: DesgloseJornada;
  /** true = viene del snapshot guardado al aprobar; ya no cambia nunca. */
  congelado: boolean;
  /** Contexto del snapshot o, si se calculó en vivo, el contexto vigente. */
  contexto: ContextoCalculo | null;
  /** Instante ISO en que se congeló; `null` si se calculó en vivo. */
  calculadoEn: string | null;
}

/**
 * Reconstruye el contexto de cálculo de un día laboral con el horario y la
 * configuración que rigen AHORA. Es lo que se persiste al aprobar y también lo
 * que se muestra como referencia mientras la jornada sigue pendiente.
 */
export function construirContextoCalculo(
  workDate: string,
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
): ContextoCalculo {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(workDate) ? workDate : "";

  const semanaPorDefecto = normalizarHorarioDias(
    config.horarioSemanal ?? horarioPredeterminado,
    horarioPredeterminado,
  );
  const dias = fecha
    ? horarioDeFecha(fecha, horarios, semanaPorDefecto)
    : semanaPorDefecto;

  const horarioDia = fecha ? dias[claveDiaSemana(diaSemanaDeFecha(fecha))] : null;
  const festivo = fecha ? nombreFestivo(fecha) : null;
  const diaLaboral = horarioDia !== null && festivo === null;

  const mes = mesDeFecha(fecha);
  const anio = Number(mes.slice(0, 4));
  const numeroMes = Number(mes.slice(5, 7));
  const mesValido =
    Number.isInteger(anio) && Number.isInteger(numeroMes) && numeroMes >= 1 && numeroMes <= 12;

  return {
    version: VERSION_CONTEXTO_CALCULO,
    mes,
    mesEtiqueta: mesValido ? etiquetaMes(anio, numeroMes) : "",
    horarioDia: horarioDia ? { ...horarioDia } : null,
    horarioSemana: resumenHorario(dias),
    diaLaboral,
    festivo,
    jornadaOrdinariaMinutos: diaLaboral ? minutosJornadaDia(horarioDia) : 0,
    inicioNocturno: config.inicioNocturno,
    finNocturno: config.finNocturno,
    recargos: { ...jornadaConfigDefaults.recargos, ...(config.recargos ?? {}) },
    limiteExtrasDia: config.limiteExtrasDia,
    limiteExtrasSemana: config.limiteExtrasSemana,
  };
}

/** Minutos leídos de un JSON: nunca negativos, siempre enteros. */
function minutosGuardados(value: unknown): number {
  const n = numeroOr(value, 0);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Convierte el JSON de `jornadas.desglose` en un `DesgloseJornada` completo.
 *
 * Devuelve `null` cuando NO hay snapshot utilizable (columna inexistente porque
 * la 0004 no está aplicada, jornada nunca aprobada, o JSON incompleto): en ese
 * caso el llamador calcula en vivo. Nunca lanza.
 */
export function normalizarDesglose(value: unknown): DesgloseJornada | null {
  if (!esObjeto(value)) return null;
  if (value.valido === false) return null;

  const totalMinutos = minutosGuardados(value.totalMinutos);
  // Un snapshot sin duración no explica nada: se trata como ausente.
  if (totalMinutos <= 0) return null;

  return {
    valido: true,
    totalMinutos,
    almuerzoMinutos: minutosGuardados(value.almuerzoMinutos),
    minutosTrabajados: minutosGuardados(value.minutosTrabajados),
    jornadaOrdinariaMinutos: minutosGuardados(value.jornadaOrdinariaMinutos),
    diaLaboral: value.diaLaboral !== false,
    ordinariaDiurna: minutosGuardados(value.ordinariaDiurna),
    ordinariaNocturna: minutosGuardados(value.ordinariaNocturna),
    extraDiurna: minutosGuardados(value.extraDiurna),
    extraNocturna: minutosGuardados(value.extraNocturna),
    dominicalDiurna: minutosGuardados(value.dominicalDiurna),
    dominicalNocturna: minutosGuardados(value.dominicalNocturna),
    extraDominicalDiurna: minutosGuardados(value.extraDominicalDiurna),
    extraDominicalNocturna: minutosGuardados(value.extraDominicalNocturna),
    ordinarias: minutosGuardados(value.ordinarias),
    extras: minutosGuardados(value.extras),
    minutosNocturnos: minutosGuardados(value.minutosNocturnos),
    minutosDominicales: minutosGuardados(value.minutosDominicales),
    esDominicalFestivo: value.esDominicalFestivo === true,
    festivos: Array.isArray(value.festivos)
      ? value.festivos.filter((f): f is string => typeof f === "string")
      : [],
    cruzaMedianoche: value.cruzaMedianoche === true,
    horasEquivalentes: numeroOr(value.horasEquivalentes, 0),
  };
}

/**
 * Convierte el JSON de `jornadas.contexto_calculo` en un `ContextoCalculo`.
 * Devuelve `null` si no hay nada legible. Nunca lanza.
 */
export function normalizarContextoCalculo(value: unknown): ContextoCalculo | null {
  if (!esObjeto(value)) return null;

  const d = jornadaConfigDefaults;
  const diaBruto = esObjeto(value.horarioDia) ? value.horarioDia : null;
  const recargosBrutos = esObjeto(value.recargos) ? value.recargos : {};

  const horarioDia: HorarioDia | null =
    diaBruto &&
    minutosDesdeHora(diaBruto.inicio) !== null &&
    minutosDesdeHora(diaBruto.fin) !== null
      ? {
          inicio: String(diaBruto.inicio),
          fin: String(diaBruto.fin),
          almuerzoHoras: Math.max(0, numeroOr(diaBruto.almuerzoHoras, 0)),
        }
      : null;

  return {
    version: numeroOr(value.version, VERSION_CONTEXTO_CALCULO),
    mes: typeof value.mes === "string" ? value.mes : "",
    mesEtiqueta: typeof value.mesEtiqueta === "string" ? value.mesEtiqueta : "",
    horarioDia,
    horarioSemana:
      typeof value.horarioSemana === "string" ? value.horarioSemana : "",
    diaLaboral: value.diaLaboral !== false,
    festivo: typeof value.festivo === "string" && value.festivo ? value.festivo : null,
    jornadaOrdinariaMinutos: minutosGuardados(value.jornadaOrdinariaMinutos),
    inicioNocturno: horaOr(value.inicioNocturno, d.inicioNocturno),
    finNocturno: horaOr(value.finNocturno, d.finNocturno),
    recargos: {
      extraDiurna: numeroOr(recargosBrutos.extraDiurna, d.recargos.extraDiurna),
      extraNocturna: numeroOr(recargosBrutos.extraNocturna, d.recargos.extraNocturna),
      nocturno: numeroOr(recargosBrutos.nocturno, d.recargos.nocturno),
      dominicalFestivo: numeroOr(
        recargosBrutos.dominicalFestivo,
        d.recargos.dominicalFestivo,
      ),
      extraDominicalDiurna: numeroOr(
        recargosBrutos.extraDominicalDiurna,
        d.recargos.extraDominicalDiurna,
      ),
      extraDominicalNocturna: numeroOr(
        recargosBrutos.extraDominicalNocturna,
        d.recargos.extraDominicalNocturna,
      ),
    },
    limiteExtrasDia: numeroOr(value.limiteExtrasDia, d.limiteExtrasDia),
    limiteExtrasSemana: numeroOr(value.limiteExtrasSemana, d.limiteExtrasSemana),
  };
}

/**
 * **REGLA DE LECTURA ÚNICA del desglose de una jornada.**
 *
 * Si la jornada tiene desglose congelado (se aprobó estando la migración 0004
 * aplicada) devuelve ese, marcado con `congelado: true`. Si no, lo calcula en
 * vivo con el horario y la configuración actuales, como se hacía siempre.
 *
 * La usan la pantalla de aprobaciones, el tablero de métricas (KPIs, gráficas,
 * control semanal y CSV) y el historial del empleado. Nadie más debería llamar
 * a `calcularJornada` sobre una jornada YA GUARDADA: la única excepción legítima
 * es la vista previa del formulario, donde todavía no hay fila en la base.
 */
export function obtenerDesglose(
  jornada: JornadaCalculable,
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
): DesgloseResuelto {
  const guardado = normalizarDesglose(jornada.desglose);

  if (guardado) {
    return {
      desglose: guardado,
      congelado: true,
      contexto: normalizarContextoCalculo(jornada.contexto_calculo),
      calculadoEn:
        typeof jornada.calculado_at === "string" && jornada.calculado_at
          ? jornada.calculado_at
          : null,
    };
  }

  return {
    desglose: calcularJornada(
      jornada.start_at,
      jornada.end_at,
      jornada.work_date,
      config,
      horarios,
    ),
    congelado: false,
    contexto: construirContextoCalculo(jornada.work_date, config, horarios),
    calculadoEn: null,
  };
}

/** "1 h de almuerzo" · "0,5 h de almuerzo" · "" si no hay almuerzo. */
function textoAlmuerzo(horas: number): string {
  if (!Number.isFinite(horas) || horas <= 0) return "";
  return `${horas.toLocaleString("es-CO", { maximumFractionDigits: 2 })} h de almuerzo`;
}

/**
 * Explicación en lenguaje llano de un cálculo congelado, para mostrarla al
 * pasar el cursor o como nota al pie. Por ejemplo:
 *
 *   «Cálculo congelado el 28/07/2026 con el horario de julio de 2026
 *    (Lunes a jueves 08:00–17:30 · Viernes 08:00–17:00; 1 h de almuerzo).
 *    Cambiar después el horario del mes o los recargos ya no altera esta
 *    jornada.»
 */
export function textoCalculoCongelado(
  contexto: ContextoCalculo | null,
  calculadoEn: string | null,
): string {
  const fecha = calculadoEn ? fechaColombia(calculadoEn) : "";
  const cuando = fecha ? ` el ${formatearFechaNumerica(fecha)}` : "";

  let conQue = "";
  if (contexto?.mesEtiqueta) {
    const detalles = [
      contexto.horarioSemana,
      textoAlmuerzo(contexto.horarioDia?.almuerzoHoras ?? 0),
    ].filter((d) => d !== "");
    conQue = ` con el horario de ${contexto.mesEtiqueta}${
      detalles.length > 0 ? ` (${detalles.join("; ")})` : ""
    }`;
  }

  return `Cálculo congelado${cuando}${conQue}. Cambiar después el horario del mes o los recargos ya no altera esta jornada.`;
}

/**
 * ¿El error de Supabase se debe a que las columnas de la migración 0004
 * todavía no existen?
 *
 * Se usa para REINTENTAR la escritura sin el snapshot: aprobar, rechazar,
 * reabrir y editar jornadas deben seguir funcionando con la 0004 sin aplicar,
 * igual que el resto del panel tolera migraciones pendientes.
 */
export function faltaColumnaDesglose(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;

  const codigo = error.code ?? "";
  // 42703 = undefined_column (Postgres) · PGRST204 = columna ausente del caché
  // de esquema de PostgREST. Las únicas columnas nuevas del proyecto son las de
  // la 0004, así que el código basta para identificar el caso.
  if (codigo === "42703" || codigo === "PGRST204") return true;

  const mensaje = error.message ?? "";
  return (
    /(desglose|contexto_calculo|calculado_at)/i.test(mensaje) &&
    /(does not exist|no existe|schema cache|could not find|find the)/i.test(mensaje)
  );
}
