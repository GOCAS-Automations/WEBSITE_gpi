import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  image?: string;
  imageAlt?: string;
  breadcrumbs?: Crumb[];
}

export function PageHero({
  eyebrow,
  title,
  description,
  image = "/images/slides/2.jpg",
  imageAlt = "",
  breadcrumbs,
}: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden bg-ink">
      <Image
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/70 to-brand-dark/75" />
      <Container className="relative py-16 sm:py-20 lg:py-24">
        {breadcrumbs && (
          <nav aria-label="Ruta de navegación" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-white/60">
              {breadcrumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {c.href ? (
                    <Link href={c.href} className="transition-colors hover:text-brand-light">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white/85">{c.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <span aria-hidden="true">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-light">
            <span className="h-px w-6 bg-current" aria-hidden="true" />
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            {description}
          </p>
        )}
      </Container>
    </section>
  );
}
