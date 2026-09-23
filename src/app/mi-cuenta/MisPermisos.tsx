"use client";

/**
 * «PERMISOS» — la pestaña del portal (/mi-cuenta?seccion=permisos)
 * ================================================================
 * La versión digital del formato en papel «SOLICITUD DE PERMISO» (XP C2 C91).
 * El nombre, la cédula y el cargo salen del perfil y la fecha de
 * diligenciamiento es la de hoy en Colombia: el colaborador solo escribe lo
 * suyo —cuándo, por qué, quién lo reemplaza— y adjunta el soporte si lo tiene.
 *
 * Qué puede hacer:
 *   · pedir un permiso de DÍA COMPLETO (uno o varios días) o POR HORAS;
 *   · marcar que PIDE que se le pague (la decisión es de quien aprueba);
 *   · adjuntar un soporte (PDF o foto, hasta 5 MB) que solo verán él y quien
 *     aprueba: se guarda en un almacén privado;
 *   · corregir o ANULAR una solicitud suya mientras siga PENDIENTE;
 *   · leer la nota del aprobador y descargar su propio soporte.
 *
 * Las piezas de interfaz vienen de `ui-base` y las ayudas de `ayudas.ts`, nunca
 * de `ui.tsx`; toda acción usa `useAccionPanel`; el historial va de 10 en 10
 * con el `Paginacion` de siempre.
 */

import { useState } from "react";
import { idleState, type ActionState } from "@/lib/admin-types";
import {
  PERMISO_ESTADO_CLASSES,
  PERMISO_ESTADO_LABELS,
  PERMISO_ORIGEN_LABELS,
  PERMISO_TIPO_LABELS,
  SOPORTE_EXTENSIONES,
  cuandoEs,
  fechaLarga,
  type PermisoRecord,
  type PermisoTipo,
} from "@/lib/permisos";
import {
  AyudaSeccion,
  Badge,
  Paginacion,
  inputClass,
  useAccionPanel,
  usePaginaLocal,
} from "@/components/admin/ui-base";
import {
  AYUDA_PERMISOS_PORTAL,
  AYUDA_PERMISOS_SOPORTE,
} from "@/components/admin/ayudas";
import { CalendarCheck, Download, Info, Pencil, Trash } from "@/lib/icons";

type Accion = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function MisPermisos({
  permisos,
  perfil,
  hoy,
  guardar,
  anular,
}: {
  permisos: PermisoRecord[];
  /** Lo que el formato trae impreso: sale del perfil, no se escribe. */
  perfil: { nombre: string; cedula: string | null; cargo: string | null };
  /** Fecha de hoy en Colombia (`YYYY-MM-DD`), calculada en el servidor. */
  hoy: string;
  guardar: Accion;
  anular: Accion;
}) {
  const historial = usePaginaLocal(permisos);

  return (
    <>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink sm:text-2xl">
            <CalendarCheck className="h-6 w-6 text-brand-dark" />
            Pedir un permiso
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite">
            {AYUDA_PERMISOS_PORTAL}
          </p>
        </header>

        {/* Lo que el formato en papel trae impreso arriba. */}
        <dl className="mb-5 grid gap-3 rounded-2xl bg-mist/60 px-4 py-3.5 text-sm sm:grid-cols-4">
          <Impreso etiqueta="Nombre" valor={perfil.nombre} />
          <Impreso etiqueta="Cédula" valor={perfil.cedula ?? "—"} />
          <Impreso etiqueta="Cargo" valor={perfil.cargo ?? "—"} />
          <Impreso etiqueta="Fecha de diligenciamiento" valor={fechaLarga(hoy)} />
        </dl>

        <FormularioPermiso action={guardar} hoy={hoy} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-ink">Mis permisos</h2>
        {/* Este texto va en segunda persona a propósito: las descripciones de
            `PERMISO_ESTADO_DESCRIPCIONES` están escritas para quien APRUEBA
            («el colaborador la envió…») y aquí suenan raras. */}
        <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-graphite">
          Aquí queda todo lo que has pedido y en qué va:{" "}
          <strong>pendiente</strong> (todavía nadie lo ha revisado y puedes
          corregirlo o anularlo), <strong>aprobado</strong> (con la respuesta de
          quien lo revisó, y si quedó remunerado o no) o{" "}
          <strong>rechazado</strong> (con el motivo, para que sepas qué hacer).
        </p>

        {permisos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-mist/60 p-8 text-center">
            <p className="text-base font-bold text-ink">
              Todavía no has pedido ningún permiso
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-graphite">
              Usa el formulario de arriba. Aquí verás el estado de cada solicitud
              y la respuesta de quien la revise.
            </p>
          </div>
        ) : (
          <div id="mis-permisos" className="scroll-mt-28">
            <ul className="space-y-4">
              {historial.visibles.map((permiso) => (
                <li key={permiso.id}>
                  <PermisoItem
                    permiso={permiso}
                    hoy={hoy}
                    guardar={guardar}
                    anular={anular}
                  />
                </li>
              ))}
            </ul>
            <Paginacion
              pagina={historial.pagina}
              total={historial.total}
              onCambiar={historial.setPagina}
              ancla="mis-permisos"
              etiqueta="Páginas de mis permisos"
            />
          </div>
        )}
      </section>

      <p className="mt-8 flex items-start gap-2 text-xs leading-relaxed text-graphite">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Un permiso <strong>no remunerado</strong> se descuenta de tu nómina:
          ese día y, además, el domingo de esa semana, porque el descanso
          dominical se paga cuando se trabaja la semana completa. Si son varias
          faltas en la misma semana, el domingo se descuenta una sola vez. Un
          permiso por horas descuenta solo esa parte del día.
        </span>
      </p>
    </>
  );
}

function Impreso({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-graphite">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 font-semibold text-ink">{valor}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* El formulario (sirve para pedir y para corregir)                    */
/* ------------------------------------------------------------------ */

function FormularioPermiso({
  action,
  hoy,
  permiso,
  onListo,
}: {
  action: Accion;
  hoy: string;
  /** Si viene, el formulario CORRIGE esa solicitud en vez de crear una nueva. */
  permiso?: PermisoRecord;
  onListo?: () => void;
}) {
  const [state, formAction, pending] = useAccionPanel(action, idleState);
  const [tipo, setTipo] = useState<PermisoTipo>(permiso?.tipo ?? "dia");
  const editando = !!permiso;

  // Al terminar bien una CORRECCIÓN se cierra el formulario. Se hace durante el
  // render (el patrón de React para reaccionar a un cambio de estado), no en un
  // efecto: así no se pinta un fotograma con el formulario ya sobrando.
  const [ultimoEstado, setUltimoEstado] = useState(state);
  if (ultimoEstado !== state) {
    setUltimoEstado(state);
    if (state.status === "success" && editando && onListo) onListo();
  }

  return (
    <form action={formAction} className="space-y-4">
      {permiso && <input type="hidden" name="id" value={permiso.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            ¿Qué necesitas?
          </span>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value === "horas" ? "horas" : "dia")}
            className={inputClass}
          >
            <option value="dia">Día completo (uno o varios días)</option>
            <option value="horas">Por horas (un rato de un día)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            {tipo === "horas" ? "Día del permiso" : "Primer día"}{" "}
            <span className="text-brand-dark">*</span>
          </span>
          <input
            type="date"
            name="fecha_inicio"
            required
            defaultValue={permiso?.fecha_inicio ?? hoy}
            className={inputClass}
          />
        </label>

        {tipo === "dia" ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">
              Último día
            </span>
            <input
              type="date"
              name="fecha_fin"
              defaultValue={permiso?.fecha_fin ?? hoy}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-graphite">
              Déjalo igual al primero si es un solo día.
            </span>
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Desde <span className="text-brand-dark">*</span>
              </span>
              <input
                type="time"
                name="hora_inicio"
                required
                defaultValue={permiso?.hora_inicio?.slice(0, 5) ?? ""}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">
                Hasta <span className="text-brand-dark">*</span>
              </span>
              <input
                type="time"
                name="hora_fin"
                required
                defaultValue={permiso?.hora_fin?.slice(0, 5) ?? ""}
                className={inputClass}
              />
            </label>
          </div>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Motivo del permiso <span className="text-brand-dark">*</span>
        </span>
        <textarea
          name="motivo"
          rows={3}
          required
          maxLength={500}
          defaultValue={permiso?.motivo ?? ""}
          placeholder="Ej.: cita médica de control en la EPS."
          className={`${inputClass} resize-y`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            ¿Quién te reemplaza?
          </span>
          <input
            type="text"
            name="reemplazo"
            maxLength={120}
            defaultValue={permiso?.reemplazo ?? ""}
            placeholder="Nombre del compañero, si alguien cubre tu labor"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">
            Soporte
          </span>
          <input
            type="file"
            name="soporte"
            accept={SOPORTE_EXTENSIONES.join(",")}
            className={`${inputClass} py-2 file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-soft`}
          />
          <span className="mt-1 block text-xs text-graphite">
            {AYUDA_PERMISOS_SOPORTE}
          </span>
        </label>
      </div>

      {editando && permiso?.soporte_path && (
        <label className="flex items-start gap-2 text-sm text-graphite">
          <input type="hidden" name="quitar_soporte" value="false" />
          <input
            type="checkbox"
            name="quitar_soporte"
            value="true"
            className="mt-0.5 h-4 w-4 rounded border-line text-brand focus-visible:ring-2 focus-visible:ring-brand/40"
          />
          <span>
            Quitar el soporte que ya adjunté
            {permiso.soporte_nombre ? ` («${permiso.soporte_nombre}»)` : ""}. Si
            subes uno nuevo arriba, este se reemplaza solo.
          </span>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          Observaciones
        </span>
        <textarea
          name="observaciones"
          rows={2}
          maxLength={500}
          defaultValue={permiso?.observaciones ?? ""}
          placeholder="Cualquier cosa que quien aprueba deba tener en cuenta."
          className={`${inputClass} resize-y`}
        />
      </label>

      <label className="flex items-start gap-2.5 rounded-xl border border-line bg-mist/50 px-4 py-3">
        <input type="hidden" name="remunerado_solicitado" value="false" />
        <input
          type="checkbox"
          name="remunerado_solicitado"
          value="true"
          defaultChecked={permiso?.remunerado_solicitado ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand focus-visible:ring-2 focus-visible:ring-brand/40"
        />
        <span className="text-sm leading-relaxed text-ink-soft">
          <strong>Pido que sea remunerado</strong> (que se me pague ese tiempo).
          <span className="mt-0.5 block text-xs text-graphite">
            Lo decide quien aprueba. Si queda como no remunerado, ese día —y el
            domingo de esa semana— se descuentan de tu nómina.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep disabled:pointer-events-none disabled:opacity-60"
        >
          {pending
            ? "Guardando…"
            : editando
              ? "Guardar los cambios"
              : "Enviar la solicitud"}
        </button>
        {editando && onListo && (
          <button
            type="button"
            onClick={onListo}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            Cancelar
          </button>
        )}
      </div>

      {state.status !== "idle" && state.message && (
        <p
          role="alert"
          className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
            state.status === "error"
              ? "bg-red-50 text-red-700"
              : "bg-brand-tint text-brand-deep"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Una solicitud del historial                                         */
/* ------------------------------------------------------------------ */

function PermisoItem({
  permiso,
  hoy,
  guardar,
  anular,
}: {
  permiso: PermisoRecord;
  hoy: string;
  guardar: Accion;
  anular: Accion;
}) {
  const [editando, setEditando] = useState(false);
  const [anularState, anularAction, anulando] = useAccionPanel(anular, idleState);
  const pendiente = permiso.estado === "pendiente";

  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-ink">
              {PERMISO_TIPO_LABELS[permiso.tipo]}
            </h3>
            <Badge className={PERMISO_ESTADO_CLASSES[permiso.estado]}>
              {PERMISO_ESTADO_LABELS[permiso.estado]}
            </Badge>
            {permiso.estado === "aprobado" && (
              <Badge
                className={
                  permiso.remunerado
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {permiso.remunerado
                  ? "Remunerado"
                  : "No remunerado · se descuenta"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-graphite">{cuandoEs(permiso)}</p>
        </div>
        {permiso.origen === "registro_admin" && (
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
            {PERMISO_ORIGEN_LABELS.registro_admin}
          </span>
        )}
      </header>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
        {permiso.motivo}
      </p>
      {permiso.reemplazo && (
        <p className="mt-1 text-xs text-graphite">
          Reemplazo: <strong>{permiso.reemplazo}</strong>
        </p>
      )}
      {permiso.observaciones && (
        <p className="mt-1 whitespace-pre-line text-xs text-graphite">
          {permiso.observaciones}
        </p>
      )}

      {permiso.nota_revision && (
        <div className="mt-3 rounded-xl border border-line bg-mist/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
            Respuesta
            {permiso.reviewer_name && ` · ${permiso.reviewer_name}`}
            {permiso.revisado_at &&
              ` · ${fechaLarga(permiso.revisado_at.slice(0, 10))}`}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {permiso.nota_revision}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {permiso.soporte_path && (
          <a
            href={`/api/permisos/${permiso.id}/soporte`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar mi soporte
          </a>
        )}

        {pendiente && (
          <>
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editando ? "Cancelar" : "Corregir"}
            </button>

            <form
              action={anularAction}
              onSubmit={(event) => {
                if (
                  !window.confirm(
                    "¿Anular esta solicitud?\n\nDesaparece del sistema, con su soporte. Puedes volver a pedir el permiso cuando quieras.",
                  )
                ) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="id" value={permiso.id} />
              <button
                type="submit"
                disabled={anulando}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-graphite transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
              >
                <Trash className="h-3.5 w-3.5" />
                {anulando ? "Anulando…" : "Anular"}
              </button>
            </form>
          </>
        )}
      </div>

      {anularState.status === "error" && anularState.message && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {anularState.message}
        </p>
      )}

      {editando && (
        <div className="mt-4 border-t border-line pt-4">
          <AyudaSeccion title="Estás corrigiendo esta solicitud" className="!mt-0 mb-4">
            Mientras siga pendiente puedes cambiar lo que quieras. En cuanto la
            revisen, ya no.
          </AyudaSeccion>
          <FormularioPermiso
            action={guardar}
            hoy={hoy}
            permiso={permiso}
            onListo={() => setEditando(false)}
          />
        </div>
      )}
    </article>
  );
}
