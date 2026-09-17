"use client";

/**
 * PRIMITIVAS DEL PANEL QUE TAMBIÉN USAN LOS COMPONENTES DE CLIENTE
 * ================================================================
 * Campos, insignias, tarjetas y notas de ayuda. Son las mismas de siempre: solo
 * cambiaron de archivo. `components/admin/ui.tsx` las **reexporta**, así que
 * ningún `import` existente se toca.
 *
 * POR QUÉ ESTE ARCHIVO EXISTE (no es cosmético: arregla un fallo real)
 * -------------------------------------------------------------------
 * `ui.tsx` NO lleva `"use client"` —es un módulo de servidor— y entre sus
 * importaciones está `PuntoDeCarga`, que SÍ es de cliente. Mientras solo lo
 * importen Server Components eso es normal y correcto.
 *
 * El problema aparece cuando un **Client Component** importa de `ui.tsx` algún
 * COMPONENTE (no una constante suelta como `inputClass`, que el empaquetador
 * descarta del resto del módulo): entonces `ui.tsx` entra también en el grafo
 * del navegador arrastrando esa referencia de cliente, y en **producción** la
 * respuesta de cualquier server action de esa pantalla deja de llegar. El botón
 * se queda en «Guardando…» para siempre aunque el dato SÍ se haya escrito en la
 * base de datos. En desarrollo no pasa: por eso costó verlo.
 *
 * Reproducido al construir el calendario (17 sep 2026) y comprobado por
 * bisección con `next build` + `next start`: bastaba con que un componente de
 * cliente importara `Field` de `ui.tsx` para que la acción no volviera nunca.
 *
 * REGLA
 * -----
 * **Un componente `"use client"` importa estas piezas de AQUÍ (`ui-base`),
 * nunca de `ui.tsx`.** De `ui.tsx` puede seguir importando constantes de texto
 * (`AYUDA_*`) sin riesgo; lo que no puede es importar sus componentes, porque
 * los que quedan allí (`BackLink`, `PrimaryLink`, `AdminPageHeader`,
 * `SeccionCard`, `NextStepLink`) dependen de `next/link` y de `PuntoDeCarga` y
 * son, por diseño, solo para Server Components.
 */

import type { ReactNode } from "react";
import { ChevronDown, Info } from "@/lib/icons";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

/* ------------------------------------------------------------------ */
/* Ayuda para personas no técnicas                                     */
/* ------------------------------------------------------------------ */

/**
 * Nota de ayuda del panel: un párrafo corto con icono, opcionalmente titulado.
 *
 * `tono="info"` (por defecto) para explicaciones y `tono="aviso"` para lo que
 * conviene leer antes de tocar algo.
 */
export function AyudaSeccion({
  children,
  title,
  tono = "info",
  className = "",
}: {
  children: ReactNode;
  title?: string;
  tono?: "info" | "aviso";
  className?: string;
}) {
  const info = tono === "info";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed sm:px-5 ${
        info
          ? "border-line bg-mist/60 text-graphite"
          : "border-amber-200 bg-amber-50 text-amber-900"
      } ${className}`}
    >
      <Info
        className={`mt-0.5 h-4 w-4 shrink-0 ${info ? "text-brand-dark" : ""}`}
      />
      <div className="min-w-0">
        {title && (
          <p className={`font-bold ${info ? "text-ink" : ""}`}>{title}</p>
        )}
        <div className={title ? "mt-1" : ""}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Ayuda desplegable para textos largos: se abre solo si la persona quiere.
 * Usa `<details>`/`<summary>` nativos, así que funciona sin JavaScript y es
 * accesible con teclado sin código extra.
 */
export function AyudaDesplegable({
  label,
  children,
  className = "",
}: {
  /** Lo que se lee cuando está cerrado, p. ej. "¿Qué puede hacer cada rol?". */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`group rounded-2xl border border-line bg-mist/50 px-4 py-3 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-soft transition-colors hover:text-brand-dark [&::-webkit-details-marker]:hidden">
        <Info className="h-4 w-4 shrink-0 text-brand-dark" />
        {label}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 text-sm leading-relaxed text-graphite">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------ */
/* Campos de formulario                                                */
/* ------------------------------------------------------------------ */

interface FieldProps {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  type?: string;
  hint?: string;
  className?: string;
  /** Tope de caracteres del campo (el navegador ya no deja escribir más). */
  maxLength?: number;
  /**
   * true = se ve pero no se edita. Se usa para mostrarle un dato a quien no
   * tiene permiso de cambiarlo (p. ej. el apodo a un coordinador): esconderlo
   * haría pensar que no existe.
   */
  readOnly?: boolean;
  /**
   * Prefijo del `id` del campo. Obligatorio cuando una pantalla tiene VARIOS
   * formularios que reutilizan el mismo `name` (p. ej. «Título» en cada bloque
   * de la página Nosotros): los `name` pueden repetirse entre formularios, pero
   * los `id` del documento no, y un `id` duplicado hace que la etiqueta apunte
   * al campo equivocado para quien navega con lector de pantalla.
   */
  scope?: string;
}

/**
 * Los campos usan `htmlFor`/`id` explícitos (no solo el `<label>` envolvente) y
 * enlazan la ayuda con `aria-describedby`: así el lector de pantalla lee primero
 * la etiqueta y después la ayuda, en vez de mezclarlo todo en el nombre del
 * campo.
 */
const fieldId = (name: string, scope?: string) =>
  scope ? `campo-${scope}-${name}` : `campo-${name}`;
const hintId = (name: string, scope?: string) => `${fieldId(name, scope)}-ayuda`;

export function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  type = "text",
  hint,
  className = "",
  scope,
  maxLength,
  readOnly,
}: FieldProps) {
  return (
    <div className={`block ${className}`}>
      <label
        htmlFor={fieldId(name, scope)}
        className="mb-1.5 block text-sm font-semibold text-ink"
      >
        {label}
        {required && <span className="text-brand-dark"> *</span>}
      </label>
      <input
        id={fieldId(name, scope)}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        readOnly={readOnly}
        aria-required={required ? true : undefined}
        aria-describedby={hint ? hintId(name, scope) : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={`${inputClass} ${readOnly ? "cursor-not-allowed bg-mist text-graphite" : ""}`}
      />
      {hint && (
        <span id={hintId(name, scope)} className="mt-1 block text-xs text-graphite">
          {hint}
        </span>
      )}
    </div>
  );
}

interface TextAreaProps extends Omit<FieldProps, "type"> {
  rows?: number;
}

export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  rows = 4,
  hint,
  className = "",
  scope,
}: TextAreaProps) {
  return (
    <div className={`block ${className}`}>
      <label
        htmlFor={fieldId(name, scope)}
        className="mb-1.5 block text-sm font-semibold text-ink"
      >
        {label}
        {required && <span className="text-brand-dark"> *</span>}
      </label>
      <textarea
        id={fieldId(name, scope)}
        name={name}
        rows={rows}
        required={required}
        aria-required={required ? true : undefined}
        aria-describedby={hint ? hintId(name, scope) : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={`${inputClass} resize-y`}
      />
      {hint && (
        <span id={hintId(name, scope)} className="mt-1 block text-xs text-graphite">
          {hint}
        </span>
      )}
    </div>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
  hint,
  className = "",
  scope,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  hint?: string;
  className?: string;
  scope?: string;
}) {
  return (
    <div className={`block ${className}`}>
      <label
        htmlFor={fieldId(name, scope)}
        className="mb-1.5 block text-sm font-semibold text-ink"
      >
        {label}
      </label>
      <select
        id={fieldId(name, scope)}
        name={name}
        defaultValue={defaultValue}
        aria-describedby={hint ? hintId(name, scope) : undefined}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && (
        <span id={hintId(name, scope)} className="mt-1 block text-xs text-graphite">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Interruptor visible/oculto.
 *
 * Envía SIEMPRE un valor: un input oculto con "false" y, si está encendido,
 * también el checkbox con "true". Sin el oculto, un checkbox desmarcado no
 * manda nada y el servidor no podría distinguir "apagado" de "no enviado".
 * Del lado del servidor se lee con el helper `bool()` de `admin/actions.ts`.
 */
export function Switch({
  label,
  name,
  defaultChecked = true,
  hint,
  onLabel = "Visible",
  offLabel = "Oculto",
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-brand/50">
        <input type="hidden" name={name} value="false" />
        {/* El propio checkbox es el riel del interruptor (appearance-none) y su
            pseudo-elemento ::before hace de perilla: así los estados dependen
            solo de :checked, sin JavaScript. */}
        <input
          type="checkbox"
          name={name}
          value="true"
          defaultChecked={defaultChecked}
          className="peer relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-graphite/30 outline-none transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-soft before:transition-transform before:content-[''] checked:bg-brand checked:before:translate-x-5 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
        />
        <span className="text-sm font-semibold text-graphite peer-checked:hidden">
          {offLabel}
        </span>
        <span className="hidden text-sm font-semibold text-brand-dark peer-checked:inline">
          {onLabel}
        </span>
      </label>
      {hint && <p className="mt-1.5 text-xs text-graphite">{hint}</p>}
    </div>
  );
}

/** Etiqueta de estado (publicado/oculto, rol, estado de una jornada…). */
export function Badge({
  children,
  className = "bg-mist text-graphite",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

/** Badge específico para la visibilidad de un ítem de contenido. */
export function PublishedBadge({ published }: { published: boolean }) {
  return (
    <Badge
      className={
        published ? "bg-brand-tint text-brand-deep" : "bg-amber-100 text-amber-800"
      }
    >
      {published ? "Visible" : "Oculto"}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Contenedores                                                        */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-graphite">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-mist/60 p-10 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-graphite">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
