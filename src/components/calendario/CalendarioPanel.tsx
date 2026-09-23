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
 *  · La cuadrícula, la barra del mes y la leyenda viven desde el 23 sep 2026 en
 *    `CuadriculaMes.tsx`, COMPARTIDAS con el portal del empleado
 *    (`/mi-cuenta?seccion=eventos`): así no hay dos calendarios que se vayan
 *    separando. Está hecha a mano con `construirMes()` (ver
 *    `src/lib/calendario.ts`); no entra ninguna librería de calendario.
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

import { useState } from "react";
import type { ActionState } from "@/lib/admin-types";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_LABELS,
  formatearRangoHoras,
  nombreCompletoResponsable,
  nombreMes,
  resumirResponsables,
  type EventoRecord,
} from "@/lib/calendario";
import { Badge, Paginacion, usePaginaLocal } from "@/components/admin/ui-base";
import { Clock, Plus, Users } from "@/lib/icons";
import { BarraMes, CuadriculaMes, LeyendaEstados } from "./CuadriculaMes";
import { ModalPanel } from "./ModalPanel";
import { EventoDetalle } from "./EventoDetalle";
import { EventoFormulario } from "./EventoFormulario";
import type { OpcionPerfil } from "./SelectorResponsables";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

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
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [creandoEn, setCreandoEn] = useState<string | null>(null);

  // La agenda del mes se pagina de 10 en 10 (regla del panel); cambiar de mes
  // vuelve a la primera página.
  const agenda = usePaginaLocal(eventos, `${anio}-${mes}`);

  const detalle = detalleId
    ? (eventos.find((e) => e.id === detalleId) ?? null)
    : null;
  const editando = editandoId
    ? (eventos.find((e) => e.id === editandoId) ?? null)
    : null;

  const urlMes = (a: number, m: number) => `/admin/calendario?anio=${a}&mes=${m}`;

  function cerrarTodo() {
    setDetalleId(null);
    setEditandoId(null);
    setCreandoEn(null);
  }

  return (
    <div className="space-y-5">
      {/* ---------------- Barra del mes ---------------- */}
      <BarraMes anio={anio} mes={mes} hrefMes={urlMes} hrefHoy="/admin/calendario">
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
      </BarraMes>

      {/* ---------------- Leyenda ---------------- */}
      <LeyendaEstados />

      {/* La agenda se pone al lado SOLO en pantallas muy anchas (≥1536 px). En
          un portátil de 1440 px, robarle 21rem a la cuadrícula dejaba casillas
          de 80 px donde no cabía ni la hora: ahí es mejor el calendario a todo
          lo ancho y la agenda debajo. */}
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ---------------- Cuadrícula ---------------- */}
        <CuadriculaMes
          eventos={eventos}
          anio={anio}
          mes={mes}
          hoy={hoy}
          onEvento={setDetalleId}
          onCrear={puedeAdministrar ? setCreandoEn : undefined}
        />

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
            agregarNota={agregarNota}
            manager={
              puedeAdministrar
                ? {
                    cambiarEstado,
                    aplazar,
                    devolverFechaOriginal,
                    eliminar,
                    onEditar: () => setEditandoId(detalle.id),
                    onCerrar: cerrarTodo,
                  }
                : null
            }
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
