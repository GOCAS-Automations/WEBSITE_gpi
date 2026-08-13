"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContentEditorOrNull, type Session } from "@/lib/supabase/auth";
import {
  contactDefaults,
  esCorreoValido,
  normalizarExcellence,
  normalizarHome,
  normalizarNosotros,
  normalizarPaginas,
  normalizarVisibility,
  type HomeSettings,
  type ImagenContenido,
  type NosotrosSettings,
  type PaginaHero,
  type PaginasSettings,
  type VisibilitySettings,
} from "@/data/site";
import { slugify } from "@/lib/slug";
import { youtubeId, youtubeWatchUrl } from "@/lib/youtube";
import type { IconName } from "@/lib/icons";
import type { ActionState, GalleryImage } from "@/lib/admin-types";

/* ------------------------------------------------------------------ */
/* Utilidades internas                                                 */
/* ------------------------------------------------------------------ */

/**
 * Todas las acciones de esta sección requieren rol de contenido
 * (admin | coordinador | marketing) con la cuenta activa. La comprobación se
 * repite en CADA acción: el layout y el proxy son solo la primera barrera.
 */
const NOT_ADMIN: ActionState = {
  status: "error",
  message:
    "Tu sesión expiró o tu cuenta no tiene permisos para editar el contenido del sitio.",
};

const ok = (message: string): ActionState => ({ status: "success", message });
const fail = (message: string): ActionState => ({ status: "error", message });

/**
 * El header, el footer y todas las páginas consumen la capa de contenido, así
 * que cualquier cambio invalida el árbol completo desde el layout raíz. Eso
 * incluye las rutas dinámicas (`/servicios/[slug]`, `/proyectos/[slug]`).
 */
function revalidateSite() {
  revalidatePath("/", "layout");
}

/**
 * Además del árbol completo, las páginas de detalle de proyectos se invalidan
 * por patrón: un slug nuevo o cambiado tiene que resolverse ya, no cuando
 * caduque el ISR de 5 minutos.
 */
function revalidateProyectos() {
  revalidateSite();
  revalidatePath("/proyectos/[slug]", "page");
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(formData: FormData, key: string): string | null {
  const value = text(formData, key);
  return value === "" ? null : value;
}

function num(formData: FormData, key: string, fallback = 0): number {
  const parsed = Number(text(formData, key));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Lee un interruptor del componente `Switch`.
 *
 * `Switch` envía siempre un input oculto con "false" y, cuando está encendido,
 * además el checkbox con "true". Así el formulario distingue "apagado" de
 * "campo ausente" (un checkbox suelto no envía nada al estar desmarcado).
 */
function bool(formData: FormData, key: string, fallback = true): boolean {
  const values = formData.getAll(key);
  if (values.length === 0) return fallback;
  return values.includes("true");
}

function list(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

/** Empareja dos listas paralelas (p. ej. gallery_src + gallery_alt). */
function zip(
  formData: FormData,
  keyA: string,
  keyB: string,
): { a: string; b: string }[] {
  const as = formData.getAll(keyA).map((v) => (typeof v === "string" ? v.trim() : ""));
  const bs = formData.getAll(keyB).map((v) => (typeof v === "string" ? v.trim() : ""));
  const out: { a: string; b: string }[] = [];
  for (let i = 0; i < as.length; i += 1) {
    if (as[i] === "") continue;
    out.push({ a: as[i], b: bs[i] ?? "" });
  }
  return out;
}

/**
 * Igual que `zip` pero con N columnas: los campos repetibles de la línea de
 * tiempo tienen tres o cuatro (fecha, título, descripción, icono).
 * Devuelve una fila por posición, con "" donde una columna no llegó.
 */
function filas(formData: FormData, keys: string[]): string[][] {
  const columnas = keys.map((key) =>
    formData.getAll(key).map((v) => (typeof v === "string" ? v.trim() : "")),
  );
  const total = columnas.reduce((max, col) => Math.max(max, col.length), 0);

  const salida: string[][] = [];
  for (let i = 0; i < total; i += 1) {
    salida.push(columnas.map((col) => col[i] ?? ""));
  }
  return salida;
}

/** Par imagen + texto alternativo de un `ImageField` + su `Field` de alt. */
function imagenDeFormulario(
  formData: FormData,
  claveUrl: string,
  claveAlt: string,
): ImagenContenido {
  return { url: text(formData, claveUrl), alt: text(formData, claveAlt) };
}

/**
 * ¿El error viene de que una COLUMNA todavía no existe (migración pendiente)?
 *
 * 42703 = undefined_column (Postgres) · PGRST204 = columna ausente del caché de
 * esquema de PostgREST. Cuando el código no es concluyente se mira el mensaje,
 * que menciona el nombre de la columna que falta.
 */
function faltaColumna(
  error: { code?: string | null; message?: string | null } | null | undefined,
  columnas: RegExp,
): boolean {
  if (!error) return false;

  const codigo = error.code ?? "";
  if (codigo === "42703" || codigo === "PGRST204") return true;

  const mensaje = error.message ?? "";
  return (
    columnas.test(mensaje) &&
    /(does not exist|no existe|schema cache|could not find|find the)/i.test(mensaje)
  );
}

/* ------------------------------------------------------------------ */
/* Servicios                                                           */
/* ------------------------------------------------------------------ */

export async function saveService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const id = text(formData, "id");
  const title = text(formData, "title");
  if (title === "") return fail("El título es obligatorio.");

  const slug = slugify(text(formData, "slug") || title);
  if (slug === "") return fail("No se pudo generar un slug válido.");

  const gallery: GalleryImage[] = zip(formData, "gallery_src", "gallery_alt").map(
    ({ a, b }) => ({ src: a, alt: b }),
  );

  // Video de YouTube del servicio (columna `video`, migración 0007).
  // Sin URL no hay video: se guarda NULL, no un objeto vacío.
  const videoUrl = text(formData, "video_url");
  if (videoUrl !== "" && youtubeId(videoUrl) === "")
    return fail(
      `«${videoUrl}» no parece un enlace de YouTube. Copia la dirección de la barra del navegador mientras ves el video, por ejemplo: https://www.youtube.com/watch?v=wqrzBwApBik`,
    );

  const video =
    videoUrl === ""
      ? null
      : {
          url: videoUrl,
          titulo: text(formData, "video_titulo"),
          descripcion: text(formData, "video_descripcion"),
          visible: bool(formData, "video_visible"),
        };

  const base = {
    slug,
    category: text(formData, "category") === "ambiental" ? "ambiental" : "industrial",
    title,
    nav_title: textOrNull(formData, "nav_title") ?? title,
    icon_key: text(formData, "icon_key") || "cog",
    summary: textOrNull(formData, "summary"),
    description: textOrNull(formData, "description"),
    items: list(formData, "items"),
    images: {
      cover: text(formData, "cover"),
      coverAlt: text(formData, "cover_alt"),
      gallery,
    },
    meta_title: textOrNull(formData, "meta_title") ?? title,
    meta_description: textOrNull(formData, "meta_description"),
    sort: num(formData, "sort"),
    published: bool(formData, "published"),
  };

  const escribir = (datos: Record<string, unknown>) =>
    id
      ? session.supabase.from("site_services").update(datos).eq("id", id)
      : session.supabase.from("site_services").insert(datos);

  let { error } = await escribir({ ...base, video });

  // Migración 0007 sin aplicar: se guarda todo lo demás y el servicio queda
  // igual que antes, sencillamente sin video.
  if (error && faltaColumna(error, /video/i)) {
    ({ error } = await escribir(base));
  }

  if (error) {
    if (error.code === "23505") return fail(`Ya existe un servicio con el slug "${slug}".`);
    return fail(error.message);
  }

  revalidateSite();
  if (!id) redirect("/admin/servicios");
  return ok("Servicio guardado correctamente.");
}

export async function deleteService(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del servicio.");

  const { error } = await session.supabase
    .from("site_services")
    .delete()
    .eq("id", id);
  if (error) return fail(error.message);

  revalidateSite();
  redirect("/admin/servicios");
}

/* ------------------------------------------------------------------ */
/* Proyectos                                                           */
/* ------------------------------------------------------------------ */

/**
 * ¿El error viene de que las columnas de la migración 0005 (`slug`, `gallery`,
 * `details`) todavía no existen en `site_projects`?
 *
 * Misma lógica que `faltaColumnaDesglose` para la 0004: el panel debe seguir
 * guardando proyectos aunque la migración esté pendiente, sencillamente sin los
 * campos nuevos.
 */
function faltaColumnaProyecto(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  return faltaColumna(error, /(slug|gallery|details)/i);
}

export async function saveProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const title = text(formData, "title");
  if (title === "") return fail("El título es obligatorio.");

  // El slug se genera desde el título si el campo va vacío, igual que en
  // servicios. Es lo que forma la URL de la página del proyecto.
  const slug = slugify(text(formData, "slug") || title);
  if (slug === "")
    return fail(
      "No se pudo generar una dirección web a partir del título. Escribe un slug con letras y números, por ejemplo: chiller-laboratorios-osa",
    );

  const gallery = zip(formData, "gallery_src", "gallery_alt").map(({ a, b }) => ({
    url: a,
    alt: b,
  }));

  const id = text(formData, "id");
  const base = {
    title,
    client: textOrNull(formData, "client"),
    category: text(formData, "category") === "ambiental" ? "ambiental" : "industrial",
    description: textOrNull(formData, "description"),
    image_url: textOrNull(formData, "image_url"),
    image_alt: textOrNull(formData, "image_alt") ?? title,
    sort: num(formData, "sort"),
    published: bool(formData, "published"),
  };
  const nuevo = { slug, details: textOrNull(formData, "details"), gallery };

  const escribir = (datos: Record<string, unknown>) =>
    id
      ? session.supabase.from("site_projects").update(datos).eq("id", id)
      : session.supabase.from("site_projects").insert(datos);

  let { error } = await escribir({ ...base, ...nuevo });

  // Migración 0005 sin aplicar: se guarda lo de siempre y el sitio deriva el
  // slug del título mientras tanto.
  if (error && faltaColumnaProyecto(error)) {
    ({ error } = await escribir(base));
  }

  if (error) {
    if (error.code === "23505")
      return fail(
        `Ya hay otro proyecto con la dirección web "${slug}". Cámbiala en el campo «Dirección web (slug)».`,
      );
    return fail(error.message);
  }

  revalidateProyectos();
  return ok(id ? "Proyecto actualizado." : "Proyecto creado.");
}

export async function deleteProject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del proyecto.");

  const { error } = await session.supabase
    .from("site_projects")
    .delete()
    .eq("id", id);
  if (error) return fail(error.message);

  revalidateProyectos();
  return ok("Proyecto eliminado.");
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export async function saveClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const name = text(formData, "name");
  if (name === "") return fail("El nombre del cliente es obligatorio.");

  const id = text(formData, "id");
  const payload = {
    name,
    logo_url: textOrNull(formData, "logo_url"),
    website: textOrNull(formData, "website"),
    sort: num(formData, "sort"),
    published: bool(formData, "published"),
  };

  const { error } = id
    ? await session.supabase.from("site_clients").update(payload).eq("id", id)
    : await session.supabase.from("site_clients").insert(payload);
  if (error) return fail(error.message);

  revalidateSite();
  return ok(id ? "Cliente actualizado." : "Cliente creado.");
}

export async function deleteClient(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del cliente.");

  const { error } = await session.supabase
    .from("site_clients")
    .delete()
    .eq("id", id);
  if (error) return fail(error.message);

  revalidateSite();
  return ok("Cliente eliminado.");
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

export async function saveFaq(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const question = text(formData, "question");
  const answer = text(formData, "answer");
  if (question === "" || answer === "")
    return fail("La pregunta y la respuesta son obligatorias.");

  const id = text(formData, "id");
  const payload = {
    question,
    answer,
    sort: num(formData, "sort"),
    published: bool(formData, "published"),
  };

  const { error } = id
    ? await session.supabase.from("site_faqs").update(payload).eq("id", id)
    : await session.supabase.from("site_faqs").insert(payload);
  if (error) return fail(error.message);

  revalidateSite();
  return ok(id ? "Pregunta actualizada." : "Pregunta creada.");
}

export async function deleteFaq(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador de la pregunta.");

  const { error } = await session.supabase.from("site_faqs").delete().eq("id", id);
  if (error) return fail(error.message);

  revalidateSite();
  return ok("Pregunta eliminada.");
}

/* ------------------------------------------------------------------ */
/* Valores corporativos                                                */
/* ------------------------------------------------------------------ */

export async function saveValue(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const title = text(formData, "title");
  if (title === "") return fail("El título del valor es obligatorio.");

  const id = text(formData, "id");
  const payload = {
    title,
    description: textOrNull(formData, "description"),
    icon_key: text(formData, "icon_key") || "shield",
    sort: num(formData, "sort"),
    published: bool(formData, "published"),
  };

  const { error } = id
    ? await session.supabase.from("site_values").update(payload).eq("id", id)
    : await session.supabase.from("site_values").insert(payload);
  if (error) return fail(error.message);

  revalidateSite();
  return ok(id ? "Valor actualizado." : "Valor creado.");
}

export async function deleteValue(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const id = text(formData, "id");
  if (!id) return fail("Falta el identificador del valor.");

  const { error } = await session.supabase
    .from("site_values")
    .delete()
    .eq("id", id);
  if (error) return fail(error.message);

  revalidateSite();
  return ok("Valor eliminado.");
}

/* ------------------------------------------------------------------ */
/* Ajustes (site_settings)                                             */
/* ------------------------------------------------------------------ */

async function upsertConSesion(
  session: Session,
  key: string,
  value: unknown,
): Promise<ActionState> {
  const { error } = await session.supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) return fail(error.message);

  revalidateSite();
  return ok("Cambios guardados.");
}

async function upsertSetting(
  key: string,
  value: unknown,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;
  return upsertConSesion(session, key, value);
}

/**
 * Lee el valor CRUDO de una clave de `site_settings` con la sesión del usuario.
 *
 * Es la mitad imprescindible de los guardados parciales: las claves `home`,
 * `nosotros` y `visibility` son objetos grandes que se editan desde varios
 * formularios distintos, y `upsert` reemplaza el valor entero. Sin leer antes,
 * guardar la galería de Nosotros borraría su línea de tiempo.
 */
async function leerSetting(session: Session, key: string): Promise<unknown> {
  try {
    const { data } = await session.supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data?.value;
  } catch {
    return undefined;
  }
}

/** Guarda un trozo de la clave `home` conservando el resto. */
async function guardarHome(parcial: Partial<HomeSettings>): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const actual = normalizarHome(await leerSetting(session, "home"));
  return upsertConSesion(session, "home", { ...actual, ...parcial });
}

/** Guarda un trozo de la clave `paginas` conservando el resto. */
async function guardarPaginas(
  parcial: Partial<PaginasSettings>,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const actual = normalizarPaginas(await leerSetting(session, "paginas"));
  return upsertConSesion(session, "paginas", { ...actual, ...parcial });
}

/** Guarda un trozo de la clave `nosotros` conservando el resto. */
async function guardarNosotros(
  parcial: Partial<NosotrosSettings>,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const actual = normalizarNosotros(await leerSetting(session, "nosotros"));
  return upsertConSesion(session, "nosotros", { ...actual, ...parcial });
}

/**
 * Guarda solo los interruptores que envía ESTE formulario y conserva el resto.
 *
 * La visibilidad se reparte entre tres pantallas (inicio, Nosotros y Contacto y
 * ajustes); sin este merge, guardar en una apagaría las secciones de las otras.
 */
async function guardarVisibilidad(
  claves: (keyof VisibilitySettings)[],
  formData: FormData,
  extra: Partial<VisibilitySettings> = {},
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const actual = normalizarVisibility(await leerSetting(session, "visibility"));
  const value: VisibilitySettings = { ...actual };
  for (const clave of claves) {
    value[clave] = bool(formData, clave, actual[clave]);
  }
  Object.assign(value, extra);

  return upsertConSesion(session, "visibility", value);
}

export async function saveContactSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const street = text(formData, "street");
  const area = text(formData, "area");
  const city = text(formData, "city");
  const region = text(formData, "region");
  const country = text(formData, "country") || "Colombia";

  const phones = zip(formData, "phone_label", "phone_intl").map(({ a, b }) => ({
    label: a,
    intl: b.replace(/\D/g, ""),
  }));
  const emails = zip(formData, "email_address", "email_person").map(
    ({ a, b }) => ({ address: a, person: b }),
  );

  if (phones.length === 0) return fail("Debe haber al menos un teléfono.");
  if (emails.length === 0) return fail("Debe haber al menos un correo.");

  // Buzón del formulario de contacto: si se deja vacío se conserva el correo
  // corporativo por defecto, para que el formulario nunca quede sin destino.
  const correoFormulario =
    text(formData, "correoFormulario") || contactDefaults.correoFormulario;
  if (!esCorreoValido(correoFormulario))
    return fail(
      `«${correoFormulario}» no parece un correo válido. Escríbelo completo, por ejemplo: gpi.gerencia1@gmail.com`,
    );

  const value = {
    companyName: text(formData, "companyName") || "GPI",
    legalName: text(formData, "legalName"),
    tagline: text(formData, "tagline"),
    address: {
      street,
      area,
      city,
      region,
      country,
      full:
        text(formData, "address_full") ||
        [street, area, city, region, country].filter(Boolean).join(", "),
    },
    geo: {
      latitude: num(formData, "latitude", 3.4699),
      longitude: num(formData, "longitude", -76.5225),
    },
    phones,
    primaryWhatsApp:
      text(formData, "primaryWhatsApp").replace(/\D/g, "") || phones[0].intl,
    emails,
    correoFormulario,
    social: {
      facebook: text(formData, "facebook"),
      instagram: text(formData, "instagram"),
      youtube: text(formData, "youtube_channel"),
    },
    schedule: text(formData, "schedule"),
    mapEmbedUrl: text(formData, "mapEmbedUrl"),
    siteUrl: text(formData, "siteUrl"),
  };

  return upsertSetting("contact", value);
}

export async function saveHeroSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const value = {
    badge: text(formData, "badge"),
    titleLead: text(formData, "titleLead"),
    titleHighlight: text(formData, "titleHighlight"),
    description: text(formData, "description"),
    image: text(formData, "image"),
    imageAlt: text(formData, "imageAlt"),
    primaryCtaLabel: text(formData, "primaryCtaLabel"),
    primaryCtaHref: text(formData, "primaryCtaHref") || "/servicios",
    secondaryCtaLabel: text(formData, "secondaryCtaLabel"),
    secondaryCtaHref: text(formData, "secondaryCtaHref") || "/contacto",
  };
  if (value.image === "") return fail("La imagen del hero es obligatoria.");
  return upsertSetting("hero", value);
}

/**
 * Banda oscura del inicio.
 *
 * Ya NO edita las cifras: desde la migración 0007 viven en
 * `home.quienesSomos.stats`, que es donde se muestran. Las que hubiera en esta
 * clave se conservan tal cual (respaldo del que se siembran las nuevas).
 */
export async function saveExcellenceSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const actual = normalizarExcellence(await leerSetting(session, "excellence"));

  const value = {
    ...actual,
    eyebrow: text(formData, "eyebrow"),
    messageLead: text(formData, "messageLead"),
    messageHighlight: text(formData, "messageHighlight"),
    ctaLabel: text(formData, "ctaLabel"),
    ctaHref: text(formData, "ctaHref") || "/proyectos",
  };
  return upsertConSesion(session, "excellence", value);
}

export async function saveYouTubeSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // Acepta el ID pelado o cualquier URL de YouTube (ver `src/lib/youtube.ts`).
  const id = youtubeId(text(formData, "id"));
  if (id === "")
    return fail(
      "No reconocimos ese enlace de YouTube. Copia la dirección de la barra del navegador mientras ves el video, por ejemplo: https://www.youtube.com/watch?v=wqrzBwApBik",
    );

  const value = {
    id,
    watchUrl: text(formData, "watchUrl") || youtubeWatchUrl(id),
    title: text(formData, "title"),
    sectionEyebrow: text(formData, "sectionEyebrow"),
    sectionTitle: text(formData, "sectionTitle"),
    sectionDescription: text(formData, "sectionDescription"),
  };
  return upsertSetting("youtube", value);
}

/* ------------------------------------------------------------------ */
/* Página de inicio (`home`)                                           */
/* ------------------------------------------------------------------ */

export async function saveHomeQuienesSomos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const stats = zip(formData, "stat_value", "stat_label").map(({ a, b }) => ({
    value: a,
    label: b,
  }));
  if (stats.length === 0)
    return fail(
      "Debe quedar al menos una cifra. Si no quieres mostrar ninguna, apaga la sección completa en «Qué se ve en la página de inicio».",
    );

  return guardarHome({
    quienesSomos: {
      eyebrow: text(formData, "eyebrow"),
      titulo: text(formData, "titulo"),
      descripcion: text(formData, "descripcion"),
      bullets: list(formData, "bullets"),
      imagen: imagenDeFormulario(formData, "imagen_url", "imagen_alt"),
      stats,
      ctaLabel: text(formData, "ctaLabel"),
      ctaHref: text(formData, "ctaHref") || "/nosotros",
    },
  });
}

/**
 * Encabezados de sección del inicio (migración 0008).
 *
 * Son tres formularios distintos con exactamente los mismos campos —texto
 * superior, título y descripción—, así que comparten la lectura del formulario
 * y solo cambian la rama de `home` que escriben.
 */
function seccionDeFormulario(formData: FormData) {
  return {
    eyebrow: text(formData, "eyebrow"),
    titulo: text(formData, "titulo"),
    descripcion: text(formData, "descripcion"),
  };
}

export async function saveHomeServiciosIntro(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarHome({ serviciosIntro: seccionDeFormulario(formData) });
}

export async function saveHomeValoresIntro(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarHome({ valoresIntro: seccionDeFormulario(formData) });
}

export async function saveHomeClientes(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarHome({ clientes: seccionDeFormulario(formData) });
}

export async function saveHomeCta(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarHome({
    cta: {
      titulo: text(formData, "titulo"),
      descripcion: text(formData, "descripcion"),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Cabeceras de Servicios, Proyectos y Contacto (`paginas`)            */
/* ------------------------------------------------------------------ */

/** Los cuatro campos de una `PageHero` leídos del formulario. */
function cabeceraDeFormulario(formData: FormData): PaginaHero {
  return {
    eyebrow: text(formData, "eyebrow"),
    titulo: text(formData, "titulo"),
    descripcion: text(formData, "descripcion"),
    imagen: imagenDeFormulario(formData, "imagen_url", "imagen_alt"),
  };
}

/** Título obligatorio: una cabecera sin `<h1>` dejaría la página sin encabezado. */
function validarCabecera(cabecera: PaginaHero): string | null {
  if (cabecera.titulo === "") return "El título de la página es obligatorio.";
  if (cabecera.imagen.url === "") return "La imagen de fondo es obligatoria.";
  return null;
}

export async function savePaginaServicios(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const servicios = cabeceraDeFormulario(formData);
  const error = validarCabecera(servicios);
  if (error) return fail(error);
  return guardarPaginas({ servicios });
}

export async function savePaginaProyectos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const proyectos = cabeceraDeFormulario(formData);
  const error = validarCabecera(proyectos);
  if (error) return fail(error);
  return guardarPaginas({ proyectos });
}

export async function savePaginaContacto(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contacto = cabeceraDeFormulario(formData);
  const error = validarCabecera(contacto);
  if (error) return fail(error);
  return guardarPaginas({ contacto });
}

export async function savePaginaFooter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarPaginas({
    footer: { descripcion: text(formData, "descripcion") },
  });
}

/* ------------------------------------------------------------------ */
/* Página Nosotros (`nosotros`)                                        */
/* ------------------------------------------------------------------ */

export async function saveNosotrosHero(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const titulo = text(formData, "titulo");
  if (titulo === "") return fail("El título de la primera pantalla es obligatorio.");

  return guardarNosotros({
    hero: {
      titulo,
      descripcion: text(formData, "descripcion"),
      imagen: imagenDeFormulario(formData, "imagen_url", "imagen_alt"),
    },
  });
}

export async function saveNosotrosQuienesSomos(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const titulo = text(formData, "titulo");
  if (titulo === "") return fail("El título de la sección es obligatorio.");

  return guardarNosotros({
    quienesSomos: {
      titulo,
      parrafos: list(formData, "parrafos"),
      imagen: imagenDeFormulario(formData, "imagen_url", "imagen_alt"),
      // El sello verde de la esquina de la foto. Se guarda aunque venga vacío:
      // dejar la cifra en blanco es la forma de quitarlo desde el panel.
      badge: {
        valor: text(formData, "badge_valor"),
        etiqueta: text(formData, "badge_etiqueta"),
      },
    },
  });
}

export async function saveNosotrosMisionVision(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarNosotros({
    mision: { texto: text(formData, "mision") },
    vision: { texto: text(formData, "vision") },
  });
}

export async function saveNosotrosGaleria(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // `GalleryField` usa los nombres gallery_src / gallery_alt; aquí se guardan
  // como {url, alt}, que es el formato de las imágenes de contenido.
  const fotos = zip(formData, "gallery_src", "gallery_alt").map(({ a, b }) => ({
    url: a,
    alt: b,
  }));

  return guardarNosotros({
    galeria: {
      titulo: text(formData, "titulo"),
      descripcion: text(formData, "descripcion"),
      fotos,
    },
  });
}

export async function saveNosotrosLineaTiempo(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const hitos = filas(formData, [
    "hito_fecha",
    "hito_titulo",
    "hito_descripcion",
    "hito_icono",
  ])
    .filter(([fecha, titulo]) => fecha !== "" || titulo !== "")
    .map(([fecha, titulo, descripcion, icono]) => ({
      fecha,
      titulo,
      descripcion,
      icono: (icono || "cog") as IconName,
    }));

  const etiquetas = filas(formData, [
    "etiqueta_titulo",
    "etiqueta_descripcion",
    "etiqueta_icono",
  ])
    .filter(([titulo]) => titulo !== "")
    .map(([titulo, descripcion, icono]) => ({
      titulo,
      descripcion,
      icono: (icono || "shield") as IconName,
    }));

  return guardarNosotros({
    lineaTiempo: {
      eyebrow: text(formData, "eyebrow"),
      titulo: text(formData, "titulo"),
      descripcion: text(formData, "descripcion"),
      hitos,
      etiquetas,
    },
  });
}

export async function saveNosotrosValoresIntro(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarNosotros({
    valoresIntro: {
      eyebrow: text(formData, "eyebrow"),
      titulo: text(formData, "titulo"),
      descripcion: text(formData, "descripcion"),
    },
  });
}

export async function saveNosotrosCta(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarNosotros({
    cta: {
      titulo: text(formData, "titulo"),
      descripcion: text(formData, "descripcion"),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Visibilidad de secciones                                            */
/*                                                                     */
/* Apagar una sección NO borra su contenido: solo deja de mostrarse.   */
/* Cada pantalla guarda SUS interruptores y conserva los demás.        */
/* ------------------------------------------------------------------ */

/** Interruptores de la página de inicio. */
export async function saveVisibilityInicio(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarVisibilidad(["homeQuienesSomos", "clientsSection"], formData);
}

/**
 * Interruptores de la página Nosotros.
 *
 * El video y las preguntas frecuentes solo existen en esta página, así que sus
 * dos claves —la de página (`nosotrosVideo`) y la global de siempre
 * (`videoSection`)— se escriben con el MISMO valor. Así el interruptor hace lo
 * que dice aunque en la base de datos quedara apagada la clave antigua, y no
 * hay dos controles distintos para lo mismo.
 */
export async function saveVisibilityNosotros(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const video = bool(formData, "nosotrosVideo");
  const faq = bool(formData, "nosotrosFaq");

  return guardarVisibilidad(
    [
      "nosotrosQuienesSomos",
      "nosotrosMisionVision",
      "nosotrosGaleria",
      "nosotrosLineaTiempo",
      "nosotrosValores",
      "nosotrosVideo",
      "nosotrosFaq",
    ],
    formData,
    { videoSection: video, faqSection: faq },
  );
}

/** Interruptores que afectan a más de una página (Contacto y ajustes). */
export async function saveVisibilitySettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guardarVisibilidad(["valuesSection"], formData);
}

/* El cierre de sesión vive en `src/lib/session-actions.ts` (lo comparten el
   panel y la página /mi-cuenta). */
