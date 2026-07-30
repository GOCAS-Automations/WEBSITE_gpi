"use client";

/**
 * BARRA DE FILTROS de la bandeja de aprobaciones (/admin/jornadas)
 * ================================================================
 * Los filtros se aplican **en el momento en que cambian**: no hay botón
 * "Filtrar". Cada control, al cambiar, reescribe los parámetros de la URL con
 * `router.replace`, y es el Server Component (`AprobacionesView`) el que vuelve
 * a consultar con esos parámetros.
 *
 * POR QUÉ SIGUE VIVIENDO TODO EN LA URL
 * -------------------------------------
 * Porque así el enlace sigue siendo compartible ("mándame las pendientes de
 * Carlos de esta semana"), el botón atrás del navegador funciona y la consulta
 * se hace en el servidor, no filtrando en el navegador un listado completo.
 * Se usa `replace` y no `push` para no llenar el historial con un paso por cada
 * tecla; la pestaña `?vista=aprobaciones` se conserva siempre.
 *
 * Los controles guardan su valor en estado local para responder al instante
 * (sin esperar al servidor) y se resincronizan si la URL cambia por fuera:
 * "Limpiar", un enlace compartido o el botón atrás.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  JORNADA_FILTRO_ESTADOS,
  JORNADA_FILTRO_ESTADO_DEFECTO,
} from "@/lib/admin-types";
import { inputClass } from "@/components/admin/ui";
import { FilterX } from "@/lib/icons";

/** Lo que la bandeja arranca por defecto: pendientes de todo el equipo. */
const VACIOS: Filtros = {
  estado: JORNADA_FILTRO_ESTADO_DEFECTO,
  empleado: "",
  desde: "",
  hasta: "",
};

export interface Filtros {
  estado: string;
  empleado: string;
  /** `YYYY-MM-DD` o cadena vacía. */
  desde: string;
  /** `YYYY-MM-DD` o cadena vacía. */
  hasta: string;
}

/** URL de la bandeja con estos filtros. Omite lo que esté en su valor por defecto. */
function urlConFiltros(filtros: Filtros): string {
  const params = new URLSearchParams();
  // La pestaña viaja siempre: cambiar un filtro no debe devolver a Métricas.
  params.set("vista", "aprobaciones");
  if (filtros.estado && filtros.estado !== VACIOS.estado)
    params.set("estado", filtros.estado);
  if (filtros.empleado) params.set("empleado", filtros.empleado);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  return `/admin/jornadas?${params.toString()}`;
}

function sonIguales(a: Filtros, b: Filtros): boolean {
  return (
    a.estado === b.estado &&
    a.empleado === b.empleado &&
    a.desde === b.desde &&
    a.hasta === b.hasta
  );
}

export function FiltrosAprobaciones({
  valores,
  empleados,
}: {
  /** Filtros con los que el servidor acaba de renderizar la lista. */
  valores: Filtros;
  empleados: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [actuales, setActuales] = useState<Filtros>(valores);
  // Patrón estándar de React para ajustar estado cuando cambian las props: si la
  // URL cambió por fuera (Limpiar, enlace compartido, botón atrás), los
  // controles se ponen al día sin necesidad de un efecto.
  const [ultimosDelServidor, setUltimosDelServidor] = useState<Filtros>(valores);
  if (!sonIguales(ultimosDelServidor, valores)) {
    setUltimosDelServidor(valores);
    setActuales(valores);
  }

  function aplicar(cambio: Partial<Filtros>) {
    const siguiente = { ...actuales, ...cambio };
    setActuales(siguiente);
    startTransition(() => {
      router.replace(urlConFiltros(siguiente), { scroll: false });
    });
  }

  function limpiar() {
    setActuales(VACIOS);
    startTransition(() => {
      router.replace("/admin/jornadas", { scroll: false });
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Estado</span>
        <select
          name="estado"
          value={actuales.estado}
          onChange={(e) => aplicar({ estado: e.target.value })}
          className={inputClass}
        >
          {JORNADA_FILTRO_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Empleado</span>
        <select
          name="empleado"
          value={actuales.empleado}
          onChange={(e) => aplicar({ empleado: e.target.value })}
          className={inputClass}
        >
          <option value="">Todos</option>
          {empleados.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Desde</span>
        <input
          type="date"
          name="desde"
          value={actuales.desde}
          onChange={(e) => aplicar({ desde: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Hasta</span>
        <input
          type="date"
          name="hasta"
          value={actuales.hasta}
          onChange={(e) => aplicar({ hasta: e.target.value })}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col justify-end gap-1">
        <button
          type="button"
          onClick={limpiar}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
        >
          <FilterX className="h-4 w-4" />
          Limpiar
        </button>
        <span
          aria-live="polite"
          className={`text-center text-xs text-graphite transition-opacity ${
            pendiente ? "opacity-100" : "opacity-0"
          }`}
        >
          Actualizando…
        </span>
      </div>
    </div>
  );
}
