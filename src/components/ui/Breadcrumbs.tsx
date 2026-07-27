import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /** "light" para fondos oscuros (hero), "dark" para fondos claros. */
  tone?: "light" | "dark";
  className?: string;
}

/**
 * Ruta de navegación reutilizable ("Inicio › Servicios › [Servicio]").
 * El último ítem nunca es clickeable, sin importar si trae `href`.
 */
export function Breadcrumbs({ items, tone = "light", className = "" }: BreadcrumbsProps) {
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

  return (
    <nav aria-label="Breadcrumb" className={className}>
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
