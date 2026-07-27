import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { ServiceCard } from "@/components/sections/ServiceCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { getServiceCategories, getServices, getSettings } from "@/lib/content";
import { iconMap } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Servicios industriales y ambientales",
  description:
    "Conoce los servicios de GPI en Cali: automatización y control, sistemas eléctricos, seguridad de maquinaria, análisis energético, gestión ambiental, cumplimiento legal, recurso hídrico e ISO 14001.",
  alternates: { canonical: "/servicios" },
};

export const revalidate = 300;

export default async function ServiciosPage() {
  const [services, settings] = await Promise.all([getServices(), getSettings()]);
  const categories = getServiceCategories();

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Soluciones industriales y ambientales a la medida"
        description="Integramos diferentes disciplinas para optimizar sus procesos y acompañar el cumplimiento normativo de su empresa. Estos son nuestros servicios."
        image="/images/servicios/s1.jpg"
        imageAlt="Planta industrial con estructuras metálicas y tuberías"
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Servicios" }]}
      />

      {categories.map((cat, index) => {
        const CatIcon = iconMap[cat.icon];
        const catServices = services.filter((s) => s.category === cat.id);
        return (
          <section
            key={cat.id}
            id={cat.id}
            className={`py-20 sm:py-24 ${index % 2 === 1 ? "bg-mist" : ""}`}
          >
            <Container>
              <Reveal>
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
                    <CatIcon className="h-6 w-6" />
                  </span>
                  <SectionHeading title={cat.name} description={cat.description} />
                </div>
              </Reveal>
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {catServices.map((service, i) => (
                  <Reveal key={service.slug} delay={(i % 3) * 100}>
                    <ServiceCard service={service} />
                  </Reveal>
                ))}
              </div>
            </Container>
          </section>
        );
      })}

      <CtaBand
        contact={settings.contact}
        title="¿No sabe por dónde empezar?"
        description="Escríbanos y le ayudamos a identificar el servicio que mejor responde a su necesidad."
      />
    </>
  );
}
