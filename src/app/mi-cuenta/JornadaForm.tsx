"use client";

import { useActionState, useMemo, useState } from "react";
import { idleState, type ActionState, type JornadaRecord } from "@/lib/admin-types";
import {
  calcularJornada,
  fechaColombia,
  horaColombia,
  instanteColombia,
  type JornadaConfig,
} from "@/lib/jornada";
import type { MapaHorarios } from "@/lib/horarios";
import { JornadaBreakdown } from "@/components/jornadas/JornadaBreakdown";
import { Check, Info } from "@/lib/icons";

const campoClase =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

/**
 * Formulario de registro (y edición) de una jornada.
 *
 * Pensado para personas que no son técnicas: cada campo lleva una explicación,
 * el desglose de horas se actualiza mientras se escribe y los mensajes de error
 * dicen exactamente qué corregir.
 */
export function JornadaForm({
  action,
  config,
  hoy,
  horarios,
  jornada,
  onCancel,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  config: JornadaConfig;
  /** Fecha de hoy en Colombia (`YYYY-MM-DD`), calculada en el servidor. */
  hoy: string;
  /**
   * Horarios laborales por mes (`"YYYY-MM"`). Define la jornada ordinaria de
   * cada día: la vista previa se recalcula al cambiar la fecha del turno.
   */
  horarios?: MapaHorarios;
  /** Si viene, el formulario edita esa jornada en lugar de crear una nueva. */
  jornada?: JornadaRecord;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);

  const inicial = useMemo(() => {
    if (!jornada) {
      return {
        workDate: hoy,
        workOrder: "",
        start: "07:00",
        end: "17:00",
        nextDay: false,
        description: "",
        observations: "",
      };
    }
    return {
      workDate: jornada.work_date,
      workOrder: jornada.work_order,
      start: horaColombia(jornada.start_at),
      end: horaColombia(jornada.end_at),
      nextDay: fechaColombia(jornada.end_at) !== jornada.work_date,
      description: jornada.description,
      observations: jornada.observations ?? "",
    };
  }, [jornada, hoy]);

  const [workDate, setWorkDate] = useState(inicial.workDate);
  const [start, setStart] = useState(inicial.start);
  const [end, setEnd] = useState(inicial.end);
  const [nextDay, setNextDay] = useState(inicial.nextDay);

  // El turno cruza la medianoche si lo marcaron o si la hora de fin es menor o
  // igual a la de inicio (22:00 → 02:00). Se muestra para que no haya sorpresas.
  const cruzaMedianoche = nextDay || end <= start;

  const desglose = useMemo(() => {
    const startAt = instanteColombia(workDate, start);
    const endAt = instanteColombia(workDate, end, cruzaMedianoche ? 1 : 0);
    if (!startAt || !endAt) return null;
    return calcularJornada(startAt, endAt, workDate, config, horarios);
  }, [workDate, start, end, cruzaMedianoche, config, horarios]);

  const exito = state.status === "success";

  return (
    <form action={formAction} className="space-y-5">
      {jornada && <input type="hidden" name="id" value={jornada.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Fecha del día laboral <span className="text-brand">*</span>
          </span>
          <input
            type="date"
            name="work_date"
            required
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className={campoClase}
          />
          <span className="mt-1 block text-xs text-graphite">
            El día en que <strong>empezaste</strong> el turno.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Número de orden de trabajo <span className="text-brand">*</span>
          </span>
          <input
            type="text"
            name="work_order"
            required
            defaultValue={inicial.workOrder}
            placeholder="Ej.: OT-1042"
            className={campoClase}
          />
          <span className="mt-1 block text-xs text-graphite">
            Tal como aparece en la orden que te asignaron.
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Hora de inicio <span className="text-brand">*</span>
          </span>
          <input
            type="time"
            name="start_time"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={campoClase}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Hora de finalización <span className="text-brand">*</span>
          </span>
          <input
            type="time"
            name="end_time"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={campoClase}
          />
        </label>
      </div>

      {/* Cruce de medianoche */}
      <div className="rounded-xl border border-line bg-mist/60 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="hidden" name="next_day" value="false" />
          <input
            type="checkbox"
            name="next_day"
            value="true"
            checked={nextDay}
            onChange={(e) => setNextDay(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line text-brand accent-[#3dae2b]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">
              Terminé al día siguiente
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-graphite">
              Márcalo si tu turno pasó de la medianoche (por ejemplo, empezaste a
              las 10:00 p. m. y terminaste a las 2:00 a. m.). La hora de fin se
              registrará en el día siguiente a la fecha que elegiste.
            </span>
          </span>
        </label>

        {!nextDay && cruzaMedianoche && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-amber-800">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Como la hora de fin es anterior a la de inicio, entendemos que el
              turno terminó al día siguiente y así lo vamos a registrar.
            </span>
          </p>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Descripción de la labor <span className="text-brand">*</span>
        </span>
        <textarea
          name="description"
          rows={3}
          required
          defaultValue={inicial.description}
          placeholder="Ej.: mantenimiento preventivo del tablero de control de la línea 2."
          className={`${campoClase} resize-y`}
        />
        <span className="mt-1 block text-xs text-graphite">
          Con una o dos frases claras es suficiente.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Observaciones (opcional)
        </span>
        <textarea
          name="observations"
          rows={2}
          defaultValue={inicial.observations}
          placeholder="Novedades, materiales usados, algo que deba saber tu coordinador…"
          className={`${campoClase} resize-y`}
        />
      </label>

      {/* Vista previa del cálculo */}
      {desglose && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Info className="h-4 w-4 text-brand" />
            Así quedarían tus horas
          </p>
          <JornadaBreakdown desglose={desglose} />
        </div>
      )}

      {state.status !== "idle" && state.message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
            exito
              ? "border-brand/30 bg-brand-tint text-brand-dark"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            "Guardando…"
          ) : (
            <>
              <Check className="h-4 w-4" />
              {submitLabel ?? (jornada ? "Guardar cambios" : "Registrar jornada")}
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
