import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import type { ReactNode } from "react";

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
    <section className="on-dark relative isolate overflow-hidden bg-ink">
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
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} tone="light" className="mb-5" />}
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
