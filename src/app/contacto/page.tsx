import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { ContactForm } from "@/components/sections/ContactForm";
import { getSettings, whatsappLink, telLink } from "@/lib/content";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  WhatsApp,
  Facebook,
  Instagram,
  YouTube,
} from "@/lib/icons";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta a GPI en Cali: Cl. 33 #5-76, Comuna 4. WhatsApp 318 434 1249 y 311 649 9038. Escríbenos por el formulario o solicita tu cotización.",
  alternates: { canonical: "/contacto" },
  openGraph: {
    title: "Contacto | GPI",
    description:
      "Cl. 33 #5-76, Comuna 4, Cali. WhatsApp 318 434 1249 y 311 649 9038. Solicita tu cotización.",
    url: "/contacto",
    images: [
      {
        url: "/images/slides/1.jpg",
        alt: "Equipo de GPI en trabajo de campo",
      },
    ],
  },
};

export const revalidate = 300;

export default async function ContactoPage() {
  const { contact } = await getSettings();

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Hablemos de tu proyecto"
        description="Estamos en Cali y atendemos el suroccidente colombiano. Escríbenos y te responderemos con una propuesta a la medida."
        image="/images/slides/1.jpg"
        imageAlt="Equipo de GPI en trabajo de campo"
        breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Contacto" }]}
      />

      <section className="py-20 sm:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Información de contacto */}
            <Reveal>
              <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                Información de contacto
              </h2>
              <p className="mt-3 text-graphite">
                Puedes comunicarte con nosotros por cualquiera de estos medios.
              </p>

              <div className="mt-8 space-y-4">
                <InfoCard icon={<MapPin className="h-5 w-5" />} title="Dirección">
                  {contact.address.full}
                </InfoCard>

                <InfoCard icon={<Phone className="h-5 w-5" />} title="Teléfonos / WhatsApp">
                  <div className="flex flex-col gap-1">
                    {contact.phones.map((p) => (
                      <a
                        key={p.intl}
                        href={telLink(p.intl)}
                        className="transition-colors hover:text-brand-dark"
                      >
                        {p.label}
                      </a>
                    ))}
                  </div>
                </InfoCard>

                <InfoCard icon={<Mail className="h-5 w-5" />} title="Correos electrónicos">
                  <div className="flex flex-col gap-1">
                    {contact.emails.map((e) => (
                      <a
                        key={e.address}
                        href={`mailto:${e.address}`}
                        className="break-all transition-colors hover:text-brand-dark"
                      >
                        {e.address}
                      </a>
                    ))}
                  </div>
                </InfoCard>

                <InfoCard icon={<Clock className="h-5 w-5" />} title="Horario de atención">
                  {contact.schedule}
                </InfoCard>
              </div>

              {/* Botones directos WhatsApp */}
              <div className="mt-8">
                <p className="text-sm font-semibold text-ink">Escríbenos directo por WhatsApp:</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  {contact.phones.map((p) => (
                    <a
                      key={p.intl}
                      href={whatsappLink(
                        p.intl,
                        "Hola GPI, quiero más información sobre sus servicios.",
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#0d8055] px-5 py-3 text-sm font-semibold text-white shadow-soft transition-transform duration-200 hover:-translate-y-0.5"
                    >
                      <WhatsApp className="h-5 w-5" />
                      {p.label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Redes sociales */}
              <div className="mt-8 flex items-center gap-3">
                <span className="text-sm font-semibold text-ink">Síguenos:</span>
                <a
                  href={contact.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de GPI"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink-soft transition-colors hover:bg-brand-deep hover:text-white"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href={contact.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de GPI"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink-soft transition-colors hover:bg-brand-deep hover:text-white"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href={contact.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Canal de YouTube de GPI"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink-soft transition-colors hover:bg-brand-deep hover:text-white"
                >
                  <YouTube className="h-5 w-5" />
                </a>
              </div>
            </Reveal>

            {/* Formulario */}
            <Reveal delay={120}>
              <div className="rounded-3xl border border-line bg-mist p-6 shadow-soft sm:p-8">
                <h2 className="text-2xl font-extrabold text-ink">Envíanos un mensaje</h2>
                <p className="mt-2 text-sm text-graphite">
                  Completa el formulario y continúa la conversación por WhatsApp.
                </p>
                <div className="mt-6">
                  <ContactForm whatsappNumber={contact.primaryWhatsApp} />
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Mapa */}
      <section className="pb-20 sm:pb-24">
        <Container>
          <div className="overflow-hidden rounded-3xl border border-line shadow-soft">
            <iframe
              src={contact.mapEmbedUrl}
              title="Ubicación de GPI en Cali"
              width="100%"
              height="450"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[380px] w-full sm:h-[450px]"
              allowFullScreen
            />
          </div>
        </Container>
      </section>
    </>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-graphite">{children}</div>
      </div>
    </div>
  );
}
