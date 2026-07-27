"use client";

import { useEffect, useState } from "react";
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

export function Header({ services }: { services: Service[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServices, setMobileServices] = useState(false);

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const byCategory = (id: Service["category"]) =>
    services.filter((s) => s.category === id);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-[0_4px_20px_-12px_rgba(21,24,27,0.35)]" : ""
      } border-b border-line`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8 lg:h-24">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="GPI — Inicio">
          <Image
            src="/images/logo.png"
            alt="GPI — Optimización de Procesos Industriales y Ambientales"
            width={3300}
            height={1875}
            priority
            className="h-11 w-auto sm:h-12 lg:h-16"
          />
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {mainNav.map((item) =>
            item.hasDropdown ? (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive(item.href)
                      ? "text-brand-dark"
                      : "text-ink-soft hover:text-brand-dark"
                  }`}
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                </Link>
                <MegaMenu services={services} />
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  isActive(item.href)
                    ? "text-brand-dark"
                    : "text-ink-soft hover:text-brand-dark"
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Acceso discreto al portal */}
          <Link
            href="/mi-cuenta"
            className={`hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors lg:inline-flex ${
              isActive("/mi-cuenta") || isActive("/admin")
                ? "text-brand-dark"
                : "text-graphite hover:text-brand-dark"
            }`}
          >
            <User className="h-4 w-4" />
            Mi Cuenta
          </Link>

          <Link
            href="/contacto"
            className="hidden rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-card lg:inline-flex"
          >
            Contáctanos
          </Link>

          {/* Botón menú móvil */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-mist lg:hidden"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <Close className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="lg:hidden">
          <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-line bg-white px-5 pb-8 pt-2">
            <nav className="flex flex-col" aria-label="Móvil">
              {mainNav.map((item) =>
                item.hasDropdown ? (
                  <div key={item.href} className="border-b border-line/70">
                    <div className="flex items-center justify-between">
                      <Link
                        href={item.href}
                        onClick={closeMobile}
                        className="flex-1 py-3.5 text-base font-semibold text-ink"
                      >
                        {item.label}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setMobileServices((v) => !v)}
                        aria-label="Mostrar servicios"
                        aria-expanded={mobileServices}
                        className="p-2 text-graphite"
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            mobileServices ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                    {mobileServices && (
                      <div className="pb-3">
                        {serviceCategories.map((cat) => (
                          <div key={cat.id} className="mb-2">
                            <p className="px-1 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark">
                              {cat.name}
                            </p>
                            {byCategory(cat.id).map((svc) => (
                              <Link
                                key={svc.slug}
                                href={`/servicios/${svc.slug}`}
                                onClick={closeMobile}
                                className="block rounded-lg px-1 py-2 text-sm text-graphite hover:text-brand-dark"
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
                    className="border-b border-line/70 py-3.5 text-base font-semibold text-ink"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <Link
                href="/mi-cuenta"
                onClick={closeMobile}
                className="flex items-center gap-2 border-b border-line/70 py-3.5 text-base font-semibold text-graphite"
              >
                <User className="h-5 w-5" />
                Mi Cuenta
              </Link>
            </nav>
            <Link
              href="/contacto"
              onClick={closeMobile}
              className="mt-5 flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-soft"
            >
              Contáctanos
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/** Mega-menú de servicios (escritorio) */
function MegaMenu({ services }: { services: Service[] }) {
  return (
    <div className="invisible absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
        <div className="grid grid-cols-2 gap-1 p-3">
          {serviceCategories.map((cat) => {
            const CatIcon = iconMap[cat.icon];
            return (
              <div key={cat.id} className="p-2">
                <div className="mb-1 flex items-center gap-2 px-2">
                  <CatIcon className="h-4 w-4 text-brand" />
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-dark">
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
          className="flex items-center justify-between border-t border-line bg-mist px-5 py-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-tint"
        >
          Ver todos los servicios
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
