import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { whatsappLink } from "@/data/contact";
import type { ContactSettings } from "@/data/site";
import { ArrowRight, WhatsApp } from "@/lib/icons";

interface CtaBandProps {
  contact: ContactSettings;
  title?: string;
  description?: string;
  whatsappMessage?: string;
}

export function CtaBand({
  contact,
  title = "¿Listo para optimizar sus procesos?",
  description = "Cuéntenos su necesidad y le presentamos una propuesta a la medida de su proceso y su presupuesto.",
  whatsappMessage = "Hola GPI, me gustaría solicitar una cotización.",
}: CtaBandProps) {
  return (
    <section className="on-dark bg-ink py-16 sm:py-20">
      <Container>
        {/*
          CONTRASTE: el degradado iba `brand-dark → brand → brand-light`, y el
          titular blanco quedaba sobre tramos de 2.88:1 (#3dae2b) y 2.05:1
          (#8cc63f) — por debajo del 3:1 que WCAG pide incluso para texto
          grande. Ahora arranca dos pasos más oscuro: donde vive el texto el
          fondo es `brand-deep` (6.70:1) / `brand-dark` (4.74:1), y el verde
          vivo de marca se reserva para el extremo donde solo hay botones de
          fondo claro.
        */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-deep via-brand-dark to-brand px-6 py-12 sm:px-12 sm:py-14">
          <div className="bg-dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-white/90 sm:text-lg">
                {description}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col xl:flex-row">
              <ButtonLink href="/contacto" variant="white" size="lg" className="w-full sm:w-auto">
                Contáctanos
                <ArrowRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink
                href={whatsappLink(contact.primaryWhatsApp, whatsappMessage)}
                variant="dark"
                size="lg"
                className="w-full sm:w-auto"
              >
                <WhatsApp className="h-5 w-5" />
                WhatsApp
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
