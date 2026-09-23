"use client";

/**
 * PANEL DE LIQUIDACIÓN — /admin/nomina
 * ====================================
 * La tabla del período con todas las personas y, al abrir una, su desglose
 * completo en una ventana (`ModalPanel`, la misma pieza del calendario).
 *
 * Todo el cálculo llega YA HECHO desde el servidor (`liquidacion.tsx`): aquí no
 * se suma ni se multiplica nada, solo se pinta y se mandan las acciones. Así la
 * cifra que ve el manager es exactamente la que se va a congelar al cerrar.
 *
 * Las piezas de interfaz se importan de `@/components/admin/ui-base`, NUNCA de
 * `ui.tsx`: este es un Client Component y arrastrar `ui.tsx` al navegador deja
 * colgadas las server actions en producción (ver la nota larga de `ui-base`).
 *
 * FILTRO POR PERSONA (`?persona=`, 18 sep 2026)
 * ---------------------------------------------
 * El servidor ya manda solo las filas de la persona elegida, así que todo lo
 * que hay en pantalla trabaja con lo que se ve:
 *   · los totales y los avisos son los de esa persona;
 *   · «Liquidar todos» pasa a «Liquidar a <nombre>» y la acción recibe
 *     `persona`: NUNCA crea liquidaciones de quien no está en pantalla;
 *   · el CSV exporta solo esa fila, y el archivo lleva el usuario en el nombre
 *     (`nomina_GPI_2026-09-Q2_oprueba.csv`) y el botón lo dice.
 * El filtro viaja en la URL: sobrevive a recargar y a cambiar de período.
 *
 * SIN CONFIGURACIÓN (22 sep 2026)
 * -------------------------------
 * Una fila sin configuración vigente —nunca configurada, herencia suspendida
 * o un borrador HUÉRFANO— no tiene cifras que valgan: la tabla pinta «—»
 * (`cifrasValidas`), no entra en los totales y el CSV la deja en blanco. Nunca
 * cifras viejas ni ceros. El borrador huérfano se marca como tal, con su aviso
 * y la opción de eliminarlo. Una liquidación CERRADA sí enseña sus cifras
 * aunque el mes ya no tenga configuración: su snapshot manda.
 *
 * DINERO: todo importe se pinta con `src/lib/dinero.ts` (punto de miles, coma
 * decimal) y los conceptos manuales se escriben con `CampoDinero`. El CSV es la
 * excepción a propósito: números sin miles para que Excel los sume.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ModalPanel } from "@/components/calendario/ModalPanel";
import {
  AyudaSeccion,
  Badge,
  Card,
  EmptyState,
  inputClass,
  Paginacion,
  useAccionPanel,
} from "@/components/admin/ui-base";
import { paginar } from "@/lib/paginacion";
import {
  AYUDA_NOMINA,
  AYUDA_NOMINA_CERRAR,
  AYUDA_NOMINA_PENDIENTES,
  AYUDA_NOMINA_PERIODO,
  AYUDA_NOMINA_VOLANTE,
} from "@/components/admin/ayudas";
import { idleState, type ActionState, type FilaNomina } from "@/lib/admin-types";
import {
  CONCEPTOS_MANUALES_DESCUENTOS,
  CONCEPTOS_MANUALES_DEVENGADOS,
  NOMINA_ESTADO_CLASSES,
  NOMINA_ESTADO_DESCRIPCIONES,
  NOMINA_ESTADO_LABELS,
  clavePeriodo,
  decimalCSV,
  formatearHorasNomina,
  horasDeMinutos,
  nombreMesNomina,
  periodoDeHoy,
  type ResumenFaltasNomina,
  type TipoPeriodo,
} from "@/lib/nomina";
import { fechaCorta, textoFaltas } from "@/lib/permisos";
import {
  formatearDinero,
  formatearMiles,
  formatearNumero,
  formatearPesos,
  formatearPorcentaje,
} from "@/lib/dinero";
import { CampoDinero } from "@/components/admin/CampoDinero";
import { Check, Download, Info, Pencil, Plus, Trash } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

const MESES_OPCIONES = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: nombreMesNomina(i + 1),
}));

/**
 * ¿Las cifras de la fila valen? Sí si la liquidación está congelada (su
 * snapshot manda aunque hoy el mes ya no tenga configuración) o si hay
 * configuración vigente para calcularla en vivo. Si no —nadie configurado, o
 * un borrador HUÉRFANO—, la pantalla pinta «—», nunca cifras viejas ni ceros,
 * y la fila no entra en los totales.
 */
function cifrasValidas(f: FilaNomina): boolean {
  return f.congelada || f.tieneConfig;
}

/** «octubre de 2026». */
const mesTexto = (m: { anio: number; mes: number }) =>
  `${nombreMesNomina(m.mes)} de ${m.anio}`;

/* ================================================================== */
/* Exportación a CSV                                                   */
/* ================================================================== */

/** Un campo seguro para CSV: comillas dobles escapadas y saltos de línea fuera. */
function campo(valor: string | number): string {
  const texto = String(valor ?? "").replace(/[\r\n]+/g, " ");
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Descarga el período como CSV, con el mismo formato que el de jornadas:
 * separador `;`, BOM UTF-8 y **todos los números con coma decimal y SIN
 * separador de miles** (`decimalCSV`), para que Excel en español los reconozca
 * como números y los sume sin tener que retocar nada. Es la única salida del
 * módulo que no usa `src/lib/dinero.ts`, y es a propósito (pedido de César).
 */
function descargarCSV(filas: FilaNomina[], etiquetaArchivo: string): void {
  const encabezados = [
    "Empleado",
    "Usuario",
    "Cédula",
    "Cargo",
    "Estado",
    "Días liquidados",
    // Faltas no remuneradas (23 sep 2026): «Días pagados» es lo que de verdad
    // se liquida, y las dos siguientes explican la diferencia.
    "Días pagados",
    "Días de falta no remunerada",
    "Domingos perdidos",
    "Descuento por faltas",
    "Salario básico mensual",
    "Sueldo del período",
    "Auxilio de transporte",
    "Horas rotación nocturna",
    "Horas extra diurnas",
    "Horas extra nocturnas",
    "Horas en festivo",
    "Horas en festivo nocturnas",
    "Horas extra festivo diurnas",
    "Horas extra festivo nocturnas",
    "Total horas y recargos",
    "Otros devengados",
    "Total devengado",
    "Salud",
    "Pensión",
    "Otros descuentos",
    "Total descuentos",
    "Neto a pagar",
    "Fecha de pago",
    "Jornadas aprobadas",
    "Jornadas pendientes (no pagadas)",
    "Cálculo",
  ];

  const horas = (fila: FilaNomina, clave: string) =>
    decimalCSV(
      horasDeMinutos(fila.calculo.lineasHoras.find((l) => l.clave === clave)?.minutos ?? 0),
    );

  const cuerpo = filas.map((f) => {
    // Sin configuración (y sin cálculo congelado) no hay cifras: la fila sale
    // con sus datos y las columnas de dinero en blanco, nunca en cero.
    if (!cifrasValidas(f)) {
      return [
        f.nombre,
        f.usuario ?? "",
        f.cedula ?? "",
        f.cargo ?? "",
        f.huerfana ? "Borrador sin configuración" : "Sin configurar",
        ...Array.from({ length: encabezados.length - 6 }, () => ""),
        "Sin configuración en el mes: no se puede liquidar",
      ].map(campo);
    }
    return [
      f.nombre,
      f.usuario ?? "",
      f.cedula ?? "",
      f.cargo ?? "",
      f.estado ? NOMINA_ESTADO_LABELS[f.estado] : "Sin crear",
      decimalCSV(f.dias),
      decimalCSV(f.calculo.diasPagados),
      decimalCSV(f.calculo.faltas.dias),
      decimalCSV(f.calculo.faltas.diasDomingos),
      decimalCSV(f.calculo.faltas.valor),
      // El del cálculo (el congelado si está cerrada), no el de la configuración de hoy.
      decimalCSV(f.calculo.salarioBasico),
      decimalCSV(f.calculo.basico),
      decimalCSV(f.calculo.auxTransporte),
      horas(f, "rotacionNocturna"),
      horas(f, "extraDiurna"),
      horas(f, "extraNocturna"),
      horas(f, "festivo"),
      horas(f, "festivoNocturno"),
      horas(f, "extraFestivoDiurna"),
      horas(f, "extraFestivoNocturna"),
      decimalCSV(f.calculo.totalHoras),
      decimalCSV(f.calculo.totalDevengadosManuales),
      decimalCSV(f.calculo.totalDevengado),
      decimalCSV(f.calculo.salud),
      decimalCSV(f.calculo.pension),
      decimalCSV(f.calculo.totalDescuentosManuales),
      decimalCSV(f.calculo.totalDescuentos),
      decimalCSV(f.calculo.neto),
      f.fechaPago ?? "",
      String(f.jornadas),
      String(f.pendientes),
      f.congelada ? "Congelado al cerrar" : "Provisional (borrador)",
    ].map(campo);
  });

  const contenido = [encabezados.map(campo), ...cuerpo]
    .map((f) => f.join(";"))
    .join("\r\n");

  // ﻿ = BOM UTF-8.
  const blob = new Blob([`﻿${contenido}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `nomina_GPI_${etiquetaArchivo}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/* ================================================================== */
/* Panel                                                               */
/* ================================================================== */

export function LiquidacionPanel({
  filas,
  personas,
  persona,
  tipo,
  anio,
  mes,
  quincena,
  etiqueta,
  fechaInicio,
  fechaFin,
  diasSugeridos,
  hoy,
  abrir,
  pagina: paginaPedida,
  crearAction,
  liquidarTodosAction,
  guardarAction,
  cerrarAction,
  pagarAction,
  reabrirAction,
  eliminarAction,
}: {
  filas: FilaNomina[];
  /** Todas las cuentas activas, para el selector del filtro. */
  personas: { id: string; nombre: string; usuario: string | null }[];
  /** Id de la persona del filtro; "" = todas. */
  persona: string;
  tipo: TipoPeriodo;
  anio: number;
  mes: number;
  quincena: 1 | 2 | null;
  etiqueta: string;
  fechaInicio: string;
  fechaFin: string;
  diasSugeridos: number;
  hoy: string;
  abrir: string;
  /** Página de la tabla que pide la URL (`?pagina=`, 1-based). */
  pagina: number;
  crearAction: Accion;
  liquidarTodosAction: Accion;
  guardarAction: Accion;
  cerrarAction: Accion;
  pagarAction: Accion;
  reabrirAction: Accion;
  eliminarAction: Accion;
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<string>(abrir);

  const filaAbierta = useMemo(
    () =>
      filas.find(
        (f) => f.employeeId === abierta || (f.liquidacionId && f.liquidacionId === abierta),
      ) ?? null,
    [filas, abierta],
  );

  const [cargando, iniciarNavegacion] = useTransition();

  /** Navega conservando el período y el filtro por persona. */
  const irA = (cambios: Record<string, string>) => {
    const params = new URLSearchParams({
      tipo,
      anio: String(anio),
      mes: String(mes),
      ...(quincena ? { quincena: String(quincena) } : {}),
      ...(persona ? { persona } : {}),
      ...cambios,
    });
    // Los parámetros vacíos (`quincena: ""`, `persona: ""`) no viajan.
    for (const [clave, valor] of [...params.entries()]) {
      if (valor === "") params.delete(clave);
    }
    iniciarNavegacion(() => {
      router.push(`/admin/nomina?${params.toString()}`);
    });
  };

  const personaSel = persona ? personas.find((p) => p.id === persona) ?? null : null;

  // TABLA de 10 en 10 (regla del panel), con la página en la URL. `irA` arma
  // la URL desde cero, sin `pagina`: cambiar período o persona vuelve a la 1.
  // Los totales, «Liquidar todos» y el CSV siguen usando `filas` COMPLETO.
  const tabla = paginar(filas, paginaPedida);
  const hrefTabla = (() => {
    const params = new URLSearchParams({
      tipo,
      anio: String(anio),
      mes: String(mes),
      ...(quincena ? { quincena: String(quincena) } : {}),
      ...(persona ? { persona } : {}),
    });
    return `/admin/nomina?${params.toString()}`;
  })();

  // Al pasar de «Mes completo» a «Quincena»: si es el mes en curso, la quincena
  // de hoy; en otro mes, la primera.
  const hoyPeriodo = periodoDeHoy(hoy);
  const quincenaAlCambiar =
    hoyPeriodo.anio === anio && hoyPeriodo.mes === mes ? hoyPeriodo.quincena : 1;

  const totales = useMemo(
    () =>
      filas.filter(cifrasValidas).reduce(
        (acc, f) => ({
          devengado: acc.devengado + f.calculo.totalDevengado,
          descuentos: acc.descuentos + f.calculo.totalDescuentos,
          neto: acc.neto + f.calculo.neto,
          horas: acc.horas + f.calculo.totalHoras,
        }),
        { devengado: 0, descuentos: 0, neto: 0, horas: 0 },
      ),
    [filas],
  );

  // Sin configuración y sin liquidación que la sustituya (las cerradas leen su
  // snapshot y no cuentan); los borradores huérfanos tienen su propio aviso.
  const sinConfig = filas.filter((f) => !f.tieneConfig && !f.liquidacionId);
  const huerfanas = filas.filter((f) => f.huerfana);
  const conPendientes = filas.filter((f) => f.pendientes > 0);
  const sinCrear = filas.filter((f) => f.liquidacionId === null && f.tieneConfig);

  const [estadoLote, accionLote, enLote] = useAccionPanel(
    liquidarTodosAction,
    idleState,
  );

  return (
    <div className="space-y-6">
      <AyudaSeccion title="Cómo funciona esta pantalla">{AYUDA_NOMINA}</AyudaSeccion>

      {/* ---------------- Selector de período y persona ---------------- */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <SelectorPersona
            personas={personas}
            persona={persona}
            onCambio={(id) => irA({ persona: id })}
          />

          <div>
            <label
              htmlFor="nomina-tipo"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Tipo de período
            </label>
            <select
              id="nomina-tipo"
              value={tipo}
              onChange={(e) =>
                irA(
                  e.target.value === "mes"
                    ? { tipo: "mes", quincena: "" }
                    : { tipo: "quincena", quincena: String(quincenaAlCambiar) },
                )
              }
              className={inputClass}
            >
              <option value="quincena">Quincena</option>
              <option value="mes">Mes completo</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="nomina-mes"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Mes
            </label>
            <select
              id="nomina-mes"
              value={String(mes)}
              onChange={(e) => irA({ mes: e.target.value })}
              className={`${inputClass} capitalize`}
            >
              {MESES_OPCIONES.map((m) => (
                <option key={m.value} value={m.value} className="capitalize">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="nomina-anio"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Año
            </label>
            <input
              id="nomina-anio"
              type="number"
              min={2020}
              max={2100}
              defaultValue={anio}
              onBlur={(e) => {
                const valor = Number(e.target.value);
                if (Number.isInteger(valor) && valor >= 2020 && valor <= 2100 && valor !== anio)
                  irA({ anio: String(valor) });
              }}
              className={`${inputClass} w-28`}
            />
          </div>

          {tipo === "quincena" && (
            <div>
              <label
                htmlFor="nomina-quincena"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Quincena
              </label>
              <select
                id="nomina-quincena"
                value={String(quincena ?? 1)}
                onChange={(e) => irA({ quincena: e.target.value })}
                className={inputClass}
              >
                <option value="1">Primera (del 1 al 15)</option>
                <option value="2">Segunda (del 16 al fin de mes)</option>
              </select>
            </div>
          )}

          <p className="ml-auto max-w-xs text-sm leading-relaxed text-graphite">
            <strong className="text-ink">{etiqueta}</strong>
            <br />
            Se liquidan <strong>{diasSugeridos} días</strong> y entran las jornadas
            aprobadas del {fechaInicio.slice(8)} al {fechaFin.slice(8)}.
          </p>
        </div>

        {cargando && (
          <p role="status" className="mt-3 text-sm font-semibold text-brand-dark">
            Cargando…
          </p>
        )}

        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-graphite">
          {AYUDA_NOMINA_PERIODO}
        </p>
      </Card>

      {personaSel && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-brand/30 bg-brand-tint/60 px-4 py-3 text-sm text-brand-deep sm:flex-row sm:items-center">
          <p className="min-w-0 sm:flex-1">
            Estás viendo solo a <strong>{personaSel.nombre}</strong>. Los totales,
            «Liquidar» y el CSV son solo de esta persona.
          </p>
          <button
            type="button"
            onClick={() => irA({ persona: "" })}
            disabled={cargando}
            className="rounded-full border border-brand/40 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-deep transition-colors hover:border-brand disabled:opacity-60"
          >
            Ver a todas las personas
          </button>
        </div>
      )}

      {/* ---------------- Avisos ---------------- */}
      {sinConfig.length > 0 && (
        <AyudaSeccion tono="aviso" title="Hay personas sin salario configurado">
          {sinConfig
            .map((f) =>
              f.sinConfigDesde
                ? `${f.nombre} (herencia suspendida desde ${mesTexto(f.sinConfigDesde)})`
                : f.nombre,
            )
            .join(", ")}{" "}
          {sinConfig.length === 1 ? "no tiene" : "no tienen"} salario ni tarifas
          vigentes en {nombreMesNomina(mes)} de {anio}, así que no{" "}
          {sinConfig.length === 1 ? "se puede liquidar" : "se pueden liquidar"}.
          Si hay que pagarle{sinConfig.length === 1 ? "" : "s"}, configúra
          {sinConfig.length === 1 ? "lo" : "los"} en{" "}
          <Link
            prefetch={false}
            href={`/admin/nomina?vista=configuracion&anio=${anio}&mes=${mes}&empleado=${sinConfig[0].employeeId}`}
            className="font-semibold text-amber-900 underline"
          >
            la pestaña Configuración
          </Link>
          .
        </AyudaSeccion>
      )}

      {huerfanas.length > 0 && (
        <AyudaSeccion tono="aviso" title="Hay borradores sin configuración">
          {huerfanas.map((f) => f.nombre).join(", ")}{" "}
          {huerfanas.length === 1 ? "tiene un borrador" : "tienen borradores"} de
          este período, pero {nombreMesNomina(mes)} de {anio} ya no tiene
          configuración para {huerfanas.length === 1 ? "esa persona" : "esas personas"}{" "}
          (se quitó o se suspendió después de crearlo). Sus cifras ya no valen y no
          se muestran. Abre la persona para eliminar el borrador, o configura el
          mes en{" "}
          <Link
            prefetch={false}
            href={`/admin/nomina?vista=configuracion&anio=${anio}&mes=${mes}&empleado=${huerfanas[0].employeeId}`}
            className="font-semibold text-amber-900 underline"
          >
            la pestaña Configuración
          </Link>{" "}
          y el borrador se recalculará conservando sus conceptos.
        </AyudaSeccion>
      )}

      {conPendientes.length > 0 && (
        <AyudaSeccion tono="aviso" title="Hay jornadas pendientes de aprobación">
          {conPendientes
            .map((f) => `${f.nombre} (${f.pendientes})`)
            .join(", ")}
          . {AYUDA_NOMINA_PENDIENTES}{" "}
          <Link
            prefetch={false}
            href="/admin/jornadas"
            className="font-semibold text-amber-900 underline"
          >
            Ir a Jornadas y Permisos
          </Link>
          .
        </AyudaSeccion>
      )}

      {/* ---------------- Totales del período ---------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Total label="Total devengado" valor={totales.devengado} />
        <Total label="Horas y recargos" valor={totales.horas} />
        <Total label="Total descuentos" valor={totales.descuentos} />
        <Total label="Neto a pagar" valor={totales.neto} destacado />
      </div>

      {/* ---------------- Acciones del período ---------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <form action={accionLote}>
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="anio" value={anio} />
          <input type="hidden" name="mes" value={mes} />
          {quincena && <input type="hidden" name="quincena" value={quincena} />}
          {/* Con el filtro activo, la acción SOLO toca a esa persona. */}
          {personaSel && <input type="hidden" name="persona" value={personaSel.id} />}
          <button
            type="submit"
            disabled={enLote || cargando || sinCrear.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {enLote
              ? "Creando…"
              : sinCrear.length > 0
                ? personaSel
                  ? `Liquidar a ${primerNombre(personaSel.nombre)}`
                  : `Liquidar todos (${sinCrear.length})`
                : filas.every((f) => f.liquidacionId)
                  ? personaSel
                    ? "Ya está liquidada"
                    : "Todas liquidadas"
                  : "Falta configurar el salario"}
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            descargarCSV(
              filas,
              `${clavePeriodo(tipo, anio, mes, quincena)}${
                personaSel ? `_${personaSel.usuario || "persona"}` : ""
              }`,
            )
          }
          disabled={filas.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {personaSel
            ? `Exportar CSV (solo ${primerNombre(personaSel.nombre)})`
            : "Exportar CSV"}
        </button>
      </div>

      {estadoLote.status !== "idle" && estadoLote.message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            estadoLote.status === "success"
              ? "border-brand/30 bg-brand-tint text-brand-deep"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {estadoLote.message}
        </p>
      )}

      {/* ---------------- Tabla ---------------- */}
      {filas.length === 0 ? (
        <EmptyState
          title="No hay cuentas activas"
          description="La nómina se arma con las cuentas activas del equipo. Crea o reactiva cuentas en la sección Equipo y vuelve aquí."
        />
      ) : (
        <div id="tabla-liquidacion" className="scroll-mt-28">
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-mist/60 text-left text-xs uppercase tracking-wide text-graphite">
                {/* Ancho mínimo para que el nombre no se parta en tres líneas
                    y las filas no queden altísimas. */}
                <Th className="pl-5 min-w-[12rem]">Persona</Th>
                <Th align="right">Días</Th>
                <Th align="right" className="min-w-[7rem]">Sueldo del período</Th>
                <Th align="right">Auxilio de transporte</Th>
                <Th align="right">Horas y recargos</Th>
                <Th align="right">Otros devengados</Th>
                <Th align="right">Descuentos</Th>
                <Th align="right">Neto</Th>
                <Th>Estado</Th>
                <Th className="pr-5" align="right">
                  Detalle
                </Th>
              </tr>
            </thead>
            <tbody>
              {tabla.visibles.map((f) => (
                <tr
                  key={f.employeeId}
                  className="border-b border-line/70 last:border-0 hover:bg-mist/40"
                >
                  <td className="py-3 pl-5 pr-3">
                    <p className="font-semibold text-ink">{f.nombre}</p>
                    <p className="text-xs text-graphite">
                      {f.cargo || "Sin cargo"}
                      {!cifrasValidas(f) && f.sinConfigDesde && (
                        <span
                          className="ml-2 font-semibold text-amber-700"
                          title={`Sin configuración desde ${mesTexto(f.sinConfigDesde)}`}
                        >
                          · herencia suspendida
                        </span>
                      )}
                      {f.pendientes > 0 && (
                        <span className="ml-2 font-semibold text-amber-700">
                          · {f.pendientes} jornada{f.pendientes === 1 ? "" : "s"}{" "}
                          sin aprobar
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-graphite">
                    {cifrasValidas(f) ? formatearNumero(f.dias) : "—"}
                  </td>
                  <Money valor={cifrasValidas(f) ? f.calculo.basico : null} />
                  <Money valor={cifrasValidas(f) ? f.calculo.auxTransporte : null} />
                  <Money valor={cifrasValidas(f) ? f.calculo.totalHoras : null} />
                  <Money valor={cifrasValidas(f) ? f.calculo.totalDevengadosManuales : null} />
                  <Money valor={cifrasValidas(f) ? f.calculo.totalDescuentos : null} />
                  <td className="px-3 py-3 text-right font-bold tabular-nums text-ink">
                    {cifrasValidas(f) ? formatearMiles(f.calculo.neto) : "—"}
                  </td>
                  <td className="px-3 py-3">
                    {f.huerfana ? (
                      <span title="Borrador sin configuración: ábrelo para eliminarlo o configura el mes">
                        <Badge className="bg-amber-100 text-amber-800">
                          Sin configuración
                        </Badge>
                      </span>
                    ) : f.estado ? (
                      <Badge className={NOMINA_ESTADO_CLASSES[f.estado]}>
                        {NOMINA_ESTADO_LABELS[f.estado]}
                      </Badge>
                    ) : (
                      <Badge>Sin crear</Badge>
                    )}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    <button
                      type="button"
                      onClick={() => setAbierta(f.employeeId)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Paginacion
          pagina={tabla.pagina}
          total={tabla.total}
          hrefBase={hrefTabla}
          ancla="tabla-liquidacion"
          etiqueta="Páginas de la liquidación"
        />
        </div>
      )}

      {/* ---------------- Detalle ---------------- */}
      {filaAbierta && (
        <ModalPanel
          titulo={filaAbierta.nombre}
          descripcion={etiqueta}
          ancho="max-w-3xl"
          onClose={() => setAbierta("")}
        >
          <DetalleLiquidacion
            key={`${filaAbierta.employeeId}-${filaAbierta.liquidacionId ?? "nueva"}`}
            fila={filaAbierta}
            tipo={tipo}
            anio={anio}
            mes={mes}
            quincena={quincena}
            diasSugeridos={diasSugeridos}
            hoy={hoy}
            crearAction={crearAction}
            guardarAction={guardarAction}
            cerrarAction={cerrarAction}
            pagarAction={pagarAction}
            reabrirAction={reabrirAction}
            eliminarAction={eliminarAction}
          />
        </ModalPanel>
      )}
    </div>
  );
}

/* ================================================================== */
/* Detalle de una persona                                              */
/* ================================================================== */

function DetalleLiquidacion({
  fila,
  tipo,
  anio,
  mes,
  quincena,
  diasSugeridos,
  hoy,
  crearAction,
  guardarAction,
  cerrarAction,
  pagarAction,
  reabrirAction,
  eliminarAction,
}: {
  fila: FilaNomina;
  tipo: TipoPeriodo;
  anio: number;
  mes: number;
  quincena: 1 | 2 | null;
  diasSugeridos: number;
  hoy: string;
  crearAction: Accion;
  guardarAction: Accion;
  cerrarAction: Accion;
  pagarAction: Accion;
  reabrirAction: Accion;
  eliminarAction: Accion;
}) {
  const [crearEstado, crear, creando] = useAccionPanel(crearAction, idleState);
  const [guardarEstado, guardar, guardando] = useAccionPanel(guardarAction, idleState);
  const [cerrarEstado, cerrar, cerrando] = useAccionPanel(cerrarAction, idleState);
  const [pagarEstado, pagar, pagando] = useAccionPanel(pagarAction, idleState);
  const [reabrirEstado, reabrir, reabriendo] = useAccionPanel(reabrirAction, idleState);
  const [borrarEstado, borrar, borrando] = useAccionPanel(eliminarAction, idleState);
  const [mostrarPago, setMostrarPago] = useState(false);
  /**
   * Cuál fue la ÚLTIMA acción que se envió.
   *
   * Sin esto, el aviso que se muestra es el de la primera acción que dejó de
   * estar «idle» —crear— y se queda ahí para siempre: después de cerrar, la
   * pantalla seguía diciendo «Liquidación creada en borrador». Cada formulario
   * lo marca al enviarse y el aviso se lee de ahí.
   */
  const [ultima, setUltima] = useState<
    "crear" | "guardar" | "cerrar" | "pagar" | "reabrir" | "borrar" | ""
  >("");

  const c = fila.calculo;
  const editable = fila.estado === "borrador";
  const cerrada = fila.estado === "cerrada" || fila.estado === "pagada";

  const estados = {
    crear: crearEstado,
    guardar: guardarEstado,
    cerrar: cerrarEstado,
    pagar: pagarEstado,
    reabrir: reabrirEstado,
    borrar: borrarEstado,
    "": idleState,
  } as const;
  const mensaje = estados[ultima].status !== "idle" ? estados[ultima] : undefined;

  const ocupado =
    creando || guardando || cerrando || pagando || reabriendo || borrando;

  const hrefConfig = `/admin/nomina?vista=configuracion&anio=${anio}&mes=${mes}&empleado=${fila.employeeId}`;

  /* --- Sin configuración y sin liquidación: no hay nada que liquidar --- */
  if (!fila.tieneConfig && !fila.liquidacionId) {
    return (
      <AyudaSeccion
        tono="aviso"
        title={
          fila.sinConfigDesde
            ? `Sin configuración desde ${mesTexto(fila.sinConfigDesde)} (herencia suspendida)`
            : "Sin salario configurado"
        }
      >
        {fila.sinConfigDesde ? (
          <>
            A {fila.nombre} se le dejó sin configuración desde{" "}
            {mesTexto(fila.sinConfigDesde)} (por ejemplo, por un retiro o una
            licencia sin sueldo), así que no se le liquida en{" "}
            {nombreMesNomina(mes)} de {anio}. Si hay que volver a pagarle, ve a la
            pestaña <strong>Configuración</strong> y guarda su configuración desde
            el mes que corresponda, o quita el corte en {mesTexto(fila.sinConfigDesde)}.
          </>
        ) : (
          <>
            {fila.nombre} no tiene salario ni tarifas configurados ni en{" "}
            {nombreMesNomina(mes)} de {anio} ni en ningún mes anterior. Ve a la
            pestaña <strong>Configuración</strong>, elige a esta persona y el mes
            desde el que rige su salario, escríbelo y guarda: las siete tarifas se
            sugieren solas, y lo que guardes vale para ese mes y los siguientes.
          </>
        )}
      </AyudaSeccion>
    );
  }

  /* --- Borrador HUÉRFANO: existe, pero su mes ya no tiene configuración --- */
  if (fila.huerfana && fila.liquidacionId) {
    const conceptos = [...CONCEPTOS_MANUALES_DEVENGADOS, ...CONCEPTOS_MANUALES_DESCUENTOS].filter(
      (c) => (fila.manuales.valores[c.clave] ?? 0) > 0,
    );
    return (
      <div className="space-y-5">
        <AyudaSeccion tono="aviso" title="Borrador sin configuración">
          Este borrador se creó cuando {nombreMesNomina(mes)} de {anio} tenía
          configuración para {fila.nombre}, pero después se quitó
          {fila.sinConfigDesde
            ? ` (herencia suspendida desde ${mesTexto(fila.sinConfigDesde)})`
            : ""}
          . Sin salario ni tarifas no hay con qué calcularlo, así que sus cifras no
          se muestran ni se pueden cerrar. Tienes dos caminos:{" "}
          <Link
            prefetch={false}
            href={hrefConfig}
            className="font-semibold text-amber-900 underline"
          >
            configurar el mes
          </Link>{" "}
          (el borrador se recalcula solo y conserva sus conceptos) o eliminarlo.
        </AyudaSeccion>

        {conceptos.length > 0 && (
          <div className="rounded-2xl border border-line px-4 py-3 text-sm">
            <p className="font-semibold text-ink">Conceptos escritos en este borrador</p>
            <ul className="mt-2 space-y-1 text-graphite">
              {conceptos.map((c) => (
                <li key={c.clave} className="flex justify-between gap-3">
                  <span>{c.label}</span>
                  <span className="tabular-nums">
                    {formatearPesos(fila.manuales.valores[c.clave] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mensaje?.message && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              mensaje.status === "success"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {mensaje.message}
          </p>
        )}

        <form
          action={borrar}
          onSubmit={(event) => {
            setUltima("borrar");
            if (
              !window.confirm(
                `¿Eliminar el borrador de ${fila.nombre}?\n\nSu mes ya no tiene configuración, así que no se puede calcular. Se pierden los conceptos que tenía escritos.`,
              )
            )
              event.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={fila.liquidacionId} />
          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <Trash className="h-4 w-4" />
            {borrando ? "Eliminando…" : "Eliminar el borrador"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* --- Cabecera de estado --- */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-mist/60 px-4 py-3">
        {fila.estado ? (
          <Badge className={NOMINA_ESTADO_CLASSES[fila.estado]}>
            {NOMINA_ESTADO_LABELS[fila.estado]}
          </Badge>
        ) : (
          <Badge>Sin crear</Badge>
        )}
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-graphite">
          {fila.estado
            ? NOMINA_ESTADO_DESCRIPCIONES[fila.estado]
            : "Esta persona todavía no tiene liquidación en este período. Abajo ves lo que se le pagaría; créala para poder editarla y cerrarla."}
          {fila.congelada && fila.calculadoEn && (
            <>
              {" "}
              Cálculo congelado el{" "}
              {new Date(fila.calculadoEn).toLocaleDateString("es-CO")}.
            </>
          )}
          {/* Con qué configuración se calcula lo que está en vivo. */}
          {!fila.congelada && fila.configDesde && (
            <>
              {" "}
              <strong className="text-ink">
                Se calcula con la configuración guardada en{" "}
                {mesTexto(fila.configDesde)}
                {fila.configHeredada ? " (heredada)" : ""}.
              </strong>
            </>
          )}
        </p>
      </div>

      {fila.congelada && !fila.tieneConfig && (
        <AyudaSeccion tono="aviso" title="El mes ya no tiene configuración">
          Esta liquidación conserva su cálculo congelado y su volante, pero{" "}
          {nombreMesNomina(mes)} de {anio} ya no tiene configuración para{" "}
          {fila.nombre}
          {fila.sinConfigDesde
            ? ` (herencia suspendida desde ${mesTexto(fila.sinConfigDesde)})`
            : ""}
          . Para reabrirla, primero{" "}
          <Link
            prefetch={false}
            href={hrefConfig}
            className="font-semibold text-amber-900 underline"
          >
            configura a la persona en ese mes
          </Link>
          .
        </AyudaSeccion>
      )}

      {fila.pendientes > 0 && (
        <AyudaSeccion tono="aviso" title="Jornadas sin aprobar en el período">
          Quedan <strong>{fila.pendientes}</strong> jornada
          {fila.pendientes === 1 ? "" : "s"} pendiente
          {fila.pendientes === 1 ? "" : "s"} de revisión. {AYUDA_NOMINA_PENDIENTES}
        </AyudaSeccion>
      )}

      {/* --- Devengados --- */}
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-graphite">
          Devengados
        </h3>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <tbody>
              {/* «Jornada laboral: N días» (23 sep 2026): lo que cubre el
                  salario ya no se enseña como «horas ordinarias», sino como los
                  días de jornada del período. Las horas trabajadas van más
                  abajo, en una línea informativa sin dinero. */}
              <Renglon
                label={`Jornada laboral: ${formatearNumero(c.diasPagados)} ${c.diasPagados === 1 ? "día" : "días"}`}
                detalle={`Salario mensual ${formatearPesos(c.salarioBasico)} ÷ 30 × ${formatearNumero(c.diasPagados)}${
                  c.faltas.dias > 0
                    ? ` · del período (${formatearNumero(c.dias)} días) se descontaron ${textoFaltas(c.faltas)}`
                    : ""
                }${
                  !fila.congelada && fila.configDesde
                    ? ` · configurado en ${nombreMesNomina(fila.configDesde.mes)} de ${fila.configDesde.anio}`
                    : ""
                }`}
                valor={c.basico}
              />
              {c.auxTransporte > 0 && (
                <Renglon
                  label="Auxilio de transporte"
                  detalle={`Proporcional a ${formatearNumero(c.diasPagados)} días de ${formatearPesos(c.auxTransporteMensual)} al mes`}
                  valor={c.auxTransporte}
                />
              )}

              {/* Faltas NO REMUNERADAS (23 sep 2026). La línea de arriba ya
                  muestra los días EFECTIVOS; esta deja explícito cuántos días
                  se perdieron —con el domingo que arrastran, art. 173 CST— y
                  cuánto dinero es. No se vuelve a restar. */}
              {c.faltas.dias > 0 && (
                <Renglon
                  label={`Faltas no remuneradas: ${textoFaltas(c.faltas)}`}
                  detalle={detalleFaltas(c.faltas)}
                  valor={0}
                  apagado
                  // `formatearPesos` de un negativo pega el signo al importe
                  // («-$ 230.000»); un «−» suelto delante se partía de línea en
                  // la columna estrecha y parecía que la cifra sumaba.
                  textoValor={formatearPesos(-c.faltas.valor)}
                />
              )}

              {c.lineasHoras
                .filter((l) => l.minutos > 0 && l.sePaga)
                .map((l) => (
                  <Renglon
                    key={l.clave}
                    label={l.label}
                    detalle={`${formatearHorasNomina(l.minutos)} × ${formatearDinero(l.tarifa)}${
                      l.composicion ? ` · ${l.composicion}` : ""
                    }`}
                    valor={l.valor}
                  />
                ))}

              {/* Línea INFORMATIVA, sin dinero: cuántas horas se trabajaron de
                  verdad en el período. Las de la jornada laboral las paga el
                  sueldo de arriba; las demás ya están en los renglones. */}
              {c.minutosOrdinarios + c.minutosPagados > 0 && (
                <Renglon
                  label="Horas trabajadas en el período"
                  detalle={`${formatearHorasNomina(
                    c.minutosOrdinarios + c.minutosPagados,
                  )} en total, de las cuales ${formatearHorasNomina(
                    c.minutosOrdinarios,
                  )} son de la jornada laboral (las paga el sueldo de arriba)`}
                  valor={0}
                  apagado
                  textoValor="—"
                />
              )}

              {c.devengadosManuales
                .filter((l) => l.valor > 0)
                .map((l) => (
                  <Renglon
                    key={l.clave}
                    label={l.label}
                    detalle={l.nota}
                    valor={l.valor}
                  />
                ))}

              <Renglon label="Total devengado" valor={c.totalDevengado} total />
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Descuentos --- */}
      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-graphite">
          Descuentos
        </h3>
        <div className="overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-sm">
            <tbody>
              <Renglon
                label="Salud"
                detalle={`${formatearPorcentaje(c.pctSalud)} % sobre ${formatearPesos(c.baseSeguridadSocial)} (sueldo + horas)`}
                valor={c.salud}
              />
              <Renglon
                label="Pensión"
                detalle={`${formatearPorcentaje(c.pctPension)} % sobre ${formatearPesos(c.baseSeguridadSocial)}`}
                valor={c.pension}
              />
              {c.descuentosManuales
                .filter((l) => l.valor > 0)
                .map((l) => (
                  <Renglon
                    key={l.clave}
                    label={l.label}
                    detalle={l.nota}
                    valor={l.valor}
                  />
                ))}
              <Renglon label="Total descuentos" valor={c.totalDescuentos} total />
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Neto --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-tint px-5 py-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-deep">
          Neto a pagar
        </p>
        <p className="text-2xl font-extrabold text-brand-deep">
          {formatearPesos(c.neto)}
        </p>
      </div>

      {/* --- Conceptos manuales (editables en borrador) --- */}
      {editable && fila.liquidacionId && (
        <form
          action={guardar}
          onSubmit={() => setUltima("guardar")}
          className="space-y-4 rounded-2xl border border-line p-4"
        >
          <input type="hidden" name="id" value={fila.liquidacionId} />

          <div>
            <h3 className="text-sm font-bold text-ink">
              Días, bonos y descuentos del período
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-graphite">
              Lo que no sale de las jornadas y aplica SOLO a este período (un bono,
              un descuento puntual, la cuota de un préstamo). Deja vacío lo que no
              aplique. Las horas y el sueldo se calculan solos.
            </p>
          </div>

          <div>
            <label
              htmlFor="nomina-dias"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Días liquidados
            </label>
            <input
              id="nomina-dias"
              name="dias_liquidados"
              type="number"
              min={0}
              max={31}
              step="0.5"
              defaultValue={fila.dias}
              className={`${inputClass} w-32`}
            />
            <p className="mt-1 text-xs text-graphite">
              Sugerido para este período: {diasSugeridos}. Bájalo si la persona no
              trabajó el período completo (ingreso, retiro o licencia).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CONCEPTOS_MANUALES_DEVENGADOS.map((concepto) => (
              <CampoManual
                key={concepto.clave}
                clave={concepto.clave}
                label={concepto.label}
                descripcion={concepto.descripcion}
                valor={fila.manuales.valores[concepto.clave]}
                nota={fila.manuales.notas[concepto.clave] ?? ""}
              />
            ))}
          </div>

          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
            {CONCEPTOS_MANUALES_DESCUENTOS.map((concepto) => (
              <CampoManual
                key={concepto.clave}
                clave={concepto.clave}
                label={concepto.label}
                descripcion={concepto.descripcion}
                valor={fila.manuales.valores[concepto.clave]}
                nota={fila.manuales.notas[concepto.clave] ?? ""}
              />
            ))}
          </div>

          <div>
            <label
              htmlFor="nomina-notas"
              className="mb-1.5 block text-sm font-semibold text-ink"
            >
              Observaciones del volante
            </label>
            <textarea
              id="nomina-notas"
              name="notas"
              rows={2}
              defaultValue={fila.notas}
              placeholder="Opcional: una línea que se imprime al pie del comprobante."
              className={`${inputClass} resize-y`}
            />
          </div>

          <button
            type="submit"
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      )}

      {mensaje?.message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            mensaje.status === "success"
              ? "border-brand/30 bg-brand-tint text-brand-deep"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {mensaje.message}
        </p>
      )}

      {/* --- Acciones --- */}
      <div className="space-y-3 border-t border-line pt-5">
        <AyudaSeccion>{AYUDA_NOMINA_CERRAR}</AyudaSeccion>

        <div className="flex flex-wrap items-center gap-2">
          {!fila.liquidacionId && (
            <form action={crear} onSubmit={() => setUltima("crear")}>
              <input type="hidden" name="employee_id" value={fila.employeeId} />
              <input type="hidden" name="tipo" value={tipo} />
              <input type="hidden" name="anio" value={anio} />
              <input type="hidden" name="mes" value={mes} />
              {quincena && <input type="hidden" name="quincena" value={quincena} />}
              <BotonPrincipal pendiente={creando} disabled={ocupado} icono={<Plus className="h-4 w-4" />}>
                {creando ? "Creando…" : "Crear liquidación"}
              </BotonPrincipal>
            </form>
          )}

          {editable && fila.liquidacionId && (
            <form
              action={cerrar}
              onSubmit={(event) => {
                setUltima("cerrar");
                if (
                  !window.confirm(
                    `¿Cerrar la liquidación de ${fila.nombre}?\n\nEl cálculo quedará congelado: cambiar después un horario, una tarifa o una jornada ya no la modificará. Si hay que corregirla, tendrás que reabrirla.`,
                  )
                )
                  event.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={fila.liquidacionId} />
              <BotonPrincipal pendiente={cerrando} disabled={ocupado} icono={<Check className="h-4 w-4" />}>
                {cerrando ? "Cerrando…" : "Cerrar liquidación"}
              </BotonPrincipal>
            </form>
          )}

          {cerrada && fila.liquidacionId && (
            <>
              <a
                href={`/admin/nomina/volante/${fila.liquidacionId}/pdf`}
                className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-tint px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15"
              >
                <Download className="h-4 w-4" />
                Descargar volante (PDF)
              </a>

              <button
                type="button"
                onClick={() => setMostrarPago((v) => !v)}
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-60"
              >
                {fila.estado === "pagada" ? "Corregir fecha de pago" : "Marcar pagada"}
              </button>

              <form
                action={reabrir}
                onSubmit={(event) => {
                  setUltima("reabrir");
                  if (
                    !window.confirm(
                      `¿Reabrir la liquidación de ${fila.nombre}?\n\nVolverá a borrador y se BORRARÁ el cálculo congelado: se recalculará con las jornadas y las tarifas de hoy. Reabrir no es eliminar.`,
                    )
                  )
                    event.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={fila.liquidacionId} />
                <button
                  type="submit"
                  disabled={ocupado}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-60"
                >
                  {reabriendo ? "Reabriendo…" : "Reabrir"}
                </button>
              </form>
            </>
          )}

          {editable && fila.liquidacionId && (
            <a
              href={`/admin/nomina/volante/${fila.liquidacionId}/pdf`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              <Download className="h-4 w-4" />
              Ver volante en borrador
            </a>
          )}

          {fila.liquidacionId && (
            <form
              action={borrar}
              onSubmit={(event) => {
                setUltima("borrar");
                if (
                  !window.confirm(
                    `¿Eliminar para siempre la liquidación de ${fila.nombre}?\n\nDesaparecen el registro y su volante. Si solo quieres corregirla, usa «Reabrir».`,
                  )
                )
                  event.preventDefault();
              }}
              className="ml-auto"
            >
              <input type="hidden" name="id" value={fila.liquidacionId} />
              <button
                type="submit"
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
              >
                <Trash className="h-4 w-4" />
                {borrando ? "Eliminando…" : "Eliminar"}
              </button>
            </form>
          )}
        </div>

        {mostrarPago && fila.liquidacionId && (
          <form
            action={pagar}
            onSubmit={() => setUltima("pagar")}
            className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-mist/60 p-4"
          >
            <input type="hidden" name="id" value={fila.liquidacionId} />
            <div>
              <label
                htmlFor="nomina-fecha-pago"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                Fecha en que se pagó
              </label>
              <input
                id="nomina-fecha-pago"
                name="fecha_pago"
                type="date"
                required
                defaultValue={fila.fechaPago ?? hoy}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={ocupado}
              className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-deep disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {pagando ? "Guardando…" : "Confirmar pago"}
            </button>
          </form>
        )}

        <p className="flex items-start gap-2 text-xs leading-relaxed text-graphite">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{AYUDA_NOMINA_VOLANTE}</span>
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Piezas pequeñas                                                     */
/* ================================================================== */

/** «Ana María Pérez» → «Ana» (para botones cortos). */
function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

/** Desde cuántas personas el selector ofrece un buscador. */
const UMBRAL_BUSCADOR = 10;

/**
 * Selector del filtro por persona: «Todas» + cada cuenta activa. Con una lista
 * larga aparece además un cuadro de búsqueda que acorta las opciones (sin
 * tildes ni mayúsculas: «perez» encuentra a «Pérez»).
 */
function SelectorPersona({
  personas,
  persona,
  onCambio,
}: {
  personas: { id: string; nombre: string; usuario: string | null }[];
  persona: string;
  onCambio: (id: string) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const normalizar = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtro = normalizar(busqueda.trim());
  const opciones = filtro
    ? personas.filter(
        (p) =>
          p.id === persona ||
          normalizar(`${p.nombre} ${p.usuario ?? ""}`).includes(filtro),
      )
    : personas;

  return (
    <div className="min-w-[13rem] flex-1 sm:max-w-xs">
      <label
        htmlFor="nomina-persona"
        className="mb-1.5 block text-sm font-semibold text-ink"
      >
        Persona
      </label>
      {personas.length > UMBRAL_BUSCADOR && (
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o usuario…"
          aria-label="Buscar persona"
          className={`${inputClass} mb-2`}
        />
      )}
      <select
        id="nomina-persona"
        defaultValue={persona}
        onChange={(e) => onCambio(e.target.value)}
        className={inputClass}
      >
        <option value="">Todas las personas</option>
        {opciones.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

function Total({
  label,
  valor,
  destacado = false,
}: {
  label: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${
        destacado
          ? "border-brand/30 bg-brand-tint text-brand-deep"
          : "border-line bg-white text-ink"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-xl font-extrabold tabular-nums sm:text-2xl">
        {formatearPesos(valor)}
      </p>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-3 font-semibold ${align === "right" ? "text-right" : ""} ${className}`}
    >
      {children}
    </th>
  );
}

/** Una celda de dinero. `null` = sin cifra que mostrar (sin configuración). */
function Money({ valor }: { valor: number | null }) {
  return (
    <td className="px-3 py-3 text-right tabular-nums text-graphite">
      {valor === null || valor === 0 ? "—" : formatearMiles(valor)}
    </td>
  );
}

/**
 * El detalle de las faltas no remuneradas: qué días se perdieron, qué domingos
 * arrastraron (art. 173 CST) y qué permisos por horas se prorratearon. Es lo
 * que hace auditable el descuento sin salir de la ficha.
 */
function detalleFaltas(faltas: ResumenFaltasNomina): string {
  const partes: string[] = [];
  if (faltas.fechas.length > 0)
    partes.push(`Días: ${faltas.fechas.map(fechaCorta).join(", ")}`);
  if (faltas.domingos.length > 0)
    partes.push(
      `Domingo de descanso perdido: ${faltas.domingos.map(fechaCorta).join(", ")}`,
    );
  for (const p of faltas.parciales) {
    partes.push(
      `${fechaCorta(p.fecha)}: ${p.horas} h de una jornada de ${p.horasJornada} h`,
    );
  }
  return partes.join(" · ");
}

function Renglon({
  label,
  detalle,
  valor,
  total = false,
  apagado = false,
  textoValor,
}: {
  label: string;
  detalle?: string;
  valor: number;
  total?: boolean;
  apagado?: boolean;
  /** Qué escribir en la columna de dinero cuando el renglón no lleva importe. */
  textoValor?: string;
}) {
  return (
    <tr
      className={`border-b border-line/70 last:border-0 ${
        total ? "bg-mist/70 font-bold text-ink" : ""
      }`}
    >
      <td className="px-4 py-2.5">
        <span className={apagado ? "text-graphite" : ""}>{label}</span>
        {detalle && (
          <span className="mt-0.5 block text-xs font-normal text-graphite">
            {detalle}
          </span>
        )}
      </td>
      <td
        className={`px-4 py-2.5 text-right tabular-nums ${
          apagado ? "text-graphite/60" : ""
        }`}
      >
        {apagado ? (textoValor ?? "incluido") : formatearPesos(valor)}
      </td>
    </tr>
  );
}

function CampoManual({
  clave,
  label,
  descripcion,
  valor,
  nota,
}: {
  clave: string;
  label: string;
  descripcion: string;
  valor: number;
  nota: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <label
        htmlFor={`nomina-${clave}`}
        className="block text-sm font-semibold text-ink"
      >
        {label}
      </label>
      <p className="mb-2 mt-0.5 text-xs leading-relaxed text-graphite">
        {descripcion}
      </p>
      <CampoDinero
        id={`nomina-${clave}`}
        name={clave}
        prefijo="$"
        valorInicial={valor}
      />
      <input
        name={`nota_${clave}`}
        type="text"
        maxLength={200}
        defaultValue={nota}
        placeholder="Nota (opcional)"
        aria-label={`Nota de ${label}`}
        className={`${inputClass} mt-2 text-xs`}
      />
    </div>
  );
}

function BotonPrincipal({
  children,
  pendiente,
  disabled,
  icono,
}: {
  children: React.ReactNode;
  pendiente: boolean;
  disabled: boolean;
  icono: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
    >
      {pendiente ? null : icono}
      {children}
    </button>
  );
}
