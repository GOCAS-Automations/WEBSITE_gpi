/**
 * CALENDARIO INTERNO DE PROGRAMACIÓN — tipos y helpers
 * =====================================================
 * Módulo PURO (sin `next/headers`, sin Supabase y sin `"use client"`): lo
 * importan a la vez los Server Components que consultan, las server actions que
 * escriben y los Client Components que pintan la cuadrícula. Es la misma regla
 * que ya cumplen `src/lib/admin-types.ts` y `src/lib/roles.ts`: un valor
 * exportado desde un módulo de cliente no se puede leer en el servidor.
 *
 * Las fechas se manejan SIEMPRE como cadenas `YYYY-MM-DD` en hora de Colombia
 * (`hoyEnColombia()` de `src/lib/jornada.ts`) y las horas como `HH:MM`. Nunca se
 * construye un `Date` con la zona del navegador para decidir en qué día cae un
 * evento: eso es lo que hace que una actividad de las 6 a. m. salte al día
 * anterior según dónde esté abierto el panel.
 */

import { formatearHora12, nombreFestivo } from "@/lib/jornada";
import { etiquetaCompleta, etiquetaCorta } from "@/lib/usuarios";

/* ------------------------------------------------------------------ */
/* Estados                                                             */
/* ------------------------------------------------------------------ */

export const EVENTO_ESTADOS = [
  "programado",
  "cumplido",
  "incompleto",
  "aplazado",
] as const;

export type EventoEstado = (typeof EVENTO_ESTADOS)[number];

/** Estados "abiertos": el evento todavía espera un cierre. */
export const EVENTO_ESTADOS_ABIERTOS: EventoEstado[] = ["programado", "aplazado"];

/** Estados "cerrados": ya se dijo cómo salió la actividad. */
export const EVENTO_ESTADOS_CERRADOS: EventoEstado[] = ["cumplido", "incompleto"];

export const EVENTO_ESTADO_LABELS: Record<EventoEstado, string> = {
  programado: "Programado",
  cumplido: "Cumplido",
  incompleto: "Incompleto",
  aplazado: "Aplazado",
};

/** Qué significa cada estado, en lenguaje llano (ayudas del panel). */
export const EVENTO_ESTADO_DESCRIPCIONES: Record<EventoEstado, string> = {
  programado:
    "Está agendado y todavía no se ha cerrado. Es el estado con el que nace todo evento.",
  cumplido: "Se hizo completo. Es el cierre normal de una actividad.",
  incompleto:
    "Se hizo a medias o no se pudo hacer. Deja una nota explicando por qué. Si después se decide repetirlo, se puede aplazar a otra fecha.",
  aplazado:
    "Se movió a otra fecha y sigue abierto (todavía hay que hacerlo). El calendario recuerda para qué día estaba antes.",
};

/** Clases del badge de estado (mismo lenguaje visual que las jornadas). */
export const EVENTO_ESTADO_CLASSES: Record<EventoEstado, string> = {
  programado: "bg-mist text-graphite",
  cumplido: "bg-brand-tint text-brand-deep",
  incompleto: "bg-red-100 text-red-700",
  aplazado: "bg-amber-100 text-amber-800",
};

/**
 * Clases del chip que se pinta DENTRO de la cuadrícula del mes: fondo suave y
 * un filete del color del estado a la izquierda, para que el color se lea de un
 * vistazo sin convertir el calendario en un semáforo.
 */
export const EVENTO_ESTADO_CHIP: Record<EventoEstado, string> = {
  programado: "border-l-graphite/60 bg-mist text-ink-soft hover:bg-line",
  cumplido: "border-l-brand bg-brand-tint text-brand-deep hover:bg-brand/15",
  incompleto: "border-l-red-500 bg-red-50 text-red-700 hover:bg-red-100",
  aplazado: "border-l-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100",
};

/** Color sólido del estado (leyenda, puntos del móvil y gráficas de Recharts). */
export const EVENTO_ESTADO_COLOR: Record<EventoEstado, string> = {
  programado: "#6d6e71",
  cumplido: "#3dae2b",
  incompleto: "#dc2626",
  aplazado: "#f59e0b",
};

/** Normaliza cualquier valor guardado a un estado válido. */
export function normalizarEstado(value: unknown): EventoEstado {
  return typeof value === "string" &&
    (EVENTO_ESTADOS as readonly string[]).includes(value)
    ? (value as EventoEstado)
    : "programado";
}

/* ------------------------------------------------------------------ */
/* Máquina de estados: qué se puede hacer con un evento                */
/* ------------------------------------------------------------------ */

/**
 * INVARIANTE DEL CALENDARIO (18 sep 2026)
 * ---------------------------------------
 * **Lo que la pantalla dice de un evento y lo que cuenta el tablero nunca
 * pueden contradecirse.**
 *
 * El caso que lo rompía: `fecha_original` (la fecha que el evento tenía antes
 * de moverse) es lo que dispara el aviso ámbar «estaba programado para el … y
 * se aplazó», pero las métricas cuentan por `estado`. Reabrir un evento ya
 * aplazado lo devolvía a `programado` CONSERVANDO `fecha_original`: en pantalla
 * se leía «se aplazó» y en el tablero sumaba como programado.
 *
 * La regla que cierra el agujero: **un evento ABIERTO que ya se movió alguna
 * vez es `aplazado`, nunca `programado`**. `programado` queda reservado para lo
 * que sigue en su fecha original. Formalmente:
 *
 *     estado ∈ {programado, aplazado}  ⇒  (estado === 'aplazado' ⇔ fechaOriginal ≠ null)
 *
 * Los estados cerrados (`cumplido`, `incompleto`) sí pueden llevar
 * `fecha_original`: ahí el dato es historia («se movió y luego se hizo»), no
 * una afirmación sobre el presente.
 *
 * MATRIZ ESTADO → ACCIONES
 * ------------------------
 * | Estado desde | Cumplido | Incompleto | Reabrir | Aplazar | Devolver a fecha original | Editar | Eliminar |
 * | ------------ | :------: | :--------: | :-----: | :-----: | :-----------------------: | :----: | :------: |
 * | programado   |    Sí    |     Sí     |   no¹   |   Sí    |           no⁷             |   Sí   |    Sí    |
 * | aplazado     |    Sí    |     Sí     |   no¹   |   Sí²   |           Sí⁸             |   Sí   |    Sí    |
 * | cumplido     |   no³    |     Sí     |   Sí⁴   |  NO⁵    |           NO⁹             |   Sí   |    Sí    |
 * | incompleto   |    Sí    |    no³     |   Sí⁴   |   Sí⁶   |           NO⁹             |   Sí   |    Sí    |
 *
 *  ¹ Ya está abierto: reabrirlo no haría nada.
 *  ² Se vuelve a mover; `fecha_original` NO cambia (guarda el primer día).
 *  ³ Ya está en ese estado.
 *  ⁴ Vuelve a quedar abierto: `programado` si nunca se movió, `aplazado` si sí.
 *  ⁵ **Un evento que ya se hizo no se aplaza.** Si en realidad no se hizo,
 *    primero se marca incompleto o se reabre, y después se mueve de fecha.
 *  ⁶ Reprogramar lo que quedó a medias: se mueve de fecha y vuelve a quedar
 *    abierto (`aplazado`).
 *  ⁷ Por el invariante, un evento `programado` NUNCA tiene `fecha_original`:
 *    no hay a dónde volver. La condición se escribe igual (`fechaOriginal ≠
 *    null`) para que la regla se sostenga sola y no dependa del estado.
 *  ⁸ **Deshacer el aplazamiento**: el evento vuelve a su día original, se
 *    limpia `fecha_original` y queda `programado` — que es justo lo que exige
 *    el invariante, porque ya no queda constancia de ningún movimiento.
 *  ⁹ **En un evento ya cerrado, `fecha_original` es HISTORIA**: dice que se
 *    movió y que después se cumplió o quedó incompleto, en la fecha que tiene.
 *    Devolverlo reescribiría el pasado y movería de día una actividad que ya
 *    pasó. Si de verdad hay que corregirla, primero se **reabre** (vuelve a
 *    `aplazado`) y entonces sí se devuelve a su fecha.
 *
 * Esto lo comprueban a la vez la interfaz (`EventoDetalle`, que solo pinta los
 * botones con sentido) y el servidor (`cambiarEstadoEvento`, `aplazarEvento` y
 * `devolverFechaOriginalEvento`, que rechazan lo demás). Ocultar un botón nunca
 * es una barrera.
 */

/** El estado ABIERTO que le toca a un evento según si ya se movió de fecha. */
export function estadoAbierto(fechaOriginal: string | null | undefined): EventoEstado {
  return fechaOriginal ? "aplazado" : "programado";
}

/** ¿Está el evento todavía sin cerrar? */
export function estaAbierto(estado: EventoEstado): boolean {
  return EVENTO_ESTADOS_ABIERTOS.includes(estado);
}

/** Qué acciones tienen sentido sobre un evento. Única fuente de la matriz. */
export interface AccionesDisponibles {
  cumplido: boolean;
  incompleto: boolean;
  reabrir: boolean;
  aplazar: boolean;
  /** Deshacer el aplazamiento: volver al día original y quedar `programado`. */
  devolverFechaOriginal: boolean;
  /** Estado al que volvería el evento si se reabre. */
  estadoAlReabrir: EventoEstado;
}

export function accionesDisponibles(evento: {
  estado: EventoEstado;
  fechaOriginal: string | null;
}): AccionesDisponibles {
  const abierto = estaAbierto(evento.estado);
  return {
    cumplido: evento.estado !== "cumplido",
    incompleto: evento.estado !== "incompleto",
    // Reabrir solo tiene sentido sobre un evento ya cerrado.
    reabrir: !abierto,
    // Lo único que no se aplaza es lo que ya se hizo.
    aplazar: evento.estado !== "cumplido",
    // Deshacer el aplazamiento: hace falta que haya algo que deshacer y que el
    // evento siga ABIERTO. En uno cerrado la fecha original es historia (ver la
    // nota ⁹ de la matriz), no una decisión pendiente.
    devolverFechaOriginal: abierto && evento.fechaOriginal !== null,
    estadoAlReabrir: estadoAbierto(evento.fechaOriginal),
  };
}

/* ------------------------------------------------------------------ */
/* Registros                                                           */
/* ------------------------------------------------------------------ */

export interface EventoResponsable {
  id: string;
  /** `null` cuando el responsable es alguien de fuera de GPI. */
  profileId: string | null;
  /** Nombre a mostrar: el de la cuenta, o el que se escribió a mano. */
  nombre: string;
  /**
   * Apodo de la cuenta (migración 0010), p. ej. «YC». `null` en los externos y
   * en quien no tenga. Es lo que se pinta donde el espacio manda; el nombre
   * completo se conserva en el `title` del elemento.
   */
  apodo: string | null;
  /** Cargo de la cuenta del portal (vacío en los externos). */
  cargo: string | null;
  /** true = persona externa escrita a mano, sin cuenta en el portal. */
  externo: boolean;
}

export interface EventoNota {
  id: string;
  eventoId: string;
  autorId: string | null;
  autorNombre: string;
  /** Apodo del autor (migración 0010), o `null`. */
  autorApodo: string | null;
  texto: string;
  createdAt: string;
}

export interface EventoRecord {
  id: string;
  titulo: string;
  descripcion: string | null;
  /** `YYYY-MM-DD` en hora de Colombia. */
  fecha: string;
  /** `HH:MM`. */
  horaInicio: string;
  horaFin: string;
  estado: EventoEstado;
  /** Fecha del primer aplazamiento, o `null` si nunca se movió. */
  fechaOriginal: string | null;
  creadoPor: string | null;
  creadoPorNombre: string | null;
  createdAt: string | null;
  responsables: EventoResponsable[];
  /** Notas del evento (solo se piden donde se van a mostrar). */
  notas: EventoNota[];
  /** Cuántas notas tiene, aunque no se hayan traído. */
  totalNotas: number;
}

/** Nota con el contexto de su evento, para la pestaña «Notas». */
export interface EventoNotaConEvento extends EventoNota {
  eventoTitulo: string;
  eventoFecha: string;
  eventoEstado: EventoEstado;
}

/* ------------------------------------------------------------------ */
/* Fechas                                                              */
/* ------------------------------------------------------------------ */

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
] as const;

/** Cabecera de la cuadrícula: la semana empieza en LUNES (uso colombiano). */
export const DIAS_SEMANA = [
  { corto: "L", largo: "lunes" },
  { corto: "M", largo: "martes" },
  { corto: "X", largo: "miércoles" },
  { corto: "J", largo: "jueves" },
  { corto: "V", largo: "viernes" },
  { corto: "S", largo: "sábado" },
  { corto: "D", largo: "domingo" },
] as const;

function dosDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** "2026-09-17" → `{ anio: 2026, mes: 9, dia: 17 }`; `null` si no es una fecha. */
export function partesFecha(
  fecha: string,
): { anio: number; mes: number; dia: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return { anio, mes, dia };
}

/** `(2026, 9, 17)` → "2026-09-17". */
export function armarFecha(anio: number, mes: number, dia: number): string {
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

/** "septiembre de 2026" (el título del mes que se está viendo). */
export function nombreMes(anio: number, mes: number): string {
  return `${MESES[Math.min(Math.max(mes, 1), 12) - 1]} de ${anio}`;
}

/** Primer día del mes como `YYYY-MM-DD`. */
export function primerDiaMes(anio: number, mes: number): string {
  return armarFecha(anio, mes, 1);
}

/** Último día del mes como `YYYY-MM-DD`. */
export function ultimoDiaMes(anio: number, mes: number): string {
  return armarFecha(anio, mes, new Date(Date.UTC(anio, mes, 0)).getUTCDate());
}

/** Mes anterior / siguiente, cruzando el cambio de año. */
export function mesAnterior(anio: number, mes: number) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}
export function mesSiguiente(anio: number, mes: number) {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/** Suma (o resta) días a una fecha `YYYY-MM-DD` sin tocar zonas horarias. */
export function sumarDiasFecha(fecha: string, dias: number): string {
  const p = partesFecha(fecha);
  if (!p) return fecha;
  const utc = new Date(Date.UTC(p.anio, p.mes - 1, p.dia + dias));
  return armarFecha(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Día de la semana con lunes = 0 … domingo = 6. */
export function indiceDiaSemana(fecha: string): number {
  const p = partesFecha(fecha);
  if (!p) return 0;
  const dia = new Date(Date.UTC(p.anio, p.mes - 1, p.dia)).getUTCDay();
  return (dia + 6) % 7;
}

export interface CeldaCalendario {
  fecha: string;
  dia: number;
  /** false = día de relleno del mes anterior o siguiente. */
  delMes: boolean;
  /** true = sábado o domingo. */
  finDeSemana: boolean;
  /** Nombre del festivo colombiano, o `null`. */
  festivo: string | null;
}

/**
 * Cuadrícula del mes: semanas completas de lunes a domingo, rellenando los
 * huecos con los días del mes anterior y del siguiente. Se construye a mano
 * (sin librerías de calendario) porque son quince líneas y así no entra una
 * dependencia nueva al bundle del panel.
 */
export function construirMes(anio: number, mes: number): CeldaCalendario[][] {
  const primero = primerDiaMes(anio, mes);
  const arranque = sumarDiasFecha(primero, -indiceDiaSemana(primero));
  const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const semanas = Math.ceil((indiceDiaSemana(primero) + total) / 7);

  return Array.from({ length: semanas }, (_, s) =>
    Array.from({ length: 7 }, (_, d) => {
      const fecha = sumarDiasFecha(arranque, s * 7 + d);
      const p = partesFecha(fecha)!;
      return {
        fecha,
        dia: p.dia,
        delMes: p.mes === mes && p.anio === anio,
        finDeSemana: d >= 5,
        festivo: nombreFestivo(fecha),
      };
    }),
  );
}

/** Agrupa los eventos por su fecha, respetando el orden en que vienen. */
export function agruparPorFecha(
  eventos: EventoRecord[],
): Map<string, EventoRecord[]> {
  const mapa = new Map<string, EventoRecord[]>();
  for (const evento of eventos) {
    const lista = mapa.get(evento.fecha);
    if (lista) lista.push(evento);
    else mapa.set(evento.fecha, [evento]);
  }
  return mapa;
}

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

/** "08:00" + "10:30" → "8:00 a. m. – 10:30 a. m.". */
export function formatearRangoHoras(inicio: string, fin: string): string {
  return `${formatearHora12(inicio)} – ${formatearHora12(fin)}`;
}

/** Duración del evento en minutos (0 si las horas no se pueden leer). */
export function duracionEventoMin(inicio: string, fin: string): number {
  const a = /^(\d{1,2}):(\d{2})/.exec(inicio ?? "");
  const b = /^(\d{1,2}):(\d{2})/.exec(fin ?? "");
  if (!a || !b) return 0;
  const minutos =
    Number(b[1]) * 60 + Number(b[2]) - (Number(a[1]) * 60 + Number(a[2]));
  return minutos > 0 ? minutos : 0;
}

/** Recorta `HH:MM:SS` (lo que devuelve Postgres para `time`) a `HH:MM`. */
export function recortarHora(valor: unknown): string {
  if (typeof valor !== "string") return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(valor);
  return m ? `${dosDigitos(Number(m[1]))}:${m[2]}` : "";
}

/** Fecha y hora de una nota: "17/09/2026, 3:42 p. m.". */
export function formatearMomento(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(fecha);
}

/**
 * Cómo se nombra a un responsable donde el espacio manda: su apodo si lo tiene
 * y, si no, su nombre completo. Los externos siempre salen con el nombre que se
 * escribió a mano (no tienen cuenta, así que no tienen apodo).
 */
export function etiquetaResponsable(responsable: EventoResponsable): string {
  return etiquetaCorta({ apodo: responsable.apodo, nombre: responsable.nombre });
}

/** «Yeison Camacho Rojas (YC)» — para el detalle, donde sí cabe todo. */
export function nombreCompletoResponsable(
  responsable: EventoResponsable,
): string {
  return etiquetaCompleta({
    apodo: responsable.apodo,
    nombre: responsable.nombre,
  });
}

/** Cómo se nombra al conjunto de responsables en una línea (con apodos). */
export function resumirResponsables(
  responsables: EventoResponsable[],
  maximo = 3,
): string {
  if (responsables.length === 0) return "Sin responsables asignados";
  const nombres = responsables.map(etiquetaResponsable);
  if (nombres.length <= maximo) return nombres.join(", ");
  return `${nombres.slice(0, maximo).join(", ")} y ${nombres.length - maximo} más`;
}

/* ------------------------------------------------------------------ */
/* Límites de los campos                                               */
/* ------------------------------------------------------------------ */

export const LIMITES_EVENTO = {
  titulo: 140,
  descripcion: 2000,
  nombreExterno: 80,
  nota: 1500,
  /** Tope de responsables por evento: evita listas imposibles de leer. */
  responsables: 30,
} as const;

/* ------------------------------------------------------------------ */
/* Opciones de filtro compartidas                                      */
/* ------------------------------------------------------------------ */

/** Opciones del filtro de estado. `todos` no es un estado real. */
export const EVENTO_FILTRO_ESTADOS: { value: EventoEstado | "todos"; label: string }[] =
  [
    { value: "todos", label: "Todos los estados" },
    ...EVENTO_ESTADOS.map((e) => ({ value: e, label: EVENTO_ESTADO_LABELS[e] })),
  ];

