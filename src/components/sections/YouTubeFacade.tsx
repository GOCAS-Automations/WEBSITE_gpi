"use client";

import { useState } from "react";
import { Play } from "@/lib/icons";

interface YouTubeFacadeProps {
  id: string;
  title: string;
}

/**
 * Facade de YouTube: no carga el iframe (ni cookies de YouTube) hasta que el
 * usuario pulsa reproducir. Mejora el rendimiento y la privacidad.
 */
export function YouTubeFacade({ id, title }: YouTubeFacadeProps) {
  const [active, setActive] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl border border-line bg-ink shadow-card">
      {active ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerated-download; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Reproducir video: ${title}`}
          className="group absolute inset-0 flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-ink via-ink-soft to-brand-dark"
        >
          <span className="bg-dot-grid absolute inset-0 opacity-30" aria-hidden="true" />
          <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-brand shadow-card transition-transform duration-200 group-hover:scale-110">
            <Play className="ml-1 h-9 w-9" />
          </span>
          <span className="relative mt-5 text-lg font-bold text-white">
            Reproducir video
          </span>
          <span className="relative mt-1 text-sm text-white/60">
            GPI — Optimización de Procesos
          </span>
        </button>
      )}
    </div>
  );
}
