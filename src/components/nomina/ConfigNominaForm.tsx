"use client";

/**
 * FORMULARIO DE CONFIGURACIÓN DE NÓMINA — /admin/nomina?vista=configuracion
 * =========================================================================
 * Salario, auxilio de transporte y aportes de una persona **desde** un mes
 * (modelo «vigente desde», 18 sep 2026: lo que se guarda en un mes rige para ese
 * mes y los siguientes, hasta el próximo cambio guardado). Las siete tarifas
 * por hora se muestran, pero **no se editan**: desde el 23 sep 2026 las calcula
 * el sistema con el salario y la ley del mes (ver `src/lib/nomina.ts`).
 *
 * Lo que hace que sea usable para quien no es de nómina:
 *  · arriba dice SIEMPRE de dónde salen los valores que se ven, con uno de
 *    estos estados: «Configurado en este mes», «Heredado de agosto de 2026»,
 *    «Sin configuración desde octubre de 2026 (herencia suspendida)» o «Sin
 *    configurar», y hasta cuándo rigen;
 *  · deja QUITAR el cambio de un mes (vuelve a heredar) y, en un mes que
 *    hereda, DEJARLO SIN CONFIGURACIÓN desde ese mes (un corte: retiro,
 *    licencia no remunerada). Las dos cosas piden confirmación en una ventana
 *    que dice ANTES qué borradores de liquidación se eliminarían —los de los
 *    meses que se quedan sin configuración— y cuáles se conservan; las
 *    liquidaciones cerradas y pagadas no se tocan nunca;
 *  · al escribir el salario, las siete tarifas se recalculan en vivo y se
 *    enseñan de SOLO LECTURA con su cuenta al lado («salario ÷ 210 × 1,25»),
 *    para que se puedan auditar de un vistazo;
 *  · todos los importes se escriben y se leen con separador de miles
 *    (`CampoDinero` + `src/lib/dinero.ts`).
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
 *     después de guardar, quitar un cambio o suspender la herencia, los campos
 *     se vuelven a leer de la base en vez de quedarse con lo tecleado, sin
 *     perder el aviso de «guardado».
 *
 * Las piezas de interfaz vienen de `ui-base`, no de `ui.tsx`: ver la nota de
 * `LiquidacionPanel`.
 */

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  AyudaSeccion,
  Card,
  CardTitle,
  inputClass,
  useAccionPanel,
} from "@/components/admin/ui-base";
import {
  AYUDA_NOMINA_BORRADORES,
  AYUDA_NOMINA_CONFIG,
  AYUDA_NOMINA_CORTE,
  AYUDA_NOMINA_TARIFAS,
  AYUDA_NOMINA_TARIFAS_AUTOMATICAS,
} from "@/components/admin/ayudas";
import { CampoDinero } from "@/components/admin/CampoDinero";
import { ModalPanel } from "@/components/calendario/ModalPanel";
import { idleState, type ActionState } from "@/lib/admin-types";
import {
  derivarTarifas,
  factoresTarifa,
  mesAnterior,
  nombreMesNomina,
  type OrigenConfigMes,
  type ParametrosTarifas,
  type TarifasNomina,
} from "@/lib/nomina";
import { formatearDinero, formatearNumero, formatearPesos } from "@/lib/dinero";
import { Check, Close, Trash, Undo } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

interface Mes {
  anio: number;
  mes: number;
}

/**
 * Lo que la LEY pone en el mes que se está viendo (lo calcula el servidor con
 * `parametrosLegalesDelMes()` y el horario del mes): con eso se CALCULAN las
 * siete tarifas, que ya no se digitan.
 */
export interface LegalMesVista extends ParametrosTarifas {
  /** Horas semanales con que se sacó el divisor (las del horario, hoy 42). */
  horasSemanales: number;
}

/**
 * Qué pasaría con los borradores de liquidación de la persona si se hiciera la
 * acción (`efectoEnBorradores()` de `nomina.ts`, calculado en el servidor).
 */
export interface EfectoBorradoresVista {
  /** Los que se ELIMINARÍAN: sus meses quedan sin configuración. */
  eliminar: { id: string; etiqueta: string }[];
  /** Cuántos se conservan (siguen con configuración heredada). */
  conservar: number;
}

/** De dónde salen los valores del mes que se está viendo. */
export interface EstadoConfigVista {
  origen: OrigenConfigMes;
  /**
   * Mes del cambio que rige: la configuración (propia o heredada) o, si la
   * herencia está suspendida, el corte. `null` = nunca se configuró.
   */
  desde: Mes | null;
  /** Qué hay guardado EN este mes: una configuración, un corte o nada. */
  cambioDelMes: "configuracion" | "corte" | null;
  /** Lo que regiría si se quita el cambio de este mes (`null` = nada). */
  alQuitar: Mes | null;
  /**
   * Cuando `alQuitar` es `null` porque el mes anterior tiene la herencia
   * SUSPENDIDA (y no porque nunca se configuró): el mes de ese corte.
   */
  alQuitarCorte: Mes | null;
  /** Próximo cambio guardado después de este mes (hasta ahí rige este). */
  siguiente: (Mes & { corte: boolean }) | null;
  /** Todos los cambios guardados de la persona —configuraciones y cortes—, en orden. */
  cambios: (Mes & { salario: number; corte: boolean })[];
  /** Fila que rige + su última edición: la `key` de los campos. */
  claveFuente: string;
  /** Efecto en los borradores de «Quitar el cambio» (`null` = no hay cambio). */
  alQuitarBorradores: EfectoBorradoresVista | null;
  /** Efecto en los borradores de «Dejar sin configuración» (`null` = no aplica). */
  alCortarBorradores: EfectoBorradoresVista | null;
}

/**
 * Las siete tarifas, en el orden y con el texto que ve el administrador. Ya no
 * hay campos de formulario: `name` se conserva solo como identificador estable
 * de cada fila de la tabla de solo lectura.
 */
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
    ayuda:
      "Valor completo de cada hora extra trabajada de día, incluido todo lo trabajado un sábado (un sábado no lleva recargo de domingo).",
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
      "Hora trabajada en domingo o festivo DENTRO de la jornada programada de ese día (un festivo que cae en un lunes tiene jornada programada). Si además es nocturna, se paga esta tarifa más la de rotación nocturna.",
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

/**
 * El tramo en que rige algo que empieza en `desde` y dura hasta el próximo
 * cambio: «desde octubre de 2026 en adelante», «desde octubre de 2026 hasta
 * diciembre de 2026» o, si el próximo cambio es al mes siguiente, «solo en
 * octubre de 2026».
 */
const vigencia = (desde: Mes, siguiente: Mes | null) => {
  if (!siguiente) return `desde ${mesTexto(desde)} en adelante`;
  const hasta = mesAnterior(siguiente.anio, siguiente.mes);
  if (hasta.anio === desde.anio && hasta.mes === desde.mes) return `solo en ${mesTexto(desde)}`;
  return `desde ${mesTexto(desde)} hasta ${mesTexto(hasta)}`;
};

/** «1 borrador» / «3 borradores». */
const borradores = (n: number) => (n === 1 ? "1 borrador" : `${n} borradores`);

type Confirmacion = "quitar" | "cortar" | null;

export function ConfigNominaForm({
  action,
  quitarAction,
  cortarAction,
  empleados,
  seleccionado,
  anio,
  mes,
  config,
  estado,
  legal,
}: {
  action: Accion;
  quitarAction: Accion;
  cortarAction: Accion;
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
  legal: LegalMesVista;
}) {
  const router = useRouter();
  const [cargando, iniciarNavegacion] = useTransition();
  const [confirmar, setConfirmar] = useState<Confirmacion>(null);
  const [state, formAction, pending] = useAccionPanel(action, idleState);
  // Las dos acciones de la ventana de confirmación la cierran al terminar: la
  // pantalla ya se habrá vuelto a pintar con la configuración nueva.
  const [quitarState, quitarFormAction, quitando] = useAccionPanel(
    async (previo: ActionState, datos: FormData) => {
      const r = await quitarAction(previo, datos);
      setConfirmar(null);
      return r;
    },
    idleState,
  );
  const [cortarState, cortarFormAction, cortando] = useAccionPanel(
    async (previo: ActionState, datos: FormData) => {
      const r = await cortarAction(previo, datos);
      setConfirmar(null);
      return r;
    },
    idleState,
  );
  /** Cuál de las acciones habló por última vez (su aviso es el que se ve). */
  const [ultima, setUltima] = useState<"guardar" | "quitar" | "cortar" | "">("");

  const persona = empleados.find((e) => e.id === seleccionado);
  const mesActual: Mes = { anio, mes };
  const ocupado = pending || quitando || cortando || cargando;

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

  const aviso =
    ultima === "quitar"
      ? quitarState
      : ultima === "cortar"
        ? cortarState
        : ultima === "guardar"
          ? state
          : idleState;

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
        ocupado={ocupado}
        onPedir={setConfirmar}
      />

      {/* El aviso de quitar o suspender va aquí, junto al estado del mes. */}
      {(ultima === "quitar" || ultima === "cortar") &&
        aviso.status !== "idle" &&
        aviso.message && <Aviso estado={aviso} />}

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
            guardar, al quitar un cambio o al suspender la herencia): así
            enseñan lo que hay en la base. */}
        <fieldset
          key={estado.claveFuente}
          disabled={cargando}
          className="space-y-6 disabled:opacity-60"
        >
          <CamposConfig
            config={config}
            legal={legal}
            mesEtiqueta={mesTexto(mesActual)}
          />
        </fieldset>

        {ultima === "guardar" && aviso.status !== "idle" && aviso.message && (
          <Aviso estado={aviso} />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={ocupado}
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
            Rige {vigencia(mesActual, estado.siguiente)}
            {estado.siguiente
              ? estado.siguiente.corte
                ? `: desde ${mesTexto(estado.siguiente)} la herencia está suspendida.`
                : `: en ${mesTexto(estado.siguiente)} hay otro cambio guardado.`
              : ", hasta que guardes otro cambio."}
          </p>
        </div>
      </form>

      {/* ---------------- Confirmación de quitar / suspender ---------------- */}
      {confirmar && (
        <ConfirmarCambio
          accion={confirmar}
          persona={persona?.nombre ?? "Esta persona"}
          mesActual={mesActual}
          estado={estado}
          seleccionado={seleccionado}
          formAction={confirmar === "quitar" ? quitarFormAction : cortarFormAction}
          enviando={confirmar === "quitar" ? quitando : cortando}
          onEnviar={() => setUltima(confirmar)}
          onCerrar={() => {
            if (!quitando && !cortando) setConfirmar(null);
          }}
        />
      )}
    </div>
  );
}

/** El mensaje de una acción, en verde o en rojo. */
function Aviso({ estado }: { estado: ActionState }) {
  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm ${
        estado.status === "success"
          ? "border-brand/30 bg-brand-tint text-brand-deep"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {estado.message}
    </p>
  );
}

/* ================================================================== */
/* De dónde salen los valores (y los botones de quitar / suspender)    */
/* ================================================================== */

function OrigenDeLosValores({
  persona,
  mesActual,
  estado,
  onIrAMes,
  ocupado,
  onPedir,
}: {
  persona: string;
  mesActual: Mes;
  estado: EstadoConfigVista;
  onIrAMes: (m: Mes) => void;
  ocupado: boolean;
  onPedir: (accion: Confirmacion) => void;
}) {
  const esteMes = mesTexto(mesActual);
  const corteAqui = estado.cambioDelMes === "corte";

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
              : estado.origen === "suspendida"
                ? "Herencia suspendida"
                : "Sin configurar"}
        </span>

        <div className="min-w-0 text-sm leading-relaxed text-graphite sm:flex-1">
          {estado.origen === "propia" && (
            <p>
              Lo que ves se guardó para <strong className="text-ink">{persona}</strong>{" "}
              en <strong className="text-ink">{esteMes}</strong> y rige{" "}
              {vigencia(mesActual, estado.siguiente)}.
            </p>
          )}
          {estado.origen === "heredada" && estado.desde && (
            <p>
              <strong className="text-ink">
                Heredado de {mesTexto(estado.desde)}
              </strong>{" "}
              — si guardas aquí, el cambio rige {vigencia(mesActual, estado.siguiente)};{" "}
              {mesTexto(estado.desde)} y los meses
              anteriores no se tocan.
            </p>
          )}
          {estado.origen === "suspendida" && estado.desde && (
            <p>
              <strong className="text-ink">
                Sin configuración desde {corteAqui ? "este mes" : mesTexto(estado.desde)}{" "}
                (herencia suspendida)
              </strong>{" "}
              — {persona} no se puede liquidar{" "}
              {vigencia(estado.desde, estado.siguiente)}.{" "}
              {corteAqui
                ? "Para deshacerlo, quita este cambio: el mes vuelve a heredar la configuración anterior."
                : `Para deshacerlo, abre ${mesTexto(estado.desde)} y quita ese cambio. Si solo quieres volver a pagar desde ${esteMes}, escribe aquí la configuración y guarda.`}
            </p>
          )}
          {estado.origen === "ninguna" && (
            <p>
              <strong className="text-ink">{persona}</strong> no tiene nómina
              configurada ni en {esteMes} ni en ningún mes anterior, así que todavía
              no se puede liquidar. Escribe su <strong>salario básico mensual</strong>{" "}
              (las siete tarifas se sugieren solas) y guarda: regirá {vigencia(mesActual, estado.siguiente)}.
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
                title={
                  c.corte
                    ? "Sin configuración desde este mes (herencia suspendida)"
                    : `Salario ${formatearPesos(c.salario)}`
                }
                className={`rounded-full border px-3 py-1 font-semibold capitalize transition-colors ${
                  c.corte
                    ? actual
                      ? "border-amber-400 bg-amber-100 text-amber-900"
                      : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400"
                    : actual
                      ? "border-brand bg-brand-tint text-brand-deep"
                      : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand-dark"
                } disabled:cursor-default`}
              >
                {nombreMesNomina(c.mes).slice(0, 3)} {c.anio} ·{" "}
                <span className="normal-case">
                  {c.corte ? "sin configuración" : formatearPesos(c.salario)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {estado.cambioDelMes && (
        <div className="flex flex-col items-start gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => onPedir("quitar")}
            disabled={ocupado}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-60"
          >
            {corteAqui ? <Undo className="h-4 w-4" /> : <Trash className="h-4 w-4" />}
            Quitar el cambio de este mes
          </button>
          <p className="min-w-0 text-xs leading-relaxed text-graphite sm:flex-1">
            {estado.alQuitar ? (
              <>
                {esteMes} volvería a heredar lo guardado en{" "}
                <strong>{mesTexto(estado.alQuitar)}</strong>
                {corteAqui ? ": se deshace la suspensión." : "."}
              </>
            ) : (
              <span className="font-semibold text-amber-800">
                {estado.alQuitarCorte
                  ? `El mes anterior no tiene configuración (herencia suspendida desde ${mesTexto(estado.alQuitarCorte)}): si lo quitas, esta persona se queda sin configuración también desde ${esteMes}.`
                  : corteAqui
                    ? "No hay ningún mes anterior configurado: aunque quites el corte, esta persona seguiría sin configuración."
                    : "No hay ningún mes anterior configurado: si lo quitas, esta persona se queda sin configuración y no se podrá liquidar."}
              </span>
            )}
          </p>
        </div>
      )}

      {estado.origen === "heredada" && estado.desde && (
        <div className="flex flex-col items-start gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => onPedir("cortar")}
            disabled={ocupado}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-60"
          >
            <Close className="h-4 w-4" />
            Dejar sin configuración desde este mes
          </button>
          <p className="min-w-0 text-xs leading-relaxed text-graphite sm:flex-1">
            {AYUDA_NOMINA_CORTE}
          </p>
        </div>
      )}
    </Card>
  );
}

/* ================================================================== */
/* Ventana de confirmación                                             */
/* ================================================================== */

/**
 * La confirmación de «Quitar el cambio» y de «Dejar sin configuración». Es una
 * ventana (no un `window.confirm`) porque tiene que ENUMERAR los borradores que
 * se eliminarían, y el servidor solo acepta la acción si la lista que se
 * confirmó es la misma que él calcula (`borradores_confirmados`).
 */
function ConfirmarCambio({
  accion,
  persona,
  mesActual,
  estado,
  seleccionado,
  formAction,
  enviando,
  onEnviar,
  onCerrar,
}: {
  accion: "quitar" | "cortar";
  persona: string;
  mesActual: Mes;
  estado: EstadoConfigVista;
  seleccionado: string;
  formAction: (formData: FormData) => void;
  enviando: boolean;
  onEnviar: () => void;
  onCerrar: () => void;
}) {
  const esteMes = mesTexto(mesActual);
  const efecto =
    (accion === "quitar" ? estado.alQuitarBorradores : estado.alCortarBorradores) ?? {
      eliminar: [],
      conservar: 0,
    };
  const quedaSinConfig = accion === "cortar" || !estado.alQuitar;
  const corteAqui = estado.cambioDelMes === "corte";
  const rango = vigencia(mesActual, estado.siguiente);

  const titulo =
    accion === "cortar"
      ? `¿Dejar sin configuración desde ${nombreMesNomina(mesActual.mes)}?`
      : corteAqui
        ? `¿Quitar la suspensión de ${nombreMesNomina(mesActual.mes)}?`
        : `¿Quitar el cambio de ${nombreMesNomina(mesActual.mes)}?`;

  return (
    <ModalPanel titulo={titulo} descripcion={persona} onClose={onCerrar} ancho="max-w-xl">
      <form action={formAction} onSubmit={onEnviar} className="space-y-4 text-sm leading-relaxed text-graphite">
        <input type="hidden" name="employee_id" value={seleccionado} />
        <input type="hidden" name="anio" value={mesActual.anio} />
        <input type="hidden" name="mes" value={mesActual.mes} />
        <input type="hidden" name="confirmado" value="1" />
        <input
          type="hidden"
          name="borradores_confirmados"
          value={efecto.eliminar.map((b) => b.id).join(",")}
        />

        {/* Qué pasa con la configuración */}
        {accion === "cortar" ? (
          <p>
            <strong className="text-ink">{persona}</strong> quedará{" "}
            <strong className="text-ink">sin configuración {rango}</strong>: deja de
            heredar lo guardado en {estado.desde ? mesTexto(estado.desde) : "el mes anterior"}{" "}
            y no se podrá liquidar en esos meses hasta que guardes un cambio nuevo.
            Los meses anteriores no se tocan. Se deshace con «Quitar el cambio de
            este mes» en {esteMes}.
          </p>
        ) : estado.alQuitar ? (
          <p>
            {rango.charAt(0).toUpperCase() + rango.slice(1)},{" "}
            <strong className="text-ink">{persona}</strong> volverá a heredar la
            configuración guardada en{" "}
            <strong className="text-ink">{mesTexto(estado.alQuitar)}</strong>.
          </p>
        ) : (
          <p className="font-semibold text-amber-800">
            {estado.alQuitarCorte
              ? `El mes anterior no tiene configuración (herencia suspendida desde ${mesTexto(estado.alQuitarCorte)}), así que ${persona} quedará SIN configuración ${rango} y no se podrá liquidar en esos meses.`
              : `${persona} no tiene ningún mes anterior configurado: quedará SIN configuración ${rango} y no se podrá liquidar en esos meses.`}
          </p>
        )}

        {/* Qué pasa con las liquidaciones */}
        {efecto.eliminar.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="font-bold">
              Se {efecto.eliminar.length === 1 ? "eliminará" : "eliminarán"}{" "}
              {borradores(efecto.eliminar.length)} de liquidación
            </p>
            <p className="mt-1">
              {efecto.eliminar.length === 1 ? "Su mes queda" : "Sus meses quedan"} sin
              configuración, así que ya no se {efecto.eliminar.length === 1 ? "puede" : "pueden"}{" "}
              calcular:
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {efecto.eliminar.map((b) => (
                <li key={b.id}>{b.etiqueta}</li>
              ))}
            </ul>
          </div>
        ) : quedaSinConfig ? (
          <p>No hay borradores de liquidación en esos meses: no se elimina ninguno.</p>
        ) : null}

        {efecto.conservar > 0 && (
          <p>
            {efecto.conservar === 1
              ? "El borrador de esos meses se conserva"
              : `Los ${efecto.conservar} borradores de esos meses se conservan`}{" "}
            con sus conceptos (bonos, préstamos…) y se recalcula
            {efecto.conservar === 1 ? "" : "n"} con la configuración heredada.
          </p>
        )}

        <p className="rounded-xl bg-mist/70 px-3.5 py-2.5 text-xs">
          {AYUDA_NOMINA_BORRADORES}
        </p>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-amber-700 disabled:opacity-60"
          >
            {enviando
              ? accion === "cortar"
                ? "Guardando…"
                : "Quitando…"
              : accion === "cortar"
                ? "Sí, dejar sin configuración"
                : corteAqui
                  ? "Sí, quitar la suspensión"
                  : "Sí, quitar el cambio"}
          </button>
        </div>
      </form>
    </ModalPanel>
  );
}

/* ================================================================== */
/* Los campos                                                          */
/* ================================================================== */

function CamposConfig({
  config,
  legal,
  mesEtiqueta,
}: {
  config: {
    salario: number;
    auxTransporte: number;
    tarifas: TarifasNomina;
    pctSalud: number;
    pctPension: number;
  };
  legal: LegalMesVista;
  /** «septiembre de 2026»: el mes cuya ley se aplica. */
  mesEtiqueta: string;
}) {
  const [salario, setSalario] = useState(config.salario);

  // LAS TARIFAS NO SE EDITAN (23 sep 2026): se derivan del salario y de la ley
  // del mes. Se recalculan en vivo mientras se escribe el salario y se
  // muestran de SOLO LECTURA, con la cuenta a la vista.
  const tarifas = useMemo(() => derivarTarifas(salario, legal), [salario, legal]);
  const factores = useMemo(
    () => factoresTarifa(legal.recargoDominical),
    [legal.recargoDominical],
  );

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
          description="Lo calcula el sistema con la ley: no se digita. Son pesos por hora que se pagan ADEMÁS del salario, sobre las horas que salen de las jornadas aprobadas."
        />

        <AyudaSeccion className="mb-5" title="De dónde sale cada valor">
          {AYUDA_NOMINA_TARIFAS_AUTOMATICAS}
          <span className="mt-1.5 block font-semibold text-ink">
            Ley de {mesEtiqueta}: jornada de{" "}
            {formatearNumero(legal.horasSemanales)} h semanales → valor hora =
            salario ÷ {formatearNumero(legal.divisor)} · recargo de domingo y
            festivo del {formatearNumero(Math.round(legal.recargoDominical * 100))}&nbsp;%.
          </span>
        </AyudaSeccion>

        {salario <= 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-mist/60 px-4 py-6 text-center text-sm leading-relaxed text-graphite">
            Escribe primero el salario básico mensual: en cuanto lo pongas
            aparecen aquí los siete valores, ya calculados.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Valor de cada tipo de hora en {mesEtiqueta}, calculado por el
                sistema
              </caption>
              <thead>
                <tr className="bg-mist/70 text-left text-xs font-bold uppercase tracking-wide text-graphite">
                  <th scope="col" className="px-4 py-2.5">
                    Tipo de hora
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Valor por hora
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right sm:table-cell">
                    Cuenta
                  </th>
                </tr>
              </thead>
              <tbody>
                {CAMPOS_TARIFA.map((campo) => (
                  <tr key={campo.clave} className="border-t border-line align-top">
                    <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                      {campo.label}
                      <span className="mt-0.5 block text-xs font-normal leading-relaxed text-graphite">
                        {campo.ayuda}
                      </span>
                    </th>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-ink">
                      {formatearDinero(tarifas[campo.clave])}
                      <span className="mt-0.5 block text-xs font-normal text-graphite sm:hidden">
                        salario ÷ {formatearNumero(legal.divisor)} ×{" "}
                        {formatearNumero(factores[campo.clave])}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-right text-xs text-graphite sm:table-cell">
                      salario ÷ {formatearNumero(legal.divisor)} ×{" "}
                      {formatearNumero(factores[campo.clave])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
