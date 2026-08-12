import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { ValueCard } from "@/components/sections/ValueCard";
import { YouTubeFacade } from "@/components/sections/YouTubeFacade";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { CtaBand } from "@/components/sections/CtaBand";
import { getFaqs, getSettings, getValues, type FaqItem } from "@/lib/content";
import { iconMap, Eye, Target } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce a GPI: gestión estratégica y ejecución con más de 15 años optimizando procesos industriales y ambientales en el Valle del Cauca. Trayectoria, valores y preguntas frecuentes.",
  alternates: { canonical: "/nosotros" },
  openGraph: {
    title: "Nosotros | GPI",
    description:
      "Empresa de gestión estratégica y ejecución con más de 15 años optimizando procesos industriales y ambientales en el Valle del Cauca.",
    url: "/nosotros",
    images: [
      {
        url: "/images/cm/foto-equipo-gpi-sede.jpg",
        alt: "Equipo de GPI reunido en la sede de la empresa",
      },
    ],
  },
};

export const revalidate = 300;

function FaqJsonLd({ faq }: { faq: FaqItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default async function NosotrosPage() {
  const [values, faq, settings] = await Promise.all([
    getValues(),
    getFaqs(),
    getSettings(),
  ]);
  const { youtube, contact, visibility, nosotros } = settings;
  const { hero, quienesSomos, mision, vision, galeria, lineaTiempo, valoresIntro, cta } =
    nosotros;

  // Interruptores de /admin/nosotros. Los de esta página se combinan con el
  // interruptor global de /admin/ajustes cuando la sección también sale en el
  // inicio (los valores) o cuando existe la clave antigua (video y FAQ).
  const showQuienesSomos = visibility.nosotrosQuienesSomos;
  const showMisionVision = visibility.nosotrosMisionVision;
  const showGaleria = visibility.nosotrosGaleria && galeria.fotos.length > 0;
  const showLineaTiempo =
    visibility.nosotrosLineaTiempo && lineaTiempo.hitos.length > 0;
  const showValues =
    visibility.valuesSection && visibility.nosotrosValores && values.length > 0;
  const showVideo =
    visibility.videoSection && visibility.nosotrosVideo && youtube.id !== "";
  const showFaq = visibility.faqSection && visibility.nosotrosFaq && faq.length > 0;

  return (
    <>
      {/* El marcado FAQPage solo se emite si la sección está visible: no se le
          promete a Google contenido que la página no muestra. */}
      {showFaq && <FaqJsonLd faq={faq} />}
      <PageHero
        eyebrow="Nosotros"
        title={hero.titulo}
        description={hero.descripcion}
        image={hero.imagen.url}
        imageAlt={hero.imagen.alt}
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Nosotros" }]}
      />

      {/* Quiénes Somos */}
      {showQuienesSomos && (
        <section className="py-20 sm:py-24">
          <Container>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <Reveal className="relative">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line shadow-card">
                  <Image
                    src={quienesSomos.imagen.url}
                    alt={quienesSomos.imagen.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </Reveal>

              <Reveal delay={100}>
                <SectionHeading eyebrow="Nosotros" title={quienesSomos.titulo} />
                <div className="mt-6 space-y-4">
                  {quienesSomos.parrafos.map((parrafo) => (
                    <p key={parrafo} className="text-base leading-relaxed text-graphite">
                      {parrafo}
                    </p>
                  ))}
                </div>
              </Reveal>
            </div>
          </Container>
        </section>
      )}

      {/* Misión y Visión */}
      {showMisionVision && (
        <section className="pb-20 sm:pb-24">
          <Container>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { titulo: "Misión", texto: mision.texto, Icono: Target },
                { titulo: "Visión", texto: vision.texto, Icono: Eye },
              ].map(({ titulo, texto, Icono }, i) => (
                <Reveal key={titulo} delay={i * 100}>
                  <div className="flex h-full gap-5 rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-7">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white">
                      <Icono className="h-7 w-7" />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-brand-deep">
                        {titulo}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-graphite">
                        {texto}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Galería: más que proveedores, somos aliados estratégicos */}
      {showGaleria && (
        <section className="bg-mist py-20 sm:py-24">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,22rem)_1fr]">
              <Reveal>
                <SectionHeading
                  title={galeria.titulo}
                  description={galeria.descripcion}
                />
              </Reveal>
              <Reveal delay={120}>
                <div className="grid gap-4 sm:grid-cols-3">
                  {galeria.fotos.map((foto) => (
                    <div
                      key={foto.url}
                      className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line shadow-soft"
                    >
                      <Image
                        src={foto.url}
                        alt={foto.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </Container>
        </section>
      )}

      {/* Línea de tiempo empresarial */}
      {showLineaTiempo && (
        <section className="py-20 sm:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow={lineaTiempo.eyebrow}
                title={lineaTiempo.titulo}
                description={lineaTiempo.descripcion}
              />
            </Reveal>

            {/* Hitos */}
            <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {lineaTiempo.hitos.map((hito, i) => {
                const Icono = iconMap[hito.icono];
                return (
                  <Reveal key={`${hito.fecha}-${hito.titulo}`} delay={(i % 4) * 100}>
                    <li className="flex h-full flex-col items-center rounded-2xl border border-line bg-white px-5 pb-6 pt-9 text-center shadow-soft">
                      <span className="-mt-16 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-white shadow-card">
                        <Icono className="h-7 w-7" />
                      </span>
                      <span className="mt-5 inline-flex rounded-full bg-brand-dark px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                        {hito.fecha}
                      </span>
                      <h3 className="mt-3 text-lg font-bold leading-snug text-ink">
                        {hito.titulo}
                      </h3>
                      <span className="mt-3 h-px w-10 bg-brand" aria-hidden="true" />
                      <p className="mt-3 text-sm leading-relaxed text-graphite">
                        {hito.descripcion}
                      </p>
                    </li>
                  </Reveal>
                );
              })}
            </ol>

            {/* Etiquetas de cada etapa */}
            {lineaTiempo.etiquetas.length > 0 && (
              <>
                <div
                  className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-graphite/40 to-transparent"
                  aria-hidden="true"
                />
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {lineaTiempo.etiquetas.map((etiqueta, i) => {
                    const Icono = iconMap[etiqueta.icono];
                    return (
                      <Reveal key={etiqueta.titulo} delay={(i % 4) * 100}>
                        <li className="flex gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                            <Icono className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-sm font-bold text-ink">
                              {etiqueta.titulo}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-graphite">
                              {etiqueta.descripcion}
                            </p>
                          </div>
                        </li>
                      </Reveal>
                    );
                  })}
                </ul>
              </>
            )}
          </Container>
        </section>
      )}

      {/* Valores */}
      {showValues && (
        <section className="bg-mist py-20 sm:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow={valoresIntro.eyebrow}
                title={valoresIntro.titulo}
                description={valoresIntro.descripcion}
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

      {/* Video de servicios */}
      {showVideo && (
        <section className="py-20 sm:py-24">
          <Container size="narrow">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow={youtube.sectionEyebrow}
                title={youtube.sectionTitle}
                description={youtube.sectionDescription}
              />
            </Reveal>
            <Reveal className="mt-10">
              <YouTubeFacade id={youtube.id} title={youtube.title} />
            </Reveal>
          </Container>
        </section>
      )}

      {/* FAQ */}
      {showFaq && (
        <section className="bg-mist py-20 sm:py-24">
          <Container size="narrow">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow="Preguntas frecuentes"
                title="Resolvemos tus dudas"
              />
            </Reveal>
            <Reveal className="mt-10">
              <FaqAccordion items={faq} />
            </Reveal>
          </Container>
        </section>
      )}

      <CtaBand
        contact={contact}
        title={cta.titulo}
        description={cta.descripcion}
      />
    </>
  );
}
