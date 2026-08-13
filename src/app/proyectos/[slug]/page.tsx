import type { Metadata } from "next";
import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/sections/PageHero";
import { CtaBand } from "@/components/sections/CtaBand";
import { projects as staticProjects, type Project } from "@/data/projects";
import { getProjects, getSettings, whatsappLink } from "@/lib/content";
import { JsonLd, ORGANIZATION_ID, SITE_URL } from "@/components/seo/JsonLd";
import { ArrowLeft, ArrowRight, Building, WhatsApp } from "@/lib/icons";

type Params = { slug: string };

const CATEGORIAS: Record<Project["category"], string> = {
  industrial: "Proyecto industrial",
  ambiental: "Proyecto ambiental",
};

/**
 * Pre-genera los proyectos conocidos. Con `dynamicParams = true` (valor por
 * defecto) los proyectos nuevos creados desde /admin se renderizan bajo demanda,
 * igual que los servicios.
 */
export function generateStaticParams(): Params[] {
  return staticProjects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = true;
export const revalidate = 300;

/** Descripción para buscadores y redes: la larga si la hay, si no la corta. */
function resumen(project: Project): string {
  const texto = project.details?.trim() || project.description?.trim() || "";
  if (texto !== "") return texto.slice(0, 300);
  return `${project.title}${
    project.client ? `, ejecutado para ${project.client}` : ""
  }. Un proyecto de GPI en Cali, Colombia.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const projects = await getProjects();
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};

  const description = resumen(project);

  return {
    title: project.title,
    description,
    alternates: { canonical: `/proyectos/${project.slug}` },
    openGraph: {
      title: `${project.title} | GPI`,
      description,
      url: `/proyectos/${project.slug}`,
      images: [{ url: project.image, alt: project.imageAlt }],
    },
  };
}

/**
 * Datos estructurados del proyecto.
 *
 * `CreativeWork` es el tipo natural para una ficha de portafolio: describe un
 * trabajo realizado, no un servicio que se ofrece (eso ya lo cubre `Service` en
 * /servicios/[slug]). El autor se referencia por `@id` a la Organization del
 * layout raíz en vez de repetirla. El `BreadcrumbList` lo emite el propio
 * componente de breadcrumbs del hero.
 */
function ProjectJsonLd({ project }: { project: Project }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "@id": `${SITE_URL}/proyectos/${project.slug}#proyecto`,
        name: project.title,
        description: resumen(project),
        url: `${SITE_URL}/proyectos/${project.slug}`,
        image: `${SITE_URL}${project.image}`,
        creator: { "@id": ORGANIZATION_ID },
        genre: CATEGORIAS[project.category],
        ...(project.client ? { sourceOrganization: project.client } : {}),
        isPartOf: {
          "@type": "CollectionPage",
          name: "Proyectos realizados por GPI",
          url: `${SITE_URL}/proyectos`,
        },
      }}
    />
  );
}

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [projects, settings] = await Promise.all([getProjects(), getSettings()]);
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  const descripcion = project.details?.trim() || project.description?.trim() || "";
  const parrafos = descripcion.split(/\n{2,}/).filter((p) => p.trim() !== "");

  const mensaje = `Hola GPI, vi el proyecto "${project.title}" en su sitio y quiero algo similar.`;

  const indice = projects.findIndex((p) => p.slug === project.slug);
  const anterior = indice > 0 ? projects[indice - 1] : undefined;
  const siguiente =
    indice >= 0 && indice < projects.length - 1 ? projects[indice + 1] : undefined;

  return (
    <>
      <ProjectJsonLd project={project} />
      <PageHero
        eyebrow={CATEGORIAS[project.category]}
        title={project.title}
        description={project.description}
        image={project.image}
        imageAlt={project.imageAlt}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Proyectos", href: "/proyectos" },
          { label: project.title },
        ]}
      />

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
            {/* Contenido principal */}
            <div className="min-w-0">
              {/* Ficha corta: cliente y categoría, si los hay */}
              <dl className="flex flex-wrap gap-3">
                {project.client && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 shadow-soft">
                    <Building className="h-4 w-4 shrink-0 text-brand-dark" />
                    <dt className="text-xs font-semibold uppercase tracking-wide text-graphite">
                      Cliente
                    </dt>
                    <dd className="text-sm font-bold text-ink">{project.client}</dd>
                  </div>
                )}
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 shadow-soft">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-graphite">
                    Área
                  </dt>
                  <dd className="text-sm font-bold text-ink">
                    {CATEGORIAS[project.category]}
                  </dd>
                </div>
              </dl>

              <h2 className="mt-8 text-2xl font-extrabold text-ink">
                Sobre este proyecto
              </h2>

              {parrafos.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {parrafos.map((parrafo, i) => (
                    <p key={i} className="text-base leading-relaxed text-ink-soft">
                      {parrafo}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-base leading-relaxed text-ink-soft">
                  Uno de los trabajos ejecutados por el equipo de GPI. Escríbanos
                  y le contamos el alcance completo de esta intervención.
                </p>
              )}

              {/* Imagen principal a tamaño completo */}
              <figure className="mt-8">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line shadow-soft">
                  <ContentImage
                    src={project.image}
                    alt={project.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-xs text-graphite">
                  {project.imageAlt}
                </figcaption>
              </figure>

              {/* Galería */}
              {project.gallery && project.gallery.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-lg font-bold text-ink">Galería</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {project.gallery.map((img) => (
                      <div
                        key={img.src}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-soft"
                      >
                        <ContentImage
                          src={img.src}
                          alt={img.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, 45vw"
                          className="object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA WhatsApp inline */}
              <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-brand-tint p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-ink">
                    ¿Tiene un proyecto similar?
                  </p>
                  <p className="mt-1 text-sm text-graphite">
                    Cuéntenos qué necesita y le preparamos una propuesta.
                  </p>
                </div>
                <ButtonLink
                  href={whatsappLink(settings.contact.primaryWhatsApp, mensaje)}
                  variant="primary"
                  size="lg"
                  className="shrink-0"
                >
                  <WhatsApp className="h-5 w-5" />
                  Contáctanos
                </ButtonLink>
              </div>
            </div>

            {/* Barra lateral con el resto del portafolio. Va como <div> y no
                como <aside>: dentro de <main> sería un landmark
                "complementary" anidado (axe:
                landmark-complementary-is-top-level). */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-dark">
                  Otros proyectos
                </h2>
                <ul className="mt-4 space-y-1">
                  {projects.map((p) => {
                    const activo = p.slug === project.slug;
                    return (
                      <li key={p.slug}>
                        <Link
                          href={`/proyectos/${p.slug}`}
                          aria-current={activo ? "page" : undefined}
                          className={`block rounded-xl px-3 py-2 text-sm leading-snug transition-colors ${
                            activo
                              ? "bg-brand-tint font-semibold text-brand-deep"
                              : "text-ink-soft hover:bg-mist"
                          }`}
                        >
                          {p.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-5 rounded-2xl bg-ink p-6 text-white">
                <p className="text-base font-bold">¿Necesita algo parecido?</p>
                <p className="mt-1.5 text-sm text-white/70">
                  Nuestro equipo le asesora para encontrar la mejor solución.
                </p>
                <ButtonLink href="/contacto" variant="primary" className="mt-4 w-full">
                  Contáctanos
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Navegación entre proyectos (anterior / todos / siguiente) */}
      <section className="border-t border-line bg-mist py-10 sm:py-12">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3 sm:items-stretch">
            {anterior ? (
              <Link
                href={`/proyectos/${anterior.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
              >
                <ArrowLeft className="h-5 w-5 shrink-0 text-graphite transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-brand-dark" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                    Proyecto anterior
                  </p>
                  <p className="truncate text-sm font-bold text-ink group-hover:text-brand-dark">
                    {anterior.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div aria-hidden="true" className="hidden sm:block" />
            )}

            <Link
              href="/proyectos"
              className="flex items-center justify-center rounded-2xl border border-line bg-white p-5 text-center text-sm font-semibold text-ink-soft shadow-soft transition-colors duration-200 hover:border-brand/40 hover:text-brand-dark"
            >
              Todos los proyectos
            </Link>

            {siguiente ? (
              <Link
                href={`/proyectos/${siguiente.slug}`}
                className="group flex items-center justify-end gap-3 rounded-2xl border border-line bg-white p-5 text-right shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                    Siguiente proyecto
                  </p>
                  <p className="truncate text-sm font-bold text-ink group-hover:text-brand-dark">
                    {siguiente.title}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-graphite transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-dark" />
              </Link>
            ) : (
              <div aria-hidden="true" className="hidden sm:block" />
            )}
          </div>
        </Container>
      </section>

      <CtaBand
        contact={settings.contact}
        title="¿Tiene un proyecto similar? Contáctenos"
        description="Conversemos sobre lo que necesita y construyamos juntos la solución."
        whatsappMessage={mensaje}
      />
    </>
  );
}
