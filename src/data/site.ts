// Textos e imágenes editables de las páginas generales del sitio (inicio,
// Nosotros), datos de contacto, video corporativo y visibilidad de secciones.
// Fuente de verdad estática: se usa como seed de `site_settings` en Supabase y
// como fallback cuando el proyecto no está configurado o la migración
// correspondiente todavía no se ha aplicado.
//
// Este módulo es PURO (sin dependencias de servidor): puede importarse tanto
// desde Server Components como desde Client Components.
//
// REGLA DE ORO DE ESTE ARCHIVO
// ----------------------------
// Los textos de aquí están DUPLICADOS a propósito en la migración que los
// siembra (`supabase/migrations/0007_contenido_paginas.sql`). Es el patrón del
// repositorio: el sitio se ve exactamente igual con base de datos y sin ella.
// Si cambias un texto aquí, cámbialo también allí.

import { contact as staticContact } from "@/data/contact";
import { serviceCategories } from "@/data/services";
import { iconMap, type IconName } from "@/lib/icons";

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
  /**
   * LEGADO. Las cifras de «Quiénes somos» del inicio viven desde la migración
   * 0007 en `home.quienesSomos.stats`, que es lo que se edita y lo que se
   * muestra. Esta clave se conserva porque las bases de datos anteriores la
   * tienen y de ella se siembran las nuevas (ver `normalizarHome`).
   */
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

/** Par imagen + texto alternativo usado por las secciones editables. */
export interface ImagenContenido {
  url: string;
  alt: string;
}

/* ------------------------------------------------------------------ */
/* Página de inicio (clave `home`)                                     */
/* ------------------------------------------------------------------ */

export interface HomeQuienesSomos {
  eyebrow: string;
  titulo: string;
  descripcion: string;
  bullets: string[];
  imagen: ImagenContenido;
  /** Las tarjetas de cifras. Se muestran junto al contador de visitas. */
  stats: StatItem[];
  ctaLabel: string;
  ctaHref: string;
}

export interface HomeSettings {
  quienesSomos: HomeQuienesSomos;
  /** Encabezado de la sección de servicios («Dos áreas, una misma excelencia»). */
  serviciosIntro: SeccionIntro;
  /** Encabezado de los valores en el inicio. */
  valoresIntro: SeccionIntro;
  /** Encabezado del portafolio de clientes. */
  clientes: SeccionIntro;
  /** Franja verde de cierre del inicio. */
  cta: { titulo: string; descripcion: string };
}

/* ------------------------------------------------------------------ */
/* Cabeceras de las demás páginas (clave `paginas`)                    */
/* ------------------------------------------------------------------ */

/** Primera pantalla de una página interior (`PageHero`). */
export interface PaginaHero {
  eyebrow: string;
  titulo: string;
  descripcion: string;
  imagen: ImagenContenido;
}

/**
 * Textos que no pertenecen a ninguna de las dos páginas grandes: las cabeceras
 * de Servicios, Proyectos y Contacto, y el párrafo de presentación del pie de
 * página. Antes estaban escritos en cada `page.tsx`.
 */
export interface PaginasSettings {
  servicios: PaginaHero;
  proyectos: PaginaHero;
  contacto: PaginaHero;
  footer: { descripcion: string };
  /**
   * Las fotos de las dos tarjetas grandes de categoría —«Servicios
   * Industriales» y «Servicios Ambientales»— que salen en el inicio y en
   * `/servicios`.
   *
   * Estaban escritas en `serviceCategories` (`src/data/services.ts`) y eran
   * las dos ÚNICAS imágenes visibles del sitio que no se podían cambiar desde
   * el panel: aparecían en la portada, pero no en ninguna pantalla de
   * `/admin`. Desde el 13 de agosto de 2026 son contenido editable como el
   * resto (`/admin/paginas`); el texto y el icono de cada categoría siguen
   * siendo fijos, que es lo que define a la categoría.
   */
  categorias: {
    industrial: ImagenContenido;
    ambiental: ImagenContenido;
  };
}

/* ------------------------------------------------------------------ */
/* Página Nosotros (clave `nosotros`)                                  */
/* ------------------------------------------------------------------ */

export interface NosotrosHero {
  titulo: string;
  descripcion: string;
  imagen: ImagenContenido;
}

/**
 * El sello verde que se apoya en la esquina de la foto del equipo («+15 / AÑOS
 * DE EXPERIENCIA»), tal cual lo dibujó el community manager en la página 3 del
 * PDF del 12 de agosto de 2026 (allí decía «+5»; GPI corrigió la cifra a 15).
 *
 * Con `valor` vacío el sello NO se pinta: es la forma de quitarlo desde el panel
 * sin tener que tocar código.
 */
export interface BadgeExperiencia {
  /** La cifra grande: «+15». */
  valor: string;
  /** El rótulo pequeño de debajo: «Años de experiencia». */
  etiqueta: string;
}

export interface NosotrosQuienesSomos {
  titulo: string;
  /** Uno o varios párrafos; cada elemento es un `<p>`. */
  parrafos: string[];
  imagen: ImagenContenido;
  badge: BadgeExperiencia;
}

export interface NosotrosGaleria {
  titulo: string;
  descripcion: string;
  fotos: ImagenContenido[];
}

/** Una tarjeta de la línea de tiempo (arriba de la flecha). */
export interface HitoLineaTiempo {
  /** "Abril de 2015", "Hoy"… */
  fecha: string;
  titulo: string;
  descripcion: string;
  icono: IconName;
}

/** Una etiqueta de la línea de tiempo (debajo de la flecha). */
export interface EtiquetaLineaTiempo {
  titulo: string;
  descripcion: string;
  icono: IconName;
}

export interface NosotrosLineaTiempo {
  eyebrow: string;
  titulo: string;
  descripcion: string;
  hitos: HitoLineaTiempo[];
  etiquetas: EtiquetaLineaTiempo[];
}

export interface SeccionIntro {
  eyebrow: string;
  titulo: string;
  descripcion: string;
}

export interface NosotrosSettings {
  hero: NosotrosHero;
  quienesSomos: NosotrosQuienesSomos;
  mision: { texto: string };
  vision: { texto: string };
  galeria: NosotrosGaleria;
  lineaTiempo: NosotrosLineaTiempo;
  valoresIntro: SeccionIntro;
  cta: { titulo: string; descripcion: string };
}

/* ------------------------------------------------------------------ */
/* Visibilidad                                                         */
/* ------------------------------------------------------------------ */

/**
 * Interruptores de visibilidad de secciones completas del sitio público.
 * Viven en `site_settings` con la clave `visibility`. Todo `true` por defecto:
 * el sitio se ve completo salvo que alguien apague algo a propósito.
 *
 * Hay dos niveles y conviven a propósito:
 *   · Las cuatro claves ORIGINALES (`valuesSection`, `clientsSection`,
 *     `videoSection`, `faqSection`) siguen significando lo mismo que siempre.
 *   · Las claves `home*` / `nosotros*` (migración 0007) son por PÁGINA.
 * Una sección se ve si su clave de página Y su clave global están encendidas.
 * Así, apagar los valores desde «Contacto y ajustes» los apaga en todo el
 * sitio, y apagarlos desde «Página Nosotros» solo los quita de esa página.
 */
export interface VisibilitySettings {
  /** Bloque "Nuestros valores" (inicio y Nosotros). Interruptor GLOBAL. */
  valuesSection: boolean;
  /** Banda de logos de clientes (inicio). */
  clientsSection: boolean;
  /** Video corporativo de YouTube (Nosotros). */
  videoSection: boolean;
  /** Preguntas frecuentes (Nosotros, incluido el marcado FAQPage). */
  faqSection: boolean;

  /* --- Por página (migración 0007) --------------------------------- */
  /** Bloque "Quiénes somos" con las cifras, en la página de inicio. */
  homeQuienesSomos: boolean;
  /** Bloque "Quiénes Somos" con la foto del equipo, en Nosotros. */
  nosotrosQuienesSomos: boolean;
  /** Tarjetas de Misión y Visión. */
  nosotrosMisionVision: boolean;
  /** Galería "Más que proveedores, somos aliados estratégicos". */
  nosotrosGaleria: boolean;
  /** Línea de tiempo empresarial. */
  nosotrosLineaTiempo: boolean;
  /** Valores corporativos EN LA PÁGINA NOSOTROS (además del global). */
  nosotrosValores: boolean;
  /** Video corporativo EN LA PÁGINA NOSOTROS (además del global). */
  nosotrosVideo: boolean;
  /** Preguntas frecuentes EN LA PÁGINA NOSOTROS (además del global). */
  nosotrosFaq: boolean;
}

export interface SiteSettings {
  contact: ContactSettings;
  hero: HeroSettings;
  excellence: ExcellenceSettings;
  youtube: YouTubeSettings;
  home: HomeSettings;
  nosotros: NosotrosSettings;
  paginas: PaginasSettings;
  visibility: VisibilitySettings;
}

/* ------------------------------------------------------------------ */
/* Valores por defecto                                                 */
/* ------------------------------------------------------------------ */

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
  badge: "+15 años en el sector industrial-ambiental",
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

/**
 * Las cuatro cifras que GPI aprobó el 12 de agosto de 2026.
 * Se comparten entre `home.quienesSomos.stats` (lo que se muestra) y el legado
 * `excellence.stats`, para que las dos claves digan lo mismo.
 */
const STATS_QUIENES_SOMOS: StatItem[] = [
  { value: "+15", label: "años en el sector industrial-ambiental" },
  { value: "100%", label: "objetivo en el desempeño del cliente" },
  { value: "11", label: "servicios industriales y ambientales" },
  { value: "2", label: "grandes áreas: industrial y ambiental" },
];

export const excellenceDefaults: ExcellenceSettings = {
  eyebrow: "Más de 15 años en el sector industrial-ambiental",
  messageLead:
    "Trabajamos para lograr el 100% en el desempeño de nuestros clientes, siempre buscando la",
  messageHighlight: "EXCELENCIA",
  ctaLabel: "Ver proyectos realizados",
  ctaHref: "/proyectos",
  stats: STATS_QUIENES_SOMOS.map((s) => ({ ...s })),
};

export const homeDefaults: HomeSettings = {
  quienesSomos: {
    eyebrow: "Quiénes somos",
    titulo: "Gestión estratégica y ejecución para su operación",
    descripcion:
      "Somos una empresa de gestión estratégica y ejecución, enfocada en generar rentabilidad y el cumplimiento de requisitos internos y externos a las compañías, basados en la mejora continua e integrando las variables de los modelos de negocio de cada organización.",
    bullets: [
      "Objetivo: lograr el 100% en el desempeño de nuestros clientes.",
      "Integración de disciplinas industriales y ambientales.",
      "Metodología basada en la mejora continua.",
    ],
    imagen: {
      url: "/images/cm/foto-equipo-gpi-sede.jpg",
      alt: "Equipo de GPI reunido en la sede de la empresa, frente a la pared con el logo corporativo",
    },
    stats: STATS_QUIENES_SOMOS.map((s) => ({ ...s })),
    ctaLabel: "Conócenos",
    ctaHref: "/nosotros",
  },
  serviciosIntro: {
    eyebrow: "Nuestros servicios",
    titulo: "Dos áreas, una misma excelencia",
    descripcion:
      "Cubrimos las necesidades de los procesos industriales y acompañamos el cumplimiento y la gestión ambiental de su empresa.",
  },
  valoresIntro: {
    eyebrow: "Nuestros valores",
    titulo: "Los principios que guían cada proyecto",
    descripcion: "",
  },
  clientes: {
    eyebrow: "Clientes",
    titulo: "Portafolio de clientes",
    descripcion:
      "Nos respalda el trabajo realizado junto a compañías de distintos sectores.",
  },
  cta: {
    titulo: "¿Listo para optimizar sus procesos?",
    descripcion:
      "Cuéntenos su necesidad y le presentamos una propuesta a la medida de su proceso y su presupuesto.",
  },
};

/**
 * Cabeceras de Servicios, Proyectos y Contacto + presentación del pie.
 *
 * «Más de 15 años» (no «5»): GPI corrigió su antigüedad el 12 de agosto de 2026
 * y el pie de página se había quedado con el texto viejo.
 */
export const paginasDefaults: PaginasSettings = {
  servicios: {
    eyebrow: "Servicios",
    titulo: "Soluciones industriales y ambientales a la medida",
    descripcion:
      "Integramos diferentes disciplinas para optimizar sus procesos y acompañar el cumplimiento normativo de su empresa. Estos son nuestros servicios.",
    imagen: {
      url: "/images/servicios/s1.jpg",
      alt: "Planta industrial con estructuras metálicas y tuberías",
    },
  },
  proyectos: {
    eyebrow: "Proyectos",
    titulo: "Proyectos que respaldan nuestra experiencia",
    descripcion:
      "Una muestra del trabajo ejecutado junto a nuestros clientes en el sector industrial y ambiental.",
    imagen: {
      url: "/images/proyectos/13a.jpg",
      alt: "Planta piloto industrial con tanques y tuberías",
    },
  },
  contacto: {
    eyebrow: "Contacto",
    titulo: "Hablemos de tu proyecto",
    descripcion:
      "Estamos en Cali y atendemos el suroccidente colombiano. Escríbenos y te responderemos con una propuesta a la medida.",
    imagen: {
      url: "/images/slides/1.jpg",
      alt: "Equipo de GPI en trabajo de campo",
    },
  },
  footer: {
    descripcion:
      "Empresa de gestión estratégica y ejecución enfocada en generar rentabilidad y cumplimiento, integrando las variables del modelo de negocio de cada organización. Más de 15 años en el sector industrial-ambiental.",
  },
  // Respaldo estático: las mismas dos fotos que traía `serviceCategories`.
  // En la base de datos viven apuntando al bucket (ver `docs/ADMIN.md`).
  categorias: {
    industrial: {
      url: serviceCategories[0].image,
      alt: serviceCategories[0].imageAlt,
    },
    ambiental: {
      url: serviceCategories[1].image,
      alt: serviceCategories[1].imageAlt,
    },
  },
};

export const nosotrosDefaults: NosotrosSettings = {
  hero: {
    titulo: "Optimizamos procesos, generamos rentabilidad",
    descripcion:
      "Somos una empresa de gestión estratégica y ejecución, enfocada en el desempeño y el cumplimiento de nuestros clientes.",
    imagen: {
      url: "/images/slides/2.jpg",
      alt: "Profesional de GPI realizando mediciones ambientales en campo",
    },
  },
  quienesSomos: {
    titulo: "Quiénes Somos",
    parrafos: [
      "Con más de 15 años de experiencia en el sector industrial y ambiental, somos una empresa de gestión estratégica y ejecución dedicada a impulsar la rentabilidad y el cumplimiento normativo de nuestros clientes, teniendo en cuenta las características y el modelo de negocio de cada uno de nuestros clientes.",
      "A lo largo de nuestra trayectoria hemos acompañado a empresas del Valle del Cauca en sus procesos de mejora continua, combinando conocimiento técnico, visión estratégica y compromiso con resultados medibles. Creemos que cada organización es única, y por eso diseñamos soluciones a la medida de sus necesidades económicas, operativas y ambientales.",
    ],
    imagen: {
      url: "/images/cm/foto-equipo-gpi-sede.jpg",
      alt: "Equipo de GPI reunido en la sede de la empresa, frente a la pared con el logo corporativo",
    },
    badge: { valor: "+15", etiqueta: "Años de experiencia" },
  },
  mision: {
    texto:
      "Generar rentabilidad, cumplimiento de requisitos internos y externos a las compañías, basados en la mejora continua, integrando las variables de los modelos de negocio de cada organización.",
  },
  vision: {
    texto:
      "Convertirnos en el aliado estratégico de las empresas en el Valle del Cauca a nivel industrial en temas ambientales y de proyectos de mejoramiento industrial.",
  },
  galeria: {
    titulo: "Más que proveedores, somos aliados estratégicos",
    descripcion:
      "Hoy trabajamos con la meta de consolidarnos como el mejor aliado estratégico para el sector industrial y ambiental, primero en el Valle del Cauca y, progresivamente, a nivel nacional construyendo relaciones basadas en la transparencia, la confianza y el crecimiento conjunto.",
    fotos: [
      {
        url: "/images/cm/foto-aforo-quebrada-gpi.jpg",
        alt: "Profesional de GPI midiendo el caudal de una quebrada con equipo de aforo durante un monitoreo ambiental",
      },
      {
        url: "/images/cm/foto-monitoreo-agua-registro-datos.jpg",
        alt: "Dos profesionales de GPI registrando datos durante un monitoreo de calidad del agua en campo",
      },
      {
        url: "/images/cm/foto-tablero-control-planta-gpi.jpg",
        alt: "Técnico de GPI operando el tablero de control de un equipo automatizado en planta",
      },
    ],
  },
  lineaTiempo: {
    eyebrow: "Nuestra trayectoria",
    titulo: "Línea de tiempo empresarial",
    descripcion:
      "Un camino de evolución, compromiso y resultados que nos ha permitido crecer junto a nuestros clientes y aliados estratégicos.",
    hitos: [
      {
        fecha: "Abril de 2015",
        titulo: "Nuestros inicios",
        descripcion:
          "Comenzamos como persona natural, brindando asesorías especializadas en ingeniería.",
        icono: "user",
      },
      {
        fecha: "Julio de 2021",
        titulo: "Asesorías y ejecución de proyectos",
        descripcion:
          "Ampliamos nuestro alcance para incluir la ejecución de proyectos, integrando conocimiento técnico y gestión orientada a resultados.",
        icono: "cogCheck",
      },
      {
        fecha: "Septiembre de 2022",
        titulo: "Nacemos como persona jurídica",
        descripcion:
          "Constituimos nuestra empresa como SAS, robustecimos nuestro portafolio de servicios y fortalecimos nuestra estructura organizacional.",
        icono: "building",
      },
      {
        fecha: "Hoy",
        titulo: "Consolidación y futuro",
        descripcion:
          "Contamos con punto físico y atendemos a las empresas más importantes del Valle del Cauca, impulsando su competitividad y sostenibilidad.",
        icono: "chartUp",
      },
    ],
    etiquetas: [
      {
        titulo: "Enfoque inicial",
        descripcion: "Asesorías técnicas con compromiso y calidad.",
        icono: "flag",
      },
      {
        titulo: "Crecimiento",
        descripcion: "De la asesoría a la acción, generando impacto real.",
        icono: "barChart",
      },
      {
        titulo: "Fortalecimiento",
        descripcion: "Más servicios, más capacidades, más valor para nuestros clientes.",
        icono: "shield",
      },
      {
        titulo: "Impacto",
        descripcion: "Alianzas sólidas, resultados medibles y relaciones a largo plazo.",
        icono: "users",
      },
    ],
  },
  valoresIntro: {
    eyebrow: "Nuestros valores",
    titulo: "Lo que nos define",
    descripcion:
      "Los principios que están presentes en cada propuesta y ejecución de valor para nuestros clientes.",
  },
  cta: {
    titulo: "¿Listo para optimizar sus procesos?",
    descripcion:
      "Cuéntenos su necesidad y le presentamos una propuesta a la medida de su proceso y su presupuesto.",
  },
};

export const visibilityDefaults: VisibilitySettings = {
  valuesSection: true,
  clientsSection: true,
  videoSection: true,
  faqSection: true,
  homeQuienesSomos: true,
  nosotrosQuienesSomos: true,
  nosotrosMisionVision: true,
  nosotrosGaleria: true,
  nosotrosLineaTiempo: true,
  nosotrosValores: true,
  nosotrosVideo: true,
  nosotrosFaq: true,
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

export const siteSettingsDefaults: SiteSettings = {
  contact: contactDefaults,
  hero: heroDefaults,
  excellence: excellenceDefaults,
  youtube: youtubeDefaults,
  home: homeDefaults,
  nosotros: nosotrosDefaults,
  paginas: paginasDefaults,
  visibility: visibilityDefaults,
};

/* ------------------------------------------------------------------ */
/* Contador de visitas                                                 */
/* ------------------------------------------------------------------ */

/** Etiqueta de la tarjeta del contador, junto a las cifras de «Quiénes somos». */
export const ETIQUETA_VISITAS = "visitas al sitio web";

/** Formatea el total con separador de miles colombiano (1.234). */
export function formatearVisitas(total: number): string {
  const seguro = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  return new Intl.NumberFormat("es-CO").format(seguro);
}

/* ------------------------------------------------------------------ */
/* NORMALIZADORES                                                      */
/*                                                                     */
/* Puros: reciben lo que venga de `site_settings` (que es jsonb, es     */
/* decir: cualquier cosa) y devuelven un objeto con la forma correcta,  */
/* rellenando con los valores por defecto lo que falte o no sea válido. */
/*                                                                     */
/* Los usan la capa pública (`src/lib/content.ts`), el panel            */
/* (`src/lib/admin.ts`) y las server actions: una sola definición de    */
/* "qué es válido", imposible de contradecir entre pantallas.           */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Texto no vacío, o el respaldo. */
function texto(value: unknown, respaldo: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : respaldo;
}

/** Nombre de icono válido, o el respaldo. */
function icono(value: unknown, respaldo: IconName): IconName {
  return typeof value === "string" && value in iconMap
    ? (value as IconName)
    : respaldo;
}

/** Lista de textos no vacíos. Devuelve `null` si el valor no era una lista. */
function listaTextos(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

/**
 * Lista de imágenes `{url, alt}`. Acepta también `{src, alt}` (el formato que
 * usan las galerías de servicios) para que dé igual cuál se haya guardado.
 * Devuelve `null` si el valor no era una lista.
 */
function listaImagenes(value: unknown): ImagenContenido[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter(isRecord)
    .map((img) => ({ url: texto(img.url ?? img.src, ""), alt: texto(img.alt, "") }))
    .filter((img) => img.url !== "");
}

function imagen(value: unknown, respaldo: ImagenContenido): ImagenContenido {
  if (!isRecord(value)) return { ...respaldo };
  return {
    url: texto(value.url ?? value.src, respaldo.url),
    // El texto alternativo SÍ puede quedarse vacío a propósito (imagen
    // decorativa), así que solo se respalda cuando la clave no existe.
    alt: typeof value.alt === "string" ? value.alt : respaldo.alt,
  };
}

/**
 * Sello de años de experiencia de la página Nosotros.
 *
 * La subclave `badge` NO existe en la migración 0007, así que en la mayoría de
 * las instalaciones llega `undefined`: ahí manda el respaldo estático. Si la
 * clave SÍ está y el valor viene vacío es una decisión tomada desde el panel
 * («no quiero el sello») y se respeta — la regla `undefined` ≠ vacío de toda la
 * capa de contenido.
 */
function badgeExperiencia(
  value: unknown,
  respaldo: BadgeExperiencia,
): BadgeExperiencia {
  if (!isRecord(value)) return { ...respaldo };
  return {
    valor: typeof value.valor === "string" ? value.valor.trim() : respaldo.valor,
    etiqueta:
      typeof value.etiqueta === "string" ? value.etiqueta : respaldo.etiqueta,
  };
}

function stats(value: unknown, respaldo: StatItem[]): StatItem[] {
  if (!Array.isArray(value)) return respaldo.map((s) => ({ ...s }));
  const limpias = value
    .filter(isRecord)
    .map((s) => ({ value: texto(s.value, ""), label: texto(s.label, "") }))
    .filter((s) => s.value !== "");
  return limpias.length > 0 ? limpias : respaldo.map((s) => ({ ...s }));
}

export function normalizarContact(value: unknown): ContactSettings {
  const entrada = isRecord(value) ? value : {};
  const contact: ContactSettings = {
    ...contactDefaults,
    ...(entrada as Partial<ContactSettings>),
    address: {
      ...contactDefaults.address,
      ...(isRecord(entrada.address) ? entrada.address : {}),
    },
    geo: { ...contactDefaults.geo, ...(isRecord(entrada.geo) ? entrada.geo : {}) },
    social: {
      ...contactDefaults.social,
      ...(isRecord(entrada.social) ? entrada.social : {}),
    },
  };

  if (!Array.isArray(contact.phones) || contact.phones.length === 0) {
    contact.phones = contactDefaults.phones;
  }
  if (!Array.isArray(contact.emails) || contact.emails.length === 0) {
    contact.emails = contactDefaults.emails;
  }
  // Mientras la migración 0005 no esté aplicada la clave no existe: el
  // formulario cae en el correo corporativo por defecto en vez de quedarse sin
  // destinatario.
  if (
    typeof contact.correoFormulario !== "string" ||
    !esCorreoValido(contact.correoFormulario)
  ) {
    contact.correoFormulario = contactDefaults.correoFormulario;
  }

  return contact;
}

export function normalizarHero(value: unknown): HeroSettings {
  return { ...heroDefaults, ...(isRecord(value) ? value : {}) } as HeroSettings;
}

export function normalizarExcellence(value: unknown): ExcellenceSettings {
  const salida = {
    ...excellenceDefaults,
    ...(isRecord(value) ? value : {}),
  } as ExcellenceSettings;
  salida.stats = stats(salida.stats, excellenceDefaults.stats);
  return salida;
}

export function normalizarYouTube(value: unknown): YouTubeSettings {
  return {
    ...youtubeDefaults,
    ...(isRecord(value) ? value : {}),
  } as YouTubeSettings;
}

/**
 * Ajustes de la página de inicio.
 *
 * `statsLegado` son las cifras de la clave `excellence`, donde vivían antes de
 * la migración 0007: si la clave `home` todavía no existe se usan esas, para
 * que unas cifras que GPI hubiera editado desde el panel NO se pierdan al
 * estrenar la pantalla nueva.
 */
/** Encabezado de sección (`eyebrow` + título + descripción), o el respaldo. */
function seccionIntro(value: unknown, respaldo: SeccionIntro): SeccionIntro {
  const entrada = isRecord(value) ? value : {};
  return {
    eyebrow: texto(entrada.eyebrow, respaldo.eyebrow),
    titulo: texto(entrada.titulo, respaldo.titulo),
    descripcion: texto(entrada.descripcion, respaldo.descripcion),
  };
}

export function normalizarHome(value: unknown, statsLegado?: StatItem[]): HomeSettings {
  const base = homeDefaults.quienesSomos;
  const respaldoStats =
    statsLegado && statsLegado.length > 0 ? statsLegado : base.stats;

  const entrada = isRecord(value) ? value : {};
  const qs = isRecord(entrada.quienesSomos) ? entrada.quienesSomos : {};
  const bullets = listaTextos(qs.bullets);
  const cta = isRecord(entrada.cta) ? entrada.cta : {};

  return {
    quienesSomos: {
      eyebrow: texto(qs.eyebrow, base.eyebrow),
      titulo: texto(qs.titulo, base.titulo),
      descripcion: texto(qs.descripcion, base.descripcion),
      // `null` = la clave no existe (respaldo). Lista vacía = decisión de quien
      // edita el panel y se respeta.
      bullets: bullets ?? [...base.bullets],
      imagen: imagen(qs.imagen, base.imagen),
      stats: stats(qs.stats, respaldoStats),
      ctaLabel: texto(qs.ctaLabel, base.ctaLabel),
      ctaHref: texto(qs.ctaHref, base.ctaHref),
    },
    // Bloques de la migración 0008: mientras no esté aplicada las claves no
    // existen y cada una cae en el texto que la página traía escrito.
    serviciosIntro: seccionIntro(entrada.serviciosIntro, homeDefaults.serviciosIntro),
    valoresIntro: seccionIntro(entrada.valoresIntro, homeDefaults.valoresIntro),
    clientes: seccionIntro(entrada.clientes, homeDefaults.clientes),
    cta: {
      titulo: texto(cta.titulo, homeDefaults.cta.titulo),
      descripcion: texto(cta.descripcion, homeDefaults.cta.descripcion),
    },
  };
}

/** Cabecera de una página interior (título, descripción e imagen de fondo). */
function paginaHero(value: unknown, respaldo: PaginaHero): PaginaHero {
  const entrada = isRecord(value) ? value : {};
  return {
    eyebrow: texto(entrada.eyebrow, respaldo.eyebrow),
    titulo: texto(entrada.titulo, respaldo.titulo),
    descripcion: texto(entrada.descripcion, respaldo.descripcion),
    imagen: imagen(entrada.imagen, respaldo.imagen),
  };
}

/**
 * Cabeceras de Servicios, Proyectos y Contacto + presentación del pie
 * (clave `paginas`, migración 0008).
 */
export function normalizarPaginas(value: unknown): PaginasSettings {
  const entrada = isRecord(value) ? value : {};
  const footer = isRecord(entrada.footer) ? entrada.footer : {};
  const categorias = isRecord(entrada.categorias) ? entrada.categorias : {};

  return {
    servicios: paginaHero(entrada.servicios, paginasDefaults.servicios),
    proyectos: paginaHero(entrada.proyectos, paginasDefaults.proyectos),
    contacto: paginaHero(entrada.contacto, paginasDefaults.contacto),
    footer: {
      descripcion: texto(footer.descripcion, paginasDefaults.footer.descripcion),
    },
    categorias: {
      industrial: imagen(
        categorias.industrial,
        paginasDefaults.categorias.industrial,
      ),
      ambiental: imagen(categorias.ambiental, paginasDefaults.categorias.ambiental),
    },
  };
}

export function normalizarNosotros(value: unknown): NosotrosSettings {
  const base = nosotrosDefaults;
  // Sin la migración 0007 la clave `nosotros` no existe: con un objeto vacío
  // todas las ramas de abajo caen en el respaldo estático, que es exactamente
  // lo que se quiere.
  const entrada = isRecord(value) ? value : {};

  const hero = isRecord(entrada.hero) ? entrada.hero : {};
  const qs = isRecord(entrada.quienesSomos) ? entrada.quienesSomos : {};
  const mision = isRecord(entrada.mision) ? entrada.mision : {};
  const vision = isRecord(entrada.vision) ? entrada.vision : {};
  const galeria = isRecord(entrada.galeria) ? entrada.galeria : {};
  const linea = isRecord(entrada.lineaTiempo) ? entrada.lineaTiempo : {};
  const valores = isRecord(entrada.valoresIntro) ? entrada.valoresIntro : {};
  const cta = isRecord(entrada.cta) ? entrada.cta : {};

  const parrafos = listaTextos(qs.parrafos);
  const fotos = listaImagenes(galeria.fotos);

  const hitos = Array.isArray(linea.hitos)
    ? linea.hitos
        .filter(isRecord)
        .map((h, i) => ({
          fecha: texto(h.fecha, ""),
          titulo: texto(h.titulo, ""),
          descripcion: texto(h.descripcion, ""),
          icono: icono(h.icono, base.lineaTiempo.hitos[i]?.icono ?? "cog"),
        }))
        .filter((h) => h.titulo !== "" || h.fecha !== "")
    : null;

  const etiquetas = Array.isArray(linea.etiquetas)
    ? linea.etiquetas
        .filter(isRecord)
        .map((e, i) => ({
          titulo: texto(e.titulo, ""),
          descripcion: texto(e.descripcion, ""),
          icono: icono(e.icono, base.lineaTiempo.etiquetas[i]?.icono ?? "shield"),
        }))
        .filter((e) => e.titulo !== "")
    : null;

  return {
    hero: {
      titulo: texto(hero.titulo, base.hero.titulo),
      descripcion: texto(hero.descripcion, base.hero.descripcion),
      imagen: imagen(hero.imagen, base.hero.imagen),
    },
    quienesSomos: {
      titulo: texto(qs.titulo, base.quienesSomos.titulo),
      parrafos: parrafos ?? [...base.quienesSomos.parrafos],
      imagen: imagen(qs.imagen, base.quienesSomos.imagen),
      badge: badgeExperiencia(qs.badge, base.quienesSomos.badge),
    },
    mision: { texto: texto(mision.texto, base.mision.texto) },
    vision: { texto: texto(vision.texto, base.vision.texto) },
    galeria: {
      titulo: texto(galeria.titulo, base.galeria.titulo),
      descripcion: texto(galeria.descripcion, base.galeria.descripcion),
      fotos: fotos ?? base.galeria.fotos.map((f) => ({ ...f })),
    },
    lineaTiempo: {
      eyebrow: texto(linea.eyebrow, base.lineaTiempo.eyebrow),
      titulo: texto(linea.titulo, base.lineaTiempo.titulo),
      descripcion: texto(linea.descripcion, base.lineaTiempo.descripcion),
      hitos: hitos ?? base.lineaTiempo.hitos.map((h) => ({ ...h })),
      etiquetas: etiquetas ?? base.lineaTiempo.etiquetas.map((e) => ({ ...e })),
    },
    valoresIntro: {
      eyebrow: texto(valores.eyebrow, base.valoresIntro.eyebrow),
      titulo: texto(valores.titulo, base.valoresIntro.titulo),
      descripcion: texto(valores.descripcion, base.valoresIntro.descripcion),
    },
    cta: {
      titulo: texto(cta.titulo, base.cta.titulo),
      descripcion: texto(cta.descripcion, base.cta.descripcion),
    },
  };
}

/**
 * Visibilidad: solo se aceptan booleanos; cualquier otra cosa usa el valor por
 * defecto (visible). Una clave que no existe todavía en la base de datos deja
 * la sección VISIBLE, que es el comportamiento seguro al aplicar una migración.
 */
export function normalizarVisibility(value: unknown): VisibilitySettings {
  const salida: VisibilitySettings = { ...visibilityDefaults };
  if (!isRecord(value)) return salida;

  for (const key of Object.keys(visibilityDefaults) as (keyof VisibilitySettings)[]) {
    if (typeof value[key] === "boolean") salida[key] = value[key];
  }
  return salida;
}

/**
 * Convierte el conjunto de filas de `site_settings` (clave → valor jsonb) en
 * los ajustes tipados del sitio. Punto ÚNICO de normalización: lo llaman tanto
 * la capa pública como el panel, así que las dos ven exactamente lo mismo.
 */
export function normalizarSettings(map: Map<string, unknown>): SiteSettings {
  const excellence = normalizarExcellence(map.get("excellence"));

  return {
    contact: normalizarContact(map.get("contact")),
    hero: normalizarHero(map.get("hero")),
    excellence,
    youtube: normalizarYouTube(map.get("youtube")),
    // Sin la clave `home` (migración 0007 pendiente) las cifras salen de
    // `excellence`, que es donde vivían: nada de lo editado se pierde.
    home: normalizarHome(map.get("home"), excellence.stats),
    nosotros: normalizarNosotros(map.get("nosotros")),
    paginas: normalizarPaginas(map.get("paginas")),
    visibility: normalizarVisibility(map.get("visibility")),
  };
}
