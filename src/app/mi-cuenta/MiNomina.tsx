/**
 * «MI NÓMINA» — el bloque del portal del empleado (`/mi-cuenta`)
 * ==============================================================
 * Las liquidaciones **cerradas o pagadas** de quien está viendo la página, con
 * su neto y el botón para descargar el volante en PDF.
 *
 * Los borradores NO aparecen, y no por una decisión de esta pantalla: la
 * política `nomina_liquidaciones_select_propia` (migración 0011) solo deja ver
 * al empleado sus propias liquidaciones cuando ya están cerradas. Enseñar un
 * borrador sería prometer una cifra que todavía puede cambiar.
 *
 * Es un Server Component: no necesita interactividad, solo enlaces de descarga.
 */

import {
  NOMINA_ESTADO_CLASSES,
  NOMINA_ESTADO_LABELS,
  etiquetaPeriodo,
  formatearPesos,
  normalizarSnapshot,
} from "@/lib/nomina";
import type { NominaLiquidacionRecord } from "@/lib/admin-types";
import { Badge } from "@/components/admin/ui-base";
import { Banknote, Download, Info } from "@/lib/icons";

/** "2026-09-15" → "15/09/2026". */
function fecha(valor: string | null): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "—";
  return `${valor.slice(8, 10)}/${valor.slice(5, 7)}/${valor.slice(0, 4)}`;
}

export function MiNomina({
  liquidaciones,
}: {
  liquidaciones: NominaLiquidacionRecord[];
}) {
  // Sin nada que mostrar, el bloque no se pinta: un apartado vacío en el portal
  // de alguien que aún no tiene volantes solo genera dudas.
  if (liquidaciones.length === 0) return null;

  return (
    <section className="mb-8 rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
      <header className="mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Banknote className="h-5 w-5 text-brand-dark" />
          Mi nómina
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-graphite">
          Tus liquidaciones ya cerradas, con el comprobante de pago que puedes
          descargar e imprimir. Si algo no cuadra, habla con tu coordinador.
        </p>
      </header>

      {/* --- Móvil: una tarjeta por liquidación ---
          En una tabla de cinco columnas el botón de descarga —que es justo lo
          que el empleado viene a buscar— queda fuera de la pantalla en un
          teléfono, y nada indica que haya que desplazarse en horizontal. */}
      <ul className="space-y-3 sm:hidden">
        {liquidaciones.map((l) => {
          const snapshot = normalizarSnapshot(l.snapshot);
          return (
            <li
              key={l.id}
              className="rounded-2xl border border-line bg-mist/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-ink">
                  {etiquetaPeriodo(l.tipo, l.anio, l.mes, l.quincena)}
                </p>
                <Badge className={NOMINA_ESTADO_CLASSES[l.estado]}>
                  {NOMINA_ESTADO_LABELS[l.estado]}
                </Badge>
              </div>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">
                {snapshot ? formatearPesos(snapshot.calculo.neto) : "—"}
              </p>
              {l.fecha_pago && (
                <p className="mt-0.5 text-xs text-graphite">
                  Pagado el {fecha(l.fecha_pago)}
                </p>
              )}
              <a
                href={`/mi-cuenta/volante/${l.id}/pdf`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand/40 bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15"
              >
                <Download className="h-4 w-4" />
                Descargar comprobante
              </a>
            </li>
          );
        })}
      </ul>

      {/* --- Escritorio: la tabla --- */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-graphite">
              <th scope="col" className="py-2.5 pr-3 font-semibold">
                Período
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                Neto
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Estado
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Pagado el
              </th>
              <th scope="col" className="py-2.5 pl-3 text-right font-semibold">
                Volante
              </th>
            </tr>
          </thead>
          <tbody>
            {liquidaciones.map((l) => {
              const snapshot = normalizarSnapshot(l.snapshot);
              return (
                <tr
                  key={l.id}
                  className="border-b border-line/70 last:border-0"
                >
                  <td className="py-3 pr-3 font-semibold text-ink">
                    {etiquetaPeriodo(l.tipo, l.anio, l.mes, l.quincena)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-ink">
                    {snapshot ? formatearPesos(snapshot.calculo.neto) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={NOMINA_ESTADO_CLASSES[l.estado]}>
                      {NOMINA_ESTADO_LABELS[l.estado]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-graphite">{fecha(l.fecha_pago)}</td>
                  <td className="py-3 pl-3 text-right">
                    <a
                      href={`/mi-cuenta/volante/${l.id}/pdf`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-tint px-3.5 py-1.5 text-xs font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-graphite">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Aquí solo salen las liquidaciones <strong>ya cerradas</strong>. Las que
          tu coordinador todavía está preparando no aparecen porque sus cifras
          pueden cambiar.
        </span>
      </p>
    </section>
  );
}
