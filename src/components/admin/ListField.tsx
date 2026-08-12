"use client";

import { useState } from "react";
import { iconMap, Plus, Trash, type IconName } from "@/lib/icons";
import { inputClass } from "./ui";

let counter = 0;
const nextKey = () => {
  counter += 1;
  return `row-${counter}`;
};

/* ------------------------------------------------------------------ */
/* Lista de textos simples (ítems de un servicio)                      */
/* ------------------------------------------------------------------ */

export function ListField({
  label,
  name,
  defaultValues,
  placeholder,
  hint,
}: {
  label: string;
  name: string;
  defaultValues?: string[];
  placeholder?: string;
  hint?: string;
}) {
  const [rows, setRows] = useState(() =>
    (defaultValues && defaultValues.length > 0 ? defaultValues : [""]).map(
      (value) => ({ key: nextKey(), value }),
    ),
  );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-xs text-graphite">{rows.length} ítem(s)</span>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.key} className="flex items-start gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-right text-xs font-semibold text-graphite">
              {index + 1}.
            </span>
            <textarea
              name={name}
              rows={2}
              value={row.value}
              placeholder={placeholder}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) =>
                    r.key === row.key ? { ...r, value: e.target.value } : r,
                  ),
                )
              }
              className={`${inputClass} resize-y`}
            />
            <button
              type="button"
              aria-label={`Eliminar ítem ${index + 1}`}
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-graphite transition-colors hover:border-red-300 hover:text-red-600"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { key: nextKey(), value: "" }])}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
      >
        <Plus className="h-4 w-4" />
        Añadir ítem
      </button>

      {hint && <p className="mt-2 text-xs text-graphite">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lista de pares (teléfonos, correos, estadísticas)                   */
/* ------------------------------------------------------------------ */

export function PairListField({
  label,
  nameA,
  nameB,
  labelA,
  labelB,
  defaultValues,
  hint,
  addLabel = "Añadir",
}: {
  label: string;
  nameA: string;
  nameB: string;
  labelA: string;
  labelB: string;
  defaultValues?: { a: string; b: string }[];
  hint?: string;
  addLabel?: string;
}) {
  const [rows, setRows] = useState(() =>
    (defaultValues && defaultValues.length > 0
      ? defaultValues
      : [{ a: "", b: "" }]
    ).map((value) => ({ key: nextKey(), ...value })),
  );

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-start gap-2">
            <input
              name={nameA}
              value={row.a}
              placeholder={labelA}
              aria-label={labelA}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) => (r.key === row.key ? { ...r, a: e.target.value } : r)),
                )
              }
              className={inputClass}
            />
            <input
              name={nameB}
              value={row.b}
              placeholder={labelB}
              aria-label={labelB}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) => (r.key === row.key ? { ...r, b: e.target.value } : r)),
                )
              }
              className={inputClass}
            />
            <button
              type="button"
              aria-label="Eliminar fila"
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-graphite transition-colors hover:border-red-300 hover:text-red-600"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((prev) => [...prev, { key: nextKey(), a: "", b: "" }])
        }
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>

      {hint && <p className="mt-2 text-xs text-graphite">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Galería: lista de imágenes con URL + texto alternativo              */
/* ------------------------------------------------------------------ */

export function GalleryField({
  label,
  defaultValues,
  hint,
}: {
  label: string;
  defaultValues?: { src: string; alt: string }[];
  hint?: string;
}) {
  const [rows, setRows] = useState(() =>
    (defaultValues ?? []).map((value) => ({ key: nextKey(), ...value })),
  );

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-start gap-3 rounded-xl border border-line bg-mist/50 p-3"
          >
            <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
              {row.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.src} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-graphite">sin imagen</span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                name="gallery_src"
                value={row.src}
                placeholder="/images/... o https://..."
                aria-label="URL de la imagen"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.key === row.key ? { ...r, src: e.target.value } : r,
                    ),
                  )
                }
                className={inputClass}
              />
              <input
                name="gallery_alt"
                value={row.alt}
                placeholder="Texto alternativo (accesibilidad)"
                aria-label="Texto alternativo"
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.key === row.key ? { ...r, alt: e.target.value } : r,
                    ),
                  )
                }
                className={inputClass}
              />
            </div>
            <button
              type="button"
              aria-label="Eliminar imagen de la galería"
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-graphite transition-colors hover:border-red-300 hover:text-red-600"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((prev) => [...prev, { key: nextKey(), src: "", alt: "" }])
        }
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
      >
        <Plus className="h-4 w-4" />
        Añadir imagen a la galería
      </button>

      {hint && <p className="mt-2 text-xs text-graphite">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Línea de tiempo: tarjetas con fecha, título, texto e icono          */
/* ------------------------------------------------------------------ */

const NOMBRES_ICONO = Object.keys(iconMap) as IconName[];

export interface FilaLineaTiempo {
  /** Solo en los hitos (las etiquetas de debajo de la flecha no llevan fecha). */
  fecha?: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

/**
 * Lista editable de la línea de tiempo empresarial de la página Nosotros.
 *
 * Sirve para las dos filas del diseño con el mismo componente:
 *  - los HITOS de arriba (con fecha: «Abril de 2015 · Nuestros inicios»),
 *  - las ETIQUETAS de abajo (sin fecha: «Enfoque inicial»).
 *
 * Cada campo se envía como una lista paralela (`hito_fecha`, `hito_titulo`…) y
 * el servidor las vuelve a emparejar por posición con el helper `filas()`.
 * El icono se elige de la misma lista que usan valores y servicios, con la
 * vista previa al lado para no tener que adivinar qué dibuja cada nombre.
 */
export function LineaTiempoField({
  label,
  prefijo,
  conFecha = false,
  defaultValues,
  addLabel,
  hint,
  iconoPorDefecto,
}: {
  label: string;
  /** "hito" o "etiqueta": prefija los `name` de los campos. */
  prefijo: string;
  conFecha?: boolean;
  defaultValues?: FilaLineaTiempo[];
  addLabel: string;
  hint?: string;
  iconoPorDefecto: IconName;
}) {
  const [rows, setRows] = useState(() =>
    (defaultValues ?? []).map((value) => ({
      key: nextKey(),
      fecha: value.fecha ?? "",
      titulo: value.titulo,
      descripcion: value.descripcion,
      icono: value.icono,
    })),
  );

  const actualizar = (key: string, campo: string, valor: string) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [campo]: valor } : r)),
    );

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="text-xs text-graphite">{rows.length} en la línea</span>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const Icono = iconMap[(row.icono as IconName) in iconMap ? (row.icono as IconName) : iconoPorDefecto];
          return (
            <div
              key={row.key}
              className="rounded-xl border border-line bg-mist/50 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-graphite">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
                    <Icono className="h-4 w-4" />
                  </span>
                  Punto {index + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Eliminar el punto ${index + 1}`}
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-graphite transition-colors hover:border-red-300 hover:text-red-600"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {conFecha && (
                  <input
                    name={`${prefijo}_fecha`}
                    value={row.fecha}
                    placeholder="Fecha (Abril de 2015, Hoy…)"
                    aria-label="Fecha"
                    onChange={(e) => actualizar(row.key, "fecha", e.target.value)}
                    className={inputClass}
                  />
                )}
                <input
                  name={`${prefijo}_titulo`}
                  value={row.titulo}
                  placeholder="Título"
                  aria-label="Título"
                  onChange={(e) => actualizar(row.key, "titulo", e.target.value)}
                  className={inputClass}
                />
                <select
                  name={`${prefijo}_icono`}
                  value={row.icono}
                  aria-label="Icono"
                  onChange={(e) => actualizar(row.key, "icono", e.target.value)}
                  className={inputClass}
                >
                  {NOMBRES_ICONO.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                name={`${prefijo}_descripcion`}
                rows={2}
                value={row.descripcion}
                placeholder="Descripción corta"
                aria-label="Descripción"
                onChange={(e) => actualizar(row.key, "descripcion", e.target.value)}
                className={`${inputClass} mt-2 resize-y`}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((prev) => [
            ...prev,
            {
              key: nextKey(),
              fecha: "",
              titulo: "",
              descripcion: "",
              icono: iconoPorDefecto as string,
            },
          ])
        }
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </button>

      {hint && <p className="mt-2 text-xs text-graphite">{hint}</p>}
    </div>
  );
}
