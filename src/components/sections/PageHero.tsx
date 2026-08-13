import { ContentImage } from "@/components/ui/ContentImage";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Wave } from "@/components/ui/Wave";
import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  image?: string;
  imageAlt?: string;
  breadcrumbs?: Crumb[];
  /** Color de la sección que va justo debajo, para que la ola encaje. */
  waveTone?: "white" | "mist";
}

/**
 * Cabecera de las páginas interiores.
 *
 * Dos decisiones del rediseño del 12 ago 2026:
 *  · `under-nav` mete el hero POR DEBAJO de la píldora flotante (el relleno
 *    superior lo pone la propia clase, ver globals.css).
 *  · El oscurecido bajó mucho: la foto ya no va al 45 % de opacidad tapada por
 *    un degradado del 85 %, sino a plena opacidad con un velo ligero. El texto
 *    blanco se apoya en el degradado lateral (donde vive) y en `text-on-photo`.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  image = "/images/slides/2.jpg",
  imageAlt = "",
  breadcrumbs,
  waveTone = "white",
}: PageHeroProps) {
  return (
    <section className="under-nav on-dark relative isolate overflow-hidden bg-ink">
      <ContentImage
        src={image}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Velo uniforme: unifica fotos claras y oscuras sin apagarlas. */}
      <div className="absolute inset-0 bg-ink/22" aria-hidden="true" />
      {/*
        El texto ocupa el 60 % izquierdo del hero, así que el degradado
        mantiene el cuerpo hasta la mitad y se abre después: la fotografía se
        ve (que era la petición) sin que el titular caiga sobre un cielo
        quemado. Los topes están MEDIDOS contra las fotos reales del sitio —
        `/servicios` y `/proyectos` son las críticas, con cielo despejado
        justo detrás del H1.
      */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/60 via-50% to-brand-deep/10"
        aria-hidden="true"
      />
      <Container className="relative z-20 pb-24 pt-10 sm:pb-28 sm:pt-12 lg:pb-36 lg:pt-14">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} tone="light" className="mb-5" />}
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-light">
            <span className="h-px w-6 bg-current" aria-hidden="true" />
            {eyebrow}
          </span>
        )}
        <h1 className="text-on-photo mt-3 max-w-3xl text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="text-on-photo mt-5 max-w-2xl text-lg leading-relaxed text-white/90">
            {description}
          </p>
        )}
      </Container>
      <Wave tone={waveTone} gradientId="gpi-wave-hero" />
    </section>
  );
}
