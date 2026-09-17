/**
 * Tipos y lecturas del panel de administración.
 *
 * A diferencia de `src/lib/content.ts` (pensado para el sitio público, con
 * fallback estático), aquí se leen las filas CRUDAS de Supabase — incluyendo
 * `id` y `sort` — usando el cliente ligado a la sesión del administrador.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import { normalizarSettings, siteSettingsDefaults } from "@/data/site";
import { normalizeRole } from "@/lib/roles";
import { usuarioDesdeEmail } from "@/lib/usuarios";
import {
  hoyEnColombia,
  normalizarContextoCalculo,
  normalizarDesglose,
  normalizarJornadaConfig,
  jornadaConfigDefaults,
  type JornadaConfig,
} from "@/lib/jornada";
import {
  normalizarEstado,
  recortarHora,
  type EventoEstado,
  type EventoNota,
  type EventoNotaConEvento,
  type EventoRecord,
  type EventoResponsable,
} from "@/lib/calendario";
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
  GalleryImage,
  HorarioMensualRecord,
  JornadaRecord,
  JornadaStatus,
  ProfileRecord,
  ProjectRecord,
  ServiceImages,
  ServiceRecord,
  ServiceVideoRecord,
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
 * Galería de un proyecto (`site_projects.gallery`, migración 0005).
 *
 * Acepta las dos formas del par imagen/texto: `{url, alt}` —el que escribe la
 * migración— y `{src, alt}` —el que ya usaban los servicios—, para que dé igual
 * cuál se haya guardado. El panel siempre trabaja con `{src, alt}`.
 */
function normalizeProjectGallery(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((img) => ({
      src:
        typeof img.url === "string" && img.url
          ? img.url
          : typeof img.src === "string"
            ? img.src
            : "",
      alt: typeof img.alt === "string" ? img.alt : "",
    }))
    .filter((img) => img.src !== "");
}

/**
 * Video de un servicio, para el FORMULARIO (columna `video`, migración 0007).
 *
 * Devuelve `null` cuando no hay nada guardado: la columna no existe todavía,
 * está en NULL o el objeto quedó sin URL. El formulario muestra entonces los
 * campos en blanco, listos para escribir.
 */
function normalizeServiceVideo(value: unknown): ServiceVideoRecord | null {
  if (!isRecord(value)) return null;
  const url = typeof value.url === "string" ? value.url.trim() : "";
  if (url === "") return null;

  return {
    url,
    titulo: typeof value.titulo === "string" ? value.titulo : "",
    descripcion: typeof value.descripcion === "string" ? value.descripcion : "",
    visible: value.visible !== false,
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
    video: normalizeServiceVideo(row.video),
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
  // `slug`, `details` y `gallery` llegan `undefined` mientras la migración 0005
  // no esté aplicada: el panel muestra el slug propuesto desde el título y la
  // galería vacía, y al guardar se reintenta sin esas columnas.
  return data.map((row) => ({
    id: String(row.id),
    slug: typeof row.slug === "string" ? row.slug : "",
    title: String(row.title ?? ""),
    client: row.client ?? null,
    category: row.category === "ambiental" ? "ambiental" : "industrial",
    description: row.description ?? null,
    details: row.details ?? null,
    image_url: row.image_url ?? null,
    image_alt: row.image_alt ?? null,
    gallery: normalizeProjectGallery(row.gallery),
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

/**
 * Ajustes del sitio para los formularios del panel.
 *
 * Usa EXACTAMENTE la misma normalización que el sitio público
 * (`normalizarSettings` de `src/data/site.ts`): lo que el panel muestra en los
 * campos es, literalmente, lo que la página va a pintar. Cuando una clave no
 * existe todavía en la base de datos —una migración pendiente— los campos
 * aparecen con el respaldo estático, listos para guardarse tal cual.
 */
export async function getAdminSettings(): Promise<AdminSettings> {
  const supabase = await getServerSupabase();
  if (!supabase) return siteSettingsDefaults;

  try {
    const { data } = await supabase.from("site_settings").select("key, value");
    if (!data) return siteSettingsDefaults;

    return normalizarSettings(
      new Map<string, unknown>(data.map((row) => [String(row.key), row.value])),
    );
  } catch {
    return siteSettingsDefaults;
  }
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
    // `apodo` llega `undefined` si la 0010 no está aplicada: se lee como `null`
    // y en todas partes se muestra el nombre completo.
    apodo: textoOrNull(row.apodo),
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
    // Opcional desde la 0005. Las cadenas vacías de registros antiguos se
    // normalizan a `null`: una sola forma de decir "no tiene orden".
    work_order:
      typeof row.work_order === "string" && row.work_order.trim() !== ""
        ? row.work_order.trim()
        : null,
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

/* ------------------------------------------------------------------ */
/* Calendario interno (migración 0010)                                 */
/* ------------------------------------------------------------------ */

/**
 * LECTURAS DEL CALENDARIO
 * -----------------------
 * Todas usan el cliente ligado a la SESIÓN, así que el alcance lo decide RLS:
 * un manager ve el calendario completo y cualquier otra cuenta activa solo los
 * eventos en los que figura como responsable. Aquí no se filtra por rol a mano
 * (`responsableId` es un filtro de la interfaz, nunca la barrera de seguridad).
 *
 * Si Supabase no responde —o si la migración 0010 no estuviera aplicada— todas
 * devuelven listas vacías y la pantalla muestra su estado vacío en vez de
 * romperse, igual que el resto del panel.
 */

/** Nombre y cargo de un puñado de cuentas, en una sola consulta. */
type PerfilBreve = { nombre: string; apodo: string | null; cargo: string | null };

function aPerfilBreve(p: Record<string, unknown>): [string, PerfilBreve] {
  return [
    String(p.id),
    {
      nombre: String(p.full_name ?? p.email ?? ""),
      apodo: textoOrNull(p.apodo),
      cargo: textoOrNull(p.cargo),
    },
  ];
}

/**
 * Nombre, apodo y cargo de un puñado de cuentas.
 *
 * POR QUÉ COMPLETA CON LA CLAVE DE SERVICIO
 * -----------------------------------------
 * Las políticas de `profiles` (migración 0002) dejan que cada persona lea
 * **solo su propia fila**; las demás son cosa de los managers. Eso está bien
 * para el panel, pero rompe el portal: un empleado que abre «Mis eventos» tiene
 * derecho a ver CON QUIÉN comparte la actividad, y con el cliente de su sesión
 * sus compañeros le llegarían como «Cuenta eliminada».
 *
 * Así que lo que la sesión no puede leer se completa en el SERVIDOR con la
 * clave de servicio, y **solo de esas tres columnas**: nombre, apodo y cargo.
 * Ni cédula, ni teléfono, ni correo. Los ids que se resuelven no son
 * arbitrarios: salen de eventos y notas que RLS ya dejó leer a esa persona, así
 * que no se filtra nada que no le corresponda. Es el mismo criterio con el que
 * los mensajes de contacto se guardan con esa clave (ver la 0006).
 *
 * Sin `SUPABASE_SERVICE_ROLE_KEY` el portal sigue funcionando: los compañeros
 * aparecen como «Cuenta del equipo» en vez de con su nombre.
 */
async function mapaDePerfiles(
  supabase: SupabaseClient,
  ids: (string | null)[],
): Promise<Map<string, PerfilBreve>> {
  const unicos = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unicos.length === 0) return new Map();

  // `select("*")` y no una lista de columnas: `apodo` solo existe desde la 0010
  // y pedirla por nombre rompería la consulta entera si faltara.
  const { data } = await supabase.from("profiles").select("*").in("id", unicos);
  const mapa = new Map<string, PerfilBreve>((data ?? []).map(aPerfilBreve));

  const faltantes = unicos.filter((id) => !mapa.has(id));
  if (faltantes.length === 0) return mapa;

  const servicio = getServiceRoleSupabase();
  if (!servicio) return mapa;

  try {
    const { data: extra } = await servicio
      .from("profiles")
      .select("id, full_name, email, apodo, cargo")
      .in("id", faltantes);
    for (const fila of extra ?? []) {
      const [id, perfil] = aPerfilBreve(fila);
      mapa.set(id, perfil);
    }
  } catch {
    // Si falla, los compañeros se muestran con el texto de respaldo.
  }

  return mapa;
}

function nombreDePerfil(
  perfiles: Map<string, PerfilBreve>,
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  return perfiles.get(id)?.nombre ?? null;
}

export interface EventoFilters {
  /** `YYYY-MM-DD` — primer día incluido. */
  desde?: string;
  /** `YYYY-MM-DD` — último día incluido. */
  hasta?: string;
  estado?: EventoEstado;
  /** Solo los eventos de esta cuenta (filtro de la interfaz, no de seguridad). */
  responsableId?: string;
  /** true = trae también el texto de las notas, no solo cuántas hay. */
  conNotas?: boolean;
  limit?: number;
}

/** Eventos del calendario con sus responsables y, si se piden, sus notas. */
export async function listEventos(
  filters: EventoFilters = {},
): Promise<EventoRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    // Filtrar por responsable obliga a resolver antes sus eventos: la relación
    // vive en otra tabla y no se puede expresar con un `.eq()` sobre `eventos`.
    let idsDelResponsable: string[] | null = null;
    if (filters.responsableId) {
      const { data } = await supabase
        .from("evento_responsables")
        .select("evento_id")
        .eq("profile_id", filters.responsableId);
      idsDelResponsable = [
        ...new Set((data ?? []).map((r) => String(r.evento_id))),
      ];
      if (idsDelResponsable.length === 0) return [];
    }

    let query = supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(filters.limit ?? 500);

    if (filters.desde) query = query.gte("fecha", filters.desde);
    if (filters.hasta) query = query.lte("fecha", filters.hasta);
    if (filters.estado) query = query.eq("estado", filters.estado);
    if (idsDelResponsable) query = query.in("id", idsDelResponsable);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];

    const ids = data.map((row) => String(row.id));

    const [responsablesRes, notasRes] = await Promise.all([
      supabase
        .from("evento_responsables")
        .select("id, evento_id, profile_id, nombre_externo")
        .in("evento_id", ids),
      supabase
        .from("evento_notas")
        .select("id, evento_id, autor_id, texto, created_at")
        .in("evento_id", ids)
        .order("created_at", { ascending: false }),
    ]);

    const responsables = responsablesRes.data ?? [];
    const notas = notasRes.data ?? [];

    const perfiles = await mapaDePerfiles(supabase, [
      ...data.map((row) => (row.creado_por ? String(row.creado_por) : null)),
      ...responsables.map((r) => (r.profile_id ? String(r.profile_id) : null)),
      ...notas.map((n) => (n.autor_id ? String(n.autor_id) : null)),
    ]);

    const porEvento = new Map<string, EventoResponsable[]>();
    for (const fila of responsables) {
      const eventoId = String(fila.evento_id);
      const profileId = fila.profile_id ? String(fila.profile_id) : null;
      const perfil = profileId ? perfiles.get(profileId) : undefined;
      const item: EventoResponsable = {
        id: String(fila.id),
        profileId,
        nombre: profileId
          ? (perfil?.nombre ?? "Cuenta del equipo")
          : String(fila.nombre_externo ?? ""),
        // Los externos no tienen cuenta, así que tampoco apodo.
        apodo: profileId ? (perfil?.apodo ?? null) : null,
        cargo: profileId ? (perfil?.cargo ?? null) : null,
        externo: profileId === null,
      };
      const lista = porEvento.get(eventoId);
      if (lista) lista.push(item);
      else porEvento.set(eventoId, [item]);
    }

    const notasPorEvento = new Map<string, EventoNota[]>();
    for (const fila of notas) {
      const eventoId = String(fila.evento_id);
      const autorId = fila.autor_id ? String(fila.autor_id) : null;
      const item: EventoNota = {
        id: String(fila.id),
        eventoId,
        autorId,
        autorNombre: nombreDePerfil(perfiles, autorId) ?? "Cuenta eliminada",
        autorApodo: autorId ? (perfiles.get(autorId)?.apodo ?? null) : null,
        texto: String(fila.texto ?? ""),
        createdAt: String(fila.created_at ?? ""),
      };
      const lista = notasPorEvento.get(eventoId);
      if (lista) lista.push(item);
      else notasPorEvento.set(eventoId, [item]);
    }

    return data.map((row) => {
      const id = String(row.id);
      const delEvento = notasPorEvento.get(id) ?? [];
      const creadoPor = row.creado_por ? String(row.creado_por) : null;
      return {
        id,
        titulo: String(row.titulo ?? ""),
        descripcion: textoOrNull(row.descripcion),
        fecha: String(row.fecha ?? ""),
        horaInicio: recortarHora(row.hora_inicio),
        horaFin: recortarHora(row.hora_fin),
        estado: normalizarEstado(row.estado),
        fechaOriginal:
          typeof row.fecha_original === "string" ? row.fecha_original : null,
        creadoPor,
        creadoPorNombre: nombreDePerfil(perfiles, creadoPor),
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
        responsables: (porEvento.get(id) ?? []).sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es"),
        ),
        notas: filters.conNotas ? delEvento : [],
        totalNotas: delEvento.length,
      } satisfies EventoRecord;
    });
  } catch {
    return [];
  }
}

export interface NotaFilters {
  eventoId?: string;
  autorId?: string;
  /** Rango sobre la FECHA DE LA NOTA (no la del evento), en hora de Colombia. */
  desde?: string;
  hasta?: string;
  limit?: number;
}

/**
 * Todas las notas visibles, de la más reciente a la más antigua, con su evento
 * y su autor ya resueltos. Es la fuente de la pestaña «Notas».
 */
export async function listNotasEventos(
  filters: NotaFilters = {},
): Promise<EventoNotaConEvento[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("evento_notas")
      .select("id, evento_id, autor_id, texto, created_at")
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 1000);

    if (filters.eventoId) query = query.eq("evento_id", filters.eventoId);
    if (filters.autorId) query = query.eq("autor_id", filters.autorId);
    // Los filtros de fecha son días completos en hora de Colombia (UTC-5).
    if (filters.desde)
      query = query.gte("created_at", `${filters.desde}T00:00:00-05:00`);
    if (filters.hasta)
      query = query.lte("created_at", `${filters.hasta}T23:59:59-05:00`);

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];

    const eventoIds = [...new Set(data.map((n) => String(n.evento_id)))];
    const [eventosRes, perfiles] = await Promise.all([
      supabase.from("eventos").select("id, titulo, fecha, estado").in("id", eventoIds),
      mapaDePerfiles(
        supabase,
        data.map((n) => (n.autor_id ? String(n.autor_id) : null)),
      ),
    ]);

    const porId = new Map(
      (eventosRes.data ?? []).map((e) => [
        String(e.id),
        {
          titulo: String(e.titulo ?? ""),
          fecha: String(e.fecha ?? ""),
          estado: normalizarEstado(e.estado),
        },
      ]),
    );

    return data.map((n) => {
      const eventoId = String(n.evento_id);
      const evento = porId.get(eventoId);
      const autorId = n.autor_id ? String(n.autor_id) : null;
      return {
        id: String(n.id),
        eventoId,
        autorId,
        autorNombre: nombreDePerfil(perfiles, autorId) ?? "Cuenta eliminada",
        autorApodo: autorId ? (perfiles.get(autorId)?.apodo ?? null) : null,
        texto: String(n.texto ?? ""),
        createdAt: String(n.created_at ?? ""),
        eventoTitulo: evento?.titulo ?? "Evento eliminado",
        eventoFecha: evento?.fecha ?? "",
        eventoEstado: evento?.estado ?? "programado",
      } satisfies EventoNotaConEvento;
    });
  } catch {
    return [];
  }
}

/** Eventos abiertos de hoy en adelante (contador de la tarjeta del dashboard). */
export async function getCalendarioCounts() {
  const supabase = await getServerSupabase();
  if (!supabase) return { proximos: 0 };

  try {
    const { count } = await supabase
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .gte("fecha", hoyEnColombia())
      .in("estado", ["programado", "aplazado"]);
    return { proximos: count ?? 0 };
  } catch {
    return { proximos: 0 };
  }
}
