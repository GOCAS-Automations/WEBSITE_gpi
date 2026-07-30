import Link from "next/link";
import { JsonLd, SITE_URL } from "@/components/seo/JsonLd";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /** "light" para fondos oscuros (hero), "dark" para fondos claros. */
  tone?: "light" | "dark";
  className?: string;
  /**
   * Emite el `BreadcrumbList` de schema.org junto al breadcrumb visual.
   * Se genera aquí a propósito: así el marcado y lo que ve el usuario **no
   * pueden desincronizarse** (que es exactamente lo que Google penaliza).
   */
  jsonLd?: boolean;
}

/**
 * Ruta de navegación reutilizable ("Inicio › Servicios › [Servicio]").
 * El último ítem nunca es clickeable, sin importar si trae `href`.
 */
export function Breadcrumbs({
  items,
  tone = "light",
  className = "",
  jsonLd = true,
}: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  const styles =
    tone === "light"
      ? {
          link: "text-white/60 hover:text-brand-light",
          current: "text-white/85",
          separator: "text-white/35",
        }
      : {
          link: "text-ink-soft hover:text-brand-dark",
          current: "text-ink",
          separator: "text-line",
        };

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      // El último nivel es la página actual: sin `item`, como pide Google.
      ...(item.href && i < items.length - 1
        ? { item: `${SITE_URL}${item.href === "/" ? "/" : item.href}` }
        : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={className}>
      {jsonLd && <JsonLd data={breadcrumbList} />}
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className={`transition-colors ${styles.link}`}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.current} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span aria-hidden="true" className={styles.separator}>
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
