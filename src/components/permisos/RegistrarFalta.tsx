"use client";

/**
 * «REGISTRAR UNA FALTA» — el atajo del manager
 * ============================================
 * Para dejar constancia de una falta que NO se pidió por el sistema: alguien
 * no llegó, o trajo el papel después. Nace **aprobada** y **no remunerada** por
 * defecto (`origen = registro_admin`), así que descuenta desde que se guarda;
 * el interruptor permite marcarla como remunerada si sí se va a pagar.
 *
 * Va plegado: la pantalla es una BANDEJA de solicitudes, y esto es la
 * excepción. Las piezas vienen de `ui-base` y las ayudas de `ayudas.ts`.
 */

import { useState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import {
  AyudaSeccion,
  inputClass,
  useAccionPanel,
} from "@/components/admin/ui-base";
import { AYUDA_PERMISOS_REGISTRO, AYUDA_PERMISOS_SOPORTE } from "@/components/admin/ayudas";
import { SOPORTE_EXTENSIONES } from "@/lib/permisos";
import { Plus, ClipboardList } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function RegistrarFalta({
  personas,
  hoy,
  action,
}: {
  personas: { id: string; nombre: string }[];
  /** Fecha de hoy en Colombia (`YYYY-MM-DD`), calculada en el servidor. */
  hoy: string;
  action: Accion;
}) {
  const [state, formAction, pending] = useAccionPanel(action, idleState);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"dia" | "horas">("dia");
  const [remunerado, setRemunerado] = useState(false);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15"
      >
        <Plus className="h-4 w-4" />
        {abierto ? "Cerrar" : "Registrar una falta"}
      </button>

      {abierto && (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                remunerado
                  ? "Vas a registrar esta falta ya aprobada y REMUNERADA: no se descuenta nada.\n\n¿Continuar?"
                  : "Vas a registrar esta falta ya aprobada y NO REMUNERADA.\n\nSe descuenta en la nómina del período: ese día y el domingo de esa semana. Las liquidaciones cerradas no se tocan.\n\n¿Continuar?",
              )
            ) {
              event.preventDefault();
            }
          }}
          className="mt-4 space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6"
        >
          <h3 className="flex items-center gap-2 text-base font-bold text-ink">
            <ClipboardList className="h-4 w-4 text-brand-dark" />
            Registrar una falta
          </h3>

          <AyudaSeccion title="Para qué sirve" className="!mt-3">
            {AYUDA_PERMISOS_REGISTRO}
          </AyudaSeccion>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Persona <span className="text-brand-dark">*</span>
              </span>
              <select name="employee_id" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Elige a quién
                </option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Tipo de falta
              </span>
              <select
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value === "horas" ? "horas" : "dia")}
                className={inputClass}
              >
                <option value="dia">Día completo (uno o varios días)</option>
                <option value="horas">Por horas (un rato de un día)</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                {tipo === "horas" ? "Día" : "Primer día"}{" "}
                <span className="text-brand-dark">*</span>
              </span>
              <input
                type="date"
                name="fecha_inicio"
                required
                defaultValue={hoy}
                className={inputClass}
              />
            </label>

            {tipo === "dia" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  Último día
                </span>
                <input
                  type="date"
                  name="fecha_fin"
                  defaultValue={hoy}
                  className={inputClass}
                />
                <span className="mt-1 block text-xs text-graphite">
                  Déjalo igual al primero si fue un solo día.
                </span>
              </label>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Desde <span className="text-brand-dark">*</span>
                  </span>
                  <input type="time" name="hora_inicio" required className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Hasta <span className="text-brand-dark">*</span>
                  </span>
                  <input type="time" name="hora_fin" required className={inputClass} />
                </label>
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Motivo <span className="text-brand-dark">*</span>
            </span>
            <textarea
              name="motivo"
              rows={2}
              required
              maxLength={500}
              placeholder="Ej.: no se presentó a trabajar y no avisó."
              className={`${inputClass} resize-y`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Reemplazo
              </span>
              <input
                type="text"
                name="reemplazo"
                maxLength={120}
                placeholder="Quién cubrió su labor, si alguien la cubrió"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Soporte (opcional)
              </span>
              <input
                type="file"
                name="soporte"
                accept={SOPORTE_EXTENSIONES.join(",")}
                className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-soft`}
              />
              <span className="mt-1 block text-xs text-graphite">
                {AYUDA_PERMISOS_SOPORTE}
              </span>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Observaciones
            </span>
            <textarea
              name="observaciones"
              rows={2}
              maxLength={500}
              className={`${inputClass} resize-y`}
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              ¿Esta falta se paga?
            </span>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-brand/50">
              <input type="hidden" name="remunerado" value="false" />
              <input
                type="checkbox"
                name="remunerado"
                value="true"
                checked={remunerado}
                onChange={(e) => setRemunerado(e.target.checked)}
                className="peer relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-graphite/30 outline-none transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-soft before:transition-transform before:content-[''] checked:bg-brand checked:before:translate-x-5 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
              />
              <span className="text-sm font-semibold text-graphite peer-checked:hidden">
                No remunerada
              </span>
              <span className="hidden text-sm font-semibold text-brand-dark peer-checked:inline">
                Remunerada
              </span>
            </label>
            <p
              className={`mt-1.5 text-xs leading-relaxed ${
                remunerado ? "text-graphite" : "text-amber-800"
              }`}
            >
              {remunerado
                ? "No se descuenta nada de la nómina."
                : "Se descuenta en la nómina del período: ese día y, además, el domingo de esa semana."}
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? "Registrando…" : "Registrar la falta"}
          </button>

          {state.status !== "idle" && state.message && (
            <p
              role="alert"
              className={`text-sm leading-relaxed ${
                state.status === "error" ? "text-red-600" : "text-brand-deep"
              }`}
            >
              {state.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
