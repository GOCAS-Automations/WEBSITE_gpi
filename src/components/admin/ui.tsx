import Link from "next/link";
import type { ReactNode } from "react";
import { PuntoDeCarga } from "./PuntoDeCarga";
import { ArrowRight } from "@/lib/icons";
import { AyudaSeccion } from "./ui-base";
import { AYUDA_GUARDAR_BLOQUES } from "./ayudas";

/**
 * SISTEMA DE COMPONENTES DEL PANEL
 * ================================
 * Aquí viven los TEXTOS de ayuda reutilizados y las piezas que dependen de
 * `next/link` (cabecera de sección, tarjetas del hub, botones de volver), que
 * son para Server Components.
 *
 * Los campos, insignias, tarjetas y notas de ayuda se mudaron a `./ui-base`
 * —que sí lleva `"use client"`— y se REEXPORTAN desde aquí, así que ningún
 * `import` existente cambió. La razón está explicada a fondo en ese archivo, y
 * es importante: **un componente de cliente debe importarlas de `./ui-base`,
 * nunca de aquí**, porque arrastrar este módulo al navegador deja colgadas las
 * server actions de esa pantalla EN PRODUCCIÓN (el botón se queda en
 * «Guardando…» aunque el dato ya se haya guardado en la base de datos).
 */
export * from "./ui-base";

/* ------------------------------------------------------------------ */
/* Ayuda para personas no técnicas                                     */
/* ------------------------------------------------------------------ */

// Los textos AYUDA_* viven en `./ayudas` (módulo puro, apto para Client
// Components) y se reexportan aquí para que ningún import existente cambie.
export * from "./ayudas";

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
