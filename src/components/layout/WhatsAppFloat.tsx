"use client";

import { usePathname } from "next/navigation";
import { whatsappLink } from "@/data/contact";
import type { ContactSettings } from "@/data/site";
import { WhatsApp } from "@/lib/icons";

const defaultMessage = "Hola GPI, quiero más información sobre sus servicios.";

/** Rutas del portal privado donde el botón flotante no debe aparecer. */
const hiddenOn = ["/admin", "/mi-cuenta"];

export function WhatsAppFloat({ contact }: { contact: ContactSettings }) {
  const pathname = usePathname();
  if (hiddenOn.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <a
      href={whatsappLink(contact.primaryWhatsApp, defaultMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.75)] transition-transform duration-200 hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <span
        className="absolute inset-0 rounded-full bg-[#25D366] opacity-60 motion-safe:animate-ping"
        aria-hidden="true"
      />
      <WhatsApp className="relative h-7 w-7" />
    </a>
  );
}
