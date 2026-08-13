import { ContentImage } from "@/components/ui/ContentImage";
import Link from "next/link";
import type { Project } from "@/data/projects";
import { ArrowRight } from "@/lib/icons";

/**
 * Tarjeta de un proyecto en /proyectos.
 *
 * Toda la tarjeta es el enlace a su página de detalle (`/proyectos/<slug>`):
 * un solo destino para el clic, en vez de un enlace pequeño dentro de una zona
 * que ya parece pulsable. El diseño no cambia; solo se añaden el foco visible y
 * la flecha que aparece al pasar el cursor.
 */
export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card focus-within:ring-2 focus-within:ring-brand/40">
      <Link
        href={`/proyectos/${project.slug}`}
        className="block focus:outline-none"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <ContentImage
            src={project.image}
            alt={project.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            {project.client && (
              <span className="inline-flex rounded-full bg-brand-dark px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                {project.client}
              </span>
            )}
            <h3 className="mt-2 text-base font-bold leading-snug text-white">
              {project.title}
            </h3>
            <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-light opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
              Ver el proyecto
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
