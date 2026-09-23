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
  resolverDesglosesDeUnaPersona,
  jornadaConfigDefaults,
  type JornadaConfig,
} from "@/lib/jornada";
import {
  configVigente,
  minutosVacios,
  normalizarEstadoNomina,
  numeroSeguro,
  sumarMinutos,
  type MinutosPorConcepto,
  type TarifasNomina,
  type TipoPeriodo,
} from "@/lib/nomina";
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
  horarioDelDia,
  minutosJornadaDia,
  minutosSemanales,
  normalizarHorarioDias,
  type HorarioDias,
  type MapaHorarios,
} from "@/lib/horarios";
import {
  descuenta,
  diasDelPermiso,
  faltasDelPeriodo,
  faltasVacias,
  normalizarEstadoPermiso,
  normalizarOrigenPermiso,
  normalizarTipoPermiso,
  sumarDias as sumarDiasFecha,
  type FaltasPeriodo,
  type PermisoEstado,
  type PermisoParaNomina,
  type PermisoRecord,
} from "@/lib/permisos";
import {
  parametrosLegalesDelMes,
  type ParametrosLegalesMes,
} from "@/lib/ley-laboral";
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
  NominaConfigRecord,
  NominaLiquidacionRecord,
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
    .order("sort", { ascending: true })
    // Desempate estable: con el mismo número de orden, la paginación de 10 en
    // 10 no puede repartir las filas distinto en cada consulta.
    .order("created_at", { ascending: true });
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
    .order("sort", { ascending: true })
    // Desempate estable: con el mismo número de orden, la paginación de 10 en
    // 10 no puede repartir las filas distinto en cada consulta.
    .order("created_at", { ascending: true });
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
    .order("sort", { ascending: true })
    // Desempate estable: con el mismo número de orden, la paginación de 10 en
    // 10 no puede repartir las filas distinto en cada consulta.
    .order("created_at", { ascending: true });
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
    .order("sort", { ascending: true })
    // Desempate estable: con el mismo número de orden, la paginación de 10 en
    // 10 no puede repartir las filas distinto en cada consulta.
    .order("created_at", { ascending: true });
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
    .order("sort", { ascending: true })
    // Desempate estable: con el mismo número de orden, la paginación de 10 en
    // 10 no puede repartir las filas distinto en cada consulta.
    .order("created_at", { ascending: true });
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

/**
 * Lo que la ley exige para liquidar un mes de nómina: el divisor del valor hora
 * (con las horas semanales del HORARIO de ese mes, nunca más que las legales) y
 * el recargo dominical vigente. Si el mes no tiene horario cargado se usan las
 * horas legales. Es lo que alimenta las tarifas sugeridas y el aviso de «por
 * debajo del mínimo legal» (configuración, guardado y liquidación).
 */
export async function parametrosLegalesNomina(
  anio: number,
  mes: number,
  horarios?: MapaHorarios,
): Promise<ParametrosLegalesMes> {
  const mapa = horarios ?? (await getMapaHorarios());
  const dias = mapa[claveMes(anio, mes)];
  const horasPactadas = dias ? minutosSemanales(dias) / 60 : null;
  return parametrosLegalesDelMes(anio, mes, horasPactadas);
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

/**
 * Cuántos ids de evento se piden por consulta. PostgREST manda el filtro `in`
 * en la URL, así que con los 2000 eventos que trae el tablero de métricas una
 * sola llamada armaría una dirección de decenas de miles de caracteres y el
 * servidor la rechazaría; además Supabase corta cualquier respuesta en 1000
 * filas (`db-max-rows`), y un evento puede tener varios responsables y varias
 * notas. Por eso se pide por tandas y se pagina dentro de cada una: sin esto,
 * «carga por responsable» y «notas escritas» del tablero se quedarían cortas en
 * silencio, que es peor que fallar.
 */
const EVENTOS_POR_TANDA = 100;
const FILAS_POR_TANDA = 1000;

/** Trae TODAS las filas hijas de un conjunto de eventos, sin topes ocultos. */
async function filasDeEventos<T>(
  supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>,
  tabla: "evento_responsables" | "evento_notas",
  columnas: string,
  eventoIds: string[],
): Promise<T[]> {
  const filas: T[] = [];

  for (let i = 0; i < eventoIds.length; i += EVENTOS_POR_TANDA) {
    const tanda = eventoIds.slice(i, i + EVENTOS_POR_TANDA);
    let desde = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(tabla)
        .select(columnas)
        .in("evento_id", tanda)
        .range(desde, desde + FILAS_POR_TANDA - 1);
      if (error || !data || data.length === 0) break;
      filas.push(...(data as T[]));
      if (data.length < FILAS_POR_TANDA) break;
      desde += FILAS_POR_TANDA;
    }
  }

  return filas;
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

    const [responsables, notasSinOrden] = await Promise.all([
      filasDeEventos<{
        id: string;
        evento_id: string;
        profile_id: string | null;
        nombre_externo: string | null;
      }>(
        supabase,
        "evento_responsables",
        "id, evento_id, profile_id, nombre_externo",
        ids,
      ),
      filasDeEventos<{
        id: string;
        evento_id: string;
        autor_id: string | null;
        texto: string;
        created_at: string;
      }>(
        supabase,
        "evento_notas",
        "id, evento_id, autor_id, texto, created_at",
        ids,
      ),
    ]);

    // El orden se impone aquí: al venir en tandas, ordenar en la consulta solo
    // ordenaría dentro de cada una. Más reciente primero.
    const notas = [...notasSinOrden].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );

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

/* ------------------------------------------------------------------ */
/* Nómina (`nomina_config_mensual` y `nomina_liquidaciones`)           */
/* ------------------------------------------------------------------ */

/**
 * ¿El error de Supabase se debe a que las tablas de la migración 0011 todavía
 * no existen? Se usa para caer en un estado vacío explicado en vez de romper la
 * pantalla, igual que hace el resto del panel con sus migraciones.
 */
export function faltaTablaNomina(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const mensaje = error.message ?? "";
  return (
    /nomina_(config_mensual|liquidaciones)/i.test(mensaje) &&
    /(does not exist|no existe|schema cache|find the table)/i.test(mensaje)
  );
}

function rowToNominaConfig(row: Record<string, unknown>): NominaConfigRecord {
  const tarifas: TarifasNomina = {
    horaBase: numeroSeguro(row.valor_hora_base),
    rotacionNocturna: numeroSeguro(row.valor_rotacion_nocturna),
    extraDiurna: numeroSeguro(row.valor_extra_diurna),
    extraNocturna: numeroSeguro(row.valor_extra_nocturna),
    festivo: numeroSeguro(row.valor_festivo),
    extraFestivoDiurna: numeroSeguro(row.valor_extra_festivo_diurna),
    extraFestivoNocturna: numeroSeguro(row.valor_extra_festivo_nocturna),
  };

  return {
    id: String(row.id),
    employee_id: String(row.employee_id),
    anio: Number(row.anio),
    mes: Number(row.mes),
    salario_basico: numeroSeguro(row.salario_basico),
    aux_transporte: numeroSeguro(row.aux_transporte),
    tarifas,
    pct_salud: numeroSeguro(row.pct_salud, 4),
    pct_pension: numeroSeguro(row.pct_pension, 4),
    // Columna de la 0013: `undefined` mientras no esté aplicada → no es corte.
    sin_configuracion: row.sin_configuracion === true,
    copiado_de: typeof row.copiado_de === "string" ? row.copiado_de : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/** Las columnas de `nomina_config_mensual` a partir de un registro del panel. */
export function nominaConfigAColumnas(
  config: Pick<
    NominaConfigRecord,
    "salario_basico" | "aux_transporte" | "tarifas" | "pct_salud" | "pct_pension"
  >,
): Record<string, number> {
  return {
    salario_basico: config.salario_basico,
    aux_transporte: config.aux_transporte,
    valor_hora_base: config.tarifas.horaBase,
    valor_rotacion_nocturna: config.tarifas.rotacionNocturna,
    valor_extra_diurna: config.tarifas.extraDiurna,
    valor_extra_nocturna: config.tarifas.extraNocturna,
    valor_festivo: config.tarifas.festivo,
    valor_extra_festivo_diurna: config.tarifas.extraFestivoDiurna,
    valor_extra_festivo_nocturna: config.tarifas.extraFestivoNocturna,
    pct_salud: config.pct_salud,
    pct_pension: config.pct_pension,
  };
}

/*
 * CONFIGURACIÓN «VIGENTE DESDE» (18 sep 2026)
 * -------------------------------------------
 * Una fila guardada en el mes M rige para M y los meses siguientes hasta la
 * próxima fila de esa persona. Estas lecturas NUNCA crean filas: solo leen y
 * resuelven con `configVigente()` / `estadoConfigMes()` de `src/lib/nomina.ts`,
 * que es la regla única (y la que entiende los CORTES de la 0013: una fila con
 * `sin_configuracion = true` deja a la persona sin configuración desde su mes).
 * Crear o cambiar una fila es cosa exclusiva de `saveNominaConfig` (guardar),
 * `cortarHerenciaConfig` (suspender la herencia) y `quitarConfigMes` (quitar).
 */

/**
 * TODAS las filas de configuración, agrupadas por empleado (de la más antigua a
 * la más reciente). Una sola consulta: la tabla tiene una fila por cambio y por
 * persona, así que es pequeña, y leerla entera evita una consulta por mes o por
 * persona (lo que hacía lento el Tablero). `hasta` recorta a los meses ≤ ese.
 */
export async function listNominaConfigsPorEmpleado(
  hasta?: { anio: number; mes: number },
): Promise<{ porEmpleado: Map<string, NominaConfigRecord[]>; error: "sin-tabla" | "lectura" | null }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { porEmpleado: new Map(), error: "lectura" };

  try {
    let query = supabase
      .from("nomina_config_mensual")
      .select("*")
      .order("anio", { ascending: true })
      .order("mes", { ascending: true });
    if (hasta) {
      query = query.or(
        `anio.lt.${hasta.anio},and(anio.eq.${hasta.anio},mes.lte.${hasta.mes})`,
      );
    }

    const { data, error } = await query;
    if (error)
      return { porEmpleado: new Map(), error: faltaTablaNomina(error) ? "sin-tabla" : "lectura" };

    const porEmpleado = new Map<string, NominaConfigRecord[]>();
    for (const row of data ?? []) {
      const config = rowToNominaConfig(row);
      const lista = porEmpleado.get(config.employee_id) ?? [];
      lista.push(config);
      porEmpleado.set(config.employee_id, lista);
    }
    return { porEmpleado, error: null };
  } catch {
    return { porEmpleado: new Map(), error: "lectura" };
  }
}

/** La fila guardada EXACTAMENTE en ese mes (válida o no), o `null`. */
export async function getNominaConfigDelMes(
  employeeId: string,
  anio: number,
  mes: number,
): Promise<NominaConfigRecord | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("nomina_config_mensual")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("anio", anio)
      .eq("mes", mes)
      .maybeSingle();

    if (error || !data) return null;
    return rowToNominaConfig(data);
  } catch {
    return null;
  }
}

/**
 * Todas las filas de configuración de UN empleado, de la más antigua a la más
 * reciente (incluidas las vacías del modelo anterior: la resolución las
 * descarta). `error` distingue «no tiene ninguna» de «no se pudo leer».
 */
export async function listNominaConfigsEmpleado(
  employeeId: string,
): Promise<{ filas: NominaConfigRecord[]; error: "sin-tabla" | "lectura" | null }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { filas: [], error: "lectura" };

  try {
    const { data, error } = await supabase
      .from("nomina_config_mensual")
      .select("*")
      .eq("employee_id", employeeId)
      .order("anio", { ascending: true })
      .order("mes", { ascending: true });

    if (error) return { filas: [], error: faltaTablaNomina(error) ? "sin-tabla" : "lectura" };
    return { filas: (data ?? []).map(rowToNominaConfig), error: null };
  } catch {
    return { filas: [], error: "lectura" };
  }
}

/**
 * La configuración que RIGE para un empleado en un mes: la suya de ese mes o
 * la heredada del cambio anterior más reciente. `null` = sin configurar.
 */
export async function getNominaConfigVigente(
  employeeId: string,
  anio: number,
  mes: number,
): Promise<NominaConfigRecord | null> {
  const { filas } = await listNominaConfigsEmpleado(employeeId);
  return configVigente(filas, anio, mes);
}

/**
 * La configuración que RIGE en un mes para TODO el equipo, indexada por
 * empleado. Una sola consulta: todas las filas hasta ese mes (inclusive), y la
 * resolución se hace aquí con la regla única.
 */
export async function mapaNominaConfigsVigentes(
  anio: number,
  mes: number,
): Promise<Map<string, NominaConfigRecord>> {
  const { porEmpleado } = await listNominaConfigsPorEmpleado({ anio, mes });
  const salida = new Map<string, NominaConfigRecord>();
  for (const [employeeId, filas] of porEmpleado) {
    const vigente = configVigente(filas, anio, mes);
    if (vigente) salida.set(employeeId, vigente);
  }
  return salida;
}

/* --- Liquidaciones ------------------------------------------------- */

function rowToLiquidacion(row: Record<string, unknown>): NominaLiquidacionRecord {
  const quincenaBruta = Number(row.quincena);
  return {
    id: String(row.id),
    employee_id: String(row.employee_id),
    tipo: (row.tipo === "mes" ? "mes" : "quincena") as TipoPeriodo,
    anio: Number(row.anio),
    mes: Number(row.mes),
    quincena: quincenaBruta === 1 || quincenaBruta === 2 ? quincenaBruta : null,
    fecha_inicio: String(row.fecha_inicio ?? ""),
    fecha_fin: String(row.fecha_fin ?? ""),
    dias_liquidados: numeroSeguro(row.dias_liquidados),
    conceptos: row.conceptos ?? null,
    estado: normalizarEstadoNomina(row.estado),
    snapshot: row.snapshot ?? null,
    calculado_at: typeof row.calculado_at === "string" ? row.calculado_at : null,
    fecha_pago: typeof row.fecha_pago === "string" ? row.fecha_pago : null,
    notas: typeof row.notas === "string" ? row.notas : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export interface LiquidacionFilters {
  employeeId?: string;
  anio?: number;
  mes?: number;
  tipo?: TipoPeriodo;
  quincena?: 1 | 2;
  estado?: NominaLiquidacionRecord["estado"];
  limit?: number;
  /**
   * `false` = no resolver los nombres contra `profiles` (ahorra una consulta en
   * serie). Lo usan las pestañas de nómina, que ya tienen la lista de cuentas.
   */
  nombres?: boolean;
}

/**
 * Liquidaciones visibles para el usuario actual. RLS decide el alcance: un
 * manager ve las de todo el equipo; un empleado, solo las suyas y solo cuando
 * están cerradas o pagadas.
 *
 * Adjunta los datos del empleado (nombre, usuario, cédula y cargo) con una
 * segunda consulta a `profiles`, igual que `listJornadas`.
 */
export async function listLiquidaciones(
  filters: LiquidacionFilters = {},
): Promise<NominaLiquidacionRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("nomina_liquidaciones")
      .select("*")
      .order("anio", { ascending: false })
      .order("mes", { ascending: false })
      .order("quincena", { ascending: false, nullsFirst: false })
      .limit(filters.limit ?? 400);

    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.anio) query = query.eq("anio", filters.anio);
    if (filters.mes) query = query.eq("mes", filters.mes);
    if (filters.tipo) query = query.eq("tipo", filters.tipo);
    if (filters.quincena) query = query.eq("quincena", filters.quincena);
    if (filters.estado) query = query.eq("estado", filters.estado);

    const { data, error } = await query;
    if (error || !data) return [];

    const liquidaciones = data.map(rowToLiquidacion);
    if (filters.nombres === false) return liquidaciones;
    const ids = [...new Set(liquidaciones.map((l) => l.employee_id))];
    if (ids.length === 0) return liquidaciones;

    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, email, username, cedula, cargo")
      .in("id", ids);

    const byId = new Map(
      (people ?? []).map((p) => [
        String(p.id),
        {
          name: String(p.full_name ?? p.email ?? ""),
          username: typeof p.username === "string" ? p.username : null,
          cedula: typeof p.cedula === "string" ? p.cedula : null,
          cargo: typeof p.cargo === "string" ? p.cargo : null,
        },
      ]),
    );

    return liquidaciones.map((l) => ({
      ...l,
      employee_name: byId.get(l.employee_id)?.name,
      employee_username: byId.get(l.employee_id)?.username ?? null,
      employee_cedula: byId.get(l.employee_id)?.cedula ?? null,
      employee_cargo: byId.get(l.employee_id)?.cargo ?? null,
    }));
  } catch {
    return [];
  }
}

/** Una liquidación por su id, con los datos del empleado. */
export async function getLiquidacion(
  id: string,
): Promise<NominaLiquidacionRecord | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("nomina_liquidaciones")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const liquidacion = rowToLiquidacion(data);
    const { data: persona } = await supabase
      .from("profiles")
      .select("full_name, email, username, cedula, cargo")
      .eq("id", liquidacion.employee_id)
      .maybeSingle();

    return {
      ...liquidacion,
      employee_name: String(persona?.full_name ?? persona?.email ?? ""),
      employee_username:
        typeof persona?.username === "string" ? persona.username : null,
      employee_cedula: typeof persona?.cedula === "string" ? persona.cedula : null,
      employee_cargo: typeof persona?.cargo === "string" ? persona.cargo : null,
    };
  } catch {
    return null;
  }
}

/* --- Horas del período --------------------------------------------- */

export interface HorasPeriodo {
  /** Minutos por concepto de nómina (ya mapeados desde el desglose). */
  minutos: MinutosPorConcepto;
  /** Cuántas jornadas APROBADAS entraron en el cálculo. */
  jornadas: number;
  /**
   * Cuántas jornadas del período siguen PENDIENTES de aprobación. No se pagan:
   * la pantalla avisa para que el manager las apruebe primero.
   */
  pendientes: number;
}

/**
 * Suma las horas de un empleado en un rango de fechas, repartidas por concepto
 * de nómina.
 *
 * Solo entran las jornadas **aprobadas**, y su desglose se lee SIEMPRE con
 * `obtenerDesglose()`: si la jornada se aprobó con la 0004 aplicada se usa el
 * cálculo congelado y nada de lo que se cambie después (un horario, un recargo)
 * altera la nómina.
 */
export async function horasDelPeriodo(
  employeeId: string,
  desde: string,
  hasta: string,
  config?: JornadaConfig,
  horarios?: MapaHorarios,
): Promise<HorasPeriodo> {
  const [jornadaConfig, mapaHorarios, jornadas] = await Promise.all([
    config ? Promise.resolve(config) : getJornadaConfig(),
    horarios ? Promise.resolve(horarios) : getMapaHorarios(),
    leerJornadasNomina(desde, hasta, employeeId),
  ]);

  return (
    horasPorEmpleado(jornadas, jornadaConfig, mapaHorarios).get(employeeId) ?? {
      minutos: minutosVacios(),
      jornadas: 0,
      pendientes: 0,
    }
  );
}

/**
 * Las jornadas APROBADAS y PENDIENTES de un rango de fechas —de una persona o,
 * sin `employeeId`, de todo el equipo— en UNA sola consulta y sin resolver
 * nombres (la nómina no los necesita).
 *
 * Antes la pestaña «Liquidación» llamaba a `horasDelPeriodo` por cada persona:
 * dos `listJornadas` (aprobadas y pendientes) y cada una con su consulta de
 * nombres, cuatro viajes a Supabase por persona. Con esto es uno para todos.
 * Se lee por tandas de 1000 (el tope de filas de PostgREST) por si el rango
 * fuera largo; una quincena del equipo son unas pocas decenas.
 */
export async function leerJornadasNomina(
  desde: string,
  hasta: string,
  employeeId?: string,
): Promise<JornadaRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  const TANDA = 1000;
  const salida: JornadaRecord[] = [];
  try {
    for (let inicio = 0; inicio < 20 * TANDA; inicio += TANDA) {
      let query = supabase
        .from("jornadas")
        .select("*")
        .in("status", ["aprobada", "pendiente"])
        .gte("work_date", desde)
        .lte("work_date", hasta)
        .order("work_date", { ascending: true })
        .order("id", { ascending: true })
        .range(inicio, inicio + TANDA - 1);
      if (employeeId) query = query.eq("employee_id", employeeId);

      const { data, error } = await query;
      if (error || !data) break;
      salida.push(...data.map(rowToJornada));
      if (data.length < TANDA) break;
    }
  } catch {
    // Sin jornadas legibles, la liquidación se calcula sin horas: igual que antes.
  }
  return salida;
}

/**
 * Suma, por empleado, las horas de las jornadas APROBADAS (con su desglose
 * congelado, `obtenerDesglose()`) y cuenta las PENDIENTES. Las demás se ignoran.
 */
export function horasPorEmpleado(
  jornadas: readonly JornadaRecord[],
  jornadaConfig: JornadaConfig,
  horarios: MapaHorarios,
): Map<string, HorasPeriodo> {
  const aprobadas = new Map<string, JornadaRecord[]>();
  const pendientes = new Map<string, number>();
  for (const j of jornadas) {
    if (j.status === "aprobada") {
      const lista = aprobadas.get(j.employee_id) ?? [];
      lista.push(j);
      aprobadas.set(j.employee_id, lista);
    } else if (j.status === "pendiente") {
      pendientes.set(j.employee_id, (pendientes.get(j.employee_id) ?? 0) + 1);
    }
  }

  const salida = new Map<string, HorasPeriodo>();
  for (const id of new Set([...aprobadas.keys(), ...pendientes.keys()])) {
    const suyas = aprobadas.get(id) ?? [];
    salida.set(id, {
      minutos:
        suyas.length > 0
          ? sumarMinutos(
              [
                ...resolverDesglosesDeUnaPersona(suyas, jornadaConfig, horarios).values(),
              ].map((r) => r.desglose),
            )
          : minutosVacios(),
      jornadas: suyas.length,
      pendientes: pendientes.get(id) ?? 0,
    });
  }
  return salida;
}

/** Conteo rápido de nómina para la tarjeta del dashboard. */
export async function getNominaCounts(): Promise<{
  borradores: number;
  cerradas: number;
}> {
  const supabase = await getServerSupabase();
  if (!supabase) return { borradores: 0, cerradas: 0 };

  try {
    const [borradores, cerradas] = await Promise.all([
      supabase
        .from("nomina_liquidaciones")
        .select("id", { count: "exact", head: true })
        .eq("estado", "borrador"),
      supabase
        .from("nomina_liquidaciones")
        .select("id", { count: "exact", head: true })
        .eq("estado", "cerrada"),
    ]);

    return {
      borradores: borradores.count ?? 0,
      cerradas: cerradas.count ?? 0,
    };
  } catch {
    return { borradores: 0, cerradas: 0 };
  }
}

/* ------------------------------------------------------------------ */
/* Permisos de falta (migración 0014)                                  */
/* ------------------------------------------------------------------ */

/**
 * PERMISOS — lecturas
 * ===================
 * La versión digital del formato «SOLICITUD DE PERMISO». El alcance lo decide
 * **RLS** (migración 0014): una cuenta normal solo ve las suyas; un manager,
 * las de todo el equipo. Aquí no se vuelve a filtrar por rol: se filtra por lo
 * que pide la pantalla.
 *
 * Las reglas del DESCUENTO (el día, el domingo perdido, la proporción de un
 * permiso por horas) viven en `src/lib/permisos.ts`, que es puro. Lo único que
 * se hace aquí es leer las filas y resolver, para cada permiso por horas, las
 * **horas de la jornada programada** de ese día (eso sí necesita
 * `horarios_mensuales`).
 */

/** ¿El error dice que la tabla `permisos` todavía no existe (0014 sin aplicar)? */
export function faltaTablaPermisos(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const mensaje = error.message ?? "";
  return (
    /permisos/i.test(mensaje) &&
    /(does not exist|no existe|schema cache|find the table)/i.test(mensaje)
  );
}

function rowToPermiso(row: Record<string, unknown>): PermisoRecord {
  const texto = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v : null;
  return {
    id: String(row.id),
    employee_id: String(row.employee_id),
    tipo: normalizarTipoPermiso(row.tipo),
    fecha_inicio: String(row.fecha_inicio ?? ""),
    fecha_fin: String(row.fecha_fin ?? row.fecha_inicio ?? ""),
    hora_inicio: texto(row.hora_inicio),
    hora_fin: texto(row.hora_fin),
    motivo: String(row.motivo ?? ""),
    reemplazo: texto(row.reemplazo),
    observaciones: texto(row.observaciones),
    soporte_path: texto(row.soporte_path),
    soporte_nombre: texto(row.soporte_nombre),
    remunerado_solicitado: row.remunerado_solicitado === true,
    remunerado: typeof row.remunerado === "boolean" ? row.remunerado : null,
    estado: normalizarEstadoPermiso(row.estado),
    nota_revision: texto(row.nota_revision),
    revisado_por: texto(row.revisado_por),
    revisado_at: texto(row.revisado_at),
    origen: normalizarOrigenPermiso(row.origen),
    creado_por: texto(row.creado_por),
    created_at: texto(row.created_at),
    updated_at: texto(row.updated_at),
  };
}

export interface PermisoFilters {
  estado?: PermisoEstado | "todos";
  employeeId?: string;
  /** `YYYY-MM-DD`: permisos que TOQUEN ese rango (no solo los que empiezan ahí). */
  desde?: string;
  hasta?: string;
  limit?: number;
  /** `false` = no resolver nombres contra `profiles` (ahorra una consulta). */
  nombres?: boolean;
}

/**
 * Permisos visibles para la sesión actual, del más reciente al más antiguo.
 * Con `desde`/`hasta` se traen los que SE CRUZAN con el rango: un permiso del
 * 28 de septiembre al 2 de octubre aparece en los dos meses.
 */
export async function listPermisos(
  filters: PermisoFilters = {},
): Promise<PermisoRecord[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("permisos")
      .select("*")
      .order("fecha_inicio", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 500);

    if (filters.estado && filters.estado !== "todos")
      query = query.eq("estado", filters.estado);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    // Se cruzan si empieza antes de que acabe el rango y acaba después de que empiece.
    if (filters.hasta) query = query.lte("fecha_inicio", filters.hasta);
    if (filters.desde) query = query.gte("fecha_fin", filters.desde);

    const { data, error } = await query;
    if (error || !data) return [];

    const permisos = data.map(rowToPermiso);
    if (filters.nombres === false || permisos.length === 0) return permisos;

    // `mapaDePerfiles` completa con la clave de servicio lo que la sesión no
    // puede leer: en el portal, RLS solo deja ver la propia fila de `profiles`,
    // así que sin esto el aprobador saldría sin nombre.
    const perfiles = await mapaDePerfiles(supabase, [
      ...permisos.map((p) => p.employee_id),
      ...permisos.map((p) => p.revisado_por),
    ]);

    return permisos.map((p) => ({
      ...p,
      employee_name: nombreDePerfil(perfiles, p.employee_id) ?? "Cuenta del equipo",
      employee_cargo: perfiles.get(p.employee_id)?.cargo ?? null,
      reviewer_name: nombreDePerfil(perfiles, p.revisado_por) ?? undefined,
    }));
  } catch {
    return [];
  }
}

/** Un permiso por su id (RLS decide si la sesión puede verlo). */
export async function getPermiso(id: string): Promise<PermisoRecord | null> {
  const supabase = await getServerSupabase();
  if (!supabase || !id) return null;

  try {
    const { data, error } = await supabase
      .from("permisos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return rowToPermiso(data);
  } catch {
    return null;
  }
}

/** Cuántos permisos están esperando revisión (contador de la pestaña). */
export async function getPermisosPendientes(): Promise<number> {
  const supabase = await getServerSupabase();
  if (!supabase) return 0;
  try {
    const { count } = await supabase
      .from("permisos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Los permisos que DESCUENTAN y tocan el período, listos para
 * `faltasDelPeriodo()`.
 *
 * Se lee una SEMANA a cada lado del período a propósito: el domingo de una
 * semana se atribuye al período donde cae el PRIMER día de falta de esa semana,
 * y sin ver los días vecinos no se sabría si ese domingo ya se cobró en la
 * liquidación anterior.
 *
 * Cada permiso por horas sale con `horasJornada` = las horas de la jornada
 * programada de su día (del horario del mes). Si ese día no estaba programado,
 * queda en 0 y el permiso no descuenta nada.
 */
export async function leerPermisosNomina(
  desde: string,
  hasta: string,
  employeeId?: string,
  horarios?: MapaHorarios,
): Promise<(PermisoParaNomina & { employee_id: string })[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];

  const margenDesde = sumarDiasFecha(desde, -8);
  const margenHasta = sumarDiasFecha(hasta, 8);

  try {
    let query = supabase
      .from("permisos")
      .select(
        "id, employee_id, tipo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, estado, remunerado, motivo",
      )
      .eq("estado", "aprobado")
      .eq("remunerado", false)
      .lte("fecha_inicio", margenHasta)
      .gte("fecha_fin", margenDesde)
      .order("fecha_inicio", { ascending: true })
      .limit(2000);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data, error } = await query;
    if (error || !data) return [];

    const mapaHorarios = horarios ?? (await getMapaHorarios());

    return data.map((row) => {
      const permiso: PermisoParaNomina & { employee_id: string } = {
        id: String(row.id),
        employee_id: String(row.employee_id),
        tipo: normalizarTipoPermiso(row.tipo),
        fecha_inicio: String(row.fecha_inicio ?? ""),
        fecha_fin: String(row.fecha_fin ?? row.fecha_inicio ?? ""),
        hora_inicio: typeof row.hora_inicio === "string" ? row.hora_inicio : null,
        hora_fin: typeof row.hora_fin === "string" ? row.hora_fin : null,
        estado: normalizarEstadoPermiso(row.estado),
        remunerado: typeof row.remunerado === "boolean" ? row.remunerado : null,
        motivo: String(row.motivo ?? ""),
      };
      if (permiso.tipo === "horas") {
        permiso.horasJornada =
          minutosJornadaDia(horarioDelDia(permiso.fecha_inicio, mapaHorarios)) / 60;
      }
      return permiso;
    });
  } catch {
    return [];
  }
}

/** Las faltas del período de CADA empleado, a partir de una sola lectura. */
export function faltasPorEmpleado(
  permisos: readonly (PermisoParaNomina & { employee_id?: string })[],
  desde: string,
  hasta: string,
): Map<string, FaltasPeriodo> {
  const porEmpleado = new Map<string, PermisoParaNomina[]>();
  for (const p of permisos) {
    const id = p.employee_id ?? "";
    if (!id) continue;
    const lista = porEmpleado.get(id) ?? [];
    lista.push(p);
    porEmpleado.set(id, lista);
  }

  const salida = new Map<string, FaltasPeriodo>();
  for (const [id, suyos] of porEmpleado) {
    salida.set(id, faltasDelPeriodo(suyos, desde, hasta));
  }
  return salida;
}

/**
 * Las faltas no remuneradas de UNA persona en un período. Es lo que usan
 * `cerrarLiquidacion` y el volante; la pestaña «Liquidación» usa
 * `leerPermisosNomina` + `faltasPorEmpleado`, una sola consulta para el equipo.
 */
export async function faltasDelPeriodoEmpleado(
  employeeId: string,
  desde: string,
  hasta: string,
  horarios?: MapaHorarios,
): Promise<FaltasPeriodo> {
  if (!employeeId) return faltasVacias();
  const permisos = await leerPermisosNomina(desde, hasta, employeeId, horarios);
  return faltasDelPeriodo(permisos, desde, hasta);
}

/** Reexportados por comodidad de los Server Components que pintan permisos. */
export { descuenta as permisoDescuenta, diasDelPermiso };
