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
 * no diría nada. Eso va DICHO EN LA TARJETA (una etiqueta visible junto al
 * título), no solo en la ayuda: un número que no obedece al filtro y no lo
 * avisa se lee mal.
 *
 * EN QUÉ PERÍODO CUENTA CADA EVENTO (regla, 18 sep 2026)
 * ------------------------------------------------------
 * Siempre en el de la fecha que el evento tiene AHORA (`fecha`), nunca en la
 * que tenía antes de moverse (`fechaOriginal`). Un evento del 30 de septiembre
 * que se aplaza al 5 de octubre sale de septiembre y entra en octubre: el
 * tablero responde «qué hay en estos días», no «qué se planeó en su momento».
 * Para que eso no se lea como una pérdida, bajo los KPI se avisa cuántas
 * actividades **salieron del período al aplazarse** (las que tenían su
 * `fechaOriginal` dentro del rango y su `fecha` fuera).
 *
 * INVARIANTE (ver `src/lib/calendario.ts`): un evento abierto que ya se movió
 * es `aplazado`, nunca `programado`. Estos conteos van por `estado`, así que si
 * ese invariante se rompiera, el tablero volvería a contradecir a la pantalla.
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
import {
  EmptyState,
  Paginacion,
  usePaginaLocal,
} from "@/components/admin/ui-base";
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  FilterX,
  AlertTriangle,
  Info,
  Shuffle,
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
  const abiertos = conteo.programado + conteo.aplazado;
  const tasa = porcentaje(conteo.cumplido, cerrados);
  const totalNotas = useMemo(
    () => filtrados.reduce((suma, e) => suma + e.totalNotas, 0),
    [filtrados],
  );

  /**
   * Actividades que ESTABAN en el período y se fueron de él al aplazarse: su
   * fecha original cae dentro del rango, pero la fecha que tienen ahora no.
   * No se suman a ningún KPI —cuentan en el período al que se movieron—, pero
   * se avisan para que nadie lea el mes como «desapareció trabajo».
   */
  const salieronDelPeriodo = useMemo(() => {
    const dentro = (fecha: string) =>
      (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
    return eventos.filter(
      (e) =>
        e.fechaOriginal !== null &&
        dentro(e.fechaOriginal) &&
        !dentro(e.fecha),
    ).length;
  }, [eventos, desde, hasta]);

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
        /** Identidad estable de la fila (id de la cuenta o nombre externo). */
        clave: string;
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
          clave,
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
  // La TABLA de cumplimiento (no la gráfica) va de 10 en 10, como toda tabla
  // del panel; cambiar el rango de fechas vuelve a la primera página.
  const tablaResponsables = usePaginaLocal(porResponsable, `${desde}|${hasta}`);
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
                  desc: "Cuántas actividades tienen fecha dentro del rango elegido, sin importar su estado. Un evento cuenta en el período de la fecha que tiene AHORA: si se aplazó de septiembre a octubre, cuenta en octubre.",
                },
                {
                  label: "Tasa de cumplimiento",
                  desc: "Cumplidos ÷ (cumplidos + incompletos), es decir: de las actividades que YA SE CERRARON, qué porcentaje salió completo. Las programadas y las aplazadas quedan fuera del cálculo —arriba y abajo de la división—: todavía no se sabe cómo van a terminar. Sin eventos cerrados, la tasa sale «—», nunca 0 %.",
                },
                ...AYUDA_ESTADOS,
                {
                  label: "Notas escritas",
                  desc: "Cuántas notas de seguimiento tienen entre todos los eventos del período, sin importar el día en que se escribieron. Muchas notas suelen indicar actividades que se complicaron.",
                },
                {
                  label: "Salieron del período",
                  desc: "Actividades que estaban programadas dentro de estas fechas y se aplazaron a un día fuera de ellas. No suman en ningún número de arriba: cuentan en el período al que se movieron. Se avisan para que el mes no se lea como si el trabajo hubiera desaparecido.",
                },
              ]}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                icon={<Calendar className="h-5 w-5 text-white" />}
                label="Eventos del período"
                value={String(total)}
                sub={`${cerrados} cerrado(s) · ${abiertos} sin cerrar · ${totalNotas} nota(s)`}
                color="bg-brand-dark"
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5 text-white" />}
                label="Cumplidos"
                value={String(conteo.cumplido)}
                sub={`${porcentaje(conteo.cumplido, total)}% del total del período`}
                subTone="success"
                color="bg-brand"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5 text-white" />}
                label="Incompletos"
                value={String(conteo.incompleto)}
                sub={`${porcentaje(conteo.incompleto, total)}% del total · no salieron o quedaron a medias`}
                subTone={conteo.incompleto > 0 ? "warning" : "muted"}
                color="bg-red-600"
              />
              <StatCard
                icon={<Shuffle className="h-5 w-5 text-white" />}
                label="Aplazados"
                value={String(conteo.aplazado)}
                sub={`${porcentaje(conteo.aplazado, total)}% del total · movidos de fecha y todavía abiertos`}
                subTone={conteo.aplazado > 0 ? "warning" : "muted"}
                color="bg-amber-500"
              />
              <StatCard
                icon={<Clock className="h-5 w-5 text-white" />}
                label="Programados"
                value={String(conteo.programado)}
                sub={`${porcentaje(conteo.programado, total)}% del total · pendientes en su fecha original`}
                color="bg-graphite"
              />
              <StatCard
                icon={<ClipboardList className="h-5 w-5 text-white" />}
                label="Tasa de cumplimiento"
                value={cerrados === 0 ? "—" : `${tasa}%`}
                sub={
                  cerrados === 0
                    ? "Aún no hay eventos cerrados en el período"
                    : `${conteo.cumplido} de ${cerrados} ya cerrados (cumplidos + incompletos)`
                }
                subTone={cerrados > 0 && tasa < 70 ? "warning" : "muted"}
                color="bg-ink"
              />
            </div>

            {/* Regla del período, dicha donde se necesita: un evento cuenta en
                el mes de la fecha que tiene AHORA. */}
            {salieronDelPeriodo > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Además, <strong>{salieronDelPeriodo}</strong> actividad(es)
                  que estaban programadas dentro de estas fechas{" "}
                  <strong>se aplazaron a un día fuera del rango</strong>, así que
                  no suman en los números de arriba: cuentan en el período al que
                  se movieron. Un evento siempre cuenta en el período de la fecha
                  que tiene <strong>ahora</strong>.
                </span>
              </p>
            )}
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
              hint="Cuántos eventos hubo cada mes y cómo terminaron, para ver la tendencia."
              info={[
                {
                  label: "No usa el filtro de fechas",
                  desc: "Es la ÚNICA gráfica del tablero que ignora el rango de arriba: siempre muestra el año completo alrededor de hoy (12 meses atrás y 4 adelante). Con el rango por defecto —el mes en curso— una gráfica de evolución tendría una sola barra y no diría nada.",
                },
                ...AYUDA_ESTADOS,
              ]}
            >
              {/* Aviso VISIBLE, no escondido en la ayuda: un número que no
                  obedece al filtro que tiene encima se lee mal. */}
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">
                <Info className="h-3.5 w-3.5" />
                No usa el filtro de fechas: siempre el año completo
              </p>
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
                      {responsables.visibles.map((r) => (
                        <Cell
                          key={r.clave}
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
                De los eventos del período en los que figura cada persona,
                cuántos terminaron cumplidos. El porcentaje es{" "}
                <strong>cumplidos ÷ asignados</strong>: el denominador son{" "}
                <em>todos</em> sus eventos del rango, incluidos los que siguen
                abiertos, así que no es la misma cuenta que la «tasa de
                cumplimiento» de arriba.
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
                    {tablaResponsables.visibles.map((r) => (
                      <tr key={r.clave} className="border-b border-line/70">
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
              <Paginacion
                pagina={tablaResponsables.pagina}
                total={tablaResponsables.total}
                onCambiar={tablaResponsables.setPagina}
                etiqueta="Páginas del cumplimiento por responsable"
                className="mt-3 border-t border-line pt-3"
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
