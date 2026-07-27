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

import {
  services as staticServices,
  serviceCategories,
  type Service,
  type ServiceCategory,
  type ServiceCategoryId,
} from "@/data/services";
import { projects as staticProjects, type Project } from "@/data/projects";
import { clients as staticClients, type Client } from "@/data/clients";
import { faq as staticFaq, type FaqItem } from "@/data/faq";
import { values as staticValues, type CorporateValue } from "@/data/values";
import {
  contactDefaults,
  excellenceDefaults,
  heroDefaults,
  youtubeDefaults,
  type ContactSettings,
  type ExcellenceSettings,
  type HeroSettings,
  type SiteSettings,
  type YouTubeSettings,
} from "@/data/site";

export type {
  Service,
  ServiceCategory,
  ServiceCategoryId,
  Project,
  Client,
  FaqItem,
  CorporateValue,
  ContactSettings,
  HeroSettings,
  ExcellenceSettings,
  YouTubeSettings,
  SiteSettings,
};

export const defaultSettings: SiteSettings = {
  contact: contactDefaults,
  hero: heroDefaults,
  excellence: excellenceDefaults,
  youtube: youtubeDefaults,
};

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

/** Combina un objeto por defecto con el guardado en Supabase (nivel 1). */
function mergeSetting<T extends object>(base: T, incoming: unknown): T {
  if (!isRecord(incoming)) return base;
  return { ...base, ...(incoming as Partial<T>) };
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
  meta_title: string | null;
  meta_description: string | null;
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
    const { data, error } = await supabase
      .from("site_services")
      .select(
        "slug, category, title, nav_title, icon_key, summary, description, items, images, meta_title, meta_description",
      )
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticServices;
    return (data as ServiceRow[]).map(rowToService);
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

export async function getProjects(): Promise<Project[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticProjects;

  try {
    const { data, error } = await supabase
      .from("site_projects")
      .select("title, client, category, description, image_url, image_alt")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticProjects;

    return data.map((row) => ({
      title: str(row.title, "Proyecto"),
      client: str(row.client) || undefined,
      category: row.category === "ambiental" ? "ambiental" : "industrial",
      description: str(row.description) || undefined,
      image: str(row.image_url, "/images/proyectos/13a.jpg"),
      imageAlt: str(row.image_alt, str(row.title, "Proyecto de GPI")),
    }));
  } catch {
    return staticProjects;
  }
}

export async function getClients(): Promise<Client[]> {
  const supabase = getPublicSupabase();
  if (!supabase) return staticClients;

  try {
    const { data, error } = await supabase
      .from("site_clients")
      .select("name, logo_url, website")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticClients;

    return data
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
      .select("question, answer")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticFaq;

    return data
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
      .select("title, description, icon_key")
      .order("sort", { ascending: true });

    if (error || !data || data.length === 0) return staticValues;

    return data
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

    const map = new Map<string, unknown>(
      data.map((row) => [String(row.key), row.value]),
    );

    const contactValue = map.get("contact");
    const contact: ContactSettings = {
      ...contactDefaults,
      ...(isRecord(contactValue) ? (contactValue as Partial<ContactSettings>) : {}),
      address: mergeSetting(
        contactDefaults.address,
        isRecord(contactValue) ? contactValue.address : undefined,
      ),
      geo: mergeSetting(
        contactDefaults.geo,
        isRecord(contactValue) ? contactValue.geo : undefined,
      ),
      social: mergeSetting(
        contactDefaults.social,
        isRecord(contactValue) ? contactValue.social : undefined,
      ),
    };

    if (!Array.isArray(contact.phones) || contact.phones.length === 0) {
      contact.phones = contactDefaults.phones;
    }
    if (!Array.isArray(contact.emails) || contact.emails.length === 0) {
      contact.emails = contactDefaults.emails;
    }

    const excellence = mergeSetting(
      excellenceDefaults,
      map.get("excellence"),
    ) as ExcellenceSettings;
    if (!Array.isArray(excellence.stats) || excellence.stats.length === 0) {
      excellence.stats = excellenceDefaults.stats;
    }

    return {
      contact,
      hero: mergeSetting(heroDefaults, map.get("hero")),
      excellence,
      youtube: mergeSetting(youtubeDefaults, map.get("youtube")),
    };
  } catch {
    return defaultSettings;
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
