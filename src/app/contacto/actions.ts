"use server";

/**
 * SERVER ACTION — Formulario de contacto (/contacto)
 * ==================================================
 * Recibe el mensaje del visitante, lo GUARDA en la base de datos y lo ENVÍA
 * por correo al buzón corporativo de GPI. Antes se armaba un `mailto:` en el
 * navegador; GPI probó el sitio y reportó que "no abre nada", que es
 * exactamente lo que pasa en un computador sin programa de correo configurado.
 *
 * ORDEN DE LAS OPERACIONES — Y POR QUÉ ESE ORDEN
 * ----------------------------------------------
 *   1. Filtros anti-robot.
 *   2. Validación de los campos.
 *   3. **Guardar en `site_mensajes`** (clave service-role).
 *   4. Enviar el correo por SMTP.
 *   5. Marcar la fila como enviada si el correo salió.
 *
 * Se guarda ANTES de enviar porque el correo es la parte frágil: la contraseña
 * de aplicación de Google se puede vencer, Gmail puede cortar, el mensaje
 * puede caer en spam. Si el guardado funciona, **el mensaje ya no se pierde**
 * aunque el correo falle, y el visitante recibe una confirmación honesta
 * ("Recibimos tu mensaje") en lugar de un error que lo mandaría a la
 * competencia.
 *
 * SEGURIDAD — ESTO ES UN ENDPOINT PÚBLICO
 * ---------------------------------------
 * Una server action se invoca con un POST contra la página; cualquiera que
 * sepa mandar ese POST llega aquí, sin pasar por el formulario. Por eso:
 *
 *  1. **El destinatario NUNCA viene del cliente.** Sale de los ajustes del
 *     servidor (`site_settings.contact.correoFormulario`, editable en
 *     /admin/ajustes). Si viniera en el formulario, esta acción sería un relay
 *     abierto: cualquiera podría enviar correo a quien quisiera firmado por la
 *     cuenta de GPI.
 *  2. **Todo se valida aquí**, no en el navegador. Los `required` y los
 *     `maxLength` del formulario son comodidad para la persona, no una
 *     barrera.
 *  3. **Las credenciales SMTP no salen del servidor.** La página pública solo
 *     recibe un booleano (`smtpConfigurado`), jamás el usuario ni la clave.
 *
 * ANTI-SPAM SIN SERVICIOS DE TERCEROS
 * -----------------------------------
 * Tres filtros baratos, ninguno con captcha ni dependencias externas:
 *
 *  - **Campo trampa (honeypot)**: un campo oculto que una persona no ve ni
 *    puede enfocar. Si llega con algo escrito, el mensaje se descarta **en
 *    silencio** y se responde "éxito": un robot que recibe un error reintenta;
 *    uno que recibe éxito se va contento.
 *  - **Tiempo mínimo de diligenciado**: se restan dos marcas tomadas con el
 *    reloj del propio visitante (al montar el formulario y al enviarlo). Menos
 *    de 3 segundos = autorrelleno.
 *  - **Longitudes máximas** por campo, para no reenviar novelas.
 *
 * Además hay un limitador por IP, deliberadamente sencillo (ver más abajo).
 */

import { headers } from "next/headers";
import { esCorreoValido } from "@/data/site";
import { getSettings } from "@/lib/content";
import { enviarCorreoContacto, smtpContactoConfigurado } from "@/lib/correo";
import { getServiceRoleSupabase } from "@/lib/supabase/admin";
import {
  CAMPO_ENVIADO,
  CAMPO_MONTADO,
  CAMPO_TRAMPA,
  ERROR_TELEFONO,
  LIMITES_CONTACTO,
  MS_MINIMOS_DILIGENCIADO,
  esTelefonoValido,
  type ErroresContacto,
  type EstadoContacto,
} from "@/lib/contacto-types";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function texto(formData: FormData, clave: string): string {
  const valor = formData.get(clave);
  return typeof valor === "string" ? valor.trim() : "";
}

function numero(formData: FormData, clave: string): number | null {
  const valor = Number(texto(formData, clave));
  return Number.isFinite(valor) ? valor : null;
}

/** Respuesta que ve un robot descartado: la misma que un envío correcto. */
const DESCARTE_SILENCIOSO: EstadoContacto = {
  estado: "exito",
  via: "correo",
  mensaje:
    "✅ Tu mensaje fue enviado. Te responderemos pronto al correo que nos dejaste.",
};

const invalido = (errores: ErroresContacto, mensaje: string): EstadoContacto => ({
  estado: "invalido",
  mensaje,
  errores,
});

const errorEnvio = (mensaje: string): EstadoContacto => ({
  estado: "error-envio",
  mensaje,
});

/* ------------------------------------------------------------------ */
/* Limitador por IP (best-effort)                                      */
/* ------------------------------------------------------------------ */

/**
 * Tope de envíos por IP y ventana de tiempo.
 *
 * Vive en memoria del proceso a propósito: en Vercel cada instancia tiene la
 * suya y se pierde al reciclarse. **No es una defensa fuerte** —para eso haría
 * falta Redis o un servicio— pero corta en seco el caso real que importa: un
 * robot martillando el formulario y llenando la bandeja de GPI en un minuto.
 * Una persona normal no envía 5 mensajes en 10 minutos.
 */
const TOPE_POR_VENTANA = 5;
const VENTANA_MS = 10 * 60 * 1000;
const envios = new Map<string, number[]>();

async function ipDelVisitante(): Promise<string> {
  const h = await headers();
  const reenviada = h.get("x-forwarded-for");
  // `x-forwarded-for` puede traer varias IPs; la primera es la del cliente.
  return (reenviada?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

function superaElTope(ip: string): boolean {
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);

  if (recientes.length >= TOPE_POR_VENTANA) {
    envios.set(ip, recientes);
    return true;
  }

  recientes.push(ahora);
  envios.set(ip, recientes);

  // Barrido perezoso para que el mapa no crezca sin fin en un proceso longevo.
  if (envios.size > 500) {
    for (const [clave, marcas] of envios) {
      if (marcas.every((t) => ahora - t >= VENTANA_MS)) envios.delete(clave);
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Guardado en `site_mensajes`                                         */
/* ------------------------------------------------------------------ */

interface DatosMensaje {
  nombre: string;
  empresa: string;
  correo: string;
  telefono: string;
  mensaje: string;
}

/**
 * ¿El error de Supabase significa "esa tabla todavía no existe"?
 *
 * Mismo principio que el resto del proyecto (`faltaColumnaDesglose`,
 * `rechazaOrdenVacia`): el código funciona con migraciones sin aplicar. Si la
 * 0006 no se ha ejecutado, el formulario sigue enviando el correo como si nada
 * y solo se pierde el respaldo en base de datos.
 *
 * 42P01 = undefined_table · PGRST205 = PostgREST no encuentra la tabla.
 */
function faltaTablaMensajes(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  const code = error.code ?? "";
  if (code === "42P01" || code === "PGRST205" || code === "PGRST204") return true;
  return /site_mensajes/i.test(error.message ?? "");
}

/**
 * ¿El error viene de que la COLUMNA `telefono` todavía no existe (migración
 * 0009 sin aplicar)?
 *
 * Mismo patrón que `saveService` con la columna `video`: se intenta guardar
 * todo y, si la columna nueva no está, se reintenta sin ella. El mensaje queda
 * igualmente respaldado —solo que sin el teléfono en la tabla, que de todos
 * modos viaja dentro del correo.
 *
 * 42703 = undefined_column (Postgres) · PGRST204 = columna ausente del caché de
 * esquema de PostgREST.
 */
function faltaColumnaTelefono(error: {
  code?: string | null;
  message?: string | null;
}): boolean {
  const code = error.code ?? "";
  if (code === "42703" || code === "PGRST204") return true;
  return /telefono/i.test(error.message ?? "");
}

/**
 * Para no repetir el mismo aviso en cada mensaje: se anota una vez por
 * proceso. No es un error —el sitio funciona igual— pero quien mire los
 * registros de Vercel merece saber por qué no hay respaldo de los mensajes.
 */
let avisadaTablaFaltante = false;
/** Igual, para la columna `telefono` de la 0009. */
let avisadaColumnaTelefono = false;

/**
 * Guarda el mensaje y devuelve el id de la fila, o `null` si no se pudo
 * guardar (falta la clave service-role, falta la migración 0006 o la base de
 * datos no responde). **Nunca lanza**: el guardado es un respaldo, no puede
 * ser el motivo por el que un prospecto se quede sin escribir.
 */
async function guardarMensaje(
  datos: DatosMensaje,
  correoDestino: string,
): Promise<string | null> {
  // Se usa la clave service-role porque `site_mensajes` NO tiene política de
  // INSERT para anon: si la tuviera, cualquiera podría llenar la tabla desde
  // la API REST de Supabase saltándose el formulario y sus filtros.
  const supabase = getServiceRoleSupabase();
  if (!supabase) return null;

  const fila = {
    nombre: datos.nombre,
    empresa: datos.empresa === "" ? null : datos.empresa,
    correo: datos.correo,
    mensaje: datos.mensaje,
    correo_destino: correoDestino,
    enviado: false,
  };

  const insertar = (valores: Record<string, unknown>) =>
    supabase.from("site_mensajes").insert(valores).select("id").single();

  try {
    let { data, error } = await insertar({ ...fila, telefono: datos.telefono });

    // Migración 0009 sin aplicar: se guarda el mensaje sin el teléfono en vez
    // de perder el respaldo entero. El teléfono sigue llegando en el correo.
    if (error && faltaColumnaTelefono(error)) {
      if (!avisadaColumnaTelefono) {
        avisadaColumnaTelefono = true;
        console.warn(
          "[contacto] La columna site_mensajes.telefono no existe todavía (migración 0009 pendiente): los mensajes se guardan sin el teléfono, que igual viaja en el correo.",
        );
      }
      ({ data, error } = await insertar(fila));
    }

    if (error) {
      if (faltaTablaMensajes(error)) {
        if (!avisadaTablaFaltante) {
          avisadaTablaFaltante = true;
          console.warn(
            "[contacto] La tabla site_mensajes no existe todavía (migración 0006 pendiente): los mensajes se envían por correo pero no se guardan como respaldo.",
          );
        }
      } else {
        console.error("[contacto] No se pudo guardar el mensaje:", error.message);
      }
      return null;
    }

    return typeof data?.id === "string" ? data.id : null;
  } catch (error) {
    console.error("[contacto] Error inesperado al guardar el mensaje:", error);
    return null;
  }
}

/** Marca la fila como "el correo sí salió". Silencioso si falla: es informativo. */
async function marcarEnviado(id: string): Promise<void> {
  const supabase = getServiceRoleSupabase();
  if (!supabase) return;
  try {
    await supabase.from("site_mensajes").update({ enviado: true }).eq("id", id);
  } catch {
    /* El correo ya salió; que la marca no se escriba no cambia nada para nadie. */
  }
}

/* ------------------------------------------------------------------ */
/* La acción                                                           */
/* ------------------------------------------------------------------ */

export async function enviarMensajeContacto(
  formData: FormData,
): Promise<EstadoContacto> {
  /* --- 1. Filtros anti-robot, antes de tocar nada más --------------- */

  // Campo trampa relleno = robot. Silencio y "éxito".
  if (texto(formData, CAMPO_TRAMPA) !== "") return DESCARTE_SILENCIOSO;

  const montado = numero(formData, CAMPO_MONTADO);
  const enviado = numero(formData, CAMPO_ENVIADO);
  const transcurrido = montado !== null && enviado !== null ? enviado - montado : null;

  // Las dos marcas salen del mismo reloj del visitante, así que restarlas es
  // inmune a que tenga la hora mal puesta. Si no llegan, el POST no vino del
  // formulario de esta página.
  if (transcurrido === null || transcurrido < MS_MINIMOS_DILIGENCIADO)
    return DESCARTE_SILENCIOSO;

  /* --- 2. Validación de los campos ---------------------------------- */

  const nombre = texto(formData, "nombre");
  const empresa = texto(formData, "empresa");
  const correo = texto(formData, "correo");
  const telefono = texto(formData, "telefono");
  const mensaje = texto(formData, "mensaje");

  const errores: ErroresContacto = {};

  if (nombre === "") errores.nombre = "Escribe tu nombre.";
  else if (nombre.length > LIMITES_CONTACTO.nombre)
    errores.nombre = `El nombre no puede pasar de ${LIMITES_CONTACTO.nombre} caracteres.`;

  if (empresa.length > LIMITES_CONTACTO.empresa)
    errores.empresa = `El nombre de la empresa no puede pasar de ${LIMITES_CONTACTO.empresa} caracteres.`;

  if (correo === "") errores.correo = "Escribe tu correo electrónico.";
  else if (correo.length > LIMITES_CONTACTO.correo)
    errores.correo = `El correo no puede pasar de ${LIMITES_CONTACTO.correo} caracteres.`;
  else if (!esCorreoValido(correo))
    errores.correo =
      "Ese correo no parece válido. Escríbelo completo, por ejemplo: nombre@empresa.com";

  // Teléfono OBLIGATORIO desde el 13/08/2026: GPI prefiere devolver la llamada
  // antes que abrir un hilo de correos. La comprobación es laxa a propósito
  // (ver `esTelefonoValido`): tienen que pasar un fijo de Cali y un celular con
  // indicativo internacional por igual.
  if (telefono === "") errores.telefono = "Escribe tu número de teléfono.";
  else if (telefono.length > LIMITES_CONTACTO.telefono)
    errores.telefono = `El teléfono no puede pasar de ${LIMITES_CONTACTO.telefono} caracteres.`;
  else if (!esTelefonoValido(telefono)) errores.telefono = ERROR_TELEFONO;

  if (mensaje === "") errores.mensaje = "Cuéntanos brevemente qué necesitas.";
  else if (mensaje.length > LIMITES_CONTACTO.mensaje)
    errores.mensaje = `El mensaje no puede pasar de ${LIMITES_CONTACTO.mensaje} caracteres. Resúmelo y con gusto ampliamos por correo.`;

  if (Object.keys(errores).length > 0)
    return invalido(errores, "Revisa los campos marcados y vuelve a intentarlo.");

  /* --- 3. Tope por IP ----------------------------------------------- */

  if (superaElTope(await ipDelVisitante()))
    return errorEnvio(
      "Recibimos varios mensajes tuyos hace un momento. Espera unos minutos o escríbenos por WhatsApp si es urgente.",
    );

  /* --- 4. Guardar SIEMPRE (aunque no haya SMTP) --------------------- */

  // El destinatario sale de los ajustes del SERVIDOR, jamás del formulario.
  const { contact } = await getSettings();
  const datos: DatosMensaje = { nombre, empresa, correo, telefono, mensaje };

  const idMensaje = await guardarMensaje(datos, contact.correoFormulario);

  /* --- 5. Enviar el correo ------------------------------------------ */

  if (!smtpContactoConfigurado()) {
    // Sin credenciales SMTP no hay correo que enviar. Si el mensaje quedó
    // guardado, para el visitante el resultado es bueno: GPI lo tiene.
    return idMensaje
      ? {
          estado: "exito",
          via: "registro",
          mensaje:
            "✅ Recibimos tu mensaje y ya está en nuestra bandeja. Te responderemos pronto al correo que nos dejaste.",
        }
      : errorEnvio(
          "El envío directo no está disponible en este momento. Puedes escribirnos con cualquiera de las opciones de aquí abajo.",
        );
  }

  try {
    await enviarCorreoContacto(contact.correoFormulario, datos);
  } catch (error) {
    // El detalle técnico se queda en los registros del servidor (útil para
    // diagnosticar una contraseña de aplicación vencida); al visitante se le
    // dice qué hacer, no qué falló.
    console.error("[contacto] No se pudo enviar el correo:", error);

    return idMensaje
      ? {
          estado: "exito",
          via: "registro",
          mensaje:
            "✅ Recibimos tu mensaje y ya está en nuestra bandeja. Te responderemos pronto al correo que nos dejaste.",
        }
      : errorEnvio(
          "No pudimos enviar tu mensaje en este momento. Escríbenos con cualquiera de estas opciones y te respondemos igual de rápido.",
        );
  }

  if (idMensaje) await marcarEnviado(idMensaje);

  return {
    estado: "exito",
    via: "correo",
    mensaje:
      "✅ Tu mensaje fue enviado. Te responderemos pronto al correo que nos dejaste.",
  };
}
