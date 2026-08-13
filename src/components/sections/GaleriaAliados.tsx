"use client";

import { ContentImage } from "@/components/ui/ContentImage";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagenContenido } from "@/data/site";
import { ChevronDown } from "@/lib/icons";

/**
 * GALERÍA DE «ALIADOS ESTRATÉGICOS» (página Nosotros)
 * ===================================================
 * La franja de fotos de la banda verde. El panel deja añadir tantas fotos como
 * GPI quiera, y una rejilla fija las encogía o las apachurraba según cuántas
 * hubiera.
 *
 * DECISIÓN — tres maquetaciones, un solo componente (rediseño del 13 de
 * agosto de 2026, a pedido del cliente):
 *
 *   · **1 foto** → centrada, con un ancho máximo moderado. Estirarla a todo
 *     el ancho del panel se veía como un banner desproporcionado; a todo lo
 *     alto pero contenida en anchura queda como una foto de verdad.
 *   · **2 fotos** → la franja estática de siempre, dos columnas iguales. Con
 *     solo dos fotos un carrusel añadiría flechas que no llevan a ninguna
 *     parte.
 *   · **3 fotos o más** → carrusel horizontal con scroll-snap. El umbral bajó
 *     de 4 a 3: con tres fotos ya cabe un carrusel con «peek» (se alcanza a
 *     ver un pedazo de la tercera asomando por el borde), que es justo la
 *     señal visual de que hay más contenido para deslizar.
 *
 * CUÁNTAS FOTOS SE VEN A LA VEZ (antes 3 fijas, ahora con peek):
 *   · Escritorio (≥640px): ~2.2 fotos por vista — dos completas más un asomo
 *     de la siguiente. Antes eran 3 apretadas; con 2 completas cada foto
 *     respira más ancha, y el peek le queda de todos modos.
 *   · Móvil (<640px): ~1.2 fotos por vista — una completa más un asomo.
 *
 * El «1.2» y el «2.2» no son mágicos: son el resultado de fijar cuánto debe
 * asomar la siguiente foto (ver el comentario sobre `calc()` en `Carrusel`).
 *
 * SIN PUNTOS INDICADORES (13 de agosto de 2026, pedido del cliente): la fila de
 * puntos debajo de las fotos se retiró junto con el espacio que ocupaba, para
 * que el bloque termine justo donde terminan las imágenes, igual que la franja
 * estática. Para recorrer el carrusel quedan las flechas, el gesto táctil, la
 * rueda del ratón y el teclado — todas las vías que ya existían.
 *
 * SIN LIBRERÍAS: el desplazamiento es `overflow-x` + `scroll-snap` nativos, así
 * que el gesto táctil y la rueda del ratón funcionan solos y no hay ni un byte
 * de JavaScript de terceros. Las flechas únicamente llaman a `scrollTo`.
 *
 * ACCESIBILIDAD:
 *   · El carril es `tabindex=0` con `role="group"`: quien navega con teclado lo
 *     enfoca y lo recorre con las flechas ← → del navegador (comportamiento
 *     nativo de un contenedor desplazable), sin atajos inventados.
 *   · Las flechas son `<button>` de verdad, con `aria-label` que dice a dónde
 *     llevan, y se ocultan del lector de pantalla cuando el contenido ya es
 *     alcanzable con el carril.
 *   · `prefers-reduced-motion`: el desplazamiento pasa de `smooth` a
 *     instantáneo. Nada se mueve solo en ningún caso (no hay reproducción
 *     automática).
 */

/** A partir de aquí ya no es una franja fija, sino un carrusel con peek. */
const MINIMO_CARRUSEL = 3;

export function GaleriaAliados({ fotos }: { fotos: ImagenContenido[] }) {
  if (fotos.length === 0) return null;
  if (fotos.length === 1) return <FotoUnica foto={fotos[0]} />;
  if (fotos.length < MINIMO_CARRUSEL) return <FranjaEstatica fotos={fotos} />;
  return <Carrusel fotos={fotos} />;
}

/* ------------------------------------------------------------------ */
/* 1 sola foto: centrada, sin estirarla a todo el ancho                */
/* ------------------------------------------------------------------ */

function FotoUnica({ foto }: { foto: ImagenContenido }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="group relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl shadow-card sm:max-w-sm lg:aspect-auto lg:h-full lg:max-w-md lg:min-h-[18rem]">
        <ContentImage
          src={foto.url}
          alt={foto.alt}
          fill
          sizes="(max-width: 1024px) 60vw, 26rem"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2 fotos: la franja de siempre, dos columnas iguales                 */
/* ------------------------------------------------------------------ */

function FranjaEstatica({ fotos }: { fotos: ImagenContenido[] }) {
  return (
    <ul
      className="grid h-full gap-3 sm:gap-4"
      style={{ gridTemplateColumns: `repeat(${fotos.length}, minmax(0, 1fr))` }}
    >
      {fotos.map((foto) => (
        <li
          key={foto.url}
          className="group relative aspect-[3/4] overflow-hidden rounded-2xl shadow-card lg:aspect-auto lg:h-full lg:min-h-[18rem]"
        >
          <ContentImage
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 1023px) 48vw, 22vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* 3 fotos o más: carrusel con peek                                    */
/* ------------------------------------------------------------------ */

function Carrusel({ fotos }: { fotos: ImagenContenido[] }) {
  const carril = useRef<HTMLUListElement>(null);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(false);

  /**
   * Estado de las flechas a partir del scroll real del carril: así siguen
   * siendo correctas cuando el visitante arrastra con el dedo o usa la rueda,
   * no solo cuando pulsa un botón.
   */
  const sincronizar = useCallback(() => {
    const nodo = carril.current;
    if (!nodo) return;

    const maximo = nodo.scrollWidth - nodo.clientWidth;
    setAlInicio(nodo.scrollLeft <= 1);
    setAlFinal(nodo.scrollLeft >= maximo - 1);
  }, []);

  useEffect(() => {
    sincronizar();
    const nodo = carril.current;
    if (!nodo) return;

    // `resize` importa: al girar el móvil cambia cuántas fotos se ven a la vez.
    window.addEventListener("resize", sincronizar);
    return () => window.removeEventListener("resize", sincronizar);
  }, [sincronizar]);

  /** Desplaza el carril respetando `prefers-reduced-motion`. */
  const desplazar = (izquierda: number) => {
    const nodo = carril.current;
    if (!nodo) return;

    const suave =
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    nodo.scrollTo({ left: izquierda, behavior: suave ? "smooth" : "auto" });
  };

  const mover = (direccion: -1 | 1) => {
    const nodo = carril.current;
    if (!nodo) return;
    // Un "paso" es lo que se ve: avanza una pantalla completa de fotos.
    desplazar(nodo.scrollLeft + direccion * nodo.clientWidth);
  };

  return (
    /*
      `lg:h-full` (13 ago 2026, al quitar los puntos): en escritorio la altura
      del bloque verde la fija el panel de texto de la izquierda, y el carril se
      quedaba en su altura mínima (18rem). Con los puntos, ese sobrante de verde
      pasaba medio disimulado; sin ellos quedaba una franja vacía debajo de las
      fotos. Estirando el carril, las fotos vuelven a terminar donde termina el
      panel —exactamente lo que ya hacían `FotoUnica` y `FranjaEstatica`, que
      siempre fueron `h-full`—. Solo desde `lg`, que es donde el bloque se parte
      en dos columnas; abajo manda el `aspect-[3/4]` de cada foto.
    */
    <div className="relative lg:h-full">
      {/*
        SIGUE SIENDO UNA LISTA. La versión anterior le puso `role="group"` para
        nombrar el carrusel y eso rompió la semántica: al cambiarle el rol al
        `<ul>`, sus `<li>` quedan huérfanos y axe los marca (`listitem`). Con
        `aria-label` sobre la lista se consigue lo mismo —el lector anuncia
        «lista, Fotos del trabajo de GPI…»— sin tocar el rol.

        `tabIndex={0}` es obligatorio, no decorativo: un contenedor desplazable
        que no se puede enfocar no se puede recorrer con el teclado
        (WCAG 2.1.1; es la regla `scrollable-region-focusable` de axe).

        ANCHO DE CADA FOTO — de dónde salen 1.2 y 2.2:
        con `k` fotos completas visibles y un gap `g` entre ellas (incluido el
        que separa la última foto completa de la que asoma), el ancho `w` de
        cada foto que dibuja un peek de una fracción `p` de sí misma sale de
        despejar `(k + p) * w + k * g = 100%` → `w = (100% - k·g) / (k + p)`.
          · Móvil: k=1, g=0.75rem (gap-3), p=0.2 → 100%-1·0.75rem entre 1.2.
          · sm+:   k=2, g=1rem (gap-4),    p=0.2 → 100%-2·1rem entre 2.2.
        No hace falta que el cálculo sea exacto al pixel: solo que el peek se
        note sin comerse media foto. Quien manda al desplazar es `clientWidth`
        (una pantalla completa por flechazo) y el `scroll-snap`, que alinea la
        foto más cercana.
      */}
      <ul
        ref={carril}
        onScroll={sincronizar}
        tabIndex={0}
        aria-label={`Fotos del trabajo de GPI en campo (${fotos.length} imágenes). Use las flechas del teclado para recorrerlas.`}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] motion-reduce:scroll-auto sm:gap-4 lg:h-full [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((foto) => (
          <li
            key={foto.url}
            className="group relative aspect-[3/4] w-[calc((100%-0.75rem)/1.2)] shrink-0 snap-start overflow-hidden rounded-2xl shadow-card sm:w-[calc((100%-2rem)/2.2)] lg:aspect-auto lg:h-full lg:min-h-[18rem]"
          >
            <ContentImage
              src={foto.url}
              alt={foto.alt}
              fill
              sizes="(max-width: 639px) 85vw, (max-width: 1023px) 45vw, 26vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </li>
        ))}
      </ul>

      {/* Flechas: discretas, sobre la primera y la última foto, y únicos
          controles visibles del carrusel. En los extremos se desactivan
          (`disabled` + opacidad 0) en vez de desmontarse, para que la que sigue
          activa no cambie de sitio. */}
      <Flecha
        direccion="anterior"
        onClick={() => mover(-1)}
        deshabilitada={alInicio}
      />
      <Flecha
        direccion="siguiente"
        onClick={() => mover(1)}
        deshabilitada={alFinal}
      />

    </div>
  );
}

/**
 * Flecha del carrusel.
 *
 * `ChevronDown` girado 90°: el juego de iconos del sitio no tiene chevrones
 * laterales y añadir dos SVG nuevos por esto no compensa.
 */
function Flecha({
  direccion,
  onClick,
  deshabilitada,
}: {
  direccion: "anterior" | "siguiente";
  onClick: () => void;
  deshabilitada: boolean;
}) {
  const anterior = direccion === "anterior";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitada}
      aria-label={anterior ? "Ver las fotos anteriores" : "Ver las fotos siguientes"}
      className={`absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-ink/45 text-white shadow-card backdrop-blur transition-all duration-200 hover:bg-ink/70 disabled:pointer-events-none disabled:opacity-0 ${
        anterior ? "left-2 sm:left-3" : "right-2 sm:right-3"
      }`}
    >
      <ChevronDown
        className={`h-5 w-5 ${anterior ? "rotate-90" : "-rotate-90"}`}
      />
    </button>
  );
}
