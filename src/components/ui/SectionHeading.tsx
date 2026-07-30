import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  /** Nivel del encabezado (por defecto h2) */
  as?: "h1" | "h2" | "h3";
  className?: string;
  light?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as: Tag = "h2",
  className = "",
  light = false,
}: SectionHeadingProps) {
  const isCenter = align === "center";
  return (
    <div
      className={`${isCenter ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}
    >
      {eyebrow && (
        /* `brand-deep` y no `brand-dark`: este rótulo mide 12px, así que le
           aplica el umbral de 4.5:1 y aparece tanto sobre blanco como sobre
           secciones `bg-mist` (#f4f6f4). `brand-dark` da 4.74:1 sobre blanco
           pero solo 4.37:1 sobre mist — se queda corto. `brand-deep` cumple en
           ambos: 6.71:1 sobre blanco y 6.17:1 sobre mist. */
        <span
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${
            light ? "text-brand-light" : "text-brand-deep"
          }`}
        >
          <span className="h-px w-6 bg-current" aria-hidden="true" />
          {eyebrow}
        </span>
      )}
      <Tag
        className={`mt-3 text-3xl font-extrabold leading-[1.12] sm:text-4xl ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </Tag>
      {description && (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${
            light ? "text-white/70" : "text-graphite"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
