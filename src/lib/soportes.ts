/**
 * SOPORTES DE LOS PERMISOS — bucket PRIVADO, solo servidor
 * ========================================================
 * El soporte de un permiso (una incapacidad, una citación médica) es un dato
 * personal y de salud. Por eso NO vive en `site-images`, que es público y
 * cualquiera con la URL leería, sino en el bucket **privado**
 * `permisos-soportes` que crea la migración 0014.
 *
 * REGLAS QUE NO SE NEGOCIAN
 * -------------------------
 *  1. **La subida va por server action**, con la clave de SERVICIO, desde este
 *     módulo. Nunca desde el navegador: la clave de servicio jamás sale del
 *     servidor, y la clave anónima no puede escribir en este bucket.
 *  2. **La descarga va por un route handler** (`/api/permisos/[id]/soporte`)
 *     que comprueba la sesión y que quien pide es el DUEÑO o un MANAGER, y
 *     responde con una **URL firmada** de un minuto. No hay ninguna URL
 *     pública ni adivinable.
 *  3. El tipo y el tamaño se validan **aquí, en el servidor** (PDF, JPG o PNG,
 *     hasta 5 MB), además del `file_size_limit` y los `allowed_mime_types` del
 *     propio bucket. Lo que valide el navegador es comodidad, no seguridad.
 *
 * Si falta `SUPABASE_SERVICE_ROLE_KEY`, subir un soporte devuelve un error
 * explicado y el permiso se guarda igual SIN soporte: el sistema nunca se cae
 * por una variable de entorno que falte.
 */

import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import {
  SOPORTE_MAX_BYTES,
  SOPORTE_TIPOS_ACEPTADOS,
  rutaSoporte,
} from "@/lib/permisos";

/** El bucket privado de la migración 0014. */
export const BUCKET_SOPORTES = "permisos-soportes";

/** Cuánto vale un enlace de descarga. Un minuto: se abre y se olvida. */
export const SEGUNDOS_URL_FIRMADA = 60;

export type ResultadoSoporte =
  | { ok: true; path: string; nombre: string }
  | { ok: false; error: string };

/**
 * ¿El `File` que llegó en el formulario es un soporte utilizable? Devuelve el
 * motivo escrito para una persona no técnica, o `null` si está bien.
 */
export function validarSoporte(file: File): string | null {
  if (file.size === 0)
    return "El archivo que adjuntaste está vacío. Vuelve a seleccionarlo, por favor.";
  if (file.size > SOPORTE_MAX_BYTES)
    return "El soporte pesa más de 5 MB. Comprímelo o toma la foto con menos calidad y vuelve a intentarlo.";
  const tipo = (file.type || "").toLowerCase();
  if (!(SOPORTE_TIPOS_ACEPTADOS as readonly string[]).includes(tipo))
    return "El soporte tiene que ser un PDF o una foto en JPG o PNG.";
  return null;
}

/**
 * Sube el soporte de un permiso al bucket privado y devuelve su ruta.
 * `permisoId` ya tiene que existir: la ruta lo incluye para que un permiso
 * eliminado se pueda limpiar entero.
 */
export async function subirSoporte(
  file: File,
  employeeId: string,
  permisoId: string,
): Promise<ResultadoSoporte> {
  const invalido = validarSoporte(file);
  if (invalido) return { ok: false, error: invalido };

  const servicio = getServiceRoleSupabase();
  if (!servicio)
    return {
      ok: false,
      error:
        "No se pudo guardar el soporte porque falta la clave de servicio de Supabase (SUPABASE_SERVICE_ROLE_KEY). El permiso se guardó sin soporte: avisa al administrador.",
    };

  const path = rutaSoporte(employeeId, permisoId, file.name);

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await servicio.storage.from(BUCKET_SOPORTES).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });
    if (error)
      return {
        ok: false,
        error: `No se pudo guardar el soporte (${error.message}). El permiso se guardó sin él; vuelve a adjuntarlo desde «Editar».`,
      };
    return { ok: true, path, nombre: file.name.slice(-120) };
  } catch {
    return {
      ok: false,
      error:
        "No se pudo leer el archivo que adjuntaste. El permiso se guardó sin soporte; inténtalo de nuevo desde «Editar».",
    };
  }
}

/**
 * Borra un soporte del bucket. Se usa al reemplazarlo y al anular un permiso:
 * si el permiso desaparece, su archivo también. Nunca falla hacia fuera —un
 * archivo huérfano no debe impedir borrar el registro—.
 */
export async function borrarSoporte(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const servicio = getServiceRoleSupabase();
  if (!servicio) return;
  try {
    await servicio.storage.from(BUCKET_SOPORTES).remove([path]);
  } catch {
    // Un archivo huérfano es un problema menor; no se propaga.
  }
}

/**
 * URL FIRMADA de corta duración para descargar un soporte. La emite el route
 * handler DESPUÉS de comprobar quién pide. `null` = no se pudo firmar.
 */
export async function urlFirmadaSoporte(
  path: string,
  nombreDescarga?: string | null,
): Promise<string | null> {
  const servicio = getServiceRoleSupabase();
  if (!servicio || !path) return null;
  try {
    const { data, error } = await servicio.storage
      .from(BUCKET_SOPORTES)
      .createSignedUrl(
        path,
        SEGUNDOS_URL_FIRMADA,
        nombreDescarga ? { download: nombreDescarga } : undefined,
      );
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
