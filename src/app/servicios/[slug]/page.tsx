import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { PageHero } from "@/components/sections/PageHero";
import { CtaBand } from "@/components/sections/CtaBand";
import { services as staticServices, getCategory } from "@/data/services";
import { whatsappLink } from "@/data/contact";
import { getService, getServices, getSettings } from "@/lib/content";
import { iconMap, Check, ArrowRight, WhatsApp } from "@/lib/icons";

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

  return (
    <>
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
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-dark">
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
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
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
                        <Image
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

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
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
                              ? "bg-brand-tint font-semibold text-brand-dark"
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
            </aside>
          </div>
        </Container>
      </section>

      <CtaBand contact={settings.contact} whatsappMessage={quoteMessage} />
    </>
  );
}
