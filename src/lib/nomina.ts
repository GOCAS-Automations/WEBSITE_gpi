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
 *   · **Faltas no remuneradas**: un permiso APROBADO y NO remunerado baja los
 *     días que se pagan. Un día completo descuenta ese día **y el domingo de esa
 *     semana** (art. 173 CST, una sola vez por semana); un permiso por horas
 *     descuenta su proporción de la jornada programada de ese día. El descuento
 *     afecta al básico Y al auxilio de transporte —todo lo que se paga por
 *     día—, así que la línea «Jornada laboral: N días» ya enseña los días
 *     EFECTIVOS y aparte se imprime «Faltas no remuneradas: N días (incluye M
 *     domingos)» con su valor. Los días los cuenta `faltasDelPeriodo()` de
 *     `src/lib/permisos.ts`; aquí solo se convierten en pesos.
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
 * LAS TARIFAS SON AUTOMÁTICAS Y NO SE EDITAN (23 sep 2026)
 * --------------------------------------------------------
 * GPI decidió que la nómina se rija ESTRICTAMENTE por la ley colombiana, para
 * que resista una auditoría. Las siete tarifas ya no se digitan: se **derivan
 * siempre** del salario y de la ley VIGENTE EN EL MES QUE SE LIQUIDA
 * (`derivarTarifas`), `salario ÷ divisor × factor`, donde
 *   · el **divisor** sale de la jornada semanal (`horas ÷ 6 × 30`): con las 42 h
 *     de GPI, **210** (antes se usaba 240, la cuenta de la semana de 48 h que
 *     traía el Excel de GPI: todo salía un 12,5 % por debajo de la ley);
 *   · los **factores** llevan el recargo dominical vigente ese mes (90 % desde
 *     el 1-jul-2026 → 1,90 / 2,15 / 2,65; 100 % desde el 1-jul-2027).
 * Este módulo NO importa nada en tiempo de ejecución, así que no calcula esos
 * dos números: los recibe (`ParametrosTarifas`). Quien llama los saca de
 * `parametrosLegalesDelMes()` de `src/lib/ley-laboral.ts`.
 *
 * Consecuencias:
 *   · el administrador solo edita **salario, auxilio de transporte y los % de
 *     salud y pensión**; las tarifas se muestran de SOLO LECTURA con su cuenta
 *     a la vista;
 *   · una liquidación en **borrador** toma siempre las tarifas de la ley del
 *     mes liquidado, así que el **1 de julio de 2027** el recargo dominical
 *     pasa al 100 % sin que nadie toque nada;
 *   · las liquidaciones **cerradas** siguen con su `snapshot`, intactas;
 *   · las columnas de tarifas de `nomina_config_mensual` quedan como
 *     **histórico** (se siguen escribiendo con lo derivado al guardar), pero el
 *     cálculo ya no depende de ellas. Por eso desapareció el aviso de «tarifa
 *     por debajo del mínimo legal»: ya no hay nada que corregir.
 *
 * REDONDEO
 * --------
 * Todo se paga en **pesos enteros** y se redondea **línea por línea** (cada
 * concepto de horas, el básico, el auxilio, salud y pensión). Así el volante
 * cuadra cuando alguien lo suma a mano —cosa que el Excel de GPI no hace: en el
 * volante de referencia de GPI (una quincena de septiembre de 2026) los
 * devengados impresos suman un peso más que el total impreso, porque la hoja
 * arrastra centavos y solo redondea al mostrar—. El neto coincide al peso con
 * el del Excel; algún subtotal puede diferir en 1 peso por esa misma razón.
 */

import type { DesgloseJornada } from "@/lib/jornada";
import type { FaltasPeriodo } from "@/lib/permisos";

/* ================================================================== */
/* 1. Parámetros                                                       */
/* ================================================================== */

/** Días de un mes de nómina: siempre 30 (convención colombiana). */
export const DIAS_MES_NOMINA = 30;

/** Días liquidados por defecto en una quincena completa. */
export const DIAS_QUINCENA = 15;

/**
 * Lo que la LEY del mes pone para derivar las tarifas. Se recibe como
 * parámetro (este módulo no importa nada): sale de `parametrosLegalesDelMes()`
 * de `src/lib/ley-laboral.ts`, con el año y el mes de la configuración.
 */
export interface ParametrosTarifas {
  /** Valor hora = salario ÷ divisor (42 h semanales → 210). */
  divisor: number;
  /** Recargo dominical/festivo del mes (0,90 desde el 1-jul-2026). */
  recargoDominical: number;
}

/**
 * Factores de cada tarifa sobre el valor hora, para un recargo dominical `d`.
 * Es la MISMA regla que `factoresLegales()` de `ley-laboral.ts` (las pruebas
 * comprueban que coinciden); vive duplicada aquí solo porque este módulo no
 * puede importar nada en tiempo de ejecución.
 *
 *   · rotación nocturna 0,35 — recargo nocturno (art. 168 CST);
 *   · extra diurna 1,25 y extra nocturna 1,75 — sin acumularse entre sí;
 *   · hora en festivo 1 + d; extra festiva diurna 1,25 + d; extra festiva
 *     nocturna 1,75 + d (el dominical SÍ se suma a la extra).
 *
 * Con d = 0,90: 1,90 / 2,15 / 2,65. Nota histórica: el 2,15 que el Excel de
 * GPI traía en «extra diurna en festivo» NO era un error de plantilla, como se
 * creyó el 17 sep: es exactamente el valor legal con el 90 %. Lo que no cuadraba
 * con la ley era el 2,15 de «hora en festivo» (debe ser 1,90) y el divisor 240.
 */
export function factoresTarifa(recargoDominical: number): TarifasNomina {
  const d = Number.isFinite(recargoDominical) && recargoDominical >= 0 ? recargoDominical : 0;
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

/** Nombre de cada tarifa, como lo ve el administrador. */
export const ETIQUETAS_TARIFA: Record<keyof TarifasNomina, string> = {
  horaBase: "Hora de rotación diurna",
  rotacionNocturna: "Rotación nocturna",
  extraDiurna: "Hora extra diurna",
  extraNocturna: "Hora extra nocturna",
  festivo: "Hora en domingo o festivo",
  extraFestivoDiurna: "Hora extra diurna en festivo",
  extraFestivoNocturna: "Hora extra nocturna en festivo",
};

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

/**
 * Las faltas NO REMUNERADAS que se descontaron, ya en días y en pesos.
 *
 * Los DÍAS los cuenta `faltasDelPeriodo()` de `src/lib/permisos.ts` (con la
 * regla del domingo perdido); aquí se guardan tal cual, junto con el `valor`
 * que dejó de pagarse, para que el volante lo pueda imprimir y auditar.
 */
export interface ResumenFaltasNomina {
  /** Días descontados en total: completos + domingos + fracciones por horas. */
  dias: number;
  /** De esos, los días completos de ausencia. */
  diasCompletos: number;
  /** De esos, los domingos de descanso remunerado perdidos (art. 173 CST). */
  diasDomingos: number;
  /** De esos, lo que suman los permisos por horas. */
  diasPorHoras: number;
  /** Lo que NO se pagó por esas faltas: salario + auxilio de transporte. */
  valor: number;
  /** Las fechas de los días completos, en orden. */
  fechas: string[];
  /** Los domingos perdidos, en orden. */
  domingos: string[];
  /** El detalle de cada permiso por horas. */
  parciales: {
    fecha: string;
    horas: number;
    horasJornada: number;
    fraccion: number;
  }[];
}

/** Sin faltas: lo que se guarda cuando no hubo ninguna (y lo que leen los snapshots viejos). */
export function faltasNominaVacias(): ResumenFaltasNomina {
  return {
    dias: 0,
    diasCompletos: 0,
    diasDomingos: 0,
    diasPorHoras: 0,
    valor: 0,
    fechas: [],
    domingos: [],
    parciales: [],
  };
}

/** Resultado completo de liquidar un período. */
export interface LiquidacionCalculada {
  /* --- Entrada usada (queda dentro del snapshot, para auditoría) --- */
  salarioBasico: number;
  auxTransporteMensual: number;
  tarifas: TarifasNomina;
  pctSalud: number;
  pctPension: number;
  /** Días del período que se liquidan (15 en una quincena completa). */
  dias: number;
  /** Días que de verdad se pagan: `dias` menos las faltas no remuneradas. */
  diasPagados: number;
  /** Las faltas no remuneradas descontadas (vacío si no hubo). */
  faltas: ResumenFaltasNomina;

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
    label: "Horas de la jornada laboral",
    descripcion:
      "Trabajo normal, de día, dentro de la jornada programada del día. Las paga el salario (en la liquidación y en el volante aparecen como «Jornada laboral: N días»): se guardan para cuadrar el total de horas, pero no se suman aparte.",
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
    descripcion:
      "Lo que se trabajó por encima de la jornada programada del día, de día. Aquí entra también todo lo trabajado un SÁBADO, que no lleva recargo de domingo.",
    campo: "extraDiurna",
    sePaga: true,
  },
  {
    clave: "extraNocturna",
    label: "Horas extra nocturnas",
    descripcion:
      "Lo que se trabajó por encima de la jornada programada del día, de noche (franja de 7:00 p. m. a 6:00 a. m.). Un sábado de noche también entra aquí.",
    campo: "extraNocturna",
    sePaga: true,
  },
  {
    clave: "festivo",
    label: "Horas en domingo o festivo",
    descripcion:
      "Horas trabajadas en domingo o festivo DENTRO de la jornada programada de ese día. Un festivo que cae en un día programado (por ejemplo, un lunes) paga así las horas de la jornada y solo el exceso como extra festiva.",
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
      "Lo que se trabajó en domingo o festivo por encima de la jornada programada de ese día, de día. Un domingo sin horario no tiene jornada programada, así que todo el turno entra aquí. Un SÁBADO no: no lleva recargo de domingo y sus horas son extra normales.",
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

/**
 * Cuatro decimales. Lo usan los DÍAS, que pueden ser fraccionarios cuando hay
 * un permiso por horas (2 h de un día de 8,5 h = 0,2353 días): con cuatro
 * decimales el descuento cuadra al peso y no arrastra ruido binario.
 */
export function cuatro(valor: number): number {
  return Number.isFinite(valor) ? Math.round(valor * 10000) / 10000 : 0;
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
 * **LAS tarifas de un mes**: `salario ÷ divisor × factor`, con dos decimales (la
 * columna de la base de datos es `numeric(14,2)`). El divisor y el recargo
 * dominical llegan como parámetros (ver `ParametrosTarifas`) y salen de
 * `parametrosLegalesDelMes()` con el AÑO Y MES QUE SE LIQUIDA.
 *
 * Desde el 23 sep 2026 no son una sugerencia editable: son el valor que se
 * paga. Como dependen de la fecha, el 1-jul-2027 el recargo dominical sube al
 * 100 % y las tarifas cambian solas.
 */
export function derivarTarifas(
  salarioBasico: number,
  { divisor, recargoDominical }: ParametrosTarifas,
): TarifasNomina {
  const div = Number.isFinite(divisor) && divisor > 0 ? divisor : 240;
  const base = numeroSeguro(salarioBasico) / div;
  const f = factoresTarifa(recargoDominical);
  const dos = (n: number) => Math.round(n * 100) / 100;
  return {
    horaBase: dos(base * f.horaBase),
    rotacionNocturna: dos(base * f.rotacionNocturna),
    extraDiurna: dos(base * f.extraDiurna),
    extraNocturna: dos(base * f.extraNocturna),
    festivo: dos(base * f.festivo),
    extraFestivoDiurna: dos(base * f.extraFestivoDiurna),
    extraFestivoNocturna: dos(base * f.extraFestivoNocturna),
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
  /**
   * Los días que se pierden por permisos APROBADOS y NO remunerados, ya
   * contados por `faltasDelPeriodo()` de `src/lib/permisos.ts` (incluido el
   * domingo de descanso perdido). Ausente o `null` = no hubo faltas.
   */
  faltas?: FaltasPeriodo | null;
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

  /* ---- Faltas no remuneradas (permisos aprobados y no remunerados) ---- */
  // Los DÍAS ya vienen contados de `faltasDelPeriodo()` (con su domingo
  // perdido); aquí solo se restan de los días liquidados. Nunca más de los días
  // del período: descontar 16 días de una quincena de 15 no tendría sentido.
  const faltasEntrada = entrada.faltas ?? null;
  const diasFalta = Math.min(dias, Math.max(0, cuatro(numeroSeguro(faltasEntrada?.dias))));
  const diasPagados = Math.max(0, cuatro(dias - diasFalta));

  /* ---- Devengados fijos ---- */
  // Se multiplica ANTES de dividir: `(249.095 / 30) × 15` da 124.547,49999999
  // en coma flotante y se redondearía a 124.547, un peso menos que el volante
  // real de GPI. `(249.095 × 15) / 30` da 124.547,5 exacto → 124.548.
  const basico = pesos((salarioBasico * diasPagados) / DIAS_MES_NOMINA);
  const auxTransporte = pesos((auxMensual * diasPagados) / DIAS_MES_NOMINA);

  // El valor de las faltas es, EXACTAMENTE, la diferencia entre lo que se
  // habría pagado por el período completo y lo que se paga con los días
  // efectivos. Calculado así (y no con una regla de tres aparte) el volante
  // cuadra al peso cuando alguien lo suma a mano.
  const basicoPleno = pesos((salarioBasico * dias) / DIAS_MES_NOMINA);
  const auxPleno = pesos((auxMensual * dias) / DIAS_MES_NOMINA);
  const faltas: ResumenFaltasNomina = {
    dias: diasFalta,
    diasCompletos: Math.max(0, numeroSeguro(faltasEntrada?.diasCompletos)),
    diasDomingos: Math.max(0, numeroSeguro(faltasEntrada?.diasDomingos)),
    diasPorHoras: Math.max(0, cuatro(numeroSeguro(faltasEntrada?.diasPorHoras))),
    valor: basicoPleno + auxPleno - (basico + auxTransporte),
    fechas: (faltasEntrada?.completos ?? []).map((c) => c.fecha),
    domingos: [...(faltasEntrada?.domingos ?? [])],
    parciales: (faltasEntrada?.parciales ?? []).map((p) => ({
      fecha: p.fecha,
      horas: numeroSeguro(p.horas),
      horasJornada: numeroSeguro(p.horasJornada),
      fraccion: numeroSeguro(p.fraccion),
    })),
  };

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
    diasPagados,
    faltas,

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

/** El resumen de faltas de un snapshot guardado; vacío si no lo trae. */
function normalizarFaltasNomina(value: unknown): ResumenFaltasNomina {
  const salida = faltasNominaVacias();
  if (!value || typeof value !== "object") return salida;
  const f = value as Record<string, unknown>;
  const textos = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  salida.dias = numeroSeguro(f.dias);
  salida.diasCompletos = numeroSeguro(f.diasCompletos);
  salida.diasDomingos = numeroSeguro(f.diasDomingos);
  salida.diasPorHoras = numeroSeguro(f.diasPorHoras);
  salida.valor = numeroSeguro(f.valor);
  salida.fechas = textos(f.fechas);
  salida.domingos = textos(f.domingos);
  salida.parciales = Array.isArray(f.parciales)
    ? (f.parciales as unknown[])
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p) => ({
          fecha: String(p.fecha ?? ""),
          horas: numeroSeguro(p.horas),
          horasJornada: numeroSeguro(p.horasJornada),
          fraccion: numeroSeguro(p.fraccion),
        }))
    : [];
  return salida;
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
      // Snapshots anteriores a los permisos (23 sep 2026) no traen estas dos
      // claves: se leen como «todos los días se pagaron y no hubo faltas», que
      // es exactamente lo que ocurrió. Una liquidación cerrada no cambia.
      diasPagados: Number.isFinite(Number(c.diasPagados))
        ? numeroSeguro(c.diasPagados)
        : numeroSeguro(c.dias),
      faltas: normalizarFaltasNomina(c.faltas),

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

/** `volante_oprueba_2026-09-Q2.pdf` */
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
 * La configuración efectiva de un empleado en el mes M sale, por tanto, del
 * CAMBIO más reciente con (año, mes) ≤ M.
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
 * DOS CLASES DE CAMBIO (22 sep 2026)
 * ----------------------------------
 *   · **Configuración**: una fila con salario mayor que cero. Rige desde su mes.
 *   · **Corte** («suspender la herencia»): una fila con `sin_configuracion =
 *     true` (migración 0013). Significa «SIN configuración desde este mes en
 *     adelante», hasta el próximo cambio. Es lo que se usa cuando alguien se
 *     retira o sale a una licencia no remunerada. Como es una fila de cambio más,
 *     «Quitar el cambio de este mes» sobre ella la borra y el mes vuelve a
 *     heredar. Su salario y sus tarifas no significan nada (van en cero).
 *
 * Lo que NO es un cambio: una fila con salario 0 y sin la marca de corte. El
 * formulario nunca deja guardar un salario en cero, así que una fila así solo
 * puede ser un resto del modelo anterior (las que se creaban vacías al abrir un
 * mes). Tomarla en serio dejaría a la persona «configurada en cero» y taparía
 * lo heredado; por eso se ignora, como si no existiera. **El corte NO se
 * expresa con salario 0**: tiene su propia columna, justamente para no
 * confundirse con esos restos.
 */

/** Lo mínimo que necesita la resolución: el mes, el salario y la marca de corte. */
export interface FilaConfigMensual {
  anio: number;
  mes: number;
  salario_basico: number;
  /**
   * `true` = fila de CORTE: sin configuración desde este mes (migración
   * 0013). Ausente o `false` = fila normal.
   */
  sin_configuracion?: boolean;
}

/** Un mes concreto: (año, mes). */
export interface MesNomina {
  anio: number;
  mes: number;
}

/** Número correlativo de un mes, para comparar (año, mes) de un vistazo. */
export function indiceMes(anio: number, mes: number): number {
  return anio * 12 + (mes - 1);
}

/** El mes anterior: enero de 2027 → diciembre de 2026. */
export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/** ¿La fila es un CORTE («sin configuración desde este mes»)? */
export function esCorte(fila: FilaConfigMensual): boolean {
  return fila.sin_configuracion === true;
}

/** ¿La fila es una CONFIGURACIÓN que se puede usar para liquidar? */
export function esConfigValida(fila: FilaConfigMensual): boolean {
  return !esCorte(fila) && numeroSeguro(fila.salario_basico) > 0;
}

/** ¿La fila cuenta como cambio (configuración o corte)? Los restos en cero, no. */
export function esCambioConfig(fila: FilaConfigMensual): boolean {
  return esCorte(fila) || esConfigValida(fila);
}

/**
 * Los cambios de la persona —configuraciones Y cortes—, del más antiguo al más
 * reciente. Los restos en cero del modelo anterior quedan fuera.
 */
export function cambiosDeConfig<T extends FilaConfigMensual>(filas: readonly T[]): T[] {
  return filas
    .filter(esCambioConfig)
    .slice()
    .sort((a, b) => indiceMes(a.anio, a.mes) - indiceMes(b.anio, b.mes));
}

/** El cambio (configuración o corte) más reciente con (año, mes) ≤ el pedido. */
function cambioVigente<T extends FilaConfigMensual>(
  filas: readonly T[],
  anio: number,
  mes: number,
): T | null {
  const tope = indiceMes(anio, mes);
  let mejor: T | null = null;
  let mejorIndice = -Infinity;
  for (const fila of filas) {
    if (!esCambioConfig(fila)) continue;
    const indice = indiceMes(fila.anio, fila.mes);
    if (indice <= tope && indice > mejorIndice) {
      mejor = fila;
      mejorIndice = indice;
    }
  }
  return mejor;
}

/**
 * **REGLA ÚNICA de la configuración de un mes**: la del cambio más reciente con
 * (año, mes) ≤ el mes pedido. Devuelve `null` —la persona no se puede
 * liquidar— si no hay ningún cambio antes o si el más reciente es un CORTE.
 *
 * `filas` pueden ser las de un solo empleado o de varios mezclados: quien
 * llama es responsable de pasar solo las de la persona que le interesa.
 */
export function configVigente<T extends FilaConfigMensual>(
  filas: readonly T[],
  anio: number,
  mes: number,
): T | null {
  const cambio = cambioVigente(filas, anio, mes);
  return cambio && !esCorte(cambio) ? cambio : null;
}

/**
 * De dónde sale la configuración que rige en un mes:
 *   · `propia`     — se guardó en ese mismo mes;
 *   · `heredada`   — viene de un cambio anterior;
 *   · `suspendida` — el cambio que rige es un CORTE: sin configuración desde
 *                    el mes del corte (herencia suspendida);
 *   · `ninguna`    — nunca se configuró nada antes.
 */
export type OrigenConfigMes = "propia" | "heredada" | "suspendida" | "ninguna";

export interface EstadoConfigMes<T extends FilaConfigMensual> {
  /** La CONFIGURACIÓN que rige en el mes (propia o heredada), o `null`. */
  vigente: T | null;
  origen: OrigenConfigMes;
  /** La configuración guardada EN este mes, si la hay (no un corte). */
  propia: T | null;
  /** El corte que rige el mes (el de este mes o uno anterior), si lo hay. */
  corte: T | null;
  /** El cambio —configuración o corte— guardado EN este mes, si lo hay. */
  cambioDelMes: T | null;
  /**
   * Lo que regiría si se quitara el cambio de este mes: la configuración
   * vigente del mes anterior. `null` = la persona quedaría SIN configuración.
   */
  alQuitar: T | null;
  /** El próximo cambio guardado DESPUÉS de este mes: hasta ahí rige este. */
  siguiente: T | null;
  /**
   * Todos los cambios de la persona —configuraciones y cortes—, del más
   * antiguo al más reciente (`esCorte()` los distingue).
   */
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
  const cambioDelMes = cambios.find((f) => indiceMes(f.anio, f.mes) === aqui) ?? null;
  const anterior = mesAnterior(anio, mes);
  const alQuitar = configVigente(cambios, anterior.anio, anterior.mes);
  const rige = cambioVigente(cambios, anio, mes);
  const corte = rige && esCorte(rige) ? rige : null;
  const vigente = rige && !esCorte(rige) ? rige : null;
  const propia = cambioDelMes && !esCorte(cambioDelMes) ? cambioDelMes : null;
  const siguiente = cambios.find((f) => indiceMes(f.anio, f.mes) > aqui) ?? null;
  return {
    vigente,
    origen: propia ? "propia" : vigente ? "heredada" : corte ? "suspendida" : "ninguna",
    propia,
    corte,
    cambioDelMes,
    alQuitar,
    siguiente,
    cambios,
  };
}

/* ------------------------------------------------------------------ */
/* Qué les pasa a los borradores cuando se quita la configuración      */
/* ------------------------------------------------------------------ */

/**
 * LA REGLA DE LOS BORRADORES (22 sep 2026, decisión de César)
 * ----------------------------------------------------------
 * Cuando se QUITA un cambio o se SUSPENDE la herencia desde el mes N, los meses
 * afectados son N y los siguientes, hasta el mes anterior al próximo cambio
 * guardado (o sin límite, si no hay otro). En esos meses:
 *   · las liquidaciones **cerradas o pagadas** NO se tocan jamás: siguen con
 *     su cálculo congelado;
 *   · los **borradores** de un mes que SIGUE teniendo configuración (heredada
 *     de un mes anterior) se CONSERVAN: se recalculan solos con la heredada y
 *     guardan sus conceptos manuales (bonos, préstamos…);
 *   · los **borradores** de un mes que queda SIN ninguna configuración se
 *     ELIMINAN en la misma operación (sus cifras ya no se pueden calcular) y la
 *     persona vuelve a salir en la Liquidación como «sin configurar».
 * Los borradores de meses NO afectados no se miran: si alguno ya estaba sin
 * configuración de antes, la Liquidación lo muestra como tal con su aviso.
 *
 * Es una función pura: la usan la pantalla (para decir en la confirmación
 * cuántos borradores y de qué períodos se eliminarían) y la server action
 * (para eliminarlos de verdad), con las mismas filas, así que no pueden
 * contradecirse.
 */

/** Lo mínimo de una liquidación para aplicar la regla. */
export interface LiquidacionDeMes {
  anio: number;
  mes: number;
  estado: string;
}

export interface EfectoEnBorradores<L extends LiquidacionDeMes> {
  /** Borradores de meses afectados que quedan sin configuración: se eliminan. */
  eliminar: L[];
  /** Borradores de meses afectados que siguen con configuración: se conservan. */
  conservar: L[];
  /** Desde qué mes y hasta cuál (incluido; `null` = sin límite) llega el efecto. */
  desde: MesNomina;
  hasta: MesNomina | null;
}

/** Las filas tal como quedarían al QUITAR el cambio del mes (se borra su fila). */
export function filasTrasQuitar<T extends FilaConfigMensual>(
  filas: readonly T[],
  anio: number,
  mes: number,
): T[] {
  return filas.filter((f) => !(f.anio === anio && f.mes === mes));
}

/**
 * Las filas tal como quedarían al SUSPENDER la herencia desde el mes: la fila de
 * ese mes (si había un resto en cero) se reemplaza por un corte.
 */
export function filasTrasCortar<T extends FilaConfigMensual>(
  filas: readonly T[],
  anio: number,
  mes: number,
): FilaConfigMensual[] {
  return [
    ...filasTrasQuitar(filas, anio, mes),
    { anio, mes, salario_basico: 0, sin_configuracion: true },
  ];
}

/**
 * Aplica la regla de los borradores a las liquidaciones de UNA persona.
 * `filasDespues` = sus filas de configuración tal como quedarán
 * (`filasTrasQuitar` / `filasTrasCortar`); `desde` = el mes del cambio.
 */
export function efectoEnBorradores<L extends LiquidacionDeMes>(
  liquidaciones: readonly L[],
  filasDespues: readonly FilaConfigMensual[],
  desde: MesNomina,
): EfectoEnBorradores<L> {
  const inicio = indiceMes(desde.anio, desde.mes);
  const proximo =
    cambiosDeConfig(filasDespues).find((f) => indiceMes(f.anio, f.mes) > inicio) ?? null;
  const fin = proximo ? indiceMes(proximo.anio, proximo.mes) : Infinity;

  const eliminar: L[] = [];
  const conservar: L[] = [];
  for (const l of liquidaciones) {
    if (l.estado !== "borrador") continue; // cerradas y pagadas: jamás
    const indice = indiceMes(l.anio, l.mes);
    if (indice < inicio || indice >= fin) continue; // mes no afectado
    if (configVigente(filasDespues, l.anio, l.mes)) conservar.push(l);
    else eliminar.push(l);
  }

  const orden = (a: L, b: L) => indiceMes(a.anio, a.mes) - indiceMes(b.anio, b.mes);
  return {
    eliminar: eliminar.sort(orden),
    conservar: conservar.sort(orden),
    desde: { anio: desde.anio, mes: desde.mes },
    hasta: proximo ? mesAnterior(proximo.anio, proximo.mes) : null,
  };
}
