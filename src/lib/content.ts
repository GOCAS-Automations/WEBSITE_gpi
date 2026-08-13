/**
 * CAPA DE CONTENIDO
 * =================
 * Punto único desde el que las páginas públicas obtienen su contenido.
 *
 *  - Si NO hay variables de entorno de Supabase → devuelve los datos estáticos
 *    de `src/data/*`. El sitio sigue 100% funcional.
 *  - Si SÍ las hay → consulta Supabase y, ante error o resultado vacío, vuelve
 *    a caer en los datos estáticos.
 *
 * Usa el cliente anónimo sin cookies (`getPublicSupabase`) para no forzar el
 * render dinámico: las páginas se siguen generando con ISR (`revalidate`).
 */

import { getPublicSupabase } from "@/lib/supabase/server";
import { iconMap, type IconName } from "@/lib/icons";
import { slugify } from "@/lib/slug";
import { youtubeId } from "@/lib/youtube";

import {
  services as staticServices,
  serviceCategories,
  type Service,
  type ServiceCategory,
  type ServiceCategoryId,
  type ServiceVideo,
} from "@/data/services";
import { projects as staticProjects, type Project } from "@/data/projects";
import { clients as staticClients, type Client } from "@/data/clients";
import { faq as staticFaq, type FaqItem } from "@/data/faq";
import { values as staticValues, type CorporateValue } from "@/data/values";
import {
  formatearVisitas,
  normalizarSettings,
  siteSettingsDefaults,
  type ContactSettings,
  type ExcellenceSettings,
  type HeroSettings,
  type HomeSettings,
  type NosotrosSettings,
  type PaginaHero,
  type PaginasSettings,
  type SiteSettings,
  type VisibilitySettings,
  type YouTubeSettings,
} from "@/data/site";

export type {
  Service,
  ServiceCategory,
  ServiceCategoryId,
  ServiceVideo,
  Project,
  Client,
  FaqItem,
  CorporateValue,
  ContactSettings,
  HeroSettings,
  ExcellenceSettings,
  YouTubeSettings,
  HomeSettings,
  NosotrosSettings,
  PaginaHero,
  PaginasSettings,
  VisibilitySettings,
  SiteSettings,
};

export const defaultSettings: SiteSettings = siteSettingsDefaults;

/**
 * Visibilidad por ítem (columna `published`, migración 0002).
 *
 * Se filtra también en JavaScript —además de hacerlo la política RLS de anon—
 * por dos motivos: 1) si la migración 0002 todavía no está aplicada la columna
 * no existe y `published` llega `undefined`, que aquí se considera publicado;
 * 2) deja el comportamiento explícito y auditable en el código.
 */
function estaPublicado(row: { published?: unknown }): boolean {
  return row.published !== false;
}

/* ------------------------------------------------------------------ */
/* Utilidades de normalización                                         */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function safeIcon(value: unknown, fallback: IconName): IconName {
  return typeof value === "string" && value in iconMap
    ? (value as IconName)
    : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

function toGallery(value: unknown): { src: string; alt: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((item) => ({ src: str(item.src), alt: str(item.alt) }))
    .filter((item) => item.src !== "");
}

/* ------------------------------------------------------------------ */
/* Filas de Supabase                                                   */
/* ------------------------------------------------------------------ */

interface ServiceRow {
  slug: string;
  category: string | null;
  title: string;
  nav_title: string | null;
  icon_key: string | null;
  summary: string | null;
  description: string | null;
  items: unknown;
  images: unknown;
  video?: unknown;
  meta_title: string | null;
  meta_description: string | null;
  published?: boolean;
}

/**
 * Video de un servicio (columna `video`, migración 0007).
 *
 * Devuelve `undefined` cuando no hay video que mostrar: si la columna no existe
 * todavía, si está en NULL, si la URL no es de YouTube o si quien edita el
 * panel lo marcó como oculto. Así la página del servicio solo tiene que
 * preguntar `if (service.video)`.
 */
function rowToServiceVideo(value: unknown): ServiceVideo | undefined {
  if (!isRecord(value)) return undefined;

  const url = str(value.url);
  const id = youtubeId(url);
  if (id === "") return undefined;

  // Solo `false` explícito oculta: un video guardado antes de que existiera el
  // interruptor se considera visible.
  if (value.visible === false) return undefined;

  return {
    url,
    id,
    titulo: str(value.titulo),
    descripcion: str(value.descripcion),
    visible: true,
  };
}

function rowToService(row: ServiceRow): Service {
  const images = isRecord(row.images) ? row.images : {};
  const gallery = toGallery(images.gallery);
  const title = str(row.title, row.slug);
  const summary = str(row.summary);

  return {
    slug: row.slug,
    title,
    navTitle: str(row.nav_title, title),
    category: row.category === "ambiental" ? "ambiental" : "industrial",
    icon: safeIcon(row.icon_key, "cog"),
    excerpt: summary,
    intro: str(row.description),
    items: toStringArray(row.items),
    cover: str(images.cover, "/images/servicios/s1.jpg"),
    coverAlt: str(images.coverAlt, title),
    gallery: gallery.length > 0 ? gallery : undefined,
    // `undefined` mientras la migración 0007 no esté aplicada: sin columna no
    // hay video, y la página del servicio se ve exactamente como antes.
    video: rowToServiceVideo(row.video),
    metaTitle: str(row.meta_title, title),
    metaDescription: str(row.meta_description, summary),
  };
}

/* ------------------------------------------------------------------ */
/* API pública de la capa de contenido                                 */
/* ------------------------------------------------------------------ */

export async function getServices(): Promise<Service[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticServices;

  try {
    // `select("*")` en vez de una lista de columnas: así la consulta sigue
    // funcionando tanto si la migración 0002 (columna `published`) está
    // aplicada como si no.
    const { data, error } = await supabase
      .from("site_services")
      .select("*")
      .order("sort", { ascending: true });

    // Solo se cae al contenido estático si la tabla no responde o está vacía.
    // Si hay filas pero todas están ocultas, se respeta la decisión del panel.
    if (error || !data || data.length === 0) return staticServices;
    return (data as ServiceRow[]).filter(estaPublicado).map(rowToService);
  } catch {
    return staticServices;
  }
}

export async function getService(slug: string): Promise<Service | undefined> {
  const all = await getServices();
  return all.find((s) => s.slug === slug);
}

export async function getServicesByCategory(
  category: ServiceCategoryId,
): Promise<Service[]> {
  const all = await getServices();
  return all.filter((s) => s.category === category);
}

/** Las dos categorías son fijas (industrial / ambiental). */
export function getServiceCategories(): ServiceCategory[] {
  return serviceCategories;
}

/**
 * Respaldo de los proyectos sembrados por la migración 0001, indexado por
 * título.
 *
 * Mientras la 0005 no esté aplicada, `site_projects` no tiene las columnas
 * `slug`, `details` ni `gallery`. Derivar el slug del título daría direcciones
 * larguísimas y distintas de las que publican el sitemap y `generateStaticParams`,
 * y la página quedaría sin texto ni fotos. Con este mapa, esos cuatro proyectos
 * se ven exactamente igual antes y después de aplicar la migración.
 */
const PROYECTOS_POR_TITULO = new Map(staticProjects.map((p) => [p.title, p]));

/** Proyecto estático con el mismo título, si existe. */
function estatico(title: string): Project | undefined {
  return PROYECTOS_POR_TITULO.get(title);
}

/**
 * Fila de `site_projects` → `Project`.
 *
 * Tolerante a la migración 0005 sin aplicar: si la columna `slug` no existe, se
 * usa el del proyecto estático con el mismo título y, si tampoco lo hay, se
 * deriva del título con la misma regla que aplica el SQL. `gallery` acepta
 * tanto `{url, alt}` (el formato de la 0005) como `{src, alt}` (el de los
 * servicios), para que dé igual cuál se haya guardado.
 */
function rowToProject(row: Record<string, unknown>, index: number): Project {
  const title = str(row.title, "Proyecto");
  const slug =
    str(row.slug) ||
    estatico(title)?.slug ||
    slugify(title) ||
    `proyecto-${index + 1}`;

  const gallery = Array.isArray(row.gallery)
    ? row.gallery
        .filter(isRecord)
        .map((img) => ({ src: str(img.url) || str(img.src), alt: str(img.alt) }))
        .filter((img) => img.src !== "")
    : [];

  // `undefined` (no `null`) significa que la COLUMNA no existe todavía, es
  // decir que la 0005 está pendiente: solo en ese caso se recurre al texto y a
  // las fotos estáticas. Si la columna existe y está vacía se respeta, porque
  // es una decisión de quien edita el panel.
  const respaldo = estatico(title);
  const details =
    row.details === undefined ? respaldo?.details : str(row.details) || undefined;
  const galeria =
    row.gallery === undefined
      ? respaldo?.gallery
      : gallery.length > 0
        ? gallery
        : undefined;

  return {
    slug,
    title,
    client: str(row.client) || undefined,
    category: row.category === "ambiental" ? "ambiental" : "industrial",
    description: str(row.description) || respaldo?.description,
    details,
    image: str(row.image_url, "/images/proyectos/13a.jpg"),
    imageAlt: str(row.image_alt, title),
    gallery: galeria,
  };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticProjects;

  try {
    const { data, error } = await supabase
      .from("site_projects")
      .select("*")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticProjects;

    return data.filter(estaPublicado).map(rowToProject);
  } catch {
    return staticProjects;
  }
}

export async function getProject(slug: string): Promise<Project | undefined> {
  const all = await getProjects();
  return all.find((p) => p.slug === slug);
}

export async function getClients(): Promise<Client[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticClients;

  try {
    const { data, error } = await supabase
      .from("site_clients")
      .select("*")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticClients;

    return data
      .filter(estaPublicado)
      .map((row) => ({
        name: str(row.name),
        logo: str(row.logo_url),
        website: str(row.website) || undefined,
      }))
      .filter((c) => c.name !== "" && c.logo !== "");
  } catch {
    return staticClients;
  }
}

export async function getFaqs(): Promise<FaqItem[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticFaq;

  try {
    const { data, error } = await supabase
      .from("site_faqs")
      .select("*")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticFaq;

    return data
      .filter(estaPublicado)
      .map((row) => ({ question: str(row.question), answer: str(row.answer) }))
      .filter((f) => f.question !== "");
  } catch {
    return staticFaq;
  }
}

export async function getValues(): Promise<CorporateValue[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticValues;

  try {
    const { data, error } = await supabase
      .from("site_values")
      .select("*")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticValues;

    return data
      .filter(estaPublicado)
      .map((row) => ({
        title: str(row.title),
        description: str(row.description),
        icon: safeIcon(row.icon_key, "shield"),
      }))
      .filter((v) => v.title !== "");
  } catch {
    return staticValues;
  }
}

export async function getSettings(): Promise<SiteSettings> {
  const supabase = getPublicSupabase();
  if (!supabase) return defaultSettings;

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value");

    if (error || !data || data.length === 0) return defaultSettings;

    // La normalización vive en `src/data/site.ts` y la comparte el panel: una
    // sola definición de qué es válido para el sitio público y para /admin.
    return normalizarSettings(
      new Map<string, unknown>(data.map((row) => [String(row.key), row.value])),
    );
  } catch {
    return defaultSettings;
  }
}

/* ------------------------------------------------------------------ */
/* Contador de visitas (tabla `site_visitas`, migración 0007)          */
/* ------------------------------------------------------------------ */

export interface Visitas {
  /** Total acumulado desde que se instaló el contador. */
  total: number;
  /** El total con separador de miles, listo para mostrar (p. ej. "1.284"). */
  formateado: string;
  /**
   * false = la tabla todavía no existe (migración 0007 pendiente) o la
   * consulta falló. Quien muestra el dato puede así ocultar la tarjeta en vez
   * de anunciar "0 visitas", que se leería como un sitio que nadie visita.
   */
  disponible: boolean;
}

const VISITAS_VACIAS: Visitas = {
  total: 0,
  formateado: formatearVisitas(0),
  disponible: false,
};

/**
 * Total de visitas al sitio.
 *
 * SOBRE EL CACHEADO — decisión consciente: esta lectura usa el cliente anónimo
 * SIN cookies, así que las páginas que la consumen siguen siendo estáticas con
 * ISR (`revalidate = 300`). El contador se refresca, por tanto, cada 5 minutos.
 * La alternativa (`unstable_noStore` / render dinámico) obligaría a generar el
 * inicio en cada petición y tiraría por la borda el rendimiento del sitio
 * entero a cambio de un número más fresco. Para una cifra de vanidad como esta,
 * 5 minutos de retraso no significan nada.
 */
export async function getVisitas(): Promise<Visitas> {
  const supabase = getPublicSupabase();
  if (!supabase) return VISITAS_VACIAS;

  try {
    const { data, error } = await supabase.from("site_visitas").select("total");
    if (error || !data) return VISITAS_VACIAS;

    const total = data.reduce((suma, fila) => {
      const valor = Number(fila.total);
      return suma + (Number.isFinite(valor) && valor > 0 ? valor : 0);
    }, 0);

    return { total, formateado: formatearVisitas(total), disponible: true };
  } catch {
    return VISITAS_VACIAS;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers de enlaces (independientes del origen de datos)             */
/* ------------------------------------------------------------------ */

/** Construye un enlace de WhatsApp con mensaje pre-armado y codificado. */
export function whatsappLink(intl: string, message?: string): string {
  const base = `https://wa.me/${intl}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Enlace tel: a partir del número internacional. */
export function telLink(intl: string): string {
  return `tel:+${intl}`;
}
