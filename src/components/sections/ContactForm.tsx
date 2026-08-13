"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { enviarMensajeContacto } from "@/app/contacto/actions";
import { whatsappLink } from "@/data/contact";
import { esCorreoValido } from "@/data/site";
import { Mail, WhatsApp } from "@/lib/icons";
import {
  CAMPO_ENVIADO,
  CAMPO_MONTADO,
  CAMPO_TRAMPA,
  ERROR_TELEFONO,
  LIMITES_CONTACTO,
  asuntoContacto,
  cuerpoContacto,
  estadoContactoInicial,
  esTelefonoValido,
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
 * DOS MODOS, UNA SOLA PANTALLA
 * -----------------------------
 * 1. **Envío directo** (hay credenciales SMTP): al pulsar el botón, una server
 *    action guarda el mensaje y manda el correo al buzón corporativo; el
 *    visitante ve "Enviando…" → "✅ Tu mensaje fue enviado". Si el correo
 *    falla pero el mensaje al menos quedó GUARDADO en la base de datos, ve
 *    "✅ Recibimos tu mensaje" —que es la verdad— y no se le molesta con
 *    alternativas. Solo si no quedó en ninguna parte aparecen Gmail web y
 *    WhatsApp como respaldo.
 * 2. **Sin SMTP configurado** (estado transitorio, mientras llegan las
 *    credenciales): no se promete un envío que no va a ocurrir. El botón
 *    principal queda INHABILITADO, con un aviso honesto debajo, y la única
 *    vía activa en pantalla es WhatsApp. En cuanto lleguen
 *    `CONTACT_SMTP_USER` / `CONTACT_SMTP_PASS` el formulario pasa solo al
 *    modo 1, sin tocar código.
 *
 * POR QUÉ EL RESPALDO ES GMAIL WEB Y NO `mailto:`
 * -----------------------------------------------
 * El sitio usaba `mailto:` y GPI reportó que "no abre nada". Es el
 * comportamiento correcto de `mailto:` en un computador sin programa de correo
 * configurado, que es la situación de mucha gente hoy. El compositor de Gmail
 * es una URL normal: se abre en una pestaña del navegador y funciona en
 * cualquier equipo con sesión de Gmail. Por eso `mailto:` no aparece en
 * ninguna parte del formulario.
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
    telefono: "",
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
    if (form.telefono.trim() === "")
      errores.telefono = "Escribe tu número de teléfono.";
    else if (!esTelefonoValido(form.telefono)) errores.telefono = ERROR_TELEFONO;
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

    // Sin credenciales SMTP el botón está inhabilitado y no hay ningún envío
    // posible: no debería poder llegarse aquí, pero por si algún navegador
    // dispara el evento igual (por ejemplo con Enter), no se hace nada.
    if (!smtpConfigurado) return;

    if (!revisarCampos()) return;

    const datos = new FormData(e.currentTarget);
    // Segunda marca de tiempo, del mismo reloj que la del montaje.
    datos.set(CAMPO_ENVIADO, marcaDeTiempo());

    startTransition(async () => {
      const resultado = await enviarMensajeContacto(datos);
      setEstado(resultado);
      if (resultado.estado === "exito") {
        setForm({
          nombre: "",
          empresa: "",
          correo: "",
          telefono: "",
          mensaje: "",
        });
        formRef.current?.reset();
        // El formulario vuelve a empezar: nueva marca de montaje para que el
        // siguiente mensaje también pase el filtro de tiempo.
        if (marcaMontajeRef.current)
          marcaMontajeRef.current.value = marcaDeTiempo();
      }
    });
  }

  /* ---------------------------------------------------------------- */

  const errores = estado.estado === "invalido" ? estado.errores : {};
  // Solo puede haber "error-envio" cuando SÍ hay envío directo (sin él, el
  // botón está inhabilitado y no hay ningún submit posible): mostrar las
  // alternativas de respaldo aquí basta para cubrir ese único caso.
  const mostrarAlternativas = estado.estado === "error-envio";

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

      {/* Correo y teléfono, la pareja de datos de contacto: los dos son
          obligatorios y GPI usa el que le quede mejor para responder. */}
      <div className="grid gap-4 sm:grid-cols-2">
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
          <label htmlFor="telefono" className="mb-1.5 block text-sm font-semibold text-ink">
            Teléfono <span className="text-brand-dark">*</span>
          </label>
          {/* `type="tel"` + `inputMode="tel"` levantan el teclado numérico con
              `+` y `*` en el móvil; `autocomplete="tel"` deja que el navegador
              lo rellene. No se usa `pattern`: el navegador mostraría su propio
              mensaje en inglés y aquí los errores se explican en español. */}
          <input
            id="telefono"
            name="telefono"
            type="tel"
            required
            aria-required="true"
            aria-invalid={Boolean(errores.telefono)}
            aria-describedby={errores.telefono ? "error-telefono" : undefined}
            autoComplete="tel"
            inputMode="tel"
            maxLength={LIMITES_CONTACTO.telefono}
            value={form.telefono}
            onChange={(e) => update("telefono", e.target.value)}
            className={`${inputClass} ${errores.telefono ? inputErrorClass : ""}`}
            placeholder="+57 318 434 1249"
          />
          <ErrorCampo id="error-telefono" texto={errores.telefono} />
        </div>
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

      {/* ---- Botón principal, distinto en cada modo ------------------
          Sin SMTP configurado no se promete un envío que no va a ocurrir:
          el botón queda inhabilitado de verdad (no solo visualmente) y no
          dispara ningún envío al pulsarlo ni al pulsar Enter. */}
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
        <button
          type="submit"
          disabled
          aria-disabled="true"
          aria-describedby="contacto-envio-pendiente"
          data-testid="enviar"
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-line bg-mist px-6 py-3.5 text-base font-semibold text-graphite/70 sm:w-auto"
        >
          <Mail className="h-5 w-5" />
          Enviar mensaje
        </button>
      )}

      {!smtpConfigurado && (
        <p
          id="contacto-envio-pendiente"
          data-testid="envio-pendiente"
          className="text-xs leading-relaxed text-graphite"
        >
          El envío directo desde el sitio estará disponible muy pronto.
          Mientras tanto, escríbenos por WhatsApp.
        </p>
      )}

      {/* Único acceso a WhatsApp del bloque: se muestra siempre, en los tres
          escenarios (envío directo, envío que falla y envío sin configurar),
          porque es el canal que más usa el cliente de GPI. */}
      <p className="text-sm text-graphite">
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="whatsapp"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-deep underline underline-offset-2 transition-colors hover:text-ink"
        >
          <WhatsApp className="h-4 w-4" />
          Escribirnos por WhatsApp
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
          Solo cuando el envío directo falla: si el correo salió, ofrecer
          «otras formas de escribirnos» solo sembraría la duda de si llegó o
          no. WhatsApp no se repite aquí: ya tiene su único acceso arriba. */}
      {mostrarAlternativas && (
        <div
          data-testid="alternativas"
          className="rounded-xl border border-line bg-white/70 px-4 py-3 text-sm leading-relaxed text-graphite"
        >
          <p className="font-semibold text-ink">Otras formas de escribirnos</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <a
                href={enlaceGmail}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="gmail-alternativa"
                className="font-semibold text-brand-deep underline underline-offset-2 hover:text-ink"
              >
                Enviarlo desde Gmail
              </a>{" "}
              — se abre en el navegador con el mensaje ya escrito.
            </li>
          </ul>
        </div>
      )}

      {smtpConfigurado && (
        <p id="contacto-nota" className="text-xs leading-relaxed text-graphite">
          Al pulsar «Enviar mensaje», tu mensaje llega directamente al correo
          de nuestro equipo y te respondemos a la dirección que nos dejaste.
          Solo usamos tus datos para contestarte.
        </p>
      )}
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
