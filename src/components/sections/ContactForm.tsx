"use client";

import { useState, type FormEvent } from "react";
import { whatsappLink } from "@/data/contact";
import { Mail, WhatsApp } from "@/lib/icons";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

/**
 * Formulario de contacto.
 *
 * POR QUÉ `mailto:` Y NO UN ENVÍO DESDE EL SERVIDOR
 * -------------------------------------------------
 * GPI quiere que los mensajes lleguen a su correo corporativo, pero el sitio no
 * tiene (ni debe pagar) un proveedor de envío de correo. La solución sin
 * terceros ni servidores intermedios: al enviar se abre el programa de correo
 * del visitante con el destinatario, el asunto y el cuerpo ya escritos, y él
 * solo pulsa «Enviar». El mensaje sale de SU cuenta, así que GPI puede
 * responderle directamente.
 *
 * El correo de destino llega por props desde `site_settings.contact`
 * (`correoFormulario`), editable en /admin/ajustes. WhatsApp se conserva como
 * alternativa secundaria: es el canal que más usa el cliente de GPI.
 */
export function ContactForm({
  whatsappNumber,
  email,
}: {
  whatsappNumber: string;
  /** Correo corporativo al que se dirige el `mailto:`. */
  email: string;
}) {
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    correo: "",
    mensaje: "",
  });
  /**
   * Mensaje para la región `aria-live`: el envío abre el programa de correo o
   * una pestaña nueva, algo que sin anunciar es invisible para quien usa lector
   * de pantalla.
   */
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(
    null,
  );
  /**
   * El `mailto:` que se acaba de abrir, para ofrecerlo también como enlace.
   *
   * En un computador sin programa de correo configurado, asignar
   * `location.href = "mailto:…"` no hace absolutamente nada y el visitante se
   * queda mirando la pantalla. El enlace de respaldo le da una segunda
   * oportunidad y, de paso, le deja ver a qué correo va dirigido.
   */
  const [enlaceCorreo, setEnlaceCorreo] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  /** Texto plano del mensaje, común al correo y a WhatsApp. */
  function armarMensaje() {
    const nombre = form.nombre.trim();
    const empresa = form.empresa.trim();
    const correo = form.correo.trim();
    const mensaje = form.mensaje.trim();
    return { nombre, empresa, correo, mensaje };
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { nombre, empresa, correo, mensaje } = armarMensaje();

    const asunto = `Contacto desde el sitio web — ${nombre}${
      empresa ? ` (${empresa})` : ""
    }`;

    // Cuerpo en líneas sueltas: se codifica entero y los saltos viajan como
    // %0D%0A, que es lo que entienden todos los clientes de correo.
    const cuerpo = [
      `Nombre: ${nombre}`,
      empresa ? `Empresa: ${empresa}` : null,
      `Correo: ${correo}`,
      "",
      "Mensaje:",
      mensaje,
      "",
      "—",
      "Enviado desde el formulario de contacto de gpiprofesionales.com",
    ]
      .filter((linea) => linea !== null)
      .join("\r\n");

    const url = `mailto:${email}?subject=${encodeURIComponent(
      asunto,
    )}&body=${encodeURIComponent(cuerpo)}`;

    // `location.href` y no `window.open`: un `mailto:` abre una aplicación, no
    // una página, y así no queda una pestaña en blanco detrás.
    window.location.href = url;

    setEnlaceCorreo(url);
    setAviso({
      tono: "ok",
      texto: `Abrimos tu programa de correo con el mensaje listo para enviar a ${email}.`,
    });
  }

  function abrirWhatsApp() {
    const { nombre, empresa, correo, mensaje } = armarMensaje();
    const texto = [
      `Hola GPI, soy ${nombre}`,
      empresa ? ` de ${empresa}` : "",
      ".",
      correo ? ` Mi correo es ${correo}.` : "",
      mensaje ? `\n\n${mensaje}` : "",
    ].join("");

    const ventana = window.open(
      whatsappLink(whatsappNumber, texto),
      "_blank",
      "noopener,noreferrer",
    );

    if (ventana) {
      setEnlaceCorreo(null);
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
        <Mail className="h-5 w-5" />
        Enviar por correo
      </button>

      {/* Alternativa discreta: mismo mensaje, por WhatsApp. Va como <button>
          (no como enlace) porque el texto se arma con lo que hay escrito en
          el formulario en el momento de pulsarlo. */}
      <p className="text-sm text-graphite">
        ¿Prefieres WhatsApp?{" "}
        <button
          type="button"
          onClick={abrirWhatsApp}
          className="inline-flex items-center gap-1.5 font-semibold text-brand-dark underline underline-offset-2 transition-colors hover:text-brand-deep"
        >
          <WhatsApp className="h-4 w-4" />
          Escríbenos aquí
        </button>
      </p>

      {/* Región viva siempre presente en el DOM: los lectores de pantalla solo
          anuncian cambios dentro de un `aria-live` que ya existía. */}
      <div aria-live="polite" role="status" className="min-h-0">
        {aviso && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              aviso.tono === "ok"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p>{aviso.texto}</p>
            {enlaceCorreo && (
              <p className="mt-1.5">
                ¿No se abrió?{" "}
                <a
                  data-testid="mailto-fallback"
                  href={enlaceCorreo}
                  className="font-semibold underline underline-offset-2"
                >
                  Ábrelo con este enlace
                </a>{" "}
                o escríbenos por WhatsApp aquí arriba.
              </p>
            )}
          </div>
        )}
      </div>

      <p id="contacto-nota" className="text-xs leading-relaxed text-graphite">
        Al enviar, se abrirá tu programa de correo con el mensaje ya escrito para
        que lo envíes a nuestro equipo. No almacenamos tus datos en este sitio.
      </p>
    </form>
  );
}
