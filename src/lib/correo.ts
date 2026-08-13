/**
 * ENVÍO DE CORREO — SMTP
 * ======================
 *
 * ⚠️ MÓDULO SOLO DE SERVIDOR. Lee `CONTACT_SMTP_*` de `process.env`: **nunca**
 * se puede importar desde un Client Component. Lo usa únicamente la server
 * action `src/app/contacto/actions.ts`.
 *
 * POR QUÉ SMTP DIRECTO Y NO UN SERVICIO
 * -------------------------------------
 * El formulario de /contacto armaba un `mailto:` y GPI reportó el fallo obvio:
 * en un computador sin programa de correo configurado, `mailto:` no abre
 * absolutamente nada. Se necesitaba que el botón enviara de verdad.
 *
 * Se resolvió con SMTP a pelo: sin proveedor transaccional, sin cuota mensual y
 * sin meter otro tercero en el proyecto.
 *
 * DOS BUZONES POSIBLES, EL MISMO CÓDIGO
 * -------------------------------------
 * El servidor se configura por variables de entorno, así que el sitio sirve
 * para los dos escenarios sin tocar una línea:
 *
 *   · **Gmail** (`smtp.gmail.com:465`) — el valor por defecto, que es lo que se
 *     montó en agosto de 2026 con `gpi.gerencia1@gmail.com` y una **contraseña
 *     de aplicación** de 16 caracteres.
 *   · **Buzón del dominio** (`mail.gpiprofesionales.com:465`) — el correo
 *     corporativo de cPanel/GoDaddy. Ahí `CONTACT_SMTP_PASS` es la contraseña
 *     normal del buzón y el remitente sale del propio dominio, que es mejor
 *     para la entregabilidad.
 *
 * Se cambia de uno a otro poniendo `CONTACT_SMTP_HOST` y volviendo a desplegar.
 *
 * CÓMO SE COMPORTA SI NO ESTÁ CONFIGURADO
 * ---------------------------------------
 * Igual que el resto del sitio con Supabase: si faltan las variables, nada se
 * rompe. `smtpContactoConfigurado()` devuelve `false`, la página no ofrece el
 * envío directo y el formulario cae en su modo alternativo (compositor de
 * Gmail en el navegador, `mailto:` y WhatsApp). La condición sigue siendo
 * exactamente la misma que antes: USUARIO y CONTRASEÑA presentes. El host y el
 * puerto tienen valor por defecto, así que nunca hacen falta para activarlo.
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

/** Servidor por defecto: el que se montó primero. Mantiene la compatibilidad. */
const HOST_POR_DEFECTO = "smtp.gmail.com";
/** Puerto por defecto: SMTPS, el que usan tanto Gmail como cPanel. */
const PUERTO_POR_DEFECTO = 465;

/** Nombre del servidor SMTP, del entorno o el de Gmail. */
function host(): string {
  return process.env.CONTACT_SMTP_HOST?.trim() || HOST_POR_DEFECTO;
}

/**
 * Puerto SMTP. Un valor que no sea un número se ignora en vez de romper el
 * envío: es preferible intentarlo por el 465 que devolverle un error al
 * visitante por una errata en el panel de Vercel.
 */
function puerto(): number {
  const crudo = Number(process.env.CONTACT_SMTP_PORT?.trim());
  return Number.isInteger(crudo) && crudo > 0 && crudo < 65536
    ? crudo
    : PUERTO_POR_DEFECTO;
}

function credenciales(): { user: string; pass: string } | null {
  const user = process.env.CONTACT_SMTP_USER?.trim();
  const bruta = process.env.CONTACT_SMTP_PASS;
  if (!user || !bruta) return null;

  // La contraseña de aplicación de Google se muestra en grupos de 4
  // ("abcd efgh ijkl mnop"). Mucha gente la copia con los espacios y Gmail la
  // rechaza: se quitan para que copiar y pegar tal cual funcione.
  //
  // OJO: eso SOLO vale para Gmail. En un buzón del dominio la contraseña la
  // elige quien crea la cuenta en cPanel y puede llevar espacios de verdad;
  // borrárselos convertiría un problema de configuración en un fallo de login
  // imposible de diagnosticar. Fuera de Gmail solo se recortan los extremos,
  // que es lo que suele sobrar al pegar en un formulario.
  const gmail = host().toLowerCase().endsWith("gmail.com");
  const pass = gmail ? bruta.replace(/\s+/g, "") : bruta.trim();
  if (!pass) return null;

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

  const numeroDePuerto = puerto();

  const transporte = nodemailer.createTransport({
    host: host(),
    port: numeroDePuerto,
    // `secure: true` = TLS desde el saludo (SMTPS, puerto 465). Los demás
    // puertos (587, 25) arrancan en claro y suben a TLS con STARTTLS, que
    // nodemailer negocia solo cuando `secure` es `false`.
    secure: numeroDePuerto === 465,
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
      // El remitente es SIEMPRE la cuenta autenticada: Gmail lo reescribe pase
      // lo que pase, y un servidor de dominio rechaza el mensaje si el `from`
      // no coincide con el buzón. Lo único que se elige es el nombre visible.
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
    // El transporte abre un socket con el servidor de correo; en serverless
    // conviene cerrarlo.
    transporte.close();
  }
}
