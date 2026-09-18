import Link from "next/link";
import type { ReactNode } from "react";
import { PuntoDeCarga } from "./PuntoDeCarga";
import { ArrowRight } from "@/lib/icons";
import { AyudaSeccion } from "./ui-base";

/**
 * SISTEMA DE COMPONENTES DEL PANEL
 * ================================
 * Aquí viven los TEXTOS de ayuda reutilizados y las piezas que dependen de
 * `next/link` (cabecera de sección, tarjetas del hub, botones de volver), que
 * son para Server Components.
 *
 * Los campos, insignias, tarjetas y notas de ayuda se mudaron a `./ui-base`
 * —que sí lleva `"use client"`— y se REEXPORTAN desde aquí, así que ningún
 * `import` existente cambió. La razón está explicada a fondo en ese archivo, y
 * es importante: **un componente de cliente debe importarlas de `./ui-base`,
 * nunca de aquí**, porque arrastrar este módulo al navegador deja colgadas las
 * server actions de esa pantalla EN PRODUCCIÓN (el botón se queda en
 * «Guardando…» aunque el dato ya se haya guardado en la base de datos).
 */
export * from "./ui-base";

/* ------------------------------------------------------------------ */
/* Ayuda para personas no técnicas                                     */
/* ------------------------------------------------------------------ */

/**
 * TEXTOS DE AYUDA REUTILIZADOS
 * ----------------------------
 * Viven aquí (y no repetidos en cada pantalla) para que digan siempre lo mismo.
 * Están escritos en español llano, sin jerga: quien usa el panel no es técnico.
 */
/** Cuánto tarda en verse un cambio en el sitio público. */
export const AYUDA_PUBLICACION =
  "Lo que guardes aquí se ve en el sitio en pocos minutos.";

/** Qué hace el campo "Orden" (aparece en servicios, proyectos, clientes, FAQ y valores). */
export const AYUDA_ORDEN =
  "El número controla la posición: el más bajo aparece primero.";

/** Diferencia entre ocultar y eliminar. */
export const AYUDA_VISIBILIDAD =
  "Ocultar es reversible y no borra nada: el contenido se conserva aquí y puedes volver a mostrarlo cuando quieras. Eliminar sí es permanente. Para retirar algo del sitio de forma temporal, oculta.";

/** Qué es el texto alternativo de una imagen y por qué importa. */
export const AYUDA_ALT =
  "Describe en pocas palabras lo que se ve en la foto. Lo leen en voz alta los programas que usan las personas con discapacidad visual y le sirve a Google para entender la imagen.";

/**
 * Recomendación práctica para las imágenes.
 *
 * Las dos vías funcionan y ninguna es «la de verdad»: subir el archivo lo
 * guarda en el almacenamiento del propio sitio, y pegar una URL sirve para
 * imágenes que ya están publicadas en internet. Cloudinary se nombra por su
 * nombre porque «pega una URL» a secas no le dice nada a quien nunca ha
 * alojado una imagen, y porque es uno de los servicios que el sitio tiene
 * autorizados (ver `src/lib/imagenes.ts` y `next.config.ts`).
 */
export const AYUDA_IMAGEN =
  "Sube la imagen desde tu computador (se guarda en el almacenamiento del sitio) o pega una URL. Recomendación: sube tus imágenes a Cloudinary (cloudinary.com, gratuito) y pega aquí la URL que te da — así tus imágenes quedan organizadas en tu propia cuenta. Lo ideal son fotos horizontales (más anchas que altas) y de menos de 1 MB: si pesan mucho, el sitio carga lento.";

/** Qué hace el bloque de video de un servicio (migración 0007). */
export const AYUDA_VIDEO_SERVICIO =
  "Pega el enlace de YouTube. El video aparece en la página del servicio con su título y descripción; el interruptor «Mostrar el video» empieza apagado: enciéndelo cuando el enlace esté listo para publicarse.";

/* --- Calendario interno (migración 0010) -------------------------- */

/** Para qué sirve el calendario y quién lo ve. */
export const AYUDA_CALENDARIO =
  "El calendario es la agenda interna de GPI: aquí se programa lo que hay que hacer, con su día, su hora y sus responsables. Solo lo ven el administrador y el coordinador; cada persona ve únicamente los eventos que le asignaron, en su Mi Cuenta.";

/** Qué significa cada estado de un evento. */
export const AYUDA_CALENDARIO_ESTADOS =
  "Todo evento nace «programado». Cuando pase el día, ciérralo: «cumplido» si salió completo, «incompleto» si no salió o quedó a medias, o «aplázalo» a otra fecha si se corrió. Un evento aplazado se mueve al día nuevo, sigue pendiente por hacer y el calendario recuerda para cuándo estaba al principio. Aplazar es mover la actividad HACIA ADELANTE: la fecha nueva tiene que ser posterior a la que el evento tiene ahora. Si te equivocaste al aplazar, el botón «Devolver a su fecha original» deshace el movimiento: el evento vuelve a su día de siempre y queda otra vez programado. Cada evento muestra solo los botones que tienen sentido en su estado: uno ya cumplido no se aplaza (si en realidad no se hizo, reábrelo primero), «Reabrir» solo aparece en los ya cerrados y «Devolver a su fecha original» solo en los que siguen abiertos y alguna vez se movieron —en uno ya cerrado esa fecha es parte de su historia y no se toca—. Reabrir un evento que alguna vez se movió lo devuelve a «aplazado», no a «programado»: sigue abierto, pero en un día distinto al original.";

/** Diferencia entre marcar incompleto y eliminar (mismo espíritu que rechazar ≠ eliminar). */
export const AYUDA_CALENDARIO_ELIMINAR =
  "Marcar como incompleto NO es eliminar: lo primero deja constancia de que la actividad no salió, con sus notas; lo segundo borra el evento y su historia para siempre. Elimina solo los eventos de prueba o los creados por error.";

/** Para qué son las notas y quién las escribe. */
export const AYUDA_CALENDARIO_NOTAS =
  "Las notas son el seguimiento de cada evento: qué se hizo, qué faltó o por qué se movió de fecha. Las puede escribir un manager o cualquier responsable del evento desde su Mi Cuenta, y quedan firmadas con su nombre y su fecha. No se ven en la cuadrícula del calendario: se leen aquí y dentro de cada evento.";

/** Cómo funcionan los responsables, incluidos los externos. */
export const AYUDA_CALENDARIO_RESPONSABLES =
  "Un evento puede tener varios responsables: cuentas del portal —a quienes les aparece en Mi Cuenta y pueden dejar notas— y personas externas (un contratista, el contacto del cliente) cuyo nombre se escribe a mano con la opción «Otro». Los externos quedan registrados, pero no reciben acceso al sistema.";

/** Qué es el apodo de una cuenta y quién puede cambiarlo (migración 0010). */
export const AYUDA_APODO =
  "Nombre corto con el que se identifica a la persona en el calendario y en las tablas (por ejemplo, «YC» para Yeison Camacho). Solo lo puede cambiar un administrador; donde hay espacio se sigue mostrando el nombre completo.";

/**
 * Recordatorio de guardar — el aviso que más falta hacía.
 *
 * GPI perdía cambios porque el panel guarda BLOQUE A BLOQUE y el único aviso
 * que lo decía estaba al pie de la columna lateral, donde nadie mira mientras
 * escribe. Ahora es una constante y se pinta ARRIBA de cada pantalla de
 * contenido, antes de cualquier formulario.
 */
export const AYUDA_GUARDAR_BLOQUES =
  "Los cambios NO se aplican hasta que pulses «Guardar» en el bloque que editaste.";

/**
 * Aviso de guardado, en ámbar, para la cabecera de las pantallas del panel.
 *
 * UNO POR PANTALLA, nunca uno por bloque: repetirlo junto a cada botón lo
 * convertiría en ruido que se deja de leer, que es justo lo que pasó con el
 * texto de la barra lateral.
 */
export function AvisoGuardar({
  className = "mb-6",
  unico = false,
}: {
  className?: string;
  /**
   * true = la pantalla es UN formulario con un solo botón al final (crear o
   * editar un servicio). Decirle a alguien que "cada bloque tiene su botón"
   * donde solo hay uno lo mandaría a buscar botones que no existen.
   */
  unico?: boolean;
}) {
  return (
    <AyudaSeccion tono="aviso" title="Recuerda guardar" className={className}>
      {unico ? (
        <>
          Esta pantalla se guarda con <strong>un solo botón</strong>, al final
          del formulario. {AYUDA_GUARDAR_BLOQUES} Si sales sin guardar, lo
          escrito se pierde.
        </>
      ) : (
        <>
          Esta pantalla guarda <strong>bloque a bloque</strong>: cada tarjeta
          tiene su propio botón. {AYUDA_GUARDAR_BLOQUES} Si cambias de sección
          sin guardar, lo escrito se pierde. Lo que sí guardes se ve en el sitio
          en pocos minutos.
        </>
      )}
    </AyudaSeccion>
  );
}

/* ------------------------------------------------------------------ */
/* Enlaces / botones de navegación                                     */
/* ------------------------------------------------------------------ */

/** Botón "← Volver a …" usado en cabeceras y formularios del panel. */
export function BackLink({
  href,
  label,
  className = "",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark ${className}`}
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}

export function PrimaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      prefetch={false}
      href={href}
      className={`inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Cabecera de una sección del panel: título, descripción, breadcrumb con
 * "← Volver al dashboard" y acción principal opcional.
 */
export function AdminPageHeader({
  title,
  description,
  backHref = "/admin",
  backLabel = "Volver al dashboard",
  breadcrumb,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  breadcrumb?: { label: string; href?: string }[];
  action?: ReactNode;
}) {
  return (
    <header className="mb-7">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink href={backHref} label={backLabel} />
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Ruta del panel">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-graphite">
              {breadcrumb.map((crumb, i) => (
                <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                  {crumb.href ? (
                    <Link
                      prefetch={false}
                      href={crumb.href}
                      className="transition-colors hover:text-brand-dark"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-soft">{crumb.label}</span>
                  )}
                  {i < breadcrumb.length - 1 && <span aria-hidden="true">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}

/**
 * Tarjeta de acceso a una sección del panel.
 *
 * La comparten el dashboard (`/admin`) y el índice de contenido
 * (`/admin/contenido`): las dos pantallas son rejillas de tarjetas iguales y
 * tenerlas duplicadas garantizaba que acabaran diferenciándose sin querer.
 *
 * `prefetch={false}`, como toda la navegación del panel: ver la nota larga en
 * `AdminShell`. Una rejilla de ocho tarjetas visibles a la vez era, con el
 * prefetch por defecto, ocho peticiones simultáneas a rutas `force-dynamic`.
 */
export function SeccionCard({
  href,
  label,
  icon: Icon,
  count = null,
  unit = "",
  description,
  destacada = false,
}: {
  href: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  count?: number | null;
  unit?: string;
  description: string;
  destacada?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card ${
        destacada ? "border-brand/30" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-deep transition-colors group-hover:bg-brand-deep group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        {count !== null && (
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
            {count} {unit}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-ink group-hover:text-brand-dark">
        {label}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-graphite">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
        Administrar
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        {/* Igual que en el menú lateral: la ruta es dinámica y el clic tarda
            en verse. Sin este punto, la tarjeta parece no responder. */}
        <PuntoDeCarga className="ml-1" />
      </span>
    </Link>
  );
}

export function NextStepLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-dark transition-colors hover:text-brand-dark"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
