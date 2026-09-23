"use client";

/**
 * PIEZAS COMPARTIDAS DE LA VISTA MENSUAL
 * ======================================
 * La cuadrícula del mes, la barra de navegación entre meses y la leyenda de
 * colores. Las usan LAS DOS pantallas que enseñan el calendario:
 *
 *   · `CalendarioPanel` — `/admin/calendario`, para managers (con «+» para
 *     programar en un día y todas las acciones de cierre).
 *   · `MisEventos` — `/mi-cuenta?seccion=eventos`, el portal del empleado, que
 *     ve EXACTAMENTE lo mismo pero solo con sus eventos y sin poder tocar nada
 *     (23 sep 2026, pedido de la administradora de GPI).
 *
 * Se extrajo a un módulo aparte para no tener dos cuadrículas que se vayan
 * separando con el tiempo: los festivos, los colores por estado, la semana que
 * empieza en lunes y el «hoy» marcado son los mismos en las dos.
 *
 * QUÉ CAMBIA ENTRE LAS DOS
 * ------------------------
 * Solo lo que llega por props: `onCrear` (el «+» de cada día, que el portal no
 * pasa) y `onSeleccionarDia` (la selección de un día, que es como el portal
 * resuelve el MÓVIL: la casilla entera se puede tocar y debajo aparece la
 * agenda de ese día). Sin `onSeleccionarDia` la cuadrícula se comporta igual
 * que siempre.
 *
 * NADA DE SEGURIDAD VIVE AQUÍ: qué eventos llegan lo deciden las políticas de
 * la migración 0010 y el filtro por responsable de `listEventos`.
 */

import Link from "next/link";
import { useMemo } from "react";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  agruparPorFecha,
  construirMes,
  DIAS_SEMANA,
  EVENTO_ESTADO_CHIP,
  EVENTO_ESTADO_COLOR,
  EVENTO_ESTADO_LABELS,
  EVENTO_ESTADOS,
  mesAnterior,
  mesSiguiente,
  nombreMes,
  type EventoRecord,
} from "@/lib/calendario";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "@/lib/icons";

/** Cuántas fichas caben en una casilla antes de resumir con «+N más». */
const CHIPS_POR_DIA = 3;

/** Cuántos puntos de color caben en una casilla del móvil. */
const PUNTOS_POR_DIA = 4;

/* ------------------------------------------------------------------ */
/* Barra del mes                                                       */
/* ------------------------------------------------------------------ */

/**
 * «‹ septiembre de 2026 › · Hoy», con el mes viajando en la URL. Los enlaces
 * los arma quien la usa (`hrefMes`), porque el panel y el portal tienen rutas y
 * parámetros distintos (`/admin/calendario?anio=` vs.
 * `/mi-cuenta?seccion=eventos&anio=`).
 */
export function BarraMes({
  anio,
  mes,
  hrefMes,
  hrefHoy,
  children,
}: {
  anio: number;
  mes: number;
  hrefMes: (anio: number, mes: number) => string;
  /** A dónde lleva «Hoy» (la misma pantalla sin mes en la dirección). */
  hrefHoy: string;
  /** Lo que va a la derecha de la barra (p. ej. «Nuevo evento»). */
  children?: React.ReactNode;
}) {
  const anterior = mesAnterior(anio, mes);
  const siguiente = mesSiguiente(anio, mes);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <Link
          prefetch={false}
          href={hrefMes(anterior.anio, anterior.mes)}
          aria-label={`Ver ${nombreMes(anterior.anio, anterior.mes)}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {/* `first-letter:uppercase` y no `capitalize`: con `capitalize` el
            mes se leería «Septiembre De 2026», con la preposición en mayúscula. */}
        <h2 className="min-w-[9.5rem] text-center text-base font-extrabold text-ink first-letter:uppercase sm:min-w-[12rem] sm:text-xl">
          {nombreMes(anio, mes)}
        </h2>
        <Link
          prefetch={false}
          href={hrefMes(siguiente.anio, siguiente.mes)}
          aria-label={`Ver ${nombreMes(siguiente.anio, siguiente.mes)}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          prefetch={false}
          href={hrefHoy}
          className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <Calendar className="h-4 w-4" />
          Hoy
        </Link>
      </div>

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Leyenda de colores                                                  */
/* ------------------------------------------------------------------ */

export function LeyendaEstados({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-line bg-white px-4 py-2.5 ${className}`}
    >
      <span className="text-xs font-bold uppercase tracking-wide text-graphite">
        Colores
      </span>
      {EVENTO_ESTADOS.map((estado) => (
        <span
          key={estado}
          className="inline-flex items-center gap-1.5 text-xs text-graphite"
        >
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 shrink-0 rounded-sm"
            style={{ background: EVENTO_ESTADO_COLOR[estado] }}
          />
          {EVENTO_ESTADO_LABELS[estado]}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cuadrícula del mes                                                  */
/* ------------------------------------------------------------------ */

export function CuadriculaMes({
  eventos,
  anio,
  mes,
  hoy,
  onEvento,
  onCrear,
  diaSeleccionado,
  onSeleccionarDia,
}: {
  eventos: EventoRecord[];
  anio: number;
  mes: number;
  /** `YYYY-MM-DD` de hoy en Colombia (lo calcula el servidor). */
  hoy: string;
  /** Abrir el detalle de un evento. */
  onEvento: (id: string) => void;
  /** Programar en un día. Solo lo pasa el panel; el portal, nunca. */
  onCrear?: (fecha: string) => void;
  /** Día resaltado (el que se está viendo en la agenda del día, en móvil). */
  diaSeleccionado?: string | null;
  /** Tocar una casilla en MÓVIL. Sin esto la casilla no es pulsable. */
  onSeleccionarDia?: (fecha: string) => void;
}) {
  const semanas = useMemo(() => construirMes(anio, mes), [anio, mes]);
  const porFecha = useMemo(() => agruparPorFecha(eventos), [eventos]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="grid grid-cols-7 border-b border-line bg-mist/70">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d.largo}
            className="px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-graphite"
          >
            <span className="sm:hidden">{d.corto}</span>
            <span className="hidden capitalize sm:inline">{d.largo}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {semanas.flat().map((celda) => {
          const delDia = porFecha.get(celda.fecha) ?? [];
          const esHoy = celda.fecha === hoy;
          const seleccionado = diaSeleccionado === celda.fecha;
          return (
            <div
              key={celda.fecha}
              // El fondo se decide con UNA sola clase: dos utilidades de fondo
              // en la misma cadena no se resuelven por el orden en que están
              // escritas, sino por el orden del CSS generado.
              className={`group relative min-h-[4.75rem] border-b border-r border-line p-1 last:border-r-0 sm:min-h-[7rem] sm:p-1.5 ${
                seleccionado
                  ? "bg-brand-tint ring-2 ring-inset ring-brand"
                  : !celda.delMes
                    ? "bg-mist/40"
                    : celda.finDeSemana
                      ? "bg-mist/30"
                      : "bg-white"
              }`}
            >
              {/* MÓVIL: la casilla entera se toca y abajo aparece la agenda de
                  ese día. Es una capa encima del contenido (que en el teléfono
                  son solo el número y los puntos de color), nunca en
                  escritorio: allí lo pulsable son las fichas. */}
              {onSeleccionarDia && (
                <button
                  type="button"
                  onClick={() => onSeleccionarDia(celda.fecha)}
                  aria-pressed={seleccionado}
                  className="absolute inset-0 z-10 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:hidden"
                >
                  <span className="sr-only">
                    {`Ver el ${formatearFechaLarga(celda.fecha)}: ${
                      delDia.length === 0
                        ? "sin eventos"
                        : `${delDia.length} evento(s)`
                    }`}
                  </span>
                </button>
              )}

              <div className="flex items-start justify-between gap-1">
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${
                    esHoy
                      ? "bg-brand-dark text-white"
                      : celda.delMes
                        ? "text-ink"
                        : "text-graphite/50"
                  }`}
                >
                  {celda.dia}
                </span>
                {onCrear && celda.delMes && (
                  <button
                    type="button"
                    onClick={() => onCrear(celda.fecha)}
                    aria-label={`Programar un evento el ${formatearFechaLarga(celda.fecha)}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-graphite opacity-0 transition-all hover:bg-brand-tint hover:text-brand-deep focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {celda.festivo && (
                <p
                  className="mt-0.5 truncate text-[10px] font-semibold text-brand-deep"
                  title={celda.festivo}
                >
                  <span className="hidden sm:inline">{celda.festivo}</span>
                  <span className="sm:hidden">Festivo</span>
                </p>
              )}

              {/* Escritorio: fichas con la hora y el título */}
              <ul className="mt-1 hidden space-y-1 sm:block">
                {delDia.slice(0, CHIPS_POR_DIA).map((evento) => (
                  <li key={evento.id}>
                    {/* Dos líneas —hora arriba, título abajo— porque en una
                        sola, con casillas de ~120 px, del título no se
                        alcanzaba a leer ni la primera palabra. */}
                    <button
                      type="button"
                      onClick={() => onEvento(evento.id)}
                      title={`${evento.horaInicio} · ${evento.titulo}`}
                      className={`block w-full rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-semibold leading-tight transition-colors ${
                        EVENTO_ESTADO_CHIP[evento.estado]
                      }`}
                    >
                      <span className="block text-[10px] font-bold opacity-80">
                        {evento.horaInicio}
                      </span>
                      <span className="block truncate">{evento.titulo}</span>
                    </button>
                  </li>
                ))}
                {delDia.length > CHIPS_POR_DIA && (
                  <li>
                    <button
                      type="button"
                      onClick={() => onEvento(delDia[CHIPS_POR_DIA].id)}
                      className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-brand-dark hover:underline"
                    >
                      +{delDia.length - CHIPS_POR_DIA} más
                    </button>
                  </li>
                )}
              </ul>

              {/* Móvil: puntos de color; el detalle se lee abajo */}
              {delDia.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-0.5 sm:hidden">
                  {delDia.slice(0, PUNTOS_POR_DIA).map((evento) => (
                    <span
                      key={evento.id}
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: EVENTO_ESTADO_COLOR[evento.estado],
                      }}
                    />
                  ))}
                  {delDia.length > PUNTOS_POR_DIA && (
                    <span
                      aria-hidden="true"
                      className="text-[9px] font-bold leading-none text-graphite"
                    >
                      +{delDia.length - PUNTOS_POR_DIA}
                    </span>
                  )}
                  <span className="sr-only">
                    {delDia.length} evento(s) este día
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
