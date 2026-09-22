"use client";

/**
 * AÑADIR UNA NOTA A UN EVENTO
 * ===========================
 * La misma pieza en los tres sitios donde se escribe una nota: el detalle del
 * evento, la pestaña «Notas» del panel y el portal del empleado en Mi Cuenta.
 * Por eso el evento puede venir FIJO (`eventoId`) o elegirse de una lista
 * (`opciones`), y por eso la acción llega por props: quien la usa decide desde
 * dónde la importa.
 *
 * Quien puede escribir es cosa de la base de datos (política
 * `evento_notas_insert_autor`): manager o responsable del evento, siempre
 * firmando con su propia cuenta.
 */

import { useEffect, useRef } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { inputClass, useAccionPanel } from "@/components/admin/ui-base";
import { Plus } from "@/lib/icons";
import { LIMITES_EVENTO } from "@/lib/calendario";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function NotaForm({
  eventoId,
  opciones,
  action,
  etiqueta = "Agregar una nota",
  placeholder = "Ej.: se hizo el mantenimiento pero falta cambiar el filtro; queda pendiente para la próxima visita.",
  idCampo = "nota",
}: {
  /** Evento al que va la nota. Si falta, se elige en el desplegable. */
  eventoId?: string;
  /** Eventos entre los que elegir cuando no viene `eventoId`. */
  opciones?: { id: string; etiqueta: string }[];
  action: Accion;
  etiqueta?: string;
  placeholder?: string;
  /** Prefijo del `id` del campo: en una pantalla puede haber varios. */
  idCampo?: string;
}) {
  const [state, formAction, pendiente] = useAccionPanel(action, idleState);
  const formulario = useRef<HTMLFormElement>(null);

  // Al guardar, el campo se vacía: dejar el texto anterior invita a mandarlo
  // dos veces.
  useEffect(() => {
    if (state.status === "success") formulario.current?.reset();
  }, [state]);

  const sinEventos = !eventoId && (opciones?.length ?? 0) === 0;

  return (
    <form ref={formulario} action={formAction} className="space-y-2.5">
      {eventoId && <input type="hidden" name="evento_id" value={eventoId} />}

      {!eventoId && (
        <div>
          <label
            htmlFor={`${idCampo}-evento`}
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Evento
          </label>
          <select
            id={`${idCampo}-evento`}
            name="evento_id"
            required
            defaultValue=""
            disabled={sinEventos}
            className={inputClass}
          >
            <option value="" disabled>
              {sinEventos ? "No hay eventos todavía" : "Elige un evento…"}
            </option>
            {(opciones ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor={`${idCampo}-texto`}
          className="mb-1.5 block text-sm font-semibold text-ink"
        >
          {etiqueta}
        </label>
        <textarea
          id={`${idCampo}-texto`}
          name="texto"
          rows={3}
          required
          maxLength={LIMITES_EVENTO.nota}
          placeholder={placeholder}
          className={`${inputClass} resize-y`}
        />
      </div>

      {state.status !== "idle" && state.message && (
        <p
          role="alert"
          className={`text-sm font-semibold ${
            state.status === "error" ? "text-red-600" : "text-brand-deep"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente || sinEventos}
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {pendiente ? "Guardando…" : "Guardar nota"}
      </button>
    </form>
  );
}
