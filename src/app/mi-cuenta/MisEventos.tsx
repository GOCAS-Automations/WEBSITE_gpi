"use client";

/**
 * «MIS EVENTOS» — el calendario visto desde el portal del empleado
 * ================================================================
 * Los próximos eventos en los que la persona figura como responsable, con la
 * posibilidad de dejar una nota de seguimiento sin salir de aquí.
 *
 * Lo que se ve lo decide la base de datos, no este componente: las políticas de
 * la migración 0010 solo dejan leer los eventos propios, y la nota se inserta
 * firmada con la cuenta de la sesión (`evento_notas_insert_autor`). Aquí no hay
 * ninguna comprobación de rol porque no serviría de nada: la barrera está en
 * RLS.
 *
 * Es una sección COMPACTA a propósito: el portal existe para registrar
 * jornadas, y el calendario es información de apoyo. Por eso solo se listan los
 * eventos de hoy en adelante y el formulario de nota va plegado.
 */

import { useState } from "react";
import type { ActionState } from "@/lib/admin-types";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_LABELS,
  formatearMomento,
  formatearRangoHoras,
  etiquetaResponsable,
  nombreCompletoResponsable,
  type EventoRecord,
} from "@/lib/calendario";
import { Badge } from "@/components/admin/ui-base";
import { NotaForm } from "@/components/calendario/NotaForm";
import { Calendar, ChevronDown, Clock, Users } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function MisEventos({
  eventos,
  agregarNota,
  nombrePropio,
}: {
  eventos: EventoRecord[];
  agregarNota: Accion;
  /** Para no repetirse a sí misma la persona en «con quién lo comparte». */
  nombrePropio: string;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  if (eventos.length === 0) {
    return (
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Calendar className="h-5 w-5 text-brand-dark" />
          Mis eventos
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          No tienes actividades programadas por ahora. Cuando tu coordinador te
          asigne una en el calendario de GPI, aparecerá aquí con su día, su hora
          y lo que hay que hacer.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Calendar className="h-5 w-5 text-brand-dark" />
          Mis eventos
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-graphite">
          Las actividades del calendario de GPI en las que eres responsable, de
          hoy en adelante. Puedes dejar una <strong>nota</strong> en cualquiera
          para contar cómo va o qué pasó; quien coordina la lee en el panel.
        </p>
      </header>

      <ul className="space-y-3">
        {eventos.map((evento) => {
          const otros = evento.responsables.filter(
            (r) => r.nombre !== nombrePropio,
          );
          const expandido = abierto === evento.id;

          return (
            <li
              key={evento.id}
              className="rounded-2xl border border-line bg-mist/40 px-4 py-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-ink">
                    {evento.titulo}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-graphite">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatearFechaLarga(evento.fecha)} ·{" "}
                    {formatearRangoHoras(evento.horaInicio, evento.horaFin)}
                  </p>
                  {otros.length > 0 && (
                    <p
                      className="mt-0.5 flex items-start gap-1.5 text-xs text-graphite"
                      title={otros.map(nombreCompletoResponsable).join(", ")}
                    >
                      <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Con {otros.map(etiquetaResponsable).join(", ")}
                    </p>
                  )}
                </div>
                <Badge className={EVENTO_ESTADO_CLASSES[evento.estado]}>
                  {EVENTO_ESTADO_LABELS[evento.estado]}
                </Badge>
              </div>

              {evento.descripcion && (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {evento.descripcion}
                </p>
              )}

              {evento.fechaOriginal && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  Estaba programado para el{" "}
                  {formatearFechaLarga(evento.fechaOriginal)} y se aplazó.
                </p>
              )}

              <button
                type="button"
                onClick={() => setAbierto(expandido ? null : evento.id)}
                aria-expanded={expandido}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
              >
                {expandido
                  ? "Cerrar"
                  : `Dejar una nota${
                      evento.notas.length > 0
                        ? ` · ${evento.notas.length} escrita(s)`
                        : ""
                    }`}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    expandido ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandido && (
                <div className="mt-3 space-y-3 rounded-xl border border-line bg-white p-4">
                  {evento.notas.length > 0 && (
                    <ul className="space-y-2">
                      {evento.notas.map((nota) => (
                        <li
                          key={nota.id}
                          className="rounded-lg bg-mist/60 px-3 py-2"
                        >
                          <p className="text-[11px] font-semibold text-graphite">
                            {nota.autorNombre} ·{" "}
                            {formatearMomento(nota.createdAt)}
                          </p>
                          <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                            {nota.texto}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                  <NotaForm
                    eventoId={evento.id}
                    action={agregarNota}
                    idCampo={`mi-nota-${evento.id}`}
                    etiqueta="Tu nota"
                    placeholder="Ej.: llegué a la planta pero el equipo estaba en producción; se reprograma la revisión."
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
