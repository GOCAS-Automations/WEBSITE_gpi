/**
 * CÁLCULO DE NÓMINA
 * =================
 * Módulo **PURO**: no toca la base de datos, no lee cookies, no importa nada en
 * tiempo de ejecución (solo tipos). Recibe la configuración del empleado, los
 * minutos ya sumados de sus jornadas **aprobadas** y los conceptos que digita el
 * administrador, y devuelve la liquidación completa. Se puede ejecutar con
 * `node --experimental-strip-types src/lib/nomina.ts`, que es lo que hace el
 * script de pruebas.
 *
 * DE DÓNDE SALE CADA PESO
 * -----------------------
 *   · **Básico** = `salario / 30 × días liquidados`. La convención colombiana de
 *     nómina es mes de 30 días fijos, sin importar si el mes tiene 28 o 31: una
 *     quincena completa (15 días) es exactamente medio salario.
 *   · **Auxilio de transporte** = `auxilio mensual / 30 × días liquidados`.
 *   · **Horas y recargos** = por cada concepto, `horas × tarifa en pesos`. Las
 *     horas salen del **desglose congelado** de las jornadas aprobadas
 *     (`obtenerDesglose()` de `src/lib/jornada.ts`), nunca de un recálculo.
 *   · **Salud y pensión** = porcentajes configurables (4 % y 4 % por defecto)
 *     sobre `básico + horas y recargos`. **No** incluyen el auxilio de
 *     transporte ni los bonos, igual que el Excel de GPI.
 *   · **Conceptos manuales**: bonificaciones, auxilios, comisiones, prima,
 *     vacaciones, bono de cumplimiento y otros devengados; préstamos y otros
 *     descuentos.
 *
 * SEMÁNTICA DE LAS TARIFAS (decisión de diseño, importante)
 * ---------------------------------------------------------
 * El **salario básico cubre las horas ordinarias diurnas**. Las siete tarifas
 * que pidió la gerencia son **valores en pesos por hora que se pagan ADEMÁS**
 * del salario:
 *
 *   | Tarifa                      | Qué paga                                   |
 *   |-----------------------------|--------------------------------------------|
 *   | Hora de rotación diurna     | Referencia y base de derivación. NO se paga aparte: ya está en el salario. |
 *   | Rotación nocturna           | Recargo por cada hora ORDINARIA trabajada de noche. |
 *   | Extra diurna                | Hora extra de día (valor completo).        |
 *   | Extra nocturna              | Hora extra de noche (valor completo).      |
 *   | Hora en festivo             | Hora ordinaria en domingo o festivo.       |
 *   | Extra diurna en festivo     | Hora extra de día en domingo o festivo.    |
 *   | Extra nocturna en festivo   | Hora extra de noche en domingo o festivo.  |
 *
 * La **hora ordinaria NOCTURNA en festivo** no existe como tarifa ni en el
 * Excel de GPI ni en el pedido de la gerencia, pero el desglose de jornadas sí
 * la separa. Se paga por **composición**: `hora en festivo + rotación nocturna`,
 * y aparece como **línea propia** en el desglose para que sea auditable. Es la
 * misma composición que ya usaba `horasEquivalentes` en `src/lib/jornada.ts`.
 *
 * VALORES SUGERIDOS
 * -----------------
 * Al crear la configuración de un empleado, las siete tarifas se **derivan** del
 * salario: `salario / 240 × factor`. Los factores por defecto son los que GPI
 * paga HOY según su Excel (ver `FACTORES_TARIFA`), no los de la ley, porque el
 * encargo es reproducir lo que la empresa paga. **Todos son editables**.
 *
 * REDONDEO
 * --------
 * Todo se paga en **pesos enteros** y se redondea **línea por línea** (cada
 * concepto de horas, el básico, el auxilio, salud y pensión). Así el volante
 * cuadra cuando alguien lo suma a mano —cosa que el Excel de GPI no hace: en el
 * volante real de Santiago Córdoba los devengados impresos suman 1.340.190 pero
 * el total impreso dice 1.340.189, porque la hoja arrastra centavos y solo
 * redondea al mostrar—. El neto coincide al peso con el del Excel; algún
 * subtotal puede diferir en 1 peso por esa misma razón.
 */

import type { DesgloseJornada } from "@/lib/jornada";

/* ================================================================== */
/* 1. Parámetros                                                       */
/* ================================================================== */

/**
 * Divisor con el que el Excel de GPI obtiene el valor de la hora
 * (`salario / 240`). Es el clásico «30 días × 8 horas», anterior a la Ley 2101
 * de 2021; GPI ya trabaja 42 h semanales, así que el divisor real sería menor.
 * **Pendiente de confirmar con GPI** (ver `docs/PLAN.md`): mientras tanto se
 * mantiene 240 porque es lo que la empresa usa hoy, y el valor derivado es solo
 * una sugerencia que el administrador puede sobrescribir.
 */
export const DIVISOR_HORAS_MES = 240;

/** Días de un mes de nómina: siempre 30 (convención colombiana). */
export const DIAS_MES_NOMINA = 30;

/** Días liquidados por defecto en una quincena completa. */
export const DIAS_QUINCENA = 15;

/**
 * Factores con los que se derivan las tarifas sugeridas a partir del valor hora
 * (`salario / 240`).
 *
 * Origen de cada uno:
 *   · `rotacionNocturna` 0,35 — Excel de GPI **y** ley (coinciden).
 *   · `extraDiurna` 1,25 y `extraNocturna` 1,75 — Excel **y** ley (coinciden).
 *   · `festivo` 2,15 — **Excel de GPI**. La ley vigente (Ley 2466 de 2025, que
 *     es lo que trae `jornada_config`) daría 1,80. Se usa el de GPI porque es
 *     lo que la empresa paga hoy. **Pendiente de confirmar.**
 *   · `extraFestivoDiurna` 2,05 — **ley**, no Excel. En el archivo de GPI esta
 *     casilla tiene 2,15, exactamente el mismo número que «hora en festivo»,
 *     lo que delata una fórmula copiada: las filas de plantilla sin usar del
 *     propio Excel llevan valores distintos. Se toma el legal.
 *   · `extraFestivoNocturna` 2,65 — **Excel de GPI** (la ley daría 2,55).
 *
 * OJO: con estos números una hora EXTRA diurna en festivo (2,05) sale más
 * barata que una hora ORDINARIA en festivo (2,15), que es imposible. Es
 * consecuencia directa de la incoherencia del Excel y por eso las tres tarifas
 * festivas están marcadas para confirmar con la gerencia; el formulario del
 * panel avisa en ámbar cuando se da esa inversión.
 */
export const FACTORES_TARIFA = {
  horaBase: 1,
  rotacionNocturna: 0.35,
  extraDiurna: 1.25,
  extraNocturna: 1.75,
  festivo: 2.15,
  extraFestivoDiurna: 2.05,
  extraFestivoNocturna: 2.65,
} as const;

/** Porcentaje de aporte a salud del empleado (Excel de GPI y ley: 4 %). */
export const PCT_SALUD_DEFECTO = 4;
/** Porcentaje de aporte a pensión del empleado (Excel de GPI y ley: 4 %). */
export const PCT_PENSION_DEFECTO = 4;

/* ================================================================== */
/* 2. Tipos                                                            */
/* ================================================================== */

/** Las siete tarifas, en PESOS POR HORA. */
export interface TarifasNomina {
  /** Hora de rotación diurna (VR. HORA). Referencia: no se paga aparte. */
  horaBase: number;
  /** Recargo aditivo por hora ordinaria nocturna. */
  rotacionNocturna: number;
  extraDiurna: number;
  extraNocturna: number;
  /** Hora ordinaria en domingo o festivo. */
  festivo: number;
  extraFestivoDiurna: number;
  extraFestivoNocturna: number;
}

/** Configuración de nómina de UN empleado en UN mes. */
export interface ConfigNomina {
  salarioBasico: number;
  /** Auxilio de transporte MENSUAL completo (se prorratea por días). */
  auxTransporte: number;
  tarifas: TarifasNomina;
  pctSalud: number;
  pctPension: number;
}

/** Conceptos de hora que se pagan (más el informativo de las ordinarias). */
export type ConceptoHora =
  | "ordinariaDiurna"
  | "rotacionNocturna"
  | "extraDiurna"
  | "extraNocturna"
  | "festivo"
  | "festivoNocturno"
  | "extraFestivoDiurna"
  | "extraFestivoNocturna";

/** Conceptos que digita el administrador cada período. */
export type ConceptoManual =
  | "bonificacion"
  | "auxilios"
  | "comisiones"
  | "prima"
  | "vacaciones"
  | "bonoCumplimiento"
  | "otrosDevengados"
  | "prestamos"
  | "otrosDescuentos";

export interface ConceptosManuales {
  valores: Record<ConceptoManual, number>;
  /** Nota opcional por concepto (por qué ese descuento, de qué es el bono…). */
  notas: Partial<Record<ConceptoManual, string>>;
}

/** Minutos trabajados por concepto en el período. */
export type MinutosPorConcepto = Record<ConceptoHora, number>;

export interface LineaHoras {
  clave: ConceptoHora;
  label: string;
  minutos: number;
  /** Minutos convertidos a horas decimales (510 → 8,5). */
  horas: number;
  /** Tarifa aplicada, en pesos por hora. */
  tarifa: number;
  /** `horas × tarifa`, redondeado a pesos enteros. */
  valor: number;
  /** false = ya cubierto por el salario básico; se muestra pero no se suma. */
  sePaga: boolean;
  /** Explicación de la tarifa cuando es compuesta. */
  composicion?: string;
}

export interface LineaManual {
  clave: ConceptoManual;
  label: string;
  valor: number;
  nota: string;
}

/** Resultado completo de liquidar un período. */
export interface LiquidacionCalculada {
  /* --- Entrada usada (queda dentro del snapshot, para auditoría) --- */
  salarioBasico: number;
  auxTransporteMensual: number;
  tarifas: TarifasNomina;
  pctSalud: number;
  pctPension: number;
  dias: number;

  /* --- Devengados --- */
  basico: number;
  auxTransporte: number;
  lineasHoras: LineaHoras[];
  /** Suma de las líneas de horas que SÍ se pagan. */
  totalHoras: number;
  /** Minutos de trabajo que se pagan aparte del salario (sin las ordinarias diurnas). */
  minutosPagados: number;
  /** Minutos ordinarios diurnos: informativos, ya cubiertos por el básico. */
  minutosOrdinarios: number;
  devengadosManuales: LineaManual[];
  totalDevengadosManuales: number;
  totalDevengado: number;

  /* --- Descuentos --- */
  /** Base de salud y pensión: básico + horas y recargos (sin auxilio ni bonos). */
  baseSeguridadSocial: number;
  salud: number;
  pension: number;
  descuentosManuales: LineaManual[];
  totalDescuentosManuales: number;
  totalDescuentos: number;

  /* --- Resultado --- */
  neto: number;
}

/* ================================================================== */
/* 3. Catálogos (etiquetas y mapeo con el desglose de jornadas)         */
/* ================================================================== */

/**
 * MAPEO desglose de jornadas → conceptos de nómina.
 *
 * `campo` es el campo de `DesgloseJornada` (minutos) del que sale cada
 * concepto. Es la tabla que hay que mirar para responder «¿por qué me pagaron
 * esta hora así?».
 */
export const CONCEPTOS_HORA: {
  clave: ConceptoHora;
  label: string;
  descripcion: string;
  campo: keyof DesgloseJornada;
  sePaga: boolean;
}[] = [
  {
    clave: "ordinariaDiurna",
    label: "Horas ordinarias diurnas",
    descripcion:
      "Trabajo normal, de día, dentro del horario del mes. Ya están pagadas por el salario básico: se muestran para cuadrar el total de horas, pero no se suman aparte.",
    campo: "ordinariaDiurna",
    sePaga: false,
  },
  {
    clave: "rotacionNocturna",
    label: "Recargo de rotación nocturna",
    descripcion:
      "Horas ordinarias trabajadas de noche. La hora ya la cubre el salario; esta tarifa es el recargo que se paga además.",
    campo: "ordinariaNocturna",
    sePaga: true,
  },
  {
    clave: "extraDiurna",
    label: "Horas extra diurnas",
    descripcion: "Lo que se trabajó por encima de la jornada del día, de día.",
    campo: "extraDiurna",
    sePaga: true,
  },
  {
    clave: "extraNocturna",
    label: "Horas extra nocturnas",
    descripcion: "Lo que se trabajó por encima de la jornada del día, de noche.",
    campo: "extraNocturna",
    sePaga: true,
  },
  {
    clave: "festivo",
    label: "Horas en domingo o festivo",
    descripcion:
      "Horas ordinarias trabajadas en domingo o festivo (dentro de la jornada del día).",
    campo: "dominicalDiurna",
    sePaga: true,
  },
  {
    clave: "festivoNocturno",
    label: "Horas en domingo o festivo, nocturnas",
    descripcion:
      "Horas ordinarias en domingo o festivo trabajadas de noche. No existe una tarifa propia: se pagan como hora en festivo más el recargo de rotación nocturna.",
    campo: "dominicalNocturna",
    sePaga: true,
  },
  {
    clave: "extraFestivoDiurna",
    label: "Horas extra diurnas en domingo o festivo",
    descripcion:
      "Lo que se trabajó en domingo o festivo por encima de la jornada, de día. En un día no laboral (sábado, domingo o festivo) la jornada ordinaria es cero, así que todo el turno entra aquí.",
    campo: "extraDominicalDiurna",
    sePaga: true,
  },
  {
    clave: "extraFestivoNocturna",
    label: "Horas extra nocturnas en domingo o festivo",
    descripcion:
      "Lo que se trabajó en domingo o festivo por encima de la jornada, de noche.",
    campo: "extraDominicalNocturna",
    sePaga: true,
  },
];

/** Conceptos manuales del período, en el orden en que se muestran. */
export const CONCEPTOS_MANUALES: {
  clave: ConceptoManual;
  label: string;
  tipo: "devengado" | "descuento";
  descripcion: string;
}[] = [
  {
    clave: "bonificacion",
    label: "Bonificación",
    tipo: "devengado",
    descripcion:
      "El «BONO MES» del Excel de GPI. No es salarial: no entra en la base de salud y pensión.",
  },
  {
    clave: "auxilios",
    label: "Auxilios",
    tipo: "devengado",
    descripcion:
      "Auxilios ocasionales del período (alimentación, rodamiento…). El auxilio de transporte NO va aquí: ese se calcula solo.",
  },
  {
    clave: "comisiones",
    label: "Comisiones",
    tipo: "devengado",
    descripcion: "Comisiones del período, cuando el cargo las tiene.",
  },
  {
    clave: "prima",
    label: "Prima de servicios",
    tipo: "devengado",
    descripcion:
      "Solo si la prima se paga dentro de este período (junio y diciembre). El cálculo semestral de la prima es un proceso aparte: aquí se digita el total ya calculado.",
  },
  {
    clave: "vacaciones",
    label: "Vacaciones",
    tipo: "devengado",
    descripcion: "Vacaciones pagadas dentro de este período.",
  },
  {
    clave: "bonoCumplimiento",
    label: "Bono de cumplimiento",
    tipo: "devengado",
    descripcion:
      "El concepto propio que trae el volante actual de GPI, distinto de la bonificación general.",
  },
  {
    clave: "otrosDevengados",
    label: "Otros devengados",
    tipo: "devengado",
    descripcion:
      "Cualquier otro pago del período. Usa la nota para dejar dicho de qué se trata.",
  },
  {
    clave: "prestamos",
    label: "Préstamos y adelantos",
    tipo: "descuento",
    descripcion:
      "La cuota del período. Hoy se digita cada vez: el sistema no lleva el saldo del préstamo.",
  },
  {
    clave: "otrosDescuentos",
    label: "Otros descuentos",
    tipo: "descuento",
    descripcion:
      "Cualquier otro descuento del período. Usa la nota para dejar dicho de qué se trata.",
  },
];

export const CONCEPTOS_MANUALES_DEVENGADOS = CONCEPTOS_MANUALES.filter(
  (c) => c.tipo === "devengado",
);
export const CONCEPTOS_MANUALES_DESCUENTOS = CONCEPTOS_MANUALES.filter(
  (c) => c.tipo === "descuento",
);

/* ================================================================== */
/* 4. Utilidades numéricas                                             */
/* ================================================================== */

/** Un número seguro y no negativo (lo que venga de un JSON puede ser cualquier cosa). */
export function numeroSeguro(value: unknown, porDefecto = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : porDefecto;
}

/** Pesos enteros: nunca decimales, nunca NaN. */
export function pesos(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/** Minutos → horas decimales con dos decimales (510 → 8,5). */
export function horasDeMinutos(minutos: number): number {
  const m = Number.isFinite(minutos) && minutos > 0 ? minutos : 0;
  return Math.round((m / 60) * 100) / 100;
}

/** Tarifas todas en cero (arranque de una configuración vacía). */
export function tarifasVacias(): TarifasNomina {
  return {
    horaBase: 0,
    rotacionNocturna: 0,
    extraDiurna: 0,
    extraNocturna: 0,
    festivo: 0,
    extraFestivoDiurna: 0,
    extraFestivoNocturna: 0,
  };
}

/**
 * Tarifas SUGERIDAS a partir del salario: `salario / 240 × factor`, con dos
 * decimales (la columna de la base de datos es `numeric(14,2)`).
 * Son solo una propuesta: el administrador puede sobrescribir cualquiera.
 */
export function derivarTarifas(salarioBasico: number): TarifasNomina {
  const base = numeroSeguro(salarioBasico) / DIVISOR_HORAS_MES;
  const dos = (n: number) => Math.round(n * 100) / 100;
  return {
    horaBase: dos(base * FACTORES_TARIFA.horaBase),
    rotacionNocturna: dos(base * FACTORES_TARIFA.rotacionNocturna),
    extraDiurna: dos(base * FACTORES_TARIFA.extraDiurna),
    extraNocturna: dos(base * FACTORES_TARIFA.extraNocturna),
    festivo: dos(base * FACTORES_TARIFA.festivo),
    extraFestivoDiurna: dos(base * FACTORES_TARIFA.extraFestivoDiurna),
    extraFestivoNocturna: dos(base * FACTORES_TARIFA.extraFestivoNocturna),
  };
}

/**
 * Tarifa que se le aplica a cada concepto.
 *
 * `festivoNocturno` es la única COMPUESTA: hora en festivo + rotación nocturna.
 * Ver la nota larga de la cabecera del archivo.
 */
export function tarifaDeConcepto(
  clave: ConceptoHora,
  tarifas: TarifasNomina,
): number {
  switch (clave) {
    case "ordinariaDiurna":
      return 0;
    case "rotacionNocturna":
      return numeroSeguro(tarifas.rotacionNocturna);
    case "extraDiurna":
      return numeroSeguro(tarifas.extraDiurna);
    case "extraNocturna":
      return numeroSeguro(tarifas.extraNocturna);
    case "festivo":
      return numeroSeguro(tarifas.festivo);
    case "festivoNocturno":
      return numeroSeguro(tarifas.festivo) + numeroSeguro(tarifas.rotacionNocturna);
    case "extraFestivoDiurna":
      return numeroSeguro(tarifas.extraFestivoDiurna);
    case "extraFestivoNocturna":
      return numeroSeguro(tarifas.extraFestivoNocturna);
  }
}

/** Todos los conceptos de hora en cero. */
export function minutosVacios(): MinutosPorConcepto {
  const vacio = {} as MinutosPorConcepto;
  for (const c of CONCEPTOS_HORA) vacio[c.clave] = 0;
  return vacio;
}

/**
 * Suma los desgloses de varias jornadas y los reparte por concepto de nómina.
 *
 * Los desgloses TIENEN que venir de `obtenerDesglose()` (el congelado al
 * aprobar): este módulo nunca recalcula una jornada ya guardada.
 */
export function sumarMinutos(
  desgloses: readonly DesgloseJornada[],
): MinutosPorConcepto {
  const total = minutosVacios();
  for (const d of desgloses) {
    if (!d || d.valido === false) continue;
    for (const c of CONCEPTOS_HORA) {
      total[c.clave] += numeroSeguro(d[c.campo]);
    }
  }
  return total;
}

/** Conceptos manuales todos en cero y sin notas. */
export function manualesVacios(): ConceptosManuales {
  const valores = {} as Record<ConceptoManual, number>;
  for (const c of CONCEPTOS_MANUALES) valores[c.clave] = 0;
  return { valores, notas: {} };
}

/** Convierte el jsonb de `nomina_liquidaciones.conceptos` en algo con forma. */
export function normalizarManuales(value: unknown): ConceptosManuales {
  const salida = manualesVacios();
  if (!value || typeof value !== "object") return salida;
  const bruto = value as Record<string, unknown>;
  const notas =
    bruto.notas && typeof bruto.notas === "object"
      ? (bruto.notas as Record<string, unknown>)
      : {};

  for (const c of CONCEPTOS_MANUALES) {
    salida.valores[c.clave] = Math.max(0, pesos(numeroSeguro(bruto[c.clave])));
    const nota = notas[c.clave];
    if (typeof nota === "string" && nota.trim() !== "") {
      salida.notas[c.clave] = nota.trim();
    }
  }
  return salida;
}

/** El objeto que se guarda en `nomina_liquidaciones.conceptos`. */
export function manualesAJson(manuales: ConceptosManuales): Record<string, unknown> {
  const salida: Record<string, unknown> = {};
  for (const c of CONCEPTOS_MANUALES) {
    salida[c.clave] = Math.max(0, pesos(numeroSeguro(manuales.valores[c.clave])));
  }
  salida.notas = { ...manuales.notas };
  return salida;
}

/* ================================================================== */
/* 5. El cálculo                                                       */
/* ================================================================== */

export interface EntradaLiquidacion {
  config: ConfigNomina;
  minutos: MinutosPorConcepto;
  /** Días liquidados del período (15 en una quincena completa, 30 en un mes). */
  dias: number;
  manuales: ConceptosManuales;
}

/**
 * Liquida un período. Función pura y total: con cualquier entrada devuelve un
 * resultado con forma (nunca lanza, nunca devuelve NaN).
 *
 * El orden importa para el redondeo: cada línea se redondea a pesos enteros
 * ANTES de sumarse, y salud y pensión se calculan sobre esas líneas ya
 * redondeadas. Ver la nota de la cabecera.
 */
export function calcularLiquidacion(entrada: EntradaLiquidacion): LiquidacionCalculada {
  const { config } = entrada;
  const tarifas = { ...tarifasVacias(), ...(config.tarifas ?? {}) };

  const salarioBasico = Math.max(0, numeroSeguro(config.salarioBasico));
  const auxMensual = Math.max(0, numeroSeguro(config.auxTransporte));
  const pctSalud = Math.min(100, Math.max(0, numeroSeguro(config.pctSalud, PCT_SALUD_DEFECTO)));
  const pctPension = Math.min(
    100,
    Math.max(0, numeroSeguro(config.pctPension, PCT_PENSION_DEFECTO)),
  );
  const dias = Math.min(31, Math.max(0, numeroSeguro(entrada.dias)));

  /* ---- Devengados fijos ---- */
  // Se multiplica ANTES de dividir: `(249.095 / 30) × 15` da 124.547,49999999
  // en coma flotante y se redondearía a 124.547, un peso menos que el volante
  // real de GPI. `(249.095 × 15) / 30` da 124.547,5 exacto → 124.548.
  const basico = pesos((salarioBasico * dias) / DIAS_MES_NOMINA);
  const auxTransporte = pesos((auxMensual * dias) / DIAS_MES_NOMINA);

  /* ---- Horas y recargos ---- */
  const minutos = { ...minutosVacios(), ...(entrada.minutos ?? {}) };
  const lineasHoras: LineaHoras[] = CONCEPTOS_HORA.map((c) => {
    const min = Math.max(0, numeroSeguro(minutos[c.clave]));
    const horas = horasDeMinutos(min);
    const tarifa = tarifaDeConcepto(c.clave, tarifas);
    return {
      clave: c.clave,
      label: c.label,
      minutos: min,
      horas,
      tarifa,
      // Multiplicar antes de dividir, por lo mismo que el básico.
      valor: c.sePaga ? pesos((min * tarifa) / 60) : 0,
      sePaga: c.sePaga,
      composicion:
        c.clave === "festivoNocturno"
          ? "Hora en festivo + recargo de rotación nocturna"
          : undefined,
    };
  });

  const totalHoras = lineasHoras.reduce((s, l) => s + l.valor, 0);
  const minutosPagados = lineasHoras
    .filter((l) => l.sePaga)
    .reduce((s, l) => s + l.minutos, 0);
  const minutosOrdinarios =
    lineasHoras.find((l) => l.clave === "ordinariaDiurna")?.minutos ?? 0;

  /* ---- Conceptos manuales ---- */
  const manuales = entrada.manuales ?? manualesVacios();
  const linea = (c: (typeof CONCEPTOS_MANUALES)[number]): LineaManual => ({
    clave: c.clave,
    label: c.label,
    valor: Math.max(0, pesos(numeroSeguro(manuales.valores?.[c.clave]))),
    nota: manuales.notas?.[c.clave] ?? "",
  });

  const devengadosManuales = CONCEPTOS_MANUALES_DEVENGADOS.map(linea);
  const descuentosManuales = CONCEPTOS_MANUALES_DESCUENTOS.map(linea);
  const totalDevengadosManuales = devengadosManuales.reduce((s, l) => s + l.valor, 0);
  const totalDescuentosManuales = descuentosManuales.reduce((s, l) => s + l.valor, 0);

  /* ---- Seguridad social ---- */
  // Base = básico + horas y recargos. NO incluye auxilio de transporte (nunca
  // es IBC) ni los bonos (GPI los trata como no salariales). Igual que el Excel.
  const baseSeguridadSocial = basico + totalHoras;
  const salud = pesos((baseSeguridadSocial * pctSalud) / 100);
  const pension = pesos((baseSeguridadSocial * pctPension) / 100);

  /* ---- Totales ---- */
  const totalDevengado = basico + auxTransporte + totalHoras + totalDevengadosManuales;
  const totalDescuentos = salud + pension + totalDescuentosManuales;

  return {
    salarioBasico,
    auxTransporteMensual: auxMensual,
    tarifas,
    pctSalud,
    pctPension,
    dias,

    basico,
    auxTransporte,
    lineasHoras,
    totalHoras,
    minutosPagados,
    minutosOrdinarios,
    devengadosManuales,
    totalDevengadosManuales,
    totalDevengado,

    baseSeguridadSocial,
    salud,
    pension,
    descuentosManuales,
    totalDescuentosManuales,
    totalDescuentos,

    neto: totalDevengado - totalDescuentos,
  };
}

/* ================================================================== */
/* 6. Snapshot congelado                                               */
/* ================================================================== */

/** Versión del formato del snapshot, por si algún día cambia su estructura. */
export const VERSION_SNAPSHOT_NOMINA = 1;

export interface SnapshotNomina {
  version: number;
  calculo: LiquidacionCalculada;
  /** Cuántas jornadas aprobadas entraron en el cálculo. */
  jornadas: number;
  /** Rango de fechas liquidado, tal cual estaba al cerrar. */
  fechaInicio: string;
  fechaFin: string;
}

export function construirSnapshot(
  calculo: LiquidacionCalculada,
  datos: { jornadas: number; fechaInicio: string; fechaFin: string },
): SnapshotNomina {
  return {
    version: VERSION_SNAPSHOT_NOMINA,
    calculo,
    jornadas: Math.max(0, Math.round(numeroSeguro(datos.jornadas))),
    fechaInicio: datos.fechaInicio,
    fechaFin: datos.fechaFin,
  };
}

/**
 * Convierte el jsonb de `nomina_liquidaciones.snapshot` en un snapshot con
 * forma. Devuelve `null` cuando no hay nada utilizable (liquidación en
 * borrador, columna ausente o JSON incompleto): en ese caso se calcula en vivo.
 * Nunca lanza.
 */
export function normalizarSnapshot(value: unknown): SnapshotNomina | null {
  if (!value || typeof value !== "object") return null;
  const bruto = value as Record<string, unknown>;
  const calculo = bruto.calculo;
  if (!calculo || typeof calculo !== "object") return null;

  const c = calculo as Record<string, unknown>;
  // Un snapshot sin devengados no explica nada: se trata como ausente.
  if (!Number.isFinite(Number(c.totalDevengado))) return null;

  const lineasHoras = Array.isArray(c.lineasHoras)
    ? (c.lineasHoras as unknown[])
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          clave: String(l.clave) as ConceptoHora,
          label: String(l.label ?? ""),
          minutos: numeroSeguro(l.minutos),
          horas: numeroSeguro(l.horas),
          tarifa: numeroSeguro(l.tarifa),
          valor: numeroSeguro(l.valor),
          sePaga: l.sePaga !== false,
          composicion:
            typeof l.composicion === "string" ? l.composicion : undefined,
        }))
    : [];

  const lineasManuales = (valor: unknown): LineaManual[] =>
    Array.isArray(valor)
      ? (valor as unknown[])
          .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
          .map((l) => ({
            clave: String(l.clave) as ConceptoManual,
            label: String(l.label ?? ""),
            valor: numeroSeguro(l.valor),
            nota: typeof l.nota === "string" ? l.nota : "",
          }))
      : [];

  const tarifas = {
    ...tarifasVacias(),
    ...(c.tarifas && typeof c.tarifas === "object" ? c.tarifas : {}),
  } as TarifasNomina;

  return {
    version: numeroSeguro(bruto.version, VERSION_SNAPSHOT_NOMINA),
    jornadas: numeroSeguro(bruto.jornadas),
    fechaInicio: typeof bruto.fechaInicio === "string" ? bruto.fechaInicio : "",
    fechaFin: typeof bruto.fechaFin === "string" ? bruto.fechaFin : "",
    calculo: {
      salarioBasico: numeroSeguro(c.salarioBasico),
      auxTransporteMensual: numeroSeguro(c.auxTransporteMensual),
      tarifas,
      pctSalud: numeroSeguro(c.pctSalud, PCT_SALUD_DEFECTO),
      pctPension: numeroSeguro(c.pctPension, PCT_PENSION_DEFECTO),
      dias: numeroSeguro(c.dias),

      basico: numeroSeguro(c.basico),
      auxTransporte: numeroSeguro(c.auxTransporte),
      lineasHoras,
      totalHoras: numeroSeguro(c.totalHoras),
      minutosPagados: numeroSeguro(c.minutosPagados),
      minutosOrdinarios: numeroSeguro(c.minutosOrdinarios),
      devengadosManuales: lineasManuales(c.devengadosManuales),
      totalDevengadosManuales: numeroSeguro(c.totalDevengadosManuales),
      totalDevengado: numeroSeguro(c.totalDevengado),

      baseSeguridadSocial: numeroSeguro(c.baseSeguridadSocial),
      salud: numeroSeguro(c.salud),
      pension: numeroSeguro(c.pension),
      descuentosManuales: lineasManuales(c.descuentosManuales),
      totalDescuentosManuales: numeroSeguro(c.totalDescuentosManuales),
      totalDescuentos: numeroSeguro(c.totalDescuentos),

      neto: numeroSeguro(c.neto),
    },
  };
}

export interface LiquidacionResuelta {
  calculo: LiquidacionCalculada;
  /** true = viene del snapshot guardado al cerrar; ya no cambia nunca. */
  congelada: boolean;
  snapshot: SnapshotNomina | null;
}

/**
 * **REGLA DE LECTURA ÚNICA de una liquidación.**
 *
 * Si la liquidación tiene snapshot (se cerró) devuelve ESE cálculo, marcado con
 * `congelada: true`. Si no, calcula en vivo con la configuración y las jornadas
 * de ahora. Es el gemelo de `obtenerDesglose()` para jornadas: nadie debe
 * llamar a `calcularLiquidacion` sobre una liquidación ya cerrada.
 */
export function obtenerLiquidacion(
  snapshotGuardado: unknown,
  enVivo: () => EntradaLiquidacion,
): LiquidacionResuelta {
  const snapshot = normalizarSnapshot(snapshotGuardado);
  if (snapshot) {
    return { calculo: snapshot.calculo, congelada: true, snapshot };
  }
  return { calculo: calcularLiquidacion(enVivo()), congelada: false, snapshot: null };
}

/* ================================================================== */
/* 7. Períodos                                                         */
/* ================================================================== */

export type TipoPeriodo = "quincena" | "mes";

const MESES_NOMINA = [
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
];

/** Nombre del mes en minúsculas ("septiembre"); "" si el número no es válido. */
export function nombreMesNomina(mes: number): string {
  return MESES_NOMINA[mes - 1] ?? "";
}

/** Días reales del mes del calendario (28, 29, 30 o 31). */
export function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

const dos = (n: number) => String(n).padStart(2, "0");

export interface RangoPeriodo {
  fechaInicio: string;
  fechaFin: string;
  /** Días liquidados sugeridos: 15 en una quincena, 30 en un mes. */
  diasSugeridos: number;
}

/**
 * Fechas reales de un período.
 *
 * Quincena 1 = del 1 al 15 · quincena 2 = del 16 al último día del mes ·
 * mes = del 1 al último día. Los días LIQUIDADOS, en cambio, siguen la
 * convención de nómina de 30 días fijos (15 y 30), independientemente de que el
 * mes tenga 28 o 31: es lo que hace que media quincena sea medio salario exacto.
 */
export function rangoPeriodo(
  tipo: TipoPeriodo,
  anio: number,
  mes: number,
  quincena: 1 | 2 | null,
): RangoPeriodo {
  const ultimo = diasDelMes(anio, mes);
  if (tipo === "mes" || quincena === null) {
    return {
      fechaInicio: `${anio}-${dos(mes)}-01`,
      fechaFin: `${anio}-${dos(mes)}-${dos(ultimo)}`,
      diasSugeridos: DIAS_MES_NOMINA,
    };
  }
  if (quincena === 1) {
    return {
      fechaInicio: `${anio}-${dos(mes)}-01`,
      fechaFin: `${anio}-${dos(mes)}-15`,
      diasSugeridos: DIAS_QUINCENA,
    };
  }
  return {
    fechaInicio: `${anio}-${dos(mes)}-16`,
    fechaFin: `${anio}-${dos(mes)}-${dos(ultimo)}`,
    diasSugeridos: DIAS_QUINCENA,
  };
}

/**
 * Período que se preselecciona cuando la URL de la liquidación NO trae uno:
 * el mes de hoy y la quincena según el día (1–15 → primera; 16 al último día
 * → segunda). `hoy` es `YYYY-MM-DD` en hora de COLOMBIA: quien llama lo saca
 * de `hoyEnColombia()` en el servidor, nunca del reloj del navegador ni de la
 * hora UTC del servidor (a las 8 p. m. del 15, en UTC ya sería el 16).
 */
export function periodoDeHoy(hoy: string): {
  anio: number;
  mes: number;
  quincena: 1 | 2;
} {
  return {
    anio: Number(hoy.slice(0, 4)),
    mes: Number(hoy.slice(5, 7)),
    quincena: Number(hoy.slice(8, 10)) <= 15 ? 1 : 2,
  };
}

/** "Quincena del 1 al 15 de septiembre de 2026" · "Mes de septiembre de 2026". */
export function etiquetaPeriodo(
  tipo: TipoPeriodo,
  anio: number,
  mes: number,
  quincena: 1 | 2 | null,
): string {
  const { fechaInicio, fechaFin } = rangoPeriodo(tipo, anio, mes, quincena);
  const dia = (f: string) => Number(f.slice(8, 10));
  if (tipo === "mes" || quincena === null) {
    return `Mes de ${nombreMesNomina(mes)} de ${anio}`;
  }
  return `Quincena del ${dia(fechaInicio)} al ${dia(fechaFin)} de ${nombreMesNomina(mes)} de ${anio}`;
}

/** "2.ª quincena · septiembre 2026" — para tablas y selectores estrechos. */
export function etiquetaPeriodoCorta(
  tipo: TipoPeriodo,
  anio: number,
  mes: number,
  quincena: 1 | 2 | null,
): string {
  const mesTexto = `${nombreMesNomina(mes)} ${anio}`;
  if (tipo === "mes" || quincena === null) return `Mes completo · ${mesTexto}`;
  return `${quincena}.ª quincena · ${mesTexto}`;
}

/** Fragmento del nombre del archivo del volante: `2026-09-Q2` · `2026-09-mes`. */
export function clavePeriodo(
  tipo: TipoPeriodo,
  anio: number,
  mes: number,
  quincena: 1 | 2 | null,
): string {
  if (tipo === "mes" || quincena === null) return `${anio}-${dos(mes)}-mes`;
  return `${anio}-${dos(mes)}-Q${quincena}`;
}

/** `volante_scordoba_2026-09-Q2.pdf` */
export function nombreArchivoVolante(
  usuario: string,
  tipo: TipoPeriodo,
  anio: number,
  mes: number,
  quincena: 1 | 2 | null,
): string {
  const limpio = (usuario || "empleado").replace(/[^a-zA-Z0-9._-]/g, "") || "empleado";
  return `volante_${limpio}_${clavePeriodo(tipo, anio, mes, quincena)}.pdf`;
}

/* ================================================================== */
/* 8. Estados                                                          */
/* ================================================================== */

export const NOMINA_ESTADOS = ["borrador", "cerrada", "pagada"] as const;
export type NominaEstado = (typeof NOMINA_ESTADOS)[number];

export const NOMINA_ESTADO_LABELS: Record<NominaEstado, string> = {
  borrador: "Borrador",
  cerrada: "Cerrada",
  pagada: "Pagada",
};

export const NOMINA_ESTADO_DESCRIPCIONES: Record<NominaEstado, string> = {
  borrador:
    "Se puede editar y se recalcula sola con las jornadas aprobadas. Todavía no es una cifra definitiva.",
  cerrada:
    "El cálculo quedó congelado: cambiar después un horario, una tarifa o una jornada ya no la altera.",
  pagada: "Cerrada y ya girada al empleado, con su fecha de pago.",
};

export const NOMINA_ESTADO_CLASSES: Record<NominaEstado, string> = {
  borrador: "bg-amber-100 text-amber-800",
  cerrada: "bg-brand-tint text-brand-dark",
  pagada: "bg-emerald-100 text-emerald-800",
};

export function normalizarEstadoNomina(value: unknown): NominaEstado {
  return (NOMINA_ESTADOS as readonly string[]).includes(String(value))
    ? (String(value) as NominaEstado)
    : "borrador";
}

/* ================================================================== */
/* 9. Formato                                                          */
/* ================================================================== */

// Los importes (`formatearPesos`, `formatearDinero`, `formatearMiles`…) se
// formatean con `src/lib/dinero.ts`, el módulo único de formato y lectura de
// dinero en formato colombiano (punto de miles, coma decimal). Aquí solo
// quedan las horas y el CSV, que a propósito NO lleva separador de miles.

/** 510 → "8 h 30 min" · 0 → "—". */
export function formatearHorasNomina(minutos: number): string {
  const m = Math.max(0, Math.round(numeroSeguro(minutos)));
  if (m === 0) return "—";
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (h === 0) return `${resto} min`;
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
}

/**
 * Número con coma decimal para el CSV (Excel en español lo suma; un "8h 30m"
 * lo trataría como texto). Misma regla que el CSV de jornadas.
 *
 * **Sin separador de miles, a propósito** (pedido de César): «1.300.000» en
 * una celda de Excel puede leerse como texto o como fecha según la
 * configuración regional; «1300000» siempre es un número que se puede sumar.
 * Por eso el CSV NO usa `src/lib/dinero.ts`.
 */
export function decimalCSV(valor: number): string {
  const n = Number.isFinite(valor) ? Math.round(valor * 100) / 100 : 0;
  return String(n).replace(".", ",");
}

/* ================================================================== */
/* 10. Configuración «vigente desde»                                   */
/* ================================================================== */

/**
 * LA CONFIGURACIÓN SE HEREDA HACIA ADELANTE (18 sep 2026)
 * -------------------------------------------------------
 * Una fila de `nomina_config_mensual` guardada en el mes M **rige para M y
 * para todos los meses siguientes, hasta que exista otra fila más reciente**.
 * La configuración efectiva de un empleado en el mes M es, por tanto, la fila
 * VÁLIDA más reciente con (año, mes) ≤ M.
 *
 * Consecuencias que hay que tener presentes:
 *   · **Ver un mes no crea filas.** Solo guardar crea o actualiza la fila de
 *     ese mes. (Antes, abrir un mes en Configuración lo creaba copiando el
 *     inmediatamente anterior; si ese no existía, lo creaba en cero.)
 *   · Una persona configurada en agosto se liquida en octubre sin que nadie
 *     abra septiembre ni octubre.
 *   · Corregir agosto después corrige también septiembre y octubre (salvo que
 *     alguno tenga su propio cambio guardado), porque ya no hay copias.
 *   · **Quitar el cambio de un mes** = borrar su fila: ese mes vuelve a heredar
 *     del cambio anterior.
 *   · Las liquidaciones CERRADAS no se enteran de nada de esto: leen su
 *     snapshot congelado (`obtenerLiquidacion`).
 *
 * «VÁLIDA» = con salario mayor que cero. El formulario nunca deja guardar un
 * salario en cero, así que una fila así solo puede ser un resto del modelo
 * anterior (las que se creaban vacías al abrir un mes). Tomarla en serio
 * dejaría a la persona «configurada en cero» y taparía lo heredado; por eso
 * se ignora, como si no existiera, y no hace falta borrarla.
 */

/** Lo mínimo que necesita la resolución: el mes y el salario de cada fila. */
export interface FilaConfigMensual {
  anio: number;
  mes: number;
  salario_basico: number;
}

/** Número correlativo de un mes, para comparar (año, mes) de un vistazo. */
export function indiceMes(anio: number, mes: number): number {
  return anio * 12 + (mes - 1);
}

/** El mes anterior: enero de 2027 → diciembre de 2026. */
export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/** ¿La fila cuenta como configuración? Ver «VÁLIDA» arriba. */
export function esConfigValida(fila: FilaConfigMensual): boolean {
  return numeroSeguro(fila.salario_basico) > 0;
}

/** Las filas válidas, de la más antigua a la más reciente. */
export function cambiosDeConfig<T extends FilaConfigMensual>(filas: readonly T[]): T[] {
  return filas
    .filter(esConfigValida)
    .slice()
    .sort((a, b) => indiceMes(a.anio, a.mes) - indiceMes(b.anio, b.mes));
}

/**
 * **REGLA ÚNICA de la configuración de un mes**: la fila válida más reciente
 * con (año, mes) ≤ el mes pedido, o `null` si no hay ninguna (la persona no
 * tiene salario configurado ni en ese mes ni antes).
 *
 * `filas` pueden ser las de un solo empleado o de varios mezclados: quien
 * llama es responsable de pasar solo las de la persona que le interesa.
 */
export function configVigente<T extends FilaConfigMensual>(
  filas: readonly T[],
  anio: number,
  mes: number,
): T | null {
  const tope = indiceMes(anio, mes);
  let mejor: T | null = null;
  let mejorIndice = -Infinity;
  for (const fila of filas) {
    if (!esConfigValida(fila)) continue;
    const indice = indiceMes(fila.anio, fila.mes);
    if (indice <= tope && indice > mejorIndice) {
      mejor = fila;
      mejorIndice = indice;
    }
  }
  return mejor;
}

/** De dónde sale la configuración que rige en un mes. */
export type OrigenConfigMes = "propia" | "heredada" | "ninguna";

export interface EstadoConfigMes<T extends FilaConfigMensual> {
  /** La fila que rige en el mes (propia o heredada), o `null`. */
  vigente: T | null;
  origen: OrigenConfigMes;
  /** La fila guardada EN este mes, si es válida. */
  propia: T | null;
  /**
   * Lo que regiría si se quitara el cambio de este mes: la fila vigente del
   * mes anterior. `null` = la persona quedaría SIN configuración.
   */
  alQuitar: T | null;
  /** El próximo cambio guardado DESPUÉS de este mes: hasta ahí rige este. */
  siguiente: T | null;
  /** Todos los cambios válidos de la persona, del más antiguo al más reciente. */
  cambios: T[];
}

/** Todo lo que la pantalla de Configuración necesita saber de un mes. */
export function estadoConfigMes<T extends FilaConfigMensual>(
  filas: readonly T[],
  anio: number,
  mes: number,
): EstadoConfigMes<T> {
  const cambios = cambiosDeConfig(filas);
  const aqui = indiceMes(anio, mes);
  const propia = cambios.find((f) => indiceMes(f.anio, f.mes) === aqui) ?? null;
  const anterior = mesAnterior(anio, mes);
  const alQuitar = configVigente(cambios, anterior.anio, anterior.mes);
  const vigente = propia ?? alQuitar;
  const siguiente = cambios.find((f) => indiceMes(f.anio, f.mes) > aqui) ?? null;
  return {
    vigente,
    origen: propia ? "propia" : vigente ? "heredada" : "ninguna",
    propia,
    alQuitar,
    siguiente,
    cambios,
  };
}
