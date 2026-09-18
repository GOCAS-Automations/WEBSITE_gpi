"use client";

/**
 * DETALLE DE UN EVENTO
 * ====================
 * Lo que se ve al pulsar un evento en el calendario: cuándo es, quién responde,
 * qué hay que hacer, el hilo de notas y —solo para managers— los botones que
 * lo cierran, lo aplazan, lo editan o lo eliminan.
 *
 * CERRAR ≠ ELIMINAR, y aquí hay que decirlo igual que en las jornadas:
 * «Incompleto» deja constancia de que la actividad no salió y conserva sus
 * notas; «Eliminar» borra el evento y su historia. Por eso eliminar pasa por
 * dos barreras (desplegar el aviso rojo y confirmar en el navegador).
 *
 * QUÉ BOTONES SE PINTAN (matriz estado → acciones)
 * ------------------------------------------------
 * | Estado       | Cumplido | Incompleto | Reabrir | Aplazar | Devolver a fecha original | Editar | Eliminar |
 * | ------------ | :------: | :--------: | :-----: | :-----: | :-----------------------: | :----: | :------: |
 * | programado   |    Sí    |     Sí     |   no    |   Sí    |            no             |   Sí   |    Sí    |
 * | aplazado     |    Sí    |     Sí     |   no    |   Sí    |            Sí             |   Sí   |    Sí    |
 * | cumplido     |    no    |     Sí     |   Sí    |   NO    |            NO             |   Sí   |    Sí    |
 * | incompleto   |    Sí    |     no     |   Sí    |   Sí    |            NO             |   Sí   |    Sí    |
 *
 * Lo decide `accionesDisponibles()` de `src/lib/calendario.ts`, que es LA MISMA
 * función que usan las server actions para rechazar lo que no tiene sentido:
 * esconder un botón no es una barrera, solo evita el error. Los casos que
 * importan: un evento **cumplido no se aplaza** (ya se hizo), un evento que
 * sigue abierto **no se reabre** (ya lo está) y un evento ya **cerrado no se
 * devuelve** a su fecha original, porque ahí ese dato es historia.
 *
 * «Reabrir» no siempre devuelve a *programado*: si el evento ya se movió alguna
 * vez (`fechaOriginal`), vuelve a *aplazado*, que es el estado abierto que le
 * corresponde. Así lo que dice esta ficha y lo que cuenta el tablero de
 * métricas nunca se contradicen.
 *
 * APLAZAR SOLO HACIA ADELANTE (18 sep 2026): el campo de fecha lleva `min` = el
 * día siguiente al del evento y la server action rechaza igual cualquier fecha
 * anterior. Para deshacer un aplazamiento está el botón «Devolver a su fecha
 * original», que es la operación inversa.
 */

import { useActionState, useEffect, useState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import { Badge } from "@/components/admin/ui-base";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Close,
  Info,
  Pencil,
  Trash,
  Undo,
  User,
  Users,
} from "@/lib/icons";
import { formatearFechaLarga } from "@/lib/jornada";
import {
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_DESCRIPCIONES,
  EVENTO_ESTADO_LABELS,
  accionesDisponibles,
  formatearMomento,
  formatearRangoHoras,
  nombreCompletoResponsable,
  sumarDiasFecha,
  type EventoRecord,
} from "@/lib/calendario";
import { NotaForm } from "./NotaForm";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export interface AccionesEvento {
  cambiarEstado: Accion;
  aplazar: Accion;
  /** Deshacer el aplazamiento: volver al día original. */
  devolverFechaOriginal: Accion;
  eliminar: Accion;
  agregarNota: Accion;
}

export function EventoDetalle({
  evento,
  acciones,
  puedeAdministrar,
  onEditar,
  onCerrar,
}: {
  evento: EventoRecord;
  acciones: AccionesEvento;
  /** true = manager: ve los botones de cierre, aplazamiento y borrado. */
  puedeAdministrar: boolean;
  onEditar: () => void;
  onCerrar: () => void;
}) {
  // Matriz estado → acciones (ver la cabecera del archivo). La misma función la
  // aplican las server actions, así que esto solo evita el error, no lo impide.
  const permitido = accionesDisponibles(evento);

  return (
    <div className="space-y-6">
      {/* ---------------- Cabecera ---------------- */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={EVENTO_ESTADO_CLASSES[evento.estado]}>
            {EVENTO_ESTADO_LABELS[evento.estado]}
          </Badge>
          <span className="text-xs text-graphite">
            {EVENTO_ESTADO_DESCRIPCIONES[evento.estado]}
          </span>
        </div>

        <div className="grid gap-2 rounded-2xl border border-line bg-mist/60 px-4 py-3 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Calendar className="h-4 w-4 shrink-0 text-brand-dark" />
            {formatearFechaLarga(evento.fecha)}
          </p>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Clock className="h-4 w-4 shrink-0 text-brand-dark" />
            {formatearRangoHoras(evento.horaInicio, evento.horaFin)}
          </p>
        </div>

        {/* Se movió de fecha alguna vez. Si el evento sigue ABIERTO, su estado
            es «Aplazado» (invariante del calendario); si ya se cerró, esto es
            historia: se movió y después se cumplió o quedó incompleto. */}
        {evento.fechaOriginal && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm leading-relaxed text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este evento estaba programado para el{" "}
              <strong>{formatearFechaLarga(evento.fechaOriginal)}</strong> y se
              aplazó
              {evento.estado === "cumplido" || evento.estado === "incompleto"
                ? `; después se cerró como ${EVENTO_ESTADO_LABELS[
                    evento.estado
                  ].toLowerCase()}.`
                : "."}
            </span>
          </p>
        )}
      </div>

      {/* ---------------- Descripción ---------------- */}
      {evento.descripcion && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wide text-graphite">
            Qué hay que hacer
          </h3>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {evento.descripcion}
          </p>
        </section>
      )}

      {/* ---------------- Responsables ---------------- */}
      <section>
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-graphite">
          <Users className="h-3.5 w-3.5" />
          Responsables
        </h3>
        {evento.responsables.length === 0 ? (
          <p className="mt-1.5 text-sm text-graphite">
            Nadie asignado todavía.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {evento.responsables.map((r) => (
              <li key={r.id}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                    r.externo
                      ? "border-line bg-mist text-graphite"
                      : "border-brand/30 bg-brand-tint text-brand-deep"
                  }`}
                >
                  {!r.externo && <User className="h-3.5 w-3.5" />}
                  {nombreCompletoResponsable(r)}
                  {r.cargo && (
                    <span className="font-normal opacity-80">· {r.cargo}</span>
                  )}
                  {r.externo && (
                    <span className="rounded-full bg-white px-1.5 py-px text-[10px] uppercase tracking-wide">
                      Externo
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------- Acciones (solo managers) ---------------- */}
      {puedeAdministrar && (
        <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-graphite">
            Cerrar o mover el evento
          </h3>

          <div className="flex flex-wrap gap-2">
            {permitido.cumplido && (
              <BotonEstado
                action={acciones.cambiarEstado}
                id={evento.id}
                estado="cumplido"
                etiqueta="Marcar cumplido"
                pendienteEtiqueta="Guardando…"
                confirmacion={`¿Marcar «${evento.titulo}» como CUMPLIDO?`}
                className="bg-brand-dark text-white hover:bg-brand-deep"
                icono={<Check className="h-4 w-4" />}
              />
            )}
            {permitido.incompleto && (
              <BotonEstado
                action={acciones.cambiarEstado}
                id={evento.id}
                estado="incompleto"
                etiqueta="Marcar incompleto"
                pendienteEtiqueta="Guardando…"
                confirmacion={`¿Marcar «${evento.titulo}» como INCOMPLETO?\n\nEl evento se queda en el calendario con esa marca. Escribe después una nota explicando qué faltó.`}
                className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                icono={<Close className="h-4 w-4" />}
              />
            )}
            {/* «Reabrir» solo aparece sobre un evento YA CERRADO, y su etiqueta
                dice a dónde vuelve: a «programado» si nunca se movió, o a
                «aplazado» si ya se había movido de fecha. */}
            {permitido.reabrir && (
              <BotonEstado
                action={acciones.cambiarEstado}
                id={evento.id}
                estado="programado"
                etiqueta={
                  permitido.estadoAlReabrir === "aplazado"
                    ? "Reabrir (queda aplazado)"
                    : "Reabrir (queda programado)"
                }
                pendienteEtiqueta="Reabriendo…"
                confirmacion={
                  permitido.estadoAlReabrir === "aplazado"
                    ? `¿Reabrir «${evento.titulo}»?\n\nVuelve a quedar pendiente por hacer. Como este evento ya se movió de fecha alguna vez, queda en estado APLAZADO: sigue abierto, pero en un día distinto al que tenía al principio.`
                    : `¿Reabrir «${evento.titulo}»?\n\nVuelve a quedar PROGRAMADO, es decir, pendiente por hacer.`
                }
                className="border border-line bg-white text-ink-soft hover:border-brand hover:text-brand-dark"
              />
            )}
            <button
              type="button"
              onClick={onEditar}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              <Pencil className="h-4 w-4" />
              Editar datos
            </button>
          </div>

          {/* Deshacer el aplazamiento. Solo aparece si hay algo que deshacer
              (el evento tiene fecha original) y sigue abierto: en uno cerrado
              esa fecha es historia y no se toca. */}
          {permitido.devolverFechaOriginal && evento.fechaOriginal && (
            <BotonDevolverFecha
              action={acciones.devolverFechaOriginal}
              evento={evento}
              fechaOriginal={evento.fechaOriginal}
            />
          )}

          {/* Aplazar: todo menos lo que ya se hizo. Cuando no se puede, en vez
              de dejar un hueco mudo se explica por qué y qué hacer. */}
          {permitido.aplazar ? (
            <FormularioAplazar action={acciones.aplazar} evento={evento} />
          ) : (
            <p className="flex items-start gap-2 rounded-xl border border-line bg-mist/70 px-4 py-2.5 text-xs leading-relaxed text-graphite">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Un evento <strong>cumplido</strong> no se aplaza: ya se hizo. Si
                en realidad no se hizo, <strong>reábrelo</strong> o márcalo como{" "}
                <strong>incompleto</strong> y después muévelo a otra fecha.
              </span>
            </p>
          )}

          <div className="border-t border-line pt-3">
            <BotonEliminar
              action={acciones.eliminar}
              evento={evento}
              onEliminado={onCerrar}
            />
          </div>
        </section>
      )}

      {/* ---------------- Notas ---------------- */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-graphite">
          Notas de seguimiento ({evento.notas.length})
        </h3>

        {evento.notas.length === 0 ? (
          <p className="text-sm text-graphite">
            Todavía no hay notas. Úsalas para dejar constancia de lo que pasó:
            qué se hizo, qué faltó o por qué se movió de fecha.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {evento.notas.map((nota) => (
              <li
                key={nota.id}
                className="rounded-2xl border border-line bg-mist/50 px-4 py-3"
              >
                <p className="text-xs font-semibold text-graphite">
                  {nota.autorNombre} · {formatearMomento(nota.createdAt)}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {nota.texto}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-2xl border border-line bg-white p-4">
          <NotaForm
            eventoId={evento.id}
            action={acciones.agregarNota}
            idCampo={`nota-${evento.id}`}
          />
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas internas                                                     */
/* ------------------------------------------------------------------ */

function BotonEstado({
  action,
  id,
  estado,
  etiqueta,
  pendienteEtiqueta,
  confirmacion,
  className,
  icono,
}: {
  action: Accion;
  id: string;
  estado: string;
  etiqueta: string;
  pendienteEtiqueta: string;
  confirmacion: string;
  className: string;
  icono?: React.ReactNode;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmacion)) event.preventDefault();
      }}
      className="inline-flex flex-col"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={estado} />
      <button
        type="submit"
        disabled={pendiente}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition-colors disabled:pointer-events-none disabled:opacity-60 ${className}`}
      >
        {icono}
        {pendiente ? pendienteEtiqueta : etiqueta}
      </button>
      {state.status === "error" && state.message && (
        <span role="alert" className="mt-1 text-xs text-red-600">
          {state.message}
        </span>
      )}
    </form>
  );
}

/**
 * «Devolver a su fecha original»: deshace el aplazamiento.
 *
 * Un botón suelto con confirmación, no un desplegable con formulario: aquí no
 * hay nada que elegir —el destino es la fecha original— y el texto de la
 * confirmación ya dice a qué día vuelve y en qué estado queda.
 */
function BotonDevolverFecha({
  action,
  evento,
  fechaOriginal,
}: {
  action: Accion;
  evento: EventoRecord;
  fechaOriginal: string;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `¿Devolver «${evento.titulo}» a su fecha original?\n\nVuelve al ${formatearFechaLarga(
              fechaOriginal,
            )}, deja de estar aplazado y queda PROGRAMADO, como si nunca se hubiera movido.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-start"
    >
      <input type="hidden" name="id" value={evento.id} />
      <button
        type="submit"
        disabled={pendiente}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft shadow-soft transition-colors hover:border-brand hover:text-brand-dark disabled:pointer-events-none disabled:opacity-60"
      >
        <Undo className="h-4 w-4" />
        {pendiente ? "Devolviendo…" : "Devolver a su fecha original"}
      </button>
      <p className="mt-1.5 text-xs leading-relaxed text-graphite">
        Deshace el aplazamiento: el evento vuelve al{" "}
        <strong>{formatearFechaLarga(fechaOriginal)}</strong> y queda programado.
      </p>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}

function FormularioAplazar({
  action,
  evento,
}: {
  action: Accion;
  evento: EventoRecord;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);
  const [abierto, setAbierto] = useState(false);

  // Aplazar es mover HACIA ADELANTE: lo más pronto posible es el día siguiente.
  // El navegador ya no deja elegir antes, y la server action lo comprueba igual.
  const minimo = sumarDiasFecha(evento.fecha, 1);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
      >
        <Calendar className="h-4 w-4" />
        {abierto
          ? "Cancelar aplazamiento"
          : evento.estado === "incompleto"
            ? "Reprogramar a otra fecha"
            : "Aplazar a otra fecha"}
      </button>

      {abierto && (
        <form
          action={formAction}
          className="mt-2.5 max-w-md space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
        >
          <input type="hidden" name="id" value={evento.id} />
          <label
            htmlFor={`aplazar-${evento.id}`}
            className="block text-sm font-semibold text-ink"
          >
            Nueva fecha <span className="text-amber-700">*</span>
          </label>
          <input
            id={`aplazar-${evento.id}`}
            type="date"
            name="nueva_fecha"
            required
            min={minimo}
            defaultValue={minimo}
            aria-describedby={`aplazar-ayuda-${evento.id}`}
            className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
          <p
            id={`aplazar-ayuda-${evento.id}`}
            className="text-xs leading-relaxed text-amber-900"
          >
            <strong>Tiene que ser un día posterior</strong> al{" "}
            {formatearFechaLarga(evento.fecha)}: aplazar es mover la actividad
            hacia adelante. El evento se mueve a ese día y queda{" "}
            <strong>aplazado</strong>
            {evento.estado === "incompleto"
              ? ": deja de estar cerrado y vuelve a quedar pendiente por hacer en la fecha nueva."
              : "."}
            {evento.fechaOriginal
              ? ` Ya se había movido antes, así que conserva su fecha original (${formatearFechaLarga(evento.fechaOriginal)}).`
              : ` Se guarda el ${formatearFechaLarga(evento.fecha)} como su fecha original, para que quede constancia de que se movió.`}
          </p>
          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pendiente}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:pointer-events-none disabled:opacity-60"
          >
            {pendiente ? "Aplazando…" : "Confirmar aplazamiento"}
          </button>
        </form>
      )}
    </div>
  );
}

function BotonEliminar({
  action,
  evento,
  onEliminado,
}: {
  action: Accion;
  evento: EventoRecord;
  onEliminado: () => void;
}) {
  const [state, formAction, pendiente] = useActionState(action, idleState);
  const [abierto, setAbierto] = useState(false);

  // El evento ya no existe: quedarse con su ficha abierta mostraría datos de
  // algo borrado. Se cierra desde un efecto, nunca durante el render: avisar al
  // componente padre mientras este se pinta es un error de React.
  useEffect(() => {
    if (state.status === "success") onEliminado();
  }, [state, onEliminado]);

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        disabled={pendiente}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
      >
        <Trash className="h-3.5 w-3.5" />
        {abierto ? "Cancelar eliminación" : "Eliminar evento"}
      </button>

      {abierto && (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Vas a eliminar definitivamente «${evento.titulo}».\n\nDesaparece del calendario junto con sus ${evento.notas.length} nota(s) y sus responsables dejan de verlo. Esta acción NO se puede deshacer.\n\n¿Continuar?`,
              )
            ) {
              event.preventDefault();
            }
          }}
          className="max-w-md space-y-2 rounded-2xl border border-red-200 bg-red-50/70 p-4"
        >
          <input type="hidden" name="id" value={evento.id} />
          <p className="flex items-start gap-1.5 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Se elimina para siempre
          </p>
          <p className="text-xs leading-relaxed text-graphite">
            El evento y <strong>todas sus notas</strong> desaparecen, y sus
            responsables dejan de verlo en Mi Cuenta. Úsalo solo para limpiar
            eventos de prueba o creados por error.
          </p>
          <p className="text-xs leading-relaxed text-graphite">
            Si lo que pasa es que la actividad <strong>no se hizo</strong>,
            márcala como <strong>incompleta</strong>: así queda constancia con
            sus notas, que es lo que se revisa a fin de mes.
          </p>
          <button
            type="submit"
            disabled={pendiente}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-60"
          >
            <Trash className="h-3.5 w-3.5" />
            {pendiente ? "Eliminando…" : "Sí, eliminar definitivamente"}
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
