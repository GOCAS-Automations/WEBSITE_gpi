import Link from "next/link";
import Image from "next/image";
import { contact, whatsappLink, telLink } from "@/data/contact";
import { services } from "@/data/services";
import { Facebook, Instagram, YouTube, WhatsApp, MapPin, Phone, Mail } from "@/lib/icons";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Servicios", href: "/servicios" },
  { label: "Proyectos", href: "/proyectos" },
  { label: "Contacto", href: "/contacto" },
];

export function Footer() {
  const featured = services.slice(0, 6);

  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Marca */}
          <div className="lg:col-span-4">
            <Image
              src="/images/logo2.png"
              alt="GPI — Optimización de Procesos Industriales y Ambientales"
              width={137}
              height={69}
              className="h-14 w-auto sm:h-16"
            />
            <p className="mt-5 max-w-sm text-sm leading-relaxed">
              Empresa de gestión estratégica y ejecución enfocada en generar
              rentabilidad y cumplimiento, integrando las variables del modelo de
              negocio de cada organización. Más de 5 años en el sector
              industrial-ambiental.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <SocialLink href={contact.social.facebook} label="Facebook de GPI">
                <Facebook className="h-5 w-5" />
              </SocialLink>
              <SocialLink href={contact.social.instagram} label="Instagram de GPI">
                <Instagram className="h-5 w-5" />
              </SocialLink>
              <SocialLink href={contact.social.youtube} label="Canal de YouTube de GPI">
                <YouTube className="h-5 w-5" />
              </SocialLink>
              <SocialLink
                href={whatsappLink(contact.primaryWhatsApp)}
                label="WhatsApp de GPI"
              >
                <WhatsApp className="h-5 w-5" />
              </SocialLink>
            </div>
          </div>

          {/* Servicios */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Servicios
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {featured.map((svc) => (
                <li key={svc.slug}>
                  <Link
                    href={`/servicios/${svc.slug}`}
                    className="transition-colors hover:text-brand-light"
                  >
                    {svc.navTitle}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/servicios"
                  className="font-semibold text-brand-light transition-colors hover:text-white"
                >
                  Ver todos →
                </Link>
              </li>
            </ul>
          </div>

          {/* Navegación */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Navegación
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-brand-light">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Contacto
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
                <span>{contact.address.full}</span>
              </li>
              {contact.phones.map((p) => (
                <li key={p.intl} className="flex gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
                  <a href={telLink(p.intl)} className="transition-colors hover:text-brand-light">
                    {p.label}
                  </a>
                </li>
              ))}
              {contact.emails.map((e) => (
                <li key={e.address} className="flex gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
                  <a
                    href={`mailto:${e.address}`}
                    className="break-all transition-colors hover:text-brand-light"
                  >
                    {e.address}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs sm:flex-row">
          <p>© 2026 GPI — Optimización de Procesos Industriales y Ambientales.</p>
          <p>
            Desarrollado por{" "}
            <span className="font-semibold text-white/85">GOCAS Automations</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-white/80 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand hover:text-white"
    >
      {children}
    </a>
  );
}
