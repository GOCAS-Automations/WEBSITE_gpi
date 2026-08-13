import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { GaleriaAliados } from "@/components/sections/GaleriaAliados";
import { ValueCard } from "@/components/sections/ValueCard";
import { VisitCounter } from "@/components/sections/VisitCounter";
import { YouTubeFacade } from "@/components/sections/YouTubeFacade";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { CtaBand } from "@/components/sections/CtaBand";
import {
  getFaqs,
  getSettings,
  getValues,
  getVisitas,
  type FaqItem,
} from "@/lib/content";
import { iconMap, ArrowRight, Eye, Target } from "@/lib/icons";

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
  const [values, faq, settings, visitas] = await Promise.all([
    getValues(),
    getFaqs(),
    getSettings(),
    getVisitas(),
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

  /**
   * La ola del hero se pinta con el color de la sección que viene detrás. Las
   * dos primeras son blancas; si se apagan las dos, lo siguiente que puede
   * quedar arriba con fondo propio es la línea de tiempo (blanca) y, ya en el
   * peor caso, los valores (gris).
   */
  const olaHero = showQuienesSomos || showMisionVision || showLineaTiempo ? "white" : "mist";

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
        waveTone={olaHero}
      />

      {/* ---------------- QUIÉNES SOMOS ----------------
          Prototipo: foto del equipo en tarjeta redondeada a la izquierda y, a
          la derecha, el acento verde + título + párrafos. El contador de
          visitas acompaña a la foto (punto 6 del informe). */}
      {showQuienesSomos && (
        <section className="pb-16 pt-14 sm:pb-20 sm:pt-16">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
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
                <VisitCounter visitas={visitas} className="mt-5" />
              </Reveal>

              <Reveal delay={100}>
                <span
                  className="block h-1 w-14 rounded-full bg-brand"
                  aria-hidden="true"
                />
                <h2 className="mt-5 text-3xl font-extrabold leading-[1.12] text-ink sm:text-4xl">
                  {quienesSomos.titulo}
                </h2>
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

      {/* ---------------- MISIÓN Y VISIÓN ---------------- */}
      {showMisionVision && (
        <section className="pb-16 sm:pb-20">
          <Container>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { titulo: "Misión", texto: mision.texto, Icono: Target },
                { titulo: "Visión", texto: vision.texto, Icono: Eye },
              ].map(({ titulo, texto, Icono }, i) => (
                <Reveal key={titulo} delay={i * 100}>
                  <div className="flex h-full gap-5 rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card sm:p-7">
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white shadow-soft">
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

      {/* ---------------- GALERÍA: MÁS QUE PROVEEDORES ----------------
          La banda del prototipo: fondo verde a todo el ancho, tarjeta gris con
          el corte orgánico (esquina derecha muy redondeada) y la franja de
          fotos a su derecha, a altura completa. En móvil la tarjeta va arriba y
          las fotos debajo, en rejilla. */}
      {showGaleria && (
        <section className="relative isolate overflow-hidden bg-gradient-to-r from-brand-dark via-brand-dark to-brand-deep">
          <div className="grid lg:grid-cols-[minmax(0,30rem)_1fr]">
            <Reveal className="relative z-10 rounded-br-[3.5rem] bg-mist px-5 py-12 sm:px-8 sm:py-14 lg:rounded-r-[5rem] lg:py-16 lg:pl-10 lg:pr-16">
              <span
                className="block h-1 w-12 rounded-full bg-brand"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-2xl font-extrabold leading-[1.15] text-ink sm:text-3xl">
                {galeria.titulo}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-graphite">
                {galeria.descripcion}
              </p>
            </Reveal>

            {/* Con hasta 3 fotos es la franja estática de siempre; a partir de
                la cuarta pasa a carrusel (ver GaleriaAliados). */}
            <Reveal delay={120} className="p-3 sm:p-4 lg:p-4">
              <GaleriaAliados fotos={galeria.fotos} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------------- LÍNEA DE TIEMPO ---------------- */}
      {showLineaTiempo && (
        <section className="py-20 sm:py-24">
          <Container size="wide">
            <Reveal>
              <SectionHeading
                align="center"
                eyebrow={lineaTiempo.eyebrow}
                title={lineaTiempo.titulo}
                description={lineaTiempo.descripcion}
              />
            </Reveal>

            {/* Hitos. En escritorio, cuatro tarjetas con el icono asomando por
                arriba; en móvil, una columna con el rail vertical a la
                izquierda (mismo patrón, girado). */}
            <ol className="mt-14 grid gap-8 lg:mt-20 lg:grid-cols-4 lg:gap-5">
              {lineaTiempo.hitos.map((hito, i) => {
                const Icono = iconMap[hito.icono];
                const ultimo = i === lineaTiempo.hitos.length - 1;
                return (
                  <Reveal
                    as="li"
                    key={`${hito.fecha}-${hito.titulo}`}
                    delay={(i % 4) * 100}
                    className="relative flex gap-4 lg:block"
                  >
                    {/* Rail vertical (solo móvil) */}
                    <div
                      className="flex flex-col items-center lg:hidden"
                      aria-hidden="true"
                    >
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white shadow-card">
                        <Icono className="h-6 w-6" />
                      </span>
                      {!ultimo && (
                        <span className="-mb-8 mt-2 w-px flex-1 bg-line" />
                      )}
                    </div>

                    <div className="flex h-full flex-1 flex-col rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card lg:items-center lg:pb-6 lg:pt-9 lg:text-center">
                      <span className="-mt-16 hidden h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-white shadow-card lg:inline-flex">
                        <Icono className="h-7 w-7" />
                      </span>
                      <span className="inline-flex w-fit rounded-full bg-brand-dark px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white lg:mt-5">
                        {hito.fecha}
                      </span>
                      <h3 className="mt-3 text-base font-bold leading-snug text-ink lg:text-lg">
                        {hito.titulo}
                      </h3>
                      <span className="mt-3 h-px w-10 bg-brand" aria-hidden="true" />
                      <p className="mt-3 text-sm leading-relaxed text-graphite">
                        {hito.descripcion}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </ol>

            {/* Conector horizontal con puntos y flecha (el detalle más
                característico del prototipo). Decorativo: en móvil lo sustituye
                el rail vertical de cada tarjeta. */}
            <div
              className="relative mt-10 hidden h-4 items-center lg:flex"
              aria-hidden="true"
            >
              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-line" />
              <div
                className="relative grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${lineaTiempo.hitos.length}, minmax(0, 1fr))`,
                }}
              >
                {lineaTiempo.hitos.map((hito) => (
                  <div key={`punto-${hito.titulo}`} className="flex justify-center">
                    <span className="h-3.5 w-3.5 rounded-full bg-brand-dark ring-4 ring-white" />
                  </div>
                ))}
              </div>
              <ArrowRight className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite" />
            </div>

            {/* Etiquetas de cada etapa */}
            {lineaTiempo.etiquetas.length > 0 && (
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4">
                {lineaTiempo.etiquetas.map((etiqueta, i) => {
                  const Icono = iconMap[etiqueta.icono];
                  return (
                    <Reveal
                      as="li"
                      key={etiqueta.titulo}
                      delay={(i % 4) * 100}
                      className="flex gap-3"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                        <Icono className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">{etiqueta.titulo}</p>
                        <p className="mt-1 text-sm leading-relaxed text-graphite">
                          {etiqueta.descripcion}
                        </p>
                      </div>
                    </Reveal>
                  );
                })}
              </ul>
            )}
          </Container>
        </section>
      )}

      {/* ---------------- VALORES ---------------- */}
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

      {/* ---------------- VIDEO ---------------- */}
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

      {/* ---------------- FAQ ---------------- */}
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
