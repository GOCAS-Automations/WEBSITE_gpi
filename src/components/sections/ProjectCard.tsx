import Image from "next/image";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
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
        </div>
      </div>
    </article>
  );
}
