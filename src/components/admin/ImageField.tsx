"use client";

import { useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { SITE_IMAGES_BUCKET } from "@/lib/supabase/config";
import { Upload, Photo } from "@/lib/icons";
import { inputClass } from "./ui";

function sanitize(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase()
    .slice(-60);
}

/**
 * Campo de imagen: el administrador puede pegar una URL externa o una ruta
 * local (`/images/...`), o subir un archivo al bucket público `site-images`.
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

  async function handleFile(file: File) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setUploading(true);
    setError(null);

    const path = `${folder}/${Date.now()}-${sanitize(file.name)}`;
    const { data, error: uploadError } = await supabase.storage
      .from(SITE_IMAGES_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError || !data) {
      setError(uploadError?.message ?? "No se pudo subir la imagen.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(data.path);

    setValue(publicUrl);
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
            placeholder="/images/... o https://..."
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
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
