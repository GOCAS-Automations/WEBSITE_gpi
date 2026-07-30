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
  visibilityDefaults,
  youtubeDefaults,
  type ContactSettings,
  type ExcellenceSettings,
  type HeroSettings,
  type VisibilitySettings,
  type YouTubeSettings,
} from "@/data/site";
import { normalizeRole } from "@/lib/roles";
import { usuarioDesdeEmail } from "@/lib/usuarios";
import {
  normalizarContextoCalculo,
  normalizarDesglose,
  normalizarJornadaConfig,
  jornadaConfigDefaults,
  type JornadaConfig,
} from "@/lib/jornada";
import {
  claveMes,
  clonarHorario,
  normalizarHorarioDias,
  type HorarioDias,
  type MapaHorarios,
} from "@/lib/horarios";
import type {
  AdminSettings,
  ClientRecord,
  FaqRecord,
  HorarioMensualRecord,
  JornadaRecord,
  JornadaStatus,
  ProfileRecord,
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

/**
 * `published` llega `undefined` mientras la migración 0002 no esté aplicada:
 * en ese caso se considera publicado (el comportamiento anterior a 0002).
 */
function isPublished(value: unknown): boolean {
  return value !== false;
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
    published: isPublished(row.published),
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
    published: isPublished(row.published),
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
    published: isPublished(row.published),
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
    published: isPublished(row.published),
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
    published: isPublished(row.published),
  }));
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const supabase = await getServerSupabase();
  const fallback: AdminSettings = {
    contact: contactDefaults,
    hero: heroDefaults,
    excellence: excellenceDefaults,
    youtube: youtubeDefaults,
    visibility: visibilityDefaults,
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

  const visibilityValue = map.get("visibility");
  const visibility: VisibilitySettings = { ...visibilityDefaults };
  if (isRecord(visibilityValue)) {
    for (const key of Object.keys(visibilityDefaults) as (keyof VisibilitySettings)[]) {
      if (typeof visibilityValue[key] === "boolean") {
        visibility[key] = visibilityValue[key];
      }
    }
  }

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
    visibility,
  };
}

/**
 * Parámetros de cálculo de jornadas (`site_settings.jornada_config`).
 * Si la base de datos no responde o la clave no existe, devuelve los valores
 * por defecto de `src/lib/jornada.ts`: el portal nunca depende de la BD.
 */
export async function getJornadaConfig(): Promise<JornadaConfig> {
  const supabase = await getServerSupabase();
  if (!supabase) return jornadaConfigDefaults;

  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "jornada_config")
      .maybeSingle();

    if (error || !data) return jornadaConfigDefaults;
    return normalizarJornadaConfig(data.value);
  } catch {
    return jornadaConfigDefaults;
  }
}

/* ------------------------------------------------------------------ */
/* Horarios laborales mensuales (`horarios_mensuales`)                 */
/* ------------------------------------------------------------------ */

/**
 * Todos los horarios cargados, indexados por `"YYYY-MM"`.
 *
 * Es la entrada de `calcularJornada`: con este mapa cada jornada sabe cuál era
 * la jornada ordinaria del mes en que se trabajó. Si la tabla todavía no existe
 * (migración 0003 sin aplicar) o la consulta falla, devuelve `{}` y el cálculo
 * cae en el horario predeterminado de GPI.
 */
export async function getMapaHorarios(): Promise<MapaHorarios> {
  const supabase = await getServerSupabase();
  if (!supabase) return {};

  try {
    const { data, error } = await supabase
      .from("horarios_mensuales")
      .select("anio, mes, dias");

    if (error || !data) return {};

    const mapa: MapaHorarios = {};
    for (const fila of data) {
      const anio = Number(fila.anio);
      const mes = Number(fila.mes);
      if (!Number.isInteger(anio) || !Number.isInteger(mes)) continue;
      mapa[claveMes(anio, mes)] = normalizarHorarioDias(fila.dias);
    }
    return mapa;
  } catch {
    return {};
  }
}

function rowToHorario(row: Record<string, unknown>): HorarioMensualRecord {
  return {
    id: typeof row.id === "string" ? row.id : null,
    anio: Number(row.anio),
    mes: Number(row.mes),
    dias: normalizarHorarioDias(row.dias),
    notas: typeof row.notas === "string" && row.notas.trim() !== "" ? row.notas : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/** Horario de un mes concreto, o `null` si no está guardado. */
export async function getHorarioMensual(
  anio: number,
  mes: number,
): Promise<HorarioMensualRecord | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("horarios_mensuales")
      .select("*")
      .eq("anio", anio)
      .eq("mes", mes)
      .maybeSingle();

    if (error || !data) return null;
    return rowToHorario(data);
  } catch {
    return null;
  }
}

/** De dónde salió el horario que se acaba de crear (para el aviso del panel). */
export type OrigenHorario = "existente" | "mes-anterior" | "predeterminado" | "sin-guardar";

export interface HorarioResuelto {
  horario: HorarioMensualRecord;
  origen: OrigenHorario;
  /** Mes del que se clonó, cuando `origen === "mes-anterior"`. */
  clonadoDe?: { anio: number; mes: number };
}

/**
 * Devuelve el horario del mes y, si no existe, LO CREA:
 *   1. clonando el mes anterior si está cargado;
 *   2. o, si no, con el horario semanal por defecto de `jornada_config`.
 *
 * Se llama al entrar a `/admin/horarios` para que el mes en curso siempre esté
 * listo para editar. Si la tabla no existe todavía (migración 0003 sin aplicar)
 * o el usuario no tiene permiso de escritura, devuelve el horario propuesto con
 * `origen: "sin-guardar"` y la pantalla lo explica en vez de romperse.
 */
export async function asegurarHorarioMensual(
  anio: number,
  mes: number,
): Promise<HorarioResuelto> {
  const config = await getJornadaConfig();

  const existente = await getHorarioMensual(anio, mes);
  if (existente) return { horario: existente, origen: "existente" };

  // Mes anterior como plantilla.
  const anterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const plantilla = await getHorarioMensual(anterior.anio, anterior.mes);

  const dias: HorarioDias = plantilla
    ? clonarHorario(plantilla.dias)
    : clonarHorario(config.horarioSemanal);

  const propuesta: HorarioMensualRecord = {
    id: null,
    anio,
    mes,
    dias,
    notas: null,
    updated_at: null,
  };

  const supabase = await getServerSupabase();
  if (!supabase) return { horario: propuesta, origen: "sin-guardar" };

  try {
    const { data, error } = await supabase
      .from("horarios_mensuales")
      .insert({ anio, mes, dias, notas: null })
      .select("*")
      .maybeSingle();

    if (error || !data) {
      // Puede que otro manager lo haya creado en el mismo instante: se vuelve a
      // leer antes de dar el mes por no guardado.
      const recien = await getHorarioMensual(anio, mes);
      if (recien) return { horario: recien, origen: "existente" };
      return { horario: propuesta, origen: "sin-guardar" };
    }

    return plantilla
      ? {
          horario: rowToHorario(data),
          origen: "mes-anterior",
          clonadoDe: anterior,
        }
      : { horario: rowToHorario(data), origen: "predeterminado" };
  } catch {
    return { horario: propuesta, origen: "sin-guardar" };
  }
}

/* ------------------------------------------------------------------ */
/* Cuentas del equipo (`profiles`)                                     */
/* ------------------------------------------------------------------ */

/** Texto no vacío o `null` (las columnas nuevas pueden no existir todavía). */
function textoOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function rowToProfile(row: Record<string, unknown>): ProfileRecord {
  const email = typeof row.email === "string" ? row.email : "";
  // `username`, `cedula` y `email_contacto` llegan `undefined` mientras la
  // migración 0003 no esté aplicada: la cuenta se identifica entonces por su
  // correo, como antes.
  return {
    id: String(row.id),
    email,
    username: textoOrNull(row.username) ?? usuarioDesdeEmail(email),
    full_name: typeof row.full_name === "string" && row.full_name ? row.full_name : email,
    role: normalizeRole(row.role),
    cargo: textoOrNull(row.cargo),
    phone: textoOrNull(row.phone),
    cedula: textoOrNull(row.cedula),
    email_contacto: textoOrNull(row.email_contacto),
    active: row.active !== false,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

/** Todas las cuentas del portal, ordenadas por nombre. */
export async function listProfiles(): Promise<ProfileRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    if (error || !data) return [];
    return data.map(rowToProfile);
  } catch {
    return [];
  }
}

export async function getProfileRecord(id: string): Promise<ProfileRecord | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return rowToProfile(data);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Jornadas                                                            */
/* ------------------------------------------------------------------ */

function rowToJornada(row: Record<string, unknown>): JornadaRecord {
  const status = row.status;
  return {
    id: String(row.id),
    employee_id: String(row.employee_id ?? ""),
    work_order: String(row.work_order ?? ""),
    work_date: String(row.work_date ?? ""),
    start_at: String(row.start_at ?? ""),
    end_at: String(row.end_at ?? ""),
    description: String(row.description ?? ""),
    observations:
      typeof row.observations === "string" && row.observations ? row.observations : null,
    status:
      status === "aprobada" || status === "rechazada"
        ? (status as JornadaStatus)
        : "pendiente",
    review_note:
      typeof row.review_note === "string" && row.review_note ? row.review_note : null,
    reviewed_by: typeof row.reviewed_by === "string" ? row.reviewed_by : null,
    reviewed_at: typeof row.reviewed_at === "string" ? row.reviewed_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    // Snapshot del cálculo (migración 0004). Las consultas usan `select("*")`,
    // así que mientras la 0004 no esté aplicada estas claves llegan
    // `undefined` y los normalizadores devuelven `null`: el desglose se
    // calcula en vivo, exactamente como antes.
    desglose: normalizarDesglose(row.desglose),
    contexto_calculo: normalizarContextoCalculo(row.contexto_calculo),
    calculado_at: typeof row.calculado_at === "string" ? row.calculado_at : null,
  };
}

export interface JornadaFilters {
  status?: JornadaStatus | "todas";
  employeeId?: string;
  /** `YYYY-MM-DD` */
  from?: string;
  /** `YYYY-MM-DD` */
  to?: string;
  limit?: number;
}

/**
 * Jornadas visibles para el usuario actual (RLS decide el alcance: un empleado
 * solo ve las suyas, un manager las de todo el equipo). Adjunta el nombre del
 * empleado y del revisor resolviéndolos contra `profiles` en una segunda
 * consulta (más robusto que depender del nombre de la clave foránea).
 */
export async function listJornadas(
  filters: JornadaFilters = {},
): Promise<JornadaRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("jornadas")
      .select("*")
      .order("work_date", { ascending: false })
      .order("start_at", { ascending: false })
      .limit(filters.limit ?? 300);

    if (filters.status && filters.status !== "todas") {
      query = query.eq("status", filters.status);
    }
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.from) query = query.gte("work_date", filters.from);
    if (filters.to) query = query.lte("work_date", filters.to);

    const { data, error } = await query;
    if (error || !data) return [];

    const jornadas = data.map(rowToJornada);

    const ids = [
      ...new Set(
        jornadas
          .flatMap((j) => [j.employee_id, j.reviewed_by])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (ids.length === 0) return jornadas;

    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);

    const byId = new Map(
      (people ?? []).map((p) => [
        String(p.id),
        {
          name: String(p.full_name ?? p.email ?? ""),
          email: String(p.email ?? ""),
        },
      ]),
    );

    return jornadas.map((j) => ({
      ...j,
      employee_name: byId.get(j.employee_id)?.name,
      employee_email: byId.get(j.employee_id)?.email,
      reviewer_name: j.reviewed_by ? byId.get(j.reviewed_by)?.name : undefined,
    }));
  } catch {
    return [];
  }
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

/** Conteos de la sección de gestión interna (solo managers). */
export async function getTeamCounts() {
  const supabase = await getServerSupabase();
  if (!supabase) return { people: 0, pending: 0 };

  try {
    const [{ count: people }, { count: pending }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("jornadas")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendiente"),
    ]);
    return { people: people ?? 0, pending: pending ?? 0 };
  } catch {
    return { people: 0, pending: 0 };
  }
}
