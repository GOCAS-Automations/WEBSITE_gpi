/**
 * REGLAS LABORALES DE COLOMBIA QUE CAMBIAN CON LA FECHA
 * =====================================================
 * Módulo PURO: sin importaciones de ningún tipo. Lo usan `jornada.ts` (festivos
 * y recargo dominical de cada minuto), las pantallas de nómina (valor hora y
 * tarifas mínimas del mes) y los scripts de prueba, que lo ejecutan con
 * `node --experimental-strip-types`.
 *
 * Todo lo que aquí depende de una fecha recibe la fecha como `YYYY-MM-DD`
 * (hora de COLOMBIA: quien llama la saca de `hoyEnColombia()` o de la fecha
 * real de cada minuto trabajado), nunca de `new Date()`.
 *
 * Fuentes (auditoría legal del 19 sep 2026, ver `docs/PLAN.md`):
 *   · Recargo dominical y festivo — art. 179 CST, modificado por el art. 14 de
 *     la Ley 2466 de 2025 (calendario gradual del parágrafo transitorio).
 *   · Jornada máxima semanal — Ley 2101 de 2021, art. 3 (reducción gradual).
 *   · Valor de la hora — salario ÷ (horas semanales ÷ 6 × 30): concepto del
 *     Mintrabajo 02EE2024410600000047075 y art. 4 de la Ley 2101.
 *   · Cómo se combinan los recargos — art. 168 CST (nocturno 35 %, extra diurna
 *     25 %, extra nocturna 75 %, sin acumularse entre sí) y concepto Mintrabajo
 *     02EE2020410600000042136 (el dominical SÍ se suma a la extra y al nocturno).
 *   · Festivos — Ley 51 de 1983 («Ley Emiliani») y Ley 2578 de 2026, art. 6
 *     (9 de julio, Virgen de Chiquinquirá, trasladable, desde 2026).
 *   · Franja nocturna 19:00–06:00 — art. 160 CST, modificado por el art. 10 de
 *     la Ley 2466 de 2025 (vigente desde el 25-dic-2025). Vive en
 *     `jornada_config` (`inicioNocturno`/`finNocturno`), no aquí.
 */

/* ------------------------------------------------------------------ */
/* Recargo dominical y festivo                                         */
/* ------------------------------------------------------------------ */

/** Recargo dominical y festivo (art. 179 CST, mod. Ley 2466 de 2025), por fecha. */
export const CALENDARIO_RECARGO_DOMINICAL = [
  { desde: "0000-01-01", recargo: 0.75 },
  { desde: "2025-07-01", recargo: 0.8 },
  { desde: "2026-07-01", recargo: 0.9 },
  { desde: "2027-07-01", recargo: 1.0 },
] as const;

/**
 * Recargo dominical/festivo vigente en una fecha `YYYY-MM-DD`:
 * 0,75 → 0,80 (1-jul-2025) → 0,90 (1-jul-2026) → 1,00 (1-jul-2027).
 * Una fecha que no se puede leer devuelve el más reciente (el más alto): ante
 * la duda, nunca por debajo de la ley.
 */
export function recargoDominicalVigente(fecha: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return CALENDARIO_RECARGO_DOMINICAL[CALENDARIO_RECARGO_DOMINICAL.length - 1].recargo;
  }
  let vigente: number = CALENDARIO_RECARGO_DOMINICAL[0].recargo;
  for (const tramo of CALENDARIO_RECARGO_DOMINICAL) {
    if (fecha >= tramo.desde) vigente = tramo.recargo;
  }
  return vigente;
}

/* ------------------------------------------------------------------ */
/* Jornada máxima y valor de la hora                                   */
/* ------------------------------------------------------------------ */

/** Jornada máxima legal (Ley 2101 de 2021), por fecha. */
export const CALENDARIO_HORAS_SEMANALES = [
  { desde: "0000-01-01", horas: 48 },
  { desde: "2023-07-15", horas: 47 },
  { desde: "2024-07-15", horas: 46 },
  { desde: "2025-07-15", horas: 44 },
  { desde: "2026-07-15", horas: 42 },
] as const;

/**
 * Horas semanales máximas vigentes en una fecha `YYYY-MM-DD`:
 * 48 → 47 (15-jul-2023) → 46 (15-jul-2024) → 44 (15-jul-2025) → 42 (15-jul-2026).
 */
export function horasSemanalesLegales(fecha: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return CALENDARIO_HORAS_SEMANALES[CALENDARIO_HORAS_SEMANALES.length - 1].horas;
  }
  let vigentes: number = CALENDARIO_HORAS_SEMANALES[0].horas;
  for (const tramo of CALENDARIO_HORAS_SEMANALES) {
    if (fecha >= tramo.desde) vigentes = tramo.horas;
  }
  return vigentes;
}

/**
 * Divisor del valor hora: `horas semanales ÷ 6 × 30` (se divide por 6 aunque la
 * semana sea de 5 días). 48 h → 240 · 46 h → 230 · 44 h → 220 · **42 h → 210**.
 */
export function divisorHorasMes(horasSemanales: number): number {
  const horas = Number.isFinite(horasSemanales) && horasSemanales > 0 ? horasSemanales : 48;
  return Math.round((horas / 6) * 30 * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Factores legales de cada tipo de hora                               */
/* ------------------------------------------------------------------ */

/** Factores sobre el valor de la hora ordinaria, en las claves de la nómina. */
export interface FactoresLegales {
  /** La hora ordinaria misma: referencia (ya está en el salario). */
  horaBase: number;
  /** Recargo nocturno sobre una hora ORDINARIA de noche (35 %). */
  rotacionNocturna: number;
  /** Hora extra diurna, valor completo (1 + 25 %). */
  extraDiurna: number;
  /** Hora extra nocturna, valor completo (1 + 75 %; no se suma el 35 %). */
  extraNocturna: number;
  /** Hora ordinaria en domingo o festivo (1 + d). */
  festivo: number;
  /** Hora extra diurna en domingo o festivo (1,25 + d). */
  extraFestivoDiurna: number;
  /** Hora extra nocturna en domingo o festivo (1,75 + d). */
  extraFestivoNocturna: number;
}

/**
 * Factores ADICIONALES al salario mensual para un recargo dominical `d`.
 * Con d = 0,90 (desde el 1-jul-2026): festivo 1,90 · extra festiva diurna
 * 2,15 · extra festiva nocturna 2,65. Con d = 1,00 (1-jul-2027): 2,00 · 2,25 ·
 * 2,75. La hora ordinaria NOCTURNA en festivo se paga por composición:
 * `festivo + rotacionNocturna` (1 + d + 0,35).
 */
export function factoresLegales(d: number): FactoresLegales {
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    horaBase: 1,
    rotacionNocturna: 0.35,
    extraDiurna: 1.25,
    extraNocturna: 1.75,
    festivo: r(1 + d),
    extraFestivoDiurna: r(1.25 + d),
    extraFestivoNocturna: r(1.75 + d),
  };
}

/* ------------------------------------------------------------------ */
/* Parámetros legales de un mes de nómina                              */
/* ------------------------------------------------------------------ */

export interface ParametrosLegalesMes {
  /** Primer día del mes: la fecha con que se leen las reglas. */
  fecha: string;
  /** Jornada máxima legal ese día. */
  horasSemanalesLegales: number;
  /** Horas con que se calcula el divisor: las del horario del mes, nunca más que las legales. */
  horasSemanales: number;
  /** Valor hora = salario ÷ divisor. */
  divisor: number;
  /** Recargo dominical/festivo vigente ese mes. */
  recargoDominical: number;
  factores: FactoresLegales;
}

/**
 * Lo que la ley exige para liquidar un mes. El recargo dominical cambia siempre
 * un 1 de julio, así que leerlo el día 1 del mes no parte ninguna quincena.
 *
 * `horasPactadas` son las horas semanales del **horario del mes** (hoy 42). Si no
 * hay horario cargado se usan las legales. Nunca se usa un divisor mayor que el
 * legal (más horas → hora más barata): se toma el menor de los dos.
 */
export function parametrosLegalesDelMes(
  anio: number,
  mes: number,
  horasPactadas?: number | null,
): ParametrosLegalesMes {
  const fecha = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const legales = horasSemanalesLegales(fecha);
  const pactadas =
    typeof horasPactadas === "number" && Number.isFinite(horasPactadas) && horasPactadas > 0
      ? horasPactadas
      : legales;
  const horasSemanales = Math.min(pactadas, legales);
  const recargoDominical = recargoDominicalVigente(fecha);
  return {
    fecha,
    horasSemanalesLegales: legales,
    horasSemanales,
    divisor: divisorHorasMes(horasSemanales),
    recargoDominical,
    factores: factoresLegales(recargoDominical),
  };
}

/* ------------------------------------------------------------------ */
/* Festivos de Colombia, para cualquier año                            */
/* ------------------------------------------------------------------ */

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const masDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** El mismo día si es lunes; si no, el lunes siguiente (Ley Emiliani). */
const lunesSiguiente = (d: Date) => {
  const w = d.getUTCDay();
  return w === 1 ? d : masDias(d, (8 - w) % 7);
};

/** Domingo de Pascua (algoritmo gregoriano anónimo de Meeus/Jones/Butcher). */
export function domingoDePascua(anio: number): string {
  const y = anio;
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(utc(y, mes, dia));
}

const cacheFestivos = new Map<number, Readonly<Record<string, string>>>();

/**
 * Festivos nacionales de Colombia de un año, `{ "YYYY-MM-DD": nombre }`.
 *
 *   · Fijos: 1-ene, 1-may, 20-jul, 7-ago, 8-dic y 25-dic.
 *   · Trasladables al lunes siguiente si no caen en lunes (Ley 51 de 1983):
 *     6-ene, 19-mar, 29-jun, 15-ago, 12-oct, 1-nov y 11-nov; y **desde 2026**
 *     el 9-jul (Ley 2578 de 2026, art. 6).
 *   · De la Pascua: Jueves Santo (P−3), Viernes Santo (P−2), Ascensión (P+43),
 *     Corpus Christi (P+64) y Sagrado Corazón (P+71), ya trasladados a lunes.
 *
 * Un festivo fijo que cae en sábado o domingo no se traslada: sigue siendo
 * festivo ese día (1-may, 7-ago y 25-dic de 2027). Memoizado por año.
 */
export function festivosDelAnio(anio: number): Readonly<Record<string, string>> {
  if (!Number.isInteger(anio) || anio < 1984 || anio > 2200) return {};
  const guardado = cacheFestivos.get(anio);
  if (guardado) return guardado;

  const y = anio;
  const p = new Date(`${domingoDePascua(y)}T00:00:00.000Z`);
  const f: Record<string, string> = {};
  // Dos festivos pueden caer el mismo lunes (en 2025, Sagrado Corazón y San
  // Pedro el 30 de junio): el día es uno solo y se nombran los dos.
  const poner = (d: Date, nombre: string) => {
    const clave = iso(d);
    f[clave] = f[clave] ? `${f[clave]} / ${nombre}` : nombre;
  };
  poner(utc(y, 1, 1), "Año Nuevo");
  poner(lunesSiguiente(utc(y, 1, 6)), "Día de los Reyes Magos");
  poner(lunesSiguiente(utc(y, 3, 19)), "Día de San José");
  poner(masDias(p, -3), "Jueves Santo");
  poner(masDias(p, -2), "Viernes Santo");
  poner(utc(y, 5, 1), "Día del Trabajo");
  poner(masDias(p, 43), "Ascensión del Señor");
  poner(masDias(p, 64), "Corpus Christi");
  poner(masDias(p, 71), "Sagrado Corazón de Jesús");
  poner(lunesSiguiente(utc(y, 6, 29)), "San Pedro y San Pablo");
  if (y >= 2026) {
    poner(lunesSiguiente(utc(y, 7, 9)), "Nuestra Señora del Rosario de Chiquinquirá");
  }
  poner(utc(y, 7, 20), "Día de la Independencia");
  poner(utc(y, 8, 7), "Batalla de Boyacá");
  poner(lunesSiguiente(utc(y, 8, 15)), "Asunción de la Virgen");
  poner(lunesSiguiente(utc(y, 10, 12)), "Día de la Raza");
  poner(lunesSiguiente(utc(y, 11, 1)), "Día de Todos los Santos");
  poner(lunesSiguiente(utc(y, 11, 11)), "Independencia de Cartagena");
  poner(utc(y, 12, 8), "Día de la Inmaculada Concepción");
  poner(utc(y, 12, 25), "Navidad");

  // En orden de fecha, para que listarlos sea directo.
  const ordenado = Object.freeze(
    Object.fromEntries(Object.entries(f).sort(([a], [b]) => a.localeCompare(b))),
  );
  cacheFestivos.set(anio, ordenado);
  return ordenado;
}

/** Nombre del festivo si la fecha `YYYY-MM-DD` lo es; si no, `null`. */
export function festivoDeFecha(fecha: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  return festivosDelAnio(Number(fecha.slice(0, 4)))[fecha] ?? null;
}
