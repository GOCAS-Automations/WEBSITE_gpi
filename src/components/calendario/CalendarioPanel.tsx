"use client";

/**
 * CUADRÍCULA MENSUAL + AGENDA DEL MES
 * ===================================
 * El corazón de `/admin/calendario`. Es un Client Component porque abrir el
 * detalle de un evento, el formulario o el aplazamiento son estados de
 * pantalla; los DATOS siguen viniendo del servidor y las escrituras siguen
 * siendo server actions, que llegan por props.
 *
 * DECISIONES DE DISEÑO
 * --------------------
 *  · La cuadrícula está hecha a mano con `construirMes()` (ver
 *    `src/lib/calendario.ts`). No entra ninguna librería de calendario: son
 *    quince líneas de aritmética de fechas y el panel ya carga Recharts.
 *  · La semana empieza en LUNES, como los calendarios colombianos.
 *  · Los FESTIVOS salen de la misma regla que usan las jornadas
 *    (`nombreFestivo` → `festivosDelAnio` de `src/lib/ley-laboral.ts`,
 *    calculados para cualquier año), así que el calendario y el cálculo de
 *    horas extra no pueden discrepar sobre qué día es festivo.
 *  · En escritorio cada casilla muestra hasta tres eventos como fichas de
 *    color; en móvil, donde una ficha con texto no cabe, muestra puntos del
 *    color del estado y el detalle se lee en la AGENDA de abajo, que es la
 *    forma natural de recorrer un mes con el dedo.
 *  · El mes que se está viendo viaja en la URL (`?anio=&mes=`): el enlace se
 *    puede compartir y el botón atrás del navegador funciona.
 *
 * El estado guarda el ID del evento abierto, NO el objeto: cuando una acción
 * revalida y llega la lista nueva, la ficha se vuelve a derivar de ella sola y
 * enseña los datos frescos.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ActionState } from "@/lib/admin-types";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  agruparPorFecha,
  construirMes,
  DIAS_SEMANA,
  EVENTO_ESTADO_CHIP,
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_COLOR,
  EVENTO_ESTADO_LABELS,
  EVENTO_ESTADOS,
  formatearRangoHoras,
  mesAnterior,
  mesSiguiente,
  nombreCompletoResponsable,
  nombreMes,
  resumirResponsables,
  type EventoRecord,
} from "@/lib/calendario";
import { Badge, Paginacion, usePaginaLocal } from "@/components/admin/ui-base";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Users,
} from "@/lib/icons";
import { ModalPanel } from "./ModalPanel";
import { EventoDetalle } from "./EventoDetalle";
import { EventoFormulario } from "./EventoFormulario";
import type { OpcionPerfil } from "./SelectorResponsables";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Cuántas fichas caben en una casilla antes de resumir con «+N más». */
const CHIPS_POR_DIA = 3;

export function CalendarioPanel({
  eventos,
  perfiles,
  anio,
  mes,
  hoy,
  puedeAdministrar,
  guardar,
  cambiarEstado,
  aplazar,
  devolverFechaOriginal,
  eliminar,
  agregarNota,
}: {
  eventos: EventoRecord[];
  perfiles: OpcionPerfil[];
  anio: number;
  mes: number;
  /** `YYYY-MM-DD` de hoy en Colombia (lo calcula el servidor). */
  hoy: string;
  puedeAdministrar: boolean;
  guardar: Accion;
  cambiarEstado: Accion;
  aplazar: Accion;
  /** Deshacer el aplazamiento: el evento vuelve a su día original. */
  devolverFechaOriginal: Accion;
  eliminar: Accion;
  agregarNota: Accion;
}) {
  const acciones = {
    cambiarEstado,
    aplazar,
    devolverFechaOriginal,
    eliminar,
    agregarNota,
  };
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creandoEn, setCreandoEn] = useState<string | null>(null);

  const semanas = useMemo(() => construirMes(anio, mes), [anio, mes]);
  // La agenda del mes se pagina de 10 en 10 (regla del panel); cambiar de mes
  // vuelve a la primera página.
  const agenda = usePaginaLocal(eventos, `${anio}-${mes}`);
  const porFecha = useMemo(() => agruparPorFecha(eventos), [eventos]);

  const detalle = detalleId
    ? (eventos.find((e) => e.id === detalleId) ?? null)
    : null;
  const editando = editandoId
    ? (eventos.find((e) => e.id === editandoId) ?? null)
    : null;

  const anterior = mesAnterior(anio, mes);
  const siguiente = mesSiguiente(anio, mes);
  const urlMes = (a: number, m: number) => `/admin/calendario?anio=${a}&mes=${m}`;

  function cerrarTodo() {
    setDetalleId(null);
    setEditandoId(null);
    setCreandoEn(null);
  }

  return (
    <div className="space-y-5">
      {/* ---------------- Barra del mes ---------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Link
            prefetch={false}
            href={urlMes(anterior.anio, anterior.mes)}
            aria-label={`Ver ${nombreMes(anterior.anio, anterior.mes)}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {/* `first-letter:uppercase` y no `capitalize`: con `capitalize` el
              mes se leería «Septiembre De 2026», con la preposición en mayúscula. */}
          <h2 className="min-w-[10.5rem] text-center text-lg font-extrabold text-ink first-letter:uppercase sm:min-w-[12rem] sm:text-xl">
            {nombreMes(anio, mes)}
          </h2>
          <Link
            prefetch={false}
            href={urlMes(siguiente.anio, siguiente.mes)}
            aria-label={`Ver ${nombreMes(siguiente.anio, siguiente.mes)}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            prefetch={false}
            href="/admin/calendario"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <Calendar className="h-4 w-4" />
            Hoy
          </Link>
        </div>

        {puedeAdministrar && (
          <button
            type="button"
            onClick={() => setCreandoEn(hoy)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
          >
            <Plus className="h-4 w-4" />
            Nuevo evento
          </button>
        )}
      </div>

      {/* ---------------- Leyenda ---------------- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-2xl border border-line bg-white px-4 py-2.5">
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

      {/* La agenda se pone al lado SOLO en pantallas muy anchas (≥1536 px). En
          un portátil de 1440 px, robarle 21rem a la cuadrícula dejaba casillas
          de 80 px donde no cabía ni la hora: ahí es mejor el calendario a todo
          lo ancho y la agenda debajo. */}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ---------------- Cuadrícula ---------------- */}
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
              return (
                <div
                  key={celda.fecha}
                  className={`group relative min-h-[4.75rem] border-b border-r border-line p-1 last:border-r-0 sm:min-h-[7rem] sm:p-1.5 ${
                    celda.delMes ? "bg-white" : "bg-mist/40"
                  } ${celda.finDeSemana && celda.delMes ? "bg-mist/30" : ""}`}
                >
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
                    {puedeAdministrar && celda.delMes && (
                      <button
                        type="button"
                        onClick={() => setCreandoEn(celda.fecha)}
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
                          onClick={() => setDetalleId(evento.id)}
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
                          onClick={() => setDetalleId(delDia[CHIPS_POR_DIA].id)}
                          className="w-full rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold text-brand-dark hover:underline"
                        >
                          +{delDia.length - CHIPS_POR_DIA} más
                        </button>
                      </li>
                    )}
                  </ul>

                  {/* Móvil: puntos de color; el detalle se lee en la agenda */}
                  {delDia.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {delDia.slice(0, 4).map((evento) => (
                        <span
                          key={evento.id}
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            background: EVENTO_ESTADO_COLOR[evento.estado],
                          }}
                        />
                      ))}
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

        {/* ---------------- Agenda del mes ---------------- */}
        <aside className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
          <h3 className="text-sm font-bold text-ink">
            Agenda de {nombreMes(anio, mes)}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-graphite">
            Los {eventos.length} evento(s) del mes, en orden. Pulsa uno para ver
            su detalle, sus notas y cerrarlo.
          </p>

          {eventos.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-mist/60 px-4 py-6 text-center text-sm leading-relaxed text-graphite">
              No hay nada programado este mes.
              {puedeAdministrar && " Pulsa «Nuevo evento» para empezar."}
            </p>
          ) : (
            <>
            <ul id="agenda-mes" className="mt-3 scroll-mt-28 space-y-2">
              {agenda.visibles.map((evento) => (
                <li key={evento.id}>
                  <button
                    type="button"
                    onClick={() => setDetalleId(evento.id)}
                    className="w-full rounded-xl border border-line bg-white px-3.5 py-3 text-left transition-colors hover:border-brand/40 hover:bg-mist/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-sm font-bold leading-snug text-ink">
                        {evento.titulo}
                      </p>
                      <Badge className={EVENTO_ESTADO_CLASSES[evento.estado]}>
                        {EVENTO_ESTADO_LABELS[evento.estado]}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-graphite">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatearFechaLarga(evento.fecha)} ·{" "}
                      {formatearRangoHoras(evento.horaInicio, evento.horaFin)}
                    </p>
                    <p
                      className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-graphite"
                      title={evento.responsables
                        .map(nombreCompletoResponsable)
                        .join(", ")}
                    >
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {resumirResponsables(evento.responsables, 2)}
                    </p>
                    {evento.totalNotas > 0 && (
                      <p className="mt-0.5 text-xs font-semibold text-brand-dark">
                        {evento.totalNotas} nota(s)
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <Paginacion
              pagina={agenda.pagina}
              total={agenda.total}
              onCambiar={agenda.setPagina}
              ancla="agenda-mes"
              etiqueta="Páginas de la agenda del mes"
              apilado
              className="mt-3 border-t border-line pt-3"
            />
            </>
          )}
        </aside>
      </div>

      {/* ---------------- Ventanas ---------------- */}
      {detalle && !editando && (
        <ModalPanel
          titulo={detalle.titulo}
          descripcion={`${formatearFechaLarga(detalle.fecha)} · ${formatearRangoHoras(detalle.horaInicio, detalle.horaFin)}`}
          onClose={() => setDetalleId(null)}
        >
          <EventoDetalle
            evento={detalle}
            acciones={acciones}
            puedeAdministrar={puedeAdministrar}
            onEditar={() => setEditandoId(detalle.id)}
            onCerrar={cerrarTodo}
          />
        </ModalPanel>
      )}

      {editando && (
        <ModalPanel
          titulo="Editar evento"
          descripcion="Cambia los datos de la actividad. Para cerrarla o moverla de fecha, usa los botones del detalle."
          onClose={() => setEditandoId(null)}
        >
          <EventoFormulario
            evento={editando}
            fechaSugerida={editando.fecha}
            perfiles={perfiles}
            action={guardar}
            onListo={() => setEditandoId(null)}
          />
        </ModalPanel>
      )}

      {creandoEn && (
        <ModalPanel
          titulo="Nuevo evento"
          descripcion="Programa una actividad y asígnale responsables."
          onClose={() => setCreandoEn(null)}
        >
          <EventoFormulario
            evento={null}
            fechaSugerida={creandoEn}
            perfiles={perfiles}
            action={guardar}
            onListo={() => setCreandoEn(null)}
          />
        </ModalPanel>
      )}
    </div>
  );
}
