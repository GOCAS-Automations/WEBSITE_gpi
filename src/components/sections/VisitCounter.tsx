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
 * NO se edita desde el panel a propósito: lo cuenta el sitio solo. Y devuelve
 * `null` cuando la tabla no existe (migración 0007 sin aplicar), porque enseñar
 * "0 visitas" se lee como un sitio que nadie visita — peor que no enseñar nada.
 */
export function VisitCounter({
  visitas,
  className = "",
}: {
  visitas: Visitas;
  className?: string;
}) {
  if (!visitas.disponible) return null;

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-brand/40 bg-brand-tint p-5 shadow-soft sm:p-6 ${className}`}
    >
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white shadow-soft">
        <Eye className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-3xl font-extrabold leading-none text-brand-deep sm:text-4xl">
          {visitas.formateado}
        </p>
        {/* Concordancia: con una sola visita la etiqueta va en singular, que si
            no se lee «1 visitas al sitio web». La constante compartida sigue
            siendo la del plural (es la que describe la tarjeta en el panel). */}
        <p className="mt-1.5 text-sm leading-snug text-graphite">
          {visitas.total === 1 ? "visita al sitio web" : ETIQUETA_VISITAS}
        </p>
      </div>
    </div>
  );
}
