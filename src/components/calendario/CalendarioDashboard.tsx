"use client";

/**
 * TABLERO DE MÉTRICAS DEL CALENDARIO
 * ==================================
 * Vista «Métricas» de /admin/calendario. El servidor trae una ventana amplia de
 * eventos (un año hacia atrás y tres meses hacia delante) y aquí se filtra y se
 * agrega todo con `useMemo`: mover el rango de fechas es instantáneo y no
 * vuelve a golpear la base de datos. Es el mismo reparto de trabajo que el
 * tablero de jornadas, y reutiliza sus piezas (`dashboard-ui`), así que el
 * panel sigue teniendo un solo lenguaje visual.
 *
 * Pensado para gente NO técnica: cada bloque trae su botón «Ayuda» con lo que
 * significa cada número, en lenguaje llano.
 *
 * OJO con «Evolución mensual»: es la única gráfica que NO depende del filtro de
 * fechas: se lee entera, mes a mes, sobre toda la ventana. Con el rango por
 * defecto —el mes en curso— una gráfica de evolución tendría una sola barra y
 * no diría nada.
 */

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartCard,
  ChartEmpty,
  DateRange,
  Leyenda,
  StatCard,
  SectionHeader,
  tooltipStyle,
  usePaginacion,
} from "@/components/jornadas/dashboard-ui";
import { EmptyState } from "@/components/admin/ui-base";
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  FilterX,
  AlertTriangle,
  Users,
} from "@/lib/icons";
import {
  EVENTO_ESTADOS,
  EVENTO_ESTADO_COLOR,
  EVENTO_ESTADO_DESCRIPCIONES,
  EVENTO_ESTADO_LABELS,
  etiquetaResponsable,
  nombreCompletoResponsable,
  nombreMes,
  partesFecha,
  type EventoEstado,
  type EventoRecord,
} from "@/lib/calendario";

/** Cuántas filas se muestran de golpe en las gráficas de barras. */
const FILAS_BARRAS = 8;

const AYUDA_ESTADOS = EVENTO_ESTADOS.map((estado) => ({
  label: EVENTO_ESTADO_LABELS[estado],
  desc: EVENTO_ESTADO_DESCRIPCIONES[estado],
}));

function porcentaje(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

export function CalendarioDashboard({
  eventos,
  desdeInicial,
  hastaInicial,
}: {
  /** Ventana completa que trajo el servidor (más ancha que el filtro). */
  eventos: EventoRecord[];
  /** Rango por defecto: el mes en curso. */
  desdeInicial: string;
  hastaInicial: string;
}) {
  const [desde, setDesde] = useState(desdeInicial);
  const [hasta, setHasta] = useState(hastaInicial);

  const filtrados = useMemo(
    () =>
      eventos.filter(
        (e) => (!desde || e.fecha >= desde) && (!hasta || e.fecha <= hasta),
      ),
    [eventos, desde, hasta],
  );

  /* ---------------- KPIs ---------------- */
  const conteo = useMemo(() => {
    const base: Record<EventoEstado, number> = {
      programado: 0,
      cumplido: 0,
      incompleto: 0,
      aplazado: 0,
    };
    for (const e of filtrados) base[e.estado] += 1;
    return base;
  }, [filtrados]);

  const total = filtrados.length;
  const cerrados = conteo.cumplido + conteo.incompleto;
  const tasa = porcentaje(conteo.cumplido, cerrados);
  const totalNotas = useMemo(
    () => filtrados.reduce((suma, e) => suma + e.totalNotas, 0),
    [filtrados],
  );

  /* ---------------- Series ---------------- */
  const porEstado = useMemo(
    () =>
      EVENTO_ESTADOS.map((estado) => ({
        estado,
        etiqueta: EVENTO_ESTADO_LABELS[estado],
        cantidad: conteo[estado],
        color: EVENTO_ESTADO_COLOR[estado],
      })).filter((d) => d.cantidad > 0),
    [conteo],
  );

  /** Evolución mensual: toda la ventana, no el rango filtrado. */
  const evolucion = useMemo(() => {
    const meses = new Map<
      string,
      { clave: string; etiqueta: string } & Record<EventoEstado, number>
    >();
    for (const e of eventos) {
      const p = partesFecha(e.fecha);
      if (!p) continue;
      const clave = `${p.anio}-${String(p.mes).padStart(2, "0")}`;
      let fila = meses.get(clave);
      if (!fila) {
        fila = {
          clave,
          // "sep 26" — el nombre completo no cabe en el eje.
          etiqueta: `${nombreMes(p.anio, p.mes).slice(0, 3)} ${String(p.anio).slice(2)}`,
          programado: 0,
          cumplido: 0,
          incompleto: 0,
          aplazado: 0,
        };
        meses.set(clave, fila);
      }
      fila[e.estado] += 1;
    }
    return [...meses.values()].sort((a, b) => a.clave.localeCompare(b.clave));
  }, [eventos]);

  /** Carga por responsable, incluidos los externos. */
  const porResponsable = useMemo(() => {
    const mapa = new Map<
      string,
      {
        nombre: string;
        completo: string;
        total: number;
        cumplidos: number;
        externo: boolean;
      }
    >();
    for (const evento of filtrados) {
      for (const r of evento.responsables) {
        const clave = r.profileId ?? `externo:${r.nombre.toLowerCase()}`;
        const fila = mapa.get(clave) ?? {
          // En el eje manda el apodo si lo hay: los nombres completos no caben.
          nombre: r.externo
            ? `${r.nombre} (externo)`
            : etiquetaResponsable(r),
          completo: r.externo
            ? `${r.nombre} (externo)`
            : nombreCompletoResponsable(r),
          total: 0,
          cumplidos: 0,
          externo: r.externo,
        };
        fila.total += 1;
        if (evento.estado === "cumplido") fila.cumplidos += 1;
        mapa.set(clave, fila);
      }
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [filtrados]);

  /** Eventos con más conversación: los que más notas acumulan. */
  const porNotas = useMemo(
    () =>
      filtrados
        .filter((e) => e.totalNotas > 0)
        .map((e) => ({
          id: e.id,
          nombre: e.titulo.length > 34 ? `${e.titulo.slice(0, 33)}…` : e.titulo,
          notas: e.totalNotas,
          color: EVENTO_ESTADO_COLOR[e.estado],
        }))
        .sort((a, b) => b.notas - a.notas),
    [filtrados],
  );

  const responsables = usePaginacion(porResponsable, FILAS_BARRAS);
  const notas = usePaginacion(porNotas, FILAS_BARRAS);

  const altoBarras = (filas: number) => Math.max(160, filas * 30 + 40);

  const sinDatos = eventos.length === 0;

  return (
    <div className="space-y-6">
      {/* ---------------- Filtros ---------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-line bg-white p-4 shadow-soft">
        <DateRange
          label="Fechas de los eventos"
          from={desde}
          to={hasta}
          onChange={(f, h) => {
            setDesde(f);
            setHasta(h);
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-graphite">
            {total} evento(s) en el rango
          </span>
          <button
            type="button"
            onClick={() => {
              setDesde(desdeInicial);
              setHasta(hastaInicial);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <FilterX className="h-3.5 w-3.5" />
            Volver al mes en curso
          </button>
        </div>
      </div>

      {sinDatos ? (
        <EmptyState
          title="Todavía no hay eventos que medir"
          description="En cuanto programes actividades en el calendario, aquí verás cuántas se cumplen, cuántas se aplazan y cómo se reparte el trabajo en el equipo."
        />
      ) : (
        <>
          {/* ---------------- KPIs ---------------- */}
          <section>
            <SectionHeader
              title="Resumen del período"
              description="Cómo se está cumpliendo lo que se programó entre las fechas elegidas."
              info={[
                {
                  label: "Eventos del período",
                  desc: "Cuántas actividades tienen fecha dentro del rango elegido, sin importar su estado.",
                },
                {
                  label: "Tasa de cumplimiento",
                  desc: "De las actividades ya cerradas (cumplidas + incompletas), qué porcentaje salió completo. Las programadas y las aplazadas no cuentan: todavía no se sabe cómo van a terminar.",
                },
                ...AYUDA_ESTADOS,
                {
                  label: "Notas escritas",
                  desc: "Cuántas notas de seguimiento tienen entre todos los eventos del período. Muchas notas suelen indicar actividades que se complicaron.",
                },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<Calendar className="h-5 w-5 text-white" />}
                label="Eventos del período"
                value={String(total)}
                sub={`${conteo.programado} sin cerrar todavía`}
                color="bg-brand-dark"
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5 text-white" />}
                label="Cumplidos"
                value={String(conteo.cumplido)}
                sub={`${porcentaje(conteo.cumplido, total)}% de lo programado`}
                subTone="success"
                color="bg-brand"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5 text-white" />}
                label="Incompletos y aplazados"
                value={String(conteo.incompleto + conteo.aplazado)}
                sub={`${conteo.incompleto} incompleto(s) · ${conteo.aplazado} aplazado(s)`}
                subTone={
                  conteo.incompleto + conteo.aplazado > 0 ? "warning" : "muted"
                }
                color="bg-amber-500"
              />
              <StatCard
                icon={<ClipboardList className="h-5 w-5 text-white" />}
                label="Tasa de cumplimiento"
                value={cerrados === 0 ? "—" : `${tasa}%`}
                sub={
                  cerrados === 0
                    ? "Aún no hay eventos cerrados"
                    : `${conteo.cumplido} de ${cerrados} cerrados · ${totalNotas} nota(s)`
                }
                subTone={cerrados > 0 && tasa < 70 ? "warning" : "muted"}
                color="bg-ink"
              />
            </div>
          </section>

          {/* ---------------- Gráficas ---------------- */}
          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Eventos por estado"
              hint="Cómo se reparte lo programado en el rango de fechas elegido."
              info={AYUDA_ESTADOS}
            >
              {porEstado.length === 0 ? (
                <ChartEmpty>
                  No hay eventos en el rango de fechas elegido.
                </ChartEmpty>
              ) : (
                <>
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={porEstado}
                          dataKey="cantidad"
                          nameKey="etiqueta"
                          innerRadius={58}
                          outerRadius={86}
                          paddingAngle={porEstado.length > 1 ? 2 : 0}
                          strokeWidth={0}
                        >
                          {porEstado.map((d) => (
                            <Cell key={d.estado} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value, name) => [
                            `${value} evento(s) · ${porcentaje(Number(value), total)}%`,
                            String(name),
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold text-ink">
                        {total}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-graphite">
                        Eventos
                      </span>
                    </div>
                  </div>
                  <Leyenda
                    className="mt-3"
                    items={porEstado.map((d) => ({
                      color: d.color,
                      label: `${d.etiqueta} (${d.cantidad})`,
                    }))}
                  />
                </>
              )}
            </ChartCard>

            <ChartCard
              title="Evolución mensual"
              hint="Cuántos eventos hubo cada mes y cómo terminaron. Esta gráfica NO depende del filtro de fechas: muestra siempre el año completo alrededor de hoy."
              info={AYUDA_ESTADOS}
            >
              {evolucion.length === 0 ? (
                <ChartEmpty>Todavía no hay meses con eventos.</ChartEmpty>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={evolucion}
                      barSize={18}
                      margin={{ left: -18, right: 8, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#eef0ee"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="etiqueta"
                        tick={{ fontSize: 10, fill: "#6d6e71" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "#6d6e71" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "rgba(21,24,27,0.04)" }}
                      />
                      {EVENTO_ESTADOS.map((estado, i) => (
                        <Bar
                          key={estado}
                          dataKey={estado}
                          stackId="mes"
                          name={EVENTO_ESTADO_LABELS[estado]}
                          fill={EVENTO_ESTADO_COLOR[estado]}
                          radius={
                            i === EVENTO_ESTADOS.length - 1
                              ? [4, 4, 0, 0]
                              : undefined
                          }
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <Leyenda
                    className="mt-3"
                    items={EVENTO_ESTADOS.map((estado) => ({
                      color: EVENTO_ESTADO_COLOR[estado],
                      label: EVENTO_ESTADO_LABELS[estado],
                    }))}
                  />
                </>
              )}
            </ChartCard>

            <ChartCard
              title="Carga por responsable"
              hint="En cuántos eventos del período figura cada persona. Incluye a los responsables externos, marcados como tales."
              info={[
                {
                  label: "Eventos asignados",
                  desc: "Cuántas actividades del período tienen a esa persona como responsable. Un evento con tres responsables suma uno a cada uno.",
                },
                {
                  label: "Externo",
                  desc: "Persona sin cuenta en el portal, escrita a mano al programar el evento. Cuenta igual para repartir la carga.",
                },
              ]}
              page={responsables.page}
              totalPages={responsables.totalPages}
              onPageChange={responsables.setPage}
            >
              {responsables.visibles.length === 0 ? (
                <ChartEmpty>
                  Los eventos del período no tienen responsables asignados.
                </ChartEmpty>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={altoBarras(responsables.visibles.length)}
                >
                  <BarChart
                    data={responsables.visibles}
                    layout="vertical"
                    barSize={14}
                    margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0ee"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#6d6e71" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tick={{ fontSize: 11, fill: "#23272b" }}
                      tickLine={false}
                      axisLine={false}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "rgba(21,24,27,0.04)" }}
                      formatter={(value, _name, item) => [
                        `${value} evento(s) · ${item?.payload?.cumplidos ?? 0} cumplido(s)`,
                        String(item?.payload?.completo ?? "Asignados"),
                      ]}
                    />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {responsables.visibles.map((r, i) => (
                        <Cell
                          key={`${r.nombre}-${i}`}
                          fill={r.externo ? "#6d6e71" : "#3dae2b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard
              title="Eventos con más notas"
              hint="Las actividades sobre las que más se ha escrito. Suelen ser las que se complicaron o las que se movieron de fecha."
              info={[
                {
                  label: "Nota",
                  desc: "Un comentario de seguimiento escrito por un manager o por un responsable del evento. Se leen completas en la pestaña «Notas».",
                },
                {
                  label: "Color de la barra",
                  desc: "El estado en el que está ese evento, con los mismos colores del calendario.",
                },
              ]}
              page={notas.page}
              totalPages={notas.totalPages}
              onPageChange={notas.setPage}
            >
              {notas.visibles.length === 0 ? (
                <ChartEmpty>
                  Ningún evento del período tiene notas todavía.
                </ChartEmpty>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={altoBarras(notas.visibles.length)}
                >
                  <BarChart
                    data={notas.visibles}
                    layout="vertical"
                    barSize={14}
                    margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#eef0ee"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "#6d6e71" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      tick={{ fontSize: 11, fill: "#23272b" }}
                      tickLine={false}
                      axisLine={false}
                      width={170}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "rgba(21,24,27,0.04)" }}
                      formatter={(value) => [`${value} nota(s)`, "Notas"]}
                    />
                    <Bar dataKey="notas" radius={[0, 4, 4, 0]}>
                      {notas.visibles.map((n) => (
                        <Cell key={n.id} fill={n.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          {/* ---------------- Quién responde por qué ---------------- */}
          {porResponsable.length > 0 && (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <Users className="h-4 w-4 text-brand-dark" />
                Cumplimiento por responsable
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-graphite">
                De los eventos en los que figura cada persona, cuántos terminaron
                cumplidos.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-graphite">
                      <th scope="col" className="py-2 pr-3 font-bold">
                        Responsable
                      </th>
                      <th scope="col" className="py-2 pr-3 font-bold">
                        Asignados
                      </th>
                      <th scope="col" className="py-2 pr-3 font-bold">
                        Cumplidos
                      </th>
                      <th scope="col" className="py-2 font-bold">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {porResponsable.map((r) => (
                      <tr key={r.nombre} className="border-b border-line/70">
                        <td
                          className="py-2 pr-3 font-semibold text-ink-soft"
                          title={r.completo}
                        >
                          {r.completo}
                        </td>
                        <td className="py-2 pr-3 text-graphite">{r.total}</td>
                        <td className="py-2 pr-3 text-graphite">{r.cumplidos}</td>
                        <td className="py-2 font-semibold text-brand-deep">
                          {porcentaje(r.cumplidos, r.total)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
