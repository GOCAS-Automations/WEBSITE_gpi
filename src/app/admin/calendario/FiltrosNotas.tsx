"use client";

/**
 * BARRA DE FILTROS de la pestaña «Notas» (/admin/calendario?vista=notas)
 * ======================================================================
 * Mismo patrón que la bandeja de aprobaciones de jornadas: los filtros viven en
 * la URL, se aplican EN EL MOMENTO en que cambian (no hay botón «Filtrar») y la
 * consulta la hace el Server Component, no el navegador filtrando una lista
 * completa. Así el enlace se puede compartir y el botón atrás funciona.
 *
 * Se usa `replace` y no `push` para no llenar el historial con un paso por cada
 * cambio, y la pestaña `vista=notas` viaja siempre.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { inputClass } from "@/components/admin/ui-base";
import { FilterX } from "@/lib/icons";

export interface FiltrosNota {
  evento: string;
  autor: string;
  /** `YYYY-MM-DD` o cadena vacía. */
  desde: string;
  hasta: string;
}

const VACIOS: FiltrosNota = { evento: "", autor: "", desde: "", hasta: "" };

function urlConFiltros(filtros: FiltrosNota): string {
  const params = new URLSearchParams();
  params.set("vista", "notas");
  if (filtros.evento) params.set("evento", filtros.evento);
  if (filtros.autor) params.set("autor", filtros.autor);
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);
  return `/admin/calendario?${params.toString()}`;
}

function sonIguales(a: FiltrosNota, b: FiltrosNota): boolean {
  return (
    a.evento === b.evento &&
    a.autor === b.autor &&
    a.desde === b.desde &&
    a.hasta === b.hasta
  );
}

export function FiltrosNotas({
  valores,
  eventos,
  autores,
}: {
  valores: FiltrosNota;
  eventos: { id: string; etiqueta: string }[];
  autores: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();

  const [actuales, setActuales] = useState<FiltrosNota>(valores);
  // Patrón estándar de React para ajustar estado cuando cambian las props: si
  // la URL cambió por fuera (Limpiar, enlace compartido, botón atrás), los
  // controles se ponen al día sin necesidad de un efecto.
  const [ultimos, setUltimos] = useState<FiltrosNota>(valores);
  if (!sonIguales(ultimos, valores)) {
    setUltimos(valores);
    setActuales(valores);
  }

  function aplicar(cambio: Partial<FiltrosNota>) {
    const siguiente = { ...actuales, ...cambio };
    setActuales(siguiente);
    startTransition(() => {
      router.replace(urlConFiltros(siguiente), { scroll: false });
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="block lg:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Evento</span>
        <select
          name="evento"
          value={actuales.evento}
          onChange={(e) => aplicar({ evento: e.target.value })}
          className={inputClass}
        >
          <option value="">Todos los eventos</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.etiqueta}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">Autor</span>
        <select
          name="autor"
          value={actuales.autor}
          onChange={(e) => aplicar({ autor: e.target.value })}
          className={inputClass}
        >
          <option value="">Todos</option>
          {autores.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Notas desde
        </span>
        <input
          type="date"
          name="desde"
          value={actuales.desde}
          max={actuales.hasta || undefined}
          onChange={(e) => aplicar({ desde: e.target.value })}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Notas hasta
        </span>
        <input
          type="date"
          name="hasta"
          value={actuales.hasta}
          min={actuales.desde || undefined}
          onChange={(e) => aplicar({ hasta: e.target.value })}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col justify-end gap-1 sm:col-span-2 lg:col-span-1">
        <button
          type="button"
          onClick={() => {
            setActuales(VACIOS);
            startTransition(() => {
              router.replace("/admin/calendario?vista=notas", { scroll: false });
            });
          }}
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
