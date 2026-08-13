"use client";

import { useRef, useState } from "react";
import { Upload, Photo } from "@/lib/icons";
import { esImagenOptimizable } from "@/lib/imagenes";
import { subirImagenAlBucket } from "./subir-imagen";
import { AYUDA_IMAGEN, inputClass } from "./ui";

/**
 * Campo de imagen: el administrador sube un archivo al bucket público
 * `site-images` (a la carpeta que indique `folder`) o pega la URL de una
 * imagen ya publicada en internet — Cloudinary es lo recomendado, ver
 * `AYUDA_IMAGEN`.
 *
 * La vista previa es un `<img>` a secas **a propósito**: acepta cualquier URL
 * sin pasar por el optimizador de Next, así que una dirección rara se ve rota
 * en el recuadro pero no rompe la pantalla del panel.
 */
export function ImageField({
  label,
  name,
  defaultValue,
  folder = "general",
  hint,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  folder?: string;
  hint?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Solo avisa de enlaces ya escritos del todo (`https://…`): mientras se
  // teclea o se pega a medias, cualquier cadena sería «no permitida» y el
  // aviso parpadearía en cada pulsación.
  const avisoEnlace =
    /^https?:\/\/\S+$/i.test(value.trim()) && !esImagenOptimizable(value.trim());

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);

    const resultado = await subirImagenAlBucket(file, folder);
    if ("error" in resultado) setError(resultado.error);
    else setValue(resultado.url);

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-brand-dark"> *</span>}
      </span>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {/* Vista previa */}
        <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-mist">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Vista previa"
              className="h-full w-full object-contain"
            />
          ) : (
            <Photo className="h-7 w-7 text-graphite/50" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            name={name}
            type="text"
            required={required}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://... (o sube un archivo)"
            className={inputClass}
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Subir imagen"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => setValue("")}
                className="text-xs font-semibold text-graphite transition-colors hover:text-red-600"
              >
                Quitar
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          {hint && <p className="mt-1.5 text-xs text-graphite">{hint}</p>}
          {/* Ayuda práctica, siempre visible: es la duda que más se repite. */}
          <p className="mt-1.5 text-xs leading-relaxed text-graphite">
            {AYUDA_IMAGEN}
          </p>
          {/*
            AVISO DE ENLACE NO PERMITIDO
            ----------------------------
            El sitio solo puede MOSTRAR imágenes de su propio almacenamiento y
            de Cloudinary (lista blanca de `next.config.ts`). Con cualquier
            otro enlace la página no se rompe —se pinta sin optimizar— pero el
            navegador bloquea la descarga y el visitante ve un hueco. Sin este
            aviso, quien edita guardaba tan tranquilo y el problema aparecía
            después, en el sitio publicado y sin explicación.
          */}
          {avisoEnlace && (
            <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-800">
              Este enlace no es del almacenamiento del sitio ni de Cloudinary, así
              que es probable que la imagen no llegue a verse. Sube el archivo con
              el botón de arriba o publícala en Cloudinary y pega esa dirección.
            </p>
          )}
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
