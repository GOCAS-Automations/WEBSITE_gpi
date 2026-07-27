/**
 * Configuración de Supabase.
 *
 * El sitio debe funcionar CON y SIN estas variables:
 *  - Sin ellas → el contenido sale de `src/data/*` (fallback estático) y el
 *    portal /mi-cuenta muestra el aviso de "próximamente".
 *  - Con ellas → el contenido sale de Supabase y se habilitan login y /admin.
 *
 * Las variables deben referenciarse de forma literal (`process.env.NEXT_PUBLIC_X`)
 * para que Next.js pueda inlinearlas en el bundle del navegador.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Bucket público de Storage donde el admin sube imágenes del sitio. */
export const SITE_IMAGES_BUCKET = "site-images";

/** true cuando ambas variables de entorno están presentes y son plausibles. */
export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20
  );
}
