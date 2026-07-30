"use client";

/**
 * TABLERO DE MÉTRICAS DE JORNADAS
 * ===============================
 * Vista "Métricas" de /admin/jornadas. El servidor trae las jornadas de los
 * últimos 90 días ya con su desglose calculado; aquí todo el filtrado, las
 * agregaciones y las gráficas ocurren en el navegador con `useMemo`, así que
 * mover un filtro es instantáneo y no vuelve a golpear la base de datos.
 *
 * Está pensado para personas NO técnicas: cada bloque trae un botón "Ayuda"
 * que explica en lenguaje llano qué significa cada número. Nunca se muestran
 * fórmulas.
 */

import { useMemo, useState } from "react";
import {
  JORNADA_STATUS_CLASSES,
  JORNADA_STATUS_LABELS,
  type JornadaStatus,
} from "@/lib/admin-types";
import { Badge, EmptyState } from "@/components/admin/ui";
import {
  formatearFechaNumerica,
  formatearHoras,
  type JornadaConfig,
} from "@/lib/jornada";
import {
  resumenSemanalExtras,
  sumarDias,
  type JornadaMetrica,
} from "@/lib/jornada-metrics";
import {
  DateRange,
  FilterSelect,
  MultiSelect,
  Pagination,
  SectionHeader,
  StatCard,
} from "./dashboard-ui";
import { JornadasCharts } from "./JornadasCharts";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ClipboardList,
  ClockPlus,
  Download,
  FilterX,
  Users,
} from "@/lib/icons";

const FILAS_TABLA = 50;

/** Opciones del filtro de estado. `oficiales` = aprobadas + pendientes. */
const ESTADOS = [
  { value: "oficiales", label: "Aprobadas y pendientes" },
  { value: "aprobada", label: "Solo aprobadas" },
  { value: "pendiente", label: "Solo pendientes" },
  { value: "rechazada", label: "Solo rechazadas" },
  { value: "todas", label: "Todas" },
] as const;

type FiltroEstado = (typeof ESTADOS)[number]["value"];

const ESTADOS_INCLUIDOS: Record<FiltroEstado, JornadaStatus[] | null> = {
  oficiales: ["aprobada", "pendiente"],
  aprobada: ["aprobada"],
  pendiente: ["pendiente"],
  rechazada: ["rechazada"],
  todas: null,
};

/* ------------------------------------------------------------------ */
/* Exportación a CSV                                                   */
/* ------------------------------------------------------------------ */

/** Un campo seguro para CSV: comillas dobles escapadas y saltos de línea fuera. */
function campo(valor: string | number): string {
  const texto = String(valor ?? "").replace(/[\r\n]+/g, " ");
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Horas con coma decimal (así las lee Excel en español). */
function horasDecimal(minutos: number): string {
  return (Math.round((minutos / 60) * 100) / 100).toFixed(2).replace(".", ",");
}

/**
 * Descarga el conjunto filtrado como CSV.
 * Separador `;` y BOM UTF-8 para que Excel en español lo abra con las columnas
 * separadas y las tildes correctas al hacer doble clic.
 */
function descargarCSV(
  datos: JornadaMetrica[],
  desde: string,
  hasta: string,
): void {
  const encabezados = [
    "Empleado",
    "Fecha",
    "Orden de trabajo",
    "Inicio",
    "Fin",
    "Duración del turno",
    "Almuerzo descontado",
    "Horas trabajadas",
    "Horas (decimal)",
    "Horas ordinarias",
    "Horas extra",
    "Extra diurna",
    "Extra nocturna",
    "Extra dominical/festivo diurna",
    "Extra dominical/festivo nocturna",
    "Nocturnas",
    "Dominical o festivo",
    "Cruzó medianoche",
    "Estado",
  ];

  const filas = datos.map((j) =>
    [
      j.empleadoNombre,
      formatearFechaNumerica(j.fecha),
      j.ordenTrabajo,
      j.inicio,
      j.fin,
      formatearHoras(j.duracionMin),
      formatearHoras(j.almuerzoMin),
      formatearHoras(j.totalMinutos),
      horasDecimal(j.totalMinutos),
      formatearHoras(j.ordinariasMin),
      formatearHoras(j.extrasMin),
      formatearHoras(j.extraDiurnaMin),
      formatearHoras(j.extraNocturnaMin),
      formatearHoras(j.extraDominicalDiurnaMin),
      formatearHoras(j.extraDominicalNocturnaMin),
      formatearHoras(j.nocturnasMin),
      j.esDominicalFestivo
        ? j.festivos.length > 0
          ? j.festivos.join(" / ")
          : "Domingo"
        : "No",
      j.cruzaMedianoche ? "Sí" : "No",
      JORNADA_STATUS_LABELS[j.status],
    ].map(campo),
  );

  const contenido = [encabezados.map(campo), ...filas]
    .map((f) => f.join(";"))
    .join("\r\n");

  // ﻿ = BOM UTF-8.
  const blob = new Blob([`﻿${contenido}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `jornadas_GPI_${desde}_${hasta}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */

export function JornadasDashboard({
  jornadas,
  empleados,
  config,
  hoy,
  rangoDesde,
}: {
  /** Jornadas de los últimos 90 días, con el desglose ya calculado. */
  jornadas: JornadaMetrica[];
  /** Cuentas del equipo (para el desplegable, aunque no tengan jornadas). */
  empleados: { id: string; nombre: string }[];
  config: JornadaConfig;
  /** Fecha de hoy en Colombia, calculada en el servidor. */
  hoy: string;
  /** Primer día del rango que trajo el servidor. */
  rangoDesde: string;
}) {
  const desdePorDefecto = sumarDias(hoy, -29);

  const [desde, setDesde] = useState(desdePorDefecto);
  const [hasta, setHasta] = useState(hoy);
  const [seleccionEmpleados, setSeleccionEmpleados] = useState<string[]>([]);
  const [estado, setEstado] = useState<FiltroEstado>("oficiales");
  const [paginaTabla, setPaginaTabla] = useState(0);

  /* ---- Filtrado --------------------------------------------------- */
  const datos = useMemo(() => {
    const incluidos = ESTADOS_INCLUIDOS[estado];
    const porEmpleado = new Set(seleccionEmpleados);
    return jornadas.filter((j) => {
      if (desde && j.fecha < desde) return false;
      if (hasta && j.fecha > hasta) return false;
      if (porEmpleado.size > 0 && !porEmpleado.has(j.empleadoId)) return false;
      if (incluidos && !incluidos.includes(j.status)) return false;
      return true;
    });
  }, [jornadas, desde, hasta, seleccionEmpleados, estado]);

  /* ---- KPIs ------------------------------------------------------- */
  const kpis = useMemo(() => {
    let totalMin = 0;
    let extrasMin = 0;
    let extrasPendientesMin = 0;
    let pendientes = 0;
    const personas = new Set<string>();

    for (const j of datos) {
      totalMin += j.totalMinutos;
      extrasMin += j.extrasMin;
      personas.add(j.empleadoId);
      if (j.status === "pendiente") {
        pendientes += 1;
        extrasPendientesMin += j.extrasMin;
      }
    }

    return {
      jornadas: datos.length,
      personas: personas.size,
      totalMin,
      extrasMin,
      extrasPendientesMin,
      pendientes,
    };
  }, [datos]);

  /* ---- Acumulado semanal de horas extra --------------------------- */
  const semanas = useMemo(
    () =>
      resumenSemanalExtras(
        datos,
        config.limiteExtrasSemana,
        config.limiteExtrasDia,
      ),
    [datos, config.limiteExtrasSemana, config.limiteExtrasDia],
  );
  const semanasEnAlerta = semanas.filter(
    (s) => s.excedeSemana || s.diasSobreTope > 0,
  );

  /* ---- Tabla ------------------------------------------------------ */
  const ordenadas = useMemo(
    () =>
      [...datos].sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.inicioDecimal - a.inicioDecimal ||
          a.empleadoNombre.localeCompare(b.empleadoNombre, "es"),
      ),
    [datos],
  );
  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / FILAS_TABLA));
  const pagina = Math.min(paginaTabla, totalPaginas - 1);
  const filas = ordenadas.slice(pagina * FILAS_TABLA, (pagina + 1) * FILAS_TABLA);

  /* ---- Frescura --------------------------------------------------- */
  const ultima = useMemo(() => {
    if (jornadas.length === 0) return null;
    return [...jornadas].sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) || b.inicioDecimal - a.inicioDecimal,
    )[0];
  }, [jornadas]);

  /* ---- Opciones y estado de los filtros --------------------------- */
  const opcionesEmpleados = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of empleados) mapa.set(e.id, e.nombre);
    // Alguien pudo salir del equipo y seguir teniendo jornadas en el período.
    for (const j of jornadas) if (!mapa.has(j.empleadoId)) mapa.set(j.empleadoId, j.empleadoNombre);
    return [...mapa.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [empleados, jornadas]);

  const hayFiltros =
    desde !== desdePorDefecto ||
    hasta !== hoy ||
    seleccionEmpleados.length > 0 ||
    estado !== "oficiales";

  const limpiar = () => {
    setDesde(desdePorDefecto);
    setHasta(hoy);
    setSeleccionEmpleados([]);
    setEstado("oficiales");
    setPaginaTabla(0);
  };

  /* ---- Sin datos en absoluto -------------------------------------- */
  if (jornadas.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay jornadas registradas"
        description={`En cuanto el equipo empiece a registrar sus jornadas desde Mi Cuenta, aquí aparecerán las horas trabajadas, las horas extra y las gráficas del período. Se muestran los últimos 90 días (desde el ${formatearFechaNumerica(rangoDesde)}).`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------- Frescura + filtros ---------------- */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-ink">Métricas del período</h2>
            <p className="mt-1 text-sm leading-relaxed text-graphite">
              Elige el rango de fechas y las personas que quieres analizar. Todo
              lo de abajo se actualiza al instante.
            </p>
          </div>
          {ultima && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3.5 py-1.5 text-xs font-semibold text-brand-deep">
              <Calendar className="h-3.5 w-3.5" />
              Última jornada registrada: {formatearFechaNumerica(ultima.fecha)} ·{" "}
              {ultima.empleadoNombre}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <DateRange label="Rango de fechas" from={desde} to={hasta} onChange={(f, t) => { setDesde(f); setHasta(t); setPaginaTabla(0); }} />
          <MultiSelect
            label="Empleados"
            values={seleccionEmpleados}
            options={opcionesEmpleados}
            onChange={(v) => {
              setSeleccionEmpleados(v);
              setPaginaTabla(0);
            }}
            placeholder="Todos"
            noun="empleados"
          />
          <FilterSelect
            label="Estado"
            value={estado}
            options={ESTADOS.map((e) => ({ value: e.value, label: e.label }))}
            onChange={(v) => {
              setEstado(v as FiltroEstado);
              setPaginaTabla(0);
            }}
          />
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-graphite transition-colors hover:border-brand hover:text-brand-dark"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-graphite">
          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-dark" />
          <span>
            Las cifras oficiales son las de las jornadas <strong>aprobadas</strong>.
            Por defecto también se incluyen las pendientes, para que puedas
            anticipar el cierre del período; cambia el filtro de estado si quieres
            ver solo lo aprobado.
          </span>
        </p>
      </div>

      {/* ---------------- KPIs ---------------- */}
      <div>
        <SectionHeader
          title="Resumen del período"
          info={[
            {
              label: "Jornadas registradas",
              desc: "Cuántos turnos registró el equipo dentro del rango de fechas y con los filtros elegidos.",
            },
            {
              label: "Empleados con jornadas",
              desc: "Cuántas personas distintas registraron al menos un turno en ese período.",
            },
            {
              label: "Total de horas",
              desc: "Suma de todo el tiempo trabajado (jornada ordinaria + horas extra). El almuerzo no se cuenta.",
            },
            {
              label: "Horas extra",
              desc: "Tiempo trabajado por fuera de la jornada ordinaria del día, según el horario del mes (sección Horarios). Es lo que se paga con recargo.",
            },
            {
              label: "Pendientes de aprobación",
              desc: "Horas que el equipo ya registró pero que aún no ha revisado un coordinador o un administrador. Pueden cambiar.",
            },
          ]}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<ClipboardList className="h-5 w-5 text-white" />}
            color="bg-brand"
            label="Jornadas registradas"
            value={String(kpis.jornadas)}
            sub={
              kpis.pendientes > 0
                ? `${kpis.pendientes} sin revisar`
                : "Todas revisadas"
            }
            subTone={kpis.pendientes > 0 ? "warning" : "success"}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-white" />}
            color="bg-brand-dark"
            label="Empleados con jornadas"
            value={String(kpis.personas)}
            sub={`de ${empleados.length} cuenta${empleados.length === 1 ? "" : "s"} del equipo`}
          />
          <StatCard
            icon={<Calendar className="h-5 w-5 text-white" />}
            color="bg-ink"
            label="Total de horas"
            value={formatearHoras(kpis.totalMin)}
            exact={`${kpis.totalMin.toLocaleString("es-CO")} minutos en total`}
            sub={
              kpis.jornadas > 0
                ? `Promedio ${formatearHoras(kpis.totalMin / kpis.jornadas)} por jornada`
                : undefined
            }
          />
          <StatCard
            icon={<ClockPlus className="h-5 w-5 text-white" />}
            color="bg-amber-500"
            label="Horas extra"
            value={formatearHoras(kpis.extrasMin)}
            exact={`${kpis.extrasMin.toLocaleString("es-CO")} minutos por fuera de la jornada ordinaria`}
            sub={
              kpis.extrasPendientesMin > 0
                ? `${formatearHoras(kpis.extrasPendientesMin)} pendientes de aprobación`
                : undefined
            }
            subTone="warning"
          />
        </div>
      </div>

      {/* ---------------- Gráficas ---------------- */}
      <div>
        <SectionHeader
          title="Gráficas"
          info={[
            {
              label: "Horas trabajadas por día",
              desc: "Cuánto trabajó todo el equipo cada día. La parte verde es la jornada ordinaria y la ámbar, las horas extra.",
            },
            {
              label: "Horas por empleado",
              desc: "Quién acumuló más horas en el período. Sirve para repartir la carga de trabajo.",
            },
            {
              label: "Horas extra por empleado",
              desc: "Solo aparece si alguien trabajó por fuera de su jornada ordinaria en el período elegido.",
            },
            {
              label: "Turnos del día",
              desc: "A qué hora entró y a qué hora salió cada persona. Cada barra es un turno y su color identifica al empleado.",
            },
          ]}
        />
        <JornadasCharts datos={datos} limiteExtrasSemana={config.limiteExtrasSemana} />
      </div>

      {/* ---------------- Control de horas extra ---------------- */}
      <div>
        <SectionHeader
          title="Control de horas extra por semana"
          description={`Aviso cuando alguien pasa de ${config.limiteExtrasDia} hora${config.limiteExtrasDia === 1 ? "" : "s"} extra en un día o de ${config.limiteExtrasSemana} horas extra en una semana.`}
          info={[
            {
              label: "Semana",
              desc: "Va de lunes a domingo. Se agrupan las horas extra de cada persona dentro de esa semana.",
            },
            {
              label: "Aviso de tope",
              desc: `Es un recordatorio, no un bloqueo: la ley colombiana permite hasta ${config.limiteExtrasDia} hora${config.limiteExtrasDia === 1 ? "" : "s"} extra al día y ${config.limiteExtrasSemana} a la semana. Los topes se ajustan en la configuración de jornadas.`,
            },
            {
              label: "Días sobre el tope",
              desc: "Cuántos días de esa semana tuvieron, por sí solos, más horas extra de las permitidas en un día.",
            },
          ]}
        />

        {semanasEnAlerta.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-brand-tint/50 p-8 text-center">
            <p className="text-base font-bold text-ink">
              Todo en orden con los filtros actuales 🎉
            </p>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-graphite">
              Nadie superó los topes de horas extra en el período seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
            <table className="w-full min-w-[38rem] text-sm">
              <caption className="sr-only">
                Semanas en las que alguien superó los topes legales de horas
                extra, con el empleado, la semana, las horas extra acumuladas y
                el estado de la alerta.
              </caption>
              <thead>
                <tr className="border-b border-line bg-mist/60">
                  <Th>Empleado</Th>
                  <Th>Semana</Th>
                  <Th align="right">Horas extra</Th>
                  <Th align="right">Días sobre el tope</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {semanasEnAlerta.map((s) => (
                  <tr key={s.clave} className="border-b border-line/70 last:border-0">
                    <Td className="font-semibold text-ink">{s.empleadoNombre}</Td>
                    <Td className="whitespace-nowrap font-mono text-xs">
                      {formatearFechaNumerica(s.semanaInicio)} –{" "}
                      {formatearFechaNumerica(s.semanaFin)}
                    </Td>
                    <Td
                      align="right"
                      className={`font-mono font-semibold ${s.excedeSemana ? "text-red-600" : "text-amber-700"}`}
                    >
                      {formatearHoras(s.extrasMin)}
                    </Td>
                    <Td align="right" className="font-mono">
                      {s.diasSobreTope > 0 ? s.diasSobreTope : "—"}
                    </Td>
                    <Td>
                      <Badge
                        className={
                          s.excedeSemana
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-800"
                        }
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {s.excedeSemana ? "Supera el tope semanal" : "Revisar día"}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- Tabla detallada ---------------- */}
      <div>
        <SectionHeader
          title="Detalle de jornadas"
          description={`${ordenadas.length} jornada${ordenadas.length === 1 ? "" : "s"} con los filtros actuales.`}
          action={
            <button
              type="button"
              onClick={() => descargarCSV(ordenadas, desde || rangoDesde, hasta || hoy)}
              disabled={ordenadas.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          }
          info={[
            {
              label: "Duración",
              desc: "Tiempo total del turno, desde la hora de entrada hasta la de salida.",
            },
            {
              label: "H. extra",
              desc: "Parte de ese turno que quedó por fuera de la jornada ordinaria del día (según el horario del mes). Aparece resaltada cuando es mayor que cero.",
            },
            {
              label: "Estado",
              desc: "Pendiente = todavía nadie la ha revisado. Aprobada = confirmada por un coordinador o administrador. Rechazada = el empleado debe corregirla.",
            },
            {
              label: "Exportar CSV",
              desc: "Descarga la tabla tal como la estás viendo, con el desglose completo de horas extra, lista para abrir en Excel.",
            },
          ]}
        />

        {ordenadas.length === 0 ? (
          <EmptyState
            title="No hay jornadas en el período seleccionado"
            description="Prueba con un rango de fechas más amplio, con otras personas o cambiando el filtro de estado."
          />
        ) : (
          <div className="rounded-2xl border border-line bg-white p-2 shadow-soft sm:p-3">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <caption className="sr-only">
                  Detalle de las jornadas registradas con los filtros actuales:
                  empleado, fecha, orden de trabajo, hora de inicio y fin,
                  duración, horas extra y estado de aprobación.
                </caption>
                <thead>
                  <tr className="border-b border-line bg-mist/60">
                    <Th>Empleado</Th>
                    <Th>Fecha</Th>
                    <Th>Orden de trabajo</Th>
                    <Th align="right">Inicio</Th>
                    <Th align="right">Fin</Th>
                    <Th align="right">Duración</Th>
                    <Th align="right">H. extra</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-line/60 last:border-0 hover:bg-mist/50"
                    >
                      <Td className="font-semibold text-ink">{j.empleadoNombre}</Td>
                      <Td className="whitespace-nowrap font-mono text-xs">
                        {formatearFechaNumerica(j.fecha)}
                      </Td>
                      <Td>{j.ordenTrabajo || "—"}</Td>
                      <Td align="right" className="font-mono text-xs">
                        {j.inicio}
                      </Td>
                      <Td align="right" className="font-mono text-xs">
                        {j.fin}
                        {j.cruzaMedianoche && (
                          <span
                            title="El turno terminó al día siguiente"
                            className="ml-1 text-[10px] text-graphite"
                          >
                            +1d
                          </span>
                        )}
                      </Td>
                      <Td align="right" className="whitespace-nowrap font-mono">
                        {formatearHoras(j.totalMinutos)}
                      </Td>
                      <Td
                        align="right"
                        className={`whitespace-nowrap font-mono ${
                          j.extrasMin > 0
                            ? "font-semibold text-amber-700"
                            : "text-graphite"
                        }`}
                      >
                        {j.extrasMin > 0 ? formatearHoras(j.extrasMin) : "—"}
                      </Td>
                      <Td>
                        <Badge className={JORNADA_STATUS_CLASSES[j.status]}>
                          {JORNADA_STATUS_LABELS[j.status]}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagina}
              totalPages={totalPaginas}
              onPageChange={setPaginaTabla}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Celdas de tabla                                                     */
/* ------------------------------------------------------------------ */

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-graphite ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-ink-soft ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
