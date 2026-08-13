import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ValueCard } from "@/components/sections/ValueCard";
import { ClientLogos } from "@/components/sections/ClientLogos";
import { CtaBand } from "@/components/sections/CtaBand";
import { VisitCounter } from "@/components/sections/VisitCounter";
import { Wave } from "@/components/ui/Wave";
import {
  getClients,
  getServiceCategories,
  getServices,
  getSettings,
  getValues,
  getVisitas,
} from "@/lib/content";
import { iconMap, ArrowRight, Check } from "@/lib/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const revalidate = 300;

export default async function HomePage() {
  const [settings, services, values, clients, visitas] = await Promise.all([
    getSettings(),
    getServices(),
    getValues(),
    getClients(),
    getVisitas(),
  ]);
  const { hero, excellence, contact, visibility, home } = settings;
  const quienesSomos = home.quienesSomos;
  const categories = getServiceCategories();

  // Secciones que se pueden apagar desde el panel (/admin/inicio y
  // /admin/ajustes). También se ocultan solas si se quedan sin contenido.
  const showQuienesSomos = visibility.homeQuienesSomos;
  const showValues = visibility.valuesSection && values.length > 0;
  const showClients = visibility.clientsSection && clients.length > 0;

  /**
   * Tono de las olas: cada corte se pinta con el color de la sección que viene
   * después, y las secciones son opcionales. Se calcula aquí para que apagar
   * una sección desde el panel no deje una ola blanca sobre fondo gris.
   */
  const olaHero = showQuienesSomos ? "white" : "mist";
  const olaExcelencia = showValues ? "white" : "mist";

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      {/*
        OSCURECIDO (petición 3 del informe del 12 ago 2026): la foto tenía
        encima un degradado del 90 % y no se veía. Ahora va un velo uniforme
        suave + un degradado que solo carga a la izquierda, que es donde vive el
        texto; el lado derecho deja la fotografía a la vista. El titular suma
        `text-on-photo` para no depender solo del degradado.
      */}
      <section className="under-nav on-dark relative isolate flex min-h-[88vh] items-center overflow-hidden bg-ink">
        <Image
          src={hero.image}
          alt={hero.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/15" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/30 to-brand-deep/10"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent"
          aria-hidden="true"
        />
        <Container className="relative z-20 pb-32 pt-16 sm:pb-36 lg:pb-44">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-light" aria-hidden="true" />
              {hero.badge}
            </span>
            <h1 className="text-on-photo mt-6 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
              {hero.titleLead}{" "}
              <span className="text-brand-light">{hero.titleHighlight}</span>
            </h1>
            <p className="text-on-photo mt-6 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl">
              {hero.description}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={hero.primaryCtaHref} variant="primary" size="lg">
                {hero.primaryCtaLabel}
                <ArrowRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink href={hero.secondaryCtaHref} variant="white" size="lg">
                {hero.secondaryCtaLabel}
              </ButtonLink>
            </div>
          </div>
        </Container>
        <Wave tone={olaHero} gradientId="gpi-wave-hero-inicio" />
      </section>

      {/* ---------------- INTRO / QUIÉNES SOMOS ---------------- */}
      {/* Maquetación del prototipo (punto 5 del informe): texto y viñetas a la
          izquierda; a la derecha las cifras en rejilla 2×2 y, debajo y a todo
          el ancho, el recuadro del contador de visitas. */}
      {showQuienesSomos && (
        <section className="pb-20 pt-14 sm:pb-24 sm:pt-16">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <SectionHeading
                  eyebrow={quienesSomos.eyebrow}
                  title={quienesSomos.titulo}
                  description={quienesSomos.descripcion}
                />
                {quienesSomos.bullets.length > 0 && (
                  <ul className="mt-7 space-y-3.5">
                    {quienesSomos.bullets.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-deep">
                          <Check className="h-4 w-4" />
                        </span>
                        <span className="text-sm leading-relaxed text-graphite">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {quienesSomos.ctaLabel !== "" && (
                  <div className="mt-8">
                    <ButtonLink href={quienesSomos.ctaHref} variant="outline">
                      {quienesSomos.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </ButtonLink>
                  </div>
                )}
              </Reveal>

              <Reveal delay={120} className="grid grid-cols-2 gap-4">
                {quienesSomos.stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-line bg-mist p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card sm:p-6"
                  >
                    <p className="text-3xl font-extrabold text-brand-dark sm:text-4xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-sm leading-snug text-graphite">
                      {stat.label}
                    </p>
                  </div>
                ))}
                <VisitCounter visitas={visitas} className="col-span-2" />
              </Reveal>
            </div>
          </Container>
        </section>
      )}

      {/* ---------------- CATEGORÍAS DE SERVICIOS ---------------- */}
      <section className="bg-mist py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow={home.serviciosIntro.eyebrow}
              title={home.serviciosIntro.titulo}
              description={home.serviciosIntro.descripcion}
            />
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {categories.map((cat, i) => {
              const CatIcon = iconMap[cat.icon];
              const catServices = services.filter((s) => s.category === cat.id);
              return (
                <Reveal key={cat.id} delay={i * 120}>
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition-all duration-300 hover:shadow-card">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Image
                        src={cat.image}
                        alt={cat.imageAlt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-dark shadow-soft">
                          <CatIcon className="h-6 w-6" />
                        </span>
                        <h3 className="text-xl font-bold text-white">{cat.name}</h3>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-6 sm:p-8">
                      <p className="text-sm leading-relaxed text-graphite">
                        {cat.description}
                      </p>
                      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                        {catServices.map((svc) => (
                          <li key={svc.slug}>
                            <Link
                              href={`/servicios/${svc.slug}`}
                              className="flex items-center gap-2 rounded-lg py-1 text-sm font-medium text-ink-soft transition-colors hover:text-brand-dark"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                              {svc.navTitle}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-7">
                        <ButtonLink href="/servicios" variant="outline">
                          Ver {cat.name.toLowerCase()}
                          <ArrowRight className="h-4 w-4" />
                        </ButtonLink>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ---------------- VALORES ---------------- */}
      {showValues && (
        <section className="py-20 sm:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow={home.valoresIntro.eyebrow}
                title={home.valoresIntro.titulo}
                description={home.valoresIntro.descripcion || undefined}
              />
            </Reveal>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((value, i) => (
                <Reveal key={value.title} delay={(i % 3) * 100}>
                  <ValueCard value={value} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ---------------- BANDA EXCELENCIA ---------------- */}
      {/* Segundo corte de ola del inicio: la sección clara entra en la banda
          oscura sin línea dura. */}
      <section className="on-dark relative isolate overflow-hidden bg-ink pb-20 pt-28 sm:pb-24 sm:pt-36 lg:pt-44">
        <div className="bg-dot-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl"
          aria-hidden="true"
        />
        <Wave
          position="top"
          tone={olaExcelencia}
          gradientId="gpi-wave-excelencia"
        />
        <Container className="relative z-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-light">
              {excellence.eyebrow}
            </p>
            <p className="mt-5 text-2xl font-bold leading-snug text-white sm:text-3xl">
              {excellence.messageLead}{" "}
              <span className="text-brand-light">{excellence.messageHighlight}</span>.
            </p>
            <div className="mt-8">
              <ButtonLink href={excellence.ctaHref} variant="white">
                {excellence.ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- CLIENTES ----------------
          Título aprobado por GPI el 12 ago 2026 (punto 4 del informe:
          «Portafolio de clientes», con los logos a color) y editable desde
          /admin/inicio desde la migración 0008. */}
      {showClients && (
        <section className="py-20 sm:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow={home.clientes.eyebrow}
                title={home.clientes.titulo}
                description={home.clientes.descripcion || undefined}
              />
            </Reveal>
            <Reveal className="mt-12">
              <ClientLogos clients={clients} />
            </Reveal>
          </Container>
        </section>
      )}

      {/* ---------------- CTA FINAL ---------------- */}
      <CtaBand
        contact={contact}
        title={home.cta.titulo}
        description={home.cta.descripcion}
      />
    </>
  );
}
