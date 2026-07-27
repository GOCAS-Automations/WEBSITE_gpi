"use client";

import { useActionState, useState } from "react";
import {
  idleState,
  JORNADA_STATUS_CLASSES,
  JORNADA_STATUS_LABELS,
  type ActionState,
  type JornadaRecord,
} from "@/lib/admin-types";
import {
  calcularJornada,
  formatearDuracion,
  formatearFechaLarga,
  formatearHora12,
  horaColombia,
  type JornadaConfig,
} from "@/lib/jornada";
import { JornadaBreakdown } from "@/components/jornadas/JornadaBreakdown";
import { JornadaForm } from "./JornadaForm";
import { Pencil, Trash } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Historial de jornadas del empleado, con edición y borrado de las pendientes. */
export function MisJornadas({
  jornadas,
  config,
  hoy,
  saveAction,
  deleteAction,
}: {
  jornadas: JornadaRecord[];
  config: JornadaConfig;
  hoy: string;
  saveAction: Accion;
  deleteAction: Accion;
}) {
  if (jornadas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-mist/60 p-8 text-center">
        <p className="text-base font-bold text-ink">
          Todavía no has registrado ninguna jornada
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-graphite">
          Usa el formulario de arriba para registrar tu primera jornada. Aquí
          verás el historial y el estado de cada una.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {jornadas.map((jornada) => (
        <li key={jornada.id}>
          <JornadaItem
            jornada={jornada}
            config={config}
            hoy={hoy}
            saveAction={saveAction}
            deleteAction={deleteAction}
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

function JornadaItem({
  jornada,
  config,
  hoy,
  saveAction,
  deleteAction,
}: {
  jornada: JornadaRecord;
  config: JornadaConfig;
  hoy: string;
  saveAction: Accion;
  deleteAction: Accion;
}) {
  const [editando, setEditando] = useState(false);
  const desglose = calcularJornada(
    jornada.start_at,
    jornada.end_at,
    jornada.work_date,
    config,
  );
  const editable = jornada.status === "pendiente";

  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">
              {formatearFechaLarga(jornada.work_date)}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                JORNADA_STATUS_CLASSES[jornada.status]
              }`}
            >
              {JORNADA_STATUS_LABELS[jornada.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-graphite">
            Orden <span className="font-semibold text-ink">{jornada.work_order}</span> ·{" "}
            {formatearHora12(horaColombia(jornada.start_at))} a{" "}
            {formatearHora12(horaColombia(jornada.end_at))} ·{" "}
            <span className="font-semibold text-ink">
              {formatearDuracion(desglose.totalMinutos)}
            </span>
          </p>
        </div>

        {editable && !editando && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink-soft"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <EliminarJornada
              id={jornada.id}
              fecha={formatearFechaLarga(jornada.work_date)}
              action={deleteAction}
            />
          </div>
        )}
      </header>

      {editando ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-4 text-sm text-graphite">
            Corrige lo que necesites y guarda. La jornada seguirá pendiente de
            aprobación.
          </p>
          <JornadaForm
            action={saveAction}
            config={config}
            hoy={hoy}
            jornada={jornada}
            onCancel={() => setEditando(false)}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-ink-soft">
            {jornada.description}
          </p>

          {jornada.observations && (
            <p className="text-sm leading-relaxed text-graphite">
              <span className="font-semibold text-ink-soft">Observaciones: </span>
              {jornada.observations}
            </p>
          )}

          {jornada.review_note && (
            <div
              className={`rounded-xl border px-4 py-3 ${
                jornada.status === "rechazada"
                  ? "border-red-200 bg-red-50"
                  : "border-line bg-mist/70"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                Nota de quien revisó
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {jornada.review_note}
              </p>
            </div>
          )}

          {jornada.status === "pendiente" && (
            <p className="text-xs leading-relaxed text-graphite">
              Puedes editarla o eliminarla mientras esté pendiente. Cuando la
              revisen, quedará fija.
            </p>
          )}

          <JornadaBreakdown desglose={desglose} compacto />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */

function EliminarJornada({
  id,
  fecha,
  action,
}: {
  id: string;
  fecha: string;
  action: Accion;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `¿Eliminar la jornada del ${fecha}?\n\nEsta acción no se puede deshacer.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex flex-col items-start"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Trash className="h-3.5 w-3.5" />
        {pending ? "Eliminando…" : "Eliminar"}
      </button>
      {state.status === "error" && state.message && (
        <span className="mt-1 text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
