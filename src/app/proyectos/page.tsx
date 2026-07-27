import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { getProjects, getSettings } from "@/lib/content";

export const metadata: Metadata = {
  title: "Proyectos realizados",
  description:
    "Algunos de los proyectos ejecutados por GPI en Cali: extracción de aire caliente, instalación de chiller, ampliación de bodega logística y montaje de planta piloto.",
  alternates: { canonical: "/proyectos" },
};

export const revalidate = 300;

export default async function ProyectosPage() {
  const [projects, settings] = await Promise.all([getProjects(), getSettings()]);

  return (
    <>
      <PageHero
        eyebrow="Proyectos"
        title="Proyectos que respaldan nuestra experiencia"
        description="Una muestra del trabajo ejecutado junto a nuestros clientes en el sector industrial y ambiental."
        image="/images/proyectos/13a.jpg"
        imageAlt="Planta piloto industrial con tanques y tuberías"
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Proyectos" }]}
      />

      <section className="py-20 sm:py-24">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project, i) => (
              <Reveal key={`${project.title}-${i}`} delay={(i % 4) * 90}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        contact={settings.contact}
        title="¿Quiere ser nuestro próximo caso de éxito?"
        description="Conversemos sobre su proyecto y construyamos juntos la solución."
      />
    </>
  );
}
