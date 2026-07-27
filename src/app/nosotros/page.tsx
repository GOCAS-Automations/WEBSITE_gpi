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
import { Check } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce a GPI: empresa de gestión estratégica y ejecución con más de 5 años optimizando procesos industriales y ambientales en Cali. Nuestros valores, video corporativo y preguntas frecuentes.",
  alternates: { canonical: "/nosotros" },
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
  const { youtube, contact } = settings;

  return (
    <>
      <FaqJsonLd faq={faq} />
      <PageHero
        eyebrow="Nosotros"
        title="Optimizamos procesos, generamos rentabilidad"
        description="Somos una empresa de gestión estratégica y ejecución, enfocada en el desempeño y el cumplimiento de nuestros clientes."
        image="/images/slides/2.jpg"
        imageAlt="Profesional de GPI realizando mediciones ambientales en campo"
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Nosotros" }]}
      />

      {/* Quiénes somos */}
      <section className="py-20 sm:py-24">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line shadow-card">
                <Image
                  src="/images/servicios/s1.jpg"
                  alt="Planta industrial optimizada por GPI"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-4 hidden rounded-2xl bg-brand px-6 py-5 text-white shadow-card sm:block">
                <p className="text-3xl font-extrabold">+5</p>
                <p className="text-xs font-medium uppercase tracking-wide text-white/85">
                  años de experiencia
                </p>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <SectionHeading
                eyebrow="Quiénes somos"
                title="Una alianza para la mejora continua de su empresa"
                description="Empresa de gestión estratégica y ejecución, enfocada en generar rentabilidad y cumplimiento de requisitos internos y externos a las compañías, basados en la mejora continua, integrando las variables de los modelos de negocio de cada organización."
              />
              <ul className="mt-6 space-y-3">
                {[
                  "Más de 5 años en el sector industrial-ambiental.",
                  "Objetivo: lograr el 100% en el desempeño de nuestros clientes.",
                  "Siempre buscando la EXCELENCIA en cada propuesta y ejecución.",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-relaxed text-graphite">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Valores */}
      <section className="bg-mist py-20 sm:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              align="center"
              eyebrow="Nuestros valores"
              title="Lo que nos define"
              description="Seis principios que están presentes en cada propuesta y ejecución de valor para nuestros clientes."
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

      {/* Video de servicios */}
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

      {/* FAQ */}
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

      <CtaBand contact={contact} />
    </>
  );
}
