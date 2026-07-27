"use client";

/**
 * GRÁFICAS DEL TABLERO DE JORNADAS
 * ================================
 * Cuatro lecturas del mismo conjunto de jornadas ya filtrado:
 *   1. Horas por día (ordinarias + extra apiladas).
 *   2. Horas por empleado.
 *   3. Horas extra por empleado (se oculta si nadie tiene extras).
 *   4. Turnos: una barra por turno, de la hora de entrada a la de salida.
 *
 * Todas las series se paginan para que la tarjeta se lea bien aunque el rango
 * abarque meses o el equipo sea grande.
 */

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND,
  BRAND_LIGHT,
  COLORES_EMPLEADO,
  COLOR_EXTRAS,
  COLOR_ORDINARIAS,
  ChartCard,
  ChartEmpty,
  Leyenda,
  tooltipStyle,
  usePaginacion,
} from "./dashboard-ui";
import { etiquetaDia, type JornadaMetrica } from "@/lib/jornada-metrics";
import { formatearHoras } from "@/lib/jornada";
import { ChevronDown, ChevronUp, Users } from "@/lib/icons";

const DIAS_POR_PAGINA = 7;
const EMPLEADOS_POR_PAGINA = 8;
const DIAS_GANTT_POR_PAGINA = 3;

/** Minutos → horas decimales con un decimal (lo que consumen las barras). */
function aHoras(minutos: number): number {
  return Math.round((minutos / 60) * 10) / 10;
}

/** Altura proporcional al número de barras horizontales. */
function altoBarras(n: number): number {
  return Math.max(200, n * 40);
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

export function JornadasCharts({ datos }: { datos: JornadaMetrica[] }) {
  const [leyendaAbierta, setLeyendaAbierta] = useState(false);

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

  /* ---- 2 y 3. Por empleado --------------------------------------- */
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

  /* ---- 4. Gantt de turnos ---------------------------------------- */
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

  const sinDatos = datos.length === 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
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

      {/* 2. Horas por empleado -------------------------------------- */}
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

      {/* 3. Horas extra por empleado (solo si existen) --------------- */}
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

      {/* 4. Gantt de turnos ----------------------------------------- */}
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
    </div>
  );
}
