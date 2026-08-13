"use client";

import { useEffect, useState } from "react";
import { ETIQUETA_VISITAS } from "@/data/site";
import type { Visitas } from "@/lib/content";
import { Eye } from "@/lib/icons";

/**
 * Tarjeta del contador de visitas (petición 5 y 6 del informe del 12 ago 2026).
 *
 * Se pinta en el "Quiénes somos" del inicio y en el de Nosotros, con el mismo
 * aspecto en los dos sitios: es el recuadro verde que el community manager
 * dibujó vacío en el prototipo.
 *
 * TAMAÑO: es un **chip**, no una tarjeta. La primera versión usaba el tamaño de
 * las tarjetas de cifras (p-5/p-6, número de 36 px) y GPI lo vio desproporcionado
 * para un dato que es un guiño, no un titular. Aquí el número baja a 20/24 px y
 * el recuadro a 12/16 px de relleno, que es justo lo que necesita para convivir
 * con el sello de años de experiencia en la página Nosotros sin amontonarse.
 *
 * NO se edita desde el panel a propósito: lo cuenta el sitio solo. Y devuelve
 * `null` cuando la tabla no existe (migración 0007 sin aplicar), porque enseñar
 * "0 visitas" se lee como un sitio que nadie visita — peor que no enseñar nada.
 *
 * EL NÚMERO SE REFRESCA EN EL NAVEGADOR
 * -------------------------------------
 * Las páginas que la muestran son estáticas con ISR de 5 minutos, así que el
 * total que viene en el HTML puede estar viejo — GPI notó que su propia visita
 * no aparecía. La cifra servida se pinta igual (no hay hueco ni "cargando…") y,
 * al montar, se pide el total en vivo a `GET /api/visita`.
 *
 * Dos detalles que evitan que se vea feo:
 *   · Solo se llama si el servidor dijo `disponible`. Si la migración está
 *     pendiente, la tarjeta no existe y no hay nada que refrescar.
 *   · El estado solo se actualiza **si el número cambió**. Igualar un valor a sí
 *     mismo provocaría un repintado y, con él, un parpadeo gratuito.
 */
export function VisitCounter({
  visitas,
  className = "",
}: {
  visitas: Visitas;
  className?: string;
}) {
  const [total, setTotal] = useState(visitas.total);
  const [formateado, setFormateado] = useState(visitas.formateado);

  const servidas = visitas.total;
  const disponible = visitas.disponible;

  useEffect(() => {
    if (!disponible) return;

    // `cancelado` evita escribir en un componente ya desmontado si el visitante
    // navega mientras la petición está en vuelo.
    let cancelado = false;

    void fetch("/api/visita", { cache: "no-store" })
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos: Visitas | null) => {
        if (cancelado || !datos?.disponible) return;
        if (typeof datos.total !== "number" || datos.total === servidas) return;
        setTotal(datos.total);
        setFormateado(datos.formateado);
      })
      .catch(() => {
        /* Silencio a propósito: la cifra del servidor sigue en pantalla. */
      });

    return () => {
      cancelado = true;
    };
  }, [disponible, servidas]);

  if (!disponible) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand-tint px-4 py-3 shadow-soft ${className}`}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white shadow-soft">
        <Eye className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <div className="min-w-0">
        {/* `aria-live="polite"` para que el lector de pantalla anuncie el
            número corregido en vez de quedarse con el del HTML inicial. */}
        <p
          aria-live="polite"
          className="text-xl font-extrabold leading-none text-brand-deep sm:text-2xl"
        >
          {formateado}
        </p>
        {/* Concordancia: con una sola visita la etiqueta va en singular, que si
            no se lee «1 visitas al sitio web». La constante compartida sigue
            siendo la del plural (es la que describe la tarjeta en el panel). */}
        <p className="mt-0.5 text-xs leading-snug text-graphite">
          {total === 1 ? "visita al sitio web" : ETIQUETA_VISITAS}
        </p>
      </div>
    </div>
  );
}
