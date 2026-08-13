import type { Metadata } from "next";
import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/sections/PageHero";
import { CtaBand } from "@/components/sections/CtaBand";
import { YouTubeFacade } from "@/components/sections/YouTubeFacade";
import { services as staticServices, getCategory } from "@/data/services";
import { whatsappLink } from "@/data/contact";
import { getService, getServices, getSettings } from "@/lib/content";
import { JsonLd, ORGANIZATION_ID, SITE_URL } from "@/components/seo/JsonLd";
import { iconMap, Check, ArrowLeft, ArrowRight, WhatsApp } from "@/lib/icons";
import type { Service } from "@/data/services";

type Params = { slug: string };

/**
 * Pre-genera los 11 servicios conocidos. Con `dynamicParams = true` (valor por
 * defecto) los slugs nuevos creados desde /admin se renderizan bajo demanda.
 */
export function generateStaticParams(): Params[] {
  return staticServices.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = true;
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return {};

  return {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical: `/servicios/${service.slug}` },
    openGraph: {
      title: `${service.metaTitle} | GPI`,
      description: service.metaDescription,
      url: `/servicios/${service.slug}`,
      images: [{ url: service.cover, alt: service.coverAlt }],
    },
  };
}

/**
 * Datos estructurados `Service` de cada servicio.
 *
 * El proveedor no se repite: se referencia por `@id` a la Organization que ya
 * declara el layout raíz, así Google une los dos nodos en un mismo grafo.
 * `hasOfferCatalog` expone los ítems del servicio, que es el contenido real de
 * la página («¿Qué incluye este servicio?»).
 */
function ServiceJsonLd({
  service,
  categoryName,
}: {
  service: Service;
  categoryName: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        "@id": `${SITE_URL}/servicios/${service.slug}#service`,
        name: service.title,
        description: service.metaDescription,
        serviceType: categoryName,
        category: categoryName,
        url: `${SITE_URL}/servicios/${service.slug}`,
        image: `${SITE_URL}${service.cover}`,
        provider: { "@id": ORGANIZATION_ID },
        areaServed: [
          { "@type": "City", name: "Cali" },
          { "@type": "AdministrativeArea", name: "Valle del Cauca" },
          { "@type": "Country", name: "Colombia" },
        ],
        availableChannel: {
          "@type": "ServiceChannel",
          serviceUrl: `${SITE_URL}/contacto`,
          servicePhone: "+573184341249",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: `Alcance de ${service.title}`,
          itemListElement: service.items.map((item) => ({
            "@type": "Offer",
            itemOffered: { "@type": "Service", name: item },
          })),
        },
      }}
    />
  );
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const [services, settings] = await Promise.all([getServices(), getSettings()]);
  const service = services.find((s) => s.slug === slug);
  if (!service) notFound();

  const category = getCategory(service.category);
  const CatIcon = iconMap[service.icon];
  const quoteMessage = `Hola GPI, quiero cotizar el servicio de ${service.title}.`;

  // Orden industrial → ambiental respetando el orden ya devuelto por getServices().
  const currentIndex = services.findIndex((s) => s.slug === service.slug);
  const prevService = currentIndex > 0 ? services[currentIndex - 1] : undefined;
  const nextService =
    currentIndex >= 0 && currentIndex < services.length - 1
      ? services[currentIndex + 1]
      : undefined;

  return (
    <>
      <ServiceJsonLd service={service} categoryName={category.name} />
      <PageHero
        eyebrow={category.name}
        title={service.title}
        description={service.intro}
        image={service.cover}
        imageAlt={service.coverAlt}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Servicios", href: "/servicios" },
          { label: service.title },
        ]}
      />

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_20rem]">
            {/* Contenido principal */}
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                  <CatIcon className="h-6 w-6" />
                </span>
                <h2 className="text-2xl font-extrabold text-ink">
                  ¿Qué incluye este servicio?
                </h2>
              </div>

              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {service.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-dark text-white">
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-relaxed text-ink-soft">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Galería */}
              {service.gallery && service.gallery.length > 0 && (
                <div className="mt-10">
                  <h3 className="text-lg font-bold text-ink">Galería</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {service.gallery.map((img) => (
                      <div
                        key={img.src}
                        className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line shadow-soft"
                      >
                        <ContentImage
                          src={img.src}
                          alt={img.alt}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video del servicio (columna `video`, migración 0007).
                  `getServices()` ya devuelve `undefined` cuando no hay video,
                  cuando la URL no es de YouTube o cuando está oculto: aquí
                  basta con preguntar si existe. */}
              {service.video && (
                <div className="mt-10 rounded-3xl border border-line bg-mist p-5 shadow-soft sm:p-7">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-deep">
                    <span className="h-px w-6 bg-current" aria-hidden="true" />
                    Video del servicio
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-ink">
                    {service.video.titulo || "Video del servicio"}
                  </h3>
                  {service.video.descripcion !== "" && (
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-graphite">
                      {service.video.descripcion}
                    </p>
                  )}
                  <div className="mt-5">
                    <YouTubeFacade
                      id={service.video.id}
                      title={service.video.titulo || service.title}
                    />
                  </div>
                </div>
              )}

              {/* CTA WhatsApp inline */}
              <div className="mt-10 flex flex-col gap-4 rounded-2xl bg-brand-tint p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-bold text-ink">
                    ¿Le interesa este servicio?
                  </p>
                  <p className="mt-1 text-sm text-graphite">
                    Solicite una cotización sin compromiso por WhatsApp.
                  </p>
                </div>
                <ButtonLink
                  href={whatsappLink(settings.contact.primaryWhatsApp, quoteMessage)}
                  variant="primary"
                  size="lg"
                  className="shrink-0"
                >
                  <WhatsApp className="h-5 w-5" />
                  Cotiza este servicio
                </ButtonLink>
              </div>
            </div>

            {/* Sidebar. Va como <div> y no como <aside>: al estar dentro de
                <main> era un landmark "complementary" anidado, que es justo lo
                que marcaba axe (landmark-complementary-is-top-level). */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-line bg-white p-6 shadow-soft">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-dark">
                  Todos los servicios
                </h2>
                <ul className="mt-4 space-y-1">
                  {services.map((s) => {
                    const Icon = iconMap[s.icon];
                    const active = s.slug === service.slug;
                    return (
                      <li key={s.slug}>
                        <Link
                          href={`/servicios/${s.slug}`}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                            active
                              ? "bg-brand-tint font-semibold text-brand-deep"
                              : "text-ink-soft hover:bg-mist"
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="leading-snug">{s.navTitle}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-5 rounded-2xl bg-ink p-6 text-white">
                <p className="text-base font-bold">¿Tiene un proyecto en mente?</p>
                <p className="mt-1.5 text-sm text-white/70">
                  Nuestro equipo le asesora para encontrar la mejor solución.
                </p>
                <ButtonLink
                  href="/contacto"
                  variant="primary"
                  className="mt-4 w-full"
                >
                  Contáctanos
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Navegación entre servicios (anterior / todos / siguiente) */}
      <section className="border-t border-line bg-mist py-10 sm:py-12">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3 sm:items-stretch">
            {prevService ? (
              <Link
                href={`/servicios/${prevService.slug}`}
                className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
              >
                <ArrowLeft className="h-5 w-5 shrink-0 text-graphite transition-transform duration-200 group-hover:-translate-x-1 group-hover:text-brand-dark" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                    Servicio anterior
                  </p>
                  <p className="truncate text-sm font-bold text-ink group-hover:text-brand-dark">
                    {prevService.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div aria-hidden="true" className="hidden sm:block" />
            )}

            <Link
              href="/servicios"
              className="flex items-center justify-center rounded-2xl border border-line bg-white p-5 text-center text-sm font-semibold text-ink-soft shadow-soft transition-colors duration-200 hover:border-brand/40 hover:text-brand-dark"
            >
              Todos los servicios
            </Link>

            {nextService ? (
              <Link
                href={`/servicios/${nextService.slug}`}
                className="group flex items-center justify-end gap-3 rounded-2xl border border-line bg-white p-5 text-right shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-card"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                    Siguiente servicio
                  </p>
                  <p className="truncate text-sm font-bold text-ink group-hover:text-brand-dark">
                    {nextService.title}
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

      <CtaBand contact={settings.contact} whatsappMessage={quoteMessage} />
    </>
  );
}
