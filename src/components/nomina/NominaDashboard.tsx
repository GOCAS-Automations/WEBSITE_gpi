"use client";

/**
 * TABLERO DE NÓMINA — /admin/nomina?vista=tablero
 * ===============================================
 * Qué se ha pagado y cómo se reparte: KPIs, tres gráficas y el historial por
 * empleado con enlace a cada volante.
 *
 * Reutiliza el sistema de piezas del tablero de jornadas
 * (`@/components/jornadas/dashboard-ui`) para que las dos pantallas se lean
 * igual: mismos colores, mismas tarjetas, mismo `InfoTooltip` de ayuda para
 * quien no es técnico.
 */

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BRAND,
  BRAND_DARK,
  COLOR_DOMINICAL,
  COLOR_EXTRAS,
  COLOR_ORDINARIAS,
  COLOR_RIESGO,
  ChartCard,
  ChartEmpty,
  FilterSelect,
  SectionHeader,
  StatCard,
  tooltipStyle,
} from "@/components/jornadas/dashboard-ui";
import {
  Badge,
  Card,
  EmptyState,
  Paginacion,
  usePaginaLocal,
} from "@/components/admin/ui-base";
import {
  NOMINA_ESTADO_CLASSES,
  NOMINA_ESTADO_LABELS,
  etiquetaPeriodoCorta,
  nombreMesNomina,
  type NominaEstado,
  type TipoPeriodo,
} from "@/lib/nomina";
import { formatearMiles, formatearPesos } from "@/lib/dinero";
import { NOMINA_FILTRO_ESTADOS } from "@/lib/admin-types";
import { Download, Users, Clock, Check, BarChart as BarIcon } from "@/lib/icons";

/** Una liquidación, ya resuelta en el servidor, lista para el tablero. */
export interface FilaHistorial {
  id: string;
  employeeId: string;
  nombre: string;
  tipo: TipoPeriodo;
  anio: number;
  mes: number;
  quincena: 1 | 2 | null;
  estado: NominaEstado;
  fechaPago: string | null;
  congelada: boolean;

  basico: number;
  auxTransporte: number;
  horas: number;
  otrosDevengados: number;
  devengado: number;
  descuentos: number;
  neto: number;
}

const AYUDA_KPIS = [
  {
    label: "Neto pagado",
    desc: "La suma de lo que se le giró a la gente en las liquidaciones cerradas y pagadas del filtro. Los borradores no entran: todavía pueden cambiar.",
  },
  {
    label: "Total devengado",
    desc: "Todo lo que se causó antes de descuentos: sueldo, auxilio de transporte, horas y recargos, bonos y demás.",
  },
  {
    label: "Horas y recargos",
    desc: "La parte del devengado que viene de las jornadas: recargos nocturnos, horas extra y trabajo en domingo o festivo.",
  },
  {
    label: "Liquidaciones",
    desc: "Cuántas liquidaciones hay en el filtro y cuántas siguen en borrador, es decir, sin cerrar.",
  },
];

const AYUDA_CONCEPTOS = [
  {
    label: "Sueldo",
    desc: "El salario del período, proporcional a los días liquidados.",
  },
  {
    label: "Auxilio de transporte",
    desc: "Proporcional a los mismos días. No entra en la base de salud y pensión.",
  },
  {
    label: "Horas y recargos",
    desc: "Lo que sale de las jornadas aprobadas: nocturnas, extras y festivos.",
  },
  {
    label: "Bonos y otros",
    desc: "Bonificaciones, auxilios, comisiones, prima, vacaciones y demás conceptos que se digitan a mano.",
  },
  {
    label: "Descuentos",
    desc: "Salud, pensión, préstamos y otros descuentos. Se restan del devengado para llegar al neto.",
  },
];

/** Clave de ordenación cronológica: 2026-09-Q2 → 2026092. */
function orden(f: FilaHistorial): number {
  return f.anio * 10000 + f.mes * 100 + (f.quincena ?? 3);
}

export function NominaDashboard({
  filas,
  empleados,
  empleadoInicial,
  anioInicial,
  estadoInicial,
  tipoInicial,
  hoy,
}: {
  filas: FilaHistorial[];
  empleados: { id: string; nombre: string }[];
  empleadoInicial: string;
  anioInicial: string;
  estadoInicial: string;
  tipoInicial: string;
  hoy: string;
}) {
  const [empleado, setEmpleado] = useState(empleadoInicial);
  const [anio, setAnio] = useState(anioInicial);
  const [estado, setEstado] = useState(
    NOMINA_FILTRO_ESTADOS.some((e) => e.value === estadoInicial)
      ? estadoInicial
      : "todas",
  );
  const [tipo, setTipo] = useState(
    tipoInicial === "mes" || tipoInicial === "quincena" ? tipoInicial : "todos",
  );

  const anios = useMemo(
    () => [...new Set(filas.map((f) => f.anio))].sort((a, b) => b - a),
    [filas],
  );

  const filtradas = useMemo(
    () =>
      filas
        .filter((f) => (empleado ? f.employeeId === empleado : true))
        .filter((f) => (anio ? f.anio === Number(anio) : true))
        .filter((f) => (estado === "todas" ? true : f.estado === estado))
        .filter((f) => (tipo === "todos" ? true : f.tipo === tipo))
        .sort((a, b) => orden(b) - orden(a)),
    [filas, empleado, anio, estado, tipo],
  );

  // El HISTORIAL (la tabla) va de 10 en 10, como toda tabla del panel; cualquier
  // cambio de filtro vuelve a la primera página. KPIs y gráficas usan el
  // conjunto filtrado completo.
  const historial = usePaginaLocal(
    filtradas,
    `${empleado}|${anio}|${estado}|${tipo}`,
  );

  /* ---- KPIs ---- */
  const kpis = useMemo(() => {
    const pagadas = filtradas.filter(
      (f) => f.estado === "cerrada" || f.estado === "pagada",
    );
    return {
      neto: pagadas.reduce((s, f) => s + f.neto, 0),
      devengado: filtradas.reduce((s, f) => s + f.devengado, 0),
      horas: filtradas.reduce((s, f) => s + f.horas, 0),
      total: filtradas.length,
      borradores: filtradas.filter((f) => f.estado === "borrador").length,
      personas: new Set(filtradas.map((f) => f.employeeId)).size,
    };
  }, [filtradas]);

  /* ---- Serie por período (últimos 12) ---- */
  const porPeriodo = useMemo(() => {
    const mapa = new Map<
      string,
      { clave: string; etiqueta: string; orden: number; neto: number; devengado: number }
    >();
    for (const f of filtradas) {
      const clave = `${f.anio}-${f.mes}-${f.quincena ?? "m"}`;
      const actual = mapa.get(clave) ?? {
        clave,
        etiqueta:
          f.tipo === "mes"
            ? `${nombreMesNomina(f.mes).slice(0, 3)} ${String(f.anio).slice(2)}`
            : `${nombreMesNomina(f.mes).slice(0, 3)} ${String(f.anio).slice(2)} · Q${f.quincena}`,
        orden: orden(f),
        neto: 0,
        devengado: 0,
      };
      actual.neto += f.neto;
      actual.devengado += f.devengado;
      mapa.set(clave, actual);
    }
    return [...mapa.values()].sort((a, b) => a.orden - b.orden).slice(-12);
  }, [filtradas]);

  /* ---- Reparto por concepto ---- */
  const porConcepto = useMemo(() => {
    const suma = (fn: (f: FilaHistorial) => number) =>
      filtradas.reduce((s, f) => s + fn(f), 0);
    return [
      { name: "Sueldo", value: suma((f) => f.basico), color: COLOR_ORDINARIAS },
      {
        name: "Auxilio de transporte",
        value: suma((f) => f.auxTransporte),
        color: BRAND_DARK,
      },
      { name: "Horas y recargos", value: suma((f) => f.horas), color: COLOR_EXTRAS },
      {
        name: "Bonos y otros",
        value: suma((f) => f.otrosDevengados),
        color: COLOR_DOMINICAL,
      },
      { name: "Descuentos", value: suma((f) => f.descuentos), color: COLOR_RIESGO },
    ].filter((c) => c.value > 0);
  }, [filtradas]);

  /* ---- Reparto por persona ---- */
  const porPersona = useMemo(() => {
    const mapa = new Map<string, { nombre: string; neto: number; horas: number }>();
    for (const f of filtradas) {
      const actual = mapa.get(f.employeeId) ?? {
        nombre: f.nombre || "Sin nombre",
        neto: 0,
        horas: 0,
      };
      actual.neto += f.neto;
      actual.horas += f.horas;
      mapa.set(f.employeeId, actual);
    }
    return [...mapa.values()].sort((a, b) => b.neto - a.neto).slice(0, 12);
  }, [filtradas]);

  if (filas.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay liquidaciones"
        description="Cuando crees y cierres la primera liquidación en la pestaña «Liquidación», aquí verás los totales por mes, el reparto por concepto y el historial de cada persona."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* ---------------- Filtros ---------------- */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <FilterSelect
            label="Persona"
            value={empleado}
            onChange={setEmpleado}
            options={[
              { value: "", label: "Todo el equipo" },
              ...empleados.map((e) => ({ value: e.id, label: e.nombre })),
            ]}
          />
          <FilterSelect
            label="Año"
            value={anio}
            onChange={setAnio}
            options={[
              { value: "", label: "Todos" },
              ...anios.map((a) => ({ value: String(a), label: String(a) })),
            ]}
          />
          <FilterSelect
            label="Tipo de período"
            value={tipo}
            onChange={setTipo}
            options={[
              { value: "todos", label: "Todos" },
              { value: "quincena", label: "Quincenas" },
              { value: "mes", label: "Meses completos" },
            ]}
          />
          <FilterSelect
            label="Estado"
            value={estado}
            onChange={setEstado}
            options={NOMINA_FILTRO_ESTADOS.map((e) => ({
              value: e.value,
              label: e.label,
            }))}
          />
        </div>
      </Card>

      {/* ---------------- KPIs ---------------- */}
      <section>
        <SectionHeader
          title="Resumen"
          description={`${filtradas.length} ${filtradas.length === 1 ? "liquidación" : "liquidaciones"} de ${kpis.personas} persona${kpis.personas === 1 ? "" : "s"} en el filtro actual. Datos al ${hoy.split("-").reverse().join("/")}.`}
          info={AYUDA_KPIS}
        />
        {/* Dos columnas y no cuatro: un importe con miles («$ 2.903.384») no
            se parte y, a cuatro columnas, se montaba sobre el icono. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={<Check className="h-5 w-5 text-white" />}
            label="Neto pagado"
            value={formatearPesos(kpis.neto)}
            sub="Solo liquidaciones cerradas o pagadas"
            color="bg-brand"
          />
          <StatCard
            icon={<BarIcon className="h-5 w-5 text-white" />}
            label="Total devengado"
            value={formatearPesos(kpis.devengado)}
            sub="Antes de descuentos"
            color="bg-ink"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-white" />}
            label="Horas y recargos"
            value={formatearPesos(kpis.horas)}
            sub="Lo que viene de las jornadas aprobadas"
            color="bg-amber-500"
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-white" />}
            label="Liquidaciones"
            value={String(kpis.total)}
            sub={
              kpis.borradores > 0
                ? `${kpis.borradores} sin cerrar`
                : "Todas cerradas"
            }
            subTone={kpis.borradores > 0 ? "warning" : "success"}
            color="bg-brand-deep"
          />
        </div>
      </section>

      {/* ---------------- Gráficas ---------------- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Nómina por período"
          hint="Lo devengado y el neto de cada quincena o mes, de los últimos doce períodos del filtro."
          className="lg:col-span-2"
        >
          {porPeriodo.length === 0 ? (
            <ChartEmpty>
              No hay liquidaciones con los filtros elegidos. Prueba a quitar
              alguno.
            </ChartEmpty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={porPeriodo} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatearMiles(v)}
                  width={80}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatearPesos(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="devengado"
                  name="Devengado"
                  stroke={COLOR_EXTRAS}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="neto"
                  name="Neto"
                  stroke={BRAND}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Reparto por concepto"
          hint="En qué se va la nómina del filtro: sueldo, auxilio, horas, bonos y descuentos."
          info={AYUDA_CONCEPTOS}
        >
          {porConcepto.length === 0 ? (
            <ChartEmpty>Todavía no hay valores que repartir.</ChartEmpty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={porConcepto}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {porConcepto.map((c) => (
                    <Cell key={c.name} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatearPesos(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Neto por persona"
          hint="Cuánto ha recibido cada quien en el período filtrado. Se muestran las doce primeras."
        >
          {porPersona.length === 0 ? (
            <ChartEmpty>No hay personas con liquidaciones en el filtro.</ChartEmpty>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={porPersona}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatearMiles(v)}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={140}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatearPesos(Number(value))}
                />
                <Bar dataKey="neto" name="Neto" fill={BRAND} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* ---------------- Historial ---------------- */}
      <section id="historial-nomina" className="scroll-mt-28">
        <SectionHeader
          title="Historial"
          description="Todas las liquidaciones del filtro, de la más reciente a la más antigua, con su volante."
        />
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-mist/60 text-left text-xs uppercase tracking-wide text-graphite">
                <th scope="col" className="py-3 pl-5 pr-3 font-semibold">
                  Persona
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Período
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Devengado
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Descuentos
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">
                  Neto
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Pagado el
                </th>
                <th scope="col" className="py-3 pl-3 pr-5 text-right font-semibold">
                  Volante
                </th>
              </tr>
            </thead>
            <tbody>
              {historial.visibles.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-line/70 last:border-0 hover:bg-mist/40"
                >
                  <td className="py-3 pl-5 pr-3 font-semibold text-ink">
                    {f.nombre || "—"}
                  </td>
                  <td className="px-3 py-3 capitalize text-graphite">
                    {etiquetaPeriodoCorta(f.tipo, f.anio, f.mes, f.quincena)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-graphite">
                    {formatearMiles(f.devengado)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-graphite">
                    {formatearMiles(f.descuentos)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-ink">
                    {formatearMiles(f.neto)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={NOMINA_ESTADO_CLASSES[f.estado]}>
                      {NOMINA_ESTADO_LABELS[f.estado]}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-graphite">
                    {f.fechaPago ? f.fechaPago.split("-").reverse().join("/") : "—"}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    <a
                      href={`/admin/nomina/volante/${f.id}/pdf`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Paginacion
          pagina={historial.pagina}
          total={historial.total}
          onCambiar={historial.setPagina}
          ancla="historial-nomina"
          etiqueta="Páginas del historial de nómina"
        />

        {filtradas.some((f) => !f.congelada) && (
          <p className="mt-3 text-xs leading-relaxed text-graphite">
            Las liquidaciones en <strong>borrador</strong> se muestran con lo que
            hay digitado hasta ahora; sus horas solo quedan fijas al cerrarlas.
            Para ver el desglose actualizado de un borrador, ábrelo en la pestaña{" "}
            <strong>Liquidación</strong>.
          </p>
        )}
      </section>
    </div>
  );
}
