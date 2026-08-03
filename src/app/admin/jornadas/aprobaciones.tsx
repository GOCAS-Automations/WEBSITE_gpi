/**
 * VISTA "APROBACIONES" de /admin/jornadas
 * =======================================
 * Filtros por estado/empleado/fechas y una ficha por jornada con su desglose y
 * los botones de aprobar / rechazar / reabrir / eliminar.
 *
 * Los filtros siguen viviendo en la URL y consultándose AQUÍ, en el servidor;
 * lo único que es cliente es la barra que los reescribe (`FiltrosAprobaciones`),
 * para que se apliquen al cambiar en vez de con un botón "Filtrar".
 *
 * ELIMINAR ≠ RECHAZAR: rechazar conserva el registro con una nota que el
 * empleado lee para corregir; eliminar lo borra de la base de datos y el
 * empleado deja de verlo. Eliminar existe para limpiar registros de prueba o
 * equivocados y está disponible en cualquier estado (solo managers).
 */

import Link from "next/link";
import {
  getJornadaConfig,
  getMapaHorarios,
  listJornadas,
  listProfiles,
} from "@/lib/admin";
import {
  JORNADA_FILTRO_ESTADOS,
  JORNADA_FILTRO_ESTADO_DEFECTO,
  JORNADA_STATUS_CLASSES,
  JORNADA_STATUS_LABELS,
  SIN_ORDEN_TRABAJO,
  type JornadaStatus,
} from "@/lib/admin-types";
import { AyudaSeccion, Badge, Card, EmptyState } from "@/components/admin/ui";
import { JornadaBreakdown } from "@/components/jornadas/JornadaBreakdown";
import {
  DeleteJornadaAction,
  ReopenAction,
  ReviewActions,
} from "@/components/jornadas/ReviewActions";
import {
  formatearDuracion,
  formatearFechaLarga,
  formatearHora12,
  horaColombia,
  obtenerDesglose,
} from "@/lib/jornada";
import {
  approveJornada,
  deleteJornadaAsManager,
  rejectJornada,
  reopenJornada,
} from "./actions";
import { FiltrosAprobaciones } from "./FiltrosAprobaciones";
import { Info } from "@/lib/icons";

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
  const estado = JORNADA_FILTRO_ESTADOS.some((e) => e.value === estadoRaw)
    ? (estadoRaw as JornadaStatus | "todas")
    : JORNADA_FILTRO_ESTADO_DEFECTO;

  const [jornadas, empleados, config, horarios] = await Promise.all([
    listJornadas({
      status: estado,
      employeeId: empleadoId || undefined,
      from: desde || undefined,
      to: hasta || undefined,
    }),
    listProfiles(),
    getJornadaConfig(),
    getMapaHorarios(),
  ]);

  return (
    <>
      {/* ---------------- Qué significa cada estado ---------------- */}
      <AyudaSeccion title="Cómo funciona esta bandeja" className="mb-6">
        <ul className="space-y-1.5">
          <li>
            <strong>Pendiente:</strong> el empleado la registró y todavía nadie
            la ha revisado. Mientras esté así, él puede corregirla o eliminarla.
          </li>
          <li>
            <strong>Aprobada:</strong> queda confirmada para nómina. Su desglose
            de horas se guarda tal cual, así que corregir después el horario de
            un mes ya no la cambia.
          </li>
          <li>
            <strong>Rechazada:</strong> el empleado debe corregirla. Rechazar
            exige escribir un motivo, y <strong>ese texto lo verá él</strong> en
            su portal: sé concreto para que sepa qué arreglar.
          </li>
          <li>
            <strong>Volver a pendiente:</strong> reabre una jornada ya revisada.
            Es también la forma de <strong>recalcular</strong> una jornada
            aprobada si el horario del mes estaba mal: la corriges en{" "}
            <Link
              href="/admin/horarios"
              className="font-semibold text-brand-dark hover:text-brand"
            >
              Horarios
            </Link>
            , la devuelves a pendiente y la vuelves a aprobar.
          </li>
          <li>
            <strong>Rechazar no es eliminar:</strong> al{" "}
            <strong>rechazar</strong>, la jornada se queda en el sistema y el
            empleado ve tu nota para corregirla. Al <strong>eliminar</strong>,
            la jornada desaparece para siempre y él deja de verla en su
            historial: úsalo solo para limpiar registros de prueba o
            equivocados.
          </li>
        </ul>
      </AyudaSeccion>

      {/* ------ Filtros: se aplican al cambiar, sin botón "Filtrar" ------ */}
      <Card className="mb-6">
        <FiltrosAprobaciones
          valores={{ estado, empleado: empleadoId, desde, hasta }}
          empleados={empleados.map((p) => ({ id: p.id, nombre: p.full_name }))}
        />
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
            // Regla de lectura única: si la jornada se aprobó con el desglose
            // congelado, se muestran esas cifras; si no, se calculan en vivo.
            const { desglose, congelado, contexto, calculadoEn } =
              obtenerDesglose(jornada, config, horarios);
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
                    {jornada.work_order
                      ? `Orden ${jornada.work_order}`
                      : SIN_ORDEN_TRABAJO}
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

                    {/* Revisión según el estado y, aparte, la eliminación
                        definitiva: va bajo una línea para que no se confunda
                        con rechazar. */}
                    <div className="space-y-3 pt-1">
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
                      <div className="border-t border-line pt-3">
                        <DeleteJornadaAction
                          id={jornada.id}
                          empleado={empleado}
                          fecha={formatearFechaLarga(jornada.work_date)}
                          action={deleteJornadaAsManager}
                        />
                      </div>
                    </div>
                  </div>

                  <JornadaBreakdown
                    desglose={desglose}
                    congelado={congelado}
                    contexto={contexto}
                    calculadoEn={calculadoEn}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Info className="h-4 w-4 text-brand-dark" />
          Cómo se calculan las horas
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Se toman las horas reales de inicio y fin (hora de Colombia). La{" "}
          <strong>jornada ordinaria</strong> de cada día sale del{" "}
          <Link
            href="/admin/horarios"
            className="font-semibold text-brand-dark hover:text-brand-dark"
          >
            horario del mes
          </Link>{" "}
          (salida − entrada − almuerzo); lo que exceda cuenta como extra. Se
          considera <strong>nocturno</strong> lo trabajado entre las{" "}
          {formatearHora12(config.inicioNocturno)} y las{" "}
          {formatearHora12(config.finNocturno)}, y{" "}
          <strong>dominical o festivo</strong> lo trabajado en domingo, en un
          festivo nacional o en un día marcado como no laboral.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          El <strong>almuerzo</strong> no cuenta como trabajo: se descuenta
          cuando el turno dura más de 6 horas en un día laboral (regla pendiente
          de confirmar con GPI). Los porcentajes de recargo y los topes de horas
          extra son ajustables: viven en el ajuste{" "}
          <code className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs">
            jornada_config
          </code>{" "}
          de la base de datos.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          <strong>Al aprobar, el desglose queda congelado.</strong> Se guarda
          junto con el horario y los recargos que se usaron, y esa jornada
          muestra siempre las mismas horas: si en septiembre alguien corrige el
          horario de julio, los reportes de julio ya aprobados no se mueven. Las
          jornadas pendientes sí se recalculan con lo que esté vigente. Las
          jornadas aprobadas <em>antes</em> de activar esta función se siguen
          calculando en vivo, y se congelan si se devuelven a pendiente y se
          aprueban otra vez.
        </p>
      </Card>
    </>
  );
}
