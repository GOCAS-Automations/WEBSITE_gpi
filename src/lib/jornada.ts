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
 * DÍA PROGRAMADO ≠ DÍA LABORAL (23 sep 2026, decisiones P4 y P5 resueltas)
 * -----------------------------------------------------------------------
 * GPI decidió que la nómina se rija ESTRICTAMENTE por la ley colombiana, así
 * que aquí conviven dos ideas que antes estaban mezcladas:
 *
 *   · **día programado** = el horario del mes tiene turno ese día de la semana
 *     (`horarioBase !== null`). Es lo que define la JORNADA ORDINARIA del día,
 *     aunque ese día caiga un festivo.
 *   · **día laboral** = programado y NO festivo. Solo se usa como indicador de
 *     interfaz y para la regla del almuerzo.
 *
 * De ahí salen las dos reglas nuevas:
 *
 *   · **P4 · Sábado.** Un día SIN horario (sábado, o cualquier día apagado en
 *     el mes) ya no se trata como domingo: su jornada ordinaria es 0 —todo lo
 *     trabajado es extra— pero es **extra NORMAL** (×1,25 de día, ×1,75 de
 *     noche), que es lo que manda la ley. Solo el domingo y los festivos llevan
 *     recargo dominical (art. 179 CST). Un sábado que además sea festivo sigue
 *     siendo festivo.
 *   · **P5 · Festivo o domingo en día programado.** Las horas DENTRO de la
 *     jornada del día se pagan como **festivas ordinarias** (×1,90 hoy) y solo
 *     **el exceso** como extra festiva (×2,15). Antes todo el turno iba como
 *     extra festiva: GPI pagaba de más, lo cual es legal pero no es la ley.
 *
 * DOS JORNADAS EL MISMO DÍA (P6 completo, 23 sep 2026)
 * ---------------------------------------------------
 * GPI confirmó que una persona puede registrar dos jornadas el mismo día (sin
 * cruzarse: el rechazo por solapamiento sigue vigente). La jornada ordinaria
 * del día es **una sola** y se reparte por orden cronológico, y el almuerzo se
 * descuenta **una sola vez**: por eso `calcularJornada` recibe opcionalmente el
 * CONSUMO PREVIO del día (`ConsumoPrevioDia`), que sale de las otras jornadas
 * aprobadas de esa persona ese mismo día que empezaron antes.
 *
 * IMPORTANTE: los porcentajes de recargo son PARÁMETROS, no reglas fijas.
 * Salen del ajuste `jornada_config` de Supabase (editable) y aquí solo viven
 * como valores por defecto. GPI debe confirmar sus propias reglas. La
 * excepción es el recargo DOMINICAL/FESTIVO, que la ley cambia por fecha: ese
 * sale de `recargoDominicalVigente()` (`src/lib/ley-laboral.ts`) con la fecha
 * de cada minuto, y los tres campos dominicales de `jornada_config` quedan
 * como legado (se ignoran).
 *
 * El dinero NO sale de aquí: este módulo clasifica los minutos; lo que se paga
 * lo fijan las tarifas de la nómina (`src/lib/nomina.ts`).
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
import { festivoDeFecha, recargoDominicalVigente } from "@/lib/ley-laboral";

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

export interface JornadaRecargos {
  /*
   * Los tres campos dominicales (`dominicalFestivo`, `extraDominicalDiurna`,
   * `extraDominicalNocturna`) son LEGADO desde el 19 sep 2026: el recargo
   * dominical lo fija la ley por fecha (`recargoDominicalVigente`). Se siguen
   * leyendo de `jornada_config` para no romper nada, pero el cálculo los ignora
   * y el contexto congelado guarda el recargo que de verdad se aplicó.
   */
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
 * semanales netas) y normativa laboral colombiana vigente en 2026:
 *   · franja nocturna desde las 7:00 p. m. (art. 160 CST, modificado por el
 *     art. 10 de la **Ley 2466 de 2025**, vigente desde el 25-dic-2025; antes
 *     era desde las 9:00 p. m. por la Ley 1846 de 2017);
 *   · recargo dominical/festivo **del 90 %** desde el 1-jul-2026 (80 % desde el
 *     1-jul-2025, 100 % desde el 1-jul-2027; art. 179 CST mod. Ley 2466). No se
 *     toma de aquí: sale de `recargoDominicalVigente()` por fecha; los números
 *     dominicales de abajo son legado y solo reflejan el valor de hoy.
 * Los topes de horas extra (2 h al día, 12 h a la semana) son los del artículo
 * 22 de la Ley 50 de 1990, modificado por el art. 13 de la Ley 2466; el tablero
 * solo los usa para avisar, nunca bloquea (lo trabajado siempre se paga).
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
    // Legado: el cálculo usa el recargo de la ley por fecha (hoy 0,90).
    dominicalFestivo: 0.9,
    extraDominicalDiurna: 1.15,
    extraDominicalNocturna: 1.65,
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
 * Nombre del festivo si la fecha `YYYY-MM-DD` lo es; si no, `null`.
 *
 * Desde el 19 sep 2026 los festivos se CALCULAN para cualquier año
 * (`festivosDelAnio` de `src/lib/ley-laboral.ts`: fijos, trasladables con la
 * Ley Emiliani —incluido el 9 de julio desde 2026, Ley 2578— y los de la
 * Pascua). Antes había una tabla escrita a mano solo con 2026, a la que además
 * le faltaba el 13-jul-2026; desde el 1-ene-2027 no habría reconocido ningún
 * festivo.
 */
export function nombreFestivo(fecha: string): string | null {
  return festivoDeFecha(fecha);
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
  /** true = el horario del mes tiene turno ese día (aunque sea festivo). */
  diaProgramado: boolean;
  /**
   * Minutos de la jornada ordinaria del día que ya consumieron OTRAS jornadas
   * aprobadas de esa persona ese mismo día (dos jornadas el mismo día, P6).
   */
  ordinariasPreviasMinutos: number;
  /** true = el almuerzo del día ya se descontó en otra jornada de ese día. */
  almuerzoPrevioDescontado: boolean;
  /**
   * true = el turno transcurrió ÍNTEGRO en franja nocturna (ningún minuto entre
   * las 6:00 a. m. y las 7:00 p. m.): nunca se le descuenta almuerzo.
   */
  turnoNocturno: boolean;

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
    diaProgramado: true,
    ordinariasPreviasMinutos: 0,
    almuerzoPrevioDescontado: false,
    turnoNocturno: false,
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
 * REGLA DEL ALMUERZO — decisión P7, resuelta por GPI el 23 sep 2026.
 *
 * El horario del mes dice cuántas horas de almuerzo tiene cada día laboral,
 * pero el empleado solo registra su hora de entrada y su hora de salida. Para
 * saber si dentro de ese rango hubo almuerzo se aplican TRES reglas, en este
 * orden (la del turno nocturno manda sobre las otras dos):
 *
 *   1. **Turno nocturno: nunca se descuenta.** Un turno nocturno es el que
 *      **no tiene ningún minuto entre las 6:00 a. m. y las 7:00 p. m.**, es
 *      decir, el que transcurre íntegro en franja nocturna (20:00–06:00,
 *      22:00–06:00…). Quien trabaja de noche no interrumpe el turno para
 *      almorzar. Un turno de 16:00 a 02:00 SÍ tiene minutos de día (16:00–19:00),
 *      así que no es nocturno para esta regla.
 *   2. **Día programado** (el horario del mes tiene turno ese día y no es
 *      festivo): se descuenta el almuerzo del horario —1 h en GPI— **solo si el
 *      turno cubre la jornada programada completa**, es decir si la duración
 *      del turno es mayor o igual que la duración programada de ese día
 *      (L–J 8:00–17:30 = 9,5 h; V 8:00–17:00 = 9 h). Un turno de 6 h no
 *      descuenta nada. Así desaparece el salto de la regla anterior, que
 *      convertía 6 h 1 min de turno en 5 h 1 min de trabajo.
 *   3. **Día NO programado** (sábado, domingo o festivo): se descuenta 1 h
 *      **solo si el turno dura 8 horas o más**.
 *
 * Además, si ese día ya se descontó el almuerzo en OTRA jornada de la misma
 * persona (`ConsumoPrevioDia.almuerzoDescontado`), aquí no se vuelve a
 * descontar: el almuerzo del día es uno solo.
 *
 * El almuerzo se ubica en el centro del tramo ordinario del turno, que es lo
 * que ocurre en la práctica (empezando a las 8:00 a. m., cae alrededor del
 * mediodía). Esto solo afecta a la clasificación diurna/nocturna de esos
 * minutos, no a su cantidad.
 */

/** Un turno de un día NO programado descuenta almuerzo desde esta duración. */
export const UMBRAL_ALMUERZO_DIA_NO_PROGRAMADO_MINUTOS = 8 * 60;

/** Lo que se descuenta en un día no programado que llega a ese umbral. */
export const ALMUERZO_DIA_NO_PROGRAMADO_MINUTOS = 60;

/**
 * Franja de DÍA con que se decide si un turno es «nocturno» para la regla del
 * almuerzo: 6:00 a. m. – 7:00 p. m. Es una definición propia y deliberadamente
 * fija (no sale de `jornada_config`), para que «turno nocturno» signifique
 * siempre lo mismo aunque mañana se ajuste la franja de recargo.
 */
export const TURNO_NOCTURNO_DIA_DESDE_MINUTOS = 6 * 60;
export const TURNO_NOCTURNO_DIA_HASTA_MINUTOS = 19 * 60;

/**
 * ¿El turno transcurre ÍNTEGRO en franja nocturna? Es decir, ¿no tiene ningún
 * minuto entre las 6:00 a. m. y las 7:00 p. m.? Un turno de duración cero no
 * cuenta como nocturno.
 */
export function esTurnoNocturno(inicio: Date, totalMinutos: number): boolean {
  if (!(totalMinutos > 0)) return false;
  const primerMinuto = partesLocales(inicio).minutosDelDia;
  for (let i = 0; i < totalMinutos; i += 1) {
    const m = (primerMinuto + i) % 1440;
    if (m >= TURNO_NOCTURNO_DIA_DESDE_MINUTOS && m < TURNO_NOCTURNO_DIA_HASTA_MINUTOS) {
      return false;
    }
  }
  return true;
}

/**
 * Lo que OTRAS jornadas de la misma persona ya consumieron ese mismo día.
 *
 * La jornada ordinaria del día es UNA sola y se reparte por orden cronológico;
 * el almuerzo se descuenta UNA sola vez. Sin esto, dos registros del mismo día
 * recibían cada uno la jornada ordinaria completa (las extras del día se
 * perdían) y cada uno su almuerzo (se descontaba dos veces).
 */
export interface ConsumoPrevioDia {
  /** Minutos ORDINARIOS del día ya usados por las jornadas anteriores. */
  ordinariosUsados: number;
  /** true = alguna de ellas ya descontó el almuerzo del día. */
  almuerzoDescontado: boolean;
}

/** Nada consumido todavía: el valor por defecto de `calcularJornada`. */
export const SIN_CONSUMO_PREVIO: ConsumoPrevioDia = {
  ordinariosUsados: 0,
  almuerzoDescontado: false,
};

/**
 * Suma el consumo de varios desgloses YA RESUELTOS del mismo día: es lo que se
 * le pasa como `previo` a la jornada siguiente (orden cronológico).
 */
export function acumularConsumo(
  desgloses: readonly DesgloseJornada[],
): ConsumoPrevioDia {
  let ordinariosUsados = 0;
  let almuerzoDescontado = false;
  for (const d of desgloses) {
    if (!d || d.valido === false) continue;
    // `ordinarias` son los minutos que esa jornada clasificó DENTRO de la
    // jornada del día (diurnos, nocturnos o dominicales): justo lo que gastó.
    ordinariosUsados += d.ordinarias;
    if (d.almuerzoMinutos > 0 || d.almuerzoPrevioDescontado) almuerzoDescontado = true;
  }
  return { ordinariosUsados, almuerzoDescontado };
}

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
 * @param previo    Lo que ya consumieron ese mismo día las OTRAS jornadas de
 *                  la persona que empezaron antes (jornada ordinaria usada y
 *                  si ya se descontó el almuerzo). Ver `ConsumoPrevioDia`.
 */
export function calcularJornada(
  startAt: Date | string,
  endAt: Date | string,
  workDate: string,
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
  previo: ConsumoPrevioDia | null = null,
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

  // DÍA PROGRAMADO = el horario del mes tiene turno ese día de la semana.
  // Es lo que define la jornada ordinaria, TAMBIÉN cuando ese día es festivo
  // (decisión P5): las horas dentro de esa jornada se pagan como festivas
  // ordinarias y solo el exceso como extra festiva.
  const diaProgramado = horarioBase !== null;
  // DÍA LABORAL = programado y no festivo. Indicador de interfaz y regla del
  // almuerzo; ya NO define la jornada ordinaria.
  const diaLaboral = diaProgramado && festivoBase === null;
  const jornadaOrdinariaMinutos = diaProgramado ? minutosJornadaDia(horarioBase) : 0;

  // Duración PROGRAMADA del día (presencia): jornada neta + almuerzo. Con el
  // horario de GPI, 9,5 h de lunes a jueves y 9 h el viernes.
  const duracionProgramadaMinutos = diaProgramado
    ? minutosJornadaDia(horarioBase) + minutosAlmuerzoDia(horarioBase)
    : 0;

  // Consumo previo del día (dos jornadas el mismo día, P6).
  const ordinariasPreviasMinutos = Math.max(
    0,
    Math.round(numeroOr(previo?.ordinariosUsados, 0)),
  );
  const almuerzoPrevioDescontado = previo?.almuerzoDescontado === true;

  // REGLA DEL ALMUERZO (P7): ver el comentario largo de arriba.
  const turnoNocturno = esTurnoNocturno(inicio, totalMinutos);
  let almuerzoMinutos = 0;
  if (!turnoNocturno && !almuerzoPrevioDescontado) {
    if (diaLaboral) {
      // Solo si el turno cubre la jornada programada completa.
      if (duracionProgramadaMinutos > 0 && totalMinutos >= duracionProgramadaMinutos) {
        almuerzoMinutos = Math.min(minutosAlmuerzoDia(horarioBase), totalMinutos);
      }
    } else if (totalMinutos >= UMBRAL_ALMUERZO_DIA_NO_PROGRAMADO_MINUTOS) {
      almuerzoMinutos = Math.min(ALMUERZO_DIA_NO_PROGRAMADO_MINUTOS, totalMinutos);
    }
  }

  // Tramo ordinario medido en tiempo transcurrido desde la entrada: la jornada
  // neta que QUEDE del día más el almuerzo que ocurre dentro de ella. Con el
  // horario de GPI (8,5 h netas + 1 h de almuerzo) el reloj de las extras
  // empieza a las 5:30 p. m. para quien entró a las 8:00 a. m., que es justo lo
  // esperado; si otra jornada del día ya gastó parte de la jornada ordinaria,
  // el reloj de las extras empieza antes.
  const jornadaDisponibleMinutos = Math.max(
    0,
    jornadaOrdinariaMinutos - ordinariasPreviasMinutos,
  );
  // Sin jornada ordinaria disponible (un sábado, un domingo, o un día cuya
  // jornada ya gastó otra jornada) el tramo ordinario es CERO: todo es extra.
  // Ojo: no se puede escribir `min(total, 0 + almuerzo)`, porque entonces los
  // primeros minutos del turno se contarían como ordinarios.
  const limiteTranscurrido =
    jornadaDisponibleMinutos > 0
      ? Math.min(totalMinutos, jornadaDisponibleMinutos + almuerzoMinutos)
      : 0;

  // Ventana de almuerzo, centrada en el tramo ordinario. Si ese tramo no existe
  // (día sin jornada programada), se centra en el TURNO completo: es donde cae
  // en la práctica, y así no se pega artificialmente a la hora de entrada.
  const tramoDelAlmuerzo =
    jornadaDisponibleMinutos > 0 ? limiteTranscurrido : totalMinutos;
  const almuerzoDesde =
    almuerzoMinutos > 0
      ? Math.max(0, Math.round((tramoDelAlmuerzo - almuerzoMinutos) / 2))
      : -1;
  const almuerzoHasta = almuerzoDesde + almuerzoMinutos;

  const resultado = desgloseVacio();
  resultado.valido = true;
  resultado.totalMinutos = totalMinutos;
  resultado.almuerzoMinutos = almuerzoMinutos;
  resultado.minutosTrabajados = totalMinutos - almuerzoMinutos;
  resultado.jornadaOrdinariaMinutos = jornadaOrdinariaMinutos;
  resultado.diaLaboral = diaLaboral;
  resultado.diaProgramado = diaProgramado;
  resultado.ordinariasPreviasMinutos = ordinariasPreviasMinutos;
  resultado.almuerzoPrevioDescontado = almuerzoPrevioDescontado;
  resultado.turnoNocturno = turnoNocturno;

  const festivos = new Set<string>();

  // Equivalente en horas ordinarias (referencia; el dinero lo fija la nómina).
  // El recargo dominical es el de la LEY en la fecha de cada minuto; los demás
  // recargos salen de `jornada_config`.
  const r = { ...jornadaConfigDefaults.recargos, ...(config.recargos ?? {}) };
  const recargoDelDia = new Map<string, number>();
  let equivalente = 0;

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
    //
    // DOMINICAL = domingo o festivo, y NADA MÁS (decisión P4, 23 sep 2026).
    // Un sábado —o cualquier día apagado en el horario del mes— ya no lleva
    // recargo dominical: su jornada ordinaria es 0, así que todo lo trabajado
    // es hora extra, pero extra NORMAL (art. 168 CST), no festiva.
    const dominical = diaSemana === 0 || festivo !== null;
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

    if (dominical) {
      let d = recargoDelDia.get(fecha);
      if (d === undefined) {
        d = recargoDominicalVigente(fecha);
        recargoDelDia.set(fecha, d);
      }
      equivalente += extra
        ? 1 + (nocturno ? r.extraNocturna : r.extraDiurna) + d
        : 1 + d + (nocturno ? r.nocturno : 0);
    } else if (extra) {
      equivalente += 1 + (nocturno ? r.extraNocturna : r.extraDiurna);
    } else {
      equivalente += nocturno ? 1 + r.nocturno : 1;
    }
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
  /** false = día no laboral o festivo (indicador de interfaz). */
  diaLaboral: boolean;
  /** true = el horario del mes tiene turno ese día, aunque sea festivo. */
  diaProgramado: boolean;
  /** Nombre del festivo del día imputado, si lo era. */
  festivo: string | null;
  /** Jornada ordinaria neta de ese día, en minutos (0 si no está programado). */
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
  // Programado = hay turno ese día en el horario del mes. Es lo que da la
  // jornada ordinaria, también en festivo (decisión P5, 23 sep 2026).
  const diaProgramado = horarioDia !== null;
  const diaLaboral = diaProgramado && festivo === null;

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
    diaProgramado,
    festivo,
    jornadaOrdinariaMinutos: diaProgramado ? minutosJornadaDia(horarioDia) : 0,
    inicioNocturno: config.inicioNocturno,
    finNocturno: config.finNocturno,
    recargos: recargosAplicados(fecha, config),
    limiteExtrasDia: config.limiteExtrasDia,
    limiteExtrasSemana: config.limiteExtrasSemana,
  };
}

/**
 * Los recargos que de verdad se aplican a un día: los de `jornada_config` para
 * nocturno y extras, y el dominical de la LEY en esa fecha (los tres campos
 * dominicales se derivan de él). Es lo que se guarda en el contexto congelado.
 */
function recargosAplicados(fecha: string, config: JornadaConfig): JornadaRecargos {
  const r = { ...jornadaConfigDefaults.recargos, ...(config.recargos ?? {}) };
  const d = recargoDominicalVigente(fecha);
  const dos = (n: number) => Math.round(n * 100) / 100;
  return {
    ...r,
    dominicalFestivo: d,
    extraDominicalDiurna: dos(r.extraDiurna + d),
    extraDominicalNocturna: dos(r.extraNocturna + d),
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
    // Snapshots anteriores al 23 sep 2026 no traen estos campos: se deducen de
    // lo que sí traen (un día con jornada ordinaria era un día programado).
    diaProgramado:
      value.diaProgramado === undefined
        ? value.diaLaboral !== false
        : value.diaProgramado !== false,
    ordinariasPreviasMinutos: minutosGuardados(value.ordinariasPreviasMinutos),
    almuerzoPrevioDescontado: value.almuerzoPrevioDescontado === true,
    turnoNocturno: value.turnoNocturno === true,
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
    diaProgramado:
      value.diaProgramado === undefined
        ? value.diaLaboral !== false
        : value.diaProgramado !== false,
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
  previo: ConsumoPrevioDia | null = null,
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
      previo,
    ),
    congelado: false,
    contexto: construirContextoCalculo(jornada.work_date, config, horarios),
    calculadoEn: null,
  };
}

/**
 * Resuelve el desglose de VARIAS jornadas de la MISMA persona aplicando el
 * consumo previo del día (P6, dos jornadas el mismo día).
 *
 * Las agrupa por `work_date`, las ordena cronológicamente (`start_at`, y el id
 * como desempate para que el reparto sea estable) y va acumulando lo que cada
 * una gasta de la jornada ordinaria y si ya descontó el almuerzo. Las que
 * tienen desglose CONGELADO no se recalculan —siguen siendo su snapshot—, pero
 * sí cuentan para lo que consumieron.
 *
 * Devuelve un `Map` indexado por la propia jornada (identidad de objeto).
 */
export function resolverDesglosesDeUnaPersona<T extends JornadaCalculable>(
  jornadas: readonly T[],
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
): Map<T, DesgloseResuelto> {
  const porDia = new Map<string, T[]>();
  for (const j of jornadas) {
    const dia = typeof j.work_date === "string" ? j.work_date : "";
    const lista = porDia.get(dia) ?? [];
    lista.push(j);
    porDia.set(dia, lista);
  }

  const salida = new Map<T, DesgloseResuelto>();
  for (const lista of porDia.values()) {
    const ordenadas = lista.slice().sort((a, b) => {
      const ca = String(a.start_at ?? "").localeCompare(String(b.start_at ?? ""));
      if (ca !== 0) return ca;
      const ia = (a as { id?: string }).id ?? "";
      const ib = (b as { id?: string }).id ?? "";
      return ia.localeCompare(ib);
    });

    const previos: DesgloseJornada[] = [];
    for (const j of ordenadas) {
      const resuelto = obtenerDesglose(j, config, horarios, acumularConsumo(previos));
      salida.set(j, resuelto);
      previos.push(resuelto.desglose);
    }
  }
  return salida;
}

/** Lo que consumió UNA jornada ya resuelta, con su hora de inicio. */
export interface ConsumoJornadaDia extends ConsumoPrevioDia {
  /** Instante ISO en que empezó, para poder quedarse solo con las anteriores. */
  desde: string;
}

/**
 * Consumo de cada jornada, agrupado por día (`YYYY-MM-DD`). Es lo que el portal
 * le pasa a la vista previa del formulario: con eso, mientras el empleado
 * escribe, ya se ve cuánta jornada ordinaria le queda del día y si el almuerzo
 * ya se descontó en otro registro.
 */
export function consumoPorDia<T extends JornadaCalculable>(
  jornadas: readonly T[],
  config: JornadaConfig = jornadaConfigDefaults,
  horarios?: MapaHorarios | null,
): Record<string, ConsumoJornadaDia[]> {
  const resueltos = resolverDesglosesDeUnaPersona(jornadas, config, horarios);
  const salida: Record<string, ConsumoJornadaDia[]> = {};
  for (const [jornada, { desglose }] of resueltos) {
    const dia = typeof jornada.work_date === "string" ? jornada.work_date : "";
    if (!dia || desglose.valido === false) continue;
    (salida[dia] ??= []).push({
      desde: String(jornada.start_at ?? ""),
      ordinariosUsados: desglose.ordinarias,
      almuerzoDescontado: desglose.almuerzoMinutos > 0 || desglose.almuerzoPrevioDescontado,
    });
  }
  for (const lista of Object.values(salida)) {
    lista.sort((a, b) => a.desde.localeCompare(b.desde));
  }
  return salida;
}

/** Suma el consumo de las jornadas del día que empezaron ANTES de `desde`. */
export function consumoAntesDe(
  lista: readonly ConsumoJornadaDia[] | undefined,
  desde: string,
): ConsumoPrevioDia {
  if (!lista || lista.length === 0) return SIN_CONSUMO_PREVIO;
  let ordinariosUsados = 0;
  let almuerzoDescontado = false;
  for (const c of lista) {
    if (!(c.desde < desde)) continue;
    ordinariosUsados += c.ordinariosUsados;
    if (c.almuerzoDescontado) almuerzoDescontado = true;
  }
  return { ordinariosUsados, almuerzoDescontado };
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
