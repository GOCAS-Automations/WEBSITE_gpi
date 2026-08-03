"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type MouseEvent,
} from "react";
import { enviarMensajeContacto } from "@/app/contacto/actions";
import { whatsappLink } from "@/data/contact";
import { esCorreoValido } from "@/data/site";
import { Mail, WhatsApp } from "@/lib/icons";
import {
  CAMPO_ENVIADO,
  CAMPO_MONTADO,
  CAMPO_TRAMPA,
  LIMITES_CONTACTO,
  asuntoContacto,
  cuerpoContacto,
  estadoContactoInicial,
  type CampoContacto,
  type EstadoContacto,
} from "@/lib/contacto-types";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-graphite/60 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

const inputErrorClass =
  "border-red-400 focus:border-red-400 focus:ring-red-200";

/**
 * Lectura del reloj, aislada en el ámbito del módulo.
 *
 * El compilador de React marca `Date.now()` como impura cuando se llama desde
 * el cuerpo de un componente y no distingue un manejador de eventos —donde
 * leer la hora es lo correcto— del código de render, donde no lo sería.
 * Sacarla aquí deja explícito dónde se usa: solo al montar el formulario y al
 * enviarlo, nunca durante un render.
 */
function marcaDeTiempo(): string {
  return String(Date.now());
}

/**
 * Formulario de contacto.
 *
 * TRES MODOS, UNA SOLA PANTALLA
 * -----------------------------
 * 1. **Envío directo** (hay credenciales SMTP): al pulsar el botón, una server
 *    action guarda el mensaje y manda el correo al buzón corporativo; el
 *    visitante ve "Enviando…" → "✅ Tu mensaje fue enviado". Es lo que pidió
 *    GPI.
 * 2. **Envío directo que falla** (Gmail rechaza, se venció la contraseña de
 *    aplicación, no hay red): si el mensaje al menos quedó GUARDADO en la base
 *    de datos, el visitante ve "✅ Recibimos tu mensaje" —que es la verdad— y
 *    no se le molesta con alternativas. Solo si no quedó en ninguna parte
 *    aparecen las tres opciones de respaldo.
 * 3. **Sin SMTP configurado**: no se promete un envío que no va a ocurrir. El
 *    botón principal abre el **compositor de Gmail en el navegador** con todo
 *    escrito, y debajo quedan el programa de correo y WhatsApp. Aun así se
 *    envía una copia a la server action, que la guarda en la base de datos:
 *    si el visitante se arrepiente y no pulsa "Enviar" en Gmail, GPI conserva
 *    de todos modos el contacto.
 *
 * POR QUÉ EL RESPALDO ES GMAIL WEB Y NO `mailto:`
 * -----------------------------------------------
 * El sitio usaba `mailto:` y GPI reportó que "no abre nada". Es el
 * comportamiento correcto de `mailto:` en un computador sin programa de correo
 * configurado, que es la situación de mucha gente hoy. El compositor de Gmail
 * es una URL normal: se abre en una pestaña del navegador y funciona en
 * cualquier equipo con sesión de Gmail. `mailto:` se conserva como segunda
 * opción, para quien sí usa Outlook o Correo de Windows.
 *
 * El correo de destino llega por props desde `site_settings.contact`
 * (`correoFormulario`), editable en /admin/ajustes.
 */
export function ContactForm({
  whatsappNumber,
  email,
  smtpConfigurado,
}: {
  whatsappNumber: string;
  /** Correo corporativo de destino. */
  email: string;
  /**
   * ¿El servidor puede enviar el correo por sí mismo?
   *
   * Llega ya resuelto desde el Server Component: aquí solo se sabe SÍ o NO.
   * Las credenciales SMTP jamás cruzan al navegador.
   */
  smtpConfigurado: boolean;
}) {
  const [form, setForm] = useState({
    nombre: "",
    empresa: "",
    correo: "",
    mensaje: "",
  });
  const [estado, setEstado] = useState<EstadoContacto>(estadoContactoInicial);
  const [enviando, startTransition] = useTransition();

  const formRef = useRef<HTMLFormElement>(null);

  /**
   * Marca de tiempo del momento en que el formulario apareció en pantalla.
   *
   * Se escribe directamente en el campo oculto desde un efecto, que es
   * justamente para lo que sirven los efectos: sincronizar el DOM con algo
   * externo a React (aquí, el reloj). No puede calcularse durante el render
   * porque el HTML lo genera el servidor y un valor distinto en servidor y
   * cliente rompería la hidratación.
   *
   * El servidor la resta de la marca del envío: las dos salen del MISMO reloj,
   * así que un computador con la hora mal puesta no descarta mensajes buenos.
   */
  const marcaMontajeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (marcaMontajeRef.current) marcaMontajeRef.current.value = marcaDeTiempo();
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Al corregir un campo, su error deja de tener sentido.
    setEstado((prev) => {
      if (prev.estado !== "invalido" || !(field in prev.errores)) return prev;
      const errores = { ...prev.errores };
      delete errores[field as CampoContacto];
      return Object.keys(errores).length === 0
        ? estadoContactoInicial
        : { ...prev, errores };
    });
  }

  /* ---------------------------------------------------------------- */
  /* Enlaces de respaldo, siempre al día con lo escrito                */
  /* ---------------------------------------------------------------- */

  const asunto = asuntoContacto(form.nombre, form.empresa);
  const cuerpoPlano = cuerpoContacto(form);

  /**
   * Compositor de Gmail en el navegador. No necesita ningún programa
   * instalado: es la opción que resuelve el problema que reportó GPI.
   */
  const enlaceGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    email,
  )}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoPlano)}`;

  /** El clásico: abre Outlook, Correo de Windows, Mail del Mac… si los hay. */
  const enlaceMailto = `mailto:${email}?subject=${encodeURIComponent(
    asunto,
  )}&body=${encodeURIComponent(cuerpoContacto(form, { salto: "\r\n" }))}`;

  const enlaceWhatsApp = whatsappLink(
    whatsappNumber,
    [
      `Hola GPI, soy ${form.nombre.trim() || "un visitante del sitio"}`,
      form.empresa.trim() ? ` de ${form.empresa.trim()}` : "",
      ".",
      form.correo.trim() ? ` Mi correo es ${form.correo.trim()}.` : "",
      form.mensaje.trim() ? `\n\n${form.mensaje.trim()}` : "",
    ].join(""),
  );

  /* ---------------------------------------------------------------- */
  /* Validación en el navegador (comodidad; la de verdad es la del     */
  /* servidor, que es quien decide si el correo sale)                  */
  /* ---------------------------------------------------------------- */

  function revisarCampos(): boolean {
    const errores: Partial<Record<CampoContacto, string>> = {};
    if (form.nombre.trim() === "") errores.nombre = "Escribe tu nombre.";
    if (form.correo.trim() === "")
      errores.correo = "Escribe tu correo electrónico.";
    else if (!esCorreoValido(form.correo))
      errores.correo =
        "Ese correo no parece válido. Escríbelo completo, por ejemplo: nombre@empresa.com";
    if (form.mensaje.trim() === "")
      errores.mensaje = "Cuéntanos brevemente qué necesitas.";

    if (Object.keys(errores).length > 0) {
      setEstado({
        estado: "invalido",
        mensaje: "Revisa los campos marcados y vuelve a intentarlo.",
        errores,
      });
      return false;
    }
    return true;
  }

  /* ---------------------------------------------------------------- */
  /* Modo 1 y 2 — envío real desde el servidor                         */
  /* ---------------------------------------------------------------- */

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!smtpConfigurado) {
      // Sin envío directo, la tecla Enter hace lo mismo que el botón: abrir el
      // compositor de Gmail en una pestaña nueva.
      if (revisarCampos()) abrirGmail();
      return;
    }

    if (!revisarCampos()) return;

    const datos = new FormData(e.currentTarget);
    // Segunda marca de tiempo, del mismo reloj que la del montaje.
    datos.set(CAMPO_ENVIADO, marcaDeTiempo());

    startTransition(async () => {
      const resultado = await enviarMensajeContacto(datos);
      setEstado(resultado);
      if (resultado.estado === "exito") {
        setForm({ nombre: "", empresa: "", correo: "", mensaje: "" });
        formRef.current?.reset();
        // El formulario vuelve a empezar: nueva marca de montaje para que el
        // siguiente mensaje también pase el filtro de tiempo.
        if (marcaMontajeRef.current)
          marcaMontajeRef.current.value = marcaDeTiempo();
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Modo 3 — compositor de Gmail en el navegador                      */
  /* ---------------------------------------------------------------- */

  /**
   * Manda una copia del mensaje a la server action.
   *
   * Sin SMTP no hay correo que enviar, pero la acción SÍ guarda el mensaje en
   * la base de datos. Vale mucho la pena: si el visitante abre Gmail y no
   * llega a pulsar "Enviar" —se distrae, cierra la pestaña, no tiene sesión
   * iniciada—, GPI conserva igualmente su nombre, su correo y lo que quería.
   * Es un extra silencioso: si falla, no se le dice nada, porque su vía
   * principal (Gmail) ya está abierta.
   */
  function registrarCopia() {
    const formulario = formRef.current;
    if (!formulario) return;

    const datos = new FormData(formulario);
    datos.set(CAMPO_ENVIADO, marcaDeTiempo());

    startTransition(async () => {
      const resultado = await enviarMensajeContacto(datos);
      if (resultado.estado === "exito" && resultado.via === "registro") {
        setEstado({
          estado: "exito",
          via: "registro",
          mensaje: `Abrimos Gmail con el mensaje listo para ${email}. También guardamos una copia aquí, así que ya tenemos tu solicitud.`,
        });
      }
    });
  }

  function abrirGmail() {
    window.open(enlaceGmail, "_blank", "noopener,noreferrer");
    setEstado({
      estado: "exito",
      via: "navegador",
      mensaje: `Abrimos Gmail en una pestaña nueva con el mensaje listo para ${email}. Solo falta que pulses «Enviar» allí.`,
    });
    registrarCopia();
  }

  /**
   * Clic en el botón principal cuando NO hay envío directo.
   *
   * Es un enlace de verdad (`<a href>`), no un botón con JavaScript: un
   * enlace nunca lo bloquea el navegador por ventanas emergentes y se puede
   * abrir en otra pestaña con el botón derecho. El `onClick` solo se encarga
   * de frenarlo si faltan datos.
   */
  function handleGmail(e: MouseEvent<HTMLAnchorElement>) {
    if (!revisarCampos()) {
      e.preventDefault();
      return;
    }
    setEstado({
      estado: "exito",
      via: "navegador",
      mensaje: `Abrimos Gmail con el mensaje listo para ${email}. Solo falta que pulses «Enviar» allí.`,
    });
    registrarCopia();
  }

  /* ---------------------------------------------------------------- */

  const errores = estado.estado === "invalido" ? estado.errores : {};
  const mostrarAlternativas =
    !smtpConfigurado || estado.estado === "error-envio";

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
      data-modo={smtpConfigurado ? "envio-directo" : "respaldo"}
    >
      {/* ---- Campo trampa (honeypot) --------------------------------
          Oculto de verdad (display:none), fuera del recorrido del tabulador
          y fuera del árbol de accesibilidad: ninguna persona lo ve, lo
          enfoca ni lo oye. Un robot que rellena todos los campos, sí. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="sitio-web">No rellenes este campo</label>
        <input
          id="sitio-web"
          name={CAMPO_TRAMPA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      {/* Marca del momento en que apareció el formulario (ver arriba). */}
      <input
        ref={marcaMontajeRef}
        type="hidden"
        name={CAMPO_MONTADO}
        defaultValue=""
      />

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
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={errores.nombre ? "error-nombre" : undefined}
            autoComplete="name"
            maxLength={LIMITES_CONTACTO.nombre}
            value={form.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            className={`${inputClass} ${errores.nombre ? inputErrorClass : ""}`}
            placeholder="Tu nombre"
          />
          <ErrorCampo id="error-nombre" texto={errores.nombre} />
        </div>
        <div>
          <label htmlFor="empresa" className="mb-1.5 block text-sm font-semibold text-ink">
            Empresa
          </label>
          <input
            id="empresa"
            name="empresa"
            type="text"
            aria-invalid={Boolean(errores.empresa)}
            aria-describedby={errores.empresa ? "error-empresa" : undefined}
            autoComplete="organization"
            maxLength={LIMITES_CONTACTO.empresa}
            value={form.empresa}
            onChange={(e) => update("empresa", e.target.value)}
            className={`${inputClass} ${errores.empresa ? inputErrorClass : ""}`}
            placeholder="Nombre de tu empresa"
          />
          <ErrorCampo id="error-empresa" texto={errores.empresa} />
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
          aria-invalid={Boolean(errores.correo)}
          aria-describedby={errores.correo ? "error-correo" : undefined}
          autoComplete="email"
          maxLength={LIMITES_CONTACTO.correo}
          value={form.correo}
          onChange={(e) => update("correo", e.target.value)}
          className={`${inputClass} ${errores.correo ? inputErrorClass : ""}`}
          placeholder="tucorreo@ejemplo.com"
        />
        <ErrorCampo id="error-correo" texto={errores.correo} />
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
          aria-invalid={Boolean(errores.mensaje)}
          aria-describedby={errores.mensaje ? "error-mensaje" : undefined}
          rows={4}
          maxLength={LIMITES_CONTACTO.mensaje}
          value={form.mensaje}
          onChange={(e) => update("mensaje", e.target.value)}
          className={`${inputClass} resize-y ${errores.mensaje ? inputErrorClass : ""}`}
          placeholder="Cuéntanos sobre tu proyecto o necesidad..."
        />
        <ErrorCampo id="error-mensaje" texto={errores.mensaje} />
      </div>

      {/* ---- Botón principal, distinto en cada modo ------------------ */}
      {smtpConfigurado ? (
        <button
          type="submit"
          disabled={enviando}
          aria-describedby="contacto-nota"
          data-testid="enviar"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-card disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 sm:w-auto"
        >
          {enviando ? (
            <>
              <Spinner />
              Enviando…
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              Enviar mensaje
            </>
          )}
        </button>
      ) : (
        <a
          href={enlaceGmail}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleGmail}
          aria-describedby="contacto-nota"
          data-testid="gmail-principal"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-dark px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep hover:shadow-card sm:w-auto"
        >
          <Mail className="h-5 w-5" />
          Enviar por correo
        </a>
      )}

      {/* Alternativa discreta: mismo mensaje, por WhatsApp. Es el canal que
          más usa el cliente de GPI, así que nunca desaparece de la pantalla. */}
      <p className="text-sm text-graphite">
        ¿Prefieres WhatsApp?{" "}
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="whatsapp"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-dark underline underline-offset-2 transition-colors hover:text-brand-deep"
        >
          <WhatsApp className="h-4 w-4" />
          Escríbenos aquí
        </a>
      </p>

      {/* Región viva siempre presente en el DOM: los lectores de pantalla solo
          anuncian cambios dentro de un `aria-live` que ya existía. */}
      <div aria-live="polite" role="status" className="min-h-0">
        {estado.estado !== "inicial" && (
          <div
            data-testid="aviso"
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              estado.estado === "exito"
                ? "border-brand/30 bg-brand-tint text-brand-deep"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <p>{estado.mensaje}</p>
          </div>
        )}
      </div>

      {/* ---- Alternativas -------------------------------------------
          Se muestran siempre en modo respaldo y solo cuando el envío falla
          en modo directo: si el correo salió, ofrecer «otras formas de
          escribirnos» solo sembraría la duda de si llegó o no. */}
      {mostrarAlternativas && (
        <div
          data-testid="alternativas"
          className="rounded-xl border border-line bg-white/70 px-4 py-3 text-sm leading-relaxed text-graphite"
        >
          <p className="font-semibold text-ink">Otras formas de escribirnos</p>
          <ul className="mt-2 space-y-1.5">
            {!smtpConfigurado ? null : (
              <li>
                <a
                  href={enlaceGmail}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="gmail-alternativa"
                  className="font-semibold text-brand-dark underline underline-offset-2 hover:text-brand-deep"
                >
                  Enviarlo desde Gmail
                </a>{" "}
                — se abre en el navegador con el mensaje ya escrito.
              </li>
            )}
            <li>
              <a
                href={enlaceMailto}
                data-testid="mailto"
                className="font-semibold text-brand-dark underline underline-offset-2 hover:text-brand-deep"
              >
                Abrirlo en mi programa de correo
              </a>{" "}
              — Outlook, Correo de Windows, Mail… si tienes uno configurado.
            </li>
            <li>
              <a
                href={enlaceWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="whatsapp-alternativa"
                className="font-semibold text-brand-dark underline underline-offset-2 hover:text-brand-deep"
              >
                Escribirnos por WhatsApp
              </a>{" "}
              — normalmente es la vía más rápida.
            </li>
          </ul>
        </div>
      )}

      <p id="contacto-nota" className="text-xs leading-relaxed text-graphite">
        {smtpConfigurado
          ? "Al pulsar «Enviar mensaje», tu mensaje llega directamente al correo de nuestro equipo y te respondemos a la dirección que nos dejaste. Solo usamos tus datos para contestarte."
          : "Al pulsar «Enviar por correo» se abrirá tu correo con el mensaje ya escrito: solo tendrás que pulsar «Enviar» ahí. No almacenamos tus datos en este sitio."}
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */

function ErrorCampo({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
      {texto}
    </p>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
    />
  );
}
