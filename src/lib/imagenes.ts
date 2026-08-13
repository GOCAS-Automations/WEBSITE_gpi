/**
 * IMÁGENES DE CONTENIDO — QUÉ URL PUEDE PASAR POR EL OPTIMIZADOR
 * ==============================================================
 * Módulo puro (sin React, sin `next/*`): lo usan tanto el componente
 * `ContentImage` como el panel.
 *
 * EL PROBLEMA QUE RESUELVE
 * ------------------------
 * Desde el panel, GPI puede **pegar la URL de cualquier imagen de internet**.
 * `next/image` solo acepta hosts declarados en `images.remotePatterns`
 * (`next.config.ts`) y con uno que no esté en la lista:
 *
 *   · en desarrollo **lanza una excepción** durante el render → la página
 *     entera se cae (`Invalid src prop … is not configured under images`);
 *   · en producción no lanza, pero la petición a `/_next/image` responde 400
 *     → la foto queda rota.
 *
 * Ninguna de las dos cosas es aceptable para un sitio cuyo contenido edita el
 * cliente: **una URL mal pegada no puede tumbar una página**.
 *
 * LA REGLA
 * --------
 * Si la URL es de un host permitido, se optimiza como siempre. Si no, se pinta
 * `unoptimized`: `next/image` se salta el loader (y por tanto la validación) y
 * emite un `<img>` normal con la URL tal cual. La foto se ve si la política de
 * seguridad del navegador (`img-src` de la CSP) permite ese host; si no, se ve
 * el hueco. En los dos casos **la página funciona**.
 *
 * Por eso el panel recomienda subir el archivo (va al bucket) o publicar en
 * Cloudinary: son los dos caminos que están permitidos de punta a punta.
 */

/** Rutas del propio sitio (`/images/...`): siempre optimizables. */
function esRutaLocal(src: string): boolean {
  return src.startsWith("/") && !src.startsWith("//");
}

/**
 * Hosts que `next.config.ts` declara en `images.remotePatterns`.
 * **Si se toca uno, hay que tocar el otro.**
 */
export const HOSTS_IMAGEN_OPTIMIZABLES = [
  { host: /\.supabase\.(co|in)$/, ruta: "/storage/v1/object/public/" },
  { host: /^res\.cloudinary\.com$/, ruta: "/" },
] as const;

/**
 * ¿Puede esta URL pasar por `/_next/image`?
 *
 * Ante la duda (URL vacía o que no se puede interpretar) devuelve `false`: es
 * el lado seguro, porque `unoptimized` nunca lanza.
 */
export function esImagenOptimizable(src: string | null | undefined): boolean {
  if (!src) return false;
  if (esRutaLocal(src)) return true;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;

  return HOSTS_IMAGEN_OPTIMIZABLES.some(
    ({ host, ruta }) => host.test(url.hostname) && url.pathname.startsWith(ruta),
  );
}
