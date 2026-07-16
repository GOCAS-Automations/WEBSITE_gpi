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
import { values } from "@/data/values";
import { serviceCategories, getServicesByCategory } from "@/data/services";
import { iconMap, ArrowRight, Check } from "@/lib/icons";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden bg-ink">
        <Image
          src="/images/slides/1.jpg"
          alt="Ingeniero de GPI realizando mediciones de campo con equipo especializado"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/90 via-ink/72 to-brand-dark/70" />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent"
          aria-hidden="true"
        />
        <Container className="relative py-24">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-light" aria-hidden="true" />
              +5 años en el sector industrial-ambiental
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] text-white sm:text-6xl">
              Optimización de{" "}
              <span className="bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent">
                procesos
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
              Adaptamos los procesos a través de la integración de diferentes
              disciplinas, logrando eficiencia y rentabilidad sin exceder los
              límites de diseño y de seguridad.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/servicios" variant="primary" size="lg">
                Ver servicios
                <ArrowRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink href="/contacto" variant="white" size="lg">
                Contáctanos
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- INTRO / QUIÉNES SOMOS ---------------- */}
      <section className="py-20 sm:py-24">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeading
                eyebrow="Quiénes somos"
                title="Gestión estratégica y ejecución para su operación"
                description="Somos una empresa de gestión estratégica y ejecución, enfocada en generar rentabilidad y el cumplimiento de requisitos internos y externos a las compañías, basados en la mejora continua e integrando las variables de los modelos de negocio de cada organización."
              />
              <ul className="mt-6 space-y-3">
                {[
                  "Objetivo: lograr el 100% en el desempeño de nuestros clientes.",
                  "Integración de disciplinas industriales y ambientales.",
                  "Metodología basada en la mejora continua.",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-relaxed text-graphite">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <ButtonLink href="/nosotros" variant="outline">
                  Conócenos
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal delay={120} className="grid grid-cols-2 gap-4">
              {[
                { value: "+5", label: "años en el sector industrial-ambiental" },
                { value: "100%", label: "objetivo en el desempeño del cliente" },
                { value: "11", label: "servicios industriales y ambientales" },
                { value: "2", label: "grandes áreas: industrial y ambiental" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-line bg-mist p-6 shadow-soft"
                >
                  <p className="text-4xl font-extrabold text-brand-dark">{stat.value}</p>
                  <p className="mt-2 text-sm leading-snug text-graphite">{stat.label}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------------- CATEGORÍAS DE SERVICIOS ---------------- */}
      <section className="bg-mist py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Nuestros servicios"
              title="Dos áreas, una misma excelencia"
              description="Cubrimos las necesidades de los procesos industriales y acompañamos el cumplimiento y la gestión ambiental de su empresa."
            />
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {serviceCategories.map((cat, i) => {
              const CatIcon = iconMap[cat.icon];
              const catServices = getServicesByCategory(cat.id);
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
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand shadow-soft">
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
                      <div className="mt-7">
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
      <section className="py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Nuestros valores"
              title="Los principios que guían cada proyecto"
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

      {/* ---------------- BANDA EXCELENCIA ---------------- */}
      <section className="relative isolate overflow-hidden bg-ink py-20 sm:py-24">
        <div className="bg-dot-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl"
          aria-hidden="true"
        />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-light">
              Más de 5 años en el sector industrial-ambiental
            </p>
            <p className="mt-5 text-2xl font-bold leading-snug text-white sm:text-3xl">
              Trabajamos para lograr el 100% en el desempeño de nuestros
              clientes, siempre buscando la{" "}
              <span className="text-brand-light">EXCELENCIA</span>.
            </p>
            <div className="mt-8">
              <ButtonLink href="/proyectos" variant="white">
                Ver proyectos realizados
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- CLIENTES ---------------- */}
      <section className="py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Clientes"
              title="Empresas que confían en GPI"
              description="Nos respalda el trabajo realizado junto a compañías de distintos sectores."
            />
          </Reveal>
          <Reveal className="mt-12">
            <ClientLogos />
          </Reveal>
        </Container>
      </section>

      {/* ---------------- CTA FINAL ---------------- */}
      <CtaBand />
    </>
  );
}
