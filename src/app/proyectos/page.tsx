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
    "Proyectos ejecutados por GPI en Cali: extracción de aire caliente, instalación de chiller, ampliación de bodega logística y montaje de planta piloto.",
  alternates: { canonical: "/proyectos" },
  openGraph: {
    title: "Proyectos realizados | GPI",
    description:
      "Extracción de aire caliente, instalación de chiller, ampliación de bodega logística y montaje de planta piloto en Cali.",
    url: "/proyectos",
    images: [
      {
        url: "/images/proyectos/13a.jpg",
        alt: "Planta piloto industrial con tanques y tuberías",
      },
    ],
  },
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

      <section className="py-20 sm:py-24" aria-labelledby="titulo-proyectos">
        <Container>
          {/* JERARQUÍA DE ENCABEZADOS: cada tarjeta usa <h3>, y sin un <h2>
              antes se saltaba un nivel desde el <h1> del hero (axe:
              heading-order). Este <h2> es invisible pero real: da nombre a la
              sección y cierra el salto sin tocar el diseño. */}
          <h2 id="titulo-proyectos" className="sr-only">
            Proyectos ejecutados por GPI
          </h2>
          <p className="mb-8 text-sm text-graphite">
            Pulse cualquier proyecto para ver su ficha completa.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project, i) => (
              <Reveal key={project.slug} delay={(i % 4) * 90}>
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
