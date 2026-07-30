/**
 * Presentación del desglose de una jornada.
 *
 * Componente PURO (sin acceso a servidor ni a cliente): lo usan por igual el
 * portal del empleado (vista previa en vivo, dentro de un Client Component) y
 * la pantalla de aprobaciones de /admin/jornadas (Server Component).
 */

import {
  formatearDuracion,
  textoCalculoCongelado,
  type ContextoCalculo,
  type DesgloseJornada,
} from "@/lib/jornada";

interface Fila {
  key: keyof DesgloseJornada;
  label: string;
  /** Nota corta que explica la categoría en lenguaje sencillo. */
  hint: string;
  className: string;
}

const FILAS: Fila[] = [
  {
    key: "ordinariaDiurna",
    label: "Ordinarias diurnas",
    hint: "Dentro de la jornada normal, en horario diurno.",
    className: "bg-mist text-ink",
  },
  {
    key: "ordinariaNocturna",
    label: "Ordinarias con recargo nocturno",
    hint: "Dentro de la jornada normal pero en franja nocturna.",
    className: "bg-indigo-50 text-indigo-800",
  },
  {
    key: "extraDiurna",
    label: "Extra diurnas",
    hint: "Pasada la jornada ordinaria, en horario diurno.",
    className: "bg-brand-tint text-brand-deep",
  },
  {
    key: "extraNocturna",
    label: "Extra nocturnas",
    hint: "Pasada la jornada ordinaria, en franja nocturna.",
    className: "bg-indigo-100 text-indigo-900",
  },
  {
    key: "dominicalDiurna",
    label: "Dominical/festivo diurnas",
    hint: "Horas ordinarias trabajadas en domingo o festivo.",
    className: "bg-amber-50 text-amber-800",
  },
  {
    key: "dominicalNocturna",
    label: "Dominical/festivo nocturnas",
    hint: "Horas ordinarias en domingo o festivo, en franja nocturna.",
    className: "bg-amber-100 text-amber-900",
  },
  {
    key: "extraDominicalDiurna",
    label: "Extra dominical diurnas",
    hint: "Horas extra en domingo o festivo, en horario diurno.",
    className: "bg-orange-100 text-orange-900",
  },
  {
    key: "extraDominicalNocturna",
    label: "Extra dominical nocturnas",
    hint: "Horas extra en domingo o festivo, en franja nocturna.",
    className: "bg-orange-200 text-orange-900",
  },
];

export function JornadaBreakdown({
  desglose,
  compacto = false,
  congelado = false,
  contexto = null,
  calculadoEn = null,
}: {
  desglose: DesgloseJornada;
  /** true = solo las categorías con minutos, en una fila de chips. */
  compacto?: boolean;
  /**
   * true = estas cifras se guardaron al aprobar la jornada y ya no cambian
   * aunque después se edite el horario del mes o un recargo (migración 0004).
   */
  congelado?: boolean;
  /** Con qué horario y recargos se calculó (para explicarlo al usuario). */
  contexto?: ContextoCalculo | null;
  /** Instante ISO en que se congeló el cálculo. */
  calculadoEn?: string | null;
}) {
  if (!desglose.valido) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        {desglose.error}
      </p>
    );
  }

  const conMinutos = FILAS.filter((f) => (desglose[f.key] as number) > 0);
  const notaCongelado = congelado
    ? textoCalculoCongelado(contexto, calculadoEn)
    : "";

  if (compacto) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {congelado && (
          <span
            title={notaCongelado}
            className="inline-flex items-center rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-deep"
          >
            Cálculo congelado
          </span>
        )}
        {conMinutos.map((fila) => (
          <span
            key={fila.key}
            title={fila.hint}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${fila.className}`}
          >
            {fila.label}: {formatearDuracion(desglose[fila.key] as number)}
          </span>
        ))}
        {desglose.almuerzoMinutos > 0 && (
          <span className="inline-flex items-center rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-semibold text-graphite">
            Almuerzo descontado: {formatearDuracion(desglose.almuerzoMinutos)}
          </span>
        )}
        {desglose.esDominicalFestivo && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
            {desglose.festivos.length > 0
              ? `Festivo: ${desglose.festivos.join(", ")}`
              : "Domingo o día no laboral"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
          {congelado ? "Desglose aprobado" : "Desglose estimado"}
          {congelado && (
            <span
              title={notaCongelado}
              className="inline-flex items-center rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-deep"
            >
              Cálculo congelado
            </span>
          )}
        </p>
        <p className="text-sm text-graphite">
          Duración total:{" "}
          <span className="font-bold text-ink">
            {formatearDuracion(desglose.totalMinutos)}
          </span>
        </p>
      </div>

      {/* De dónde sale la jornada ordinaria del día y qué se descontó */}
      <p className="mt-1.5 text-xs leading-relaxed text-graphite">
        {desglose.diaLaboral ? (
          <>
            Jornada ordinaria de ese día:{" "}
            <strong className="text-ink-soft">
              {formatearDuracion(desglose.jornadaOrdinariaMinutos)}
            </strong>
            {desglose.almuerzoMinutos > 0 && (
              <>
                {" "}
                · almuerzo descontado:{" "}
                <strong className="text-ink-soft">
                  {formatearDuracion(desglose.almuerzoMinutos)}
                </strong>{" "}
                (no cuenta como trabajo) · tiempo trabajado:{" "}
                <strong className="text-ink-soft">
                  {formatearDuracion(desglose.minutosTrabajados)}
                </strong>
              </>
            )}
          </>
        ) : (
          <>
            Ese día <strong className="text-ink-soft">no es laboral</strong> en el
            horario del mes (o es festivo): todo el turno se calcula con recargo
            dominical/festivo.
          </>
        )}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Resumen
          label="Horas ordinarias"
          minutos={desglose.ordinarias}
          className="bg-mist text-ink"
        />
        <Resumen
          label="Horas extra"
          minutos={desglose.extras}
          className="bg-brand-tint text-brand-deep"
        />
      </div>

      {conMinutos.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {conMinutos.map((fila) => (
            <li
              key={fila.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${fila.className}`}
                />
                <span className="text-graphite">{fila.label}</span>
              </span>
              <span className="font-semibold text-ink">
                {formatearDuracion(desglose[fila.key] as number)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {(desglose.esDominicalFestivo || desglose.cruzaMedianoche) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {desglose.cruzaMedianoche && (
            <span className="inline-flex items-center rounded-full bg-mist px-2.5 py-0.5 text-[11px] font-semibold text-graphite">
              El turno cruzó la medianoche
            </span>
          )}
          {desglose.esDominicalFestivo && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
              {desglose.festivos.length > 0
                ? `Festivo: ${desglose.festivos.join(", ")}`
                : "Domingo o día no laboral"}
            </span>
          )}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-graphite">
        {congelado
          ? notaCongelado
          : "Cálculo informativo con los parámetros configurados en el panel: puede cambiar si se ajusta el horario del mes. Queda fijo cuando se aprueba la jornada."}
      </p>
    </div>
  );
}

function Resumen({
  label,
  minutos,
  className,
}: {
  label: string;
  minutos: number;
  className: string;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-extrabold">
        {formatearDuracion(minutos)}
      </p>
    </div>
  );
}
