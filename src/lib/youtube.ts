/**
 * YOUTUBE — extracción del identificador de un video
 * ==================================================
 * Módulo PURO (sin dependencias de servidor): lo comparten la server action que
 * guarda el video corporativo, la que guarda el video de cada servicio y la
 * capa de contenido que los lee.
 *
 * Existe porque quien edita el panel **pega la URL de la barra del navegador**,
 * no el identificador: y esa URL viene en cuatro formas distintas según de
 * dónde se copie (escritorio, botón Compartir, YouTube Studio, Shorts).
 */

/** Un identificador de YouTube: 6+ caracteres de `A-Z a-z 0-9 _ -`. */
const ID_SUELTO = /^[A-Za-z0-9_-]{6,}$/;

/**
 * Formas de URL aceptadas:
 *   https://www.youtube.com/watch?v=ID       (barra del navegador)
 *   https://youtu.be/ID                      (botón «Compartir»)
 *   https://www.youtube.com/embed/ID         (código para insertar)
 *   https://www.youtube.com/shorts/ID        (Shorts)
 *   https://www.youtube.com/live/ID          (emisiones en directo)
 */
const EN_URL = /(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{6,})/;

/**
 * Devuelve el identificador del video, o cadena vacía si lo escrito no es ni
 * una URL de YouTube reconocible ni un identificador suelto.
 *
 * Acepta el identificador pelado a propósito: hay quien lo copia así y
 * rechazarlo sería un obstáculo sin ninguna ganancia.
 */
export function youtubeId(entrada: string): string {
  const valor = entrada.trim();
  if (valor === "") return "";

  const enUrl = valor.match(EN_URL);
  if (enUrl) return enUrl[1];

  return ID_SUELTO.test(valor) ? valor : "";
}

/** URL canónica para ver el video en YouTube. */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
