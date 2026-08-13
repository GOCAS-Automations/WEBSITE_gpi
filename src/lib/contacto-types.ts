/**
 * Tipos y constantes del formulario de contacto.
 *
 * Módulo PURO a propósito: lo comparten el Client Component
 * (`src/components/sections/ContactForm.tsx`) y la server action
 * (`src/app/contacto/actions.ts`). Un valor exportado desde un módulo
 * `"use client"` no se puede leer en el servidor, y un módulo `"use server"`
 * solo puede exportar funciones asíncronas: los nombres de los campos y los
 * límites tienen que vivir en un tercer sitio para que las dos mitades hablen
 * exactamente del mismo formulario.
 */

/** Campos visibles del formulario (los que pueden mostrar un error). */
export type CampoContacto =
  | "nombre"
  | "empresa"
  | "correo"
  | "telefono"
  | "mensaje";

export type ErroresContacto = Partial<Record<CampoContacto, string>>;

/**
 * Por dónde quedó a salvo el mensaje. Determina el matiz del texto de éxito.
 *
 *  - `correo`    → el servidor SMTP aceptó el correo. Caso ideal.
 *  - `registro`  → el correo no pudo salir, PERO el mensaje quedó guardado en
 *                  la base de datos (`site_mensajes`) y GPI lo va a ver. Para
 *                  el visitante sigue siendo un éxito —su mensaje llegó— y por
 *                  eso se le dice "Recibimos tu mensaje" en vez de "fue
 *                  enviado": es lo que de verdad ocurrió.
 *  - `navegador` → lo pone el CLIENTE cuando abrió el compositor de Gmail; el
 *                  servidor nunca devuelve este valor.
 */
export type ViaContacto = "correo" | "registro" | "navegador";

/**
 * Resultado del envío, tipado por casos para que la interfaz no tenga que
 * adivinar qué pasó:
 *
 *  - `inicial`     → todavía no se ha intentado nada.
 *  - `exito`       → el mensaje está a salvo (`via` dice dónde), o era spam y
 *                    se descartó en silencio.
 *  - `invalido`    → faltan datos o están mal escritos; `errores` dice cuáles.
 *  - `error-envio` → los datos estaban bien pero el mensaje no quedó en
 *                    ninguna parte: ni correo ni base de datos. Es el único
 *                    caso en el que la interfaz insiste con las alternativas
 *                    (Gmail, programa de correo, WhatsApp), porque es el único
 *                    en el que el mensaje se habría perdido.
 */
export type EstadoContacto =
  | { estado: "inicial" }
  | { estado: "exito"; mensaje: string; via: ViaContacto }
  | { estado: "invalido"; mensaje: string; errores: ErroresContacto }
  | { estado: "error-envio"; mensaje: string };

export const estadoContactoInicial: EstadoContacto = { estado: "inicial" };

/**
 * Longitudes máximas aceptadas. Se validan en el servidor (el `maxLength` del
 * navegador es comodidad, no una barrera) y su función es doble: cortar
 * mensajes absurdos de robots y evitar correos de megabytes.
 */
export const LIMITES_CONTACTO = {
  nombre: 120,
  empresa: 140,
  correo: 200,
  /**
   * 30 caracteres dan de sobra para el número más largo que se escribe en
   * Colombia con separadores («+57 (602) 555 5555») sin dejar sitio a que
   * alguien use el campo como segundo mensaje.
   */
  telefono: 30,
  mensaje: 4000,
} as const;

/* ------------------------------------------------------------------ */
/* Teléfono                                                            */
/* ------------------------------------------------------------------ */

/**
 * Caracteres admitidos en un número de teléfono: dígitos y los separadores que
 * la gente escribe de verdad (espacios, `+`, guiones, paréntesis y puntos).
 * Todo lo demás —letras, comas, saltos de línea— se rechaza.
 */
const CARACTERES_TELEFONO = /^[0-9+()\-.\s]+$/;

/** Cantidad de DÍGITOS aceptada una vez quitados los separadores. */
export const DIGITOS_TELEFONO = { minimo: 7, maximo: 20 } as const;

/**
 * ¿Parece un teléfono? Validación DELIBERADAMENTE LAXA.
 *
 * El formulario lo llena gente de todo tipo y el objetivo es poder devolver la
 * llamada, no imponer un formato: tienen que pasar tanto un fijo de Cali
 * («602 555 5555») como un celular con indicativo («+57 318 434 1249») o un
 * número internacional. Por eso solo se comprueban dos cosas: que no haya
 * caracteres raros y que la cantidad de dígitos sea razonable. Un teléfono
 * escrito con un dígito de menos no lo detecta ninguna expresión regular; para
 * eso está el correo, que se valida aparte.
 */
export function esTelefonoValido(valor: string): boolean {
  const limpio = valor.trim();
  if (limpio === "" || !CARACTERES_TELEFONO.test(limpio)) return false;

  const digitos = limpio.replace(/\D/g, "").length;
  return (
    digitos >= DIGITOS_TELEFONO.minimo && digitos <= DIGITOS_TELEFONO.maximo
  );
}

/** Mensaje único para un teléfono mal escrito (mismo texto en las dos mitades). */
export const ERROR_TELEFONO =
  "Ese teléfono no parece válido. Escríbelo con indicativo, por ejemplo: +57 318 434 1249";

/**
 * Nombres de los campos anti-robot. Están aquí para que el formulario y la
 * acción no se desincronicen nunca.
 *
 * - `CAMPO_TRAMPA` (honeypot): campo oculto que una persona jamás ve ni puede
 *   enfocar. Los robots que rellenan todo lo que encuentran caen aquí.
 * - `CAMPO_MONTADO` / `CAMPO_ENVIADO`: dos marcas de tiempo tomadas con el
 *   MISMO reloj del visitante (al montar el formulario y al pulsar enviar). El
 *   servidor solo resta una de otra, así que un reloj mal puesto en el
 *   computador del visitante no descarta su mensaje; comparar contra la hora
 *   del servidor sí lo haría.
 */
export const CAMPO_TRAMPA = "sitio-web";
export const CAMPO_MONTADO = "montado-en";
export const CAMPO_ENVIADO = "enviado-en";

/** Tiempo mínimo, en milisegundos, entre que el formulario aparece y se envía. */
export const MS_MINIMOS_DILIGENCIADO = 3000;

/**
 * Asunto del correo. Se usa en el servidor (correo real) y en el cliente
 * (enlaces a Gmail y `mailto:`), y tiene que ser el mismo texto en los dos
 * sitios: GPI filtra su bandeja por él.
 */
export function asuntoContacto(nombre: string, empresa: string): string {
  const quien = nombre.trim() || "Sitio web";
  const donde = empresa.trim();
  return `Contacto desde el sitio web — ${quien}${donde ? ` (${donde})` : ""}`;
}

/**
 * Cuerpo del mensaje en texto plano.
 *
 * Lo comparten el correo que envía el servidor y los enlaces de respaldo
 * (Gmail y `mailto:`), para que GPI reciba siempre la misma ficha, venga por
 * donde venga. `salto` existe porque los clientes de correo esperan CRLF y las
 * URLs `mailto:` lo codifican como `%0D%0A`.
 */
export function cuerpoContacto(
  datos: {
    nombre: string;
    empresa: string;
    correo: string;
    telefono: string;
    mensaje: string;
  },
  opciones: { salto?: string; fecha?: string } = {},
): string {
  const salto = opciones.salto ?? "\n";
  return [
    `Nombre: ${datos.nombre.trim()}`,
    datos.empresa.trim() ? `Empresa: ${datos.empresa.trim()}` : null,
    `Correo: ${datos.correo.trim()}`,
    // El teléfono es obligatorio en el formulario, pero esta función también
    // arma los enlaces de respaldo mientras la persona escribe: si todavía no
    // lo ha puesto, la línea sencillamente no sale.
    datos.telefono.trim() ? `Teléfono: ${datos.telefono.trim()}` : null,
    opciones.fecha ? `Fecha: ${opciones.fecha}` : null,
    "",
    "Mensaje:",
    datos.mensaje.trim(),
    "",
    "—",
    "Enviado desde el formulario de contacto de gpiprofesionales.com",
  ]
    .filter((linea): linea is string => linea !== null)
    .join(salto);
}
