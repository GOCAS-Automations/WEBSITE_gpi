"use client";

/**
 * VENTANA DEL CALENDARIO
 * ======================
 * El panel flotante que usa el calendario para el detalle de un evento y para
 * el formulario. Es la única pieza del panel GPI que se abre "encima": el resto
 * de pantallas son formularios en línea, pero aquí el contenido se abre desde
 * una cuadrícula que puede ocupar toda la pantalla, y bajar a leer el detalle a
 * pie de página haría perder el sitio en el que se hizo clic.
 *
 * Accesibilidad, que es lo que suele faltarle a un modal hecho a mano:
 *  · `role="dialog"` + `aria-modal` + `aria-labelledby` apuntando al título;
 *  · Escape cierra y el foco vuelve a donde estaba (WCAG 2.1.2);
 *  · el foco entra al panel al abrirse y queda ATRAPADO dentro mientras está
 *    abierto (Tab y Shift+Tab dan la vuelta), que es lo que evita que alguien
 *    con teclado se salga a la página de atrás sin darse cuenta;
 *  · el fondo deja de desplazarse mientras está abierto.
 *
 * En móvil se ancla abajo (hoja) y en escritorio queda centrado.
 */

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Close } from "@/lib/icons";

/** Elementos que pueden recibir el foco dentro del panel. */
const FOCUSABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModalPanel({
  titulo,
  descripcion,
  onClose,
  children,
  ancho = "max-w-2xl",
}: {
  /** Texto del encabezado; también es el nombre accesible del diálogo. */
  titulo: string;
  descripcion?: string;
  onClose: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // `useId` y no un aleatorio: el id tiene que ser el mismo en el servidor y en
  // el cliente, o React avisa de una hidratación que no coincide.
  const tituloId = useId();

  const cerrar = onClose;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // El foco entra al panel; si no hay nada enfocable, al panel mismo.
    const primero = panel.current?.querySelector<HTMLElement>(FOCUSABLES);
    (primero ?? panel.current)?.focus();

    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        cerrar();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;

      const focusables = Array.from(
        panel.current.querySelectorAll<HTMLElement>(FOCUSABLES),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;

      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("keydown", tecla, true);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [cerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Fondo: al pulsarlo se cierra. Es decorativo, la salida accesible es
          Escape y el botón «Cerrar». */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={cerrar}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-white shadow-card outline-none sm:max-h-[88vh] sm:rounded-3xl ${ancho}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-mist/60 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id={tituloId}
              className="text-lg font-extrabold leading-snug text-ink"
            >
              {titulo}
            </h2>
            {descripcion && (
              <p className="mt-1 text-sm leading-relaxed text-graphite">
                {descripcion}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-graphite transition-colors hover:border-brand hover:text-brand-dark"
            aria-label="Cerrar"
          >
            <Close className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
