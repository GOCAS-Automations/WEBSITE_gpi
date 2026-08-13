import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import type { Service } from "@/data/services";
import { iconMap, ArrowRight } from "@/lib/icons";

export function ServiceCard({ service }: { service: Service }) {
  const Icon = iconMap[service.icon];
  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <ContentImage
          src={service.cover}
          alt={service.coverAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-ink/5 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 text-brand-dark shadow-soft backdrop-blur">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold leading-snug text-ink transition-colors group-hover:text-brand-dark">
          {service.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-graphite">
          {service.excerpt}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
          Ver servicio
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
