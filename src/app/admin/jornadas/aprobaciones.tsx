/**
 * VISTA "APROBACIONES" de /admin/jornadas
 * =======================================
 * Es la pantalla de siempre: filtros por estado/empleado/fechas (formulario GET,
 * funciona sin JavaScript) y una ficha por jornada con su desglose y los botones
 * de aprobar / rechazar / reabrir.
 *
 * Se extrajo de `page.tsx` cuando la pantalla se dividió en dos pestañas
 * (Aprobaciones y Métricas); el comportamiento no cambió.
 */

import Link from "next/link";
import { getJornadaConfig, listJornadas, listProfiles } from "@/lib/admin";
import {
  JORNADA_STATUS_CLASSES,
  JORNADA_STATUS_LABELS,
  type JornadaStatus,
} from "@/lib/admin-types";
import { Badge, Card, EmptyState, inputClass } from "@/components/admin/ui";
import { JornadaBreakdown } from "@/components/jornadas/JornadaBreakdown";
import { ReopenAction, ReviewActions } from "@/components/jornadas/ReviewActions";
import {
  calcularJornada,
  formatearDuracion,
  formatearFechaLarga,
  formatearHora12,
  horaColombia,
} from "@/lib/jornada";
import { approveJornada, rejectJornada, reopenJornada } from "./actions";
import { Info } from "@/lib/icons";

export const ESTADOS: { value: string; label: string }[] = [
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "rechazada", label: "Rechazadas" },
  { value: "todas", label: "Todas" },
];

export async function AprobacionesView({
  estado: estadoRaw,
  empleadoId,
  desde,
  hasta,
}: {
  estado?: string;
  empleadoId: string;
  desde: string;
  hasta: string;
}) {
  const estado = ESTADOS.some((e) => e.value === estadoRaw)
    ? (estadoRaw as JornadaStatus | "todas")
    : "pendiente";

  const [jornadas, empleados, config] = await Promise.all([
    listJornadas({
      status: estado,
      employeeId: empleadoId || undefined,
      from: desde || undefined,
      to: hasta || undefined,
    }),
    listProfiles(),
    getJornadaConfig(),
  ]);

  return (
    <>
      {/* ---------------- Filtros (formulario GET, sin JavaScript) ------- */}
      <Card className="mb-6">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Mantiene la pestaña actual al enviar el formulario. */}
          <input type="hidden" name="vista" value="aprobaciones" />

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Estado
            </span>
            <select name="estado" defaultValue={estado} className={inputClass}>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Empleado
            </span>
            <select
              name="empleado"
              defaultValue={empleadoId}
              className={inputClass}
            >
              <option value="">Todos</option>
              {empleados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Desde
            </span>
            <input
              type="date"
              name="desde"
              defaultValue={desde}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Hasta
            </span>
            <input
              type="date"
              name="hasta"
              defaultValue={hasta}
              className={inputClass}
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Filtrar
            </button>
            <Link
              href="/admin/jornadas"
              className="inline-flex items-center rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              Limpiar
            </Link>
          </div>
        </form>
      </Card>

      {jornadas.length === 0 ? (
        <EmptyState
          title="No hay jornadas con estos filtros"
          description={
            estado === "pendiente"
              ? "No hay jornadas pendientes de revisión. Cambia el filtro de estado para ver el histórico."
              : "Prueba con otro estado, otro empleado o un rango de fechas más amplio."
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-graphite">
            {jornadas.length} jornada(s) encontrada(s).
          </p>

          {jornadas.map((jornada) => {
            const desglose = calcularJornada(
              jornada.start_at,
              jornada.end_at,
              jornada.work_date,
              config,
            );
            const empleado = jornada.employee_name ?? "Empleado";

            return (
              <article
                key={jornada.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-ink">{empleado}</h2>
                      <Badge className={JORNADA_STATUS_CLASSES[jornada.status]}>
                        {JORNADA_STATUS_LABELS[jornada.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-graphite">
                      {formatearFechaLarga(jornada.work_date)} ·{" "}
                      {formatearHora12(horaColombia(jornada.start_at))} a{" "}
                      {formatearHora12(horaColombia(jornada.end_at))} ·{" "}
                      <span className="font-semibold text-ink">
                        {formatearDuracion(desglose.totalMinutos)}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
                    Orden {jornada.work_order}
                  </span>
                </header>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                        Labor realizada
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        {jornada.description}
                      </p>
                    </div>

                    {jornada.observations && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                          Observaciones
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-graphite">
                          {jornada.observations}
                        </p>
                      </div>
                    )}

                    {jornada.review_note && (
                      <div className="rounded-xl border border-line bg-mist/70 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                          Nota de revisión
                          {jornada.reviewer_name && ` · ${jornada.reviewer_name}`}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                          {jornada.review_note}
                        </p>
                      </div>
                    )}

                    <div className="pt-1">
                      {jornada.status === "pendiente" ? (
                        <ReviewActions
                          id={jornada.id}
                          empleado={empleado}
                          approve={approveJornada}
                          reject={rejectJornada}
                        />
                      ) : (
                        <ReopenAction id={jornada.id} action={reopenJornada} />
                      )}
                    </div>
                  </div>

                  <JornadaBreakdown desglose={desglose} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Info className="h-4 w-4 text-brand" />
          Cómo se calculan las horas
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Se toman las horas reales de inicio y fin (hora de Colombia). Las
          primeras <strong>{config.horasOrdinariasDia} horas</strong> del turno
          son ordinarias y el resto cuenta como extra. Se considera{" "}
          <strong>nocturno</strong> lo trabajado entre las{" "}
          {formatearHora12(config.inicioNocturno)} y las{" "}
          {formatearHora12(config.finNocturno)}, y{" "}
          <strong>dominical o festivo</strong> lo trabajado en domingo o en un
          festivo nacional.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Estos parámetros y los porcentajes de recargo son ajustables: viven en
          el ajuste{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
            jornada_config
          </code>{" "}
          de la base de datos y se pueden adaptar a las reglas que confirme GPI.
        </p>
      </Card>
    </>
  );
}
