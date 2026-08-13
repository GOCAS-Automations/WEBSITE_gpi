import Link from "next/link";
import type { ReactNode } from "react";
import { PuntoDeCarga } from "./PuntoDeCarga";
import { ArrowRight, ChevronDown, Info } from "@/lib/icons";

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

/* ------------------------------------------------------------------ */
/* Ayuda para personas no técnicas                                     */
/* ------------------------------------------------------------------ */

/**
 * TEXTOS DE AYUDA REUTILIZADOS
 * ----------------------------
 * Viven aquí (y no repetidos en cada pantalla) para que digan siempre lo mismo.
 * Están escritos en español llano, sin jerga: quien usa el panel no es técnico.
 */

/** Cuánto tarda en verse un cambio en el sitio público. */
export const AYUDA_PUBLICACION =
  "Lo que guardes aquí se ve en el sitio en pocos minutos.";

/** Qué hace el campo "Orden" (aparece en servicios, proyectos, clientes, FAQ y valores). */
export const AYUDA_ORDEN =
  "El número controla la posición: el más bajo aparece primero.";

/** Diferencia entre ocultar y eliminar. */
export const AYUDA_VISIBILIDAD =
  "Ocultar es reversible y no borra nada: el contenido se conserva aquí y puedes volver a mostrarlo cuando quieras. Eliminar sí es permanente. Para retirar algo del sitio de forma temporal, oculta.";

/** Qué es el texto alternativo de una imagen y por qué importa. */
export const AYUDA_ALT =
  "Describe en pocas palabras lo que se ve en la foto. Lo leen en voz alta los programas que usan las personas con discapacidad visual y le sirve a Google para entender la imagen.";

/** Recomendación práctica para subir imágenes. */
export const AYUDA_IMAGEN =
  "Sube un archivo desde tu computador o pega el enlace de una imagen. Lo ideal son fotos horizontales (más anchas que altas) y de menos de 1 MB: si pesan mucho, el sitio carga lento.";

/** Qué hace el bloque de video de un servicio (migración 0007). */
export const AYUDA_VIDEO_SERVICIO =
  "Pega el enlace de YouTube. El video aparece en la página del servicio con su título y descripción; el interruptor «Mostrar el video» empieza apagado: enciéndelo cuando el enlace esté listo para publicarse.";

/**
 * Recordatorio de guardar — el aviso que más falta hacía.
 *
 * GPI perdía cambios porque el panel guarda BLOQUE A BLOQUE y el único aviso
 * que lo decía estaba al pie de la columna lateral, donde nadie mira mientras
 * escribe. Ahora es una constante y se pinta ARRIBA de cada pantalla de
 * contenido, antes de cualquier formulario.
 */
export const AYUDA_GUARDAR_BLOQUES =
  "Los cambios NO se aplican hasta que pulses «Guardar» en el bloque que editaste.";

/**
 * Aviso de guardado, en ámbar, para la cabecera de las pantallas del panel.
 *
 * UNO POR PANTALLA, nunca uno por bloque: repetirlo junto a cada botón lo
 * convertiría en ruido que se deja de leer, que es justo lo que pasó con el
 * texto de la barra lateral.
 */
export function AvisoGuardar({
  className = "mb-6",
  unico = false,
}: {
  className?: string;
  /**
   * true = la pantalla es UN formulario con un solo botón al final (crear o
   * editar un servicio). Decirle a alguien que "cada bloque tiene su botón"
   * donde solo hay uno lo mandaría a buscar botones que no existen.
   */
  unico?: boolean;
}) {
  return (
    <AyudaSeccion tono="aviso" title="Recuerda guardar" className={className}>
      {unico ? (
        <>
          Esta pantalla se guarda con <strong>un solo botón</strong>, al final
          del formulario. {AYUDA_GUARDAR_BLOQUES} Si sales sin guardar, lo
          escrito se pierde.
        </>
      ) : (
        <>
          Esta pantalla guarda <strong>bloque a bloque</strong>: cada tarjeta
          tiene su propio botón. {AYUDA_GUARDAR_BLOQUES} Si cambias de sección
          sin guardar, lo escrito se pierde. Lo que sí guardes se ve en el sitio
          en pocos minutos.
        </>
      )}
    </AyudaSeccion>
  );
}

/**
 * Nota de ayuda del panel: un párrafo corto con icono, opcionalmente titulado.
 *
 * `tono="info"` (por defecto) para explicaciones y `tono="aviso"` para lo que
 * conviene leer antes de tocar algo. Es un bloque estático, sin JavaScript:
 * se puede usar en cualquier Server Component.
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
        aria-required={required ? true : undefined}
        aria-describedby={hint ? hintId(name, scope) : undefined}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputClass}
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

/* ------------------------------------------------------------------ */
/* Enlaces / botones de navegación                                     */
/* ------------------------------------------------------------------ */

/** Botón "← Volver a …" usado en cabeceras y formularios del panel. */
export function BackLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark ${className}`}
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={`inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Cabecera de una sección del panel: título, descripción, breadcrumb con
 * "← Volver al dashboard" y acción principal opcional.
 */
export function AdminPageHeader({
  title,
  description,
  backHref = "/admin",
  backLabel = "Volver al dashboard",
  breadcrumb,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: ReactNode;
}) {
  return (
    <header className="mb-7">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink href={backHref} label={backLabel} />
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Ruta del panel">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-graphite">
              {breadcrumb.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {crumb.href ? (
                    <Link
                      prefetch={false}
                      href={crumb.href}
                      className="transition-colors hover:text-brand-dark"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-soft">{crumb.label}</span>
                  )}
                  {i < breadcrumb.length - 1 && <span aria-hidden="true">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}

/**
 * Tarjeta de acceso a una sección del panel.
 *
 * La comparten el dashboard (`/admin`) y el índice de contenido
 * (`/admin/contenido`): las dos pantallas son rejillas de tarjetas iguales y
 * tenerlas duplicadas garantizaba que acabaran diferenciándose sin querer.
 *
 * `prefetch={false}`, como toda la navegación del panel: ver la nota larga en
 * `AdminShell`. Una rejilla de ocho tarjetas visibles a la vez era, con el
 * prefetch por defecto, ocho peticiones simultáneas a rutas `force-dynamic`.
 */
export function SeccionCard({
  href,
  label,
  icon: Icon,
  count = null,
  unit = "",
  description,
  destacada = false,
}: {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  count?: number | null;
  unit?: string;
  description: string;
  destacada?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card ${
        destacada ? "border-brand/30" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-deep transition-colors group-hover:bg-brand-deep group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        {count !== null && (
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
            {count} {unit}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-ink group-hover:text-brand-dark">
        {label}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-graphite">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
        Administrar
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/* Igual que en el menú lateral: la ruta es dinámica y el clic tarda
            en verse. Sin este punto, la tarjeta parece no responder. */}
        <PuntoDeCarga className="ml-1" />
      </span>
    </Link>
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

export function NextStepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark transition-colors hover:text-brand-dark"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
