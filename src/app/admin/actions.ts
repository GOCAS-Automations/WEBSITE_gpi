"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContentEditorOrNull } from "@/lib/supabase/auth";
import { contactDefaults, esCorreoValido, visibilityDefaults } from "@/data/site";
import { slugify } from "@/lib/slug";
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

  const payload = {
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

  const query = id
    ? session.supabase.from("site_services").update(payload).eq("id", id)
    : session.supabase.from("site_services").insert(payload);

  const { error } = await query;
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
  if (!error) return false;
  // 42703 = undefined_column (Postgres) · PGRST204 = columna ausente del caché
  // de esquema de PostgREST.
  const codigo = error.code ?? "";
  if (codigo === "42703" || codigo === "PGRST204") return true;

  const mensaje = error.message ?? "";
  return (
    /(slug|gallery|details)/i.test(mensaje) &&
    /(does not exist|no existe|schema cache|could not find|find the)/i.test(mensaje)
  );
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

async function upsertSetting(
  key: string,
  value: unknown,
): Promise<ActionState> {
  const session = await getContentEditorOrNull();
  if (!session) return NOT_ADMIN;

  const { error } = await session.supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) return fail(error.message);

  revalidateSite();
  return ok("Cambios guardados.");
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

export async function saveExcellenceSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const stats = zip(formData, "stat_value", "stat_label").map(({ a, b }) => ({
    value: a,
    label: b,
  }));
  if (stats.length === 0) return fail("Debe haber al menos una estadística.");

  const value = {
    eyebrow: text(formData, "eyebrow"),
    messageLead: text(formData, "messageLead"),
    messageHighlight: text(formData, "messageHighlight"),
    ctaLabel: text(formData, "ctaLabel"),
    ctaHref: text(formData, "ctaHref") || "/proyectos",
    stats,
  };
  return upsertSetting("excellence", value);
}

export async function saveYouTubeSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = text(formData, "id");
  // Acepta el ID pelado o una URL completa de YouTube.
  const match = raw.match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/,
  );
  const id = match ? match[1] : raw;
  if (!/^[A-Za-z0-9_-]{6,}$/.test(id))
    return fail("El ID del video de YouTube no es válido.");

  const value = {
    id,
    watchUrl: text(formData, "watchUrl") || `https://www.youtube.com/watch?v=${id}`,
    title: text(formData, "title"),
    sectionEyebrow: text(formData, "sectionEyebrow"),
    sectionTitle: text(formData, "sectionTitle"),
    sectionDescription: text(formData, "sectionDescription"),
  };
  return upsertSetting("youtube", value);
}

/**
 * Visibilidad de secciones completas del sitio público.
 * Apagar una sección NO borra su contenido: solo deja de mostrarse.
 */
export async function saveVisibilitySettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const value = {
    valuesSection: bool(formData, "valuesSection", visibilityDefaults.valuesSection),
    clientsSection: bool(formData, "clientsSection", visibilityDefaults.clientsSection),
    videoSection: bool(formData, "videoSection", visibilityDefaults.videoSection),
    faqSection: bool(formData, "faqSection", visibilityDefaults.faqSection),
  };
  return upsertSetting("visibility", value);
}

/* El cierre de sesión vive en `src/lib/session-actions.ts` (lo comparten el
   panel y la página /mi-cuenta). */
