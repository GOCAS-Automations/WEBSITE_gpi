"use client";

import { useActionState, useState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Check, Close, Info } from "@/lib/icons";
import { inputClass } from "@/components/admin/ui";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Botonera de revisión de una jornada (solo managers).
 *
 * Aprobar es un clic con confirmación; rechazar obliga a escribir el motivo,
 * porque es el texto que el empleado verá en su portal para corregir.
 */
export function ReviewActions({
  id,
  empleado,
  approve,
  reject,
}: {
  id: string;
  empleado: string;
  approve: Accion;
  reject: Accion;
}) {
  const [aprobarState, aprobarAction, aprobando] = useActionState(
    approve,
    idleState,
  );
  const [rechazarState, rechazarAction, rechazando] = useActionState(
    reject,
    idleState,
  );
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  const mensaje =
    aprobarState.status === "error"
      ? aprobarState.message
      : rechazarState.status === "error"
        ? rechazarState.message
        : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={aprobarAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `¿Aprobar la jornada de ${empleado}?\n\nQuedará registrada como aprobada y el empleado ya no podrá editarla.`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            disabled={aprobando || rechazando}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {aprobando ? "Aprobando…" : "Aprobar"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMostrarRechazo((v) => !v)}
          disabled={aprobando || rechazando}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
        >
          <Close className="h-4 w-4" />
          {mostrarRechazo ? "Cancelar rechazo" : "Rechazar"}
        </button>
      </div>

      {mostrarRechazo && (
        <form
          action={rechazarAction}
          className="space-y-2 rounded-2xl border border-red-100 bg-red-50/60 p-4"
        >
          <input type="hidden" name="id" value={id} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Motivo del rechazo <span className="text-red-600">*</span>
            </span>
            <textarea
              name="review_note"
              rows={3}
              required
              placeholder="Ej.: la hora de finalización no coincide con la orden de trabajo; por favor corrígela y vuelve a registrarla."
              className={`${inputClass} resize-y`}
            />
          </label>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-graphite">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {empleado} verá este mensaje en su portal. Sé concreto para que
              pueda corregir sin tener que preguntar.
            </span>
          </p>
          <button
            type="submit"
            disabled={rechazando}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {rechazando ? "Rechazando…" : "Confirmar rechazo"}
          </button>
        </form>
      )}

      {mensaje && (
        <p role="alert" className="text-sm text-red-600">
          {mensaje}
        </p>
      )}
    </div>
  );
}

/** Botón para devolver una jornada revisada al estado pendiente. */
export function ReopenAction({
  id,
  action,
}: {
  id: string;
  action: Accion;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "¿Devolver esta jornada al estado pendiente?\n\nSe borrará la nota de revisión y el empleado podrá volver a editarla.",
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
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-60"
      >
        {pending ? "Reabriendo…" : "Volver a pendiente"}
      </button>
      {state.status === "error" && state.message && (
        <span className="mt-1 text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
