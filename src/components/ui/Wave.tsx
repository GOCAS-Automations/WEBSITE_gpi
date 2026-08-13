/**
 * Corte de ola entre secciones (el "diseño continuo" del prototipo).
 *
 * Es SVG en línea a propósito: nada de imágenes externas ni de librerías, se
 * estira con `preserveAspectRatio="none"` y hereda los colores de la marca.
 *
 * Cómo funciona: se pintan DOS curvas idénticas desplazadas unos píxeles. La de
 * abajo lleva el degradado verde y la de arriba, el color de la sección que
 * viene después; lo que queda a la vista de la primera es la franja verde que
 * acompaña el corte en el mockup.
 *
 * El color de relleno es el de la sección SIGUIENTE (o la anterior, si el corte
 * va arriba): por eso `tone` es obligatorio de pensar en cada uso — una ola
 * blanca sobre una sección `bg-mist` se nota.
 */

type Tone = "white" | "mist";

const FILL: Record<Tone, string> = {
  white: "#ffffff",
  mist: "var(--color-mist)",
};

interface WaveProps {
  /** Color de la sección hacia la que se abre el corte. */
  tone?: Tone;
  /** `bottom` = corte al pie de la sección; `top` = corte en su cabecera. */
  position?: "bottom" | "top";
  /**
   * Identificador del degradado. Solo hay que tocarlo si dos olas conviven en
   * la misma página: dos `<linearGradient>` con el mismo `id` son HTML inválido.
   */
  gradientId?: string;
  className?: string;
}

export function Wave({
  tone = "white",
  position = "bottom",
  gradientId = "gpi-wave",
  className = "",
}: WaveProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-10 h-12 sm:h-20 lg:h-28 ${
        position === "bottom" ? "bottom-0" : "top-0 rotate-180"
      } ${className}`}
    >
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="h-full w-full"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2c8420" />
            <stop offset="45%" stopColor="#3dae2b" />
            <stop offset="100%" stopColor="#8cc63f" />
          </linearGradient>
        </defs>
        {/* Franja verde: la misma curva, 12 unidades más arriba. */}
        <path
          d="M0,78 C240,20 470,6 720,42 C980,80 1215,118 1440,74 L1440,120 L0,120 Z"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M0,90 C240,32 470,18 720,54 C980,92 1215,124 1440,86 L1440,120 L0,120 Z"
          fill={FILL[tone]}
        />
      </svg>
    </div>
  );
}
