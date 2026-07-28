"use client";

/**
 * EDITOR DEL HORARIO DE UN MES
 * ============================
 * Tabla semanal (lunes → domingo) con, por cada día: interruptor
 * laboral/no laboral, hora de entrada, hora de salida y horas de almuerzo.
 *
 * Las CELDAS CALCULADAS —"Horas de jornada" por día y "Total de horas
 * semanales"— se recalculan en vivo mientras se edita, como las celdas
 * amarillas del Excel que usaba GPI. Nada se guarda hasta pulsar "Guardar".
 */

import { useActionState, useMemo, useState } from "react";
import {
  DIAS_ORDEN,
  DIA_LABELS,
  clonarHorario,
  diasLaborales,
  formatearHorasDecimales,
  minutosJornadaDia,
  minutosSemanales,
  type DiaClave,
  type HorarioDias,
} from "@/lib/horarios";
import { formatearDuracion } from "@/lib/jornada";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Check, Clock, Info } from "@/lib/icons";

const campoClase =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 disabled:cursor-not-allowed disabled:bg-mist/70 disabled:text-graphite/60";

export function HorarioEditor({
  action,
  anio,
  mes,
  etiqueta,
  diasIniciales,
  notasIniciales,
  horarioPorDefecto,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  anio: number;
  mes: number;
  /** "julio de 2026" — para los textos de ayuda. */
  etiqueta: string;
  diasIniciales: HorarioDias;
  notasIniciales: string;
  /** Horario predeterminado de GPI, para el botón de restablecer. */
  horarioPorDefecto: HorarioDias;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [dias, setDias] = useState<HorarioDias>(() => clonarHorario(diasIniciales));
  const [restablecido, setRestablecido] = useState(false);

  const totalSemanal = useMemo(() => minutosSemanales(dias), [dias]);
  const laborales = useMemo(() => diasLaborales(dias), [dias]);

  function actualizar(clave: DiaClave, cambios: Partial<NonNullable<HorarioDias[DiaClave]>>) {
    setDias((previo) => {
      const actual = previo[clave];
      if (!actual) return previo;
      return { ...previo, [clave]: { ...actual, ...cambios } };
    });
    setRestablecido(false);
  }

  function alternarLaboral(clave: DiaClave, laboral: boolean) {
    setDias((previo) => ({
      ...previo,
      [clave]: laboral
        ? (previo[clave] ??
          horarioPorDefecto[clave] ?? { inicio: "08:00", fin: "17:00", almuerzoHoras: 1 })
        : null,
    }));
    setRestablecido(false);
  }

  function restablecer() {
    setDias(clonarHorario(horarioPorDefecto));
    setRestablecido(true);
  }

  const exito = state.status === "success";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="anio" value={anio} />
      <input type="hidden" name="mes" value={mes} />

      {/* ---------------- Tabla semanal ---------------- */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-mist/70 text-left">
              <th scope="col" className="px-4 py-3 font-bold text-ink">
                Día
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-ink">
                ¿Se trabaja?
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-ink">
                Entrada
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-ink">
                Salida
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-ink">
                Almuerzo (horas)
              </th>
              <th scope="col" className="px-4 py-3 text-right font-bold text-ink">
                Horas de jornada
              </th>
            </tr>
          </thead>
          <tbody>
            {DIAS_ORDEN.map((clave) => {
              const dia = dias[clave];
              const laboral = dia !== null;
              const minutos = minutosJornadaDia(dia);

              return (
                <tr
                  key={clave}
                  className={`border-b border-line/70 last:border-0 ${
                    laboral ? "" : "bg-mist/40"
                  }`}
                >
                  {/* Valores que viajan al servidor */}
                  <input
                    type="hidden"
                    name={`${clave}_laboral`}
                    value={laboral ? "true" : "false"}
                  />
                  {laboral && (
                    <>
                      <input type="hidden" name={`${clave}_inicio`} value={dia.inicio} />
                      <input type="hidden" name={`${clave}_fin`} value={dia.fin} />
                      <input
                        type="hidden"
                        name={`${clave}_almuerzo`}
                        value={String(dia.almuerzoHoras)}
                      />
                    </>
                  )}

                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-semibold text-ink"
                  >
                    {DIA_LABELS[clave]}
                  </th>

                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={laboral}
                        onChange={(e) => alternarLaboral(clave, e.target.checked)}
                        aria-label={`${DIA_LABELS[clave]}: día laboral`}
                        className="peer relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-graphite/30 outline-none transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-soft before:transition-transform before:content-[''] checked:bg-brand checked:before:translate-x-5 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
                      />
                      <span className="text-xs font-semibold text-graphite peer-checked:hidden">
                        No laboral
                      </span>
                      <span className="hidden text-xs font-semibold text-brand-dark peer-checked:inline">
                        Laboral
                      </span>
                    </label>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={dia?.inicio ?? ""}
                      disabled={!laboral}
                      onChange={(e) => actualizar(clave, { inicio: e.target.value })}
                      aria-label={`${DIA_LABELS[clave]}: hora de entrada`}
                      className={campoClase}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={dia?.fin ?? ""}
                      disabled={!laboral}
                      onChange={(e) => actualizar(clave, { fin: e.target.value })}
                      aria-label={`${DIA_LABELS[clave]}: hora de salida`}
                      className={campoClase}
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={4}
                      step={0.5}
                      value={dia?.almuerzoHoras ?? 0}
                      disabled={!laboral}
                      onChange={(e) =>
                        actualizar(clave, {
                          almuerzoHoras: Number(e.target.value) || 0,
                        })
                      }
                      aria-label={`${DIA_LABELS[clave]}: horas de almuerzo`}
                      className={campoClase}
                    />
                  </td>

                  {/* Celda calculada (la "amarilla" del Excel de GPI) */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex min-w-[5.5rem] justify-end rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${
                        laboral
                          ? "bg-amber-50 text-amber-900"
                          : "bg-mist text-graphite/70"
                      }`}
                      title={laboral ? formatearDuracion(minutos) : "Día no laboral"}
                    >
                      {laboral ? formatearHorasDecimales(minutos) : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-mist/70">
              <th scope="row" colSpan={5} className="px-4 py-4 text-left font-bold text-ink">
                Total de horas semanales
                <span className="ml-2 font-normal text-graphite">
                  ({laborales} día{laborales === 1 ? "" : "s"} laboral
                  {laborales === 1 ? "" : "es"})
                </span>
              </th>
              <td className="px-4 py-4 text-right">
                <span className="inline-flex min-w-[5.5rem] justify-end rounded-lg bg-amber-100 px-3 py-2 text-base font-extrabold tabular-nums text-amber-900">
                  {formatearHorasDecimales(totalSemanal)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-graphite">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <span>
          Las <strong>horas de jornada</strong> de cada día se calculan solas:
          hora de salida menos hora de entrada, menos el almuerzo (el almuerzo{" "}
          <strong>no</strong> cuenta como trabajo). El total semanal es la suma
          de los siete días.
        </span>
      </p>

      {/* ---------------- Nota del mes ---------------- */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Nota del mes (opcional)
        </span>
        <textarea
          name="notas"
          rows={2}
          defaultValue={notasIniciales}
          placeholder="Ej.: la última semana se sale a las 4:00 p. m. por inventario."
          className={`${campoClase} resize-y`}
        />
        <span className="mt-1 block text-xs text-graphite">
          Queda guardada junto al horario, para recordar por qué cambió.
        </span>
      </label>

      {restablecido && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900"
        >
          Se cargó el horario predeterminado de GPI en la tabla. Revísalo y pulsa{" "}
          <strong>Guardar horario</strong> para aplicarlo a {etiqueta}.
        </p>
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
              Guardar horario
            </>
          )}
        </button>

        <button
          type="button"
          onClick={restablecer}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          Restablecer al horario predeterminado
        </button>
      </div>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-graphite">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Este horario define qué cuenta como <strong>jornada ordinaria</strong>{" "}
          en {etiqueta}; lo que exceda se calcula como horas extra. Los días
          marcados como no laborales (y los festivos) se pagan con el recargo
          dominical/festivo.
        </span>
      </p>
    </form>
  );
}
