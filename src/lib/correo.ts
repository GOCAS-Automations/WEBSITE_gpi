/**
 * ENVÍO DE CORREO — SMTP de Gmail
 * ===============================
 *
 * ⚠️ MÓDULO SOLO DE SERVIDOR. Lee `CONTACT_SMTP_USER` y `CONTACT_SMTP_PASS` de
 * `process.env`: **nunca** se puede importar desde un Client Component. Lo usa
 * únicamente la server action `src/app/contacto/actions.ts`.
 *
 * POR QUÉ SMTP DIRECTO Y NO UN SERVICIO
 * -------------------------------------
 * El formulario de /contacto armaba un `mailto:` y GPI reportó el fallo obvio:
 * en un computador sin programa de correo configurado, `mailto:` no abre
 * absolutamente nada. Se necesitaba que el botón enviara de verdad.
 *
 * GPI ya tiene la cuenta `gpi.gerencia1@gmail.com`, y Gmail permite enviar por
 * SMTP con una **contraseña de aplicación** de 16 caracteres. Eso resuelve el
 * problema sin contratar un proveedor de correo transaccional, sin cuota
 * mensual y sin meter otro tercero en el proyecto.
 *
 * CÓMO SE COMPORTA SI NO ESTÁ CONFIGURADO
 * ---------------------------------------
 * Igual que el resto del sitio con Supabase: si faltan las variables, nada se
 * rompe. `smtpContactoConfigurado()` devuelve `false`, la página no ofrece el
 * envío directo y el formulario cae en su modo alternativo (compositor de
 * Gmail en el navegador, `mailto:` y WhatsApp).
 */

import nodemailer from "nodemailer";
import { asuntoContacto, cuerpoContacto } from "@/lib/contacto-types";

export interface DatosContacto {
  nombre: string;
  /** Cadena vacía si el visitante no la escribió (es opcional). */
  empresa: string;
  /** Correo del visitante: destino del `Reply-To`. */
  correo: string;
  mensaje: string;
}

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */

function credenciales(): { user: string; pass: string } | null {
  const user = process.env.CONTACT_SMTP_USER?.trim();
  // La contraseña de aplicación de Google se muestra en grupos de 4
  // ("abcd efgh ijkl mnop"). Mucha gente la copia con los espacios y Gmail la
  // rechaza: se quitan aquí para que copiar y pegar tal cual funcione.
  const pass = process.env.CONTACT_SMTP_PASS?.replace(/\s+/g, "");
  if (!user || !pass) return null;
  return { user, pass };
}

/**
 * ¿Están las dos variables de entorno del SMTP?
 *
 * Se llama desde el Server Component de /contacto para decidir qué formulario
 * mostrar. Devuelve un booleano y NADA más: las credenciales no salen nunca
 * del servidor.
 */
export function smtpContactoConfigurado(): boolean {
  return credenciales() !== null;
}

/* ------------------------------------------------------------------ */
/* Redacción del correo                                                */
/* ------------------------------------------------------------------ */

/**
 * Limpia un valor que va a viajar en una CABECERA del correo (asunto, nombre
 * del remitente, Reply-To).
 *
 * Un salto de línea dentro de una cabecera permite inyectar cabeceras nuevas
 * —por ejemplo un `Bcc:` a media internet—, que es la forma clásica de
 * convertir un formulario de contacto en un relay de spam. Los saltos se
 * sustituyen por espacios ANTES de construir el mensaje.
 */
function cabeceraSegura(valor: string): string {
  return valor.replace(/[\r\n]+/g, " ").trim();
}

/** Escapa texto del visitante para poder incrustarlo en el cuerpo HTML. */
function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fecha larga en hora de Colombia, para que GPI sepa cuándo entró el mensaje. */
function fechaColombia(): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
}

/** Versión HTML sencilla del mismo mensaje, con los colores de GPI. */
function cuerpoHtml(datos: DatosContacto, fecha: string): string {
  const fila = (etiqueta: string, valor: string) =>
    `<tr>
      <td style="padding:6px 14px 6px 0;color:#6d6e71;font-size:13px;white-space:nowrap;vertical-align:top;">${etiqueta}</td>
      <td style="padding:6px 0;color:#1f2933;font-size:14px;font-weight:600;">${escaparHtml(valor)}</td>
    </tr>`;

  const parrafos = datos.mensaje
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;color:#1f2933;font-size:15px;line-height:1.65;">${escaparHtml(
          p,
        ).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f6f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e3e7e5;border-radius:14px;overflow:hidden;">
    <tr><td style="background:#3dae2b;padding:18px 26px;">
      <p style="margin:0;color:#ffffff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Sitio web de GPI</p>
      <p style="margin:4px 0 0;color:#ffffff;font-size:19px;font-weight:700;">Nuevo mensaje del formulario de contacto</p>
    </td></tr>
    <tr><td style="padding:24px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:18px;">
        ${fila("Nombre", datos.nombre)}
        ${datos.empresa ? fila("Empresa", datos.empresa) : ""}
        ${fila("Correo", datos.correo)}
        ${fila("Fecha", fecha)}
      </table>
      <div style="border-top:1px solid #e3e7e5;padding-top:18px;">${parrafos}</div>
    </td></tr>
    <tr><td style="background:#f4f6f5;padding:16px 26px;border-top:1px solid #e3e7e5;">
      <p style="margin:0;color:#6d6e71;font-size:12px;line-height:1.6;">
        Responda a este correo y la respuesta le llegará directamente a
        <strong>${escaparHtml(datos.correo)}</strong>.<br>
        Enviado automáticamente desde el formulario de contacto de gpiprofesionales.com.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Envío                                                               */
/* ------------------------------------------------------------------ */

/**
 * Envía el mensaje del formulario al buzón corporativo.
 *
 * @param destinatario  Correo de destino. Sale SIEMPRE de los ajustes del
 *                      servidor (`site_settings.contact.correoFormulario`),
 *                      nunca del formulario: si viniera del cliente,
 *                      cualquiera podría usar esta acción para mandar correo a
 *                      quien quisiera desde la cuenta de GPI (relay abierto).
 *
 * Lanza si no hay credenciales o si el servidor SMTP rechaza el mensaje; quien
 * llama decide qué contarle al visitante.
 */
export async function enviarCorreoContacto(
  destinatario: string,
  datos: DatosContacto,
): Promise<void> {
  const auth = credenciales();
  if (!auth) throw new Error("El envío de correo no está configurado.");

  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth,
    // Sin topes, una función serverless puede quedarse esperando hasta que la
    // mata la plataforma y el visitante no ve ni éxito ni error.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const nombre = cabeceraSegura(datos.nombre);
  const empresa = cabeceraSegura(datos.empresa);
  const correo = cabeceraSegura(datos.correo);
  const fecha = fechaColombia();

  try {
    await transporte.sendMail({
      // Gmail reescribe el remitente a la cuenta autenticada pase lo que pase,
      // así que el `from` usa esa misma dirección con un nombre visible claro.
      from: `"Sitio web GPI" <${auth.user}>`,
      to: destinatario,
      // LA CLAVE DE TODO: al responder, GPI le escribe al prospecto de un
      // clic, no a su propia cuenta de gerencia.
      replyTo: `"${nombre.replace(/"/g, "'")}" <${correo}>`,
      subject: asuntoContacto(nombre, empresa),
      text: cuerpoContacto({ nombre, empresa, correo, mensaje: datos.mensaje }, {
        salto: "\r\n",
        fecha,
      }),
      html: cuerpoHtml({ nombre, empresa, correo, mensaje: datos.mensaje }, fecha),
    });
  } finally {
    // El transporte abre un socket con Gmail; en serverless conviene cerrarlo.
    transporte.close();
  }
}
