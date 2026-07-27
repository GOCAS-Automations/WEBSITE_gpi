"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Cog,
  Photo,
  Handshake,
  Info,
  Shield,
  Sliders,
  LogOut,
  ArrowRight,
} from "@/lib/icons";

interface AdminSection {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  /** true = solo activo con coincidencia exacta de ruta. */
  exact?: boolean;
}

/** Secciones del panel — se usan tanto en el sidebar como en las tabs móviles. */
export const adminSections: AdminSection[] = [
  { href: "/admin", label: "Dashboard", icon: Sliders, exact: true },
  { href: "/admin/servicios", label: "Servicios", icon: Cog },
  { href: "/admin/proyectos", label: "Proyectos", icon: Photo },
  { href: "/admin/clientes", label: "Clientes", icon: Handshake },
  { href: "/admin/faq", label: "FAQ", icon: Info },
  { href: "/admin/valores", label: "Valores", icon: Shield },
  { href: "/admin/ajustes", label: "Contacto y ajustes", icon: Sliders },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Estructura del panel: sidebar persistente en escritorio, tabs desplazables en
 * móvil, y acciones siempre visibles ("Ver sitio" y "Cerrar sesión").
 */
export function AdminShell({
  email,
  signOut,
  children,
}: {
  email: string;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const isActive = useIsActive();

  return (
    <div className="bg-mist">
      {/* Barra superior del panel */}
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">
              Panel de administración
            </p>
            <p className="truncate text-sm text-graphite">
              Sesión iniciada como <span className="font-semibold text-ink">{email}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              Ver sitio
              <ArrowRight className="h-4 w-4" />
            </a>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        {/* Tabs móviles */}
        <nav
          aria-label="Secciones del panel (móvil)"
          className="border-t border-line lg:hidden"
        >
          <ul className="flex gap-1 overflow-x-auto px-4 py-2">
            {adminSections.map((section) => {
              const active = isActive(section.href, section.exact);
              const Icon = section.icon;
              return (
                <li key={section.href} className="shrink-0">
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-brand text-white shadow-soft"
                        : "text-ink-soft hover:bg-mist"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-8 sm:px-6 lg:px-8">
        {/* Sidebar escritorio */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav aria-label="Secciones del panel" className="sticky top-28">
            <ul className="space-y-1">
              {adminSections.map((section) => {
                const active = isActive(section.href, section.exact);
                const Icon = section.icon;
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-white text-brand-dark shadow-soft"
                          : "text-ink-soft hover:bg-white/70"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-brand" : "text-graphite"}`}
                      />
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 rounded-2xl border border-line bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">
                Recuerda
              </p>
              <p className="mt-2 text-xs leading-relaxed text-graphite">
                Los cambios se publican en el sitio inmediatamente después de
                guardar.
              </p>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
