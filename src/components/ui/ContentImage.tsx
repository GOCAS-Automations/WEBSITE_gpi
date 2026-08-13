import Image, { type ImageProps } from "next/image";
import { esImagenOptimizable } from "@/lib/imagenes";

/**
 * IMAGEN DE CONTENIDO (la que edita GPI desde el panel)
 * =====================================================
 * Es `next/image` con una sola diferencia: decide sola si la URL puede pasar
 * por el optimizador. El porqué está explicado en `src/lib/imagenes.ts` —
 * resumen: una URL de un host no declarado en `next.config.ts` tumba la página
 * en desarrollo y deja la foto rota en producción, y el contenido lo pega el
 * cliente, así que eso tiene que ser imposible.
 *
 * CUÁNDO USAR CUÁL
 * ----------------
 *   · `ContentImage` → cualquier imagen que salga de la base de datos:
 *     servicios, proyectos, clientes, cabeceras, galerías, inicio, Nosotros…
 *     y también sus vistas previas dentro de `/admin`.
 *   · `next/image` a secas → el «chrome» del sitio, que vive en el repositorio
 *     y no se edita desde el panel: el logo de la barra y del pie, y la marca
 *     de la pantalla de Mi Cuenta.
 *
 * `unoptimized` explícito gana siempre: si alguien lo pasa a mano, se respeta.
 */
export function ContentImage({ src, alt, unoptimized, ...props }: ImageProps) {
  // Una imagen importada (`import foto from "./foto.jpg"`) es del propio
  // repositorio: siempre optimizable. Solo hay que mirar las cadenas.
  const optimizable = typeof src === "string" ? esImagenOptimizable(src) : true;

  // `alt` se desestructura y se pasa a mano —en vez de dejarlo caer con el
  // resto— para que la regla jsx-a11y/alt-text lo vea: si no, avisa en cada
  // build de que falta un `alt` que en realidad siempre llega por props.
  return (
    <Image src={src} alt={alt} unoptimized={unoptimized ?? !optimizable} {...props} />
  );
}
