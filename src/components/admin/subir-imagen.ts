"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import { SITE_IMAGES_BUCKET } from "@/lib/supabase/config";

/**
 * SUBIDA DE IMÁGENES AL BUCKET — lógica compartida
 * ================================================
 * La usan los dos campos del panel que aceptan una foto: `ImageField` (una
 * imagen suelta) y `GalleryField` (una lista de imágenes). Vive aparte para
 * que las dos suban **igual**: misma carpeta, mismo saneado de nombre y misma
 * URL pública devuelta.
 *
 * Las carpetas del bucket son las seis del sitio —`inicio`, `nosotros`,
 * `servicios`, `proyectos`, `clientes`, `cabeceras`— y las fija cada pantalla
 * con la prop `folder`. Mantenerlas ordenadas es lo que permite que GPI
 * reconozca sus propias fotos cuando entra al almacenamiento.
 */

/** Nombre de archivo apto para una URL: sin tildes, sin espacios, corto. */
export function nombreSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase()
    .slice(-60);
}

export type ResultadoSubida = { url: string } | { error: string };

export async function subirImagenAlBucket(
  file: File,
  folder: string,
): Promise<ResultadoSubida> {
  const supabase = getBrowserSupabase();
  if (!supabase) return { error: "Supabase no está configurado." };

  // La marca de tiempo evita pisar una foto anterior con el mismo nombre.
  const path = `${folder}/${Date.now()}-${nombreSeguro(file.name)}`;
  const { data, error } = await supabase.storage
    .from(SITE_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error || !data) {
    return { error: error?.message ?? "No se pudo subir la imagen." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(data.path);

  return { url: publicUrl };
}
