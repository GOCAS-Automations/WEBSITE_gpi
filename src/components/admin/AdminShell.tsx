"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PuntoDeCarga } from "./PuntoDeCarga";
import { isManagerRole, ROLE_LABELS, type UserRole } from "@/lib/roles";
import {
  Gauge,
  Sliders,
  LogOut,
  ArrowRight,
  Layers,
  User,
  Clock,
  ClockPlus,
  Calendar,
} from "@/lib/icons";
import { RUTAS_CONTENIDO } from "@/lib/admin-types";

interface AdminSection {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  /** true = solo activo con coincidencia exacta de ruta. */
  exact?: boolean;
  /** true = solo para managers (admin | coordinador). */
  managerOnly?: boolean;
  /**
   * Rutas adicionales que dejan esta entrada marcada como activa. Es lo que
   * hace que estar en `/admin/servicios` ilumine «Contenido del sitio»: las
   * URLs de cada sección NO cambiaron, solo se agruparon en el menú.
   */
  matches?: readonly string[];
}

/**
 * MENÚ DEL PANEL — seis entradas
 * ==============================
 * Se usan tanto en el sidebar de escritorio como en las tabs móviles.
 *
 * El menú tenía doce entradas y ocho de ellas eran contenido del sitio: la
 * lista se leía como un inventario, no como un menú. Ahora esas ocho viven
 * detrás de **Contenido del sitio** (`/admin/contenido`), que es un índice con
 * tarjetas. **Ninguna URL cambió**: los enlaces guardados, los marcadores del
 * navegador y los formularios siguen funcionando igual.
 *
 * Las marcadas `managerOnly` se ocultan al Community Manager; además cada
 * página vuelve a comprobar el rol en el servidor (`requireManager`), que es la
 * barrera real.
 */
export const adminSections: AdminSection[] = [
  // `Gauge` para el Dashboard y `Sliders` para Ajustes: con seis entradas, dos
  // iconos iguales convierten el menú en una adivinanza.
  { href: "/admin", label: "Dashboard", icon: Gauge, exact: true },
  {
    href: "/admin/contenido",
    label: "Contenido del sitio",
    icon: Layers,
    matches: RUTAS_CONTENIDO,
  },
  { href: "/admin/empleados", label: "Equipo", icon: User, managerOnly: true },
  { href: "/admin/horarios", label: "Horarios", icon: Calendar, managerOnly: true },
  { href: "/admin/jornadas", label: "Jornadas", icon: Clock, managerOnly: true },
  { href: "/admin/ajustes", label: "Ajustes", icon: Sliders },
];

/** Secciones visibles para un rol concreto. */
export function sectionsForRole(role: UserRole): AdminSection[] {
  const manager = isManagerRole(role);
  return adminSections.filter((s) => !s.managerOnly || manager);
}

function useIsActive() {
  const pathname = usePathname();
  const dentroDe = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (section: AdminSection) => {
    if (section.exact) return pathname === section.href;
    if (dentroDe(section.href)) return true;
    return (section.matches ?? []).some(dentroDe);
  };
}

/**
 * Estructura del panel: sidebar persistente en escritorio, tabs desplazables en
 * móvil, y acciones siempre visibles ("Registrar mi jornada", "Ver sitio" y
 * "Cerrar sesión").
 *
 * "Registrar mi jornada" lleva a `/mi-cuenta?portal=1`: el panel es la pantalla
 * principal de quien administra, y `/mi-cuenta` a secas ahora rebota al panel
 * (ver `IrAlPanel`). El parámetro es lo que pide explícitamente el portal de
 * horas, así que este es el único camino que no da la vuelta.
 *
 * `prefetch={false}` EN TODA LA NAVEGACIÓN DEL PANEL
 * --------------------------------------------------
 * Todas las rutas de `/admin` son `force-dynamic` y pasan por `src/proxy.ts`,
 * que refresca la sesión de Supabase. Con el prefetch por defecto, tener el
 * menú en pantalla dispara media docena de peticiones simultáneas a `/admin/*`,
 * cada una con su llamada a Supabase y todas compitiendo por canjear el mismo
 * refresh token. Sin prefetch, cada navegación es una sola petición, en serie.
 *
 * Es la pata que hace falta para que `PuntoDeCarga` funcione: `useLinkStatus`
 * no tiene estado pendiente que mostrar si la ruta ya venía precargada. El
 * arreglo completo del «se traba» que reportó GPI son tres piezas —esta,
 * `PuntoDeCarga` y `app/admin/loading.tsx`, donde está el diagnóstico—.
 */
export function AdminShell({
  identificador,
  role,
  signOut,
  children,
}: {
  /** Usuario del portal (o el correo, en las cuentas antiguas). */
  identificador: string;
  role: UserRole;
  signOut: () => Promise<void>;
  children: ReactNode;
}) {
  const isActive = useIsActive();
  const secciones = sectionsForRole(role);

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
              Sesión iniciada como{" "}
              <span className="font-semibold text-ink">{identificador}</span>{" "}
              <span className="whitespace-nowrap rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-graphite">
                {ROLE_LABELS[role]}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quien entra al panel también es empleado de GPI: este es su
                camino de vuelta al portal para registrar sus propias horas. */}
            <Link
              href="/mi-cuenta?portal=1"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand-tint px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15"
            >
              <ClockPlus className="h-4 w-4" />
              Registrar mi jornada
            </Link>
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
            {secciones.map((section) => {
              const active = isActive(section);
              const Icon = section.icon;
              return (
                <li key={section.href} className="shrink-0">
                  <Link
                    href={section.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-brand-dark text-white shadow-soft"
                        : "text-ink-soft hover:bg-mist"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                    <PuntoDeCarga className="ml-0.5" />
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
              {secciones.map((section) => {
                const active = isActive(section);
                const Icon = section.icon;
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-white text-brand-dark shadow-soft"
                          : "text-ink-soft hover:bg-white/70"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${active ? "text-brand-dark" : "text-graphite"}`}
                      />
                      {section.label}
                      <PuntoDeCarga className="ml-auto" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* El recordatorio de guardar ya NO vive aquí: quedaba al pie de
                una columna lateral, fuera de la vista de quien está editando.
                Ahora es el primer bloque de cada pantalla de contenido
                (`AvisoGuardar`, en components/admin/ui.tsx). */}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
