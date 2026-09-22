"use client";

/**
 * PESTAÑAS DE /admin/nomina — Liquidación · Configuración · Tablero
 * ================================================================
 * Las tres pestañas son la MISMA página con otro `?vista=`. Las rutas del panel
 * son dinámicas y los enlaces van con `prefetch={false}` (arreglo de «el panel
 * se traba»), así que entre el clic y la respuesta
 * del servidor hay un viaje de ida y vuelta. Para que el clic SIEMPRE se note
 * al instante:
 *   · la pestaña pulsada se marca como activa EN EL MISMO CLIC (estado
 *     optimista), sin esperar al servidor;
 *   · el punto de carga (`PuntoDeCarga`, `useLinkStatus`) gira en ella mientras
 *     la navegación está pendiente;
 *   · y en cuanto llega la respuesta, la página enseña el esqueleto de la
 *     pestaña (el `<Suspense>` con `key` de `page.tsx`) hasta que llegan sus
 *     datos.
 * `aria-current` sigue la URL real (lo que de verdad se está viendo); el
 * resaltado visual, la intención del clic.
 */

import Link from "next/link";
import { useState } from "react";
import { PuntoDeCarga } from "@/components/admin/PuntoDeCarga";
import { BarChart, ClipboardList, Sliders } from "@/lib/icons";

export type VistaNomina = "liquidacion" | "configuracion" | "tablero";

const PESTANAS: {
  value: VistaNomina;
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactNode;
}[] = [
  { value: "liquidacion", label: "Liquidación", href: "/admin/nomina", icon: ClipboardList },
  {
    value: "configuracion",
    label: "Configuración",
    href: "/admin/nomina?vista=configuracion",
    icon: Sliders,
  },
  { value: "tablero", label: "Tablero", href: "/admin/nomina?vista=tablero", icon: BarChart },
];

export function PestanasNomina({ vista }: { vista: VistaNomina }) {
  // A qué pestaña se hizo clic y desde cuál. Cuando la URL cambia (`vista`
  // nueva), el clic ya se cumplió y se olvida: así el botón «atrás» del
  // navegador no puede dejar marcada una pestaña que no es.
  const [destino, setDestino] = useState<{ desde: VistaNomina; hacia: VistaNomina } | null>(
    null,
  );
  const [vistaPrevia, setVistaPrevia] = useState(vista);
  if (vistaPrevia !== vista) {
    setVistaPrevia(vista);
    setDestino(null);
  }
  const activa = destino && destino.desde === vista ? destino.hacia : vista;

  return (
    <nav aria-label="Vistas de nómina" className="mb-6">
      {/* En móvil ocupa todo el ancho y aprieta el relleno: a 390 px las tres
          pestañas con su relleno de escritorio se salían de la pantalla. */}
      <ul className="flex w-full justify-between gap-1 rounded-full border border-line bg-white p-1 shadow-soft sm:inline-flex sm:w-auto sm:justify-start">
        {PESTANAS.map((p) => {
          const marcada = p.value === activa;
          const Icon = p.icon;
          return (
            <li key={p.value}>
              <Link
                prefetch={false}
                href={p.href}
                onClick={() => setDestino({ desde: vista, hacia: p.value })}
                aria-current={p.value === vista ? "page" : undefined}
                data-activa={marcada ? "true" : "false"}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm ${
                  marcada ? "bg-brand-dark text-white shadow-soft" : "text-ink-soft hover:bg-mist"
                }`}
              >
                <Icon className="h-4 w-4" />
                {p.label}
                <PuntoDeCarga className="-mr-1 hidden sm:inline-block" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
