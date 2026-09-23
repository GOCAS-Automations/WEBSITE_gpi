"use client";

/**
 * BOTONERA DE REVISIÓN de un permiso (solo managers)
 * ==================================================
 * Gemela de `ReviewActions` de jornadas, con una diferencia de fondo: al
 * aprobar hay que **decidir si se paga**. La casilla llega marcada con lo que
 * pidió el colaborador (`remunerado_solicitado`), pero manda el aprobador, y la
 * pantalla dice en todo momento qué implica cada opción.
 *
 * Tres reglas que se repiten en toda la interfaz:
 *   · **Rechazar ≠ eliminar** — rechazar conserva la solicitud con la nota que
 *     el colaborador lee; eliminar la borra para siempre, con su soporte.
 *   · Aprobar como **no remunerado descuenta** en la nómina: ese día y el
 *     domingo de esa semana.
 *   · **Volver a pendiente** deshace la decisión (y su descuento) sin borrar
 *     nada.
 *
 * Las piezas vienen de `ui-base` y las ayudas de `ayudas.ts`, nunca de
 * `ui.tsx`; toda acción usa `useAccionPanel`.
 */

import { useState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { AlertTriangle, Check, Close, Info, Trash, Undo } from "@/lib/icons";
import { inputClass, useAccionPanel } from "@/components/admin/ui-base";
import { AYUDA_PERMISOS_RECHAZAR } from "@/components/admin/ayudas";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function RevisarPermiso({
  id,
  empleado,
  cuando,
  pidioRemunerado,
  aprobar,
  rechazar,
}: {
  id: string;
  empleado: string;
  /** Texto legible del permiso, para las confirmaciones. */
  cuando: string;
  /** Lo que pidió el colaborador: es solo el valor inicial de la casilla. */
  pidioRemunerado: boolean;
  aprobar: Accion;
  rechazar: Accion;
}) {
  const [aprobarState, aprobarAction, aprobando] = useAccionPanel(aprobar, idleState);
  const [rechazarState, rechazarAction, rechazando] = useAccionPanel(
    rechazar,
    idleState,
  );
  const [remunerado, setRemunerado] = useState(pidioRemunerado);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  const mensaje =
    aprobarState.status === "error"
      ? aprobarState.message
      : rechazarState.status === "error"
        ? rechazarState.message
        : undefined;

  return (
    <div className="space-y-3">
      {/* ---- Aprobar, decidiendo si se paga ---- */}
      <form
        action={aprobarAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `¿Aprobar el permiso de ${empleado} (${cuando})?\n\n${
                remunerado
                  ? "Queda REMUNERADO: no se descuenta nada de su nómina."
                  : "Queda NO REMUNERADO: se le descuenta ese día y el domingo de esa semana en la nómina del período."
              }`,
            )
          ) {
            event.preventDefault();
          }
        }}
        className="space-y-2.5 rounded-2xl border border-line bg-mist/50 p-4"
      >
        <input type="hidden" name="id" value={id} />

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            ¿El permiso se paga?
          </span>
          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 transition-colors hover:border-brand/50">
            {/* Igual que `Switch` de ui-base: el oculto manda «false» cuando el
                interruptor está apagado, para que el servidor lo distinga de
                «no enviado». Aquí es controlado porque el texto de la
                confirmación depende de su valor. */}
            <input type="hidden" name="remunerado" value="false" />
            <input
              type="checkbox"
              name="remunerado"
              value="true"
              checked={remunerado}
              onChange={(e) => setRemunerado(e.target.checked)}
              className="peer relative h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-graphite/30 outline-none transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-white before:shadow-soft before:transition-transform before:content-[''] checked:bg-brand checked:before:translate-x-5 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            />
            <span className="text-sm font-semibold text-graphite peer-checked:hidden">
              No remunerado
            </span>
            <span className="hidden text-sm font-semibold text-brand-dark peer-checked:inline">
              Remunerado
            </span>
          </label>
          <p
            className={`mt-1.5 text-xs leading-relaxed ${
              remunerado ? "text-graphite" : "text-amber-800"
            }`}
          >
            {remunerado
              ? `${empleado} pidió que ${pidioRemunerado ? "sí" : "no"} se le pagara. Aprobado así, no se descuenta nada de su nómina.`
              : "Se descuenta en la nómina del período: ese día y, además, el domingo de esa semana (art. 173 del CST). Un permiso por horas descuenta solo su parte del día."}
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Nota para el colaborador (opcional)
          </span>
          <textarea
            name="nota"
            rows={2}
            maxLength={500}
            placeholder="Ej.: aprobado, recuerda dejar el informe adelantado."
            className={`${inputClass} resize-y`}
          />
        </label>

        <button
          type="submit"
          disabled={aprobando || rechazando}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
          {aprobando
            ? "Aprobando…"
            : `Aprobar ${remunerado ? "y pagar" : "sin pagar"}`}
        </button>
      </form>

      {/* ---- Rechazar ---- */}
      <button
        type="button"
        onClick={() => setMostrarRechazo((v) => !v)}
        disabled={aprobando || rechazando}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Close className="h-4 w-4" />
        {mostrarRechazo ? "Cancelar rechazo" : "Rechazar"}
      </button>

      {mostrarRechazo && (
        <form
          action={rechazarAction}
          className="space-y-2 rounded-2xl border border-red-100 bg-red-50/60 p-4"
        >
          <input type="hidden" name="id" value={id} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Motivo del rechazo <span className="text-red-600">*</span>
            </span>
            <textarea
              name="nota"
              rows={3}
              required
              maxLength={500}
              placeholder="Ej.: esos días ya hay dos personas de permiso; pídelo para la semana siguiente."
              className={`${inputClass} resize-y`}
            />
          </label>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-graphite">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{AYUDA_PERMISOS_RECHAZAR}</span>
          </p>
          <button
            type="submit"
            disabled={rechazando}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {rechazando ? "Rechazando…" : "Confirmar rechazo"}
          </button>
        </form>
      )}

      {mensaje && (
        <p role="alert" className="text-sm text-red-600">
          {mensaje}
        </p>
      )}
    </div>
  );
}

/** Devuelve un permiso ya revisado al estado pendiente (deshace la decisión). */
export function ReabrirPermiso({
  id,
  descontaba,
  action,
}: {
  id: string;
  /** true = estaba aprobado y sin pagar, así que al reabrirlo deja de descontar. */
  descontaba: boolean;
  action: Accion;
}) {
  const [state, formAction, pending] = useAccionPanel(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `¿Devolver este permiso al estado pendiente?\n\nSe borra la decisión anterior (quién revisó, la nota y si era remunerado)${
              descontaba
                ? " y DEJA DE DESCONTARSE en las liquidaciones que sigan en borrador"
                : ""
            }. No se elimina nada.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="inline-flex flex-col items-start"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-brand hover:text-brand-dark disabled:opacity-60"
      >
        <Undo className="h-3.5 w-3.5" />
        {pending ? "Reabriendo…" : "Volver a pendiente"}
      </button>
      {state.status === "error" && state.message && (
        <span className="mt-1 text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}

/**
 * Eliminar un permiso definitivamente (solo managers, cualquier estado).
 *
 * DOBLE BARRERA, igual que al eliminar una jornada: el botón despliega un aviso
 * que explica la diferencia con «Rechazar», y el de confirmación pide además la
 * confirmación del navegador. El servidor vuelve a comprobar el rol.
 */
export function EliminarPermiso({
  id,
  empleado,
  cuando,
  action,
}: {
  id: string;
  empleado: string;
  cuando: string;
  action: Accion;
}) {
  const [state, formAction, pending] = useAccionPanel(action, idleState);
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Trash className="h-3.5 w-3.5" />
        {abierto ? "Cancelar eliminación" : "Eliminar"}
      </button>

      {abierto && (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Vas a eliminar definitivamente el permiso de ${empleado} (${cuando}).\n\nDesaparece del sistema con su soporte, y el colaborador dejará de verlo. Esta acción NO se puede deshacer.\n\n¿Continuar?`,
              )
            ) {
              event.preventDefault();
            }
          }}
          className="max-w-md space-y-2 rounded-2xl border border-red-200 bg-red-50/70 p-4"
        >
          <input type="hidden" name="id" value={id} />
          <p className="flex items-start gap-1.5 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Se elimina para siempre
          </p>
          <p className="text-xs leading-relaxed text-graphite">
            El permiso de <strong>{empleado}</strong> ({cuando}) desaparece del
            sistema, junto con su soporte, y{" "}
            <strong>el colaborador dejará de verlo</strong>. Úsalo solo para
            limpiar registros de prueba o equivocados.
          </p>
          <p className="text-xs leading-relaxed text-graphite">
            Si lo que pasa es que el permiso <strong>no se concede</strong>, usa{" "}
            <strong>Rechazar</strong> con una nota: así queda constancia y él lee
            el motivo.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-60"
          >
            <Trash className="h-3.5 w-3.5" />
            {pending ? "Eliminando…" : "Sí, eliminar definitivamente"}
          </button>
        </form>
      )}

      {state.status === "error" && state.message && (
        <span role="alert" className="text-xs text-red-600">
          {state.message}
        </span>
      )}
    </div>
  );
}
