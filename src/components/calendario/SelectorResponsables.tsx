"use client";

/**
 * SELECCIÓN DE RESPONSABLES DE UN EVENTO
 * ======================================
 * Dos cosas en un solo campo:
 *
 *   1. Las CUENTAS del portal: lista con casillas y buscador por nombre, porque
 *      GPI puede llegar a tener treinta cuentas y un `<select multiple>` nativo
 *      —además de ser inmanejable con el dedo en un móvil— borra la selección
 *      entera al hacer un clic sin Ctrl.
 *   2. Los EXTERNOS: gente sin cuenta (el contacto del cliente, un contratista)
 *      cuyo nombre se escribe a mano. Se pueden agregar varios.
 *
 * Lo elegido se muestra como fichas encima, que es lo que se lee de un vistazo,
 * y viaja en el formulario como campos ocultos repetidos (`responsable_id` y
 * `responsable_externo`): así el `<form>` sigue siendo un formulario normal y la
 * server action los lee con `formData.getAll(...)`.
 *
 * Accesible sin trucos: la lista son botones `role="checkbox"` con
 * `aria-checked`, el panel se cierra con Escape devolviendo el foco al botón, y
 * cada ficha tiene su botón de quitar con nombre propio.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Close, Plus, Search, User, Users } from "@/lib/icons";
import { inputClass } from "@/components/admin/ui-base";
import { LIMITES_EVENTO } from "@/lib/calendario";
import { etiquetaCompleta } from "@/lib/usuarios";

export interface OpcionPerfil {
  id: string;
  nombre: string;
  /** Apodo de la cuenta (migración 0010): «YC». */
  apodo: string | null;
  cargo: string | null;
}

export function SelectorResponsables({
  perfiles,
  idsIniciales,
  externosIniciales,
}: {
  perfiles: OpcionPerfil[];
  idsIniciales: string[];
  externosIniciales: string[];
}) {
  const [ids, setIds] = useState<string[]>(idsIniciales);
  const [externos, setExternos] = useState<string[]>(externosIniciales);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [nuevoExterno, setNuevoExterno] = useState("");

  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function fuera(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node))
        setAbierto(false);
    }
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setAbierto(false);
        disparador.current?.focus();
      }
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierto]);

  const porId = useMemo(
    () => new Map(perfiles.map((p) => [p.id, p])),
    [perfiles],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return perfiles;
    return perfiles.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.cargo ?? "").toLowerCase().includes(q),
    );
  }, [perfiles, busqueda]);

  const total = ids.length + externos.length;
  const lleno = total >= LIMITES_EVENTO.responsables;

  function alternar(id: string) {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  function agregarExterno() {
    const nombre = nuevoExterno.trim().slice(0, LIMITES_EVENTO.nombreExterno);
    if (nombre === "") return;
    setExternos((prev) =>
      prev.some((n) => n.toLowerCase() === nombre.toLowerCase())
        ? prev
        : [...prev, nombre],
    );
    setNuevoExterno("");
  }

  return (
    <div ref={contenedor} className="relative">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        Responsables
      </span>

      {/* -------- Fichas de lo ya elegido -------- */}
      {total > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {ids.map((id) => {
            const perfil = porId.get(id);
            return (
              <li key={id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-tint py-1 pl-2.5 pr-1 text-xs font-semibold text-brand-deep">
                  <User className="h-3.5 w-3.5" />
                  {perfil ? etiquetaCompleta(perfil) : "Cuenta"}
                  <button
                    type="button"
                    onClick={() => setIds((prev) => prev.filter((v) => v !== id))}
                    aria-label={`Quitar a ${perfil?.nombre ?? "esta persona"}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-brand-deep/70 transition-colors hover:bg-brand/20 hover:text-brand-deep"
                  >
                    <Close className="h-3 w-3" />
                  </button>
                </span>
              </li>
            );
          })}
          {externos.map((nombre) => (
            <li key={`ext-${nombre}`}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-mist py-1 pl-2.5 pr-1 text-xs font-semibold text-graphite">
                {nombre}
                <span className="rounded-full bg-white px-1.5 py-px text-[10px] uppercase tracking-wide text-graphite">
                  Externo
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExternos((prev) => prev.filter((n) => n !== nombre))
                  }
                  aria-label={`Quitar a ${nombre}`}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-graphite/70 transition-colors hover:bg-line hover:text-ink"
                >
                  <Close className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-graphite">
          Todavía no has asignado a nadie. Un evento puede quedar sin
          responsables, pero entonces no le aparece a nadie en Mi Cuenta.
        </p>
      )}

      {/* -------- Botón que abre la lista -------- */}
      <button
        ref={disparador}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`${inputClass} flex items-center justify-between gap-2 text-left hover:border-brand/60`}
      >
        <span className="inline-flex items-center gap-2 text-ink-soft">
          <Users className="h-4 w-4 text-graphite" />
          {total === 0
            ? "Elegir responsables…"
            : `${total} responsable${total === 1 ? "" : "s"} · agregar o quitar`}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-graphite transition-transform ${
            abierto ? "rotate-180" : ""
          }`}
        />
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-2xl border border-line bg-white py-2 shadow-card">
          {/* Buscador */}
          <div className="relative border-b border-line px-3 pb-2">
            <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-graphite" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o cargo…"
              aria-label="Buscar una cuenta del equipo"
              className="w-full rounded-lg border border-line py-1.5 pl-7 pr-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>

          {/* Cuentas del portal */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtradas.length === 0 && (
              <p className="px-4 py-3 text-center text-xs text-graphite">
                Ninguna cuenta coincide con «{busqueda}».
              </p>
            )}
            {filtradas.map((p) => {
              const marcada = ids.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  role="checkbox"
                  aria-checked={marcada}
                  disabled={!marcada && lleno}
                  onClick={() => alternar(p.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-mist disabled:opacity-40"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      marcada
                        ? "border-brand-dark bg-brand-dark text-white"
                        : "border-line bg-white"
                    }`}
                  >
                    {marcada && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink-soft">
                      {etiquetaCompleta(p)}
                    </span>
                    {p.cargo && (
                      <span className="block truncate text-xs text-graphite">
                        {p.cargo}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Otro (externo) */}
          <div className="border-t border-line px-4 pb-1 pt-3">
            <label
              htmlFor="campo-responsable-externo"
              className="block text-xs font-bold uppercase tracking-wide text-graphite"
            >
              Otro (alguien sin cuenta en el portal)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="campo-responsable-externo"
                type="text"
                value={nuevoExterno}
                maxLength={LIMITES_EVENTO.nombreExterno}
                onChange={(e) => setNuevoExterno(e.target.value)}
                onKeyDown={(e) => {
                  // Enter agrega el nombre; sin esto enviaría el formulario
                  // entero, que es el error clásico de este tipo de campo.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarExterno();
                  }
                }}
                placeholder="Ej.: Ing. Marcela Ruiz (cliente)"
                className="min-w-0 flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
              />
              <button
                type="button"
                onClick={agregarExterno}
                disabled={lleno || nuevoExterno.trim() === ""}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-dark px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar
              </button>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-graphite">
              Queda registrado como responsable del evento, pero no recibe acceso
              al portal ni ve nada del sistema.
            </p>
          </div>

          <div className="mt-2 flex justify-end border-t border-line px-4 pt-2">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                disparador.current?.focus();
              }}
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {lleno && (
        <p className="mt-1.5 text-xs font-semibold text-amber-700">
          Llegaste al máximo de {LIMITES_EVENTO.responsables} responsables.
        </p>
      )}

      {/* Lo que viaja en el formulario */}
      {ids.map((id) => (
        <input key={`h-${id}`} type="hidden" name="responsable_id" value={id} />
      ))}
      {externos.map((nombre) => (
        <input
          key={`he-${nombre}`}
          type="hidden"
          name="responsable_externo"
          value={nombre}
        />
      ))}
    </div>
  );
}
