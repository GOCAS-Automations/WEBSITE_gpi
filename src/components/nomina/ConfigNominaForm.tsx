"use client";

/**
 * FORMULARIO DE CONFIGURACIÓN DE NÓMINA — /admin/nomina?vista=configuracion
 * =========================================================================
 * Salario, auxilio de transporte, las siete tarifas por hora y los aportes de
 * una persona en un mes.
 *
 * Lo que hace que sea usable para quien no es de nómina:
 *  · al escribir el salario, las siete tarifas SUGERIDAS se recalculan en vivo
 *    y se ofrecen con un botón («Usar los valores sugeridos»), en vez de
 *    obligar a hacer siete multiplicaciones a mano;
 *  · cada tarifa muestra debajo su valor sugerido y de dónde sale el factor;
 *  · si las tarifas festivas quedan incoherentes (una hora EXTRA en festivo
 *    valiendo menos que una hora ordinaria en festivo, que es justo lo que
 *    pasa con los números del Excel de GPI) sale un aviso en ámbar.
 *
 * Las piezas de interfaz vienen de `ui-base`, no de `ui.tsx`: ver la nota de
 * `LiquidacionPanel`.
 */

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";
import {
  AyudaSeccion,
  Card,
  CardTitle,
  inputClass,
} from "@/components/admin/ui-base";
import {
  AYUDA_NOMINA_SUGERIDAS,
  AYUDA_NOMINA_TARIFAS,
} from "@/components/admin/ui";
import { idleState, type ActionState } from "@/lib/admin-types";
import {
  DIVISOR_HORAS_MES,
  FACTORES_TARIFA,
  derivarTarifas,
  formatearPesos,
  nombreMesNomina,
  type TarifasNomina,
} from "@/lib/nomina";
import { Check } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Las siete tarifas, en el orden y con el texto que ve el administrador. */
const CAMPOS_TARIFA: {
  clave: keyof TarifasNomina;
  name: string;
  label: string;
  ayuda: string;
}[] = [
  {
    clave: "horaBase",
    name: "valor_hora_base",
    label: "Hora de rotación diurna",
    ayuda:
      "La hora normal. Es la referencia con la que se calculan las demás y NO se paga aparte: ya está dentro del salario.",
  },
  {
    clave: "rotacionNocturna",
    name: "valor_rotacion_nocturna",
    label: "Rotación nocturna (recargo)",
    ayuda:
      "Lo que se paga ADEMÁS por cada hora ordinaria trabajada de noche. La hora en sí ya la cubre el salario.",
  },
  {
    clave: "extraDiurna",
    name: "valor_extra_diurna",
    label: "Hora extra diurna",
    ayuda: "Valor completo de cada hora extra trabajada de día.",
  },
  {
    clave: "extraNocturna",
    name: "valor_extra_nocturna",
    label: "Hora extra nocturna",
    ayuda: "Valor completo de cada hora extra trabajada de noche.",
  },
  {
    clave: "festivo",
    name: "valor_festivo",
    label: "Hora en domingo o festivo",
    ayuda:
      "Hora ordinaria trabajada en domingo o festivo. Si además es nocturna, se paga esta tarifa más la de rotación nocturna.",
  },
  {
    clave: "extraFestivoDiurna",
    name: "valor_extra_festivo_diurna",
    label: "Hora extra diurna en festivo",
    ayuda: "Hora extra trabajada en domingo o festivo, de día.",
  },
  {
    clave: "extraFestivoNocturna",
    name: "valor_extra_festivo_nocturna",
    label: "Hora extra nocturna en festivo",
    ayuda: "Hora extra trabajada en domingo o festivo, de noche.",
  },
];

const MESES_OPCIONES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: nombreMesNomina(i + 1),
}));

export function ConfigNominaForm({
  action,
  empleados,
  seleccionado,
  anio,
  mes,
  config,
}: {
  action: Accion;
  empleados: { id: string; nombre: string; cargo: string | null }[];
  seleccionado: string;
  anio: number;
  mes: number;
  config: {
    salario: number;
    auxTransporte: number;
    tarifas: TarifasNomina;
    pctSalud: number;
    pctPension: number;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, idleState);

  const [salario, setSalario] = useState(config.salario);
  const [tarifas, setTarifas] = useState<TarifasNomina>(config.tarifas);

  const sugeridas = useMemo(() => derivarTarifas(salario), [salario]);

  /** La incoherencia festiva heredada del Excel de GPI: se avisa, no se bloquea. */
  const festivoIncoherente =
    tarifas.festivo > 0 && tarifas.extraFestivoDiurna < tarifas.festivo;

  const irA = (cambios: Record<string, string>) => {
    const params = new URLSearchParams({
      vista: "configuracion",
      empleado: seleccionado,
      anio: String(anio),
      mes: String(mes),
      ...cambios,
    });
    router.push(`/admin/nomina?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* ---------------- Selector ---------------- */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[14rem] flex-1">
            <label
              htmlFor="config-empleado"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Persona
            </label>
            <select
              id="config-empleado"
              value={seleccionado}
              onChange={(e) => irA({ empleado: e.target.value })}
              className={inputClass}
            >
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                  {e.cargo ? ` — ${e.cargo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="config-mes"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Mes
            </label>
            <select
              id="config-mes"
              value={String(mes)}
              onChange={(e) => irA({ mes: e.target.value })}
              className={`${inputClass} capitalize`}
            >
              {MESES_OPCIONES.map((m) => (
                <option key={m.value} value={m.value} className="capitalize">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="config-anio"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Año
            </label>
            <input
              id="config-anio"
              type="number"
              min={2020}
              max={2100}
              defaultValue={anio}
              onBlur={(e) => {
                const valor = Number(e.target.value);
                if (
                  Number.isInteger(valor) &&
                  valor >= 2020 &&
                  valor <= 2100 &&
                  valor !== anio
                )
                  irA({ anio: String(valor) });
              }}
              className={`${inputClass} w-28`}
            />
          </div>
        </div>
      </Card>

      <AyudaSeccion title="Qué paga cada tarifa">{AYUDA_NOMINA_TARIFAS}</AyudaSeccion>

      {/* ---------------- Formulario ---------------- */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="employee_id" value={seleccionado} />
        <input type="hidden" name="anio" value={anio} />
        <input type="hidden" name="mes" value={mes} />

        <Card>
          <CardTitle
            title="Salario y auxilio"
            description="El salario mensual cubre las horas ordinarias diurnas. El auxilio de transporte se escribe completo: el sistema lo reparte entre los días que se liquiden."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="config-salario"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Salario básico mensual <span className="text-brand-dark">*</span>
              </label>
              <input
                id="config-salario"
                name="salario_basico"
                type="number"
                min={0}
                step={1}
                required
                value={salario || ""}
                onChange={(e) => setSalario(Number(e.target.value) || 0)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-graphite">
                Media quincena (15 días) sería{" "}
                <strong>{formatearPesos(salario / 2)}</strong>.
              </p>
            </div>

            <div>
              <label
                htmlFor="config-aux"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Auxilio de transporte mensual
              </label>
              <input
                id="config-aux"
                name="aux_transporte"
                type="number"
                min={0}
                step={1}
                defaultValue={config.auxTransporte || ""}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-graphite">
                Déjalo en cero si a esta persona no le corresponde. El valor
                vigente cada año lo fija el Gobierno.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Valor de cada tipo de hora"
            description="En pesos por hora. Se pagan ADEMÁS del salario, sobre las horas que salen de las jornadas aprobadas."
            action={
              <button
                type="button"
                onClick={() => setTarifas(sugeridas)}
                disabled={salario <= 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-tint px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15 disabled:opacity-50"
              >
                Usar los valores sugeridos
              </button>
            }
          />

          <AyudaSeccion className="mb-5">{AYUDA_NOMINA_SUGERIDAS}</AyudaSeccion>

          {festivoIncoherente && (
            <AyudaSeccion tono="aviso" title="Revisa las tarifas de festivo" className="mb-5">
              La <strong>hora extra diurna en festivo</strong> está quedando por
              debajo de la <strong>hora en domingo o festivo</strong>, y una hora
              extra debería valer más que una ordinaria. Es exactamente la
              incoherencia que trae el Excel actual de GPI: conviene confirmar
              las tres tarifas festivas con la gerencia antes de liquidar.
            </AyudaSeccion>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {CAMPOS_TARIFA.map((campo) => {
              const factor = FACTORES_TARIFA[campo.clave];
              const sugerida = sugeridas[campo.clave];
              return (
                <div key={campo.clave}>
                  <label
                    htmlFor={`config-${campo.name}`}
                    className="mb-1.5 block text-sm font-semibold text-ink"
                  >
                    {campo.label}
                  </label>
                  <input
                    id={`config-${campo.name}`}
                    name={campo.name}
                    type="number"
                    min={0}
                    step="0.01"
                    value={tarifas[campo.clave] || ""}
                    onChange={(e) =>
                      setTarifas((t) => ({
                        ...t,
                        [campo.clave]: Number(e.target.value) || 0,
                      }))
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs leading-relaxed text-graphite">
                    {campo.ayuda}
                    {salario > 0 && (
                      <>
                        {" "}
                        Sugerido: <strong>{formatearPesos(sugerida)}</strong>{" "}
                        (salario ÷ {DIVISOR_HORAS_MES} ×{" "}
                        {factor.toLocaleString("es-CO", {
                          maximumFractionDigits: 2,
                        })}
                        ).
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Aportes del empleado"
            description="Se descuentan sobre el sueldo del período más las horas y recargos. No incluyen el auxilio de transporte ni los bonos."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="config-salud"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Salud (%)
              </label>
              <input
                id="config-salud"
                name="pct_salud"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={config.pctSalud}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="config-pension"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Pensión (%)
              </label>
              <input
                id="config-pension"
                name="pct_pension"
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={config.pctPension}
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {state.status !== "idle" && state.message && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            "Guardando…"
          ) : (
            <>
              <Check className="h-4 w-4" />
              Guardar configuración
            </>
          )}
        </button>
      </form>
    </div>
  );
}
