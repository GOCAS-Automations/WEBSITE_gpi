"use client";

/**
 * «REGLAS DE CÁLCULO» — el botón de información de /admin/nomina
 * ==============================================================
 * Pedido explícito de GPI (23 sep 2026): un botón visible que abra una ventana
 * con TODAS las reglas con que se calcula la nómina, explicadas para una
 * persona que no es técnica, con la norma citada en lenguaje llano.
 *
 * El texto NO vive aquí: vive en `REGLAS_NOMINA` de
 * `src/components/admin/ayudas.ts`, que es el módulo puro de textos del panel.
 * Si mañana cambia una regla del cálculo se cambia allí, en un solo sitio, y
 * esta ventana queda al día sola.
 *
 * Detalles:
 *  · la ventana es `ModalPanel` (la misma del calendario): Escape cierra, el
 *    foco queda atrapado dentro y vuelve al botón al cerrar;
 *  · las piezas de interfaz vienen de `ui-base`, nunca de `ui.tsx` (ver la nota
 *    de `ui-base.tsx`), y los textos de `ayudas.ts`, nunca de `ui.tsx`;
 *  · se monta en la página, junto a las pestañas, así que se ve desde
 *    Liquidación, Configuración y Tablero.
 */

import { useState } from "react";
import { ModalPanel } from "@/components/calendario/ModalPanel";
import { REGLAS_NOMINA, REGLAS_NOMINA_INTRO } from "@/components/admin/ayudas";
import { Info } from "@/lib/icons";

export function ReglasCalculo() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-tint px-4 py-2 text-sm font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-brand/15"
      >
        <Info className="h-4 w-4" />
        Reglas de cálculo
      </button>

      {abierto && (
        <ModalPanel
          titulo="Reglas de cálculo de la nómina"
          descripcion={REGLAS_NOMINA_INTRO}
          onClose={() => setAbierto(false)}
          ancho="max-w-3xl"
        >
          <div className="space-y-6">
            {REGLAS_NOMINA.map((regla, i) => (
              <section key={regla.titulo}>
                <h3 className="flex items-start gap-2.5 text-base font-extrabold leading-snug text-ink">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-bold text-brand-deep"
                  >
                    {i + 1}
                  </span>
                  {regla.titulo}
                </h3>
                <ul className="mt-2 space-y-2 pl-[2.125rem]">
                  {regla.puntos.map((punto) => (
                    <li
                      key={punto}
                      className="relative pl-4 text-sm leading-relaxed text-ink-soft before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand/50"
                    >
                      {punto}
                    </li>
                  ))}
                </ul>
                {regla.norma && (
                  <p className="ml-[2.125rem] mt-2 rounded-xl bg-mist/70 px-3.5 py-2 text-xs leading-relaxed text-graphite">
                    <span className="font-semibold text-ink-soft">Norma: </span>
                    {regla.norma}
                  </p>
                )}
              </section>
            ))}

            <p className="rounded-xl border border-line bg-mist/60 px-4 py-3 text-xs leading-relaxed text-graphite">
              Si alguna de estas reglas cambia —porque cambie la ley o porque GPI
              decida otra cosa—, se ajusta en el sistema y esta ventana lo
              refleja: es el único sitio donde están escritas.
            </p>
          </div>
        </ModalPanel>
      )}
    </>
  );
}
