/**
 * Tipos y lecturas del panel de administración.
 *
 * A diferencia de `src/lib/content.ts` (pensado para el sitio público, con
 * fallback estático), aquí se leen las filas CRUDAS de Supabase — incluyendo
 * `id` y `sort` — usando el cliente ligado a la sesión del administrador.
 */

import { getServerSupabase } from "@/lib/supabase/server";
import {
  contactDefaults,
  excellenceDefaults,
  heroDefaults,
  youtubeDefaults,
  type ContactSettings,
  type ExcellenceSettings,
  type HeroSettings,
  type YouTubeSettings,
} from "@/data/site";
import type {
  AdminSettings,
  ClientRecord,
  FaqRecord,
  ProjectRecord,
  ServiceImages,
  ServiceRecord,
  ValueRecord,
} from "@/lib/admin-types";

// Los tipos viven en `admin-types.ts` (módulo puro, apto para Client
// Components). Aquí se reexportan por comodidad de los Server Components.
export type * from "@/lib/admin-types";

/* ------------------------------------------------------------------ */
/* Normalización                                                       */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeItems(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function normalizeImages(value: unknown): ServiceImages {
  if (!isRecord(value)) return {};
  const gallery = Array.isArray(value.gallery)
    ? value.gallery.filter(isRecord).map((g) => ({
        src: typeof g.src === "string" ? g.src : "",
        alt: typeof g.alt === "string" ? g.alt : "",
      }))
    : [];
  return {
    cover: typeof value.cover === "string" ? value.cover : "",
    coverAlt: typeof value.coverAlt === "string" ? value.coverAlt : "",
    gallery,
  };
}

/* ------------------------------------------------------------------ */
/* Lecturas                                                            */
/* ------------------------------------------------------------------ */

export async function listServices(): Promise<ServiceRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("site_services")
    .select("*")
    .order("sort", { ascending: true });
  if (!data) return [];
  return data.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    category: row.category === "ambiental" ? "ambiental" : "industrial",
    title: String(row.title ?? ""),
    nav_title: row.nav_title ?? null,
    icon_key: String(row.icon_key ?? "cog"),
    summary: row.summary ?? null,
    description: row.description ?? null,
    items: normalizeItems(row.items),
    images: normalizeImages(row.images),
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    sort: Number(row.sort ?? 0),
  }));
}

export async function getServiceRecord(
  id: string,
): Promise<ServiceRecord | null> {
  const all = await listServices();
  return all.find((s) => s.id === id) ?? null;
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("site_projects")
    .select("*")
    .order("sort", { ascending: true });
  if (!data) return [];
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    client: row.client ?? null,
    category: row.category === "ambiental" ? "ambiental" : "industrial",
    description: row.description ?? null,
    image_url: row.image_url ?? null,
    image_alt: row.image_alt ?? null,
    sort: Number(row.sort ?? 0),
  }));
}

export async function listClients(): Promise<ClientRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("site_clients")
    .select("*")
    .order("sort", { ascending: true });
  if (!data) return [];
  return data.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ""),
    logo_url: row.logo_url ?? null,
    website: row.website ?? null,
    sort: Number(row.sort ?? 0),
  }));
}

export async function listFaqs(): Promise<FaqRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("site_faqs")
    .select("*")
    .order("sort", { ascending: true });
  if (!data) return [];
  return data.map((row) => ({
    id: String(row.id),
    question: String(row.question ?? ""),
    answer: String(row.answer ?? ""),
    sort: Number(row.sort ?? 0),
  }));
}

export async function listValues(): Promise<ValueRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("site_values")
    .select("*")
    .order("sort", { ascending: true });
  if (!data) return [];
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    description: row.description ?? null,
    icon_key: String(row.icon_key ?? "shield"),
    sort: Number(row.sort ?? 0),
  }));
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const supabase = await getServerSupabase();
  const fallback: AdminSettings = {
    contact: contactDefaults,
    hero: heroDefaults,
    excellence: excellenceDefaults,
    youtube: youtubeDefaults,
  };
  if (!supabase) return fallback;

  const { data } = await supabase.from("site_settings").select("key, value");
  if (!data) return fallback;

  const map = new Map<string, unknown>(
    data.map((row) => [String(row.key), row.value]),
  );

  const contactValue = map.get("contact");
  const contact: ContactSettings = {
    ...contactDefaults,
    ...(isRecord(contactValue) ? (contactValue as Partial<ContactSettings>) : {}),
    address: {
      ...contactDefaults.address,
      ...(isRecord(contactValue) && isRecord(contactValue.address)
        ? contactValue.address
        : {}),
    },
    geo: {
      ...contactDefaults.geo,
      ...(isRecord(contactValue) && isRecord(contactValue.geo)
        ? contactValue.geo
        : {}),
    },
    social: {
      ...contactDefaults.social,
      ...(isRecord(contactValue) && isRecord(contactValue.social)
        ? contactValue.social
        : {}),
    },
  };
  if (!Array.isArray(contact.phones)) contact.phones = contactDefaults.phones;
  if (!Array.isArray(contact.emails)) contact.emails = contactDefaults.emails;

  const excellence: ExcellenceSettings = {
    ...excellenceDefaults,
    ...(isRecord(map.get("excellence"))
      ? (map.get("excellence") as Partial<ExcellenceSettings>)
      : {}),
  };
  if (!Array.isArray(excellence.stats)) excellence.stats = excellenceDefaults.stats;

  return {
    contact,
    hero: {
      ...heroDefaults,
      ...(isRecord(map.get("hero"))
        ? (map.get("hero") as Partial<HeroSettings>)
        : {}),
    },
    excellence,
    youtube: {
      ...youtubeDefaults,
      ...(isRecord(map.get("youtube"))
        ? (map.get("youtube") as Partial<YouTubeSettings>)
        : {}),
    },
  };
}

/** Conteo rápido para el tablero del panel. */
export async function getContentCounts() {
  const [services, projects, clients, faqs, values] = await Promise.all([
    listServices(),
    listProjects(),
    listClients(),
    listFaqs(),
    listValues(),
  ]);
  return {
    services: services.length,
    projects: projects.length,
    clients: clients.length,
    faqs: faqs.length,
    values: values.length,
  };
}
