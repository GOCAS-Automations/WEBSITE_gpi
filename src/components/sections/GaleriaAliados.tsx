"use client";

import { ContentImage } from "@/components/ui/ContentImage";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ImagenContenido } from "@/data/site";
import { ChevronDown } from "@/lib/icons";

/**
 * GALERÍA DE «ALIADOS ESTRATÉGICOS» (página Nosotros)
 * ===================================================
 * La franja de fotos de la banda verde. El panel deja añadir tantas fotos como
 * GPI quiera, y con cuatro o más la rejilla fija de tres columnas las encogía
 * hasta volverlas sellos.
 *
 * DECISIÓN — dos maquetaciones, un solo componente:
 *
 *   · **Hasta 3 fotos** → la franja estática de siempre, pixel por pixel. Es el
 *     caso real de GPI hoy y el diseño que el community manager aprobó; meterlo
 *     en un carrusel añadiría flechas y puntos que no llevan a ninguna parte.
 *   · **De 4 en adelante** → carrusel horizontal con scroll-snap. Las fotos
 *     conservan su tamaño, aparecen las flechas y los puntos, y se ve que hay
 *     más contenido a la derecha.
 *
 * SIN LIBRERÍAS: el desplazamiento es `overflow-x` + `scroll-snap` nativos, así
 * que el gesto táctil y la rueda del ratón funcionan solos y no hay ni un byte
 * de JavaScript de terceros. Las flechas y los puntos únicamente llaman a
 * `scrollTo`.
 *
 * ACCESIBILIDAD:
 *   · El carril es `tabindex=0` con `role="group"`: quien navega con teclado lo
 *     enfoca y lo recorre con las flechas ← → del navegador (comportamiento
 *     nativo de un contenedor desplazable), sin atajos inventados.
 *   · Flechas y puntos son `<button>` de verdad, con `aria-label` que dice a
 *     dónde llevan, y se ocultan del lector de pantalla cuando el contenido ya
 *     es alcanzable con el carril.
 *   · `prefers-reduced-motion`: el desplazamiento pasa de `smooth` a
 *     instantáneo. Nada se mueve solo en ningún caso (no hay reproducción
 *     automática).
 */

/** Cuántas fotos caben a la vez: a partir de aquí ya no es una franja fija. */
const MAXIMO_FRANJA = 3;

export function GaleriaAliados({ fotos }: { fotos: ImagenContenido[] }) {
  if (fotos.length === 0) return null;
  if (fotos.length <= MAXIMO_FRANJA) return <FranjaEstatica fotos={fotos} />;
  return <Carrusel fotos={fotos} />;
}

/* ------------------------------------------------------------------ */
/* Hasta 3 fotos: la franja de siempre                                 */
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
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 30vw, 22vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* 4 fotos o más: carrusel                                             */
/* ------------------------------------------------------------------ */

/**
 * Distancia entre el inicio de una foto y el de la siguiente (ancho + hueco).
 *
 * Se MIDE en el DOM en vez de calcularse: los anchos son porcentuales y cambian
 * con el breakpoint, y el hueco también. Vive fuera del componente porque no
 * necesita nada suyo y así `sincronizar` no tiene que declararlo como
 * dependencia.
 */
function pasoDe(carril: HTMLElement): number {
  const items = carril.children;
  if (items.length < 2) return carril.clientWidth;
  return (
    (items[1] as HTMLElement).offsetLeft - (items[0] as HTMLElement).offsetLeft
  );
}

function Carrusel({ fotos }: { fotos: ImagenContenido[] }) {
  const carril = useRef<HTMLUListElement>(null);
  const [indice, setIndice] = useState(0);
  const [alInicio, setAlInicio] = useState(true);
  const [alFinal, setAlFinal] = useState(false);

  /**
   * Estado de las flechas y del punto activo a partir del scroll real del
   * carril: así siguen siendo correctos cuando el visitante arrastra con el
   * dedo o usa la rueda, no solo cuando pulsa un botón.
   */
  const sincronizar = useCallback(() => {
    const nodo = carril.current;
    if (!nodo) return;

    const maximo = nodo.scrollWidth - nodo.clientWidth;
    setAlInicio(nodo.scrollLeft <= 1);
    setAlFinal(nodo.scrollLeft >= maximo - 1);

    const ancho = pasoDe(nodo);
    if (ancho <= 0) return;

    // Redondear a la foto más cercana evita que el punto parpadee a mitad de
    // un arrastre.
    const actual = Math.round(nodo.scrollLeft / ancho);
    setIndice(Math.min(Math.max(actual, 0), fotos.length - 1));
  }, [fotos.length]);

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

  const irA = (posicion: number) => {
    const nodo = carril.current;
    if (nodo) desplazar(pasoDe(nodo) * posicion);
  };

  const mover = (direccion: -1 | 1) => {
    const nodo = carril.current;
    if (!nodo) return;
    // Un "paso" es lo que se ve: avanza una pantalla completa de fotos.
    desplazar(nodo.scrollLeft + direccion * nodo.clientWidth);
  };

  return (
    <div className="relative">
      {/*
        SIGUE SIENDO UNA LISTA. La versión anterior le puso `role="group"` para
        nombrar el carrusel y eso rompió la semántica: al cambiarle el rol al
        `<ul>`, sus `<li>` quedan huérfanos y axe los marca (`listitem`). Con
        `aria-label` sobre la lista se consigue lo mismo —el lector anuncia
        «lista, Fotos del trabajo de GPI…»— sin tocar el rol.

        `tabIndex={0}` es obligatorio, no decorativo: un contenedor desplazable
        que no se puede enfocar no se puede recorrer con el teclado
        (WCAG 2.1.1; es la regla `scrollable-region-focusable` de axe).
      */}
      <ul
        ref={carril}
        onScroll={sincronizar}
        tabIndex={0}
        aria-label={`Fotos del trabajo de GPI en campo (${fotos.length} imágenes). Use las flechas del teclado para recorrerlas.`}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] motion-reduce:scroll-auto sm:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {fotos.map((foto) => (
          <li
            key={foto.url}
            className="group relative aspect-[3/4] w-[calc((100%-0.75rem)/2)] shrink-0 snap-start overflow-hidden rounded-2xl shadow-card sm:w-[calc((100%-2rem)/3)] lg:aspect-auto lg:h-full lg:min-h-[18rem]"
          >
            <ContentImage
              src={foto.url}
              alt={foto.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 30vw, 22vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </li>
        ))}
      </ul>

      {/* Flechas: discretas, sobre la primera y la última foto. Se desactivan
          en los extremos en vez de desaparecer, para que la fila de controles
          no salte de posición. */}
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

      {/* Puntos indicadores */}
      <ul className="mt-3 flex justify-center gap-2">
        {fotos.map((foto, i) => (
          <li key={`punto-${foto.url}`}>
            <button
              type="button"
              onClick={() => irA(i)}
              aria-label={`Ver la foto ${i + 1} de ${fotos.length}`}
              aria-current={i === indice ? "true" : undefined}
              className={`block h-2.5 rounded-full transition-all duration-300 ${
                i === indice ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          </li>
        ))}
      </ul>
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
