"use client";

/**
 * GRÁFICAS DEL TABLERO DE JORNADAS
 * ================================
 * Ocho lecturas del mismo conjunto de jornadas ya filtrado, agrupadas por tema:
 *
 *   Tiempo:
 *     1. Horas por día (ordinarias + extra apiladas).
 *     2. Composición de horas (dona): ordinarias, extra y recargos.
 *     3. Tendencia semanal de horas extra, con el tope legal de referencia.
 *   Personas:
 *     4. Horas por empleado.
 *     5. Horas extra por empleado (se oculta si nadie tiene extras).
 *     6. Turnos: una barra por turno, de la hora de entrada a la de salida.
 *   Órdenes de trabajo:
 *     7. Horas por orden de trabajo (top 10).
 *   Estados:
 *     8. Estado de las jornadas (pendiente / aprobada / rechazada).
 *
 * Todas las series paginables se paginan para que la tarjeta se lea bien
 * aunque el rango abarque meses o el equipo sea grande.
 */

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND,
  BRAND_LIGHT,
  COLORES_EMPLEADO,
  COLOR_APROBADA,
  COLOR_DOMINICAL,
  COLOR_EXTRAS,
  COLOR_EXTRA_DIURNA,
  COLOR_EXTRA_NOCTURNA,
  COLOR_ORDINARIAS,
  COLOR_PENDIENTE,
  COLOR_RECARGO_NOCTURNO,
  COLOR_RECHAZADA,
  COLOR_RIESGO,
  ChartCard,
  ChartEmpty,
  Leyenda,
  tooltipStyle,
  usePaginacion,
} from "./dashboard-ui";
import {
  etiquetaDia,
  etiquetaSemana,
  inicioDeSemana,
  type JornadaMetrica,
} from "@/lib/jornada-metrics";
import { SIN_ORDEN_TRABAJO } from "@/lib/admin-types";
import { formatearHoras } from "@/lib/jornada";
import { ChevronDown, ChevronUp, Users } from "@/lib/icons";

const DIAS_POR_PAGINA = 7;
const EMPLEADOS_POR_PAGINA = 8;
const DIAS_GANTT_POR_PAGINA = 3;
const ORDENES_POR_PAGINA = 8;
/** Cuántas órdenes de trabajo entran en el ranking (con paginación si no caben). */
const TOP_ORDENES = 10;

/** Minutos → horas decimales con un decimal (lo que consumen las barras). */
function aHoras(minutos: number): number {
  return Math.round((minutos / 60) * 10) / 10;
}

/** Altura proporcional al número de barras horizontales. */
function altoBarras(n: number): number {
  return Math.max(200, n * 40);
}

/** Redondea una proporción a un porcentaje entero, sin dividir por cero. */
function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

/* ------------------------------------------------------------------ */
/* Tooltip del Gantt                                                   */
/* ------------------------------------------------------------------ */

interface TurnoMeta {
  nombre: string;
  entrada: string;
  salida: string;
  total: string;
  extra: string;
  mas: number;
}

interface PayloadTooltip {
  dataKey?: string | number;
  value?: unknown;
  color?: string;
  payload?: Record<string, unknown>;
}

/** "Nombre · 07:58 → 17:12 (9h 14m)" para cada barra del día. */
function TurnoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: PayloadTooltip[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const fila = (payload[0]?.payload ?? {}) as Record<string, unknown>;

  const entradas = payload
    .filter((p) => Array.isArray(p.value))
    .map((p) => ({
      color: p.color ?? BRAND,
      meta: fila[`${p.dataKey}_meta`] as TurnoMeta | undefined,
    }))
    .filter((e): e is { color: string; meta: TurnoMeta } => Boolean(e.meta));

  if (entradas.length === 0) return null;

  return (
    <div className="max-w-xs rounded-xl border border-line bg-white p-3 text-xs shadow-soft">
      <p className="mb-2 font-bold text-ink">{label}</p>
      <ul className="space-y-1.5">
        {entradas.map((e, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: e.color }}
            />
            <span className="min-w-0">
              <span className="font-semibold text-ink-soft">{e.meta.nombre}</span>{" "}
              <span className="text-graphite">
                · {e.meta.entrada} → {e.meta.salida} ({e.meta.total})
              </span>
              {e.meta.extra && (
                <span className="block text-amber-700">
                  {e.meta.extra} de horas extra
                </span>
              )}
              {e.meta.mas > 0 && (
                <span className="block text-graphite">
                  +{e.meta.mas} turno{e.meta.mas === 1 ? "" : "s"} más ese día
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip de órdenes de trabajo                                       */
/* ------------------------------------------------------------------ */

interface OrdenFila {
  orden: string;
  horas: number;
  totalMin: number;
  ordinariasMin: number;
  extrasMin: number;
  empleados: number;
}

/** "OT-1234 · Total 42h · Ordinarias 38h · Extra 4h · 3 empleados". */
function OrdenTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: OrdenFila }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="max-w-xs rounded-xl border border-line bg-white p-3 text-xs shadow-soft">
      <p className="mb-1.5 font-bold text-ink">{d.orden}</p>
      <p className="text-graphite">
        Total: <span className="font-semibold text-ink-soft">{formatearHoras(d.totalMin)}</span>
      </p>
      <p className="text-graphite">
        Ordinarias:{" "}
        <span className="font-semibold text-ink-soft">
          {formatearHoras(d.ordinariasMin)}
        </span>
      </p>
      {d.extrasMin > 0 && (
        <p className="text-amber-700">
          Horas extra: <span className="font-semibold">{formatearHoras(d.extrasMin)}</span>
        </p>
      )}
      <p className="mt-1.5 text-graphite">
        {d.empleados} empleado{d.empleados === 1 ? "" : "s"}{" "}
        {d.empleados === 1 ? "participó" : "participaron"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function JornadasCharts({
  datos,
  limiteExtrasSemana,
}: {
  datos: JornadaMetrica[];
  /** Tope semanal de horas extra configurado (para la línea de referencia). */
  limiteExtrasSemana: number;
}) {
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);

  /* ==================================================================
     TIEMPO
     ================================================================== */

  /* ---- 1. Horas por día ------------------------------------------ */
  const porDia = useMemo(() => {
    const mapa = new Map<string, { ordinarias: number; extras: number }>();
    for (const j of datos) {
      const actual = mapa.get(j.fecha) ?? { ordinarias: 0, extras: 0 };
      actual.ordinarias += j.ordinariasMin;
      actual.extras += j.extrasMin;
      mapa.set(j.fecha, actual);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, v]) => ({
        fecha,
        etiqueta: etiquetaDia(fecha),
        ordinarias: aHoras(v.ordinarias),
        extras: aHoras(v.extras),
      }));
  }, [datos]);

  const dias = usePaginacion(porDia, DIAS_POR_PAGINA, true);

  /* ---- 2. Composición de horas (dona) ----------------------------- */
  const composicion = useMemo(() => {
    let ordinaria = 0;
    let extraDiurna = 0;
    let extraNocturna = 0;
    let recargoNocturno = 0;
    let dominical = 0;
    for (const j of datos) {
      ordinaria += j.ordinariaDiurnaMin;
      extraDiurna += j.extraDiurnaMin;
      extraNocturna += j.extraNocturnaMin;
      recargoNocturno += j.ordinariaNocturnaMin;
      dominical +=
        j.dominicalDiurnaMin +
        j.dominicalNocturnaMin +
        j.extraDominicalDiurnaMin +
        j.extraDominicalNocturnaMin;
    }
    return [
      { categoria: "Ordinarias", minutos: ordinaria, color: COLOR_ORDINARIAS },
      { categoria: "Extra diurna", minutos: extraDiurna, color: COLOR_EXTRA_DIURNA },
      { categoria: "Extra nocturna", minutos: extraNocturna, color: COLOR_EXTRA_NOCTURNA },
      {
        categoria: "Recargo nocturno",
        minutos: recargoNocturno,
        color: COLOR_RECARGO_NOCTURNO,
      },
      { categoria: "Dominical/festivo", minutos: dominical, color: COLOR_DOMINICAL },
      // Se ocultan las categorías en cero: con un solo empleado o un rango
      // corto es normal que varias no apliquen.
    ].filter((c) => c.minutos > 0);
  }, [datos]);

  const totalComposicionMin = useMemo(
    () => composicion.reduce((acc, c) => acc + c.minutos, 0),
    [composicion],
  );

  /**
   * ---- 3. Tendencia semanal de horas extra --------------------------
   * El tope legal (`limiteExtrasSemana`) aplica POR PERSONA, no al equipo
   * completo: sumar las extras de todos daría un número que casi siempre
   * está por encima del tope con más de un par de empleados, y la línea de
   * referencia dejaría de significar nada. Por eso la tendencia sigue, semana
   * a semana, a la persona que MÁS horas extra acumuló esa semana: así la
   * línea cruza el tope solo cuando alguien realmente se acercó o se pasó,
   * justo lo que detalla la tabla de control más abajo.
   */
  const porSemana = useMemo(() => {
    const porEmpleadoSemana = new Map<string, number>();
    for (const j of datos) {
      const clave = `${j.empleadoId}|${inicioDeSemana(j.fecha)}`;
      porEmpleadoSemana.set(clave, (porEmpleadoSemana.get(clave) ?? 0) + j.extrasMin);
    }
    const maxPorSemana = new Map<string, number>();
    for (const [clave, minutos] of porEmpleadoSemana) {
      const lunes = clave.split("|")[1];
      maxPorSemana.set(lunes, Math.max(maxPorSemana.get(lunes) ?? 0, minutos));
    }
    return [...maxPorSemana.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([lunes, extrasMin]) => ({
        lunes,
        etiqueta: etiquetaSemana(lunes),
        extras: aHoras(extrasMin),
      }));
  }, [datos]);

  /* ==================================================================
     PERSONAS
     ================================================================== */

  /* ---- 4 y 5. Por empleado ----------------------------------------- */
  const porEmpleado = useMemo(() => {
    const mapa = new Map<
      string,
      { nombre: string; total: number; extras: number }
    >();
    for (const j of datos) {
      const actual = mapa.get(j.empleadoId) ?? {
        nombre: j.empleadoNombre,
        total: 0,
        extras: 0,
      };
      actual.total += j.totalMinutos;
      actual.extras += j.extrasMin;
      mapa.set(j.empleadoId, actual);
    }
    return [...mapa.values()].map((e) => ({
      nombre: e.nombre,
      horas: aHoras(e.total),
      extras: aHoras(e.extras),
      totalMin: e.total,
      extrasMin: e.extras,
    }));
  }, [datos]);

  const horasEmpleado = useMemo(
    () => [...porEmpleado].sort((a, b) => b.horas - a.horas),
    [porEmpleado],
  );
  const extrasEmpleado = useMemo(
    () => porEmpleado.filter((e) => e.extras > 0).sort((a, b) => b.extras - a.extras),
    [porEmpleado],
  );

  const horas = usePaginacion(horasEmpleado, EMPLEADOS_POR_PAGINA);
  const extras = usePaginacion(extrasEmpleado, EMPLEADOS_POR_PAGINA);

  /* ---- 6. Gantt de turnos ------------------------------------------ */
  const empleados = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const j of datos) if (!mapa.has(j.empleadoId)) mapa.set(j.empleadoId, j.empleadoNombre);
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [datos]);

  const fechas = useMemo(
    () => [...new Set(datos.map((j) => j.fecha))].sort(),
    [datos],
  );
  const gantt = usePaginacion(fechas, DIAS_GANTT_POR_PAGINA, true);

  const filasGantt = useMemo(() => {
    return gantt.visibles.map((fecha) => {
      const fila: Record<string, unknown> = { etiqueta: etiquetaDia(fecha) };
      for (const emp of empleados) {
        const turnos = datos
          .filter((j) => j.fecha === fecha && j.empleadoId === emp.id)
          .sort((a, b) => a.inicioDecimal - b.inicioDecimal);
        const turno = turnos[0];
        if (turno && turno.totalMinutos > 0) {
          fila[`emp_${emp.id}`] = [turno.inicioDecimal, turno.finDecimal];
          fila[`emp_${emp.id}_meta`] = {
            nombre: emp.nombre,
            entrada: turno.inicio,
            salida: turno.fin,
            total: formatearHoras(turno.totalMinutos),
            extra: turno.extrasMin > 0 ? formatearHoras(turno.extrasMin) : "",
            mas: turnos.length - 1,
          } satisfies TurnoMeta;
        } else {
          fila[`emp_${emp.id}`] = null;
        }
      }
      return fila;
    });
  }, [gantt.visibles, empleados, datos]);

  /* Solo se dibujan los empleados con algún turno en los días visibles. */
  const empleadosVisibles = useMemo(
    () =>
      empleados.filter((emp) =>
        filasGantt.some((f) => Array.isArray(f[`emp_${emp.id}`])),
      ),
    [empleados, filasGantt],
  );

  /* Dominio del eje de horas: de la entrada más temprana a la salida más tarde. */
  const { yMin, yMax } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const fila of filasGantt) {
      for (const emp of empleadosVisibles) {
        const v = fila[`emp_${emp.id}`];
        if (Array.isArray(v)) {
          if (v[0] < min) min = v[0];
          if (v[1] > max) max = v[1];
        }
      }
    }
    if (!Number.isFinite(min)) {
      min = 6;
      max = 20;
    }
    // Un turno que cruza la medianoche pasa de 24: se deja crecer el eje para
    // que la barra no quede cortada (las etiquetas vuelven a 00:00 con % 24).
    const tope = max > 24 ? 30 : 24;
    return {
      yMin: Math.max(0, Math.floor(min - 0.5)),
      yMax: Math.min(tope, Math.ceil(max + 0.5)),
    };
  }, [filasGantt, empleadosVisibles]);

  /* ==================================================================
     ÓRDENES DE TRABAJO
     ================================================================== */

  const porOrden = useMemo(() => {
    const mapa = new Map<
      string,
      { ordinariasMin: number; extrasMin: number; totalMin: number; empleados: Set<string> }
    >();
    for (const j of datos) {
      // Las jornadas sin orden de trabajo NO se excluyen: se agrupan bajo una
      // etiqueta propia. Son horas realmente trabajadas y dejarlas fuera haría
      // que la gráfica no sumara el total de la bandeja, que es peor que una
      // barra llamada "Sin orden de trabajo".
      const clave = j.ordenTrabajo?.trim() || SIN_ORDEN_TRABAJO;
      const actual = mapa.get(clave) ?? {
        ordinariasMin: 0,
        extrasMin: 0,
        totalMin: 0,
        empleados: new Set<string>(),
      };
      actual.ordinariasMin += j.ordinariasMin;
      actual.extrasMin += j.extrasMin;
      actual.totalMin += j.totalMinutos;
      actual.empleados.add(j.empleadoId);
      mapa.set(clave, actual);
    }
    return [...mapa.entries()]
      .map(([orden, v]): OrdenFila => ({
        orden,
        horas: aHoras(v.totalMin),
        totalMin: v.totalMin,
        ordinariasMin: v.ordinariasMin,
        extrasMin: v.extrasMin,
        empleados: v.empleados.size,
      }))
      .sort((a, b) => b.totalMin - a.totalMin)
      .slice(0, TOP_ORDENES);
  }, [datos]);

  const ordenes = usePaginacion(porOrden, ORDENES_POR_PAGINA);

  /* ==================================================================
     ESTADOS
     ================================================================== */

  const porEstado = useMemo(() => {
    let pendiente = 0;
    let aprobada = 0;
    let rechazada = 0;
    for (const j of datos) {
      if (j.status === "pendiente") pendiente += 1;
      else if (j.status === "aprobada") aprobada += 1;
      else rechazada += 1;
    }
    return [
      { estado: "pendiente" as const, label: "Pendiente", valor: pendiente, color: COLOR_PENDIENTE },
      { estado: "aprobada" as const, label: "Aprobada", valor: aprobada, color: COLOR_APROBADA },
      { estado: "rechazada" as const, label: "Rechazada", valor: rechazada, color: COLOR_RECHAZADA },
    ];
  }, [datos]);

  const estadoConDatos = useMemo(() => porEstado.filter((e) => e.valor > 0), [porEstado]);
  const totalEstados = datos.length;
  const soloAprobadas =
    totalEstados > 0 &&
    (porEstado.find((e) => e.estado === "aprobada")?.valor ?? 0) === totalEstados;

  const sinDatos = datos.length === 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* ============================= TIEMPO ============================= */}

      {/* 1. Horas por día ------------------------------------------- */}
      <ChartCard
        title="Horas trabajadas por día"
        hint="Cada barra es un día: en verde la jornada ordinaria y encima, en ámbar, las horas extra."
        page={dias.page}
        totalPages={dias.totalPages}
        onPageChange={dias.setPage}
      >
        {dias.visibles.length === 0 ? (
          <ChartEmpty>No hay jornadas en el período seleccionado.</ChartEmpty>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dias.visibles} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: 10, fill: "#6d6e71" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6d6e71" }}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                  width={44}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(21,24,27,0.04)" }}
                  formatter={(value, name) => [
                    formatearHoras(Number(value) * 60),
                    String(name),
                  ]}
                />
                <Bar
                  dataKey="ordinarias"
                  name="Ordinarias"
                  stackId="h"
                  fill={COLOR_ORDINARIAS}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="extras"
                  name="Horas extra"
                  stackId="h"
                  fill={COLOR_EXTRAS}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <Leyenda
              className="mt-2"
              items={[
                { color: COLOR_ORDINARIAS, label: "Ordinarias" },
                { color: COLOR_EXTRAS, label: "Horas extra" },
              ]}
            />
          </>
        )}
      </ChartCard>

      {/* 2. Composición de horas (dona) ------------------------------ */}
      <ChartCard
        title="Composición de horas"
        hint="De qué está hecho el total de horas del período: ordinarias, extra y los distintos recargos."
        info={[
          {
            label: "Ordinarias",
            desc: "Tiempo dentro de la jornada normal del día, en horario diurno.",
          },
          {
            label: "Extra diurna / Extra nocturna",
            desc: "Tiempo trabajado por fuera de la jornada ordinaria, de día o en franja nocturna (desde las 7:00 p. m.).",
          },
          {
            label: "Recargo nocturno",
            desc: "Horas dentro de la jornada ordinaria, pero en franja nocturna: no son horas extra, solo llevan un recargo por el horario.",
          },
          {
            label: "Dominical/festivo",
            desc: "Agrupa toda hora (ordinaria o extra) trabajada en domingo o festivo, sin importar si fue de día o de noche.",
          },
        ]}
      >
        {composicion.length === 0 ? (
          <ChartEmpty>No hay horas que componer en el período seleccionado.</ChartEmpty>
        ) : (
          <>
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={composicion}
                    dataKey="minutos"
                    nameKey="categoria"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={composicion.length > 1 ? 2 : 0}
                    strokeWidth={0}
                  >
                    {composicion.map((c) => (
                      <Cell key={c.categoria} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      `${formatearHoras(Number(value))} (${porcentaje(Number(value), totalComposicionMin)}%)`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-ink">
                  {formatearHoras(totalComposicionMin)}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-graphite">
                  Total
                </span>
              </div>
            </div>
            <Leyenda
              className="mt-2"
              items={composicion.map((c) => ({
                color: c.color,
                label: `${c.categoria} · ${porcentaje(c.minutos, totalComposicionMin)}% · ${formatearHoras(c.minutos)}`,
              }))}
            />
          </>
        )}
      </ChartCard>

      {/* 3. Tendencia semanal de horas extra --------------------------- */}
      <ChartCard
        title="Tendencia semanal de horas extra"
        hint="La persona que más horas extra acumuló cada semana (lunes a domingo). El tope legal es por persona, así que esta línea muestra qué tan cerca estuvo alguien de pasarse."
        info={[
          {
            label: "Semana",
            desc: "Cada punto es el mayor total de horas extra que acumuló una sola persona esa semana (de lunes a domingo), no la suma de todo el equipo.",
          },
          {
            label: "Tope legal",
            desc: `Línea roja punteada: el límite semanal de horas extra por persona (${limiteExtrasSemana} h). Si la línea de la gráfica lo supera, revisa el control semanal más abajo para ver quién fue y cuántas horas acumuló.`,
          },
        ]}
        className="lg:col-span-2"
      >
        {porSemana.length === 0 ? (
          <ChartEmpty>No hay jornadas en el período seleccionado.</ChartEmpty>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={porSemana} margin={{ left: 4, right: 48, top: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" vertical={false} />
              <XAxis
                dataKey="etiqueta"
                tick={{ fontSize: 10, fill: "#6d6e71" }}
                tickLine={false}
                axisLine={false}
                // A diferencia de las otras gráficas (pocas etiquetas cortas),
                // aquí puede haber hasta ~13 semanas con una etiqueta larga:
                // se deja que Recharts salte las que no quepan, en vez de
                // forzarlas todas y que se amontonen en pantallas angostas.
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6d6e71" }}
                tickLine={false}
                axisLine={false}
                unit="h"
                width={44}
                domain={[0, (max: number) => Math.max(max, limiteExtrasSemana) * 1.15]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "#eef0ee", strokeWidth: 1 }}
                formatter={(value) => [
                  formatearHoras(Number(value) * 60),
                  "Máximo de una persona esa semana",
                ]}
              />
              <ReferenceLine
                y={limiteExtrasSemana}
                stroke={COLOR_RIESGO}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{
                  value: "Tope legal",
                  position: "insideTopRight",
                  fill: COLOR_RIESGO,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="extras"
                name="Máximo de una persona esa semana"
                stroke={COLOR_EXTRAS}
                fill={COLOR_EXTRAS}
                fillOpacity={0.22}
                strokeWidth={2}
                dot={{ r: 3, fill: COLOR_EXTRAS, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ============================ PERSONAS ============================ */}

      {/* 4. Horas por empleado -------------------------------------- */}
      <ChartCard
        title="Horas por empleado"
        hint="Total de horas trabajadas por cada persona en el período, de mayor a menor."
        page={horas.page}
        totalPages={horas.totalPages}
        onPageChange={horas.setPage}
      >
        {horas.visibles.length === 0 ? (
          <ChartEmpty>Todavía no hay horas que mostrar aquí.</ChartEmpty>
        ) : (
          <ResponsiveContainer width="100%" height={altoBarras(horas.visibles.length)}>
            <BarChart
              data={horas.visibles}
              layout="vertical"
              barSize={14}
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#6d6e71" }}
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 11, fill: "#23272b" }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(21,24,27,0.04)" }}
                formatter={(value) => [
                  formatearHoras(Number(value) * 60),
                  "Horas trabajadas",
                ]}
              />
              <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
                {horas.visibles.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? BRAND : BRAND_LIGHT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* 5. Horas extra por empleado (solo si existen) --------------- */}
      {extrasEmpleado.length > 0 && (
        <ChartCard
          title="Horas extra por empleado"
          hint="Solo aparecen las personas que trabajaron por fuera de la jornada ordinaria."
          page={extras.page}
          totalPages={extras.totalPages}
          onPageChange={extras.setPage}
        >
          <ResponsiveContainer width="100%" height={altoBarras(extras.visibles.length)}>
            <BarChart
              data={extras.visibles}
              layout="vertical"
              barSize={14}
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#6d6e71" }}
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <YAxis
                type="category"
                dataKey="nombre"
                tick={{ fontSize: 11, fill: "#23272b" }}
                tickLine={false}
                axisLine={false}
                width={130}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(21,24,27,0.04)" }}
                formatter={(value) => [
                  formatearHoras(Number(value) * 60),
                  "Horas extra",
                ]}
              />
              <Bar dataKey="extras" fill={COLOR_EXTRAS} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 6. Gantt de turnos ----------------------------------------- */}
      <ChartCard
        title="Turnos del día (entrada → salida)"
        hint="Cada barra va de la hora en que la persona empezó a la hora en que terminó. Pasa el mouse por encima para ver el detalle."
        page={gantt.page}
        totalPages={gantt.totalPages}
        onPageChange={gantt.setPage}
      >
        {empleadosVisibles.length === 0 ? (
          <ChartEmpty>
            {sinDatos
              ? "No hay jornadas en el período seleccionado."
              : "No hay turnos con hora de entrada y salida en los días visibles."}
          </ChartEmpty>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filasGantt} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" vertical={false} />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: 10, fill: "#6d6e71" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  type="number"
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 10, fill: "#6d6e71" }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickFormatter={(h: number) =>
                    `${String(Math.floor(h) % 24).padStart(2, "0")}:00`
                  }
                />
                <Tooltip
                  content={<TurnoTooltip />}
                  cursor={{ fill: "rgba(21,24,27,0.04)" }}
                />
                {empleadosVisibles.map((emp, i) => (
                  <Bar
                    key={emp.id}
                    dataKey={`emp_${emp.id}`}
                    name={emp.nombre}
                    fill={COLORES_EMPLEADO[i % COLORES_EMPLEADO.length]}
                    radius={[3, 3, 3, 3]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setLeyendaAbierta((v) => !v)}
                aria-expanded={leyendaAbierta}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-dark transition-colors hover:text-brand"
              >
                <Users className="h-3.5 w-3.5" />
                {leyendaAbierta
                  ? "Ocultar leyenda"
                  : `Mostrar leyenda (${empleadosVisibles.length} ${
                      empleadosVisibles.length === 1 ? "empleado" : "empleados"
                    })`}
                {leyendaAbierta ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {leyendaAbierta && (
              <Leyenda
                className="mt-3 max-h-32 overflow-y-auto"
                items={empleadosVisibles.map((emp, i) => ({
                  color: COLORES_EMPLEADO[i % COLORES_EMPLEADO.length],
                  label: emp.nombre,
                }))}
              />
            )}
          </>
        )}
      </ChartCard>

      {/* ======================== ÓRDENES DE TRABAJO ======================= */}

      {/* 7. Horas por orden de trabajo -------------------------------- */}
      <ChartCard
        title="Horas por orden de trabajo"
        hint="Cuánto tiempo se fue en cada orden de trabajo: se muestran las 10 con más horas en el período."
        info={[
          {
            label: "Cómo se suma",
            desc: "Cada barra suma las horas de todas las personas que registraron turnos con esa orden de trabajo, ordinarias más extra.",
          },
          {
            label: "Sin orden asignada",
            desc: "Agrupa las jornadas que se registraron sin escribir un número de orden de trabajo.",
          },
          {
            label: "Detalle al pasar el mouse",
            desc: "El tooltip muestra el total, las horas ordinarias, las horas extra y cuántos empleados participaron en esa orden.",
          },
        ]}
        page={ordenes.page}
        totalPages={ordenes.totalPages}
        onPageChange={ordenes.setPage}
      >
        {porOrden.length === 0 ? (
          <ChartEmpty>No hay jornadas en el período seleccionado.</ChartEmpty>
        ) : (
          <ResponsiveContainer width="100%" height={altoBarras(ordenes.visibles.length)}>
            <BarChart
              data={ordenes.visibles}
              layout="vertical"
              barSize={14}
              margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#6d6e71" }}
                tickLine={false}
                axisLine={false}
                unit="h"
              />
              <YAxis
                type="category"
                dataKey="orden"
                tick={{ fontSize: 11, fill: "#23272b" }}
                tickLine={false}
                axisLine={false}
                width={130}
                // El corte es de 20 caracteres, justo lo que mide la etiqueta
                // "Sin orden de trabajo": recortada quedaba en "Sin orden de
                // tr…", que no dice nada. Los números de orden reales
                // ("OT-1042") son mucho más cortos, así que no les afecta; si
                // alguno se recorta, el tooltip muestra el nombre completo.
                tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
              />
              <Tooltip content={<OrdenTooltip />} cursor={{ fill: "rgba(21,24,27,0.04)" }} />
              <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
                {ordenes.visibles.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? BRAND : BRAND_LIGHT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ============================ ESTADOS ============================= */}

      {/* 8. Estado de las jornadas -------------------------------------- */}
      <ChartCard
        title="Estado de las jornadas"
        hint="Cuántas jornadas del período están pendientes, aprobadas o rechazadas."
        info={[
          {
            label: "Pendiente",
            desc: "Todavía nadie la ha revisado. Puede cambiar de horas si se corrige antes de aprobarla.",
          },
          {
            label: "Aprobada",
            desc: "Confirmada por un coordinador o administrador: es una cifra oficial.",
          },
          {
            label: "Rechazada",
            desc: "El empleado debe corregirla y volver a registrarla.",
          },
        ]}
      >
        {sinDatos ? (
          <ChartEmpty>No hay jornadas en el período seleccionado.</ChartEmpty>
        ) : soloAprobadas ? (
          <div className="rounded-2xl border border-dashed border-line bg-brand-tint/50 p-8 text-center">
            <p className="text-base font-bold text-ink">Todo revisado 🎉</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-graphite">
              Las {totalEstados} jornada{totalEstados === 1 ? "" : "s"} del período
              están aprobadas: no hay nada pendiente por revisar.
            </p>
          </div>
        ) : (
          <>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={estadoConDatos}
                    dataKey="valor"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={estadoConDatos.length > 1 ? 3 : 0}
                    strokeWidth={0}
                  >
                    {estadoConDatos.map((e) => (
                      <Cell key={e.estado} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      `${Number(value)} jornada${Number(value) === 1 ? "" : "s"}`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-ink">{totalEstados}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-graphite">
                  jornadas
                </span>
              </div>
            </div>
            <Leyenda
              className="mt-2"
              items={estadoConDatos.map((e) => ({
                color: e.color,
                label: `${e.label} · ${e.valor} (${porcentaje(e.valor, totalEstados)}%)`,
              }))}
            />
          </>
        )}
      </ChartCard>
    </div>
  );
}
