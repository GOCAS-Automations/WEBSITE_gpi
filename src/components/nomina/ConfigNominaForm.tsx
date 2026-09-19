"use client";

/**
 * FORMULARIO DE CONFIGURACIÓN DE NÓMINA — /admin/nomina?vista=configuracion
 * =========================================================================
 * Salario, auxilio de transporte, las siete tarifas por hora y los aportes de
 * una persona **desde** un mes (modelo «vigente desde», 18 sep 2026: lo que se
 * guarda en un mes rige para ese mes y los siguientes, hasta el próximo cambio
 * guardado).
 *
 * Lo que hace que sea usable para quien no es de nómina:
 *  · arriba dice SIEMPRE de dónde salen los valores que se ven: «Configurado en
 *    este mes», «Heredado de agosto de 2026» o «Sin configurar», y hasta cuándo
 *    rigen; con el botón para quitar el cambio de un mes;
 *  · al escribir el salario, las siete tarifas SUGERIDAS se recalculan en vivo
 *    y se ofrecen con un botón («Usar los valores sugeridos»), en vez de
 *    obligar a hacer siete multiplicaciones a mano;
 *  · todos los importes se escriben y se leen con separador de miles
 *    (`CampoDinero` + `src/lib/dinero.ts`);
 *  · si las tarifas festivas quedan incoherentes (una hora EXTRA en festivo
 *    valiendo menos que una hora ordinaria en festivo, que es justo lo que
 *    pasa con los números del Excel de GPI) sale un aviso en ámbar.
 *
 * EL BUG DE «AL CAMBIAR DE PERSONA SIGUEN LOS VALORES DE ANTES» (18 sep 2026)
 * --------------------------------------------------------------------------
 * El salario y las tarifas vivían en `useState(config…)`, y el auxilio y los
 * porcentajes en `defaultValue`. Las dos cosas se leen UNA sola vez, al montar
 * el componente; cambiar de persona o de mes navega a la misma página con
 * otros parámetros y React REUTILIZA el componente montado, así que el
 * formulario seguía enseñando lo de la persona anterior hasta recargar. El
 * arreglo, de raíz, son dos `key`:
 *   · la de fuera (en `configuracion.tsx`) es persona + año + mes: cambiar
 *     cualquiera de los tres monta un formulario nuevo, con los avisos en
 *     blanco;
 *   · la de dentro (`claveFuente`) es la fila que rige + su `updated_at`:
 *     después de guardar o de quitar un cambio, los campos se vuelven a leer de
 *     la base en vez de quedarse con lo tecleado, sin perder el aviso de «guardado».
 *
 * Las piezas de interfaz vienen de `ui-base`, no de `ui.tsx`: ver la nota de
 * `LiquidacionPanel`.
 */

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  AyudaSeccion,
  Card,
  CardTitle,
  inputClass,
} from "@/components/admin/ui-base";
import {
  AYUDA_NOMINA_CONFIG,
  AYUDA_NOMINA_SUGERIDAS,
  AYUDA_NOMINA_TARIFAS,
} from "@/components/admin/ui";
import { CampoDinero } from "@/components/admin/CampoDinero";
import { idleState, type ActionState } from "@/lib/admin-types";
import {
  DIVISOR_HORAS_MES,
  FACTORES_TARIFA,
  derivarTarifas,
  mesAnterior,
  nombreMesNomina,
  type OrigenConfigMes,
  type TarifasNomina,
} from "@/lib/nomina";
import { formatearDinero, formatearNumero, formatearPesos } from "@/lib/dinero";
import { Check, Trash } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

interface Mes {
  anio: number;
  mes: number;
}

/** De dónde salen los valores del mes que se está viendo. */
export interface EstadoConfigVista {
  origen: OrigenConfigMes;
  /** Mes en que se guardó la configuración que rige (`null` = ninguna). */
  desde: Mes | null;
  /** Lo que regiría si se quita el cambio de este mes (`null` = nada). */
  alQuitar: Mes | null;
  /** Próximo cambio guardado después de este mes (hasta ahí rige este). */
  siguiente: Mes | null;
  /** Todos los cambios guardados de la persona, en orden. */
  cambios: (Mes & { salario: number })[];
  /** Fila que rige + su última edición: la `key` de los campos. */
  claveFuente: string;
}

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

/** «agosto de 2026». */
const mesTexto = (m: Mes) => `${nombreMesNomina(m.mes)} de ${m.anio}`;

/** «hasta septiembre de 2026» o «en adelante». */
const hastaTexto = (siguiente: Mes | null) =>
  siguiente
    ? `hasta ${mesTexto(mesAnterior(siguiente.anio, siguiente.mes))}`
    : "en adelante";

export function ConfigNominaForm({
  action,
  quitarAction,
  empleados,
  seleccionado,
  anio,
  mes,
  config,
  estado,
}: {
  action: Accion;
  quitarAction: Accion;
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
  estado: EstadoConfigVista;
}) {
  const router = useRouter();
  const [cargando, iniciarNavegacion] = useTransition();
  const [state, formAction, pending] = useActionState(action, idleState);
  const [quitarState, quitarFormAction, quitando] = useActionState(
    quitarAction,
    idleState,
  );
  /** Cuál de las dos acciones habló por última vez (su aviso es el que se ve). */
  const [ultima, setUltima] = useState<"guardar" | "quitar" | "">("");

  const persona = empleados.find((e) => e.id === seleccionado);
  const mesActual: Mes = { anio, mes };

  const irA = (cambios: Record<string, string>) => {
    const params = new URLSearchParams({
      vista: "configuracion",
      empleado: seleccionado,
      anio: String(anio),
      mes: String(mes),
      ...cambios,
    });
    iniciarNavegacion(() => {
      router.push(`/admin/nomina?${params.toString()}`);
    });
  };

  const aviso = ultima === "quitar" ? quitarState : ultima === "guardar" ? state : idleState;

  return (
    <div className="space-y-6">
      <AyudaSeccion title="Cómo funciona la configuración">
        {AYUDA_NOMINA_CONFIG}
      </AyudaSeccion>

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
              defaultValue={seleccionado}
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
              defaultValue={String(mes)}
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

        {cargando && (
          <p role="status" className="mt-3 text-sm font-semibold text-brand-dark">
            Cargando la configuración…
          </p>
        )}
      </Card>

      {/* ---------------- De dónde salen los valores ---------------- */}
      <OrigenDeLosValores
        persona={persona?.nombre ?? "Esta persona"}
        mesActual={mesActual}
        estado={estado}
        onIrAMes={(m) => irA({ anio: String(m.anio), mes: String(m.mes) })}
        quitarFormAction={quitarFormAction}
        quitando={quitando}
        ocupado={pending || quitando || cargando}
        onQuitar={() => setUltima("quitar")}
        seleccionado={seleccionado}
      />

      <AyudaSeccion title="Qué paga cada tarifa">{AYUDA_NOMINA_TARIFAS}</AyudaSeccion>

      {/* ---------------- Formulario ---------------- */}
      <form
        action={formAction}
        onSubmit={() => setUltima("guardar")}
        className="space-y-6"
      >
        <input type="hidden" name="employee_id" value={seleccionado} />
        <input type="hidden" name="anio" value={anio} />
        <input type="hidden" name="mes" value={mes} />

        {/* Los campos se vuelven a montar cuando cambia la fila que rige (al
            guardar o al quitar un cambio): así enseñan lo que hay en la base. */}
        <fieldset
          key={estado.claveFuente}
          disabled={cargando}
          className="space-y-6 disabled:opacity-60"
        >
          <CamposConfig config={config} />
        </fieldset>

        {aviso.status !== "idle" && aviso.message && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              aviso.status === "success"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {aviso.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || quitando || cargando}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? (
              "Guardando…"
            ) : (
              <>
                <Check className="h-4 w-4" />
                Guardar desde {nombreMesNomina(mes)} de {anio}
              </>
            )}
          </button>
          <p className="max-w-md text-xs leading-relaxed text-graphite">
            Rige desde {mesTexto(mesActual)} {hastaTexto(estado.siguiente)}
            {estado.siguiente
              ? `: en ${mesTexto(estado.siguiente)} hay otro cambio guardado.`
              : ", hasta que guardes otro cambio."}
          </p>
        </div>
      </form>
    </div>
  );
}

/* ================================================================== */
/* De dónde salen los valores (y quitar el cambio de un mes)           */
/* ================================================================== */

function OrigenDeLosValores({
  persona,
  mesActual,
  estado,
  onIrAMes,
  quitarFormAction,
  quitando,
  ocupado,
  onQuitar,
  seleccionado,
}: {
  persona: string;
  mesActual: Mes;
  estado: EstadoConfigVista;
  onIrAMes: (m: Mes) => void;
  quitarFormAction: (formData: FormData) => void;
  quitando: boolean;
  ocupado: boolean;
  onQuitar: () => void;
  seleccionado: string;
}) {
  const esteMes = mesTexto(mesActual);

  return (
    <Card className="space-y-4">
      {/* En móvil, la insignia va encima del texto: al lado lo dejaba en una
          columna de dos palabras por línea. */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-3">
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
            estado.origen === "propia"
              ? "bg-brand-tint text-brand-deep"
              : estado.origen === "heredada"
                ? "bg-mist text-ink-soft"
                : "bg-amber-100 text-amber-800"
          }`}
        >
          {estado.origen === "propia"
            ? "Configurado en este mes"
            : estado.origen === "heredada"
              ? "Heredado"
              : "Sin configurar"}
        </span>

        <div className="min-w-0 text-sm leading-relaxed text-graphite sm:flex-1">
          {estado.origen === "propia" && (
            <p>
              Lo que ves se guardó para <strong className="text-ink">{persona}</strong>{" "}
              en <strong className="text-ink">{esteMes}</strong> y rige desde este mes{" "}
              {hastaTexto(estado.siguiente)}.
            </p>
          )}
          {estado.origen === "heredada" && estado.desde && (
            <p>
              <strong className="text-ink">
                Heredado de {mesTexto(estado.desde)}
              </strong>{" "}
              — si guardas aquí, el cambio rige desde {esteMes}{" "}
              {hastaTexto(estado.siguiente)}; {mesTexto(estado.desde)} y los meses
              anteriores no se tocan.
            </p>
          )}
          {estado.origen === "ninguna" && (
            <p>
              <strong className="text-ink">{persona}</strong> no tiene nómina
              configurada ni en {esteMes} ni en ningún mes anterior, así que todavía
              no se puede liquidar. Escribe su <strong>salario básico mensual</strong>{" "}
              (las siete tarifas se sugieren solas) y guarda: regirá desde {esteMes}{" "}
              {hastaTexto(estado.siguiente)}.
            </p>
          )}
        </div>
      </div>

      {estado.cambios.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs text-graphite">
          <span className="font-semibold text-ink-soft">Cambios guardados:</span>
          {estado.cambios.map((c) => {
            const actual = c.anio === mesActual.anio && c.mes === mesActual.mes;
            return (
              <button
                key={`${c.anio}-${c.mes}`}
                type="button"
                onClick={() => onIrAMes(c)}
                disabled={actual || ocupado}
                title={`Salario ${formatearPesos(c.salario)}`}
                className={`rounded-full border px-3 py-1 font-semibold capitalize transition-colors ${
                  actual
                    ? "border-brand bg-brand-tint text-brand-deep"
                    : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand-dark"
                } disabled:cursor-default`}
              >
                {nombreMesNomina(c.mes).slice(0, 3)} {c.anio} ·{" "}
                <span className="normal-case">{formatearPesos(c.salario)}</span>
              </button>
            );
          })}
        </div>
      )}

      {estado.origen === "propia" && (
        <form
          action={quitarFormAction}
          onSubmit={(event) => {
            onQuitar();
            const mensaje = estado.alQuitar
              ? `¿Quitar el cambio de ${esteMes}?\n\n${persona} volverá a heredar la configuración guardada en ${mesTexto(estado.alQuitar)}, desde ${esteMes} ${hastaTexto(estado.siguiente)}. Las liquidaciones en borrador se recalculan; las cerradas no cambian.`
              : `¡OJO! ${persona} NO tiene ningún mes anterior configurado.\n\nSi quitas el cambio de ${esteMes}, quedará SIN configuración desde ${esteMes} ${hastaTexto(estado.siguiente)} y NO se podrá liquidar en esos meses.\n\n¿Quitarlo de todos modos?`;
            if (!window.confirm(mensaje)) event.preventDefault();
          }}
          className="flex flex-col items-start gap-3 border-t border-line pt-4 sm:flex-row sm:items-center"
        >
          <input type="hidden" name="employee_id" value={seleccionado} />
          <input type="hidden" name="anio" value={mesActual.anio} />
          <input type="hidden" name="mes" value={mesActual.mes} />
          {!estado.alQuitar && (
            <input type="hidden" name="sin_respaldo_confirmado" value="1" />
          )}
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-60"
          >
            <Trash className="h-4 w-4" />
            {quitando ? "Quitando…" : `Quitar el cambio de ${nombreMesNomina(mesActual.mes)}`}
          </button>
          <p className="min-w-0 text-xs leading-relaxed text-graphite sm:flex-1">
            {estado.alQuitar ? (
              <>
                {esteMes} volvería a heredar lo guardado en{" "}
                <strong>{mesTexto(estado.alQuitar)}</strong>.
              </>
            ) : (
              <span className="font-semibold text-amber-800">
                No hay ningún mes anterior configurado: si lo quitas, esta persona
                se queda sin configuración y no se podrá liquidar.
              </span>
            )}
          </p>
        </form>
      )}
    </Card>
  );
}

/* ================================================================== */
/* Los campos                                                          */
/* ================================================================== */

function CamposConfig({
  config,
}: {
  config: {
    salario: number;
    auxTransporte: number;
    tarifas: TarifasNomina;
    pctSalud: number;
    pctPension: number;
  };
}) {
  const [salario, setSalario] = useState(config.salario);
  const [tarifas, setTarifas] = useState<TarifasNomina>(config.tarifas);

  const sugeridas = useMemo(() => derivarTarifas(salario), [salario]);

  /** La incoherencia festiva heredada del Excel de GPI: se avisa, no se bloquea. */
  const festivoIncoherente =
    tarifas.festivo > 0 && tarifas.extraFestivoDiurna < tarifas.festivo;

  return (
    <>
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
            <CampoDinero
              id="config-salario"
              name="salario_basico"
              prefijo="$"
              required
              valor={salario}
              onCambio={setSalario}
              aria-describedby="config-salario-ayuda"
            />
            <p id="config-salario-ayuda" className="mt-1 text-xs text-graphite">
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
            <CampoDinero
              id="config-aux"
              name="aux_transporte"
              prefijo="$"
              valorInicial={config.auxTransporte}
              aria-describedby="config-aux-ayuda"
            />
            <p id="config-aux-ayuda" className="mt-1 text-xs text-graphite">
              Déjalo vacío si a esta persona no le corresponde. El valor vigente
              cada año lo fija el Gobierno.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle
          title="Valor de cada tipo de hora"
          description="En pesos por hora. Se pagan ADEMÁS del salario, sobre las horas que salen de las jornadas aprobadas. Usa coma para los centavos: 9.115,08."
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
                <CampoDinero
                  id={`config-${campo.name}`}
                  name={campo.name}
                  prefijo="$"
                  decimales={2}
                  valor={tarifas[campo.clave]}
                  onCambio={(n) =>
                    setTarifas((t) => ({
                      ...t,
                      [campo.clave]: n,
                    }))
                  }
                  aria-describedby={`config-${campo.name}-ayuda`}
                />
                <p
                  id={`config-${campo.name}-ayuda`}
                  className="mt-1 text-xs leading-relaxed text-graphite"
                >
                  {campo.ayuda}
                  {salario > 0 && (
                    <>
                      {" "}
                      Sugerido: <strong>{formatearDinero(sugerida)}</strong>{" "}
                      (salario ÷ {DIVISOR_HORAS_MES} × {formatearNumero(factor)}).
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
          description="Se descuentan sobre el sueldo del período más las horas y recargos. No incluyen el auxilio de transporte ni los bonos. Admiten decimales con coma: 4,5."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="config-salud"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Salud (%)
            </label>
            <CampoDinero
              id="config-salud"
              name="pct_salud"
              decimales={2}
              miles={false}
              sufijo="%"
              vacioSiCero={false}
              valorInicial={config.pctSalud}
            />
          </div>
          <div>
            <label
              htmlFor="config-pension"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Pensión (%)
            </label>
            <CampoDinero
              id="config-pension"
              name="pct_pension"
              decimales={2}
              miles={false}
              sufijo="%"
              vacioSiCero={false}
              valorInicial={config.pctPension}
            />
          </div>
        </div>
      </Card>
    </>
  );
}
