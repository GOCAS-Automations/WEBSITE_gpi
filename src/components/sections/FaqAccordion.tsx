"use client";

import { useState } from "react";
import type { FaqItem } from "@/data/faq";
import { ChevronDown } from "@/lib/icons";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      {items.map((item, i) => {
        const isOpen = open === i;
        const botonId = `faq-boton-${i}`;
        const panelId = `faq-panel-${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={botonId}
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-mist"
              >
                <span className="text-base font-semibold text-ink sm:text-lg">
                  {item.question}
                </span>
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-brand-dark transition-transform duration-300 ${
                    isOpen ? "rotate-180 bg-brand-tint" : ""
                  }`}
                >
                  <ChevronDown className="h-5 w-5" />
                </span>
              </button>
            </h3>
            {/* El panel se colapsa con `grid-rows-[0fr]` para poder animarlo, así
                que sigue en el DOM aunque no se vea. `aria-hidden` lo saca del
                árbol de accesibilidad cuando está cerrado: si no, el lector de
                pantalla leería las 5 respuestas seguidas contradiciendo al
                `aria-expanded="false"` del botón. No contiene nada enfocable,
                por lo que ocultarlo no atrapa el foco. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={botonId}
              aria-hidden={!isOpen}
              className={`grid transition-all duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-5 text-sm leading-relaxed text-graphite sm:text-base">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
