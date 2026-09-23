"use client";

/**
 * «MIS EVENTOS» — el calendario visto desde el portal del empleado
 * ================================================================
 * Desde el 23 sep 2026 (pedido de la administradora de GPI) esta pestaña ya no
 * es una lista: es **la misma vista mensual del panel**, con los mismos
 * colores, los mismos festivos y la misma navegación de mes, pero SOLO con los
 * eventos en los que la persona figura como responsable.
 *
 * QUÉ SE COMPARTE Y QUÉ NO
 * ------------------------
 * La cuadrícula, la barra del mes y la leyenda son las piezas comunes de
 * `@/components/calendario/CuadriculaMes`, y el detalle es el mismo
 * `EventoDetalle` del panel abierto con `manager={null}`: solo lectura más la
 * caja para escribir una nota. Aquí no llega ninguna server action de manager,
 * así que no hay botón que esconder.
 *
 * LO QUE SE VE LO DECIDE LA BASE, NO ESTE COMPONENTE
 * --------------------------------------------------
 * Las políticas de la migración 0010 solo dejan leer los eventos propios, y la
 * consulta del servidor filtra además por `responsableId`. La nota se inserta
 * firmada con la cuenta de la sesión (`evento_notas_insert_autor`). Aquí no hay
 * ninguna comprobación de rol porque no serviría de nada: la barrera está en
 * RLS.
 *
 * EL MÓVIL (390 px)
 * -----------------
 * La cuadrícula de siete columnas cabe, pero una ficha con texto dentro de una
 * casilla de ~50 px no se lee. Así que en el teléfono la casilla enseña puntos
 * del color del estado, **se toca entera** y debajo aparece la agenda de ESE
 * día, con fichas grandes que se pulsan con el pulgar y abren el detalle. En
 * escritorio se pulsan directamente las fichas de la casilla, como en el panel.
 * Ni un scroll horizontal en ninguno de los dos.
 */

import { useMemo, useState } from "react";
import type { ActionState } from "@/lib/admin-types";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  agruparPorFecha,
  EVENTO_ESTADO_CHIP,
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_LABELS,
  formatearRangoHoras,
  nombreCompletoResponsable,
  nombreMes,
  resumirResponsables,
  type EventoRecord,
} from "@/lib/calendario";
import { Badge, Paginacion, usePaginaLocal } from "@/components/admin/ui-base";
import {
  BarraMes,
  CuadriculaMes,
  LeyendaEstados,
} from "@/components/calendario/CuadriculaMes";
import { EventoDetalle } from "@/components/calendario/EventoDetalle";
import { ModalPanel } from "@/components/calendario/ModalPanel";
import { Calendar, Clock, Users } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function MisEventos({
  eventos,
  agregarNota,
  anio,
  mes,
  hoy,
  hrefBase,
  nombrePropio,
}: {
  /** Los eventos DEL MES en los que la persona es responsable. */
  eventos: EventoRecord[];
  agregarNota: Accion;
  anio: number;
  mes: number;
  /** `YYYY-MM-DD` de hoy en Colombia (lo calcula el servidor). */
  hoy: string;
  /**
   * Dirección de esta pestaña sin mes, ya con `?seccion=eventos` y con
   * `portal=1` si hacía falta. Los meses se cuelgan de ella con `&anio=&mes=`.
   */
  hrefBase: string;
  /** Para no repetirse a sí misma la persona en «con quién lo comparte». */
  nombrePropio: string;
}) {
  const [detalleId, setDetalleId] = useState<string | null>(null);
  // Día elegido en el teléfono. Arranca en hoy si hoy cae en el mes que se ve.
  const [diaSel, setDiaSel] = useState<string | null>(null);

  const porFecha = useMemo(() => agruparPorFecha(eventos), [eventos]);
  // La agenda del mes se pagina de 10 en 10, como todo listado del sitio;
  // cambiar de mes vuelve a la primera página.
  const agenda = usePaginaLocal(eventos, `${anio}-${mes}`);

  const detalle = detalleId
    ? (eventos.find((e) => e.id === detalleId) ?? null)
    : null;

  const diaVisible = diaSel ?? (porFecha.has(hoy) ? hoy : null);
  const delDia = diaVisible ? (porFecha.get(diaVisible) ?? []) : [];

  return (
    <section id="mis-eventos" className="scroll-mt-28 space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink sm:text-2xl">
          <Calendar className="h-6 w-6 text-brand-dark" />
          Mis eventos
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-graphite">
          El calendario de GPI con <strong>tus</strong> actividades: las que
          tienes asignadas como responsable. Pulsa una para ver de qué se trata,
          con quién es y dejar una <strong>nota</strong> contando cómo va o qué
          pasó; quien coordina la lee en el panel. Aquí no se programan ni se
          cierran eventos: eso lo hace tu coordinador.
        </p>
      </header>

      <BarraMes
        anio={anio}
        mes={mes}
        hrefMes={(a, m) => `${hrefBase}&anio=${a}&mes=${m}`}
        hrefHoy={hrefBase}
      />

      <LeyendaEstados />

      <CuadriculaMes
        eventos={eventos}
        anio={anio}
        mes={mes}
        hoy={hoy}
        onEvento={setDetalleId}
        diaSeleccionado={diaVisible}
        onSeleccionarDia={setDiaSel}
      />

      {/* ---------------- Agenda del día tocado (solo móvil) ----------------
          En escritorio las fichas de la casilla ya se pulsan; en el teléfono
          esta es la forma de leer lo que hay en un día sin apretar un punto de
          6 px. */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:hidden">
        <h2 className="text-sm font-bold text-ink">
          {diaVisible
            ? formatearFechaLarga(diaVisible)
            : "Toca un día del calendario"}
        </h2>
        {diaVisible && delDia.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-graphite">
            No tienes nada asignado ese día.
          </p>
        ) : !diaVisible ? (
          <p className="mt-2 text-sm leading-relaxed text-graphite">
            Los días con actividad llevan un punto de color. Tócalo para ver qué
            hay.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {delDia.map((evento) => (
              <li key={evento.id}>
                <button
                  type="button"
                  onClick={() => setDetalleId(evento.id)}
                  className={`block w-full rounded-xl border-l-4 px-3.5 py-3 text-left transition-colors ${
                    EVENTO_ESTADO_CHIP[evento.estado]
                  }`}
                >
                  <span className="block text-sm font-bold leading-snug">
                    {evento.titulo}
                  </span>
                  <span className="mt-1 block text-xs font-semibold opacity-90">
                    {formatearRangoHoras(evento.horaInicio, evento.horaFin)} ·{" "}
                    {EVENTO_ESTADO_LABELS[evento.estado]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- Agenda del mes ---------------- */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <h2 className="text-sm font-bold text-ink">
          Agenda de {nombreMes(anio, mes)}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-graphite">
          {eventos.length === 0
            ? "Este mes no tienes actividades asignadas."
            : `Tus ${eventos.length} evento(s) de este mes, en orden. Pulsa uno para ver su detalle y sus notas.`}
        </p>

        {eventos.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line bg-mist/60 px-4 py-6 text-center text-sm leading-relaxed text-graphite">
            Cuando tu coordinador te asigne una actividad en el calendario de
            GPI, aparecerá aquí con su día, su hora y lo que hay que hacer.
            Revisa también los meses siguientes con las flechas de arriba.
          </p>
        ) : (
          <>
            <ul id="agenda-mis-eventos" className="mt-3 scroll-mt-28 space-y-2">
              {agenda.visibles.map((evento) => {
                const otros = evento.responsables.filter(
                  (r) => r.nombre !== nombrePropio,
                );
                return (
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
                      {otros.length > 0 && (
                        <p
                          className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-graphite"
                          title={otros.map(nombreCompletoResponsable).join(", ")}
                        >
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          Con {resumirResponsables(otros, 2)}
                        </p>
                      )}
                      {evento.notas.length > 0 && (
                        <p className="mt-0.5 text-xs font-semibold text-brand-dark">
                          {evento.notas.length} nota(s)
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <Paginacion
              pagina={agenda.pagina}
              total={agenda.total}
              onCambiar={agenda.setPagina}
              ancla="agenda-mis-eventos"
              etiqueta="Páginas de la agenda del mes"
              apilado
              className="mt-3 border-t border-line pt-3"
            />
          </>
        )}
      </div>

      {/* ---------------- Detalle ----------------
          `manager={null}`: solo lectura y la caja de notas. El empleado no
          puede cerrar, aplazar, editar ni eliminar un evento, ni aquí ni en el
          servidor (las actions piden manager y RLS lo comprueba otra vez). */}
      {detalle && (
        <ModalPanel
          titulo={detalle.titulo}
          descripcion={`${formatearFechaLarga(detalle.fecha)} · ${formatearRangoHoras(
            detalle.horaInicio,
            detalle.horaFin,
          )}`}
          onClose={() => setDetalleId(null)}
        >
          <EventoDetalle
            evento={detalle}
            agregarNota={agregarNota}
            manager={null}
          />
        </ModalPanel>
      )}
    </section>
  );
}
