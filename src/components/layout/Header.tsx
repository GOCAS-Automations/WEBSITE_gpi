"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { serviceCategories, type Service } from "@/data/services";
import { iconMap } from "@/lib/icons";
import { ArrowRight, ChevronDown, Menu, Close, User } from "@/lib/icons";

const mainNav = [
  { label: "Inicio", href: "/" },
  { label: "Nosotros", href: "/nosotros" },
  { label: "Servicios", href: "/servicios", hasDropdown: true },
  { label: "Proyectos", href: "/proyectos" },
  { label: "Contacto", href: "/contacto" },
];

/**
 * Barra de navegación: píldora blanca flotante (prototipo del 12 ago 2026).
 *
 * La envoltura `.nav-shell` es transparente y solo ocupa el alto de la píldora
 * (ver `--nav-h` en globals.css); los heroes se suben por debajo con
 * `.under-nav`, así la barra "flota" sobre la foto oscura y, en las páginas de
 * fondo blanco, se distingue por la sombra y el borde.
 */
export function Header({ services }: { services: Service[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServices, setMobileServices] = useState(false);
  /** Mega-menú de escritorio: abierto por ratón (hover) o por teclado (foco). */
  const [servicesOpen, setServicesOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileServices(false);
  };

  // Bloquea el scroll del body con el menú móvil abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /**
   * Accesibilidad por teclado (WCAG 2.1.1 / 2.1.2):
   * Escape cierra el mega-menú y el menú móvil. Al cerrar el menú móvil el foco
   * vuelve al botón que lo abrió, para no perder el sitio en la página.
   */
  useEffect(() => {
    if (!mobileOpen && !servicesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (servicesOpen) {
        setServicesOpen(false);
        (document.activeElement as HTMLElement | null)?.blur();
      }
      if (mobileOpen) {
        closeMobile();
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, servicesOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  /** `aria-current="page"` para que el lector de pantalla anuncie dónde estamos. */
  const ariaCurrent = (href: string) =>
    isActive(href) ? ("page" as const) : undefined;

  /**
   * El enlace activo es una píldora verde con texto blanco, como en el mockup.
   * `brand-dark` de fondo da 4.74:1 con el blanco: cumple AA para texto normal.
   */
  const linkClasses = (href: string) =>
    `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
      isActive(href)
        ? "bg-brand-dark text-white"
        : "text-ink-soft hover:bg-brand-tint hover:text-brand-deep"
    }`;

  const byCategory = (id: Service["category"]) =>
    services.filter((s) => s.category === id);

  return (
    <header className="nav-shell pointer-events-none sticky top-0 z-50 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-auto relative mx-auto max-w-6xl">
        <div
          className={`nav-pill flex items-center justify-between gap-2 rounded-full border border-line/80 bg-white/95 pl-4 pr-2 backdrop-blur-md transition-shadow duration-300 sm:pl-5 sm:pr-3 ${
            scrolled ? "shadow-card" : "shadow-soft"
          }`}
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label="GPI — Inicio"
          >
            {/*
              RENDIMIENTO: el archivo original es de 3300×1875 px (685 KB). Sin
              `sizes`, el navegador asume `100vw` y descarga el candidato del
              srcset para el ancho completo de la pantalla… para pintar un logo
              de ~99 px. `sizes` le dice el tamaño real de maquetación (alto ×
              1.76 de relación de aspecto) y `width`/`height` solo fijan esa
              relación, así que baja el candidato pequeño.
            */}
            <Image
              src="/images/logo.png"
              alt="GPI — Optimización de Procesos Industriales y Ambientales"
              width={352}
              height={200}
              sizes="(min-width: 1024px) 99px, (min-width: 640px) 78px, 71px"
              priority
              className="h-10 w-auto sm:h-11 lg:h-14"
            />
          </Link>

          {/* Navegación de escritorio */}
          <nav
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            aria-label="Principal"
          >
            {mainNav.map((item) =>
              item.hasDropdown ? (
                /**
                 * Disclosure híbrido: se abre con el ratón (onMouseEnter) y con
                 * el teclado (onFocus, porque `focus` burbujea como `focusin` en
                 * React). `aria-expanded`/`aria-controls` describen el estado
                 * real.
                 */
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                  onFocus={() => setServicesOpen(true)}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                      setServicesOpen(false);
                    }
                  }}
                >
                  <Link
                    href={item.href}
                    aria-current={ariaCurrent(item.href)}
                    aria-expanded={servicesOpen}
                    aria-controls="mega-menu-servicios"
                    className={`flex items-center gap-1 ${linkClasses(item.href)}`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        servicesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Link>
                  <MegaMenu services={services} open={servicesOpen} />
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ariaCurrent(item.href)}
                  className={linkClasses(item.href)}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Acceso discreto al portal */}
            <Link
              href="/mi-cuenta"
              aria-current={
                isActive("/mi-cuenta") || isActive("/admin") ? "page" : undefined
              }
              className={`hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors lg:inline-flex ${
                isActive("/mi-cuenta") || isActive("/admin")
                  ? "text-brand-deep"
                  : "text-graphite hover:text-brand-deep"
              }`}
            >
              <User className="h-4 w-4" />
              Mi Cuenta
            </Link>

            <Link
              href="/contacto"
              className="hidden rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-card lg:inline-flex"
            >
              Contáctanos
            </Link>

            {/* Botón menú móvil */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-mist lg:hidden"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              aria-controls="menu-movil"
            >
              {mobileOpen ? <Close className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menú móvil: se despliega DESDE la píldora, con el mismo lenguaje
            redondeado. Sale del flujo para que el hero no se mueva al abrirlo. */}
        {mobileOpen && (
          <div
            id="menu-movil"
            className="absolute inset-x-0 top-full z-50 mt-2 lg:hidden"
          >
            <div className="max-h-[calc(100dvh-var(--nav-h)-1.5rem)] overflow-y-auto rounded-3xl border border-line bg-white px-5 pb-6 pt-2 shadow-card">
              <nav className="flex flex-col" aria-label="Móvil">
                {mainNav.map((item) =>
                  item.hasDropdown ? (
                    <div key={item.href} className="border-b border-line/70">
                      <div className="flex items-center justify-between">
                        <Link
                          href={item.href}
                          onClick={closeMobile}
                          aria-current={ariaCurrent(item.href)}
                          className={`flex-1 py-3.5 text-base font-semibold ${
                            isActive(item.href) ? "text-brand-deep" : "text-ink"
                          }`}
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setMobileServices((v) => !v)}
                          aria-label={
                            mobileServices
                              ? "Ocultar lista de servicios"
                              : "Mostrar lista de servicios"
                          }
                          aria-expanded={mobileServices}
                          aria-controls="menu-movil-servicios"
                          className="rounded-full p-2 text-graphite"
                        >
                          <ChevronDown
                            className={`h-5 w-5 transition-transform ${
                              mobileServices ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                      {mobileServices && (
                        <div id="menu-movil-servicios" className="pb-3">
                          {serviceCategories.map((cat) => (
                            <div key={cat.id} className="mb-2">
                              <p className="px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-deep">
                                {cat.name}
                              </p>
                              {byCategory(cat.id).map((svc) => (
                                <Link
                                  key={svc.slug}
                                  href={`/servicios/${svc.slug}`}
                                  onClick={closeMobile}
                                  className="block rounded-xl px-2 py-2 text-sm text-graphite transition-colors hover:bg-mist hover:text-brand-deep"
                                >
                                  {svc.navTitle}
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      aria-current={ariaCurrent(item.href)}
                      className={`border-b border-line/70 py-3.5 text-base font-semibold ${
                        isActive(item.href) ? "text-brand-deep" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ),
                )}
                <Link
                  href="/mi-cuenta"
                  onClick={closeMobile}
                  aria-current={
                    isActive("/mi-cuenta") || isActive("/admin") ? "page" : undefined
                  }
                  className="flex items-center gap-2 border-b border-line/70 py-3.5 text-base font-semibold text-graphite"
                >
                  <User className="h-5 w-5" />
                  Mi Cuenta
                </Link>
              </nav>
              <Link
                href="/contacto"
                onClick={closeMobile}
                className="mt-5 flex items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 text-base font-semibold text-white shadow-soft"
              >
                Contáctanos
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Mega-menú de servicios (escritorio).
 * La visibilidad la controla el estado del Header (ratón o teclado), no `:hover`
 * de CSS, para que `aria-expanded` y lo que se ve digan siempre lo mismo.
 */
function MegaMenu({ services, open }: { services: Service[]; open: boolean }) {
  return (
    <div
      id="mega-menu-servicios"
      aria-label="Servicios de GPI"
      className={`absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-4 transition-all duration-200 ${
        open ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
        <div className="grid grid-cols-2 gap-1 p-3">
          {serviceCategories.map((cat) => {
            const CatIcon = iconMap[cat.icon];
            return (
              <div key={cat.id} className="p-2">
                <div className="mb-1 flex items-center gap-2 px-2">
                  <CatIcon className="h-4 w-4 text-brand-dark" />
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                    {cat.name}
                  </span>
                </div>
                <ul>
                  {services
                    .filter((s) => s.category === cat.id)
                    .map((svc) => {
                      const Icon = iconMap[svc.icon];
                      return (
                        <li key={svc.slug}>
                          <Link
                            href={`/servicios/${svc.slug}`}
                            className="flex items-start gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-mist"
                          >
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-graphite" />
                            <span className="text-sm font-medium leading-snug text-ink-soft">
                              {svc.navTitle}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            );
          })}
        </div>
        <Link
          href="/servicios"
          className="flex items-center justify-between border-t border-line bg-mist px-5 py-3 text-sm font-semibold text-brand-deep transition-colors hover:bg-brand-tint"
        >
          Ver todos los servicios
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
