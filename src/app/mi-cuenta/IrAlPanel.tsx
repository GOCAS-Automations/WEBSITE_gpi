"use client";

/**
 * «Mi Cuenta» lleva al PANEL a quien administra el sitio
 * ======================================================
 * GPI reportó lo obvio: un administrador pulsa «Mi Cuenta» en el menú y aterriza
 * en el formulario de jornadas, cuando lo que va a hacer nueve de cada diez
 * veces es entrar al panel.
 *
 * POR QUÉ EL REDIRECT ES DE CLIENTE Y NO DE SERVIDOR
 * -------------------------------------------------
 * Es la misma razón por la que el aterrizaje tras el ingreso lo decide
 * `LoginForm`: `src/proxy.ts` manda `/admin` → `/mi-cuenta` cuando no ve sesión.
 * Un `redirect("/admin")` desde el servidor de `/mi-cuenta` cerraría el círculo
 * —bastaría una cookie a medio refrescar para dejar al usuario rebotando entre
 * las dos rutas— y además obligaría a `/mi-cuenta` a decidir por rol antes de
 * poder servir el portal, que tiene que seguir estando disponible para TODOS.
 *
 * Aquí no hay bucle posible: esta pantalla solo se pinta cuando el servidor ya
 * confirmó sesión activa con rol de contenido, y el camino de vuelta al portal
 * (`/mi-cuenta?portal=1`) no vuelve a pasar por este componente.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ArrowRight, ClockPlus } from "@/lib/icons";

export function IrAlPanel({ nombre }: { nombre: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <section className="bg-mist py-16 sm:py-24">
      <Container size="narrow">
        <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-line bg-white text-center shadow-card">
          <div className="relative isolate overflow-hidden bg-ink px-8 py-9">
            <div className="bg-dot-grid absolute inset-0 opacity-30" aria-hidden="true" />
            <Image
              src="/images/logo2.png"
              alt="GPI"
              width={137}
              height={69}
              className="relative mx-auto h-12 w-auto"
            />
          </div>

          <div className="p-7 sm:p-8">
            {/* `role="status"` para que el lector de pantalla anuncie el cambio
                de pantalla en vez de dejar al usuario en silencio. */}
            <p role="status" className="text-lg font-bold text-ink">
              Abriendo tu panel, {nombre}…
            </p>
            <p className="mt-2 text-sm leading-relaxed text-graphite">
              Tienes permisos para administrar el sitio, así que te llevamos
              directo al panel. Si no se abre solo, pulsa el botón.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-dark px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                Ir al panel
                <ArrowRight className="h-4 w-4" />
              </Link>
              {/* El portal de jornadas sigue estando: este es su enlace
                  directo, el mismo que usa «Registrar mi jornada». */}
              <Link
                href="/mi-cuenta?portal=1"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
              >
                <ClockPlus className="h-4 w-4" />
                Registrar mi jornada
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
