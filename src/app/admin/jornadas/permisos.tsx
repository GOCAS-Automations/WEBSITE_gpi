/**
 * VISTA "PERMISOS" de /admin/jornadas
 * ===================================
 * La bandeja de solicitudes de permiso del equipo: la versión digital del
 * formato en papel «SOLICITUD DE PERMISO» (XP C2 C91). Filtros por estado,
 * persona y fechas; por cada solicitud, su ficha completa con el soporte y los
 * botones de aprobar (decidiendo si se paga), rechazar con nota, volver a
 * pendiente y eliminar. Arriba, «Registrar una falta» para lo que no se pidió
 * por el sistema.
 *
 * POR QUÉ AQUÍ Y NO EN UNA ENTRADA PROPIA DEL MENÚ
 * ------------------------------------------------
 * Porque es exactamente el mismo trabajo, el mismo público y el mismo lenguaje
 * que «Aprobaciones»: un manager revisa lo que registró el equipo y lo aprueba
 * o lo rechaza con una nota que el colaborador lee. Ponerlo al lado hace que se
 * revise en la misma sesión («¿por qué faltan horas esta semana? — ah, tenía
 * permiso»), y el menú del panel —que GPI pidió expresamente agrupar en pocas
 * entradas— se queda en ocho. La pantalla no se recarga: cada pestaña es una
 * vista distinta, no un bloque más.
 *
 * PAGINACIÓN: 10 fichas por página (`FILAS_POR_PAGINA`), con la página en la
 * URL (`?pagina=`). La barra de filtros reescribe la URL SIN `pagina`, así que
 * cambiar un filtro devuelve a la primera página.
 *
 * RECHAZAR ≠ ELIMINAR: se dice en la ayuda, en el aviso de eliminación y en el
 * mensaje de las dos acciones.
 */

import Link from "next/link";
import { listPermisos, listProfiles } from "@/lib/admin";
import {
  PERMISO_ESTADO_CLASSES,
  PERMISO_ESTADO_LABELS,
  PERMISO_FILTRO_ESTADOS,
  PERMISO_FILTRO_ESTADO_DEFECTO,
  PERMISO_ORIGEN_LABELS,
  PERMISO_TIPO_LABELS,
  cuandoEs,
  fechaLarga,
  urlPermisos,
  type PermisoEstado,
  type PermisoRecord,
} from "@/lib/permisos";
import {
  AyudaSeccion,
  Badge,
  Card,
  EmptyState,
  Paginacion,
} from "@/components/admin/ui";
import { AYUDA_PERMISOS, AYUDA_PERMISOS_REMUNERADO } from "@/components/admin/ayudas";
import { paginar } from "@/lib/paginacion";
import { hoyEnColombia } from "@/lib/jornada";
import { FiltrosPermisos } from "@/components/permisos/FiltrosPermisos";
import {
  EliminarPermiso,
  ReabrirPermiso,
  RevisarPermiso,
} from "@/components/permisos/RevisarPermiso";
import { RegistrarFalta } from "@/components/permisos/RegistrarFalta";
import {
  aprobarPermiso,
  eliminarPermiso,
  reabrirPermiso,
  registrarFalta,
  rechazarPermiso,
} from "./permisos-actions";
import { Download, Info } from "@/lib/icons";

export async function PermisosView({
  estado: estadoRaw,
  empleadoId,
  desde,
  hasta,
  pagina: paginaPedida,
}: {
  estado?: string;
  empleadoId: string;
  desde: string;
  hasta: string;
  pagina: number;
}) {
  const estado = PERMISO_FILTRO_ESTADOS.some((e) => e.value === estadoRaw)
    ? (estadoRaw as PermisoEstado | "todos")
    : PERMISO_FILTRO_ESTADO_DEFECTO;

  const [permisos, empleados] = await Promise.all([
    listPermisos({
      estado,
      employeeId: empleadoId || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
      limit: 1000,
    }),
    listProfiles(),
  ]);

  const { visibles, pagina } = paginar(permisos, paginaPedida);
  const hrefBase = urlPermisos({ estado, employeeId: empleadoId, desde, hasta });
  const hoy = hoyEnColombia();

  const personas = empleados
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, nombre: p.full_name }));
  // La cédula la pide el formato en papel y `listPermisos` no la resuelve
  // (`mapaDePerfiles` solo trae nombre, apodo y cargo): sale de aquí.
  const cedulas = new Map(empleados.map((p) => [p.id, p.cedula ?? ""]));

  return (
    <>
      {/* ---------------- Cómo funciona esta bandeja ---------------- */}
      <AyudaSeccion title="Cómo funciona esta bandeja" className="mb-6">
        <p className="mb-2">{AYUDA_PERMISOS}</p>
        <ul className="space-y-1.5">
          <li>
            <strong>Pendiente:</strong> el colaborador la envió y nadie la ha
            revisado. Mientras esté así, él puede corregirla o anularla.
          </li>
          <li>
            <strong>Aprobado:</strong> se concede. Al aprobar decides si{" "}
            <strong>se paga</strong>. {AYUDA_PERMISOS_REMUNERADO}
          </li>
          <li>
            <strong>Rechazado:</strong> no se concede. Exige escribir un motivo, y{" "}
            <strong>ese texto lo verá el colaborador</strong> en su Mi Cuenta.
          </li>
          <li>
            <strong>Volver a pendiente:</strong> deshace la decisión (quién
            revisó, la nota y si era remunerado). Es la forma de corregir una
            aprobación equivocada: si descontaba, deja de hacerlo en las
            liquidaciones que sigan en borrador.
          </li>
          <li>
            <strong>Rechazar no es eliminar:</strong> al <strong>rechazar</strong>
            , el permiso se queda en el sistema con tu nota; al{" "}
            <strong>eliminar</strong>, desaparece para siempre con su soporte y
            el colaborador deja de verlo. Elimina solo lo de prueba o lo creado
            por error.
          </li>
        </ul>
      </AyudaSeccion>

      {/* ---------------- Registrar una falta ---------------- */}
      <RegistrarFalta personas={personas} hoy={hoy} action={registrarFalta} />

      {/* ---------------- Filtros ---------------- */}
      <Card className="mb-6">
        <FiltrosPermisos
          valores={{ estado, employeeId: empleadoId, desde, hasta }}
          empleados={personas}
        />
      </Card>

      {permisos.length === 0 ? (
        <EmptyState
          title="No hay permisos con estos filtros"
          description={
            estado === "pendiente"
              ? "No hay solicitudes esperando revisión. Cambia el filtro de estado para ver el histórico."
              : "Prueba con otro estado, otra persona o un rango de fechas más amplio."
          }
        />
      ) : (
        <div id="lista-permisos" className="scroll-mt-28 space-y-4">
          <p className="text-sm text-graphite">
            {permisos.length} permiso(s) encontrado(s).
          </p>

          {visibles.map((permiso) => (
            <FichaPermiso
              key={permiso.id}
              permiso={permiso}
              cedula={cedulas.get(permiso.employee_id) ?? ""}
            />
          ))}

          <Paginacion
            pagina={pagina}
            total={permisos.length}
            hrefBase={hrefBase}
            ancla="lista-permisos"
            etiqueta="Páginas de permisos"
          />
        </div>
      )}

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <Info className="h-4 w-4 text-brand-dark" />
          Qué pasa con la nómina
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          Un permiso <strong>aprobado y NO remunerado</strong> descuenta en la
          liquidación del período: <strong>ese día y el domingo de esa semana</strong>{" "}
          —el descanso dominical se paga porque se trabajó la semana completa, y
          al faltar sin justa causa se pierde (art. 173 del Código Sustantivo del
          Trabajo)—. Si hay varias faltas en la misma semana, el domingo se
          descuenta una sola vez. Un permiso <strong>por horas</strong> descuenta
          solo su parte de la jornada programada de ese día y no arrastra el
          domingo.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          El descuento se aplica sobre el salario <em>y</em> sobre el auxilio de
          transporte, y se ve explícito en{" "}
          <Link
            prefetch={false}
            href="/admin/nomina"
            className="font-semibold text-brand-dark hover:text-brand"
          >
            Nómina
          </Link>{" "}
          y en el volante, en la línea «Faltas no remuneradas». Solo afecta a las
          liquidaciones en <strong>borrador</strong>: una ya cerrada no se mueve
          nunca.
        </p>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Una solicitud                                                       */
/* ------------------------------------------------------------------ */

function FichaPermiso({
  permiso,
  cedula,
}: {
  permiso: PermisoRecord;
  cedula: string;
}) {
  const empleado = permiso.employee_name ?? "Colaborador";
  const cuando = cuandoEs(permiso);
  const descontaba = permiso.estado === "aprobado" && permiso.remunerado === false;

  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-ink">{empleado}</h2>
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
                {permiso.remunerado ? "Remunerado" : "No remunerado · descuenta"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-graphite">
            <span className="font-semibold text-ink">
              {PERMISO_TIPO_LABELS[permiso.tipo]}
            </span>{" "}
            · {cuando}
          </p>
          {permiso.employee_cargo && (
            <p className="text-xs text-graphite">{permiso.employee_cargo}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-graphite">
            {PERMISO_ORIGEN_LABELS[permiso.origen]}
          </span>
          {permiso.created_at && (
            <span className="text-xs text-graphite">
              Diligenciado el {fechaLarga(permiso.created_at.slice(0, 10))}
            </span>
          )}
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-3">
          <Bloque titulo="Motivo del permiso" texto={permiso.motivo} destacado />
          {permiso.reemplazo && (
            <Bloque titulo="Reemplazo" texto={permiso.reemplazo} />
          )}
          {permiso.observaciones && (
            <Bloque titulo="Observaciones" texto={permiso.observaciones} />
          )}

          {permiso.nota_revision && (
            <div className="rounded-xl border border-line bg-mist/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
                Nota de revisión
                {permiso.reviewer_name && ` · ${permiso.reviewer_name}`}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {permiso.nota_revision}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {permiso.estado === "pendiente" ? (
              <RevisarPermiso
                id={permiso.id}
                empleado={empleado}
                cuando={cuando}
                pidioRemunerado={permiso.remunerado_solicitado}
                aprobar={aprobarPermiso}
                rechazar={rechazarPermiso}
              />
            ) : (
              <ReabrirPermiso
                id={permiso.id}
                descontaba={descontaba}
                action={reabrirPermiso}
              />
            )}
            <div className="border-t border-line pt-3">
              <EliminarPermiso
                id={permiso.id}
                empleado={empleado}
                cuando={cuando}
                action={eliminarPermiso}
              />
            </div>
          </div>
        </div>

        {/* ---- Columna lateral: lo que pidió y el soporte ---- */}
        <aside className="space-y-3 rounded-2xl border border-line bg-mist/40 p-4">
          <Dato etiqueta="Cédula" valor={cedula || "—"} />
          <Dato
            etiqueta="Lo que pidió"
            valor={
              permiso.remunerado_solicitado
                ? "Que fuera remunerado"
                : "Sin pedir remuneración"
            }
          />
          <Dato
            etiqueta="Aporta soporte"
            valor={permiso.soporte_path ? "Sí" : "No"}
          />
          {permiso.soporte_path && (
            <a
              href={`/api/permisos/${permiso.id}/soporte`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar el soporte
            </a>
          )}
          {permiso.revisado_at && (
            <Dato
              etiqueta="Revisado"
              valor={`${fechaLarga(permiso.revisado_at.slice(0, 10))}${
                permiso.reviewer_name ? ` · ${permiso.reviewer_name}` : ""
              }`}
            />
          )}
        </aside>
      </div>
    </article>
  );
}

function Bloque({
  titulo,
  texto,
  destacado = false,
}: {
  titulo: string;
  texto: string;
  destacado?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
        {titulo}
      </p>
      <p
        className={`mt-1 whitespace-pre-line text-sm leading-relaxed ${
          destacado ? "text-ink-soft" : "text-graphite"
        }`}
      >
        {texto}
      </p>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-graphite">
        {etiqueta}
      </p>
      <p className="mt-0.5 text-sm font-medium text-ink-soft">{valor}</p>
    </div>
  );
}
