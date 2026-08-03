// Textos e imágenes editables del inicio (hero + banda EXCELENCIA), datos de
// contacto y video corporativo. Fuente de verdad estática: se usa como seed de
// `site_settings` en Supabase y como fallback cuando el proyecto no está
// configurado.
//
// Este módulo es PURO (sin dependencias de servidor): puede importarse tanto
// desde Server Components como desde Client Components.

import { contact as staticContact } from "@/data/contact";

export interface ContactSettings {
  companyName: string;
  legalName: string;
  tagline: string;
  address: {
    street: string;
    area: string;
    city: string;
    region: string;
    country: string;
    full: string;
  };
  geo: { latitude: number; longitude: number };
  phones: { label: string; intl: string }[];
  primaryWhatsApp: string;
  emails: { address: string; person: string }[];
  /** Correo corporativo al que llega el formulario de /contacto. */
  correoFormulario: string;
  social: { facebook: string; instagram: string; youtube: string };
  schedule: string;
  mapEmbedUrl: string;
  siteUrl: string;
}

export interface HeroSettings {
  badge: string;
  titleLead: string;
  titleHighlight: string;
  description: string;
  image: string;
  imageAlt: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface StatItem {
  value: string;
  label: string;
}

export interface ExcellenceSettings {
  eyebrow: string;
  messageLead: string;
  messageHighlight: string;
  ctaLabel: string;
  ctaHref: string;
  stats: StatItem[];
}

export interface YouTubeSettings {
  id: string;
  watchUrl: string;
  title: string;
  sectionEyebrow: string;
  sectionTitle: string;
  sectionDescription: string;
}

/**
 * Interruptores de visibilidad de secciones completas del sitio público.
 * Se editan en /admin/ajustes y viven en `site_settings` con la clave
 * `visibility`. Todo `true` por defecto: el sitio se ve completo salvo que
 * alguien apague algo a propósito.
 */
export interface VisibilitySettings {
  /** Bloque "Nuestros valores" (inicio y Nosotros). */
  valuesSection: boolean;
  /** Banda de logos de clientes (inicio). */
  clientsSection: boolean;
  /** Video corporativo de YouTube (Nosotros). */
  videoSection: boolean;
  /** Preguntas frecuentes (Nosotros, incluido el marcado FAQPage). */
  faqSection: boolean;
}

export interface SiteSettings {
  contact: ContactSettings;
  hero: HeroSettings;
  excellence: ExcellenceSettings;
  youtube: YouTubeSettings;
  visibility: VisibilitySettings;
}

export const contactDefaults: ContactSettings = {
  companyName: staticContact.companyName,
  legalName: staticContact.legalName,
  tagline: staticContact.tagline,
  address: { ...staticContact.address },
  geo: { ...staticContact.geo },
  phones: staticContact.phones.map((p) => ({ ...p })),
  primaryWhatsApp: staticContact.primaryWhatsApp,
  emails: staticContact.emails.map((e) => ({ ...e })),
  correoFormulario: staticContact.correoFormulario,
  social: { ...staticContact.social },
  schedule: "Lunes a viernes, 8:00 a. m. – 5:00 p. m.",
  mapEmbedUrl: staticContact.mapEmbedUrl,
  siteUrl: staticContact.siteUrl,
};

/**
 * Validación mínima de un correo (algo@algo.algo, sin espacios).
 *
 * Deliberadamente permisiva: solo descarta lo que es claramente un error de
 * digitación. La comprobación de verdad la hace el servidor de correo, y una
 * expresión estricta rechazaría direcciones válidas raras.
 */
export function esCorreoValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}

export const heroDefaults: HeroSettings = {
  badge: "+5 años en el sector industrial-ambiental",
  titleLead: "Optimización de",
  titleHighlight: "procesos",
  description:
    "Adaptamos los procesos a través de la integración de diferentes disciplinas, logrando eficiencia y rentabilidad sin exceder los límites de diseño y de seguridad.",
  image: "/images/slides/1.jpg",
  imageAlt:
    "Ingeniero de GPI realizando mediciones de campo con equipo especializado",
  primaryCtaLabel: "Ver servicios",
  primaryCtaHref: "/servicios",
  secondaryCtaLabel: "Contáctanos",
  secondaryCtaHref: "/contacto",
};

export const excellenceDefaults: ExcellenceSettings = {
  eyebrow: "Más de 5 años en el sector industrial-ambiental",
  messageLead:
    "Trabajamos para lograr el 100% en el desempeño de nuestros clientes, siempre buscando la",
  messageHighlight: "EXCELENCIA",
  ctaLabel: "Ver proyectos realizados",
  ctaHref: "/proyectos",
  stats: [
    { value: "+5", label: "años en el sector industrial-ambiental" },
    { value: "100%", label: "objetivo en el desempeño del cliente" },
    { value: "11", label: "servicios industriales y ambientales" },
    { value: "2", label: "grandes áreas: industrial y ambiental" },
  ],
};

export const visibilityDefaults: VisibilitySettings = {
  valuesSection: true,
  clientsSection: true,
  videoSection: true,
  faqSection: true,
};

export const youtubeDefaults: YouTubeSettings = {
  id: "wqrzBwApBik",
  watchUrl: "https://www.youtube.com/watch?v=wqrzBwApBik",
  title:
    "Inspección con Drones 4K | Servicios Profesionales GPI para Ingeniería",
  sectionEyebrow: "Conoce nuestro trabajo",
  sectionTitle: "Inspección con drones para ingeniería",
  sectionDescription:
    "Una muestra de nuestros servicios profesionales de inspección con drones 4K.",
};
