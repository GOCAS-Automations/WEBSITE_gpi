/**
 * CÁLCULO DE JORNADAS Y HORAS EXTRA
 * =================================
 * Módulo PURO y sin dependencias: lo usan por igual el portal del empleado
 * (vista previa en vivo), la pantalla de aprobaciones de /admin/jornadas y —en
 * el futuro— el tablero de métricas.
 *
 * Zona horaria: todo el cálculo trabaja con la hora de pared de Colombia
 * (America/Bogotá, UTC-5 fijo, sin horario de verano). Así el resultado es el
 * mismo en el navegador del empleado, en el servidor de Vercel y en la base de
 * datos, sin depender de la zona horaria de la máquina.
 *
 * IMPORTANTE: los porcentajes de recargo son PARÁMETROS, no reglas fijas.
 * Salen del ajuste `jornada_config` de Supabase (editable) y aquí solo viven
 * como valores por defecto. GPI debe confirmar sus propias reglas.
 */

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
  /** Horario base de oficina de GPI (referencia informativa). */
  jornadaOrdinariaInicio: string;
  jornadaOrdinariaFin: string;
  /** Horas trabajadas antes de que empiecen a contar las extras. */
  horasOrdinariasDia: number;
  /** Franja nocturna (cruza la medianoche). */
  inicioNocturno: string;
  finNocturno: string;
  recargos: JornadaRecargos;
}

/**
 * Valores por defecto — normativa laboral colombiana vigente en 2026:
 * jornada ordinaria de 8 horas, franja nocturna desde las 7:00 p. m.
 * (Ley 2101 de 2021) y recargo dominical del 80% (Ley 2466 de 2025).
 * Son AJUSTABLES desde /admin/ajustes cuando GPI confirme sus reglas.
 */
export const jornadaConfigDefaults: JornadaConfig = {
  jornadaOrdinariaInicio: "07:00",
  jornadaOrdinariaFin: "17:00",
  horasOrdinariasDia: 8,
  inicioNocturno: "19:00",
  finNocturno: "06:00",
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

  /** Duración total del turno, en minutos. */
  totalMinutos: number;

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
  const match = /^(\d{1,2}):(\d{2})$/.exec(hora ?? "");
  if (!match) return porDefecto;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return porDefecto;
  return h * 60 + m;
}

/** Duración máxima admitida para un turno (24 horas). */
const MAX_MINUTOS_TURNO = 24 * 60;

/**
 * Calcula el desglose de una jornada minuto a minuto.
 *
 * @param startAt   Instante de inicio (Date o ISO string).
 * @param endAt     Instante de fin (Date o ISO string). Puede ser del día siguiente.
 * @param workDate  Día laboral `YYYY-MM-DD` al que se imputa la jornada.
 * @param config    Parámetros de cálculo (por defecto, los de `jornadaConfigDefaults`).
 */
export function calcularJornada(
  startAt: Date | string,
  endAt: Date | string,
  workDate: string,
  config: JornadaConfig = jornadaConfigDefaults,
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
  const limiteOrdinario = Math.max(
    0,
    Math.round((Number(config.horasOrdinariasDia) || 8) * 60),
  );

  const esNocturno = (minutosDelDia: number): boolean =>
    inicioNocturno > finNocturno
      ? minutosDelDia >= inicioNocturno || minutosDelDia < finNocturno
      : minutosDelDia >= inicioNocturno && minutosDelDia < finNocturno;

  const resultado = desgloseVacio();
  resultado.valido = true;
  resultado.totalMinutos = totalMinutos;

  const festivos = new Set<string>();

  for (let i = 0; i < totalMinutos; i += 1) {
    const instante = new Date(inicio.getTime() + i * 60_000);
    const { fecha, minutosDelDia, diaSemana } = partesLocales(instante);

    const festivo = nombreFestivo(fecha);
    if (festivo) festivos.add(festivo);

    const dominical = diaSemana === 0 || festivo !== null;
    const nocturno = esNocturno(minutosDelDia);
    const extra = i >= limiteOrdinario;

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

  // `workDate` no cambia el cálculo (que usa los instantes reales) pero sí la
  // presentación: se conserva por claridad de la firma y para futuros topes
  // semanales o mensuales que sí dependen del día imputado.
  void workDate;

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
    inicioNocturno: horaOr(value.inicioNocturno, d.inicioNocturno),
    finNocturno: horaOr(value.finNocturno, d.finNocturno),
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
