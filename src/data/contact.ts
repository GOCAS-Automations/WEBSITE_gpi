// Datos de contacto OFICIALES de GPI (2026).
// Fuente de verdad — NO usar los datos del sitio viejo.
// Preparado para migrar a Supabase (panel admin, Fase 2).

export interface PhoneContact {
  /** Etiqueta legible, formato colombiano */
  label: string;
  /** Número en formato internacional sin signos, para wa.me / tel: */
  intl: string;
}

export interface EmailContact {
  address: string;
  person: string;
}

export const contact = {
  companyName: "GPI",
  legalName: "Grupo de Profesionales en Ingeniería GPI S.A.S",
  tagline: "Optimización de Procesos Industriales y Ambientales",
  address: {
    street: "Cl. 33 #5-76",
    area: "Comuna 4",
    city: "Cali",
    region: "Valle del Cauca",
    country: "Colombia",
    /** Cadena completa para mostrar y para el mapa */
    full: "Cl. 33 #5-76, Comuna 4, Cali, Valle del Cauca, Colombia",
  },
  /** Coordenadas aproximadas de Cali (Comuna 4) para JSON-LD LocalBusiness */
  geo: {
    latitude: 3.4699,
    longitude: -76.5225,
  },
  phones: [
    { label: "318 434 1249", intl: "573184341249" },
    { label: "311 649 9038", intl: "573116499038" },
  ] as PhoneContact[],
  /** Número principal para el formulario y botón flotante */
  primaryWhatsApp: "573184341249",
  emails: [
    { address: "xperea@gpiprofesionales.com", person: "X. Perea" },
    { address: "ycamacho@gpiprofesionales.com", person: "Y. Camacho" },
  ] as EmailContact[],
  social: {
    facebook: "https://www.facebook.com/gpiprofesionales",
    instagram: "https://www.instagram.com/gpiprofesionales/",
    youtube: "https://www.youtube.com/@GPI-PROFESIONALESS.A.S",
  },
  youtube: {
    watchUrl: "https://www.youtube.com/watch?v=wqrzBwApBik",
    id: "wqrzBwApBik",
  },
  /** Mapa de Google Maps embebido sin API key — busca la ficha del negocio en Google Maps */
  mapEmbedUrl:
    "https://www.google.com/maps?q=GRUPO+DE+PROFESIONALES+EN+INGENIER%C3%8DA+GPI+S.A.S+Cali&output=embed&hl=es",
  siteUrl: "https://www.gpiprofesionales.com",
} as const;

/** Construye un enlace de WhatsApp con mensaje pre-armado y codificado. */
export function whatsappLink(intl: string, message?: string): string {
  const base = `https://wa.me/${intl}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Enlace tel: a partir del número internacional. */
export function telLink(intl: string): string {
  return `tel:+${intl}`;
}
