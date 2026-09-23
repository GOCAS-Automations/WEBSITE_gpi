/**
 * PERMISOS DE FALTA — tipos, textos y la regla del DESCUENTO
 * ==========================================================
 * Módulo **PURO**: no toca la base de datos, no lee cookies y no importa nada
 * en tiempo de ejecución. Lo pueden usar a la vez los Server Components, los
 * Client Components y el script de pruebas
 * (`node --experimental-strip-types scripts/pruebas-nomina.mjs`).
 *
 * QUÉ ES UN PERMISO
 * -----------------
 * La versión digital del formato en papel «SOLICITUD DE PERMISO» (XP C2 C91)
 * que GPI diligencia a mano. Tiene dos formas:
 *   · **día completo** — uno o varios días seguidos (`fecha_inicio … fecha_fin`);
 *   · **por horas** — un tramo de UN solo día (`hora_inicio … hora_fin`).
 *
 * Y dos caminos:
 *   · **solicitud** — la pide el colaborador desde su Mi Cuenta y un manager la
 *     aprueba o la rechaza (con nota);
 *   · **registro del administrador** — un manager registra directamente la
 *     falta de alguien; nace **aprobada y no remunerada**.
 *
 * REMUNERADO: DOS COLUMNAS, NO UNA
 * --------------------------------
 * `remunerado_solicitado` es lo que PIDE el colaborador; `remunerado` es lo que
 * DECIDE el aprobador (NULL mientras esté pendiente). La casilla del aprobador
 * llega marcada con lo que se pidió, pero manda él.
 *
 * LA REGLA DEL DESCUENTO (decidida con GPI, 23 sep 2026)
 * ------------------------------------------------------
 * Descuenta **solo** un permiso APROBADO y NO remunerado:
 *
 *   · **Día completo** → ese día **y, además, el domingo de esa semana**: al
 *     faltar sin justa causa se pierde el descanso dominical REMUNERADO
 *     (art. 173 del CST). Si en la misma semana hay varias faltas, el domingo se
 *     descuenta **una sola vez**. La semana va de lunes a domingo.
 *   · **Por horas** → solo esas horas, **en proporción a la jornada programada
 *     de ese día** (2 h de un día de 8,5 h descuentan 2 ÷ 8,5 de un día). **No**
 *     arrastra el domingo.
 *   · El descuento se aplica sobre **el salario y el auxilio de transporte**
 *     (todo lo que se paga por día): la base diaria es
 *     `(salario + auxilio mensual) ÷ 30`. Eso lo hace `src/lib/nomina.ts`; aquí
 *     solo se cuentan los DÍAS.
 *   · El domingo perdido se descuenta en la **misma liquidación donde cae el día
 *     de la falta**, aunque el domingo caiga en el período siguiente. Para que
 *     no se cobre dos veces, el domingo se atribuye al período donde cae el
 *     PRIMER día de falta de esa semana (por eso `faltasDelPeriodo` recibe
 *     también los permisos de los días vecinos al período).
 *
 * Dos salvaguardas contra el doble descuento:
 *   · si el domingo de la semana es ÉL MISMO un día de falta, no se suma aparte
 *     (ya se está descontando como día);
 *   · un permiso por horas en un día que además está cubierto por un permiso de
 *     día completo no suma nada.
 */

/* ================================================================== */
/* 1. Tipos y catálogos                                                */
/* ================================================================== */

export const PERMISO_TIPOS = ["dia", "horas"] as const;
export type PermisoTipo = (typeof PERMISO_TIPOS)[number];

export const PERMISO_TIPO_LABELS: Record<PermisoTipo, string> = {
  dia: "Día completo",
  horas: "Por horas",
};

export const PERMISO_TIPO_DESCRIPCIONES: Record<PermisoTipo, string> = {
  dia: "Uno o varios días seguidos sin trabajar.",
  horas: "Un rato de un solo día (por ejemplo, una cita médica de 2 horas).",
};

export const PERMISO_ESTADOS = ["pendiente", "aprobado", "rechazado"] as const;
export type PermisoEstado = (typeof PERMISO_ESTADOS)[number];

export const PERMISO_ESTADO_LABELS: Record<PermisoEstado, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const PERMISO_ESTADO_DESCRIPCIONES: Record<PermisoEstado, string> = {
  pendiente:
    "El colaborador la envió y todavía nadie la ha revisado. Mientras esté así, él puede corregirla o anularla.",
  aprobado:
    "Concedido. Si quedó como NO remunerado, descuenta en la nómina del período.",
  rechazado:
    "No se concedió. El permiso se queda en el sistema con la nota del aprobador, para que el colaborador la lea.",
};

export const PERMISO_ESTADO_CLASSES: Record<PermisoEstado, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  aprobado: "bg-brand-tint text-brand-dark",
  rechazado: "bg-red-100 text-red-700",
};

export const PERMISO_ORIGENES = ["solicitud", "registro_admin"] as const;
export type PermisoOrigen = (typeof PERMISO_ORIGENES)[number];

export const PERMISO_ORIGEN_LABELS: Record<PermisoOrigen, string> = {
  solicitud: "Solicitud del colaborador",
  registro_admin: "Falta registrada por un manager",
};

/** Opciones del filtro de estado de la bandeja (módulo puro: lo lee el servidor). */
export const PERMISO_FILTRO_ESTADOS: { value: PermisoEstado | "todos"; label: string }[] = [
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobado", label: "Aprobados" },
  { value: "rechazado", label: "Rechazados" },
  { value: "todos", label: "Todos" },
];

export const PERMISO_FILTRO_ESTADO_DEFECTO: PermisoEstado | "todos" = "pendiente";

/** Los filtros de la bandeja, tal como viajan en la dirección. */
export interface FiltrosPermiso {
  estado: string;
  employeeId: string;
  /** `YYYY-MM-DD` o cadena vacía. */
  desde: string;
  hasta: string;
}

/**
 * La dirección de la bandeja con esos filtros. Omite lo que esté en su valor
 * por defecto y **nunca escribe `pagina`**: reescribir la URL sin ella es lo
 * que devuelve a la primera página al cambiar un filtro.
 *
 * Vive AQUÍ, en un módulo puro, y no junto a la barra de filtros: esa barra es
 * un Client Component, y un valor exportado desde un módulo `"use client"` no
 * se puede leer desde el servidor (la página falla entera con «Attempted to
 * call … from the server»). Es la misma razón por la que
 * `JORNADA_FILTRO_ESTADOS` vive en `src/lib/admin-types.ts`.
 */
export function urlPermisos(filtros: FiltrosPermiso): string {
  const params = new URLSearchParams();
  // La pestaña viaja siempre: cambiar un filtro no puede devolver a Aprobaciones.
  params.set("vista", "permisos");
  if (filtros.estado && filtros.estado !== PERMISO_FILTRO_ESTADO_DEFECTO)
    params.set("estado", filtros.estado);
  if (filtros.employeeId) params.set("empleado", filtros.employeeId);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  return `/admin/jornadas?${params.toString()}`;
}

/** Topes de longitud de los campos de texto, compartidos por pantalla y acción. */
export const LIMITES_PERMISO = {
  motivo: 500,
  reemplazo: 120,
  observaciones: 500,
  nota: 500,
} as const;

/** Lo que acepta el soporte: un PDF o una foto, hasta 5 MB. */
export const SOPORTE_TIPOS_ACEPTADOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const SOPORTE_EXTENSIONES = [".pdf", ".jpg", ".jpeg", ".png"] as const;

export const SOPORTE_MAX_BYTES = 5 * 1024 * 1024;

export const SOPORTE_AYUDA =
  "Opcional. Un PDF o una foto (JPG o PNG) de hasta 5 MB: la incapacidad, la citación médica o el documento que respalde el permiso. Se guarda en un almacén privado: solo lo pueden abrir tú y quien aprueba.";

/** Una fila de `permisos` ya normalizada. */
export interface PermisoRecord {
  id: string;
  employee_id: string;
  tipo: PermisoTipo;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string;
  reemplazo: string | null;
  observaciones: string | null;
  soporte_path: string | null;
  soporte_nombre: string | null;
  remunerado_solicitado: boolean;
  remunerado: boolean | null;
  estado: PermisoEstado;
  nota_revision: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  origen: PermisoOrigen;
  creado_por: string | null;
  created_at: string | null;
  updated_at: string | null;

  /* Resueltos contra `profiles` por quien lee (no son columnas). */
  employee_name?: string;
  employee_cedula?: string | null;
  employee_cargo?: string | null;
  reviewer_name?: string;
}

export function normalizarTipoPermiso(value: unknown): PermisoTipo {
  return (PERMISO_TIPOS as readonly string[]).includes(String(value))
    ? (String(value) as PermisoTipo)
    : "dia";
}

export function normalizarEstadoPermiso(value: unknown): PermisoEstado {
  return (PERMISO_ESTADOS as readonly string[]).includes(String(value))
    ? (String(value) as PermisoEstado)
    : "pendiente";
}

export function normalizarOrigenPermiso(value: unknown): PermisoOrigen {
  return (PERMISO_ORIGENES as readonly string[]).includes(String(value))
    ? (String(value) as PermisoOrigen)
    : "solicitud";
}

/* ================================================================== */
/* 2. Fechas y horas (sin dependencias: todo sobre `YYYY-MM-DD`)       */
/* ================================================================== */

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` válido. */
export function esFechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== "string" || !ES_FECHA.test(fecha)) return false;
  const t = Date.parse(`${fecha}T00:00:00Z`);
  return Number.isFinite(t);
}

function aUTC(fecha: string): number {
  return Date.parse(`${fecha}T00:00:00Z`);
}

const DIA_MS = 86_400_000;

function deUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha `YYYY-MM-DD`. */
export function sumarDias(fecha: string, dias: number): string {
  return deUTC(aUTC(fecha) + dias * DIA_MS);
}

/** Días de diferencia entre dos fechas (`hasta − desde`). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aUTC(hasta) - aUTC(desde)) / DIA_MS);
}

/** 0 = lunes … 6 = domingo (semana laboral colombiana, de lunes a domingo). */
export function indiceDiaLunes(fecha: string): number {
  return (new Date(aUTC(fecha)).getUTCDay() + 6) % 7;
}

/** El lunes de la semana de esa fecha: la CLAVE de la semana. */
export function lunesDeSemana(fecha: string): string {
  return sumarDias(fecha, -indiceDiaLunes(fecha));
}

/** El domingo de la semana de esa fecha (el día de descanso remunerado). */
export function domingoDeSemana(fecha: string): string {
  return sumarDias(lunesDeSemana(fecha), 6);
}

/** `"08:30"`, `"08:30:00"` → minutos desde medianoche; `null` si no se entiende. */
export function minutosDeHora(hora: unknown): number | null {
  if (typeof hora !== "string") return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Horas decimales de un permiso por horas; 0 si las horas no se entienden. */
export function horasDelTramo(
  horaInicio: unknown,
  horaFin: unknown,
): number {
  const a = minutosDeHora(horaInicio);
  const b = minutosDeHora(horaFin);
  if (a === null || b === null || b <= a) return 0;
  return Math.round(((b - a) / 60) * 100) / 100;
}

/**
 * Tope de días que se expanden de un permiso, por si una fila vieja o
 * manipulada trajera un rango absurdo. Un año de permiso ya es un caso para
 * hablar con la persona, no para que el servidor recorra 100 000 días.
 */
const MAX_DIAS_PERMISO = 400;

/** Las fechas que cubre un permiso de DÍA completo, de la primera a la última. */
export function diasDelPermiso(permiso: {
  tipo: PermisoTipo;
  fecha_inicio: string;
  fecha_fin: string;
}): string[] {
  if (!esFechaValida(permiso.fecha_inicio)) return [];
  const fin = esFechaValida(permiso.fecha_fin) ? permiso.fecha_fin : permiso.fecha_inicio;
  if (permiso.tipo === "horas") return [permiso.fecha_inicio];
  const total = diasEntre(permiso.fecha_inicio, fin);
  if (total < 0) return [permiso.fecha_inicio];
  const dias: string[] = [];
  for (let i = 0; i <= Math.min(total, MAX_DIAS_PERMISO); i += 1) {
    dias.push(sumarDias(permiso.fecha_inicio, i));
  }
  return dias;
}

/** Cuántos días cubre el permiso (1 si es por horas). */
export function duracionEnDias(permiso: {
  tipo: PermisoTipo;
  fecha_inicio: string;
  fecha_fin: string;
}): number {
  return diasDelPermiso(permiso).length;
}

/* ================================================================== */
/* 3. El descuento: cuántos DÍAS se pierden en un período              */
/* ================================================================== */

/** Lo mínimo que necesita el cálculo del descuento. */
export interface PermisoParaNomina {
  id: string;
  tipo: PermisoTipo;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado: PermisoEstado;
  /** La DECISIÓN del aprobador. Solo `false` descuenta. */
  remunerado: boolean | null;
  motivo?: string;
  /**
   * Horas de la JORNADA PROGRAMADA de ese día, para repartir un permiso por
   * horas. Lo resuelve quien lee (necesita `horarios_mensuales`); 0 o ausente
   * = el día no estaba programado y el permiso por horas no descuenta nada.
   */
  horasJornada?: number;
}

/** Un día completo de falta descontado. */
export interface DiaFalta {
  fecha: string;
  permisoId: string;
  motivo: string;
}

/** Un permiso por horas, ya convertido a fracción de día. */
export interface FaltaParcial {
  fecha: string;
  permisoId: string;
  motivo: string;
  horas: number;
  horasJornada: number;
  /** `horas ÷ horasJornada`, tope 1 (nunca se descuenta más de un día). */
  fraccion: number;
}

/** Lo que se pierde en un período por faltas no remuneradas, en DÍAS. */
export interface FaltasPeriodo {
  /** Días completos de ausencia que caen dentro del período. */
  completos: DiaFalta[];
  /** Domingos de descanso remunerado perdidos, atribuidos a este período. */
  domingos: string[];
  /** Permisos por horas del período, ya en fracción de día. */
  parciales: FaltaParcial[];
  /** Total en días: completos + domingos + fracciones. */
  dias: number;
  /** Solo los días completos. */
  diasCompletos: number;
  /** Solo los domingos perdidos. */
  diasDomingos: number;
  /** Solo lo que suman las fracciones por horas. */
  diasPorHoras: number;
}

/** Cuatro decimales: una fracción de día no necesita más y evita el ruido binario. */
function redondear4(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0;
}

export function faltasVacias(): FaltasPeriodo {
  return {
    completos: [],
    domingos: [],
    parciales: [],
    dias: 0,
    diasCompletos: 0,
    diasDomingos: 0,
    diasPorHoras: 0,
  };
}

/** ¿Este permiso descuenta? Solo si está APROBADO y quedó NO remunerado. */
export function descuenta(permiso: {
  estado: PermisoEstado;
  remunerado: boolean | null;
}): boolean {
  return permiso.estado === "aprobado" && permiso.remunerado === false;
}

/**
 * **LA REGLA DEL DESCUENTO.** Cuántos días se pierden en `[desde, hasta]` por
 * permisos aprobados y no remunerados.
 *
 * `permisos` debe traer también los de los días VECINOS al período (una semana
 * a cada lado basta): el domingo de una semana se atribuye al período donde
 * cae el PRIMER día de falta de esa semana, y sin ver ese día no se sabría si
 * ya se cobró antes. Los permisos que no descuentan se ignoran aquí, así que
 * quien llama puede pasarlos todos sin filtrar.
 *
 * Función pura y total: nunca lanza y nunca devuelve NaN.
 */
export function faltasDelPeriodo(
  permisos: readonly PermisoParaNomina[],
  desde: string,
  hasta: string,
): FaltasPeriodo {
  const salida = faltasVacias();
  if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) return salida;

  const descontables = (permisos ?? []).filter(descuenta);

  /* --- 1. Todos los días completos de falta, del período y de fuera --- */
  // `fecha → permiso`, para saber a qué solicitud pertenece cada día y para
  // detectar de un vistazo si una fecha ya está cubierta por un día completo.
  const diasCompletos = new Map<string, PermisoParaNomina>();
  for (const p of descontables) {
    if (p.tipo !== "dia") continue;
    for (const fecha of diasDelPermiso(p)) {
      if (!diasCompletos.has(fecha)) diasCompletos.set(fecha, p);
    }
  }

  /* --- 2. Los que caen DENTRO del período --- */
  const dentro = [...diasCompletos.entries()]
    .filter(([fecha]) => fecha >= desde && fecha <= hasta)
    .sort(([a], [b]) => a.localeCompare(b));

  salida.completos = dentro.map(([fecha, p]) => ({
    fecha,
    permisoId: p.id,
    motivo: p.motivo ?? "",
  }));

  /* --- 3. El domingo de cada semana con falta (art. 173 CST) ---
     Uno por semana, y solo si el PRIMER día de falta de esa semana cae en este
     período: si cayó antes, ese domingo ya se descontó en la liquidación
     anterior. Si el propio domingo es día de falta, no se suma aparte. */
  const semanas = new Set(dentro.map(([fecha]) => lunesDeSemana(fecha)));
  const domingos: string[] = [];
  for (const lunes of semanas) {
    const diasDeLaSemana = [...diasCompletos.keys()]
      .filter((f) => lunesDeSemana(f) === lunes)
      .sort();
    const primero = diasDeLaSemana[0];
    if (primero && primero < desde) continue; // ya se cobró en el período anterior
    const domingo = sumarDias(lunes, 6);
    if (diasCompletos.has(domingo)) continue; // ya se descuenta como día de falta
    domingos.push(domingo);
  }
  salida.domingos = domingos.sort();

  /* --- 4. Los permisos por horas --- */
  for (const p of descontables) {
    if (p.tipo !== "horas") continue;
    const fecha = p.fecha_inicio;
    if (!esFechaValida(fecha) || fecha < desde || fecha > hasta) continue;
    // Ese día ya se descuenta entero: sumar la fracción sería cobrarlo dos veces.
    if (diasCompletos.has(fecha)) continue;

    const horas = horasDelTramo(p.hora_inicio, p.hora_fin);
    const horasJornada =
      Number.isFinite(p.horasJornada) && (p.horasJornada as number) > 0
        ? (p.horasJornada as number)
        : 0;
    const fraccion =
      horasJornada > 0 ? Math.min(1, redondear4(horas / horasJornada)) : 0;
    if (fraccion <= 0) continue;

    salida.parciales.push({
      fecha,
      permisoId: p.id,
      motivo: p.motivo ?? "",
      horas,
      horasJornada,
      fraccion,
    });
  }
  salida.parciales.sort((a, b) => a.fecha.localeCompare(b.fecha));

  /* --- 5. Totales --- */
  salida.diasCompletos = salida.completos.length;
  salida.diasDomingos = salida.domingos.length;
  salida.diasPorHoras = redondear4(
    salida.parciales.reduce((s, p) => s + p.fraccion, 0),
  );
  salida.dias = redondear4(
    salida.diasCompletos + salida.diasDomingos + salida.diasPorHoras,
  );
  return salida;
}

/* ================================================================== */
/* 4. Textos                                                           */
/* ================================================================== */

const MESES = [
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

/** `2026-10-05` → «5 de octubre de 2026». */
export function fechaLarga(fecha: string): string {
  if (!esFechaValida(fecha)) return fecha ?? "";
  const [a, m, d] = fecha.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** `2026-10-05` → «5 oct 2026». */
export function fechaCorta(fecha: string): string {
  if (!esFechaValida(fecha)) return fecha ?? "";
  const [a, m, d] = fecha.split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)} ${a}`;
}

/** `"14:30"` → «2:30 p. m.» */
export function hora12(hora: string | null | undefined): string {
  const min = minutosDeHora(hora);
  if (min === null) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

/**
 * Cuándo es el permiso, en una línea:
 *   «5 de octubre de 2026» · «del 5 al 7 de octubre de 2026 (3 días)» ·
 *   «5 de octubre de 2026, de 8:00 a. m. a 10:00 a. m. (2 h)».
 */
export function cuandoEs(permiso: {
  tipo: PermisoTipo;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}): string {
  if (permiso.tipo === "horas") {
    const horas = horasDelTramo(permiso.hora_inicio, permiso.hora_fin);
    const tramo = `${hora12(permiso.hora_inicio)} a ${hora12(permiso.hora_fin)}`;
    return `${fechaLarga(permiso.fecha_inicio)}, de ${tramo}${
      horas > 0 ? ` (${textoHoras(horas)})` : ""
    }`;
  }
  const dias = duracionEnDias(permiso);
  if (dias <= 1) return fechaLarga(permiso.fecha_inicio);
  return `del ${fechaCorta(permiso.fecha_inicio)} al ${fechaCorta(
    permiso.fecha_fin,
  )} (${dias} días)`;
}

/** `2` → «2 h» · `2.5` → «2,5 h». */
export function textoHoras(horas: number): string {
  const n = Number.isFinite(horas) ? Math.round(horas * 100) / 100 : 0;
  return `${String(n).replace(".", ",")} h`;
}

/** `1` → «1 día» · `2.5` → «2,5 días». */
export function textoDias(dias: number): string {
  const n = Number.isFinite(dias) ? Math.round(dias * 100) / 100 : 0;
  return `${String(n).replace(".", ",")} ${n === 1 ? "día" : "días"}`;
}

/**
 * La línea que explica el descuento en la liquidación y en el volante:
 * «2 días (incluye 1 domingo)».
 */
export function textoFaltas(faltas: {
  dias: number;
  diasDomingos: number;
  diasPorHoras: number;
}): string {
  const partes: string[] = [];
  if (faltas.diasDomingos > 0) {
    partes.push(
      `incluye ${faltas.diasDomingos} ${
        faltas.diasDomingos === 1 ? "domingo" : "domingos"
      }`,
    );
  }
  if (faltas.diasPorHoras > 0) {
    partes.push(`${textoDias(faltas.diasPorHoras)} por permisos de horas`);
  }
  return `${textoDias(faltas.dias)}${partes.length ? ` (${partes.join(" · ")})` : ""}`;
}

/** ¿El permiso aportó soporte? Es la casilla «APORTA SOPORTE SI/NO» del formato. */
export function aportaSoporte(permiso: { soporte_path: string | null }): boolean {
  return typeof permiso.soporte_path === "string" && permiso.soporte_path !== "";
}

/**
 * Nombre de archivo apto para una ruta del bucket: sin tildes, sin espacios,
 * corto. Mismo criterio que `nombreSeguro` de las imágenes del panel, pero aquí
 * en un módulo puro porque lo usa el servidor.
 */
export function nombreArchivoSoporte(nombre: string): string {
  const limpio = (nombre || "soporte")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase()
    .replace(/-+/g, "-")
    .slice(-60);
  return limpio.replace(/^[-.]+/, "") || "soporte";
}

/** La ruta dentro del bucket privado: `permisos/<empleado>/<permiso>/<archivo>`. */
export function rutaSoporte(
  employeeId: string,
  permisoId: string,
  nombre: string,
): string {
  return `permisos/${employeeId}/${permisoId}/${Date.now()}-${nombreArchivoSoporte(nombre)}`;
}
