"use client";

/**
 * FORMULARIO DE UN EVENTO (crear o editar)
 * ========================================
 * Vive dentro de `ModalPanel` y se guarda con la server action `saveEvento`.
 * Al terminar bien se cierra solo: `revalidatePath` ya trajo el calendario
 * actualizado, así que dejar el formulario abierto solo obligaría a cerrarlo a
 * mano para ver el cambio.
 *
 * El estado del evento NO se edita aquí: se cambia desde el detalle, con los
 * botones «Cumplido», «Incompleto» y «Aplazar», que es donde tiene sentido
 * (cerrar una actividad es una decisión, no un campo de formulario).
 */

import { useEffect } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Field, TextArea, AyudaSeccion, useAccionPanel } from "@/components/admin/ui-base";
import { Check } from "@/lib/icons";
import { LIMITES_EVENTO, type EventoRecord } from "@/lib/calendario";
import { SelectorResponsables, type OpcionPerfil } from "./SelectorResponsables";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function EventoFormulario({
  evento,
  fechaSugerida,
  perfiles,
  action,
  onListo,
}: {
  /** `null` = se está creando uno nuevo. */
  evento: EventoRecord | null;
  /** Día en el que se hizo clic, para llegar con la fecha puesta. */
  fechaSugerida: string;
  perfiles: OpcionPerfil[];
  action: Accion;
  onListo: () => void;
}) {
  const [state, formAction, pendiente] = useAccionPanel(action, idleState);

  useEffect(() => {
    if (state.status === "success") onListo();
  }, [state, onListo]);

  const responsablesCuenta =
    evento?.responsables.filter((r) => !r.externo).map((r) => r.profileId!) ?? [];
  const responsablesExternos =
    evento?.responsables.filter((r) => r.externo).map((r) => r.nombre) ?? [];

  return (
    <form action={formAction} className="space-y-5">
      {evento && <input type="hidden" name="id" value={evento.id} />}

      <Field
        label="Título"
        name="titulo"
        scope="evento"
        required
        defaultValue={evento?.titulo ?? ""}
        placeholder="Ej.: Mantenimiento del chiller — Laboratorios OSA"
        hint="Es lo que se lee en la casilla del calendario, así que mejor corto y concreto."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Fecha"
          name="fecha"
          scope="evento"
          type="date"
          required
          defaultValue={evento?.fecha ?? fechaSugerida}
        />
        <Field
          label="Hora de inicio"
          name="hora_inicio"
          scope="evento"
          type="time"
          required
          defaultValue={evento?.horaInicio ?? "08:00"}
        />
        <Field
          label="Hora de finalización"
          name="hora_fin"
          scope="evento"
          type="time"
          required
          defaultValue={evento?.horaFin ?? "10:00"}
        />
      </div>

      <TextArea
        label="Descripción"
        name="descripcion"
        scope="evento"
        rows={4}
        defaultValue={evento?.descripcion ?? ""}
        placeholder="Qué hay que hacer, dónde y con qué. Lo verán los responsables en su portal."
        hint={`Opcional. Máximo ${LIMITES_EVENTO.descripcion} caracteres.`}
      />

      <SelectorResponsables
        perfiles={perfiles}
        idsIniciales={responsablesCuenta}
        externosIniciales={responsablesExternos}
      />

      {!evento && (
        <AyudaSeccion title="Qué pasa al guardar">
          El evento nace <strong>programado</strong> y le aparece a cada
          responsable con cuenta en <strong>Mi Cuenta → Mis eventos</strong>.
          Cuando pase el día, vuelve aquí y ciérralo como cumplido o incompleto,
          o aplázalo a otra fecha.
        </AyudaSeccion>
      )}

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button
          type="submit"
          disabled={pendiente}
          className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {pendiente
            ? "Guardando…"
            : evento
              ? "Guardar cambios"
              : "Programar evento"}
        </button>
        <button
          type="button"
          onClick={onListo}
          disabled={pendiente}
          className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
