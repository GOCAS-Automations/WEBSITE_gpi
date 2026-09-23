"use client";

/**
 * BARRA DE FILTROS de la bandeja de permisos (/admin/jornadas?vista=permisos)
 * ===========================================================================
 * Gemela de `FiltrosAprobaciones`: los filtros se aplican **al cambiar**, sin
 * botón «Filtrar», viajan en la URL (enlace compartible, botón atrás) y la
 * consulta la hace el servidor. La URL se reescribe SIN `pagina`, que es lo
 * que devuelve a la primera página al cambiar un filtro.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  PERMISO_FILTRO_ESTADOS,
  PERMISO_FILTRO_ESTADO_DEFECTO,
  urlPermisos,
  type FiltrosPermiso,
} from "@/lib/permisos";
import { inputClass } from "@/components/admin/ui-base";
import { FilterX } from "@/lib/icons";

// El tipo y `urlPermisos` viven en `src/lib/permisos.ts` (módulo puro): este
// archivo es `"use client"` y el Server Component de la bandeja necesita la
// misma función para su `hrefBase`. Un valor exportado desde un módulo de
// cliente NO se puede llamar en el servidor.

const VACIOS: FiltrosPermiso = {
  estado: PERMISO_FILTRO_ESTADO_DEFECTO,
  employeeId: "",
  desde: "",
  hasta: "",
};

function sonIguales(a: FiltrosPermiso, b: FiltrosPermiso): boolean {
  return (
    a.estado === b.estado &&
    a.employeeId === b.employeeId &&
    a.desde === b.desde &&
    a.hasta === b.hasta
  );
}

export function FiltrosPermisos({
  valores,
  empleados,
}: {
  valores: FiltrosPermiso;
  empleados: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [actuales, setActuales] = useState<FiltrosPermiso>(valores);
  const [ultimosDelServidor, setUltimosDelServidor] =
    useState<FiltrosPermiso>(valores);
  if (!sonIguales(ultimosDelServidor, valores)) {
    setUltimosDelServidor(valores);
    setActuales(valores);
  }

  function aplicar(cambio: Partial<FiltrosPermiso>) {
    const siguiente = { ...actuales, ...cambio };
    setActuales(siguiente);
    startTransition(() => {
      router.replace(urlPermisos(siguiente), { scroll: false });
    });
  }

  function limpiar() {
    setActuales(VACIOS);
    startTransition(() => {
      router.replace("/admin/jornadas?vista=permisos", { scroll: false });
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
          {PERMISO_FILTRO_ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Persona</span>
        <select
          name="empleado"
          value={actuales.employeeId}
          onChange={(e) => aplicar({ employeeId: e.target.value })}
          className={inputClass}
        >
          <option value="">Todas</option>
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
