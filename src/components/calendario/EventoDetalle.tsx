"use client";

/**
 * DETALLE DE UN EVENTO
 * ====================
 * Lo que se ve al pulsar un evento en el calendario: cuándo es, quién responde,
 * qué hay que hacer, el hilo de notas y —solo para managers— los botones que
 * lo cierran, lo aplazan, lo editan o lo eliminan.
 *
 * CERRAR ≠ ELIMINAR, y aquí hay que decirlo igual que en las jornadas:
 * «Incompleto» deja constancia de que la actividad no salió y conserva sus
 * notas; «Eliminar» borra el evento y su historia. Por eso eliminar pasa por
 * dos barreras (desplegar el aviso rojo y confirmar en el navegador).
 */

import { useActionState, useEffect, useState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Badge } from "@/components/admin/ui-base";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Close,
  Info,
  Pencil,
  Trash,
  User,
  Users,
} from "@/lib/icons";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_DESCRIPCIONES,
  EVENTO_ESTADO_LABELS,
  formatearMomento,
  formatearRangoHoras,
  nombreCompletoResponsable,
  type EventoRecord,
} from "@/lib/calendario";
import { NotaForm } from "./NotaForm";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export interface AccionesEvento {
  cambiarEstado: Accion;
  aplazar: Accion;
  eliminar: Accion;
  agregarNota: Accion;
}

export function EventoDetalle({
  evento,
  acciones,
  puedeAdministrar,
  onEditar,
  onCerrar,
}: {
  evento: EventoRecord;
  acciones: AccionesEvento;
  /** true = manager: ve los botones de cierre, aplazamiento y borrado. */
  puedeAdministrar: boolean;
  onEditar: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* ---------------- Cabecera ---------------- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={EVENTO_ESTADO_CLASSES[evento.estado]}>
            {EVENTO_ESTADO_LABELS[evento.estado]}
          </Badge>
          <span className="text-xs text-graphite">
            {EVENTO_ESTADO_DESCRIPCIONES[evento.estado]}
          </span>
        </div>

        <div className="grid gap-2 rounded-2xl border border-line bg-mist/60 px-4 py-3 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Calendar className="h-4 w-4 shrink-0 text-brand-dark" />
            {formatearFechaLarga(evento.fecha)}
          </p>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock className="h-4 w-4 shrink-0 text-brand-dark" />
            {formatearRangoHoras(evento.horaInicio, evento.horaFin)}
          </p>
        </div>

        {evento.fechaOriginal && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este evento estaba programado para el{" "}
              <strong>{formatearFechaLarga(evento.fechaOriginal)}</strong> y se
              aplazó.
            </span>
          </p>
        )}
      </div>

      {/* ---------------- Descripción ---------------- */}
      {evento.descripcion && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-graphite">
            Qué hay que hacer
          </h3>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {evento.descripcion}
          </p>
        </section>
      )}

      {/* ---------------- Responsables ---------------- */}
      <section>
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-graphite">
          <Users className="h-3.5 w-3.5" />
          Responsables
        </h3>
        {evento.responsables.length === 0 ? (
          <p className="mt-1.5 text-sm text-graphite">
            Nadie asignado todavía.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {evento.responsables.map((r) => (
              <li key={r.id}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    r.externo
                      ? "border-line bg-mist text-graphite"
                      : "border-brand/30 bg-brand-tint text-brand-deep"
                  }`}
                >
                  {!r.externo && <User className="h-3.5 w-3.5" />}
                  {nombreCompletoResponsable(r)}
                  {r.cargo && (
                    <span className="font-normal opacity-80">· {r.cargo}</span>
                  )}
                  {r.externo && (
                    <span className="rounded-full bg-white px-1.5 py-px text-[10px] uppercase tracking-wide">
                      Externo
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------- Acciones (solo managers) ---------------- */}
      {puedeAdministrar && (
        <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-graphite">
            Cerrar o mover el evento
          </h3>

          <div className="flex flex-wrap gap-2">
            {evento.estado !== "cumplido" && (
              <BotonEstado
                action={acciones.cambiarEstado}
                id={evento.id}
                estado="cumplido"
                etiqueta="Marcar cumplido"
                pendienteEtiqueta="Guardando…"
                confirmacion={`¿Marcar «${evento.titulo}» como CUMPLIDO?`}
                className="bg-brand-dark text-white hover:bg-brand-deep"
                icono={<Check className="h-4 w-4" />}
              />
            )}
            {evento.estado !== "incompleto" && (
              <BotonEstado
                action={acciones.cambiarEstado}
                id={evento.id}
                estado="incompleto"
                etiqueta="Marcar incompleto"
                pendienteEtiqueta="Guardando…"
                confirmacion={`¿Marcar «${evento.titulo}» como INCOMPLETO?\n\nEl evento se queda en el calendario con esa marca. Escribe después una nota explicando qué faltó.`}
                className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                icono={<Close className="h-4 w-4" />}
              />
            )}
            {evento.estado !== "programado" && (
              <BotonEstado
                action={acciones.cambiarEstado}
                id={evento.id}
                estado="programado"
                etiqueta="Volver a programado"
                pendienteEtiqueta="Reabriendo…"
                confirmacion={`¿Reabrir «${evento.titulo}»?\n\nVuelve a quedar pendiente por hacer.`}
                className="border border-line bg-white text-ink-soft hover:border-brand hover:text-brand-dark"
              />
            )}
            <button
              type="button"
              onClick={onEditar}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              <Pencil className="h-4 w-4" />
              Editar datos
            </button>
          </div>

          <FormularioAplazar
            action={acciones.aplazar}
            evento={evento}
          />

          <div className="border-t border-line pt-3">
            <BotonEliminar
              action={acciones.eliminar}
              evento={evento}
              onEliminado={onCerrar}
            />
          </div>
        </section>
      )}

      {/* ---------------- Notas ---------------- */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-graphite">
          Notas de seguimiento ({evento.notas.length})
        </h3>

        {evento.notas.length === 0 ? (
          <p className="text-sm text-graphite">
            Todavía no hay notas. Úsalas para dejar constancia de lo que pasó:
            qué se hizo, qué faltó o por qué se movió de fecha.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {evento.notas.map((nota) => (
              <li
                key={nota.id}
                className="rounded-2xl border border-line bg-mist/50 px-4 py-3"
              >
                <p className="text-xs font-semibold text-graphite">
                  {nota.autorNombre} · {formatearMomento(nota.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {nota.texto}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl border border-line bg-white p-4">
          <NotaForm
            eventoId={evento.id}
            action={acciones.agregarNota}
            idCampo={`nota-${evento.id}`}
          />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas internas                                                     */
/* ------------------------------------------------------------------ */

function BotonEstado({
  action,
  id,
  estado,
  etiqueta,
  pendienteEtiqueta,
  confirmacion,
  className,
  icono,
}: {
  action: Accion;
  id: string;
  estado: string;
  etiqueta: string;
  pendienteEtiqueta: string;
  confirmacion: string;
  className: string;
  icono?: React.ReactNode;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmacion)) event.preventDefault();
      }}
      className="inline-flex flex-col"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button
        type="submit"
        disabled={pendiente}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition-colors disabled:pointer-events-none disabled:opacity-60 ${className}`}
      >
        {icono}
        {pendiente ? pendienteEtiqueta : etiqueta}
      </button>
      {state.status === "error" && state.message && (
        <span role="alert" className="mt-1 text-xs text-red-600">
          {state.message}
        </span>
      )}
    </form>
  );
}

function FormularioAplazar({
  action,
  evento,
}: {
  action: Accion;
  evento: EventoRecord;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
      >
        <Calendar className="h-4 w-4" />
        {abierto ? "Cancelar aplazamiento" : "Aplazar a otra fecha"}
      </button>

      {abierto && (
        <form
          action={formAction}
          className="mt-2.5 max-w-md space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
        >
          <input type="hidden" name="id" value={evento.id} />
          <label
            htmlFor={`aplazar-${evento.id}`}
            className="block text-sm font-semibold text-ink"
          >
            Nueva fecha <span className="text-amber-700">*</span>
          </label>
          <input
            id={`aplazar-${evento.id}`}
            type="date"
            name="nueva_fecha"
            required
            defaultValue={evento.fecha}
            className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <p className="text-xs leading-relaxed text-amber-900">
            El evento se mueve a ese día y queda <strong>aplazado</strong>.
            {evento.fechaOriginal
              ? " Ya estaba aplazado, así que se conserva la fecha original que ya tenía."
              : " Se guarda la fecha de hoy como su fecha original, para que quede constancia de que se movió."}
          </p>
          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pendiente}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {pendiente ? "Aplazando…" : "Confirmar aplazamiento"}
          </button>
        </form>
      )}
    </div>
  );
}

function BotonEliminar({
  action,
  evento,
  onEliminado,
}: {
  action: Accion;
  evento: EventoRecord;
  onEliminado: () => void;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);
  const [abierto, setAbierto] = useState(false);

  // El evento ya no existe: quedarse con su ficha abierta mostraría datos de
  // algo borrado. Se cierra desde un efecto, nunca durante el render: avisar al
  // componente padre mientras este se pinta es un error de React.
  useEffect(() => {
    if (state.status === "success") onEliminado();
  }, [state, onEliminado]);

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={pendiente}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Trash className="h-3.5 w-3.5" />
        {abierto ? "Cancelar eliminación" : "Eliminar evento"}
      </button>

      {abierto && (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Vas a eliminar definitivamente «${evento.titulo}».\n\nDesaparece del calendario junto con sus ${evento.notas.length} nota(s) y sus responsables dejan de verlo. Esta acción NO se puede deshacer.\n\n¿Continuar?`,
              )
            ) {
              event.preventDefault();
            }
          }}
          className="max-w-md space-y-2 rounded-2xl border border-red-200 bg-red-50/70 p-4"
        >
          <input type="hidden" name="id" value={evento.id} />
          <p className="flex items-start gap-1.5 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Se elimina para siempre
          </p>
          <p className="text-xs leading-relaxed text-graphite">
            El evento y <strong>todas sus notas</strong> desaparecen, y sus
            responsables dejan de verlo en Mi Cuenta. Úsalo solo para limpiar
            eventos de prueba o creados por error.
          </p>
          <p className="text-xs leading-relaxed text-graphite">
            Si lo que pasa es que la actividad <strong>no se hizo</strong>,
            márcala como <strong>incompleta</strong>: así queda constancia con
            sus notas, que es lo que se revisa a fin de mes.
          </p>
          <button
            type="submit"
            disabled={pendiente}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-60"
          >
            <Trash className="h-3.5 w-3.5" />
            {pendiente ? "Eliminando…" : "Sí, eliminar definitivamente"}
          </button>
        </form>
      )}

      {state.status === "error" && state.message && (
        <span role="alert" className="text-xs text-red-600">
          {state.message}
        </span>
      )}
    </div>
  );
}
