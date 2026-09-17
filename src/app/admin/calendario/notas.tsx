/**
 * VISTA "NOTAS" de /admin/calendario
 * ==================================
 * Todo el seguimiento escrito sobre los eventos, de lo más reciente a lo más
 * antiguo, con filtros por evento, autor y rango de fechas (de la NOTA, no del
 * evento) y paginación.
 *
 * Los filtros y la página viven en la URL y se consultan AQUÍ, en el servidor;
 * lo único que es cliente es la barra que los reescribe (`FiltrosNotas`).
 *
 * Las notas NO se pintan en la cuadrícula del calendario —convertirían cada
 * casilla en un muro de texto—: se leen en esta pestaña y dentro del detalle de
 * cada evento.
 */

import Link from "next/link";
import { listEventos, listNotasEventos } from "@/lib/admin";
import { hoyEnColombia, formatearFechaCorta } from "@/lib/jornada";
import {
  EVENTO_ESTADO_CLASSES,
  EVENTO_ESTADO_LABELS,
  formatearMomento,
  NOTAS_POR_PAGINA,
  sumarDiasFecha,
} from "@/lib/calendario";
import {
  AyudaSeccion,
  AYUDA_CALENDARIO_NOTAS,
  Badge,
  Card,
  CardTitle,
  EmptyState,
} from "@/components/admin/ui";
import { etiquetaCompleta, etiquetaCorta } from "@/lib/usuarios";
import { NotaForm } from "@/components/calendario/NotaForm";
import { agregarNotaEvento, eliminarNotaEvento } from "./actions";
import { FiltrosNotas } from "./FiltrosNotas";
import { BorrarNota } from "./BorrarNota";

/** Ventana de eventos que alimenta los desplegables (un año largo). */
const DIAS_ATRAS = 365;
const DIAS_ADELANTE = 120;

export async function NotasView({
  eventoId,
  autorId,
  desde,
  hasta,
  pagina: paginaParam,
}: {
  eventoId: string;
  autorId: string;
  desde: string;
  hasta: string;
  pagina: string;
}) {
  const hoy = hoyEnColombia();

  const [notas, eventos] = await Promise.all([
    listNotasEventos({
      eventoId: eventoId || undefined,
      autorId: autorId || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    }),
    listEventos({
      desde: sumarDiasFecha(hoy, -DIAS_ATRAS),
      hasta: sumarDiasFecha(hoy, DIAS_ADELANTE),
      limit: 1000,
    }),
  ]);

  // Los eventos más recientes primero: al escribir una nota casi siempre es
  // sobre algo de estos días.
  const opciones = [...eventos]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((e) => ({
      id: e.id,
      etiqueta: `${formatearFechaCorta(e.fecha)} · ${e.titulo}`,
    }));

  // Los autores salen de las propias notas: no tiene sentido ofrecer en el
  // filtro a gente que nunca ha escrito una.
  const autores = [
    ...new Map(
      notas
        .filter((n) => n.autorId)
        .map((n) => [n.autorId!, { id: n.autorId!, nombre: n.autorNombre }]),
    ).values(),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const totalPaginas = Math.max(1, Math.ceil(notas.length / NOTAS_POR_PAGINA));
  const paginaSolicitada = Number(paginaParam);
  const pagina = Math.min(
    Math.max(Number.isInteger(paginaSolicitada) ? paginaSolicitada : 1, 1),
    totalPaginas,
  );
  const visibles = notas.slice(
    (pagina - 1) * NOTAS_POR_PAGINA,
    pagina * NOTAS_POR_PAGINA,
  );

  /** URL de esta misma vista en otra página, conservando los filtros. */
  function urlPagina(n: number): string {
    const params = new URLSearchParams();
    params.set("vista", "notas");
    if (eventoId) params.set("evento", eventoId);
    if (autorId) params.set("autor", autorId);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (n > 1) params.set("pagina", String(n));
    return `/admin/calendario?${params.toString()}`;
  }

  return (
    <>
      <AyudaSeccion title="Para qué sirven las notas" className="mb-6">
        {AYUDA_CALENDARIO_NOTAS}
      </AyudaSeccion>

      {/* ---------------- Escribir una nota ---------------- */}
      <Card className="mb-6">
        <CardTitle
          title="Agregar una nota"
          description="Elige el evento y escribe el seguimiento. Queda firmada con tu nombre y la fecha de hoy."
        />
        <NotaForm
          opciones={opciones}
          action={agregarNotaEvento}
          idCampo="nota-tabla"
        />
      </Card>

      {/* ---------------- Filtros ---------------- */}
      <Card className="mb-6">
        <FiltrosNotas
          valores={{ evento: eventoId, autor: autorId, desde, hasta }}
          eventos={opciones}
          autores={autores}
        />
      </Card>

      {/* ---------------- Tabla ---------------- */}
      {notas.length === 0 ? (
        <EmptyState
          title="No hay notas con estos filtros"
          description="Prueba con otro evento, otro autor o un rango de fechas más amplio. Si todavía nadie ha escrito nada, usa el formulario de arriba para dejar la primera."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-graphite">
            {notas.length} nota(s) · página {pagina} de {totalPaginas}
          </p>

          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-line bg-mist/60 text-left text-[11px] uppercase tracking-wide text-graphite">
                    <th scope="col" className="px-4 py-3 font-bold">
                      Fecha de la nota
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Evento
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Autor
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Nota
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((nota) => (
                    <tr
                      key={nota.id}
                      className="border-b border-line/70 align-top last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-graphite">
                        {formatearMomento(nota.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">
                          {nota.eventoTitulo}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-graphite">
                          {nota.eventoFecha
                            ? formatearFechaCorta(nota.eventoFecha)
                            : "—"}
                          <Badge
                            className={EVENTO_ESTADO_CLASSES[nota.eventoEstado]}
                          >
                            {EVENTO_ESTADO_LABELS[nota.eventoEstado]}
                          </Badge>
                        </p>
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-ink-soft"
                        title={etiquetaCompleta({
                          apodo: nota.autorApodo,
                          nombre: nota.autorNombre,
                        })}
                      >
                        {etiquetaCorta({
                          apodo: nota.autorApodo,
                          nombre: nota.autorNombre,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-lg whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                          {nota.texto}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <BorrarNota
                          id={nota.id}
                          evento={nota.eventoTitulo}
                          action={eliminarNotaEvento}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPaginas > 1 && (
            <nav
              aria-label="Páginas de notas"
              className="mt-4 flex items-center justify-center gap-2"
            >
              {pagina > 1 && (
                <Link
                  prefetch={false}
                  href={urlPagina(pagina - 1)}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-graphite">
                Página {pagina} de {totalPaginas}
              </span>
              {pagina < totalPaginas && (
                <Link
                  prefetch={false}
                  href={urlPagina(pagina + 1)}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-dark"
                >
                  Siguiente →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
