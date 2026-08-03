/**
 * Tipos mínimos de `nodemailer`.
 *
 * POR QUÉ ESTE ARCHIVO EXISTE
 * ---------------------------
 * `nodemailer` no trae tipos propios y los oficiales viven en un paquete
 * aparte (`@types/nodemailer`). El sitio usa exactamente TRES cosas de la
 * librería —crear un transporte SMTP, enviar un correo y verificar la
 * conexión—, así que declararlas aquí sale más barato que sumar otra
 * dependencia al proyecto (nodemailer es la única que se añadió).
 *
 * Si algún día se usa una función más de nodemailer, se añade aquí su firma o
 * se instala `@types/nodemailer` como dependencia de desarrollo y se borra
 * este archivo.
 */
declare module "nodemailer" {
  /** Opciones del transporte SMTP (solo las que usa el sitio). */
  export interface SmtpOptions {
    host: string;
    port: number;
    /** `true` para TLS implícito (puerto 465), que es lo que usa Gmail. */
    secure: boolean;
    auth: { user: string; pass: string };
    /** Milisegundos para abrir el socket. */
    connectionTimeout?: number;
    /** Milisegundos de espera al saludo del servidor. */
    greetingTimeout?: number;
    /** Milisegundos de inactividad antes de cortar. */
    socketTimeout?: number;
  }

  export interface MailOptions {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
    html?: string;
    headers?: Record<string, string>;
  }

  export interface SentMessageInfo {
    messageId: string;
    accepted: string[];
    rejected: string[];
    response: string;
  }

  export interface Transporter {
    sendMail(options: MailOptions): Promise<SentMessageInfo>;
    verify(): Promise<true>;
    close(): void;
  }

  export function createTransport(options: SmtpOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
