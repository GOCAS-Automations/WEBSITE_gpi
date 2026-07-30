"use client";

import { useState, type FormEvent } from "react";
import { whatsappLink } from "@/data/contact";
import { WhatsApp } from "@/lib/icons";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export function ContactForm({ whatsappNumber }: { whatsappNumber: string }) {
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    correo: "",
    mensaje: "",
  });
  /**
   * Mensaje para la región `aria-live`: el envío abre otra pestaña, algo que sin
   * anunciar es invisible para quien usa lector de pantalla.
   */
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(
    null,
  );

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parts = [
      `Hola GPI, soy ${form.nombre.trim()}`,
      form.empresa.trim() ? ` de ${form.empresa.trim()}` : "",
      ".",
      form.correo.trim() ? ` Mi correo es ${form.correo.trim()}.` : "",
      form.mensaje.trim() ? `\n\n${form.mensaje.trim()}` : "",
    ];
    const message = parts.join("");
    const url = whatsappLink(whatsappNumber, message);
    const ventana = window.open(url, "_blank", "noopener,noreferrer");

    if (ventana) {
      setAviso({
        tono: "ok",
        texto:
          "Abrimos WhatsApp en una pestaña nueva con tu mensaje listo para enviar.",
      });
    } else {
      // El navegador bloqueó la ventana emergente: no dejarlo en silencio.
      setAviso({
        tono: "error",
        texto:
          "Tu navegador bloqueó la ventana de WhatsApp. Permite las ventanas emergentes de este sitio o escríbenos con los botones de WhatsApp de esta página.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold text-ink">
            Nombre <span className="text-brand-dark">*</span>
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            aria-required="true"
            autoComplete="name"
            value={form.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            className={inputClass}
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label htmlFor="empresa" className="mb-1.5 block text-sm font-semibold text-ink">
            Empresa
          </label>
          <input
            id="empresa"
            name="empresa"
            type="text"
            autoComplete="organization"
            value={form.empresa}
            onChange={(e) => update("empresa", e.target.value)}
            className={inputClass}
            placeholder="Nombre de tu empresa"
          />
        </div>
      </div>

      <div>
        <label htmlFor="correo" className="mb-1.5 block text-sm font-semibold text-ink">
          Correo electrónico <span className="text-brand-dark">*</span>
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          required
          aria-required="true"
          autoComplete="email"
          value={form.correo}
          onChange={(e) => update("correo", e.target.value)}
          className={inputClass}
          placeholder="tucorreo@ejemplo.com"
        />
      </div>

      <div>
        <label htmlFor="mensaje" className="mb-1.5 block text-sm font-semibold text-ink">
          Mensaje <span className="text-brand-dark">*</span>
        </label>
        <textarea
          id="mensaje"
          name="mensaje"
          required
          aria-required="true"
          rows={4}
          value={form.mensaje}
          onChange={(e) => update("mensaje", e.target.value)}
          className={`${inputClass} resize-y`}
          placeholder="Cuéntanos sobre tu proyecto o necesidad..."
        />
      </div>

      <button
        type="submit"
        aria-describedby="contacto-nota"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-card sm:w-auto"
      >
        <WhatsApp className="h-5 w-5" />
        Enviar por WhatsApp
      </button>

      {/* Región viva siempre presente en el DOM: los lectores de pantalla solo
          anuncian cambios dentro de un `aria-live` que ya existía. */}
      <div aria-live="polite" role="status" className="min-h-0">
        {aviso && (
          <p
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              aviso.tono === "ok"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {aviso.texto}
          </p>
        )}
      </div>

      <p id="contacto-nota" className="text-xs leading-relaxed text-graphite">
        Al enviar, se abrirá WhatsApp con tu mensaje listo para que lo envíes a
        nuestro equipo. No almacenamos tus datos en este sitio.
      </p>
    </form>
  );
}
